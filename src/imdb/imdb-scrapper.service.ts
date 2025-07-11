import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IMDbItem, IMDbItemType } from './entities/imdb-item.entity';
import { IMDbResult } from './entities/imdb-result.entity';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { IMDbItemTypeMapper } from './mapper/imdb-item-type.mapper';

@Injectable()
export class IMDbScrapperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IMDbScrapperService.name);
  private browser: Browser;

  private readonly baseUrl = 'https://www.imdb.com';

  async onModuleInit() {
    const perfLogger = new Logger(IMDbScrapperService.name, {
      timestamp: true,
    });
    perfLogger.log(`Starting browser...`);
    puppeteer.use(StealthPlugin());
    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
    this.browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
    });
    perfLogger.log(`Browser started`);
  }

  async onModuleDestroy() {
    const perfLogger = new Logger(IMDbScrapperService.name, {
      timestamp: true,
    });
    perfLogger.log(`Stopping browser...`);
    await this.browser?.close();
    perfLogger.log(`Browser stopped`, Logger.getTimestamp());
  }

  async findTitle(
    imdbId: string,
    language: string,
  ): Promise<IMDbItem | undefined> {
    const url =
      language != 'en'
        ? `${this.baseUrl}/${language}/title/${imdbId}`
        : `${this.baseUrl}/title/${imdbId}`;

    const page = await this.browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': language,
    });
    await page.evaluateOnNewDocument((lang) => {
      Object.defineProperty(navigator, 'language', {
        get() {
          return language;
        },
      });
      Object.defineProperty(navigator, 'languages', {
        get() {
          return [language];
        },
      });
    }, language);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
      });

      const jsonLd = await page.$eval(
        'script[type="application/ld+json"]',
        (script) => script.innerText,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: Record<string, any> = JSON.parse(jsonLd);

      const pageTitle = await page.title();

      const type = IMDbItemTypeMapper.fromString(data['@type'] as string);

      let year: number | undefined;
      let runtime: number | undefined;

      const ogDescription = await page.$eval(
        'meta[property="og:description"]',
        (meta) => meta.content,
      );

      if (type == IMDbItemType.TVEpisode) {
        year = new Date(data.datePublished as string).getFullYear();

        const timeRequired = (data.timeRequired ?? data.duration) as
          | string
          | undefined;
        if (timeRequired != undefined) {
          const timeMatch = timeRequired.match(/PT(\d+H)?(\d+M)?/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1] ?? 0);
            const minutes = parseInt(timeMatch[2] ?? 0);
            runtime = hours * 3600 + minutes * 60;
          }
        }
      } else {
        const yearMatches = [
          ...pageTitle.matchAll(/\((\d{4})\)|\([^0-9]+ (\d{4})–?/g),
        ];
        year =
          yearMatches.length > 0
            ? parseInt(
                yearMatches[yearMatches.length - 1][1] ??
                  yearMatches[yearMatches.length - 1][2],
              )
            : undefined;

        const runtimeMatch = ogDescription.match(
          /((\d+)(h|hours))?\s?((\d+)(m|minutes))?\s\|/,
        );
        if (runtimeMatch) {
          const hours = parseInt(runtimeMatch[2] ?? 0);
          const minutes = parseInt(runtimeMatch[5] ?? 0);
          runtime = hours * 3600 + minutes * 60;
        }
      }

      await page.close();

      if (!year) {
        throw new Error('Year not found in page title');
      }

      const keywords = data.keywords as string | undefined;

      const item: IMDbItem = {
        imdbId: imdbId,
        title: (data.alternateName ?? data.name) as string,
        originalTitle: data.name as string,
        type,
        synopsis: data.description as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rating: data.aggregateRating?.ratingValue as number | undefined,
        genres: data.genre as string[],
        keywords: keywords?.split(',').map((s) => s.trim()) ?? [],
        posterUrl: data.image as string,
        runtime,
        year: year,
      };

      return item;
    } catch (error) {
      this.logger.error(error);
    }

    await page.close();
  }

  async search(
    title: string,
    language: string,
    type?: IMDbItemType,
    year?: number,
  ): Promise<IMDbResult[]> {
    let titleType: string | undefined;
    if (type === IMDbItemType.Movie) {
      titleType = 'feature,tv_movie,short,tv_short';
    } else if (type === IMDbItemType.TVSeries) {
      titleType = 'tv_miniseries,tv_special,tv_series';
    } else if (type === IMDbItemType.TVEpisode) {
      titleType = 'tv_episode';
    }

    const params = new URLSearchParams();
    params.set('title', title);
    if (titleType) {
      params.set('title_type', titleType);
    }
    if (year) {
      params.set('release_date', `${year}-01-01,${year}-12-31`);
    }

    const url =
      language != 'en'
        ? `${this.baseUrl}/${language}/search/title/?${params}`
        : `${this.baseUrl}/search/title/?${params}`;

    const page = await this.browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': language,
    });
    await page.evaluateOnNewDocument((lang) => {
      Object.defineProperty(navigator, 'language', {
        get() {
          return language;
        },
      });
      Object.defineProperty(navigator, 'languages', {
        get() {
          return [language];
        },
      });
    }, language);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
      });

      await page.waitForSelector('.ipc-metadata-list-summary-item', {
        timeout: 0,
        visible: true,
      });

      const rawResults = await page.$$eval(
        '.ipc-metadata-list-summary-item',
        (items: Element[]) =>
          items.map((el) => {
            const posterUrl = el
              .querySelector('img.ipc-image')
              ?.getAttribute('src')
              ?.trim();
            const title =
              el
                .querySelector('h3.ipc-title__text')
                ?.textContent?.trim()
                ?.replace(/^\d+\.\s/, '') ?? '';
            const itemUrl = el
              .querySelector('a.ipc-title-link-wrapper')
              ?.getAttribute('href')
              ?.trim();

            const rawType =
              el
                .querySelector('span.dli-title-type-data')
                ?.textContent?.trim() ?? 'Movie';

            const metadataElems = [
              ...el.querySelectorAll('span.dli-title-metadata-item').values(),
            ];
            const year = metadataElems
              .map((el) => {
                const match = el.textContent?.match(/^\d{4}(?:-\s?|-\d{4})?/);
                if (match?.length ?? 0 > 0) {
                  return parseInt(match![0]);
                }
              })
              .find((e) => e != null);

            const rawRating = el
              .querySelector('span.ipc-rating-star--rating')
              ?.textContent?.trim();
            const rating = rawRating ? parseFloat(rawRating) : undefined;

            /*const yearElement = el.querySelector(
              '.ipc-metadata-list-item__year',
            );
            const yearText = yearElement?.textContent?.trim() ?? '';
            const yearMatch = yearText.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
            const ratingElement = el.querySelector('.ipc-rating-star__rating');
            const ratingText = ratingElement?.textContent?.trim() ?? '';
            const rating = ratingText ? parseFloat(ratingText) : undefined;*/
            return {
              imdbId: itemUrl?.match(/tt\d+/)?.[0] ?? '',
              title,
              posterUrl,
              rawType,
              year,
              rating,
            };
          }),
      );

      await page.close();

      const results: IMDbResult[] = rawResults.map((r) => {
        return {
          imdbId: r.imdbId,
          title: r.title,
          posterUrl: r.posterUrl,
          type: IMDbItemTypeMapper.fromString(r.rawType),
          year: r.year,
          rating: r.rating,
        };
      });

      return results;
    } catch (error) {
      this.logger.error(error);
    }

    await page.close();

    return [];
  }
}

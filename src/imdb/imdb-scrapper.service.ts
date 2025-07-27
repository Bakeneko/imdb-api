import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { IMDbItem, IMDbItemType } from './entities/imdb-item.entity';
import { IMDbResult } from './entities/imdb-result.entity';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { IMDbItemTypeMapper } from './mapper/imdb-item-type.mapper';
import { IMDbEpisode } from './entities/imdb-episode.entity';

@Injectable()
export class IMDbScrapperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IMDbScrapperService.name);
  private browser: Browser;

  private readonly baseUrl = 'https://www.imdb.com';

  async onModuleInit() {
    return this.startBrowser();
  }

  async onModuleDestroy() {
    return this.stopBrowser();
  }

  private async startBrowser() {
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

  private async stopBrowser() {
    const perfLogger = new Logger(IMDbScrapperService.name, {
      timestamp: true,
    });
    perfLogger.log(`Stopping browser...`);
    await this.browser?.close();
    perfLogger.log(`Browser stopped`, Logger.getTimestamp());
  }

  private async restartBrowser() {
    await this.stopBrowser();
    await this.startBrowser();
  }

  async findTitle(
    imdbId: string,
    language: string,
    getEpisodes: boolean = false,
  ): Promise<IMDbItem | undefined> {
    const url =
      language != 'en'
        ? `${this.baseUrl}/${language}/title/${imdbId}`
        : `${this.baseUrl}/title/${imdbId}`;

    const page = await this.browser.newPage().catch(async (error) => {
      this.logger.error(
        'Failed to open a new page, restarting the browser',
        error,
      );
      await this.restartBrowser();
      return this.browser.newPage();
    });
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
      await page
        .goto(url, {
          waitUntil: 'networkidle2',
        })
        .catch(async (error) => {
          this.logger.error(
            `Failed to load page: ${url}, restarting the browser`,
            error,
          );
          await this.restartBrowser();
          throw error;
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
        year =
          data.datePublished != undefined
            ? new Date(data.datePublished as string).getFullYear()
            : undefined;

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

      if (!year) {
        throw new Error('Year not found in page title');
      }

      const keywords = data.keywords as string | undefined;

      let seasons: number | undefined;
      let episodes: IMDbEpisode[] | undefined;

      if (type == IMDbItemType.TVSeries) {
        const rawSeasons = await page
          .$eval(
            'select#browse-episodes-season',
            (el) => el.getAttribute('aria-label')?.match(/\d+/)?.[0],
          )
          .catch(() => '1');
        if (rawSeasons != undefined) {
          seasons = Number.parseInt(rawSeasons);
        }
        if (getEpisodes) {
          episodes = await this.findSeasons(imdbId, language);
        }
      }

      await page.close();

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
        seasons,
        episodes,
      };

      return item;
    } catch (error) {
      this.logger.error(error);
    }

    await page.close();
  }

  async findSeasons(
    imdbId: string,
    language: string,
  ): Promise<IMDbEpisode[] | undefined> {
    const url =
      language != 'en'
        ? `${this.baseUrl}/${language}/title/${imdbId}/episodes?season=1&ref_=ttep`
        : `${this.baseUrl}/title/${imdbId}/episodes?season=1&ref_=ttep`;

    const dateFormats = new Map<string, string>([
      ['en', 'ccc, LLL d, yyyy'],
      ['fr', 'ccc, d LLL yyyy'],
    ]);

    const page = await this.browser.newPage().catch(async (error) => {
      this.logger.error(
        'Failed to open a new page, restarting the browser',
        error,
      );
      await this.restartBrowser();
      return this.browser.newPage();
    });
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
      await page
        .goto(url, {
          waitUntil: 'networkidle2',
        })
        .catch(async (error) => {
          this.logger.error(
            `Failed to load page: ${url}, restarting the browser`,
            error,
          );
          await this.restartBrowser();
          throw error;
        });

      const seriesTitle = await page.$eval(
        'hgroup h2[data-testid="subtitle"]',
        (e) => e.innerText,
      );

      let seasonIndex = 1;
      let seasonCount = 1;
      const episodes: IMDbEpisode[] = [];

      do {
        let lastSeasonsTab = await page.waitForSelector(
          'a[data-testid="tab-season-entry"]',
          {
            timeout: 3000,
          },
        );

        if (!lastSeasonsTab) {
          throw new Error('Seasons tabs not found');
        }

        const tabs = await page.$$('a[data-testid="tab-season-entry"]');
        lastSeasonsTab = tabs[tabs.length - 1];

        seasonCount = await page.evaluate(
          (e) => Number.parseInt(e.innerText),
          lastSeasonsTab,
        );

        const rawEpisodes = await page.$$eval(
          'article.episode-item-wrapper',
          (items: Element[]) =>
            items.map((el) => {
              const posterUrl = el
                .querySelector('img.ipc-image')
                ?.getAttribute('src')
                ?.trim();
              const itemTitle =
                el
                  .querySelector('a.ipc-title-link-wrapper')
                  ?.textContent?.trim() ?? '';
              const itemUrl = el
                .querySelector('a.ipc-title-link-wrapper')
                ?.getAttribute('href')
                ?.trim();

              const itemRelease =
                el
                  .querySelector(
                    'h4[data-testid="slate-list-card-title"] + span',
                  )
                  ?.textContent?.trim() ?? '';

              const synopsis = el
                .querySelector(
                  'div.ipc-html-content-inner-div[role="presentation"]',
                )
                ?.textContent?.trim();

              const rawRating = el
                .querySelector('span.ipc-rating-star--rating')
                ?.textContent?.trim()
                .replace(',', '.');
              const rating = rawRating ? parseFloat(rawRating) : undefined;

              const number = Number.parseInt(
                itemTitle.match(/S\d+.E(\d+)/)?.[1] ?? '',
              );
              const title = itemTitle.match(/S\d+.E\d+\s?∙(.*)/)?.[1] ?? '';

              return {
                imdbId: itemUrl?.match(/tt\d+/)?.[0] ?? '',
                title,
                number,
                posterUrl,
                synopsis,
                rating,
                rawRelease: itemRelease,
              };
            }),
        );

        episodes.push(
          ...rawEpisodes.map((r) => {
            let releaseDate: Date | undefined;
            if (r.rawRelease != null) {
              releaseDate = DateTime.fromFormat(
                r.rawRelease,
                dateFormats.get(language) ?? dateFormats.get('en') ?? '',
                {
                  locale: language,
                },
              ).toJSDate();
            }

            return {
              imdbId: r.imdbId,
              seriesImdbId: imdbId,
              seriesTitle,
              season: seasonIndex,
              number: r.number,
              title: r.title,
              synopsis: r.synopsis,
              posterUrl: r.posterUrl,
              rating: r.rating,
              release: releaseDate,
              year: releaseDate?.getFullYear(),
            };
          }),
        );

        seasonIndex++;

        if (seasonIndex > seasonCount) {
          break;
        }

        const nextTab = tabs[seasonIndex - 1];
        await nextTab.click();
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
        });
      } while (seasonIndex <= seasonCount);

      await page.close();

      return episodes;
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

    const page = await this.browser.newPage().catch(async (error) => {
      this.logger.error(
        'Failed to open a new page, restarting the browser',
        error,
      );
      await this.restartBrowser();
      return this.browser.newPage();
    });
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
      await page
        .goto(url, {
          waitUntil: 'networkidle2',
        })
        .catch(async (error) => {
          this.logger.error(
            `Failed to load page: ${url}, restarting the browser`,
            error,
          );
          await this.restartBrowser();
          throw error;
        });

      const itemList = await page.waitForSelector(
        '.ipc-metadata-list-summary-item',
        {
          timeout: 5000,
          visible: true,
        },
      );

      if (!itemList) {
        throw new Error('Item list not found');
      }

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
              ?.textContent?.trim()
              .replace(',', '.');
            const rating = rawRating ? parseFloat(rawRating) : undefined;

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

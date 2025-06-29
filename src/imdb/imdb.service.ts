import { Injectable } from '@nestjs/common';
import { IMDbItem, IMDbItemType } from './entities/imdb-item.entity';
import { IMDbScrapperService } from './imdb-scrapper.service';
import { IMDbResult } from './entities/imdb-result.entity';

@Injectable()
export class IMDbService {
  private readonly cache: Map<string, IMDbItem> = new Map<string, IMDbItem>();

  constructor(private readonly imdbScrapperService: IMDbScrapperService) {}

  async findTitle(
    imdbId: string,
    language: string,
  ): Promise<IMDbItem | undefined> {
    if (this.cache.has(imdbId)) {
      return this.cache.get(imdbId);
    }
    const item = await this.imdbScrapperService.findTitle(imdbId, language);
    if (item) {
      //this.cache.set(imdbId, item);
    }
    return item;
  }

  search(
    title: string,
    language: string,
    type?: IMDbItemType,
    year?: number,
  ): Promise<IMDbResult[]> {
    return this.imdbScrapperService.search(title, language, type, year);
  }
}

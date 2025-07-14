import { Injectable } from '@nestjs/common';
import { IMDbItem, IMDbItemType } from './entities/imdb-item.entity';
import { IMDbScrapperService } from './imdb-scrapper.service';
import { IMDbResult } from './entities/imdb-result.entity';

@Injectable()
export class IMDbService {
  constructor(private readonly imdbScrapperService: IMDbScrapperService) {}

  async findTitle(
    imdbId: string,
    language: string,
    getEpisodes: boolean = false,
  ): Promise<IMDbItem | undefined> {
    const item = await this.imdbScrapperService.findTitle(
      imdbId,
      language,
      getEpisodes,
    );
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

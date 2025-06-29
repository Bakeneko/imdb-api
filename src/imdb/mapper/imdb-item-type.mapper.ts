// create a mapper for the IMDb item type from json value to the IMDbItemType enum
import { IMDbItemType } from '../entities/imdb-item.entity';

export class IMDbItemTypeMapper {
  static fromString(value: string): IMDbItemType {
    switch (value) {
      case 'Movie':
      case 'TV Movie':
      case 'TV Special':
      case 'TV Short':
        return IMDbItemType.Movie;
      case 'TVSeries':
      case 'TV Series':
      case 'TV Mini Series':
        return IMDbItemType.TVSeries;
      case 'TVEpisode':
      case 'TV Episode':
        return IMDbItemType.TVEpisode;
      default:
        return IMDbItemType.Unknown;
    }
  }
}

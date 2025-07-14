import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IMDbEpisode } from './imdb-episode.entity';

export enum IMDbItemType {
  Movie = 'movie',
  TVSeries = 'tvSeries',
  TVEpisode = 'tvEpisode',
  Unknown = 'unknown',
}

export class IMDbItem {
  /**
   * The unique identifier for the item
   * @example 'tt0111161'
   */
  @ApiProperty({
    example: 'tt0111161',
    description: 'The unique identifier for the item',
  })
  imdbId: string;

  /**
   * The item's title
   * @example 'The Shawshank Redemption'
   */
  @ApiProperty({
    example: 'The Shawshank Redemption',
    description: "The item's title",
  })
  title: string;

  /**
   * The item's original title
   * @example 'The Shawshank Redemption'
   */
  @ApiProperty({
    example: 'The Shawshank Redemption',
    description: "The item's original title",
  })
  originalTitle: string;

  /**
   * The type of the item
   * @example 'Movie'
   */
  @ApiProperty({
    example: IMDbItemType.Movie,
    description: "The item's type",
    enum: IMDbItemType,
  })
  type: IMDbItemType;

  /**
   * The item's synopsis
   */
  @ApiProperty({
    description: "The item's synopsis",
  })
  synopsis: string;

  /**
   * The item's rating
   * @example 9.3
   */
  @ApiPropertyOptional({ example: 9.3, description: "The item's rating" })
  rating?: number;

  /**
   * The item's genres
   * @example ['Drama', 'Crime']
   */
  @ApiProperty({
    example: ['Drama', 'Crime'],
    description: "The item's genres",
    isArray: true,
  })
  genres: string[];

  //keywords
  /**
   * The item's keywords
   * @example ['prison', 'friendship', 'hope']
   */
  @ApiProperty({
    example: ['prison', 'friendship', 'hope'],
    description: "The item's keywords",
    isArray: true,
  })
  keywords: string[];

  /**
   * The item's poster URL
   * @example 'https://example.com/poster.jpg'
   */
  @ApiPropertyOptional({
    example: 'https://example.com/poster.jpg',
    description: "The item's poster URL",
  })
  posterUrl?: string;

  /**
   * The item's runtime in seconds
   * @example 8520  // 2 hours and 22 minutes
   */
  @ApiPropertyOptional({
    example: 8520,
    description: "The item's runtime in seconds",
  })
  runtime?: number;

  /**
   * The item's year of release
   * @example 1994
   */
  @ApiProperty({ example: 1994, description: "The item's year of release" })
  year: number;

  /**
   * The item's number of seasons
   * @example 1
   */
  @ApiProperty({ example: 1, description: "The item's number of seasons" })
  seasons?: number;

  /**
   * The item's episodes
   * @example []
   */
  @ApiPropertyOptional({
    example: [],
    description: "The item's episodes",
  })
  episodes?: IMDbEpisode[];
}

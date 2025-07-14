import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IMDbItemType {
  Movie = 'movie',
  TVSeries = 'tvSeries',
  TVEpisode = 'tvEpisode',
  Unknown = 'unknown',
}

export class IMDbEpisode {
  /**
   * The unique identifier for the episode
   * @example 'tt0519761'
   */
  @ApiProperty({
    example: 'tt0519761',
    description: 'The unique identifier for the episode',
  })
  imdbId: string;

  /**
   * The unique identifier for the series
   * @example 'tt0407362'
   */
  @ApiProperty({
    example: 'tt0407362',
    description: 'The unique identifier for the series',
  })
  seriesImdbId: string;

  /**
   * The episode's title
   * @example '33'
   */
  @ApiProperty({
    example: '33',
    description: "The episode's title",
  })
  title?: string;

  /**
   * The series's title
   * @example '33'
   */
  @ApiProperty({
    example: '33',
    description: "The series's title",
  })
  seriesTitle: string;

  /**
   * The episode's season
   * @example 1
   */
  @ApiPropertyOptional({ example: 1, description: "The episode's season" })
  season: number;

  /**
   * The episode's number
   * @example 1
   */
  @ApiPropertyOptional({ example: 1, description: "The episode's number" })
  number: number;

  /**
   * The episode's synopsis
   */
  @ApiProperty({
    description: "The episode's synopsis",
  })
  synopsis?: string;

  /**
   * The episode's rating
   * @example 8.5
   */
  @ApiPropertyOptional({ example: 8.5, description: "The episode's rating" })
  rating?: number;

  /**
   * The episode's poster URL
   * @example 'https://example.com/poster.jpg'
   */
  @ApiPropertyOptional({
    example: 'https://example.com/poster.jpg',
    description: "The episode's poster URL",
  })
  posterUrl?: string;

  /**
   * The episode's release date
   * @example '2005-12-02T00:00:00.000Z'
   */
  @ApiProperty({
    example: '2005-12-02T00:00:00.000Z',
    description: "The episode's date of release",
    type: 'string',
    format: 'date-time',
  })
  release?: Date;

  /**
   * The episode's year of release
   * @example 2005
   */
  @ApiProperty({ example: 2005, description: "The episode's year of release" })
  year?: number;
}

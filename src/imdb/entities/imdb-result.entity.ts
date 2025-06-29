import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IMDbItemType } from './imdb-item.entity';

export class IMDbResult {
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
   * The item's poster URL
   * @example 'https://example.com/poster.jpg'
   */
  @ApiPropertyOptional({
    example: 'https://example.com/poster.jpg',
    description: "The item's poster URL",
  })
  posterUrl?: string;

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
   * The item's rating
   * @example 9.3
   */
  @ApiPropertyOptional({ example: 9.3, description: "The item's rating" })
  rating?: number;

  /**
   * The item's year of release
   * @example 1994
   */
  @ApiProperty({ example: 1994, description: "The item's year of release" })
  year?: number;
}

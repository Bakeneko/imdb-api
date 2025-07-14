import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags, ApiQuery } from '@nestjs/swagger';
import { IMDbItem, IMDbItemType } from './entities/imdb-item.entity';
import { IMDbService } from './imdb.service';
import { IMDbResult } from './entities/imdb-result.entity';

@ApiSecurity('apiKeyHeader')
@ApiSecurity('apiKeyQueryParam')
@ApiTags('IMDb')
@Controller('imdb')
export class IMDbController {
  constructor(private readonly imdbService: IMDbService) {}

  @Get('title/:imdbId')
  @ApiResponse({ status: 200, description: 'The found record', type: IMDbItem })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findTitle(
    @Param('imdbId') imdbId: string,
    @Query('language') language: string,
    @Query('episodes', new DefaultValuePipe(false), ParseBoolPipe)
    episodes?: boolean,
  ): Promise<IMDbItem | undefined> {
    const item = await this.imdbService.findTitle(imdbId, language, episodes);
    if (!item) {
      throw new NotFoundException();
    }
    return item;
  }

  @ApiQuery({ name: 'type', enum: IMDbItemType, required: false })
  @ApiQuery({ name: 'year', type: Number, required: false })
  @Get('search')
  @ApiResponse({
    status: 200,
    description: 'The found results',
    type: IMDbResult,
    isArray: true,
  })
  search(
    @Query('title') title: string,
    @Query('language') language: string,
    @Query('type') type?: IMDbItemType,
    @Query('year') year?: number,
  ): Promise<IMDbResult[]> {
    return this.imdbService.search(title, language, type, year);
  }
}

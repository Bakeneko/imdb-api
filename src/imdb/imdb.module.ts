import { MiddlewareConsumer, Module } from '@nestjs/common';
import { IMDbController } from './imdb.controller';
import { IMDbService } from './imdb.service';
import { AuthMiddleware } from 'src/auth/auth.middleware';
import { IMDbScrapperService } from './imdb-scrapper.service';

@Module({
  controllers: [IMDbController],
  providers: [IMDbService, IMDbScrapperService],
})
export class IMDbModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(IMDbController);
  }
}

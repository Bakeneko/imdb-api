import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IMDbModule } from './imdb/imdb.module';

@Module({
  imports: [ConfigModule.forRoot(), IMDbModule],
})
export class AppModule {}

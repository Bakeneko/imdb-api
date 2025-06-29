import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ControllerLoggingInterceptor } from './controller-logging.interceptor';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalInterceptors(new ControllerLoggingInterceptor());
  const logger = new Logger('Application');

  const options = new DocumentBuilder()
    .setTitle('IMDb api')
    .setVersion('1.0')
    .addTag('IMDb')
    .addApiKey(
      { type: 'apiKey', name: 'apikey', in: 'query' },
      'apiKeyQueryParam',
    )
    .addApiKey(
      { type: 'apiKey', name: 'X-API-KEY', in: 'header' },
      'apiKeyHeader',
    )
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/', app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}
void bootstrap();

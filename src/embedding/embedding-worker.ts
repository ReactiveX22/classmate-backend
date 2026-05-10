import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  const logger = new Logger('EmbeddingWorker');

  logger.log('Starting Embedding Worker...');

  const app = await NestFactory.createApplicationContext(AppModule);

  app.enableShutdownHooks();

  logger.log('Embedding Worker is running and listening for jobs.');
}

bootstrap().catch((err) => {
  console.error('Embedding Worker failed to start', err);
  process.exit(1);
});

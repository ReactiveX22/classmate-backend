import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DrizzleExceptionFilter } from './common/filters/drizzle-exception.filter';
import { GlobalValidationPipe } from './common/filters/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  app.set('query parser', 'extended');

  app.useGlobalPipes(GlobalValidationPipe);

  app.useGlobalFilters(new DrizzleExceptionFilter());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
      'Set-Cookie',
    ],
  });

  // swagger setup
  const docConfig = new DocumentBuilder()
    .setTitle('ClassMate API')
    .setDescription('API documentation for ClassMate')
    .setVersion('1.0')
    .build();
  const doc = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('api', app, doc);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

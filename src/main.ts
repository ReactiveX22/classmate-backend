import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DrizzleExceptionFilter } from './common/filters/drizzle-exception.filter';
import { GlobalValidationPipe } from './common/filters/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  app.useGlobalPipes(GlobalValidationPipe);

  app.useGlobalFilters(new DrizzleExceptionFilter());

  app.setGlobalPrefix('api/v1');

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

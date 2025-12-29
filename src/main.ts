import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DrizzleExceptionFilter } from './common/filters/drizzle-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const customErrors: { field: string; issue: string }[] = [];

        errors.forEach((error) => {
          if (error.constraints) {
            Object.values(error.constraints).forEach((issue) => {
              customErrors.push({
                field: error.property,
                issue: issue,
              });
            });
          }
        });

        throw new BadRequestException({
          errorCode: 'VALIDATION_FAILED',
          message: 'Validation failed',
          errors: customErrors,
        });
      },
    }),
  );

  app.useGlobalFilters(new DrizzleExceptionFilter());

  app.setGlobalPrefix('api/v1');

  // app.useStaticAssets(join(process.cwd(), 'uploads'), {
  //   prefix: '/uploads/',
  // });

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

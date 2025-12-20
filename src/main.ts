import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

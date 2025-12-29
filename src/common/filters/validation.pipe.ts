import { BadRequestException, ValidationPipe } from '@nestjs/common';

export const GlobalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => {
    const formatErrors = (validationErrors: any[]) => {
      const result: { field: string; issue: string }[] = [];

      validationErrors.forEach((error) => {
        if (error.constraints) {
          Object.values(error.constraints).forEach((issue: string) => {
            result.push({
              field: error.property,
              issue: issue,
            });
          });
        }

        if (error.children && error.children.length > 0) {
          const childrenErrors = formatErrors(error.children);
          childrenErrors.forEach((childError) => {
            result.push({
              field: `${error.property}.${childError.field}`,
              issue: childError.issue,
            });
          });
        }
      });

      return result;
    };

    throw new BadRequestException({
      errorCode: 'VALIDATION_FAILED',
      message: 'Validation failed',
      errors: formatErrors(errors),
    });
  },
});

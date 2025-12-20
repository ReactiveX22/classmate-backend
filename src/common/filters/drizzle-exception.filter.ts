import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm';
import { Response } from 'express';
import { DatabaseError } from 'pg';
import { ERROR_CODES } from '../constants/error.codes';

@Catch(DrizzleQueryError)
export class DrizzleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DrizzleExceptionFilter.name);

  catch(exception: DrizzleQueryError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error('Drizzle Query Error', {
      message: exception.message,
      cause: exception.cause,
      query: exception.query,
      params: exception.params,
    });

    if (
      (exception.cause as DatabaseError)?.code === '23505' ||
      exception.cause?.message?.includes('duplicate key value')
    ) {
      return response.status(HttpStatus.CONFLICT).json({
        errorCode: ERROR_CODES.INFRA.DUPLICATE_KEY,
        message: 'A record with this unique value already exists.',
      });
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      errorCode: ERROR_CODES.INFRA.DRIZZLE_QUERY_ERROR,
      message: 'An error occurred while processing the database query.',
    });
  }
}

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
    const cause = exception.cause as DatabaseError;

    this.logger.error('Drizzle Query Error', {
      message: exception.message,
      code: cause?.code,
      causeMessage: cause?.message,
    });

    if (
      cause?.code === '23505' ||
      cause?.message?.includes('duplicate key value')
    ) {
      return response.status(HttpStatus.CONFLICT).json({
        errorCode: ERROR_CODES.INFRA.DUPLICATE_KEY,
        message: 'A record with this unique value already exists.',
      });
    }

    if (
      cause?.message?.includes('Connection terminated') ||
      cause?.message?.includes('timeout')
    ) {
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        errorCode: ERROR_CODES.INFRA.DB_CONNECTION_TIMEOUT,
        message: 'Database is overloaded. Please try again later.',
      });
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      errorCode: ERROR_CODES.INFRA.DRIZZLE_QUERY_ERROR,
      message: 'An error occurred while processing the database query.',
    });
  }
}

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
      const detail = cause?.detail || '';
      // detail format: Key (code, semester, session)=(CS101, 8th, Spring 2025) already exists.
      const match = detail.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/);

      let errors: { field: string; issue: string }[] = [];
      let message = 'A record with this unique value already exists.';

      if (match) {
        const columns = match[1].split(', ');
        const values = match[2].split(', ');

        errors = columns.map((col, index) => {
          // Map snake_case database column to camelCase for frontend
          const field = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          const value = values[index];
          return {
            field,
            issue: `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" already exists.`,
          };
        });

        if (errors.length === 1) {
          message = errors[0].issue;
        } else {
          message = `Combination of ${columns.join(', ')} already exists.`;
        }
      }

      return response.status(HttpStatus.CONFLICT).json({
        errorCode: ERROR_CODES.INFRA.DUPLICATE_KEY,
        message,
        errors: errors.length > 0 ? errors : undefined,
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

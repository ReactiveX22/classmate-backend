import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error.codes';
import { ApplicationErrorCode } from './error.types';

/**
 * Base application-wide exception class.
 * Ensures all API errors adhere to a standardized format {message, errorCode}.
 */
export class ApplicationException extends HttpException {
  public readonly errorCode: ApplicationErrorCode;

  constructor(status: HttpStatus, message: string, errorCode: string) {
    super({ message, errorCode }, status);
    this.errorCode = errorCode as ApplicationErrorCode;
  }
}

export class ApplicationNotFoundException extends ApplicationException {
  constructor(
    message: string = 'Not Found',
    errorCode: string = ERROR_CODES.INFRA.RESOURCE_NOT_FOUND,
  ) {
    super(HttpStatus.NOT_FOUND, message, errorCode);
  }
}

export class ApplicationBadRequestException extends ApplicationException {
  constructor(
    message: string,
    errorCode: string = ERROR_CODES.INFRA.BAD_REQUEST,
  ) {
    super(HttpStatus.BAD_REQUEST, message, errorCode);
  }
}

export class ApplicationForbiddenException extends ApplicationException {
  constructor(
    message: string,
    errorCode: string = ERROR_CODES.INFRA.FORBIDDEN,
  ) {
    super(HttpStatus.FORBIDDEN, message, errorCode);
  }
}

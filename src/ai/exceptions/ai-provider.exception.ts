import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { ApplicationException } from 'src/common/exceptions/application.exception';
import { AiProviderErrorCode } from '../errors/ai-provider-error';

const AI_PROVIDER_ERROR_CODES: Record<AiProviderErrorCode, string> = {
  AI_PROVIDER_RATE_LIMITED: ERROR_CODES.INFRA.AI_PROVIDER_RATE_LIMITED,
  AI_PROVIDER_OVERLOADED: ERROR_CODES.INFRA.AI_PROVIDER_OVERLOADED,
  AI_PROVIDER_UNAVAILABLE: ERROR_CODES.INFRA.AI_PROVIDER_UNAVAILABLE,
  AI_PROVIDER_TIMEOUT: ERROR_CODES.INFRA.AI_PROVIDER_TIMEOUT,
  AI_PROVIDER_AUTH_FAILED: ERROR_CODES.INFRA.AI_PROVIDER_AUTH_FAILED,
  AI_PROVIDER_INVALID_RESPONSE: ERROR_CODES.INFRA.AI_PROVIDER_INVALID_RESPONSE,
  AI_PROVIDER_UNKNOWN: ERROR_CODES.INFRA.AI_PROVIDER_UNKNOWN,
};

export class AiProviderException extends ApplicationException {
  constructor(
    public readonly code: AiProviderErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE,
  ) {
    super(status, message, AI_PROVIDER_ERROR_CODES[code]);
  }
}

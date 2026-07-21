import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('')
export class AppController {
  @Get('/health')
  @SkipThrottle()
  @AllowAnonymous()
  getHello() {
    return { status: 'ok' };
  }
}

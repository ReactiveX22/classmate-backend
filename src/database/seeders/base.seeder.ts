import { Logger } from '@nestjs/common';

export abstract class BaseSeeder {
  protected readonly logger: Logger;

  constructor(protected readonly seederName: string) {
    this.logger = new Logger(`Seeder:${seederName}`);
  }

  abstract seed(): Promise<void>;

  protected log(message: string) {
    this.logger.log(message);
  }

  protected error(message: string, error?: any) {
    this.logger.error(message, error?.stack || error);
  }

  protected warn(message: string) {
    this.logger.warn(message);
  }
}

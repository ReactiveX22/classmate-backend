import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationService, PAGINATION_SERVICE } from './pagination.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: PAGINATION_SERVICE,
      useClass: PaginationService,
    },
  ],
  exports: [PAGINATION_SERVICE],
})
export class PaginationModule {}

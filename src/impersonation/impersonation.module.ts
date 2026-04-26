import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ImpersonationController } from './impersonation.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ImpersonationController],
})
export class ImpersonationModule {}

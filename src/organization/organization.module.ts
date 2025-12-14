import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';

@Module({
  imports: [DatabaseModule],
  providers: [OrganizationService, OrganizationRepository],
  exports: [OrganizationService],
})
export class OrganizationModule {}

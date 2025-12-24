import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';

@Injectable()
export class ClassroomRepository {
  constructor(@InjectDb() db: DB) {}

  async create() {}
}

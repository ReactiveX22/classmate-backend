import { Injectable } from '@nestjs/common';
import { type InsertNotice } from 'src/database/schema';
import { NoticeRepository } from './notice.repository';

@Injectable()
export class NoticeService {
  constructor(private readonly noticeRepository: NoticeRepository) {}

  async createNotice(data: InsertNotice) {
    // authorization checks
    return this.noticeRepository.create(data);
  }
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  async sendMail(to: string, subject: string, body: string) {
    console.log(to, subject, body);
  }
}

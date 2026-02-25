import * as nodemailer from 'nodemailer';
import { SmtpStrategy } from './smtp.strategy';

jest.mock('nodemailer');

describe('SmtpStrategy', () => {
  let strategy: SmtpStrategy;
  let mockTransporter: any;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    strategy = new SmtpStrategy({
      host: 'localhost',
      port: 1025,
      user: 'user',
      pass: 'pass',
      from: 'noreply@test.com',
    });
  });

  it('should call nodemailer with correct config', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'localhost',
      port: 1025,
      auth: {
        user: 'user',
        pass: 'pass',
      },
    });
  });

  it('should send email successfully', async () => {
    const options = {
      to: 'receiver@test.com',
      subject: 'Test Subject',
      body: 'Test Body',
      html: '<p>Test Html</p>',
    };

    await strategy.send(options);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: options.html,
    });
  });

  it('should use custom from address if provided', async () => {
    const options = {
      to: 'receiver@test.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'custom@test.com',
    };

    await strategy.send(options);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'custom@test.com',
      }),
    );
  });
});

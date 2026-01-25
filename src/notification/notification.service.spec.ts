import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { DatabaseModule } from 'src/database/database.module';
import { DB, DB_PROVIDER } from 'src/database/db.provider';
import { NotificationService } from './notification.service';

describe('NotificationService (Integration)', () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;
  let db: DB;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), DatabaseModule],
      providers: [NotificationService],
    }).compile();

    await moduleRef.init();

    service = moduleRef.get<NotificationService>(NotificationService);
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2);
    db = moduleRef.get<DB>(DB_PROVIDER);

    await db.execute(
      sql`TRUNCATE TABLE "notification" RESTART IDENTITY CASCADE`,
    );
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save the notification to the real database when event is emitted', async () => {
    const testPayload = {
      title: 'Integration Test',
      content: 'This is a real DB test',
    };

    await eventEmitter.emitAsync('notification.created', testPayload);

    const result = await db.query.notification.findFirst();
    expect(result).toBeDefined();
    expect(result?.title).toBe(testPayload.title);
  });
});

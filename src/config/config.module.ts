import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['.env.test.local', '.env.test']
          : '.env',

      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);

        if (!result.success) {
          console.error(
            '❌ Invalid environment variables:',
            JSON.stringify(result.error.format(), null, 2),
          );
          throw new Error('Config validation error');
        }

        return result.data;
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}

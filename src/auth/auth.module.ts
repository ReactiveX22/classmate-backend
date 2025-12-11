import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { ConfigModule } from 'src/config/config.module';
import { DatabaseModule } from 'src/database/database.module';
import { DB, DB_PROVIDER } from 'src/database/db.provider';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule],
      inject: [ConfigService, DB_PROVIDER],
      useFactory: (configService: ConfigService, db: DB) => ({
        auth: betterAuth({
          basePath: '/api/v1/auth',
          baseURL: configService.get(
            'BETTER_AUTH_URL',
            'http://localhost:3000',
          ),
          database: drizzleAdapter(db, { provider: 'pg' }),
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
          },
          trustedOrigins: [
            configService.get('CLIENT_URL', 'http://localhost:3001'),
          ],
        }),
        middleware: (req, _res, next) => {
          req.url = req.originalUrl;
          req.baseUrl = '';
          next();
        },
      }),
    }),
  ],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { ConfigModule } from 'src/config/config.module';
import { DatabaseModule } from 'src/database/database.module';
import { DB, DB_PROVIDER } from 'src/database/db.provider';
import { UserModule } from 'src/user/user.module';
import { AuthHooksModule } from './auth-hooks.module';
import { AuthResponseHook } from './hooks/auth-response.hook';
import { SignupValidationHook } from './hooks/signup-validation.hook';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UserModule,
    BetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule, UserModule, AuthHooksModule],
      inject: [ConfigService, DB_PROVIDER, AuthResponseHook],
      useFactory: (
        configService: ConfigService,
        db: DB,
        authResponseHook: AuthResponseHook,
      ) => ({
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
          hooks: {
            after: authResponseHook.createHook(),
          },
          plugins: [admin()],
        }),
        middleware: (req, _res, next) => {
          req.url = req.originalUrl;
          req.baseUrl = '';
          next();
        },
      }),
    }),
  ],
  providers: [SignupValidationHook],
})
export class AuthModule {}

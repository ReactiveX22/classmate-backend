import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { ConfigModule } from 'src/config/config.module';
import { DatabaseModule } from 'src/database/database.module';
import { DB, DB_PROVIDER } from 'src/database/db.provider';
import { OrganizationModule } from 'src/organization/organization.module';
import { UserModule } from 'src/user/user.module';
import { AuthHooksModule } from './auth-hooks.module';
import { authFactory } from './auth.factory';
import { AuthResponseHook } from './hooks/auth-response.hook';
import { SignUpHook } from './hooks/signup.hook';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UserModule,
    OrganizationModule,
    BetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule, UserModule, AuthHooksModule],
      inject: [ConfigService, DB_PROVIDER, AuthResponseHook, EventEmitter2],
      useFactory: (
        configService: ConfigService,
        db: DB,
        authResponseHook: AuthResponseHook,
        eventEmitter: EventEmitter2,
      ) => ({
        auth: authFactory(db, {
          baseURL: configService.get(
            'BETTER_AUTH_URL',
            'http://localhost:3000',
          ),
          clientURL: configService.get('CLIENT_URL', 'http://localhost:3001'),
          authResponseHook,
          eventEmitter,
        }),
        middleware: (req, _res, next) => {
          req.url = req.originalUrl;
          req.baseUrl = '';
          next();
        },
      }),
    }),
  ],
  providers: [SignUpHook],
})
export class AuthModule {}

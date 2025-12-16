import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { authFactory } from './auth.factory';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { ConfigModule } from 'src/config/config.module';
import { DatabaseModule } from 'src/database/database.module';
import { DB, DB_PROVIDER } from 'src/database/db.provider';
import { OrganizationModule } from 'src/organization/organization.module';
import { UserModule } from 'src/user/user.module';
import { AuthHooksModule } from './auth-hooks.module';
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
      inject: [ConfigService, DB_PROVIDER, AuthResponseHook],
      useFactory: (
        configService: ConfigService,
        db: DB,
        authResponseHook: AuthResponseHook,
      ) => ({
        auth: authFactory(db, {
          baseURL: configService.get(
            'BETTER_AUTH_URL',
            'http://localhost:3000',
          ),
          clientURL: configService.get('CLIENT_URL', 'http://localhost:3001'),
          authResponseHook,
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

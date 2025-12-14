import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { AuthResponseHook } from './hooks/auth-response.hook';

@Module({
  imports: [UserModule],
  providers: [AuthResponseHook],
  exports: [AuthResponseHook],
})
export class AuthHooksModule {}

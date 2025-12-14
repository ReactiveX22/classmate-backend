import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';

import { UserStatus } from 'src/common/enums/user-status.enum';

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: 'pg' }),
  plugins: [admin()],
  user: {
    additionalFields: {
      status: {
        type: 'string',
        defaultValue: UserStatus.Pending,
        input: false,
      },
      organizationId: {
        type: 'string',
        input: false,
        defaultValue: null,
      },
    },
  },
});

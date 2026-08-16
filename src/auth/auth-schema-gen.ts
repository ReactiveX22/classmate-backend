import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, createAccessControl } from 'better-auth/plugins';

import { UserStatus } from '../common/enums/user-status.enum';
import { AppRole } from '../common/enums/role.enum';

const appStatements = {
  user: ['create', 'impersonate'] as const,
};
export const ac = createAccessControl(appStatements);

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: 'pg' }),
  session: {
    additionalFields: {
      impersonatedBy: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        [AppRole.Admin]: ac.newRole({
          user: ['create', 'impersonate'],
        }),
        [AppRole.Instructor]: ac.newRole({
          user: [],
        }),
        [AppRole.Student]: ac.newRole({
          user: [],
        }),
      },
      adminRoles: [],
      defaultRole: AppRole.Student,
    }),
  ],
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

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, createAccessControl } from 'better-auth/plugins';

import { UserStatus } from '../common/enums/user-status.enum';
import { AppRole } from '../common/enums/role.enum';

const appStatements = {
  user: ['create', 'read', 'update', 'delete', 'list', 'ban'] as const,
};
export const ac = createAccessControl(appStatements);

export const superAdminRole = ac.newRole({
  user: ['create', 'read', 'update', 'delete', 'list', 'ban'],
});

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: 'pg' }),
  plugins: [
    admin({
      ac,
      roles: {
        [AppRole.SuperAdmin]: superAdminRole,
        [AppRole.Instructor]: ac.newRole({
          user: ['create', 'read', 'update', 'delete', 'list'],
        }),
      },
      adminRoles: [AppRole.SuperAdmin],
      defaultRole: AppRole.Admin,
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

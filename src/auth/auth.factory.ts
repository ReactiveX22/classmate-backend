import {
  betterAuth,
  BetterAuthOptions,
  InferSession,
  InferUser,
} from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  admin,
  createAccessControl,
  InferAdminRolesFromOption,
} from 'better-auth/plugins';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { DB } from 'src/database/db.provider';
import { AuthResponseHook } from './hooks/auth-response.hook';

const appStatements = {
  user: ['create', 'read', 'update', 'delete', 'list', 'ban'] as const,
};
export const ac = createAccessControl(appStatements);

export const superAdminRole = ac.newRole({
  user: ['create', 'read', 'update', 'delete', 'list', 'ban'],
});

export const authFactory = (
  db: DB,
  config: {
    baseURL: string;
    clientURL: string;
    authResponseHook: AuthResponseHook;
  },
) => {
  const authOptions = {
    basePath: '/api/v1/auth',
    baseURL: config.baseURL,
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins: [config.clientURL],
    hooks: {
      after: config.authResponseHook.createHook(),
    },
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
          defaultValue: UserStatus.Active,
          input: false,
        },
        organizationId: {
          type: 'string',
          input: true,
          defaultValue: null,
          required: false,
        },
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(authOptions);
};

export type AuthType = ReturnType<typeof authFactory>;
export type Session = AuthType['$Infer']['Session'];
export type User = AuthType['$Infer']['Session']['user'];

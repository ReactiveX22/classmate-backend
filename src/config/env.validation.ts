import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test', 'provision'])
      .default('development'),

    DATABASE_URL: z.string().min(1, 'Database URL is required'),

    BETTER_AUTH_SECRET: z.string().min(1, 'Auth secret is required'),
    BETTER_AUTH_URL: z.string().url(),
    CLIENT_URL: z.string().url(),

    MAIL_SERVICE: z.enum(['google', 'mailtrap', 'null']).default('null'),
    MAIL_USER: z.string().optional(),
    MAIL_PASS: z.string().optional(),
    MAIL_FROM: z.string().email(),
  })
  .refine(
    (data) => {
      if (data.MAIL_SERVICE !== 'null') {
        return !!data.MAIL_USER && !!data.MAIL_PASS && !!data.MAIL_FROM;
      }
      return true;
    },
    {
      message:
        "MAIL_USER, MAIL_PASS and MAIL_FROM are required when MAIL_SERVICE is not 'null'",
      path: ['MAIL_SERVICE'],
    },
  );

export type EnvironmentVariables = z.infer<typeof envSchema>;

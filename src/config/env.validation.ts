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

    STORAGE_SERVICE: z.enum(['local', 'minio', 's3']).default('local'),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_REGION: z.string().optional(),
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_PUBLIC_URL: z.string().url().optional(),
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
  )
  .refine(
    (data) => {
      if (data.STORAGE_SERVICE !== 'local') {
        return (
          !!data.STORAGE_ENDPOINT &&
          !!data.STORAGE_REGION &&
          !!data.STORAGE_ACCESS_KEY &&
          !!data.STORAGE_SECRET_KEY &&
          !!data.STORAGE_BUCKET &&
          !!data.STORAGE_PUBLIC_URL
        );
      }
      return true;
    },
    {
      message:
        "STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET and STORAGE_PUBLIC_URL are required when STORAGE_SERVICE is not 'local'",
      path: ['STORAGE_SERVICE'],
    },
  );

export type EnvironmentVariables = z.infer<typeof envSchema>;

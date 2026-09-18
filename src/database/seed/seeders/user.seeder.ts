import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as authSchema from 'src/database/schema/auth-schema';
import * as teacherSchema from 'src/database/schema/teacher-schema';
import * as studentSchema from 'src/database/schema/student-schema';
import * as profileSchema from 'src/database/schema/user-profile-schema';

const USERS_PATH = '../data/users.json';
const TEACHERS_PATH = '../data/teachers.json';
const STUDENTS_PATH = '../data/students.json';
const PROFILES_PATH = '../data/profiles.json';
const AVATARS_DIR = path.join(
  process.cwd(),
  'src/database/seed/data/avatars',
);

interface UserSeed {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  image?: string | null;
}

interface TeacherSeed {
  userId: string;
  title: string;
  joinDate: string;
}

interface StudentSeed {
  userId: string;
  studentId: string;
}

interface ProfileSeed {
  phone: string;
  bio: string;
  skills: string[];
  achievements: Array<{
    id: string;
    title: string;
    issuer?: string;
    date?: string;
    description?: string;
  }>;
}

type StorageKind = 'local' | 's3';

function getStorageKind(): StorageKind {
  const raw = (process.env.STORAGE_SERVICE || 'local').toLowerCase();
  return raw === 'minio' || raw === 's3' ? 's3' : 'local';
}

function buildS3Client(): { client: S3Client; bucket: string } {
  const endpoint = process.env.STORAGE_ENDPOINT || '';
  const region = process.env.STORAGE_REGION || 'us-east-1';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY || '';
  const secretAccessKey = process.env.STORAGE_SECRET_KEY || '';
  const bucket = process.env.STORAGE_BUCKET || 'classmate';
  const client = new S3Client({
    endpoint: endpoint || undefined,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return { client, bucket };
}

const MIME_PNG = 'image/png';

// All users share this password for the demo
const SEED_PASSWORD = 'password123';

export async function seedUsers(db: NodePgDatabase<any>, orgId: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const users = require(USERS_PATH) as UserSeed[];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const teachers = require(TEACHERS_PATH) as TeacherSeed[];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const students = require(STUDENTS_PATH) as StudentSeed[];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const profiles = require(PROFILES_PATH) as Record<string, ProfileSeed>;

  const hashedPassword = await hash(SEED_PASSWORD);

  // --- Upload avatars to storage ---
  const kind = getStorageKind();
  const s3 = kind === 's3' ? buildS3Client() : null;

  const avatarUrlMap = new Map<string, string>();

  for (const u of users) {
    const fileName = `${u.id}.png`;
    const srcPath = path.join(AVATARS_DIR, fileName);

    let exists = false;
    try {
      await fs.access(srcPath);
      exists = true;
    } catch {
      // no avatar file for this user
    }
    if (!exists) continue;

    const key = `profiles/${fileName}`;
    const url = `/api/v1/uploads/${key}`;

    if (kind === 'local') {
      const destDir = path.join(process.cwd(), 'uploads', 'profiles');
      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(srcPath, path.join(destDir, fileName));
    } else if (s3) {
      const body = await fs.readFile(srcPath);
      await s3.client.send(
        new PutObjectCommand({
          Bucket: s3.bucket,
          Key: key,
          Body: body,
          ContentType: MIME_PNG,
        }),
      );
    }

    avatarUrlMap.set(u.id, url);
  }

  console.log(`  uploaded ${avatarUrlMap.size} avatars to ${kind} storage`);

  // --- Users ---
  const teacherIds = new Set(teachers.map((t) => t.userId));
  const studentIds = new Set(students.map((s) => s.userId));

  const userInserts = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status as 'active' | 'pending',
    emailVerified: u.emailVerified,
    image: avatarUrlMap.get(u.id) ?? null,
    organizationId: teacherIds.has(u.id) || studentIds.has(u.id) ? orgId : null,
  }));

  // Use onConflictDoNothing for idempotency
  await db
    .insert(authSchema.user)
    .values(userInserts)
    .onConflictDoNothing({ target: authSchema.user.id });

  console.log(`  upserted ${userInserts.length} users`);

  // --- Accounts (credentials) ---
  const accountInserts = users.map((u) => ({
    id: `acc_${u.id}`,
    accountId: u.id,
    providerId: 'credential',
    userId: u.id,
    password: hashedPassword,
  }));

  await db
    .insert(authSchema.account)
    .values(accountInserts)
    .onConflictDoNothing({ target: authSchema.account.id });

  console.log(
    `  created ${accountInserts.length} accounts (password: "${SEED_PASSWORD}")`,
  );

  // --- Teacher records ---
  const teacherInserts = teachers.map((t) => ({
    userId: t.userId,
    title: t.title,
    joinDate: t.joinDate,
  }));

  await db
    .insert(teacherSchema.teacher)
    .values(teacherInserts)
    .onConflictDoNothing({ target: teacherSchema.teacher.userId });

  console.log(`  created ${teacherInserts.length} teacher records`);

  // --- Student records ---
  const studentInserts = students.map((s) => ({
    userId: s.userId,
    studentId: s.studentId,
  }));

  await db
    .insert(studentSchema.student)
    .values(studentInserts)
    .onConflictDoNothing({ target: studentSchema.student.userId });

  console.log(`  created ${studentInserts.length} student records`);

  // --- Profiles ---
  const profileInserts = Object.entries(profiles).map(([userId, p]) => ({
    userId,
    phone: p.phone,
    bio: p.bio,
    skills: p.skills,
    achievements: p.achievements,
  }));

  await db
    .insert(profileSchema.userProfile)
    .values(profileInserts)
    .onConflictDoNothing({ target: profileSchema.userProfile.userId });

  console.log(`  created ${profileInserts.length} user profiles`);
}

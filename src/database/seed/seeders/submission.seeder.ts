import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as submissionSchema from 'src/database/schema/assignment-submission-schema';
import * as postSchema from 'src/database/schema/classroom-post-schema';
import type { Attachment } from 'src/database/schema/types';
import { daysAgo } from 'src/database/seed/date-utils';
import { renderStarlightPdf } from '../pdf/starlight-pdf';

const SUBMISSIONS_PATH = '../data/submissions.json';
const SOURCE_DIR = path.join(
  process.cwd(),
  'src/database/seed/data/submission-files',
);

const TEACHER_ID = 'usr_teacher_001';
const MIME_PDF = 'application/pdf';

interface SubmissionData {
  postId: string;
  studentId: string;
  status: 'turned_in' | 'graded';
  content?: string;
  submittedDaysAgo?: number;
  grade?: number;
  feedback?: string;
  attachment?: {
    filename: string;
    title: string;
    source: string;
  };
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

async function uploadPdf(
  pdf: Buffer,
  classroomId: string,
  attachmentId: string,
  kind: StorageKind,
  s3: { client: S3Client; bucket: string } | null,
): Promise<{ url: string; stored: boolean }> {
  const fileName = `${attachmentId}.pdf`;
  const folder = `classroom-attachments/${classroomId}`;
  const key = `${folder}/${fileName}`;
  const url = `/api/v1/uploads/${key}`;

  if (kind === 'local') {
    await fs.mkdir(path.join(process.cwd(), 'uploads', folder), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(process.cwd(), 'uploads', folder, fileName),
      pdf,
    );
    return { url, stored: true };
  }

  if (s3) {
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: pdf,
        ContentType: MIME_PDF,
      }),
    );
    return { url, stored: true };
  }

  return { url, stored: false };
}

export async function seedSubmissions(
  db: NodePgDatabase<any>,
): Promise<{ inserted: number; skipped: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const submissionsData = require(SUBMISSIONS_PATH) as SubmissionData[];
  const kind = getStorageKind();
  const s3 =
    kind === 's3' &&
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_ACCESS_KEY
      ? buildS3Client()
      : null;

  const postIds = [...new Set(submissionsData.map((s) => s.postId))];
  const posts = await db
    .select({
      id: postSchema.classroomPost.id,
      classroomId: postSchema.classroomPost.classroomId,
    })
    .from(postSchema.classroomPost)
    .where(inArray(postSchema.classroomPost.id, postIds));
  const classroomByPost = new Map(posts.map((p) => [p.id, p.classroomId]));

  const existing = await db
    .select({
      postId: submissionSchema.assignmentSubmission.postId,
      studentId: submissionSchema.assignmentSubmission.studentId,
    })
    .from(submissionSchema.assignmentSubmission)
    .where(inArray(submissionSchema.assignmentSubmission.postId, postIds));
  const existingKeys = new Set(
    existing.map((e) => `${e.postId}|${e.studentId}`),
  );

  let inserted = 0;
  let skipped = 0;

  for (const row of submissionsData) {
    const key = `${row.postId}|${row.studentId}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const classroomId = classroomByPost.get(row.postId);
    if (!classroomId) {
      console.log(`  [submissions] post missing, skip ${key}`);
      skipped++;
      continue;
    }

    const submittedAt = daysAgo(row.submittedDaysAgo ?? 1);
    let attachments: Attachment[] = [];

    if (row.attachment) {
      const attachmentId = randomUUID();
      try {
        const mdRaw = await fs.readFile(
          path.join(SOURCE_DIR, row.attachment.source),
          'utf8',
        );
        // Student work renders unbranded: no university letterhead.
        const pdf = await renderStarlightPdf(mdRaw, {
          title: row.attachment.title,
          branding: 'plain',
        });
        const { url, stored } = await uploadPdf(
          pdf,
          classroomId,
          attachmentId,
          kind,
          s3,
        );
        if (!stored) {
          console.log(
            `  [submissions] S3 env incomplete, skip file for ${key}`,
          );
          skipped++;
          continue;
        }
        attachments = [
          {
            id: attachmentId,
            name: row.attachment.filename,
            url,
            type: 'file',
            size: pdf.length,
            mimeType: MIME_PDF,
          },
        ];
      } catch (err) {
        console.log(
          `  [submissions] WARNING: skipped file for ${key}: ${(err as Error).message}`,
        );
        skipped++;
        continue;
      }
    }

    await db
      .insert(submissionSchema.assignmentSubmission)
      .values({
        postId: row.postId,
        studentId: row.studentId,
        content: row.content ?? null,
        attachments,
        status: row.status,
        grade: row.status === 'graded' ? (row.grade ?? null) : null,
        feedback: row.status === 'graded' ? (row.feedback ?? null) : null,
        gradedById: row.status === 'graded' ? TEACHER_ID : null,
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      })
      .onConflictDoNothing({
        target: [
          submissionSchema.assignmentSubmission.studentId,
          submissionSchema.assignmentSubmission.postId,
        ],
      });

    // Guard against double-seeding within one run if JSON has dupes.
    existingKeys.add(key);
    inserted++;
  }

  console.log(`  submissions: ${inserted} inserted, ${skipped} skipped`);
  return { inserted, skipped };
}

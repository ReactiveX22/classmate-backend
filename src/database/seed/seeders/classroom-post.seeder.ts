import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as postSchema from 'src/database/schema/classroom-post-schema';
import * as commentSchema from 'src/database/schema/classroom-post-comment-schema';
import * as bookmarkSchema from 'src/database/schema/classroom-resource-bookmark-schema';
import type { Attachment } from 'src/database/schema/types';
import { daysAgo, daysFromNow } from 'src/database/seed/date-utils';
import { renderStarlightPdf } from '../pdf/starlight-pdf';
import {
  buildPlaceholders as buildNoticePlaceholders,
  replacePlaceholders,
} from './notice.seeder';

const POSTS_PATH = '../data/classroom-posts.json';
const COMMENTS_PATH = '../data/classroom-post-comments.json';
const MANIFEST_PATH = path.join(
  process.cwd(),
  'src/database/seed/data/classroom-post-attachments.json',
);
const SOURCE_DIR = path.join(
  process.cwd(),
  'src/database/seed/data/classroom-post-attachments',
);

// LLM classroom (CSE 481) + DSA classroom (CSE 201). Others stay empty.
const LLM_CLASSROOM_ID = '7374ec6b-7b43-4509-beb9-18ee46099b88';
const DSA_CLASSROOM_ID = 'fdacc947-32ff-44a2-8fe2-b2aacbec7193';
const TEACHER_ID = 'usr_teacher_001';

interface PostData {
  id: string;
  classroomId?: string;
  type: 'announcement' | 'assignment' | 'material' | 'question';
  authorId?: string;
  title?: string | null;
  content: string;
  tags?: string[];
  isPinned?: boolean;
  commentsEnabled?: boolean;
  daysAgoCreated: number;
  assignment?: {
    dueInDays: number;
    points?: number;
    allowLateSubmission?: boolean;
    submissionType?: 'file' | 'text' | 'link' | 'multiple';
  };
  question?: {
    mode: 'short_answer' | 'poll';
    selectionMode?: 'single' | 'multiple';
    options?: Array<{ id: string; text: string; position: number }>;
    votes?: Array<{
      userId: string;
      optionIds: string[];
      votedDaysAgo: number;
    }>;
  };
}

interface CommentData {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  daysAgoCreated: number;
}

interface AttachmentManifestEntry {
  postId: string;
  attachmentId: string;
  filename: string;
  title: string;
  source: string;
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function buildPostPlaceholders(): Record<string, string> {
  const base = buildNoticePlaceholders();
  return {
    ...base,
    '{{rag_lab_due}}': formatDateLong(daysFromNow(7)),
    '{{quiz_date}}': formatDateLong(daysFromNow(4)),
    '{{dsa_hw4_due}}': formatDateLong(daysFromNow(6)),
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

export async function seedClassroomPosts(
  db: NodePgDatabase<any>,
  classrooms: Array<{ id: string }>,
): Promise<number> {
  // Resolve classroom ids from seeded rows (index 0 = LLM, 1 = DSA).
  const llmClassroomId = classrooms[0]?.id ?? LLM_CLASSROOM_ID;
  const dsaClassroomId = classrooms[1]?.id ?? DSA_CLASSROOM_ID;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postsData = require(POSTS_PATH) as PostData[];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const commentsData = require(COMMENTS_PATH) as CommentData[];
  const placeholders = buildPostPlaceholders();

  const postInserts = postsData.map((p) => {
    const created = daysAgo(p.daysAgoCreated);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = {
      id: p.id,
      classroomId: p.classroomId ?? llmClassroomId,
      authorId: p.authorId ?? TEACHER_ID,
      type: p.type,
      title: p.title ? replacePlaceholders(p.title, placeholders) : null,
      content: replacePlaceholders(p.content, placeholders),
      attachments: [],
      isPinned: p.isPinned ?? false,
      commentsEnabled: p.commentsEnabled ?? true,
      tags: p.tags ?? [],
      createdAt: created,
      updatedAt: created,
    };
    if (p.type === 'assignment' && p.assignment) {
      const due = daysFromNow(p.assignment.dueInDays);
      // 9:00 AM for quiz prep (dueInDays 4), 23:59 otherwise.
      if (p.assignment.dueInDays === 4) due.setHours(9, 0, 0, 0);
      else due.setHours(23, 59, 0, 0);
      row.assignmentData = {
        dueDate: due.toISOString(),
        points: p.assignment.points,
        allowLateSubmission: p.assignment.allowLateSubmission,
        submissionType: p.assignment.submissionType,
      };
    }
    if (p.type === 'question' && p.question) {
      if (p.question.mode === 'short_answer') {
        row.questionData = { mode: 'short_answer' };
      } else {
        row.questionData = {
          mode: 'poll',
          selectionMode: p.question.selectionMode ?? 'single',
          options: p.question.options ?? [],
          votes: (p.question.votes ?? []).map((v) => ({
            userId: v.userId,
            optionIds: v.optionIds,
            votedAt: daysAgo(v.votedDaysAgo).toISOString(),
          })),
        };
      }
    }
    return row;
  });

  await db
    .insert(postSchema.classroomPost)
    .values(postInserts)
    .onConflictDoNothing({ target: postSchema.classroomPost.id });

  const commentInserts = commentsData.map((c) => {
    const created = daysAgo(c.daysAgoCreated);
    return {
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      content: replacePlaceholders(c.content, placeholders),
      createdAt: created,
      updatedAt: created,
    };
  });

  if (commentInserts.length > 0) {
    await db
      .insert(commentSchema.classroomPostComment)
      .values(commentInserts)
      .onConflictDoNothing({ target: commentSchema.classroomPostComment.id });
  }

  console.log(
    `  upserted ${postInserts.length} classroom posts + ${commentInserts.length} comments (LLM + DSA classrooms)`,
  );

  // Marcus (demo student) saved key resources for quiz + proposal work.
  // No teacher bookmarks: teachers pin their own posts, they don't save them.
  const bookmarkInserts = [
    {
      id: '6dd53b10-79fa-5488-821e-faccac4958a3',
      postId: '5175c104-792f-5c0d-9fc8-93edb37079c0', // Lab 3 Materials
      userId: 'usr_student_001',
      createdAt: daysAgo(3),
    },
    {
      id: 'f889a754-7544-5895-a70d-ee0e3c12a5bc',
      postId: '0ff1ae54-f3ac-57a5-be76-848111120034', // Project Proposal
      userId: 'usr_student_001',
      createdAt: daysAgo(0),
    },
    {
      id: '634cf922-83cc-5c3d-adaf-ef6bafbcfa23',
      postId: '51b8484e-658c-5787-88b0-0b8a2dd87898', // fixed slides
      userId: 'usr_student_001',
      createdAt: daysAgo(0),
    },
    {
      id: '417702c9-fbb1-5cf3-a224-1346ba84ae46',
      postId: '72562cd4-665b-5623-bb61-383a03b04c4a', // DSA Homework 4
      userId: 'usr_student_001',
      createdAt: daysAgo(2),
    },
  ];

  await db
    .insert(bookmarkSchema.classroomResourceBookmark)
    .values(bookmarkInserts)
    .onConflictDoNothing({
      target: bookmarkSchema.classroomResourceBookmark.id,
    });

  console.log(`  upserted ${bookmarkInserts.length} bookmarks (Marcus)`);
  return postInserts.length;
}

export async function seedClassroomPostAttachments(
  db: NodePgDatabase<any>,
  classrooms: Array<{ id: string }>,
  opts: { reupload?: boolean } = {},
): Promise<{ uploaded: number; skipped: number }> {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw) as AttachmentManifestEntry[];
  const placeholders = buildPostPlaceholders();
  const kind = getStorageKind();
  const s3 =
    kind === 's3' &&
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_ACCESS_KEY
      ? buildS3Client()
      : null;

  const MIME = 'application/pdf';
  let uploaded = 0;
  let skipped = 0;

  for (const entry of manifest) {
    const fileName = `${entry.attachmentId}.pdf`;

    try {
      const [existing] = await db
        .select({
          id: postSchema.classroomPost.id,
          classroomId: postSchema.classroomPost.classroomId,
          attachments: postSchema.classroomPost.attachments,
        })
        .from(postSchema.classroomPost)
        .where(eq(postSchema.classroomPost.id, entry.postId));

      if (!existing) {
        console.log(`  [post-attachments] post missing, skip ${entry.source}`);
        skipped++;
        continue;
      }

      // Storage folder follows the post's own classroom (LLM, DSA, ...).
      const folder = `classroom-attachments/${existing.classroomId}`;
      const key = `${folder}/${fileName}`;
      const url = `/api/v1/uploads/${key}`;

      const current = existing.attachments ?? [];
      const alreadyLinked = current.some(
        (a) => a.id === entry.attachmentId,
      );

      let inStorage = false;
      try {
        if (kind === 'local') {
          await fs.access(path.join(process.cwd(), 'uploads', folder, fileName));
          inStorage = true;
        } else if (s3) {
          await s3.client.send(
            new HeadObjectCommand({ Bucket: s3.bucket, Key: key }),
          );
          inStorage = true;
        }
      } catch {
        inStorage = false;
      }

      if (alreadyLinked && inStorage && !opts.reupload) {
        skipped++;
        continue;
      }

      const mdRaw = await fs.readFile(
        path.join(SOURCE_DIR, entry.source),
        'utf8',
      );
      const resolved = replacePlaceholders(mdRaw, placeholders);
      const pdf = await renderStarlightPdf(resolved, { title: entry.title });

      if (kind === 'local') {
        await fs.mkdir(path.join(process.cwd(), 'uploads', folder), {
          recursive: true,
        });
        await fs.writeFile(path.join(process.cwd(), 'uploads', folder, fileName), pdf);
      } else if (s3) {
        await s3.client.send(
          new PutObjectCommand({
            Bucket: s3.bucket,
            Key: key,
            Body: pdf,
            ContentType: MIME,
          }),
        );
      } else {
        console.log(
          `  [post-attachments] S3 env incomplete, skip upload for ${entry.source}`,
        );
        skipped++;
        continue;
      }

      const attachment: Attachment = {
        id: entry.attachmentId,
        name: entry.filename,
        url,
        type: 'file',
        size: pdf.length,
        mimeType: MIME,
      };

      const merged = alreadyLinked
        ? current.map((a) => (a.id === attachment.id ? attachment : a))
        : [...current, attachment];

      await db
        .update(postSchema.classroomPost)
        .set({ attachments: merged, updatedAt: new Date() })
        .where(eq(postSchema.classroomPost.id, entry.postId));

      uploaded++;
      console.log(
        `  [post-attachments] uploaded ${entry.filename} (${pdf.length} bytes)`,
      );
    } catch (err) {
      console.log(
        `  [post-attachments] WARNING: skipped ${entry.source}: ${(err as Error).message}`,
      );
      skipped++;
    }
  }

  console.log(`  post attachments: ${uploaded} uploaded, ${skipped} skipped`);
  return { uploaded, skipped };
}

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as noticeSchema from 'src/database/schema/notice-schema';
import type { Attachment } from 'src/database/schema/types';
import { renderStarlightPdf } from '../pdf/starlight-pdf';
import { buildPlaceholders, replacePlaceholders } from './notice.seeder';

interface AttachmentManifestEntry {
  noticeId: string;
  attachmentId: string;
  filename: string;
  title: string;
  office: string;
  source: string;
}

const MANIFEST_PATH = path.join(
  process.cwd(),
  'src/database/seed/data/notice-attachments.json',
);
const SOURCE_DIR = path.join(
  process.cwd(),
  'src/database/seed/data/notice-attachments',
);

const MIME = 'application/pdf';

async function loadManifest(): Promise<AttachmentManifestEntry[]> {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw) as AttachmentManifestEntry[];
}

type StorageKind = 'local' | 's3';

function getStorageKind(): StorageKind {
  const raw = (process.env.STORAGE_SERVICE || 'local').toLowerCase();
  return raw === 'minio' || raw === 's3' ? 's3' : 'local';
}

function buildS3Client(): {
  client: S3Client;
  bucket: string;
} {
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

async function localExists(folder: string, fileName: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), 'uploads', folder, fileName));
    return true;
  } catch {
    return false;
  }
}

async function localUpload(
  folder: string,
  fileName: string,
  buffer: Buffer,
): Promise<void> {
  const dir = path.join(process.cwd(), 'uploads', folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);
}

async function s3Exists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function s3Upload(
  client: S3Client,
  bucket: string,
  key: string,
  buffer: Buffer,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: MIME,
    }),
  );
}

export async function seedNoticeAttachments(
  db: NodePgDatabase<any>,
  orgId: string,
  opts: { reupload?: boolean } = {},
): Promise<{ uploaded: number; skipped: number }> {
  const manifest = await loadManifest();
  const placeholders = buildPlaceholders();
  const kind = getStorageKind();
  const folder = `notice-attachments/${orgId}`;
  const s3 =
    kind === 's3' &&
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_ACCESS_KEY
      ? buildS3Client()
      : null;

  let uploaded = 0;
  let skipped = 0;

  for (const entry of manifest) {
    const fileName = `${entry.attachmentId}.pdf`;
    const key = `${folder}/${fileName}`;
    const url = `/api/v1/uploads/${key}`;

    try {
      const [existing] = await db
        .select({
          id: noticeSchema.notice.id,
          attachments: noticeSchema.notice.attachments,
        })
        .from(noticeSchema.notice)
        .where(
          and(
            eq(noticeSchema.notice.id, entry.noticeId),
            eq(noticeSchema.notice.organizationId, orgId),
          ),
        );

      if (!existing) {
        console.log(`  [attachments] notice missing, skip ${entry.source}`);
        skipped++;
        continue;
      }

      const current = existing.attachments ?? [];
      const alreadyLinked = current.some((a) => a.id === entry.attachmentId);

      let inStorage = false;
      try {
        inStorage =
          kind === 'local'
            ? await localExists(folder, fileName)
            : s3
              ? await s3Exists(s3.client, s3.bucket, key)
              : false;
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
      const pdf = await renderStarlightPdf(resolved, {
        title: entry.title,
      });

      if (kind === 'local') {
        await localUpload(folder, fileName, pdf);
      } else if (s3) {
        await s3Upload(s3.client, s3.bucket, key, pdf);
      } else {
        console.log(
          `  [attachments] S3 env incomplete, skip upload for ${entry.source}`,
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
        .update(noticeSchema.notice)
        .set({ attachments: merged, updatedAt: new Date() })
        .where(
          and(
            eq(noticeSchema.notice.id, entry.noticeId),
            eq(noticeSchema.notice.organizationId, orgId),
          ),
        );

      uploaded++;
      console.log(
        `  [attachments] uploaded ${entry.filename} (${pdf.length} bytes)`,
      );
    } catch (err) {
      console.log(
        `  [attachments] WARNING: skipped ${entry.source}: ${(err as Error).message}`,
      );
      skipped++;
    }
  }

  console.log(`  attachments: ${uploaded} uploaded, ${skipped} skipped`);
  return { uploaded, skipped };
}

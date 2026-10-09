import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const IMAGE_ONLY = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AUDIO_ALLOWED = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'video/webm',
]);
const MAX_BYTES = 8 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};

/**
 * Uploads live outside the Next.js build (`next start` does not serve files added to
 * `public/` after the build), so they survive rebuilds and redeploys. Point UPLOAD_DIR
 * at a persistent volume in production.
 */
export function uploadRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), 'storage', 'uploads');
}

/** Files written before UPLOAD_DIR existed. */
function legacyRoot(): string {
  return path.join(process.cwd(), 'public', 'uploads');
}

function mimeBase(type: string): string {
  return type.split(';')[0].trim().toLowerCase();
}

function extensionFor(type: string): string {
  const base = mimeBase(type);
  if (base === 'application/pdf') return 'pdf';
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  if (base === 'audio/webm' || base === 'video/webm') return 'webm';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mp4') return 'm4a';
  if (base === 'audio/wav') return 'wav';
  return 'jpg';
}

export function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

function safeJoin(root: string, relative: string): string | null {
  const absolute = path.resolve(root, relative);
  return absolute.startsWith(root + path.sep) ? absolute : null;
}

/** Resolve `/uploads/<folder>/<file>` (or `<folder>/<file>`) to an existing file on disk. */
export async function resolveUploadFile(publicPath: string): Promise<string | null> {
  const relative = publicPath.replace(/^\/?uploads\//, '');
  if (!relative || relative.includes('\0')) return null;

  for (const root of [uploadRoot(), legacyRoot()]) {
    const absolute = safeJoin(root, relative);
    if (!absolute) return null;
    try {
      const info = await stat(absolute);
      if (info.isFile()) return absolute;
    } catch {
      // Not in this root.
    }
  }
  return null;
}

export async function saveUpload(
  file: File,
  folder: string,
  options?: { imagesOnly?: boolean; audio?: boolean },
): Promise<string> {
  const allowed = options?.imagesOnly
    ? IMAGE_ONLY
    : options?.audio
      ? AUDIO_ALLOWED
      : ALLOWED;
  if (!allowed.has(mimeBase(file.type))) {
    throw new Error(
      options?.imagesOnly
        ? 'Only JPEG, PNG, or WebP images are allowed.'
        : options?.audio
          ? 'Only audio files are allowed.'
          : 'Only JPEG, PNG, WebP, or PDF files are allowed.',
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File must be 8MB or smaller.');
  }

  const dir = path.join(uploadRoot(), folder);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}

/** Delete a file previously saved under /uploads/...; ignores missing files. */
export async function deleteUpload(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath?.startsWith('/uploads/')) return;
  const absolute = await resolveUploadFile(publicPath);
  if (!absolute) return;
  try {
    await unlink(absolute);
  } catch {
    // File may already be gone.
  }
}

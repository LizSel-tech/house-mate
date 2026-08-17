import { mkdir, unlink, writeFile } from 'fs/promises';
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

  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}

/** Delete a file previously saved under /uploads/...; ignores missing files. */
export async function deleteUpload(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath?.startsWith('/uploads/')) return;
  const absolute = path.join(process.cwd(), 'public', publicPath);
  try {
    await unlink(absolute);
  } catch {
    // File may already be gone.
  }
}

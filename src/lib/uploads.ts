import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const IMAGE_ONLY = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFor(type: string): string {
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function saveUpload(
  file: File,
  folder: string,
  options?: { imagesOnly?: boolean },
): Promise<string> {
  const allowed = options?.imagesOnly ? IMAGE_ONLY : ALLOWED;
  if (!allowed.has(file.type)) {
    throw new Error(
      options?.imagesOnly
        ? 'Only JPEG, PNG, or WebP images are allowed.'
        : 'Only JPEG, PNG, WebP, or PDF files are allowed.',
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File must be 5MB or smaller.');
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

import { FileType } from '../shared/models/models';

export const MAX_FILE_MB = 10;
export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

const RULES: { type: FileType; mime: string; extensions: string[]; magic: number[] }[] = [
  { type: 'pdf', mime: 'application/pdf', extensions: ['pdf'], magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { type: 'jpg', mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], magic: [0xff, 0xd8, 0xff] },
  { type: 'png', mime: 'image/png', extensions: ['png'], magic: [0x89, 0x50, 0x4e, 0x47] },
];

/** Quick checks: extension, browser MIME type and size. Returns an error message or null. */
export function checkFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const rule = RULES.find(r => r.extensions.includes(ext));
  if (!rule || file.type !== rule.mime) return 'Only PDF, JPG and PNG files are allowed.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `File is too large. Maximum size is ${MAX_FILE_MB} MB.`;
  return null;
}

export const MAX_PHOTO_MB = 2;
/** Picker mein saari images dikhen (.jfif bhi) — asli type content se check hota hai. */
export const PHOTO_ACCEPT_ATTR = 'image/*';
export const PHOTO_TYPES_TEXT = 'JPG, PNG, WebP or AVIF';

/** Profile photo formats (API: `FileRules.PhotoKinds`). Har signature [offset, bytes] match hona chahiye. */
const PHOTO_SIGNATURES: [number, number[]][][] = [
  [[0, [0xff, 0xd8, 0xff]]], // JPEG (.jpg / .jpeg / .jfif)
  [[0, [0x89, 0x50, 0x4e, 0x47]]], // PNG
  [[0, [0x52, 0x49, 0x46, 0x46]], [8, [0x57, 0x45, 0x42, 0x50]]], // RIFF....WEBP
  [[4, [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]]], // ftypavif
];

/**
 * Profile photo check: size (max 2 MB) aur asli content — extension nahi dekha jata, kyunki Windows browser se
 * save hui JPEG aksar .jfif hoti hai. Error message ya null (API: `SetProfilePhotoCommand`).
 */
export async function checkPhoto(file: File): Promise<string | null> {
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) return `Photo is too large. Maximum size is ${MAX_PHOTO_MB} MB.`;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ok = PHOTO_SIGNATURES.some(sigs => sigs.every(([offset, bytes]) => bytes.every((byte, i) => header[offset + i] === byte)));
  return ok ? null : `Only ${PHOTO_TYPES_TEXT} photos are allowed.`;
}

/** Reads the first bytes to confirm the real content matches the extension. */
export async function detectFileType(file: File): Promise<FileType | null> {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const rule = RULES.find(r => r.extensions.includes(ext));
  if (!rule) return null;
  return rule.magic.every((byte, i) => header[i] === byte) ? rule.type : null;
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

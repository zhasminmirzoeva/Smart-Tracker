import * as FileSystem from 'expo-file-system';
import { apiFetch } from './apiFetch';

export type UploadImageResponse = {
  url: string;
  filename: string;
  content_type: string;
};

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function guessMimeByName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'image/jpeg';
}

export async function uploadImage({
  uri,
  name,
  type,
  maxMb = 5,
}: {
  uri: string;
  name?: string;
  type?: string;
  maxMb?: number;
}): Promise<UploadImageResponse> {
  // проверим лимит размера (совпадает с бэком)
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info?.exists && typeof info.size === 'number') {
      const sizeMb = info.size / (1024 * 1024);
      if (sizeMb > maxMb) {
        throw new Error(`Файл слишком большой (${sizeMb.toFixed(2)} МБ). Лимит — ${maxMb} МБ.`);
      }
    }
  } catch {
    // ок на web/если FileSystem недоступен
  }

  const fileName =
    name ??
    (() => {
      const base = uri.split('/').pop() || 'photo';
      return base.includes('.') ? base : `${base}.jpg`;
    })();

  const mime = type ?? guessMimeByName(fileName);
  if (!ALLOWED.has(mime)) throw new Error(`Тип файла не поддерживается: ${mime}`);

  const form = new FormData();
  form.append('file', {
    uri,
    name: fileName,
    type: mime,
  } as any);

  // важно: не задаём Content-Type — boundary выставит движок
  return apiFetch<UploadImageResponse>('/uploads/image', {
    method: 'POST',
    body: form,
    headers: {},
  });
}

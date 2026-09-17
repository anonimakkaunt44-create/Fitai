import { Env, UserFileMeta, R2Bucket, R2ObjectBody } from './types';
import { D1DatabaseService } from './db';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export class R2StorageService {
  constructor(private bucket: R2Bucket, private dbService: D1DatabaseService) {}

  /**
   * Upload file into Cloudflare R2 bucket with validation and D1 metadata tracking
   */
  async uploadFile(options: {
    userId: string;
    fileName: string;
    mimeType: string;
    data: ArrayBuffer | Uint8Array;
    purpose: 'receipt' | 'food_photo' | 'avatar' | 'progress_photo';
    isPublic?: boolean;
  }): Promise<{ ok: boolean; file?: UserFileMeta; error?: string }> {
    const { userId, fileName, mimeType, data, purpose, isPublic = false } = options;

    // 1. Validate MIME type
    const normalizedMime = mimeType.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return {
        ok: false,
        error: `Недопустимый формат файла (${mimeType}). Разрешены только JPG, PNG, WEBP, HEIC или PDF.`,
      };
    }

    // 2. Validate file size
    if (data.byteLength > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: `Файл слишком большой (${(data.byteLength / (1024 * 1024)).toFixed(1)} МБ). Максимум 10 МБ.`,
      };
    }

    // 3. Determine extension
    let ext = 'jpg';
    if (normalizedMime.includes('png')) ext = 'png';
    else if (normalizedMime.includes('webp')) ext = 'webp';
    else if (normalizedMime.includes('heic')) ext = 'heic';
    else if (normalizedMime.includes('pdf')) ext = 'pdf';

    // 4. Generate unique key: users/{userId}/{purpose}/{timestamp}_{random}.ext
    const randomSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const r2Key = `users/${userId}/${purpose}/${Date.now()}_${randomSuffix}.${ext}`;

    // 5. Store in R2 bucket
    try {
      await this.bucket.put(r2Key, data, {
        httpMetadata: {
          contentType: normalizedMime,
          cacheControl: 'public, max-age=31536000, immutable',
        },
        customMetadata: {
          uploadedBy: userId,
          purpose,
          originalName: fileName,
        },
      });

      const fileMeta: UserFileMeta = {
        id: `file_${Date.now()}_${randomSuffix.slice(0, 6)}`,
        r2Key,
        userId,
        fileName,
        mimeType: normalizedMime,
        sizeBytes: data.byteLength,
        purpose,
        isPublic,
        createdAt: new Date().toISOString(),
      };

      await this.dbService.saveUserFile(fileMeta);

      return { ok: true, file: fileMeta };
    } catch (err: any) {
      console.error('R2 upload error:', err);
      return { ok: false, error: `Ошибка загрузки в хранилище R2: ${err.message || String(err)}` };
    }
  }

  /**
   * Retrieve file from Cloudflare R2 with strict authorization
   */
  async getFile(
    r2Key: string,
    requestingUserId?: string,
    isAdmin = false
  ): Promise<{ ok: boolean; object?: R2ObjectBody; status?: number; error?: string }> {
    // 1. Check metadata in D1
    const fileMeta = await this.dbService.getUserFileByR2Key(r2Key);

    // If file is recorded, check ownership/admin rights
    if (fileMeta) {
      if (!fileMeta.isPublic && !isAdmin && fileMeta.userId !== requestingUserId) {
        return { ok: false, status: 403, error: 'Доступ запрещен: этот файл принадлежит другому пользователю.' };
      }
    } else {
      // Direct path check if metadata row is not yet indexed
      if (!isAdmin && requestingUserId && !r2Key.startsWith(`users/${requestingUserId}/`)) {
        return { ok: false, status: 403, error: 'Доступ запрещен' };
      }
    }

    const object = await this.bucket.get(r2Key);
    if (!object) {
      return { ok: false, status: 404, error: 'Файл не найден в хранилище' };
    }

    return { ok: true, object };
  }

  /**
   * Delete file from R2 and remove its D1 metadata
   */
  async deleteFile(
    r2Key: string,
    requestingUserId: string,
    isAdmin = false
  ): Promise<{ ok: boolean; error?: string }> {
    const fileMeta = await this.dbService.getUserFileByR2Key(r2Key);

    if (fileMeta && !isAdmin && fileMeta.userId !== requestingUserId) {
      return { ok: false, error: 'Доступ запрещен: невозможно удалить чужой файл' };
    }

    try {
      await this.bucket.delete(r2Key);
      await this.dbService.deleteUserFile(r2Key);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: `Ошибка удаления: ${err.message || String(err)}` };
    }
  }
}

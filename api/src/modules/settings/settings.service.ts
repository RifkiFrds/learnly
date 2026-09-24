import type { Prisma } from '@prisma/client';
import { uploadFile, type StoredFile } from '../../lib/storage';
import { settingsRepository } from './settings.repository';
import { DEFAULT_SETTINGS, settingsSchema, type PlatformSettings } from './settings.schema';

// Kunci di DB memakai snake_case (konvensi kolom/tabel), API memakai camelCase.
const KEY_MAP: Record<keyof PlatformSettings, string> = {
  serviceFee: 'service_fee',
  cancellationPolicy: 'cancellation_policy',
  bookingResponseHours: 'booking_response_hours',
  paymentWindowHours: 'payment_window_hours',
  defaultPassingGrade: 'default_passing_grade',
  reviewEditDays: 'review_edit_days',
  meetingLinkVisibleHours: 'meeting_link_visible_hours',
  qrisImageUrl: 'qris_image_url',
  bankTransfer: 'bank_transfer',
};

export const settingsService = {
  async get(): Promise<PlatformSettings> {
    const rows = await settingsRepository.findAll();
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const [field, key] of Object.entries(KEY_MAP)) {
      if (byKey.has(key)) merged[field] = byKey.get(key);
    }
    // Nilai rusak di DB tidak boleh membuat aplikasi crash → fallback ke default per field
    const parsed = settingsSchema.safeParse(merged);
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  },

  async update(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    await settingsRepository.upsertMany(
      Object.entries(patch).map(([field, value]) => ({
        key: KEY_MAP[field as keyof PlatformSettings],
        value: value as Prisma.InputJsonValue,
      })),
    );
    return this.get();
  },

  async uploadQrisImage(file: StoredFile): Promise<PlatformSettings> {
    const url = await uploadFile(file, { folder: 'settings' });
    return this.update({ qrisImageUrl: url });
  },
};

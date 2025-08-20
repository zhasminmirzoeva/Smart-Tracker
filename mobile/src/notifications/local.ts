import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { LocalNotifSettings } from '../storage/localNotifications';

export type ProductLite = {
  id: number | string;
  name: string;
  expiry_date: string; // 'YYYY-MM-DD' или 'YYYY-MM-DDTHH:mm:ssZ'
  quantity?: number | null;
};

/** Лимит одновременно запланированных уведомлений (iOS держит ~64). */
const MAX_SCHEDULED = 60;

/** Ограничение числа в диапазоне. */
function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Безопасное приведение к целому. */
function toInt(v: unknown): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

/** Локальная дата из 'YYYY-MM-DD' + установка часов/минут (без UTC-сдвига). */
function makeLocalDate(yyyyMmDdMaybeIso: string, hour: number, minute: number): Date {
  const onlyDate = (yyyyMmDdMaybeIso || '').slice(0, 10);
  const [y, m, d] = onlyDate.split('-').map((v) => parseInt(v, 10));
  const dt = new Date();
  dt.setFullYear(isFinite(y) ? y : dt.getFullYear());
  dt.setMonth(isFinite(m) ? m - 1 : dt.getMonth());
  dt.setDate(isFinite(d) ? d : dt.getDate());
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/** Отменяет все ранее запланированные локальные уведомления. */
export async function clearAllExpiryNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Планирование локальных уведомлений:
 *  - в день истечения (если присутствует 0 в днях)
 *  - за N дней (каждый N > 0)
 * Поддерживает настройки вида:
 *   - { enabled, hour, minute, days: number[] }   // наш основной вариант
 *   - { enabled, hour, minute, daysBefore: number } // совместимость с одиночным числом
 */
export async function scheduleExpiryNotifications(opts: {
  products: ProductLite[];
  settings: LocalNotifSettings | (LocalNotifSettings & { daysBefore?: number });
  channelId?: string; // Android channel id; по умолчанию 'expiry'
}): Promise<{ scheduled: number; skippedPast: number; skippedZeroQty: number; total: number }> {
  const { products, settings, channelId } = opts;
  const stats = { scheduled: 0, skippedPast: 0, skippedZeroQty: 0, total: products.length };

  if (!settings?.enabled) return stats;

  const hour = clamp((settings as any).hour ?? 9, 0, 23);
  const minute = clamp((settings as any).minute ?? 0, 0, 59);

  // Собираем список дней: из массива и/или одиночного значения
  const daysArr = Array.isArray((settings as any).days) ? ((settings as any).days as number[]) : [];
  const daysBeforeSingle = Number((settings as any).daysBefore ?? NaN);
  const days: number[] = Array.from(
    new Set([
      ...daysArr.filter((n) => Number.isFinite(n)).map((n) => Math.max(0, Math.trunc(n))),
      ...(Number.isFinite(daysBeforeSingle) ? [Math.max(0, Math.trunc(daysBeforeSingle))] : []),
    ]),
  ).sort((a, b) => a - b);

  if (days.length === 0) return stats; // ничего не просили планировать

  const includeDay0 = days.includes(0);
  const otherDays = days.filter((d) => d > 0);

  const androidChannel = Platform.OS === 'android' ? (channelId || 'expiry') : undefined;

  for (const p of products) {
    if (stats.scheduled >= MAX_SCHEDULED) break;

    const qty = toInt(p.quantity);
    if (Number.isFinite(qty) && qty <= 0) {
      stats.skippedZeroQty++;
      continue;
    }

    const atDay = makeLocalDate(p.expiry_date, hour, minute);

    // 1) В день истечения
    if (includeDay0) {
      if (isFuture(atDay)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Сегодня истекает срок',
            body: `${p.name} — последний день`,
            data: { productId: String(p.id) },
            ...(androidChannel ? { android: { channelId: androidChannel } } : {}),
          },
          trigger: { type: 'date', date: atDay },
        });
        stats.scheduled++;
      } else {
        stats.skippedPast++;
      }
    }

    // 2) За N дней (каждый > 0)
    for (const dBefore of otherDays) {
      if (stats.scheduled >= MAX_SCHEDULED) break;

      const when = new Date(atDay);
      when.setDate(when.getDate() - dBefore);

      const now = new Date();
      const isSameLocalDay =
        when.getFullYear() === now.getFullYear() &&
        when.getMonth() === now.getMonth() &&
        when.getDate() === now.getDate();

      if (when.getTime() > now.getTime()) {
        // обычный случай — будущее время
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Скоро истекает',
            body: `${p.name} — через ${dBefore} дн.`,
            data: { productId: String(p.id) },
            ...(androidChannel ? { android: { channelId: androidChannel } } : {}),
          },
          trigger: { type: 'date', date: when },
        });
        stats.scheduled++;
      } else if (isSameLocalDay) {
        // fallback: сегодня, но время уже прошло → отправим через 60 сек
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Скоро истекает',
            body: `${p.name} — через ${dBefore} дн.`,
            data: { productId: String(p.id) },
            ...(androidChannel ? { android: { channelId: androidChannel } } : {}),
          },
          trigger: { type: 'timeInterval', seconds: 60, repeats: false },
        });
        stats.scheduled++;
      } else {
        // в прошлом (вчера/раньше) — пропускаем
        stats.skippedPast++;
      }
    }
  }

  return stats;
}

/** Вспомогательная функция для отладки.
export async function scheduleDebugIn(seconds: number = 10): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Тест уведомления', body: `Через ${seconds} сек.` },
    trigger: { type: 'timeInterval', seconds, repeats: false },
  });
}*/

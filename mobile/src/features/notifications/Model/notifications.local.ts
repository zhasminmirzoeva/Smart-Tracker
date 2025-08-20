import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { LocalNotifSettings, ProductLite } from "./notifications.types";

/** Лимит одновременно запланированных уведомлений (iOS около 64). */
const MAX_SCHEDULED = 60;

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function toInt(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

/** Локальная дата из 'YYYY-MM-DD' + установка часов/минут (без UTC-сдвига). */
function makeLocalDate(yyyyMmDdMaybeIso: string, hour: number, minute: number): Date {
  const onlyDate = (yyyyMmDdMaybeIso || "").slice(0, 10);
  const [y, m, d] = onlyDate.split("-").map((v) => parseInt(v, 10));
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

export async function clearAllExpiryNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

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

  const daysArr = Array.isArray((settings as any).days) ? ((settings as any).days as number[]) : [];
  const daysBeforeSingle = Number((settings as any).daysBefore ?? NaN);
  const days: number[] = Array.from(
    new Set([
      ...daysArr.filter((n) => Number.isFinite(n)).map((n) => Math.max(0, Math.trunc(n))),
      ...(Number.isFinite(daysBeforeSingle) ? [Math.max(0, Math.trunc(daysBeforeSingle))] : []),
    ])
  ).sort((a, b) => a - b);

  if (days.length === 0) return stats;

  const includeDay0 = days.includes(0);
  const otherDays = days.filter((d) => d > 0);
  const androidChannel = Platform.OS === "android" ? (channelId || "expiry") : undefined;

  for (const p of products) {
    if (stats.scheduled >= MAX_SCHEDULED) break;

    const qty = toInt(p.quantity);
    if (Number.isFinite(qty) && qty <= 0) {
      stats.skippedZeroQty++;
      continue;
    }

    const atDay = makeLocalDate(p.expiry_date, hour, minute);

    // в день истечения
    if (includeDay0) {
      if (isFuture(atDay)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Сегодня истекает срок",
            body: `${p.name} — последний день`,
            data: { productId: String(p.id) },
            ...(androidChannel ? { android: { channelId: androidChannel } } : {}),
          },
          trigger: { type: "date", date: atDay },
        });
        stats.scheduled++;
      } else {
        stats.skippedPast++;
      }
    }

    // за N дней
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
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Скоро истекает",
            body: `${p.name} — через ${dBefore} дн.`,
            data: { productId: String(p.id) },
            ...(androidChannel ? { android: { channelId: androidChannel } } : {}),
          },
          trigger: { type: "date", date: when },
        });
        stats.scheduled++;
      } else if (isSameLocalDay) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Скоро истекает",
            body: `${p.name} — через ${dBefore} дн.`,
            data: { productId: String(p.id) },
            ...(androidChannel ? { android: { channelId: androidChannel } } : {}),
          },
          trigger: { type: "timeInterval", seconds: 60, repeats: false },
        });
        stats.scheduled++;
      } else {
        stats.skippedPast++;
      }
    }
  }

  return stats;
}

export async function scheduleDebugIn(seconds: number = 10): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: "Тест уведомления", body: `Через ${seconds} сек.` },
    trigger: { type: "timeInterval", seconds, repeats: false },
  });
}

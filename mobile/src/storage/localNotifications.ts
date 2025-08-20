import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'local_notification_settings';

export type LocalNotifSettings = {
  enabled: boolean;
  hour: number;   // 0..23
  minute: number; // 0..59
  days: number[]; // например [7,3,1,0]
};

const DEFAULTS: LocalNotifSettings = {
  enabled: true,
  hour: 9,
  minute: 0,
  days: [3, 0],
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function sanitize(input: Partial<LocalNotifSettings> | null | undefined): LocalNotifSettings {
  const hour = Number.isFinite((input as any)?.hour) ? clamp((input as any).hour, 0, 23) : DEFAULTS.hour;
  const minute = Number.isFinite((input as any)?.minute) ? clamp((input as any).minute, 0, 59) : DEFAULTS.minute;
  const enabled = typeof (input as any)?.enabled === 'boolean' ? (input as any).enabled : DEFAULTS.enabled;

  let days: number[] = Array.isArray((input as any)?.days)
    ? ((input as any).days as any[]).map((d) => Number(d)).filter((d) => Number.isFinite(d))
    : DEFAULTS.days;
  // уберём дубли и отсортируем
  days = Array.from(new Set(days)).sort((a, b) => a - b);

  return { enabled, hour, minute, days };
}

export async function getLocalNotifSettings(): Promise<LocalNotifSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return sanitize(parsed);
  } catch {
    return DEFAULTS;
  }
}

export async function saveLocalNotifSettings(s: LocalNotifSettings) {
  const clean = sanitize(s);
  await AsyncStorage.setItem(KEY, JSON.stringify(clean));
  return clean; // вернём обратно «чистую» версию
}

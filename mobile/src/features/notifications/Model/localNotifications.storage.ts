import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_LOCAL_SETTINGS, type LocalNotifSettings } from "./notifications.types";

const KEY = "local_notification_settings";

// Ограничение числа в диапазон [lo, hi]
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

// Валидация и очистка настроек уведомлений
function sanitize(input: Partial<LocalNotifSettings> | null | undefined): LocalNotifSettings {
  // Проверка и коррекция часа (0-23)
  const hour = Number.isFinite((input as any)?.hour) ? clamp((input as any).hour, 0, 23) : DEFAULT_LOCAL_SETTINGS.hour;
  
  // Проверка и коррекция минут (0-59)
  const minute = Number.isFinite((input as any)?.minute) ? clamp((input as any).minute, 0, 59) : DEFAULT_LOCAL_SETTINGS.minute;
  
  // Проверка флага включения уведомлений
  const enabled = typeof (input as any)?.enabled === "boolean" ? (input as any).enabled : DEFAULT_LOCAL_SETTINGS.enabled;

  // Обработка дней недели: фильтрация, удаление дубликатов, сортировка
  let days: number[] = Array.isArray((input as any)?.days)
    ? ((input as any).days as any[]).map((d) => Number(d)).filter((d) => Number.isFinite(d))
    : DEFAULT_LOCAL_SETTINGS.days;

  days = Array.from(new Set(days)).sort((a, b) => a - b);
  return { enabled, hour, minute, days };
}

// Получение настроек из хранилища
export async function getLocalNotifSettings(): Promise<LocalNotifSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_LOCAL_SETTINGS; // Настройки не найдены - возвращаем по умолчанию
    const parsed = JSON.parse(raw);
    return sanitize(parsed); // Валидация полученных данных
  } catch {
    return DEFAULT_LOCAL_SETTINGS; // При ошибке - настройки по умолчанию
  }
}

// Сохранение настроек с предварительной валидацией
export async function saveLocalNotifSettings(s: LocalNotifSettings) {
  const clean = sanitize(s); // Очистка перед сохранением
  await AsyncStorage.setItem(KEY, JSON.stringify(clean));
  return clean; // Возвращаем очищенные настройки
}
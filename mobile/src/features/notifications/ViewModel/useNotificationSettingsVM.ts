import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { getLocalNotifSettings, saveLocalNotifSettings } from "../Model/localNotifications.storage";
import { clearAllExpiryNotifications, scheduleExpiryNotifications } from "../Model/notifications.local";
import type { LocalNotifSettings } from "../Model/notifications.types";

import { useNotifications } from "../../../providers/NotificationsProvider";
import { productsApi } from "../../products/Model/products.api";

// Предустановленные дни для напоминаний
export const PRESET_DAYS = [7, 3, 1, 0] as const;

// ViewModel для экрана настроек уведомлений
export function useNotificationSettingsVM() {
  const { ensurePermissions } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<LocalNotifSettings>({
    enabled: true,
    hour: 9,
    minute: 0,
    days: [3, 0], // Напоминать за 3 дня и в день истечения
  });

  const [showTime, setShowTime] = useState(false);

  // Загрузка настроек при монтировании
  useEffect(() => {
    (async () => {
      try {
        const s = await getLocalNotifSettings();
        setState(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Текущее время для пикера
  const currentTime = useMemo(() => {
    const d = new Date();
    d.setHours(state.hour ?? 0, state.minute ?? 0, 0, 0);
    return d;
  }, [state.hour, state.minute]);

  // Переключение дня напоминания
  const toggleDay = useCallback((d: number) => {
    setState((prev) => {
      const set = new Set(prev.days);
      set.has(d) ? set.delete(d) : set.add(d);
      return { ...prev, days: Array.from(set).sort((a, b) => a - b) };
    });
  }, []);

  // Обработчик изменения времени
  const onTimeChange: DateTimePicker["props"]["onChange"] = useCallback((event, selected) => {
    if (selected) {
      setState((s) => ({ ...s, hour: selected.getHours(), minute: selected.getMinutes() }));
    }
    // Автозакрытие пикера на Android
    if (Platform.OS === "android") setShowTime(false);
  }, []);

  // Форматирование чисел (01, 02 и т.д.)
  const pad2 = (n: number) => String(n).padStart(2, "0");

  // Сохранение настроек и обновление расписания
  const save = useCallback(async () => {
    try {
      setSaving(true);
      // Сохранение в хранилище
      const clean = await saveLocalNotifSettings(state);
      setState(clean);

      // Перепланирование уведомлений
      const list = await productsApi.list();
      await clearAllExpiryNotifications();
      await scheduleExpiryNotifications({
        products: list.map((p) => ({
          id: p.id,
          name: p.name,
          expiry_date: p.expiry_date,
          quantity: p.quantity,
        })),
        settings: clean,
      });

      // Проверка разрешений
      const perm = await ensurePermissions();

      Alert.alert(
        "Сохранено",
        `Время: ${pad2(clean.hour)}:${pad2(clean.minute)} • дни: ${clean.days.join(", ") || "нет"}${
          !perm ? "\n(Разрешите уведомления в настройках системы)" : ""
        }`
      );
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }, [state, ensurePermissions]);

  return {
    // Состояние
    loading,
    saving,
    state,
    setState,
    showTime,
    setShowTime,
    currentTime,
    // Действия
    toggleDay,
    onTimeChange,
    save,
    // Константы
    PRESET_DAYS,
  } as const;
}
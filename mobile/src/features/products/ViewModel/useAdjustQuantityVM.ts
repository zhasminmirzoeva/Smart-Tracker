import { useCallback, useMemo, useState } from "react";
import { productsApi } from "../Model/products.api";
import { useNotifications } from "../../../providers/NotificationsProvider";
import { getLocalNotifSettings } from "../../../storage/localNotifications";
import { clearAllExpiryNotifications, scheduleExpiryNotifications } from "../../../notifications/local";

// Безопасное преобразование строки в целое число
function toIntSafe(v: string) {
  if (v.trim() === "") return NaN;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? NaN : n;
}

// ViewModel для экрана изменения количества продукта
export function useAdjustQuantityVM(params: { id: number | string; name: string; currentQuantity: number }) {
  const { id, name, currentQuantity } = params;

  // Состояние формы
  const [deltaStr, setDeltaStr] = useState<string>("0"); // Изменение количества
  const [exactStr, setExactStr] = useState<string>("");  // Точное количество

  // Состояние UI
  const [saving, setSaving] = useState(false);

  // Вычисление нового количества на основе введенных данных
  const computedNew = useMemo(() => {
    const exact = toIntSafe(exactStr);
    const delta = toIntSafe(deltaStr);
    
    // Приоритет: точное значение > изменение > текущее значение
    if (!Number.isNaN(exact)) return Math.max(0, exact);
    if (!Number.isNaN(delta)) return Math.max(0, currentQuantity + delta);
    return currentQuantity;
  }, [exactStr, deltaStr, currentQuantity]);

  // Применение предустановленного значения изменения
  const onApplyPreset = useCallback((p: number) => {
    const cur = toIntSafe(deltaStr);
    const base = Number.isNaN(cur) ? 0 : cur;
    setDeltaStr(String(base + p));
  }, [deltaStr]);

  // Установка нулевого количества (списание всего)
  const setZero = useCallback(() => setExactStr("0"), []);

  const { ensurePermissions } = useNotifications();

  // Перепланирование локальных уведомлений после изменения количества
  const rescheduleLocalNotifs = useCallback(async () => {
    try {
      const ok = await ensurePermissions();
      if (!ok) return; // Пропускаем если нет разрешений
      
      const settings = await getLocalNotifSettings();
      const list = await productsApi.list();
      
      // Обновляем все уведомления
      await clearAllExpiryNotifications();
      await scheduleExpiryNotifications({
        products: list.map(p => ({
          id: p.id,
          name: p.name,
          expiry_date: p.expiry_date,
          quantity: p.quantity,
        })),
        settings,
      });
    } catch {
      // Тихая ошибка - уведомления не критичны
    }
  }, [ensurePermissions]);

  // Сохранение изменений
  const save = useCallback(async () => {
    const exact = toIntSafe(exactStr);
    const delta = toIntSafe(deltaStr);

    let finalQty: number;
    
    // Определение итогового количества
    if (!Number.isNaN(exact)) {
      finalQty = exact; // Приоритет точному значению
    } else if (!Number.isNaN(delta)) {
      finalQty = currentQuantity + delta; // Используем изменение
    } else {
      throw new Error("Укажите Δ (изменение) или точное новое количество.");
    }

    finalQty = Math.max(0, finalQty); // Защита от отрицательных значений

    setSaving(true);
    try {
      await productsApi.patchQuantity(id, finalQty);
      await rescheduleLocalNotifs(); // Обновляем уведомления
    } finally {
      setSaving(false);
    }
  }, [exactStr, deltaStr, currentQuantity, id, rescheduleLocalNotifs]);

  return {
    // Только для чтения
    id, name, currentQuantity,
    // Форма
    deltaStr, setDeltaStr, exactStr, setExactStr, computedNew, onApplyPreset, setZero,
    // Действия
    save,
    // UI состояние
    saving,
  };
}
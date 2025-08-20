import { useCallback, useEffect, useMemo, useState } from "react";
import { productsApi } from "../Model/products.api";
import type { Product, ProductUi } from "../Model/products.types";
import { toProductUi } from "../Model/products.mapper";
import { clearAllExpiryNotifications, scheduleExpiryNotifications } from "../../../notifications/local";
import { getLocalNotifSettings } from "../../../storage/localNotifications";
import { useNotifications } from "../../../providers/NotificationsProvider";

// Типы сортировки и состояния
export type SortKey = "expiryAsc" | "expiryDesc" | "nameAsc" | "qtyDesc";
export type ProductsState = "loading" | "ready" | "error";

// ViewModel для экрана списка продуктов
export function useProductsVM() {
  // --- Состояние ---
  const [state, setState] = useState<ProductsState>("loading");
  const [error, setError] = useState<string | null>(null);

  // Продукты с сервера 
  const [serverItems, setServerItems] = useState<Product[]>([]);
  const [q, setQ] = useState(""); // Поисковый запрос
  const [sortKey, setSortKey] = useState<SortKey>("expiryAsc"); // Ключ сортировки
  const [groupByCategory, setGroupByCategory] = useState<boolean>(false); // Группировка по категориям
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Выбранная категория
  const [refreshing, setRefreshing] = useState(false); // Состояние обновления

  const { ensurePermissions } = useNotifications();

  // --- Планирование локальных уведомлений ---
  const planLocalNotifications = useCallback(async (data: Product[]) => {
    try {
      const ok = await ensurePermissions();
      if (!ok) return; // Пропускаем если нет разрешений
      
      const settings = await getLocalNotifSettings();
      await clearAllExpiryNotifications();
      await scheduleExpiryNotifications({
        products: (data ?? []).map(p => ({
          id: p.id, name: p.name, expiry_date: p.expiry_date, quantity: p.quantity,
        })),
        settings,
      });
    } catch {
      // Тихая ошибка - уведомления не критичны
    }
  }, [ensurePermissions]);

  // --- Загрузка данных ---
  const load = useCallback(async (query?: string) => {
    setState("loading");
    setError(null);
    try {
      const data = await productsApi.list(query);
      setServerItems(Array.isArray(data) ? data : []); // Защита от некорректных данных
      
      // Фоновая задача - не блокируем рендер
      planLocalNotifications(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (e: any) {
      setServerItems([]); // Очищаем список при ошибке
      setError(e?.message ?? "Не удалось загрузить продукты");
      setState("error");
    }
  }, [planLocalNotifications]);

  // Первоначальная загрузка
  useEffect(() => { load(); }, [load]);

  // Поиск продуктов
  const onSearch = useCallback(() => {
    const query = q.trim() || undefined;
    load(query);
  }, [q, load]);

  // Обновление с pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(q.trim() || undefined); }
    finally { setRefreshing(false); }
  }, [q, load]);

  // --- Категории (динамически из данных) ---
  const categories = useMemo(() => {
    const set = new Set<string>();
    (serverItems ?? []).forEach(i => { if (i?.category) set.add(i.category); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [serverItems]);

  // --- Преобразование в UI-формат ---
  const itemsUi = useMemo<ProductUi[]>(() => (serverItems ?? []).map(toProductUi), [serverItems]);

  // --- Вспомогательные функции ---
  const safeDays = (p: ProductUi) => {
    const v = Number((p as any).daysLeft);
    return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
  };
  
  const num = (x: any, fallback = -Infinity) => {
    const v = Number(x);
    return Number.isFinite(v) ? v : fallback;
  };

  // --- Фильтрация по выбранной категории ---
  const filtered = useMemo<ProductUi[]>(() => {
    const base = itemsUi ?? [];
    if (selectedCategory) {
      return base.filter(i => (i?.category ?? "").trim() === selectedCategory);
    }
    return base;
  }, [itemsUi, selectedCategory]);

  // --- Сортировка ---
  const sorted = useMemo<ProductUi[]>(() => {
    // Компараторы для разных типов сортировки
    const byExpiryAsc = (a: ProductUi, b: ProductUi) => safeDays(a) - safeDays(b);
    const byExpiryDesc = (a: ProductUi, b: ProductUi) => safeDays(b) - safeDays(a);
    const byNameAsc = (a: ProductUi, b: ProductUi) =>
      (a?.name ?? "").localeCompare(b?.name ?? "", "ru", { sensitivity: "base" });
    const byQtyDesc = (a: ProductUi, b: ProductUi) => num(b?.quantity) - num(a?.quantity);

    // Выбор компаратора по ключу сортировки
    const comparator =
      sortKey === "expiryAsc" ? byExpiryAsc :
      sortKey === "expiryDesc" ? byExpiryDesc :
      sortKey === "nameAsc" ? byNameAsc : byQtyDesc;

    return [...(filtered ?? [])].sort(comparator);
  }, [filtered, sortKey]);

  // --- Секции для FlatList (всегда плоский список) ---
  const sections = useMemo(() => [{ title: "", data: sorted }], [sorted]);

  // --- Действия ---
  const remove = useCallback(async (id: Product["id"]) => {
    await productsApi.remove(id);
    await onRefresh(); // Обновляем список после удаления
  }, [onRefresh]);

  // --- Меню категорий ---
  const categoryMenuOptions = useMemo(() => (["Все", ...categories] as const), [categories]);

  const applyCategoryByIndex = (i: number | null | undefined) => {
    if (i == null || i < 0 || i >= categoryMenuOptions.length) return;
    if (i === 0) {
      setSelectedCategory(null); // Сброс фильтра
      setGroupByCategory(false);
    } else {
      const cat = categories[i - 1];
      setSelectedCategory(cat ?? null);
      setGroupByCategory(false);
    }
  };

  // --- Меню сортировки ---
  const sortOptions = ["Название A→Я","Срок годности ↑","Срок годности ↓","Кол-во ↓"] as const;
  const sortKeysMap: SortKey[] = ["nameAsc","expiryAsc","expiryDesc","qtyDesc"];

  const applySortByIndex = (i: number | null | undefined) => {
    if (i == null || i < 0 || i >= sortKeysMap.length) return;
    setSortKey(sortKeysMap[i]);
    // Сброс фильтра по категории при смене сортировки
    setSelectedCategory(null);
    setGroupByCategory(false);
  };

  // --- Подсказка для тулбара ---
  const categoryHint = useMemo(() => selectedCategory ? `Категория: ${selectedCategory}` : "Все", [selectedCategory]);

  return {
    // Состояние
    state, error, refreshing,
    // Данные
    sections, categories,
    // Поиск/сортировка/категории
    q, setQ, onSearch, sortKey, groupByCategory, selectedCategory, categoryHint,
    // Действия
    setSortKey, onRefresh, remove, reload: load,
    // Меню
    sortOptions, applySortByIndex,
    categoryMenuOptions, applyCategoryByIndex,
  };
}
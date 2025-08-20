import { useCallback, useRef, useState, useMemo } from "react";
import { productsApi } from "../Model/products.api";
import type { Product } from "../Model/products.types";
import { clearAllExpiryNotifications, scheduleExpiryNotifications } from "../../../notifications/local";
import { getLocalNotifSettings } from "../../../storage/localNotifications";
import { useNotifications } from "../../../providers/NotificationsProvider";
import { uploadImage } from "../../../shared/api/uploads";

export type AddMode = "scan" | "loading" | "existing" | "prefilled" | "manual";

const EAN13 = /^\d{13}$/;
const toYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function useAddProductVM() {
  // ui/state
  const [mode, setMode] = useState<AddMode>("scan");
  const [torch, setTorch] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);

  // форма
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [pickedImage, setPickedImage] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [quantityFromBase, setQuantityFromBase] = useState<number | null>(null);
  const [quantityTouched, setQuantityTouched] = useState(false);

  // существующие продукты
  const [existingId, setExistingId] = useState<string | number | null>(null);
  const [existingCurrentQty, setExistingCurrentQty] = useState<number | null>(null);

  // дата
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  //уведомление для UI
  const [notice, setNotice] = useState<string | null>(null);

  // контроль
  const handlingRef = useRef(false);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);

  const { ensurePermissions } = useNotifications();

  const resetForm = useCallback(() => {
    setName("");
    setCategory("");
    setPhotoUrl(undefined);
    setPickedImage(null);
    setQuantity("");
    setQuantityTouched(false);
    setQuantityFromBase(null);
    setExistingId(null);
    setExistingCurrentQty(null);
    setExpiryDate(null);
  }, []);

  const planLocalNotifications = useCallback(async () => {
    try {
      const ok = await ensurePermissions();
      if (!ok) return;
      const settings = await getLocalNotifSettings();
      const list = await productsApi.list();
      await clearAllExpiryNotifications();
      await scheduleExpiryNotifications({
        products: list.map(p => ({ id: p.id, name: p.name, expiry_date: p.expiry_date, quantity: p.quantity })),
        settings,
      });
    } catch {}
  }, [ensurePermissions]);

  const handleBarcodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (!data || !EAN13.test(String(data))) return;
    if (mode !== "scan") return;
    if (handlingRef.current) return;

    // анти-дубли 2с
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === data && now - last.ts < 2000) return;
    lastScanRef.current = { code: data, ts: now };

    handlingRef.current = true;
    try {
      setMode("loading");
      setBarcode(data);
      resetForm();

      // запрос к бэкенду за превью
      let preview: any = null;
      try {
        preview = await productsApi.lookup(data);
      } catch (e: any) {
        const status = e?.status ?? e?.response?.status;
        const detail =
          e?.message ??
          e?.data?.detail ??
          e?.response?.data?.detail ??
          `Штрих-код ${data} не найден в базе. Заполните карточку вручную.`;

        if (status === 404) {
          setNotice(detail);   // экран покажет Alert с detail
          setBarcode(null);
          setQuantityFromBase(null);
          setMode("manual");
          return;
        }
        // прочие ошибки — пробросим
        throw e;
      }

      // если превью есть — предзаполняем форму
      if (preview && (preview.name || preview.category)) {
        setName(preview.name || "");
        setCategory(preview.category || "");
        setPhotoUrl(preview.photo_url || undefined);
        if (typeof preview.quantity === "number" && preview.quantity > 0) {
          setQuantityFromBase(preview.quantity);
          setQuantity(String(preview.quantity));
        }
      }

      // продукта уже есть у пользователя
      const items = await productsApi.list();
      const found = (items as Product[]).find(p => String(p.barcode || "") === data);
      if (found) {
        setExistingId(found.id);
        setExistingCurrentQty(found.quantity);
        setName(found.name || name);
        setCategory(found.category || category);
        setPhotoUrl(found.photo_url || photoUrl);
        setQuantity(String(found.quantity));
        setMode("existing");
        return;
      }

      // режим добавления
      if (preview && (preview.name || preview.category)) {
        setMode("prefilled");
      } else {
        setNotice(`Штрих-код ${data} не найден в базе. Заполните карточку вручную.`);
        setBarcode(null);
        setQuantityFromBase(null);
        setMode("manual");
      }
    } finally {
      handlingRef.current = false;
    }
  }, [mode, name, category, photoUrl, resetForm]);

  const save = useCallback(async () => {
    // количество обязательно: если пользователь трогал поле — берём только введённое,
    // иначе можно использовать quantityFromBase (если он пришёл из OFF)
    const typed = quantity.trim();
    const parsed = typed === "" ? NaN : Number.parseInt(typed, 10);
    const finalQty = quantityTouched
      ? (Number.isFinite(parsed) ? parsed : NaN)
      : (quantityFromBase != null ? quantityFromBase : NaN);

    if (!Number.isFinite(finalQty) || finalQty <= 0) {
      throw new Error("Количество обязательно и должно быть больше 0.");
    }

    const expiryStr = expiryDate ? toYYYYMMDD(expiryDate) : undefined;

    try {
      let productId: string | number | null = null;
      // фиксим кол-во
      if (mode === "existing" && existingId != null) {
        await productsApi.patchQuantity(existingId, finalQty as any);
        productId = existingId;
      } else if (mode === "prefilled" && barcode && expiryStr) {
        // теперь quantity обязателен уже на этапе создания
        const created = await productsApi.createFromOFF({ expiry_date: expiryStr, barcode, quantity: finalQty });
        productId = created?.id ?? null;
      } else if (mode === "manual" && expiryStr) {
        const created = await productsApi.createManual({
          expiry_date: expiryStr,
          name,
          category: category || undefined,
          quantity: finalQty,
        });
        productId = created?.id ?? null;
      } else {
        throw new Error("Заполните информацию о продукте");// не все обязательные поля азаполнены
      }

      // Фото (не обязательно)
      if (productId != null && pickedImage?.uri) {
        const uploaded = await uploadImage({ uri: pickedImage.uri, name: pickedImage.name, type: pickedImage.type });
        if (uploaded?.url) {
          await productsApi.update(productId, { photo_url: uploaded.url });
          setPhotoUrl(uploaded.url);
        }
      }

      await planLocalNotifications();
      return productId;
    } catch (e: any) {
      // Покажем detail от бэка. Если это 422 со списком ошибок — соберём их.
      const status = e?.status ?? e?.response?.status;
      const data = e?.data ?? e?.response?.data;
      if (status === 422) {
        if (Array.isArray(data?.detail)) {
          const msgs = data.detail.map((d: any) => d?.msg || d?.message).filter(Boolean);
          throw new Error(msgs.length ? msgs.join("\n") : (e?.message ?? "Ошибка валидации"));
        }
        if (typeof data?.detail === "string") {
          throw new Error(data.detail);
        }
      }
      throw new Error(e?.message ?? "Ошибка");
    }
  }, [
    mode, existingId, quantity, quantityTouched, quantityFromBase, expiryDate, barcode,
    name, category, pickedImage, planLocalNotifications
  ]);

  const api = useMemo(() => ({
    // UI state
    mode, setMode, torch, setTorch,
    // форматё
    name, setName, category, setCategory, photoUrl, setPhotoUrl,
    pickedImage, setPickedImage,
    quantity, setQuantity, quantityTouched, setQuantityTouched, quantityFromBase,
    existingId, existingCurrentQty, expiryDate, setExpiryDate,
    barcode, setBarcode,
    // уведомления
    notice, clearNotice: () => setNotice(null),
    // actions
    resetForm, handleBarcodeScanned, save,
  }), [
    mode, torch, name, category, photoUrl, pickedImage, quantity, quantityTouched, quantityFromBase,
    existingId, existingCurrentQty, expiryDate, barcode, notice,
    resetForm, handleBarcodeScanned, save
  ]);

  return api;
}

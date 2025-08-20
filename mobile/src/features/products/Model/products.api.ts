import { apiFetch } from "../../../shared/api/apiFetch";
import type { Product, ProductOFFPreview } from "./products.types";

const PREFIX = "/products";

// API для работы с продуктами
export const productsApi = {
  // Получение списка продуктов (с поиском по названию)
  list: (q?: string) =>
    apiFetch<Product[]>(`${PREFIX}${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  // Поиск продукта по штрихкоду через Open Food Facts
  lookup: (barcode: string) =>
    apiFetch<ProductOFFPreview>(`${PREFIX}/lookup?barcode=${encodeURIComponent(barcode)}`),

  // Создание продукта вручную
  createManual: (body: { expiry_date: string; name: string; category?: string; quantity: number }) =>
    apiFetch<Product>(`${PREFIX}`, { method: "POST", body: JSON.stringify(body) }),

  // Создание продукта из базы Open Food Facts
  createFromOFF: (body: { expiry_date: string; barcode: string; quantity: number }) =>
    apiFetch<Product>(`${PREFIX}`, { method: "POST", body: JSON.stringify(body) }),

  // Обновление количества продукта
  patchQuantity: (id: number | string, quantity: number) =>
    apiFetch<Product | void>(`${PREFIX}/${id}/quantity`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),

  // Полное обновление продукта
  update: (id: number | string, body: { name?: string; expiry_date?: string; category?: string; photo_url?: string; quantity?: number }) =>
    apiFetch<Product>(`${PREFIX}/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  // Удаление продукта
  remove: (id: number | string) => apiFetch<void>(`${PREFIX}/${id}`, { method: "DELETE" }),
};
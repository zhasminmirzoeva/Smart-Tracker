import type { Product, ProductUi } from "./products.types";

// Конвертация продукта из серверного формата в формат для UI
export function toProductUi(p: Product): ProductUi {
  const today = new Date();
  // Привязываем к полуночи, чтобы не «гуляло» число дней
  const exp = new Date(`${p.expiry_date}T00:00:00`);
  const diffMs = exp.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Определение статуса продукта
  const isExpired = daysLeft <= 0;
  const isWarn = daysLeft > 0 && daysLeft <= 3;

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    expiryDateLabel: new Date(p.expiry_date).toLocaleDateString(), // Форматированная дата
    daysLeft, // Оставшееся количество дней
    isExpired, // Просрочен
    isWarn, // Скоро истекает (1-3 дня)
    quantity: p.quantity,
    previewUri: p.photo_url ?? p.local_image_path ?? null, // Приоритет: серверное фото → локальное фото
    barcode: p.barcode,
  };
}
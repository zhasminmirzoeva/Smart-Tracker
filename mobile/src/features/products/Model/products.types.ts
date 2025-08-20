// Типы данных для работы с продуктами

// Продукт в формате сервера/базы данных
export type Product = {
  id: number | string;
  name: string;
  category?: string;
  expiry_date: string; // YYYY-MM-DD
  quantity: number; // граммы
  barcode?: string;
  photo_url?: string; // URL фото с сервера
  local_image_path?: string; // Локальный путь к фото
};

// Предварительные данные из Open Food Facts
export type ProductOFFPreview = {
  name?: string;
  category?: string;
  photo_url?: string;
  barcode: string;
  quantity?: number;
};

// Продукт в формате для отображения в интерфейсе
export type ProductUi = {
  id: Product['id'];
  name: string;
  category?: string;
  expiryDateLabel: string; // Форматированная дата (например, "01.01.2024")
  daysLeft: number; // Осталось дней до истечения
  isExpired: boolean; // Просрочен
  isWarn: boolean; // Скоро истекает (1-3 дня)
  quantity: number;
  previewUri?: string | null; // URI для отображения фото
  barcode?: string;
};
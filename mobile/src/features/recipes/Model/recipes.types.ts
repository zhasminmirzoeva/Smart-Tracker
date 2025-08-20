// Типы данных для работы с рецептами

export type RecipeId = number | string;

// Ингредиент рецепта
export type Ingredient = {
  name: string;                    // Название ингредиента
  quantity?: string;               // Количество (например, "200 г", "2 шт.")
  source_product_id?: number | string | null; // ID продукта из базы
};

// Содержимое рецепта
export type RecipeContent = {
  title?: string;                  // Название рецепта
  servings?: number;               // Количество порций
  ingredients?: Ingredient[];      // Список ингредиентов
  steps?: string[];                // Шаги приготовления
  estimated_time_min?: number;     // Примерное время приготовления (минуты)
  notes?: string;                  // Дополнительные заметки
};

// Рецепт в базе данных
export type Recipe = {
  id: RecipeId;
  title?: string;                  // Название (может дублироваться в content)
  content: any;                    // JSON-строка или объект с RecipeContent
  used_product_ids?: Array<number | string>; // ID продуктов, использованных в рецепте
  created_at?: string;             // Дата создания (ISO строка)
};

// Безопасный парсинг JSON-контента рецепта
export function parseRecipeContent(raw: any): RecipeContent {
  if (!raw) return {};
  try {
    if (typeof raw === "string") return JSON.parse(raw); // Парсим строку JSON
    return raw as RecipeContent;                         // Уже объект
  } catch {
    return {}; // Возвращаем пустой объект при ошибке парсинга
  }
}
import { apiFetch } from "../../../shared/api/apiFetch";
import type { Recipe, RecipeId } from "./recipes.types";

const PREFIX = "/recipes";

// API для работы с рецептами
export const recipesApi = {
  // Получение списка всех рецептов
  list: () => apiFetch<Recipe[]>(`${PREFIX}`),
  
  // Получение конкретного рецепта по ID
  get: (id: RecipeId) => apiFetch<Recipe>(`${PREFIX}/${id}`),
  
  // Удаление рецепта
  remove: (id: RecipeId) =>
    apiFetch<void>(`${PREFIX}/${id}`, { method: "DELETE" }),
  
  // Генерация рецепта на основе продуктов
  generate: (body: {
    servings?: number;                    // Количество порций
    notes?: string;                       // Дополнительные пожелания
    prefer_expiring_first?: boolean;      // Приоритет скоропортящимся продуктам
    expiring_within_days?: number;        // Использовать продукты, истекающие в течение N дней
    product_ids?: Array<number | string>; // Конкретные продукты для использования
  }) =>
    apiFetch<Recipe>(`${PREFIX}/generate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
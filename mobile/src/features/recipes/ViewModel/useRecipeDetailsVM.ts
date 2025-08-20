import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Share } from "react-native";
import { recipesApi } from "../Model/recipes.api";
import {
  parseRecipeContent,
  type RecipeContent,
  type Recipe,
  type Ingredient,
} from "../Model/recipes.types";
import { productsApi } from "../../products/Model/products.api";
import type { Product } from "../../products/Model/products.types";

export function useRecipeDetailsVM(recipeId: number | string) {
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [productsIndex, setProductsIndex] = useState<
    Record<string, { id: Product["id"]; name: string; quantity?: number }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await recipesApi.get(recipeId);
      setRecipe(r);
      try {
        const list = await productsApi.list();
        const idx: Record<
          string,
          { id: Product["id"]; name: string; quantity?: number }
        > = {};
        for (const p of list)
          idx[String(p.id)] = { id: p.id, name: p.name, quantity: p.quantity };
        setProductsIndex(idx);
      } catch {
        /* silent */
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить рецепт");
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    load();
  }, [load]);

  const data: RecipeContent = useMemo(
    () => parseRecipeContent(recipe?.content),
    [recipe]
  );

  const ui = useMemo(
    () => ({
      title: data.title || recipe?.title || "Рецепт",
      servings: data.servings,
      steps: Array.isArray(data.steps) ? data.steps : [],
      ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
      estimated: data.estimated_time_min,
      notes: data.notes,
    }),
    [data, recipe?.title]
  );

  const share = async () => {
    try {
      let text = `${ui.title}\n`;
      if (ui.servings) text += `Порции: ${ui.servings}\n`;
      if (ui.estimated) text += `Время: ~${ui.estimated} мин\n`;
      if (ui.ingredients.length) {
        text += `\nИнгредиенты:\n`;
        for (const ing of ui.ingredients) {
          text += `• ${ing.name}${ing.quantity ? ` — ${ing.quantity}` : ""}\n`;
        }
      }
      if (ui.steps.length) {
        text += `\nШаги:\n`;
        ui.steps.forEach((s, i) => {
          text += `${i + 1}. ${s}\n`;
        });
      }
      if (ui.notes) text += `\nЗаметки: ${ui.notes}\n`;
      await Share.share({ message: text });
    } catch (e: any) {
      Alert.alert("Не удалось поделиться", e?.message ?? "Попробуйте ещё раз");
    }
  };

  const remove = async () => {
    try {
      await recipesApi.remove(recipeId);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось удалить рецепт");
      throw e;
    }
  };

  const onTapIngredient = (ing: Ingredient) => {
    const pid = ing.source_product_id;
    if (pid == null) return null;
    const p = productsIndex[String(pid)];
    if (!p) return null;
    return { id: p.id, name: p.name, currentQuantity: p.quantity ?? 0 } as const;
  };

  return { loading, recipe, data: ui, productsIndex, load, share, remove, onTapIngredient } as const;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { recipesApi } from "../Model/recipes.api";
import type { Recipe, RecipeContent } from "../Model/recipes.types";

export function useRecipesListVM() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [list, setList] = useState<Recipe[]>([]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const items = await recipesApi.list();
      setList(items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить рецепты");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await recipesApi.list();
      setList(items);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось обновить список");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const sorted = useMemo(
    () =>
      list
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        ),
    [list]
  );

  const parseContent = (raw: any): RecipeContent => {
    if (!raw) return {};
    try {
      if (typeof raw === "string") return JSON.parse(raw);
      return raw as RecipeContent;
    } catch {
      return {};
    }
  };

  const remove = async (id: Recipe["id"]) => {
    try {
      await recipesApi.remove(id);
      setList((prev) => prev.filter((x) => String(x.id) !== String(id)));
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось удалить рецепт");
    }
  };

  return { loading, refreshing, sorted, parseContent, fetchList, onRefresh, remove };
}

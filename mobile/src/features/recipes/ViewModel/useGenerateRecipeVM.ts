import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { recipesApi } from "../Model/recipes.api";
import { productsApi } from "../../products/Model/products.api";
import type { Product } from "../../products/Model/products.types";

export function useGenerateRecipeVM() {
  const [servings, setServings] = useState<string>("2");
  const [notes, setNotes] = useState<string>("быстро, без сахара");
  const [preferExpiringFirst, setPreferExpiringFirst] = useState(true);
  const [expiringWithinDays, setExpiringWithinDays] = useState<string>("7");

  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await productsApi.list();
        setProducts(list);
      } catch (e: any) {
        Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить продукты");
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  const toggle = (id: Product["id"]) => {
    setSelected((prev) => ({ ...prev, [String(id)]: !prev[String(id)] }));
  };

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    if (value) {
      for (const p of products) next[String(p.id)] = true;
    }
    setSelected(next);
  };

  const body = useMemo(
    () => ({
      servings: parseInt(servings || "0", 10) || 2,
      notes: notes?.trim() || undefined,
      prefer_expiring_first: preferExpiringFirst,
      expiring_within_days:
        parseInt(expiringWithinDays || "0", 10) || undefined,
      product_ids: Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => (isNaN(Number(k)) ? k : Number(k))),
    }),
    [servings, notes, preferExpiringFirst, expiringWithinDays, selected]
  );

  const generate = async () => {
    try {
      setLoading(true);
      const recipe = await recipesApi.generate(body);
      return recipe; // вернуть наружу для навигации
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось сгенерировать рецепт");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    // state
    servings, setServings,
    notes, setNotes,
    preferExpiringFirst, setPreferExpiringFirst,
    expiringWithinDays, setExpiringWithinDays,
    products, selected, loading, loadingList,
    // actions
    toggle, toggleAll, generate,
  } as const;
}

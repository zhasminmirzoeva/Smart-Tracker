import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useRecipesListVM } from "../ViewModel/useRecipesListVM";
import type { Recipe } from "../Model/recipes.types";

const PRIMARY = "#3B82F6";
const BG = "#0f172a";

export default function RecipesListScreen() {
  const nav = useNavigation<any>();
  const { loading, refreshing, sorted, onRefresh, parseContent, remove } = useRecipesListVM();
  const { showActionSheetWithOptions } = useActionSheet();

  const openDetails = useCallback((r: Recipe) => {
    nav.navigate("RecipeDetails", { id: r.id });
  }, [nav]);

  const openContextMenu = useCallback((r: Recipe, title?: string) => {
    const options = ["Отмена", "Открыть", "Удалить"];
    const cancelButtonIndex = 0;
    const destructiveButtonIndex = 2;
    showActionSheetWithOptions(
      {
        title: title || "Рецепт",
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
        // userInterfaceStyle: "dark", // включи, если хочешь принудительно тёмную тему меню
      },
      (idx) => {
        if (idx === 1) openDetails(r);
        if (idx === 2) remove(r.id); // если нужно подтверждение — добавим Alert тут
      }
    );
  }, [openDetails, remove, showActionSheetWithOptions]);

  const renderItem = ({ item }: { item: Recipe }) => {
    const data = parseContent(item.content);
    const title = data.title || item.title || "Рецепт";
    const servings = typeof data.servings === "number" ? data.servings : undefined;
    const estimated =
      typeof data.estimated_time_min === "number" ? data.estimated_time_min : undefined;
    const productsCount = Array.isArray(item.used_product_ids)
      ? item.used_product_ids.length
      : undefined;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openDetails(item)}
        onLongPress={() => openContextMenu(item, title)}
        delayLongPress={250}
        style={styles.card}
      >
        <Text numberOfLines={2} style={styles.cardTitle}>{title}</Text>

        <View style={styles.badgesRow}>
          {servings != null && <Badge label={`Порции: ${servings}`} />}
          {estimated != null && <Badge label={`~${estimated} мин`} />}
          {productsCount != null && <Badge label={`${productsCount} продукт(а)`} />}
          {item.created_at && (
            <Badge label={new Date(item.created_at).toLocaleDateString()} />
          )}
        </View>

        {!!data.notes && (
          <Text numberOfLines={2} style={styles.notes}>{data.notes}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.bgBlobA} />
        <View style={styles.bgBlobB} />
        <ActivityIndicator />
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
          Загружаем рецепты…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />

      <View style={styles.headerRoot}>
        <Text style={styles.headerTitle}>Рецепты</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={() => (
          <View style={[styles.center, { flex: 1, paddingHorizontal: 16 }]}>
            <View style={[styles.card, { width: "100%" }]}>
              <Text style={styles.cardTitle}>Пока пусто</Text>
              <Text style={{ color: "#6b7280" }}>
                Сгенерируйте первый рецепт — выберите продукты и нажмите «Сгенерировать».
              </Text>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => nav.navigate("GenerateRecipe")}
      >
        <Text style={styles.fabText}>Новый рецепт</Text>
      </TouchableOpacity>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },

  // фоновые «пятна»
  bgBlobA: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.22)",
    top: -60,
    right: -80,
    transform: [{ rotate: "15deg" }],
    filter: Platform.OS === "web" ? "blur(40px)" : undefined,
  },
  bgBlobB: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(99,102,241,0.16)",
    bottom: -80,
    left: -100,
    transform: [{ rotate: "-10deg" }],
    filter: Platform.OS === "web" ? "blur(40px)" : undefined,
  },

  headerRoot: {
    paddingTop: Platform.OS === "ios" ? 44 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "800" },

  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  badgesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  badgeText: { color: PRIMARY, fontWeight: "800", fontSize: 12 },

  notes: { marginTop: 8, color: "#111827", lineHeight: 20 },

  fab: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    height: 54,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  fabText: { color: "white", fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },
});

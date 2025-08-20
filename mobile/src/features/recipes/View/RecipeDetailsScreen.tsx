import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecipeDetailsVM } from "../ViewModel/useRecipeDetailsVM";

const PRIMARY = "#3B82F6";
const BG = "#0f172a";

type RootStackParamList = {
  RecipeDetails: { id: number | string };
  AdjustQuantity: { id: number | string; name: string; currentQuantity: number };
  Recipes: undefined; // экран со списком рецептов
};

export default function RecipeDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "RecipeDetails">>();
  const insets = useSafeAreaInsets();

  const recipeId = route.params?.id;
  const { loading, recipe, data, share, remove, onTapIngredient } =
    useRecipeDetailsVM(recipeId);

  // делаем статус-бар прозрачным и светлым
  // padding сверху учтём в topBar и в контенте
  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />

      {/* Верхняя панель: назад + к списку рецептов */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Recipes")}
          style={styles.recipesBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.recipesText}>Все рецепты</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.flex1, styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator />
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
            Загружаем рецепт…
          </Text>
        </View>
      ) : !recipe ? (
        <View style={[styles.flex1, styles.center, { paddingTop: insets.top }]}>
          <Text style={{ color: "rgba(255,255,255,0.85)" }}>Рецепт не найден</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{
            paddingBottom: 120,
            // отодвинем контент ниже плавающей topBar и статус-бара
            paddingTop: 16 + insets.top + 48,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Заголовок + бейджи */}
          <View style={styles.header}>
            <Text style={styles.title}>{data.title}</Text>
            <View style={styles.badgesRow}>
              {typeof data.servings === "number" && (
                <Badge label={`Порции: ${data.servings}`} />
              )}
              {typeof data.estimated === "number" && (
                <Badge label={`~${data.estimated} мин`} />
              )}
              {recipe.created_at && (
                <Badge label={new Date(recipe.created_at).toLocaleString()} />
              )}
            </View>
          </View>

          {/* Заметки */}
          {data.notes ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Заметки</Text>
              <Text style={styles.notes}>{data.notes}</Text>
            </View>
          ) : null}

          {/* Ингредиенты */}
          {!!data.ingredients.length && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.cardTitle}>Ингредиенты</Text>
              <View style={{ gap: 8 }}>
                {data.ingredients.map((ing, idx) => {
                  const target = onTapIngredient(ing);
                  const line = `${ing.name}${ing.quantity ? ` — ${ing.quantity}` : ""}`;

                  if (target) {
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => navigation.navigate("AdjustQuantity", target)}
                        activeOpacity={0.85}
                        style={[styles.ingredientRow, styles.ingredientLinked]}
                      >
                        <Text style={styles.ingredientText}>{line}</Text>
                        <Text style={styles.linkHint}>
                          из кладовой • «{target.name}» ({target.currentQuantity ?? 0} г)
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View key={idx} style={styles.ingredientRow}>
                      <Text style={styles.ingredientText}>{line}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Шаги */}
          {!!data.steps.length && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.cardTitle}>Шаги</Text>
              <View style={{ gap: 12 }}>
                {data.steps.map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Кнопки действий */}
          <View style={{ gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.ctaBtn, styles.primaryBtn]}
              onPress={share}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>Поделиться</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaBtn, styles.dangerBtn]}
              onPress={async () => {
                try {
                  await remove();
                  Alert.alert("Удалено", "Рецепт удалён");
                  navigation.goBack();
                } catch {}
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>Удалить рецепт</Text>
            </TouchableOpacity>

            {/* быстрый переход к списку рецептов */}
            <TouchableOpacity
              style={[styles.ctaBtn, styles.secondaryBtn]}
              onPress={() => navigation.navigate("Recipes")}
              activeOpacity={0.9}
            >
              <Text style={[styles.ctaText, { color: PRIMARY }]}>Все рецепты</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      )}
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
  flex1: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  // плавающая верхняя панель
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // фоновые пятна
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

  header: { gap: 6, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "white" },
  badgesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  badgeText: { color: "white", fontWeight: "800", fontSize: 12 },

  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },

  ingredientRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
  },
  ingredientLinked: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(59,130,246,0.06)",
  },
  ingredientText: { fontSize: 15, color: "#0f172a" },
  linkHint: { marginTop: 6, fontSize: 12, color: PRIMARY, fontWeight: "700" },

  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginRight: 8,
  },
  stepIndexText: { color: "white", fontWeight: "800" },
  stepText: { flex: 1, fontSize: 15, color: "#0f172a" },

  notes: { fontSize: 14, color: "#111827", lineHeight: 20 },

  ctaBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
    }),
  },
  secondaryBtn: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
  },
  dangerBtn: {
    backgroundColor: "#DC2626",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
    }),
  },
  ctaText: { color: "white", fontWeight: "800", fontSize: 16 },

  // стили кнопок навигации сверху
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backIcon: { color: "white", fontSize: 18, lineHeight: 20 },
  recipesBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  recipesText: { color: "white", fontSize: 13, fontWeight: "800" },
});

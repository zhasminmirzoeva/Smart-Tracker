import React from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useGenerateRecipeVM } from "../ViewModel/useGenerateRecipeVM";

const PRIMARY = "#3B82F6";
const BG = "#0f172a";

// Экран генерации рецептов на основе продуктов
export default function GenerateRecipeScreen() {
  const nav = useNavigation<any>();
  const vm = useGenerateRecipeVM();

  // Генерация рецепта
  const onGenerate = async () => {
    const recipe = await vm.generate();
    if (recipe) {
      Alert.alert("Готово", `Создан рецепт: ${recipe.title}`);
      nav.replace("RecipeDetails", { id: recipe.id, initial: recipe });
    }
  };

  return (
    <View style={styles.root}>
      {/* Фоновые элементы */}
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />

      {/* Шапка экрана */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          activeOpacity={0.85}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.headerTitle}>Новый рецепт</Text>

        {/* Балансир для центрирования заголовка */}
        <View style={{ width: 32 }} />
      </View>

      {/* Подзаголовок */}
      <View style={styles.headerSub}>
        <Text style={styles.subtitle}>Сгенерируйте блюдо из ваших продуктов 🍳</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        style={{ flex: 1, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Параметры генерации */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Параметры генерации</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Порций</Text>
            <TextInput
              value={vm.servings}
              onChangeText={vm.setServings}
              keyboardType="numeric"
              placeholder="2"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Заметки для ИИ (опционально)</Text>
            <TextInput
              value={vm.notes}
              onChangeText={vm.setNotes}
              placeholder="например: быстро, без сахара, без глютена"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={[styles.input, { minHeight: 44 }]}
              multiline
            />
          </View>

          {/* Приоритет скоропортящимся продуктам */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Использовать те, у кого скоро истекает</Text>
            <Switch value={vm.preferExpiringFirst} onValueChange={vm.setPreferExpiringFirst} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>«Скоро истекает» — дней</Text>
            <TextInput
              value={vm.expiringWithinDays}
              onChangeText={vm.setExpiringWithinDays}
              keyboardType="numeric"
              placeholder="7"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={styles.input}
            />
          </View>
        </View>

        {/* Выбор продуктов для рецепта */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.cardTitle}>Выберите продукты (опционально)</Text>
            {/* Кнопка выбора/снятия всех продуктов */}
            <TouchableOpacity
              onPress={() =>
                vm.toggleAll(Object.values(vm.selected).some(Boolean) ? false : true)
              }
              activeOpacity={0.9}
            >
              <Text style={styles.link}>
                {Object.values(vm.selected).some(Boolean) ? "Снять всё" : "Выбрать всё"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Состояние загрузки */}
          {vm.loadingList ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : vm.products.length === 0 ? (
            <Text style={styles.emptyText}>Список продуктов пуст</Text>
          ) : (
            // Список продуктов с сортировкой по названию
            vm.products
              .slice()
              .sort((a, b) =>
                a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
              )
              .map((p) => {
                const checked = !!vm.selected[String(p.id)];
                // Расчет оставшихся дней
                const daysLeft = (() => {
                  const today = new Date();
                  const exp = new Date(p.expiry_date + "T00:00:00");
                  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                  return Math.ceil((exp.getTime() - t0) / (1000 * 60 * 60 * 24));
                })();
                const isExpired = daysLeft <= 0;
                const warn = daysLeft > 0 && daysLeft <= 3;

                return (
                  <TouchableOpacity
                    key={String(p.id)}
                    style={styles.productRow}
                    onPress={() => vm.toggle(p.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text numberOfLines={1} style={styles.prodName}>
                        {p.name}
                      </Text>
                      <Text style={styles.prodMeta}>
                        {p.quantity} г • годен до {new Date(p.expiry_date).toLocaleDateString()}
                      </Text>
                      {/* Бейдж статуса срока годности */}
                      <View
                        style={[
                          styles.badge,
                          isExpired ? styles.badgeDanger : warn ? styles.badgeWarn : styles.badgeOk,
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {isExpired ? "просрочен" : warn ? `≤ ${daysLeft} дн.` : `${daysLeft} дн.`}
                        </Text>
                      </View>
                    </View>
                    <Switch value={checked} onValueChange={() => vm.toggle(p.id)} />
                  </TouchableOpacity>
                );
              })
          )}
        </View>
      </ScrollView>

      {/* Кнопка генерации рецепта */}
      <TouchableOpacity
        style={[styles.fab, vm.loading && { opacity: 0.7 }]}
        onPress={onGenerate}
        disabled={vm.loading}
        activeOpacity={0.9}
      >
        <Text style={styles.fabText}>{vm.loading ? "Генерация…" : "Сгенерировать"}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ===== Стили компонента ===== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Фоновые элементы
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

  // Шапка
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 44 : 20,
    paddingBottom: 12,
    backgroundColor: BG,
    zIndex: 1,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
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

  // Подзаголовок
  headerSub: { paddingHorizontal: 16, paddingBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.7)" },

  emptyText: {
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 14,
  },

  // Карточки
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
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 },

  // Поля формы
  field: { marginTop: 8, gap: 6 },
  label: { fontSize: 13, color: "#111827", opacity: 0.8, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
  },
  switchRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { color: "#111827", fontWeight: "600" },

  // Заголовок списка продуктов
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  link: { color: PRIMARY, fontWeight: "800" },

  // Строка продукта
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  prodName: { fontWeight: "700", color: "#0f172a" },
  prodMeta: { color: "#6b7280", fontSize: 12, marginTop: 2 },

  // Бейдж статуса срока годности
  badge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "white", fontWeight: "800", fontSize: 12 },
  badgeOk: { backgroundColor: "#10B981" },      // Зеленый - норма
  badgeWarn: { backgroundColor: "#F59E0B" },    // Желтый - скоро истекает
  badgeDanger: { backgroundColor: "#EF4444" },  // Красный - просрочен

  // Кнопка генерации (FAB)
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
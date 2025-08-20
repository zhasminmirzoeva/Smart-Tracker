import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import type { ProductUi } from "../Model/products.types";

const PRIMARY = "#3B82F6";

type Props = {
  item: ProductUi;
  onEdit: (p: ProductUi) => void;
  onDelete: (id: ProductUi["id"]) => void;
};

// Карточка продукта для списка
export default function ProductCard({ item, onEdit, onDelete }: Props) {
  const { showActionSheetWithOptions } = useActionSheet();

  // Открытие меню действий (долгое нажатие)
  const openMenu = () => {
    const options = ["Отмена", "Изменить", "Удалить"];
    const cancelButtonIndex = 0;
    const destructiveButtonIndex = 2;
    showActionSheetWithOptions(
      {
        title: item.name || "Продукт",
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      (idx) => {
        if (idx === 1) onEdit(item);     // Изменить
        if (idx === 2) onDelete(item.id); // Удалить
      }
    );
  };

  // Отображение бейджа статуса срока годности
  const renderBadge = () => {
    const style =
      item.isExpired ? styles.badgeDanger : item.isWarn ? styles.badgeWarn : styles.badgeOk;
    const label = item.isExpired ? "просрочен" : item.isWarn ? `≤ ${item.daysLeft} дн.` : `${item.daysLeft} дн.`;
    return (
      <View style={[styles.badge, style]}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onEdit(item)}     // Короткое нажатие - редактирование
      onLongPress={openMenu}           // Долгое нажатие - меню действий
      delayLongPress={250}
      accessibilityRole="button"
      accessibilityLabel={`Продукт ${item.name}`}
    >
      {/* Изображение продукта */}
      {item.previewUri ? (
        <Image source={{ uri: item.previewUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}

      {/* Информация о продукте */}
      <View style={styles.content}>
        <View style={styles.rowBetween}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {renderBadge()} {/* Бейдж срока годности */}
        </View>

        {!!item.category && <Text style={styles.category}>{item.category}</Text>}
        <Text style={styles.meta}>
          Годен до: <Text style={styles.metaStrong}>{item.expiryDateLabel}</Text>
        </Text>
        <Text style={styles.meta}>Количество: {item.quantity} г</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ===== Стили карточки продукта ===== */
const styles = StyleSheet.create({
  card: {
    borderRadius: 16, backgroundColor: "white", padding: 12, flexDirection: "row", gap: 12, alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
      default: {},
    }),
  },
  thumb: { width: 64, height: 64, borderRadius: 12 }, // Миниатюра продукта
  thumbPlaceholder: { backgroundColor: "#eef2f7" },   // Заглушка если нет фото
  content: { flex: 1, gap: 6 },                       // Контентная область
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontWeight: "800", fontSize: 16, color: "#0f172a", flexShrink: 1 }, // Название продукта
  category: { color: "#6b7280" },                     // Категория
  meta: { color: "#111827" },                         // Мета-информация
  metaStrong: { fontWeight: "700" },                  // Выделенный текст
  // Бейдж статуса срока годности
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: "white", fontWeight: "800", fontSize: 12 },
  badgeOk: { backgroundColor: "#10B981" },            // Зеленый - норма
  badgeWarn: { backgroundColor: "#F59E0B" },          // Желтый - скоро истекает
  badgeDanger: { backgroundColor: "#EF4444" },        // Красный - просрочен
});
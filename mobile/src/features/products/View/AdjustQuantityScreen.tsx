import React from "react";
import {
  View, Text, TextInput, Alert, KeyboardAvoidingView, ScrollView,
  Platform, TouchableOpacity, StyleSheet,
} from "react-native";
import { useAdjustQuantityVM } from "../ViewModel/useAdjustQuantityVM";

type Props = {
  navigation: any;
  route: { params: { id: number | string; name: string; currentQuantity: number } };
};

const PRIMARY = "#3B82F6";
const BG = "#0f172a";
// Предустановленные значения изменения количества (граммы)
const PRESETS = [-200, -100, -50, 50, 100, 200];

// Экран изменения количества продукта
export default function AdjustQuantityScreen({ navigation, route }: Props) {
  const vm = useAdjustQuantityVM(route.params);

  // Сохранение изменений
  const onSave = async () => {
    try {
      await vm.save();
      Alert.alert("Сохранено", "Количество обновлено.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось обновить количество");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.root}>
        {/* Фоновые элементы */}
        <View style={styles.bgBlobA} />
        <View style={styles.bgBlobB} />

        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 16, gap: 12 }}>
          
          {/* Заголовок экрана */}
          <View style={styles.header}>
            <Text style={styles.title}>{vm.name}</Text>
            <Text style={styles.subtitle}>
              Текущее количество: <Text style={{ fontWeight: "800" }}>{vm.currentQuantity} г</Text>
            </Text>
          </View>

          {/* Изменение количества (дельта) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Изменить на (Δ, граммы)</Text>
            <TextInput
              placeholder="например, -100 или 200"
              placeholderTextColor="rgba(0,0,0,0.35)"
              value={vm.deltaStr}
              onChangeText={vm.setDeltaStr}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              style={styles.input}
            />

            {/* Быстрые пресеты изменения */}
            <View style={styles.chipsWrap}>
              {PRESETS.map((p) => {
                const sign = p > 0 ? "+" : "";
                return (
                  <TouchableOpacity key={p} onPress={() => vm.onApplyPreset(p)} activeOpacity={0.9}
                    style={[styles.chip, p > 0 ? styles.chipPlus : styles.chipMinus]}>
                    <Text style={styles.chipText}>{`${sign}${p}`}</Text>
                    <Text style={styles.chipUnit}>г</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Установка точного количества */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Или установить точное количество (г)</Text>
            <TextInput
              placeholder="например, 500"
              placeholderTextColor="rgba(0,0,0,0.35)"
              value={vm.exactStr}
              onChangeText={vm.setExactStr}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              style={styles.input}
            />
            <Text style={styles.muted}>Если заполнено точное количество — Δ игнорируется.</Text>
          </View>

          {/* Предварительный просмотр результата */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Итоговое значение</Text>
            <Text style={styles.resultText}>
              {vm.computedNew} <Text style={{ opacity: 0.8 }}>г</Text>
            </Text>

            {/* Кнопки действий */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={onSave} activeOpacity={0.9} style={[styles.ctaBtn, styles.primaryBtn]} disabled={vm.saving}>
                <Text style={styles.ctaText}>{vm.saving ? "Сохраняем…" : "Сохранить"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={vm.setZero} activeOpacity={0.9} style={[styles.ctaBtn, styles.dangerBtn]} disabled={vm.saving}>
                <Text style={styles.ctaText}>Списать всё</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.9} style={[styles.ctaBtn, styles.ghostBtn]} disabled={vm.saving}>
                <Text style={[styles.ctaText, styles.ghostText]}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ===== Стили компонента ===== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { gap: 4, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "white" },
  subtitle: { color: "rgba(255,255,255,0.75)" },

  // Фоновые элементы
  bgBlobA: { 
    position: "absolute", width: 260, height: 260, borderRadius: 999, 
    backgroundColor: "rgba(59,130,246,0.22)", top: -60, right: -80, transform: [{ rotate: "15deg" }] 
  },
  bgBlobB: { 
    position: "absolute", width: 300, height: 300, borderRadius: 999, 
    backgroundColor: "rgba(99,102,241,0.16)", bottom: -80, left: -100, transform: [{ rotate: "-10deg" }] 
  },

  // Карточки
  card: {
    backgroundColor: "white", borderRadius: 20, padding: 16,
    ...Platform.select({ 
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, 
      android: { elevation: 8 } 
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 },

  // Поле ввода
  input: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#F9FAFB",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 14 : 10, fontSize: 16, color: "#0f172a",
  },

  // Чипсы быстрого выбора
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "baseline", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipPlus: { borderColor: PRIMARY, backgroundColor: "rgba(59,130,246,0.08)" }, // Зеленый для увеличения
  chipMinus: { borderColor: "#DC2626", backgroundColor: "rgba(220,38,38,0.06)" }, // Красный для уменьшения
  chipText: { fontWeight: "800", fontSize: 14, color: "#0f172a" },
  chipUnit: { fontSize: 12, color: "#6b7280" },

  muted: { color: "#6b7280", marginTop: 6 }, // Вторичный текст
  resultText: { fontSize: 22, fontWeight: "800", color: "#0f172a" }, // Итоговое значение

  // Кнопки
  ctaBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtn: { 
    backgroundColor: PRIMARY, 
    ...Platform.select({ 
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, 
      android: { elevation: 6 } 
    }) 
  },
  dangerBtn: { 
    backgroundColor: "#DC2626", 
    ...Platform.select({ 
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, 
      android: { elevation: 6 } 
    }) 
  },
  ghostBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  ghostText: { color: "#0f172a" },
  ctaText: { color: "white", fontWeight: "800", fontSize: 15 },
});
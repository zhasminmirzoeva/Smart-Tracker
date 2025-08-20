import React from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNotificationSettingsVM } from "../ViewModel/useNotificationSettingsVM";

const PRIMARY = "#3B82F6";
const BG = "#0f172a";

// Экран настроек локальных уведомлений
export default function NotificationSettingsScreen() {
  const vm = useNotificationSettingsVM();

  // Загрузочный экран
  if (vm.loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.bgBlobA} />
        <View style={styles.bgBlobB} />
        <ActivityIndicator />
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>Загрузка…</Text>
      </View>
    );
  }

  // Форматирование чисел для времени (01, 02 и т.д.)
  const pad2 = (n: number) => String(n).padStart(2, "0");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* Фоновые элементы */}
        <View style={styles.bgBlobA} />
        <View style={styles.bgBlobB} />

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Заголовок экрана */}
          <View style={styles.header}>
            <Text style={styles.title}>Локальные уведомления</Text>
            <Text style={styles.subtitle}>Напоминания о продуктах с истекающим сроком</Text>
          </View>

          {/* Включение/выключение уведомлений */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Включить уведомления</Text>
              <Switch
                value={!!vm.state.enabled}
                onValueChange={(v) => vm.setState((p) => ({ ...p, enabled: v }))}
              />
            </View>
            <Text style={styles.muted}>
              Если выключено — уведомления не будут приходить, но настройки сохранятся.
            </Text>
          </View>

          {/* Выбор времени уведомлений */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>Время отправки</Text>

            <View style={[styles.rowBetween, { marginTop: 6 }]}>
              <TouchableOpacity
                onPress={() => vm.setShowTime(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.timeText}>
                  {pad2(vm.state.hour ?? 0)}:{pad2(vm.state.minute ?? 0)}
                </Text>
              </TouchableOpacity>
              <View />
            </View>

            {/* Пикер времени */}
            {vm.showTime && (
              <View style={{ marginTop: 10 }}>
                <DateTimePicker
                  value={vm.currentTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={vm.onTimeChange}
                  minuteInterval={1}
                />

                {/* Кнопка "Готово" для iOS */}
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    onPress={() => vm.setShowTime(false)}
                    style={[styles.smallBtn, styles.ghostBtn, { alignSelf: "flex-end", marginTop: 8 }]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.smallBtnText, styles.ghostBtnText]}>Готово</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Выбор дней напоминания */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>За сколько дней напоминать</Text>
            <View style={styles.chipsWrap}>
              {vm.PRESET_DAYS.map((d) => {
                const active = vm.state.days.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => vm.toggleDay(d)}
                    activeOpacity={0.9}
                    style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipTextIdle}>
                      {d === 0 ? "в день" : `за ${d} дн.`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.muted, { marginTop: 6 }]}>Можно выбрать несколько вариантов</Text>
          </View>

          {/* Кнопка сохранения */}
          <View style={{ gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              onPress={vm.save}
              disabled={vm.saving}
              activeOpacity={0.9}
              style={[styles.ctaBtn, styles.primaryBtn, vm.saving && { opacity: 0.7 }]}
            >
              <Text style={styles.ctaText}>{vm.saving ? "Сохранение…" : "Сохранить"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ===== Стили компонента ===== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },

  // Фоновые элементы-блобы
  bgBlobA: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.22)",
    top: -60,
    right: -80,
    transform: [{ rotate: "15deg" }],
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
  },

  // Заголовок
  header: { gap: 4, marginBottom: 8 },
  title: { color: "white", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.7)" },

  // Карточки настроек
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  // Расположение в ряд
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },

  // Текст времени
  timeText: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

  // Чипсы дней напоминания
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipIdle: { borderColor: "rgba(0,0,0,0.12)", backgroundColor: "#fff" },
  chipActive: { borderColor: PRIMARY, backgroundColor: "rgba(59,130,246,0.08)" },
  chipTextIdle: { color: "#0f172a", fontWeight: "700" },
  chipTextActive: { color: PRIMARY, fontWeight: "800" },

  // Маленькие кнопки
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { color: "white", fontWeight: "800" },

  // Основная кнопка
  ctaBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtn: {
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 8 },
    }),
  },

  ctaText: { color: "white", fontWeight: "800", fontSize: 16 },

  // Вторичный текст
  muted: { color: "#6b7280", marginTop: 6 },

  safeArea: { flex: 1, backgroundColor: BG },
  ghostBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  ghostBtnText: {
    color: "#0f172a",
    fontWeight: "800",
  },
});
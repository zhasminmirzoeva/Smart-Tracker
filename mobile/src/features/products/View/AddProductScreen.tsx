import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, Alert, Image, ActivityIndicator, Platform,
  KeyboardAvoidingView, ScrollView, TouchableOpacity, StyleSheet, Linking,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAddProductVM } from "../ViewModel/useAddProductVM";
import { CommonActions } from "@react-navigation/native";

const PRIMARY = "#3B82F6";
const BG = "#0f172a";

// Имя экрана со списком продуктов для навигации
const PRODUCTS_ROUTE = "Products";

// Экран добавления/редактирования продукта
export default function AddProductScreen({ navigation }: any) {
  const vm = useAddProductVM();
  const [permission, requestPermission] = useCameraPermissions();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Умная навигация назад с обработкой разных сценариев
  const smartBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    const parent = navigation?.getParent?.();
    if (parent?.canGoBack?.()) {
      parent.goBack();
      return;
    }
    // Fallback: переход на список продуктов
    if (PRODUCTS_ROUTE) {
      navigation.dispatch(
        CommonActions.navigate({ name: PRODUCTS_ROUTE })
      );
    } else {
      // Крайний случай: сброс до корня
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: PRODUCTS_ROUTE }] })
      );
    }
  };

  // Обработка аппаратной кнопки "Назад" на Android
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      smartBack();
      return true; // Предотвращаем стандартное поведение
    });
    return () => sub.remove();
  }, [navigation]);

  // Запрос разрешений для камеры
  useEffect(() => {
    (async () => {
      if (!permission) await requestPermission();
      else if (!permission.granted) await requestPermission();
    })();
  }, [permission, requestPermission]);

  // Показ уведомлений от бэкенда
  useEffect(() => {
    if (vm.notice) {
      Alert.alert("Сообщение", vm.notice, [{ text: "ОК", onPress: vm.clearNotice }], { cancelable: true });
    }
  }, [vm.notice]);

  // Выбор фото из галереи
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Нет доступа", "Разрешите доступ к фото, чтобы выбрать изображение.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.9, exif: false,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    vm.setPickedImage({ uri: asset.uri, name: (asset as any).fileName, type: (asset as any).mimeType });
  };

  // Сохранение продукта
  const onSave = async () => {
    try {
      await vm.save();
      Alert.alert("Готово", vm.mode === "existing" ? "Количество изменено" : "Продукт добавлен");
      smartBack(); // Используем умную навигацию назад
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось сохранить");
    }
  };

  // Компонент выбора даты
  const DateField = (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>Дата истечения</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowDatePicker(true)}
        style={[styles.inputLike, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
      >
        <Text style={{ color: "#0f172a", fontSize: 16 }}>
          {vm.expiryDate ? vm.expiryDate.toISOString().slice(0,10) : "Выбрать дату"}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#0f172a" />
      </TouchableOpacity>

      {showDatePicker && (
        <View style={{ marginTop: 8 }}>
          <DateTimePicker
            value={vm.expiryDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event, date) => {
              if (Platform.OS === "android") setShowDatePicker(false);
              if (date) vm.setExpiryDate(date);
            }}
          />
          {/* Кнопка "Готово" для iOS */}
          {Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={[styles.smallBtn, styles.ghostBtn, { alignSelf: "flex-end", marginTop: 8 }]}
              activeOpacity={0.9}
            >
              <Text style={[styles.smallBtnText, styles.ghostBtnText]}>Готово</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // Компонент выбора изображения
  const ImageBlock = (
    <View style={{ gap: 10 }}>
      {!!(vm.pickedImage?.uri || vm.photoUrl) && (
        <Image source={{ uri: vm.pickedImage?.uri || vm.photoUrl }} style={{ width: 100, height: 100, borderRadius: 12 }} />
      )}
      <TouchableOpacity onPress={pickImage} style={[styles.smallBtn, styles.primaryBtn]} activeOpacity={0.9}>
        <Ionicons name="image-outline" size={16} color="#fff" />
        <Text style={styles.smallBtnText}>Выбрать фото</Text>
      </TouchableOpacity>
    </View>
  );

  // Загрузка разрешений камеры
  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.root, styles.center]}>
          <Text style={{ color: "#fff" }}>Запрос разрешения на камеру…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Нет разрешения на камеру (только для режима сканирования)
  if (!permission.granted && vm.mode === "scan") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.root, styles.center]}>
          <Text style={{ color: "rgba(255,255,255,0.9)", textAlign: "center", paddingHorizontal: 24 }}>
            Нет доступа к камере. Разрешите доступ в настройках, чтобы сканировать штрих-код.
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()} style={[styles.ctaBtn, styles.primaryBtn, { marginTop: 16 }]} activeOpacity={0.9}>
            <Text style={styles.ctaText}>Открыть настройки</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top","left","right"]}>
      <View style={styles.root}>
        {/* Фоновые элементы */}
        <View style={styles.bgBlobA} />
        <View style={styles.bgBlobB} />

        {/* Шапка с кнопкой назад */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={smartBack} style={styles.backBtn} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Добавить продукт</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Переключатель режимов: сканирование/ручной ввод */}
        <View style={styles.modeChips}>
          <TouchableOpacity onPress={() => vm.setMode("scan")} activeOpacity={0.85}
            style={[styles.modeChip, vm.mode === "scan" && styles.modeChipActive]}>
            <Ionicons name="barcode-outline" size={16} color={vm.mode === "scan" ? PRIMARY : "#fff"} />
            <Text style={[styles.modeChipText, vm.mode === "scan" && { color: PRIMARY }]}>Сканер</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { vm.setMode("manual"); vm.setBarcode(null); }}
            activeOpacity={0.85}
            style={[styles.modeChip, (vm.mode === "manual" || vm.mode === "prefilled" || vm.mode === "existing") && styles.modeChipActive]}>
            <Ionicons name="create-outline" size={16} color={(vm.mode === "manual" || vm.mode === "prefilled" || vm.mode === "existing") ? PRIMARY : "#fff"} />
            <Text style={[styles.modeChipText, (vm.mode === "manual" || vm.mode === "prefilled" || vm.mode === "existing") && { color: PRIMARY }]}>Вручную</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* РЕЖИМ СКАНИРОВАНИЯ */}
          {vm.mode === "scan" && permission.granted && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={styles.cardTitle}>Отсканируйте штрих-код</Text>
                  {/* Кнопка вспышки */}
                  <TouchableOpacity
                    onPress={() => vm.setTorch(t => !t)}
                    style={[styles.iconBtn, vm.torch && styles.iconBtnActive]}
                    activeOpacity={0.8}
                    accessibilityLabel={vm.torch ? "Выключить вспышку" : "Включить вспышку"}
                  >
                    <Ionicons name="flash-outline" size={18} color={vm.torch ? PRIMARY : "#0f172a"} />
                  </TouchableOpacity>
                </View>

                <View style={{ borderRadius: 16, overflow: "hidden" }}>
                  <CameraView
                    style={{ height: 280 }}
                    facing="back"
                    enableTorch={vm.torch}
                    onBarcodeScanned={vm.handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["ean13"] }}
                  />
                </View>
              </View>

              <TouchableOpacity onPress={() => { vm.setMode("manual"); vm.setBarcode(null); vm.resetForm(); }}
                style={[styles.ctaBtn, styles.secondaryBtn, { marginTop: 12 }]} activeOpacity={0.9}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.ctaText}>Ввести вручную</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* РЕЖИМ ЗАГРУЗКИ */}
          {vm.mode === "loading" && (
            <View style={[styles.center, { flex: 1 }]}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>Проверяем базу…</Text>
            </View>
          )}

          {/* РЕЖИМ ФОРМЫ (ручной ввод, предзаполнение, существующий продукт) */}
          {(vm.mode === "existing" || vm.mode === "prefilled" || vm.mode === "manual") && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8, gap: 12 }} keyboardShouldPersistTaps="handled">
              {/* Блок фото */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Фото</Text>
                {ImageBlock}
              </View>

              {/* Основная информация о продукте */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Основное</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Название</Text>
                  <TextInput
                    placeholder="Например, Молоко 2,5%"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    value={vm.name}
                    onChangeText={vm.setName}
                    editable={vm.mode === "manual" || !vm.name}
                    style={styles.inputLike}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Категория</Text>
                  <TextInput
                    placeholder="Например, Молочные"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    value={vm.category}
                    onChangeText={vm.setCategory}
                    editable={vm.mode === "manual" || !vm.category}
                    style={styles.inputLike}
                  />
                </View>

                {/* Дата истечения (не показываем для существующего продукта) */}
                {vm.mode !== "existing" && DateField}

                <View style={styles.field}>
                  <Text style={styles.label}>Количество (граммы)</Text>
                  <TextInput
                    placeholder={vm.quantityFromBase ? String(vm.quantityFromBase) : "Например, 500"}
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    value={vm.quantity}
                    onChangeText={(t) => { vm.setQuantity(t); vm.setQuantityTouched(true); }}
                    keyboardType="numeric"
                    style={styles.inputLike}
                  />
                </View>

                {/* Подсказки */}
                {vm.mode === "existing" && vm.existingCurrentQty != null ? (
                  <Text style={styles.hint}>Текущее количество: {vm.existingCurrentQty} г</Text>
                ) : null}

                {vm.barcode ? <Text style={styles.hint}>Штрих-код: {vm.barcode}</Text> : null}
              </View>

              {/* Кнопки действий */}
              <TouchableOpacity style={[styles.ctaBtn, styles.primaryBtn]} onPress={onSave} activeOpacity={0.9}>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.ctaText}>Сохранить</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={smartBack}
                style={[styles.ctaBtn, styles.ghostBigBtn]} activeOpacity={0.9}>
                <Ionicons name="chevron-back-outline" size={18} color={PRIMARY} />
                <Text style={[styles.ctaText, { color: PRIMARY }]}>Назад</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

/* ===== Стили компонента ===== */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  root: { flex: 1 },
  // Фоновые элементы
  bgBlobA: { 
    position: "absolute", width: 260, height: 260, borderRadius: 999, 
    backgroundColor: "rgba(59,130,246,0.22)", top: -60, right: -80, 
    transform: [{ rotate: "15deg" }], ...(Platform.OS === "web" ? { filter: "blur(40px)" as any } : {}) 
  },
  bgBlobB: { 
    position: "absolute", width: 300, height: 300, borderRadius: 999, 
    backgroundColor: "rgba(99,102,241,0.16)", bottom: -80, left: -100, 
    transform: [{ rotate: "-10deg" }], ...(Platform.OS === "web" ? { filter: "blur(40px)" as any } : {}) 
  },
  // Шапка
  headerBar: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", 
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: BG, zIndex: 1 
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  backBtn: { 
    width: 32, height: 32, borderRadius: 999, borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.25)", alignItems: "center", 
    justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" 
  },
  // Переключатель режимов
  modeChips: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  modeChip: { 
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, 
    paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", 
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" 
  },
  modeChipActive: { backgroundColor: "rgba(59,130,246,0.16)", borderColor: "rgba(59,130,246,0.35)" },
  modeChipText: { color: "#fff", fontWeight: "800" },
  // Карточки
  card: { 
    backgroundColor: "white", borderRadius: 20, padding: 16, marginTop: 12, 
    marginBottom: 2, ...Platform.select({ 
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, 
      android: { elevation: 8 }, 
      default: {} 
    }) 
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  // Поля формы
  field: { marginTop: 8, gap: 6 },
  label: { fontSize: 13, color: "#111827", opacity: 0.8, fontWeight: "600" },
  inputLike: { 
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#F9FAFB", 
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 14 : 10, fontSize: 16 
  },
  hint: { marginTop: 8, color: "#6b7280", fontSize: 12 },
  // Кнопки
  ctaBtn: { 
    marginHorizontal: 16, height: 52, borderRadius: 14, alignItems: "center", 
    justifyContent: "center", flexDirection: "row", gap: 8 
  },
  primaryBtn: { 
    backgroundColor: PRIMARY, ...Platform.select({ 
      ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, 
      android: { elevation: 8 } 
    }) 
  },
  secondaryBtn: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  ghostBigBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(59,130,246,0.45)" },
  smallBtn: { 
    height: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", 
    justifyContent: "center", flexDirection: "row", gap: 8 
  },
  ghostBtn: { backgroundColor: "rgba(0,0,0,0.04)", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  ghostBtnText: { color: "#0f172a", fontWeight: "800" },
  smallBtnText: { color: "#fff", fontWeight: "800" },
  ctaText: { color: "white", fontWeight: "800", fontSize: 16 },
  center: { alignItems: "center", justifyContent: "center", flex: 1 },
  // Кнопка иконки (вспышка)
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  iconBtnActive: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.35)",
  },
});
import React, { useState } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useAuth } from "../../../providers/AuthProvider"

// Экран регистрации нового пользователя
export default function RegisterScreen({ navigation }: any) {
  const { register, busy } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Обработчик создания аккаунта
  const onSubmit = async () => {
    try { 
      await register(email.trim(), password); 
    }
    catch (e: any) { 
      Alert.alert("Ошибка регистрации", e.message ?? "Неизвестная ошибка"); 
    }
  };

  return (
    <View style={styles.root}>
      {/* Фоновые элементы */}
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />

      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Регистрация</Text>
        <Text style={styles.subtitle}>Создайте новый аккаунт</Text>
      </View>
      {/* Форма регистрации */}
      <View style={styles.card}>
        {/* Поле email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput 
            placeholder="you@example.com" 
            placeholderTextColor="rgba(0,0,0,0.35)" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address" 
            style={styles.input} 
          />
        </View>

        {/* Поле пароля */}
        <View style={styles.field}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput 
            placeholder="Придумайте пароль" 
            placeholderTextColor="rgba(0,0,0,0.35)" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            style={styles.input} 
          />
        </View>

        {/* Кнопка регистрации */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={onSubmit} 
          disabled={busy} 
          style={[styles.button, busy && styles.buttonDisabled]}
        >
          {busy ? <ActivityIndicator /> : <Text style={styles.buttonText}>Создать аккаунт</Text>}
        </TouchableOpacity>

        {/* Ссылка на вход */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Уже есть аккаунт? </Text>
          <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
            Войти
          </Text>
        </View>
      </View>
    </View>
  );
}

// Стили (аналогичны LoginScreen)
const PRIMARY = "#3B82F6";
const BG = "#0f172a";
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, padding: 20, justifyContent: "center" },
  bgBlobA: { position: "absolute", width: 240, height: 240, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.25)", top: -40, right: -60, transform: [{ rotate: "15deg" }], filter: Platform.OS === "web" ? "blur(40px)" : undefined },
  bgBlobB: { position: "absolute", width: 280, height: 280, borderRadius: 999, backgroundColor: "rgba(99,102,241,0.18)", bottom: -60, left: -80, transform: [{ rotate: "-10deg" }], filter: Platform.OS === "web" ? "blur(40px)" : undefined },
  header: { marginBottom: 16, alignItems: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "white", letterSpacing: 0.5 },
  subtitle: { marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 14 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 18, gap: 14, ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 8 }, default: {} }) },
  field: { gap: 8 },
  label: { fontSize: 13, color: "#111827", opacity: 0.8, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 14 : 10, fontSize: 16 },
  button: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: PRIMARY, marginTop: 6 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
  footerRow: { marginTop: 8, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  footerText: { color: "#374151" },
  link: { color: PRIMARY, fontWeight: "700" },
});
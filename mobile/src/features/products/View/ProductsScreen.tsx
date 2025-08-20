import React, { useRef, useState } from "react";
import {
  View, Text, SectionList, TextInput, RefreshControl, Alert,
  ActivityIndicator, TouchableOpacity, StyleSheet, Platform, StatusBar, SafeAreaView, Animated, Easing, 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProductsVM } from "../ViewModel/useProductsVM";
import ProductCard from "./ProductCard";
import { useAuth } from "../../../providers/AuthProvider";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useActionSheet } from "@expo/react-native-action-sheet";

export default function ProductsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const vm = useProductsVM();
  const { showActionSheetWithOptions } = useActionSheet();

  // search animation
  const [showSearch, setShowSearch] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const toggleSearch = () => {
    if (showSearch) {
      Animated.timing(searchAnimation, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false })
        .start(() => { setShowSearch(false); vm.setQ(""); vm.onSearch(); });
    } else {
      setShowSearch(true);
      Animated.timing(searchAnimation, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
    }
  };

  const searchHeight = searchAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
  const searchOpacity = searchAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // menus
  const openSortMenu = () => {
    const cancelButtonIndex = vm.sortOptions.length;
    showActionSheetWithOptions(
      { title: "Сортировка", options: [...vm.sortOptions, "Отмена"], cancelButtonIndex },
      (i) => vm.applySortByIndex(i)
    );
  };

  const openCategoryMenu = () => {
    const cancelButtonIndex = vm.categoryMenuOptions.length;
    showActionSheetWithOptions(
      { title: "Категории", options: [...vm.categoryMenuOptions, "Отмена"], cancelButtonIndex },
      (i) => vm.applyCategoryByIndex(i)
    );
  };
  useFocusEffect(
    React.useCallback(() => {
      // перезагружаем текущую выборку (учитывая строку поиска)
      vm.reload(vm.q.trim() || undefined);
      // ничего не возвращаем — нам не нужно очищать эффекты при blur
    }, [vm.reload, vm.q])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* background */}
        <View style={styles.bgBlobA} />
        <View style={styles.bgBlobB} />

        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Smart Tracker</Text>
            {user?.email && <Text style={styles.headerSubtitle}>{user.email}</Text>}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleSearch} style={styles.searchIconButton} activeOpacity={0.7}>
              <Ionicons name={showSearch ? "close" : "search"} size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={() => {
              Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
                { text: "Отмена", style: "cancel" },
                { text: "Выйти", style: "destructive", onPress: logout },
              ]);
            }} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* search */}
        <Animated.View style={[styles.searchContainer, { height: searchHeight, opacity: searchOpacity }]}>
          {showSearch && (
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <TextInput
                  placeholder="Поиск: молоко"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={vm.q}
                  onChangeText={vm.setQ}
                  style={styles.searchInput}
                  returnKeyType="search"
                  onSubmitEditing={vm.onSearch}
                  autoFocus
                />
              </View>
              <TouchableOpacity style={styles.searchBtn} onPress={vm.onSearch} activeOpacity={0.9}>
                <Text style={styles.searchBtnText}>Найти</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={openSortMenu} activeOpacity={0.9}>
            <Text style={styles.toolbarBtnText}>Сортировка</Text>
            <Text style={styles.toolbarBtnHint}>
              {vm.sortKey === "nameAsc" ? "Название A→Я"
               : vm.sortKey === "expiryAsc" ? "Срок ↑"
               : vm.sortKey === "expiryDesc" ? "Срок ↓" : "Кол-во ↓"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarBtn} onPress={openCategoryMenu} activeOpacity={0.9}>
            <Text style={styles.toolbarBtnText}>Категории</Text>
            <Text style={styles.toolbarBtnHint}>{vm.categoryHint}</Text>
          </TouchableOpacity>
        </View>

        {/* list */}
        <View style={styles.listWrap}>
          {vm.state === "loading" ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : vm.state === "error" ? (
            <View style={{ alignItems: "center", marginTop: 32 }}>
              <Text style={{ color: "rgba(255,255,255,0.8)" }}>{vm.error}</Text>
              <TouchableOpacity style={[styles.searchBtn, { marginTop: 12 }]} onPress={() => vm.reload()}>
                <Text style={styles.searchBtnText}>Повторить</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SectionList
              sections={vm.sections}
              keyExtractor={(i, idx) => (i?.id != null ? String(i.id) : `idx-${idx}`)}
              //заголовки секций не показываем
              renderSectionHeader={() => null}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              SectionSeparatorComponent={() => <View style={{ height: 14 }} />}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  onEdit={(p) => navigation.navigate("AdjustQuantity" as never, { id: p.id, name: p.name, currentQuantity: p.quantity } as never)}
                  onDelete={async (id) => {
                    try { await vm.remove(id); }
                    catch (e: any) { Alert.alert("Ошибка", e?.message ?? "Не удалось удалить продукт"); }
                  }}
                />
              )}
              refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={vm.onRefresh} tintColor="#fff" />}
              contentContainerStyle={{ paddingBottom: 120 }}
            />
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("AddProduct" as never)} activeOpacity={0.9} style={styles.fab}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#3B82F6";
const BG = "#0f172a";
// стили
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  root: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 0 : StatusBar.currentHeight },
  bgBlobA: { position: "absolute", width: 260, height: 260, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.22)", top: -60, right: -80, transform: [{ rotate: "15deg" }], filter: Platform.OS === "web" ? "blur(40px)" : undefined },
  bgBlobB: { position: "absolute", width: 300, height: 300, borderRadius: 999, backgroundColor: "rgba(99,102,241,0.16)", bottom: -80, left: -100, transform: [{ rotate: "-10deg" }], filter: Platform.OS === "web" ? "blur(40px)" : undefined },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingVertical: 8 },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchIconButton: { padding: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)" },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "800", marginBottom: 2 },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  logoutButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(239, 68, 68, 0.2)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.4)" },
  searchContainer: { overflow: "hidden", marginBottom: 12 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchInputWrap: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
  searchInput: { paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 12 : 8, color: "white", fontSize: 16 },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: PRIMARY, borderRadius: 12 },
  searchBtnText: { color: "white", fontWeight: "700" },
  toolbar: { flexDirection: "row", gap: 8, marginBottom: 12 },
  toolbarBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 12, paddingVertical: 10 },
  toolbarBtnText: { color: "rgba(255,255,255,0.95)", fontWeight: "800", fontSize: 14 },
  toolbarBtnHint: { color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: 12 },
  listWrap: { flex: 1 },
  categoryHeader: { color: "rgba(255,255,255,0.9)", fontWeight: "800", marginTop: 14, marginBottom: 8, fontSize: 16, paddingHorizontal: 2 },
  fab: { position: "absolute", right: 20, bottom: 30, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 28, backgroundColor: PRIMARY, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 18, lineHeight: 20 },
});

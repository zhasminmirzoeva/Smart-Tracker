// App.tsx
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { NotificationsProvider } from './src/providers/NotificationsProvider';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';

import LoginScreen from './src/features/auth/View/LoginScreen';
import RegisterScreen from './src/features/auth/View/RegisterScreen';
import ProductsScreen from './src/features/products/View/ProductsScreen';
import AddProductScreen from './src/features/products/View/AddProductScreen';
import AdjustQuantityScreen from './src/features/products/View/AdjustQuantityScreen';
import RecipesListScreen from './src/features/recipes/View/RecipesListScreen';
import RecipeDetailsScreen from './src/features/recipes/View/RecipeDetailsScreen';
import GenerateRecipeScreen from './src/features/recipes/View/GenerateRecipeScreen';
import NotificationSettingsScreen from './src/features/notifications/View/NotificationSettingsScreen';
import Loading from './src/components/Loading';

export type RootStackParamList = { AuthTabs: undefined; Login: undefined; Register: undefined; };
export type ProductsStackParamList = {
  Products: undefined;
  AddProduct: undefined;
  AdjustQuantity: { id: number | string; name: string; currentQuantity: number };
};
export type RecipesStackParamList = {
  Recipes: undefined;
  RecipeDetails: { id: number | string; initial?: any };
  GenerateRecipe: undefined;
};
export type SettingsStackParamList = { NotificationSettings: undefined; };

const RootStack = createNativeStackNavigator<RootStackParamList>();
const ProductsStack = createNativeStackNavigator<ProductsStackParamList>();
const RecipesStack = createNativeStackNavigator<RecipesStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator();

const PRIMARY_BG = '#0f172a';

/**  Навигаторы  ****/
function ProductsStackNavigator() {
  return (
    <ProductsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: PRIMARY_BG },
      }}
    >
      <ProductsStack.Screen name="Products" component={ProductsScreen} options={{ title: 'Smart Tracker' }} />
      <ProductsStack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Добавить продукт' }} />
      <ProductsStack.Screen name="AdjustQuantity" component={AdjustQuantityScreen} options={{ title: 'Количество' }} />
    </ProductsStack.Navigator>
  );
}

function RecipesStackNavigator() {
  return (
    <RecipesStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: PRIMARY_BG },
      }}
    >
      <RecipesStack.Screen name="Recipes" component={RecipesListScreen} options={{ title: 'ИИ-рецепты' }} />
      <RecipesStack.Screen name="RecipeDetails" component={RecipeDetailsScreen} options={{ title: 'Рецепт' }} />
      <RecipesStack.Screen name="GenerateRecipe" component={GenerateRecipeScreen} options={{ title: 'Новый рецепт' }} />
    </RecipesStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: PRIMARY_BG },
      }}
    >
      <SettingsStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Настройки' }} />
    </SettingsStack.Navigator>
  );
}

function AuthedTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PRIMARY_BG,
          borderTopColor: 'rgba(255,255,255,0.12)',
        },
        tabBarActiveTintColor: 'white',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
      }}
    >
      <Tab.Screen name="ProductsTab" component={ProductsStackNavigator} options={{ title: 'Продукты' }} />
      <Tab.Screen name="RecipesTab" component={RecipesStackNavigator} options={{ title: 'ИИ-рецепты' }} />
      <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, state } = useAuth();              // <-- VM из AuthProvider
  const loading = state === 'loading';

  if (loading) return <Loading />;

  return (
    <RootStack.Navigator>
      {user ? (
        <RootStack.Screen name="AuthTabs" component={AuthedTabs} options={{ headerShown: false }} />
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <RootStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      )}
    </RootStack.Navigator>
  );
}

export default function App() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);
      // TODO: навигация по пушу
    });
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <AuthProvider>
        <NotificationsProvider>
          <ActionSheetProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </ActionSheetProvider>
        </NotificationsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

/** ================== Стили ================== */
const styles = StyleSheet.create({
  headerRoot: {
    backgroundColor: PRIMARY_BG,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 15,
  },
  headerContent: {
    height: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerRightBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerRightText: {
    color: 'white',
    fontWeight: '700',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backIcon: { color: 'white', fontSize: 20, lineHeight: 20, marginTop: -1 },
  headerBlobA: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.22)',
    top: -40, right: -50,
    transform: [{ rotate: '15deg' }],
  },
  headerBlobB: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.16)',
    top: -80, left: -80,
    transform: [{ rotate: '-10deg' }],
  },
});

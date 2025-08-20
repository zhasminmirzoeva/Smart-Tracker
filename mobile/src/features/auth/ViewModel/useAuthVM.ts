import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../Model/auth.api";
import type { MeResponse } from "../Model/auth.types";

// Состояния аутентификации
export type AuthState = "idle" | "loading" | "ready" | "error";

// ViewModel для управления состоянием аутентификации
export function useAuthVM() {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // Флаг для операций входа/выхода

  // Загрузка данных пользователя
  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const me = await authApi.me();
      setUser(me);
      setState("ready");
    } catch (e: any) {
      setUser(null);
      setError(e?.message ?? "Ошибка загрузки профиля");
      setState("error");
    }
  }, []);

  // Автозагрузка при монтировании
  useEffect(() => { load(); }, [load]);

  // Вход в аккаунт
  const login = useCallback(async (email: string, password: string) => {
    setBusy(true);
    try {
      await authApi.login({ email, password });
      await load(); // Перезагружаем данные после входа
    } finally { setBusy(false); }
  }, [load]);

  // Регистрация + автоматический вход
  const register = useCallback(async (email: string, password: string) => {
    setBusy(true);
    try {
      await authApi.register({ email, password });
      await authApi.login({ email, password }); // Вход после регистрации
      await load();
    } finally { setBusy(false); }
  }, [load]);

  // Выход из аккаунта
  const logout = useCallback(async () => {
    setBusy(true);
    try { 
      await authApi.logout(); 
      setUser(null); 
      setState("idle"); // Сбрасываем состояние
    }
    finally { setBusy(false); }
  }, []);

  return useMemo(() => ({ 
    state, user, error, busy, login, register, logout, reload: load 
  }), [state, user, error, busy, login, register, logout, load]);
}
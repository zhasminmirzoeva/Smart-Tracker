import { apiFetch } from "../../../shared/api/apiFetch";
import { saveTokens, clearTokens, getTokens } from "../../../shared/storage/tokens";
import { RegisterBody, RegisterResponse, LoginBody, LoginResponse, MeResponse } from "./auth.types";

// API для работы с аутентификацией
export const authApi = {
  // Регистрация нового пользователя
  async register(body: RegisterBody): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) });
  },

  // Вход и сохранение токенов
  async login(body: LoginBody): Promise<LoginResponse> {
    const data = await apiFetch<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) });
    // Сохраняем токены при успешном входе
    if (data?.access_token && data?.refresh_token) {
      await saveTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
    }
    return data;
  },

  // Получение данных текущего пользователя
  async me(): Promise<MeResponse> {
    return apiFetch<MeResponse>("/auth/me");
  },

  // Выход: сервер + очистка токенов
  async logout(): Promise<void> {
    try {
      // Отправляем refresh_token на сервер для инвалидации
      const tokens = await getTokens();
      const rt = tokens?.refresh_token;
      if (rt) {
        await apiFetch<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: rt }) });
      }
    } finally {
      // Всегда очищаем токены на устройстве
      await clearTokens();
    }
  },
};
import { getTokens, saveTokens, clearTokens } from "../../shared/storage/tokens";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://backend-1-5xsb.onrender.com";

type Tokens = { access_token: string; refresh_token: string; token_type?: string };

export class HttpError extends Error {
  status: number;
  detail: unknown;   // оригинальный payload из бэка
  constructor(status: number, detail: unknown, fallbackMessage?: string) {
    const msg = typeof detail === "string" ? detail : (fallbackMessage || "Request failed");
    super(msg);
    this.status = status;
    this.detail = detail;
  }
}

async function tryParseJSON(res: Response) {
  if (res.status === 204 || res.status === 205) return undefined; // No Content
  const text = await res.text();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; } // вернём текст если это не JSON
}

function extractDetail(payload: any): string {
  // FastAPI: {detail: "msg"} | {detail: [{loc, msg, type}, ...]} | {detail: {...}} | произвольные {message|error}
  if (payload == null) return "Неизвестная ошибка";
  const d = payload.detail ?? payload.message ?? payload.error ?? payload;
  if (Array.isArray(d)) {
    // pydantic список ошибок
    const msgs = d.map((e) => e?.msg ?? e?.message ?? JSON.stringify(e));
    return msgs.join("; ");
  }
  if (typeof d === "object") {
    // если detail объект — попробуем msg/message, иначе stringify
    if ("msg" in d && typeof d.msg === "string") return d.msg;
    if ("message" in d && typeof (d as any).message === "string") return (d as any).message;
    try { return JSON.stringify(d); } catch { return "Ошибка"; }
  }
  return String(d);
}

async function refreshTokens(oldRefresh?: string): Promise<Tokens | null> {
  try {
    const rt = oldRefresh ?? (await getTokens())?.refresh_token;
    if (!rt) return null;

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!res.ok) return null;

    const data = (await tryParseJSON(res)) as Tokens | undefined;
    if (data?.access_token && data?.refresh_token) {
      await saveTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

//Универсальный запрос с токенами, авто-рефрешем и поддержкой 204, c извлечением detail от FastAPI
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
  opts?: { retryOn401?: boolean }
): Promise<T> {
  const retryOn401 = opts?.retryOn401 ?? true;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const tokens = await getTokens();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };

  if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;

  // Не ставим JSON Content-Type для FormData
  if (
    init.body &&
    !headers["Content-Type"] &&
    !(typeof FormData !== "undefined" && init.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const doRequest = async (): Promise<{ res: Response; data: any }> => {
    const res = await fetch(url, { ...init, headers });
    const data = await tryParseJSON(res);
    return { res, data };
  };

  let { res, data } = await doRequest();

  // авто-рефреш по 401
  if (res.status === 401 && retryOn401) {
    const refreshed = await refreshTokens(tokens?.refresh_token);
    if (refreshed?.access_token) {
      headers.Authorization = `Bearer ${refreshed.access_token}`;
      ({ res, data } = await doRequest());
    } else {
      await clearTokens();
    }
  }

  if (!res.ok) {
    const message = extractDetail(data);
    throw new HttpError(res.status, data?.detail ?? data, message);
  }

  return data as T;
}

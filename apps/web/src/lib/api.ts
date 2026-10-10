import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "./tokenStore";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL, withCredentials: false });

api.interceptors.request.use((config) => {
  if (tokenStore.access) {
    config.headers.Authorization = `Bearer ${tokenStore.access}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: refresh });
    tokenStore.setAccess(data.accessToken);
    tokenStore.setRefresh(data.refreshToken);
    return data.accessToken as string;
  } catch {
    tokenStore.clear();
    return null;
  }
}

// Renovação única e sob demanda; evita tempestade de refresh em requests paralelos.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");
    if (status === 401 && original && !original._retry && !isAuthRoute && tokenStore.getRefresh()) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      window.dispatchEvent(new Event("nexus:session-expired"));
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown, fallback = "Ocorreu um erro."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

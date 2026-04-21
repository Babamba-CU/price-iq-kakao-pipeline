import { create } from "zustand";
import api from "./client";

interface AuthState {
  token: string | null;
  user: Record<string, unknown> | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  user: null,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ token: data.access_token });
  },

  logout: async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) await api.post("/auth/logout", { refresh_token: refresh }).catch(() => {});
    localStorage.clear();
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    const { data } = await api.get("/auth/me");
    set({ user: data });
  },
}));

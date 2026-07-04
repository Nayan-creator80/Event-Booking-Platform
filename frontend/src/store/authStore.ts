import { create } from "zustand";
import { api } from "../api/client";

export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (user, accessToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },
  clearAuth: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },
  checkAuth: async () => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      set({
        user: JSON.parse(storedUser),
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    try {
      const response = await api.post("/auth/refresh");
      const { accessToken } = response.data.data;
      
      const payloadBase64 = accessToken.split(".")[1];
      const payloadDecoded = JSON.parse(atob(payloadBase64));
      
      const user: User = {
        id: payloadDecoded.id,
        email: payloadDecoded.email,
        name: payloadDecoded.name || (storedUser ? JSON.parse(storedUser).name : (payloadDecoded.role === "ADMIN" ? "System Admin" : "User")),
        role: payloadDecoded.role,
      };

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

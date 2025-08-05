import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        setAccessToken: (token) => set({ accessToken: token }),
        clearAccessToken: () => set({ accessToken: null }),
      }),
      {
        name: 'auth-storage',
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
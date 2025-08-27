import { create } from "zustand"

export const useUI = create((set) => ({
  theme: localStorage.getItem("theme") || "light",
  setTheme: (theme) => set({ theme }),
}))

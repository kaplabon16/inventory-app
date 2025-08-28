import { create } from "zustand"

const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("theme") || "light"
  }
  return "light"
}

export const useUI = create((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

  // ✅ Inventory autosave feedback
  autosaveState: "saved", // 'saving' | 'saved'
  setSaving: (state) => set({ autosaveState: state }),
}))

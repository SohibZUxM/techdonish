export const colors = {
  background: "#f5f7ff",
  surface: "#ffffff",
  surfaceAlt: "#eef3ff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#dbe5f5",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  accent: "#f59e0b",
  success: "#16a34a",
  warning: "#f97316",
  danger: "#dc2626",
  purple: "#7c3aed",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#2563eb",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
};

export const rolePalette = {
  student: ["#2563eb", "#4f46e5"] as const,
  teacher: ["#0f766e", "#14b8a6"] as const,
  parent: ["#7c3aed", "#a855f7"] as const,
  admin: ["#0f172a", "#334155"] as const,
};

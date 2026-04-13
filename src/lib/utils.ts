export const toMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const toDateLabel = (value: any, includeYear = false) => {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
};

export const toTimeLabel = (value: any) => {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const safePercent = (score: any, maxScore: any) => {
  const max = Number(maxScore || 100);
  const sc = Number(score || 0);
  if (!max || Number.isNaN(max) || Number.isNaN(sc)) return null;
  return Math.round((sc / max) * 100);
};

export const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const uniqueStrings = (items: any[]) =>
  [...new Set((Array.isArray(items) ? items : []).filter(Boolean).map((item) => String(item)))];

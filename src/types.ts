import { Id } from "../convex/_generated/dataModel";

export type MacroCategory =
  | "carboidrati_complessi"
  | "zuccheri_semplici"
  | "proteine"
  | "grassi"
  | "minerali_vitamine_fibre"
  | "spezie_erbe_condimenti"
  | "altro"
  | "integratori";

export type MealType =
  | "colazione"
  | "spuntino_mattina"
  | "pranzo"
  | "spuntino_pomeriggio"
  | "cena"
  | "pasto"
  | "extra"
  | "attivita_motoria"
  | "altro";

export const ALL_MACRO_CATEGORIES: MacroCategory[] = [
  "carboidrati_complessi",
  "zuccheri_semplici",
  "proteine",
  "grassi",
  "minerali_vitamine_fibre",
  "spezie_erbe_condimenti",
  "altro",
  "integratori",
];

export const ALL_MEAL_TYPES: MealType[] = [
  "colazione",
  "spuntino_mattina",
  "pranzo",
  "spuntino_pomeriggio",
  "cena",
  "pasto",
  "extra",
  "attivita_motoria",
  "altro",
];

export const MACRO_LABELS: Record<MacroCategory, string> = {
  carboidrati_complessi: "Carboidrati Complessi",
  zuccheri_semplici: "Zuccheri Semplici",
  proteine: "Proteine",
  grassi: "Grassi",
  minerali_vitamine_fibre: "Minerali / Vitamine / Fibre",
  spezie_erbe_condimenti: "Spezie, Erbe e Condimenti",
  altro: "Altro",
  integratori: "Integratori",
};

export const MACRO_SHORT: Record<MacroCategory, string> = {
  carboidrati_complessi: "C",
  zuccheri_semplici: "Z",
  proteine: "P",
  grassi: "G",
  minerali_vitamine_fibre: "V",
  spezie_erbe_condimenti: "S",
  altro: "A",
  integratori: "I",
};

export const MACRO_COLORS: Record<MacroCategory, string> = {
  carboidrati_complessi: "#f59e0b",
  zuccheri_semplici: "#f97316",
  proteine: "#3b82f6",
  grassi: "#a855f7",
  minerali_vitamine_fibre: "#22c55e",
  spezie_erbe_condimenti: "#ec4899",
  altro: "#6b7280",
  integratori: "#14b8a6",
};

export const MACRO_BG: Record<MacroCategory, string> = {
  carboidrati_complessi: "bg-amber-100 text-amber-800 border-amber-300",
  zuccheri_semplici: "bg-orange-100 text-orange-800 border-orange-300",
  proteine: "bg-blue-100 text-blue-800 border-blue-300",
  grassi: "bg-purple-100 text-purple-800 border-purple-300",
  minerali_vitamine_fibre: "bg-green-100 text-green-800 border-green-300",
  spezie_erbe_condimenti: "bg-pink-100 text-pink-800 border-pink-300",
  altro: "bg-gray-100 text-gray-800 border-gray-300",
  integratori: "bg-teal-100 text-teal-800 border-teal-300",
};

export const MACRO_BADGE_COLORS: Record<MacroCategory, string> = {
  carboidrati_complessi: "bg-amber-500 text-white",
  zuccheri_semplici: "bg-orange-500 text-white",
  proteine: "bg-blue-500 text-white",
  grassi: "bg-purple-500 text-white",
  minerali_vitamine_fibre: "bg-green-500 text-white",
  spezie_erbe_condimenti: "bg-pink-500 text-white",
  altro: "bg-gray-500 text-white",
  integratori: "bg-teal-500 text-white",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  colazione: "Colazione",
  spuntino_mattina: "Spuntino Mattina",
  pranzo: "Pranzo",
  spuntino_pomeriggio: "Spuntino Pomeriggio",
  cena: "Cena",
  pasto: "Pasto",
  extra: "Extra",
  attivita_motoria: "Attività Motoria",
  altro: "Altro",
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  colazione: "☀️",
  spuntino_mattina: "🍎",
  pranzo: "🍽️",
  spuntino_pomeriggio: "🥪",
  cena: "🌙",
  pasto: "🥘",
  extra: "⭐",
  attivita_motoria: "🏃",
  altro: "🍴",
};

export const DAY_NAMES = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export const PORTION_LABELS = {
  portionSmall: "S (Piccola)",
  portionMedium: "M (Media)",
  portionLarge: "L (Grande)",
  portionSuper: "XL (Super)",
};

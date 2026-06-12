import { v } from "convex/values";

export const categoryValidator = v.union(
  v.literal("carboidrati_complessi"),
  v.literal("zuccheri_semplici"),
  v.literal("proteine"),
  v.literal("grassi"),
  v.literal("minerali_vitamine_fibre"),
  v.literal("spezie_erbe_condimenti"),
  v.literal("altro"),
  v.literal("integratori"),
);

export const mealTypeValidator = v.union(
  v.literal("colazione"),
  v.literal("spuntino_mattina"),
  v.literal("pranzo"),
  v.literal("spuntino_pomeriggio"),
  v.literal("cena"),
  v.literal("pasto"),
  v.literal("extra"),
  v.literal("attivita_motoria"),
  v.literal("altro"),
);

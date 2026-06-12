import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Banca dati ingredienti
  ingredients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    category: v.union(
      v.literal("carboidrati_complessi"),
      v.literal("zuccheri_semplici"),
      v.literal("proteine"),
      v.literal("grassi"),
      v.literal("minerali_vitamine_fibre"),
      v.literal("spezie_erbe_condimenti")
    ),
    kcalPer100g: v.number(),
    carbsPer100g: v.optional(v.number()),
    proteinsPer100g: v.optional(v.number()),
    fatsPer100g: v.optional(v.number()),
    fibersPer100g: v.optional(v.number()),
    portionSmall: v.optional(v.number()),
    portionMedium: v.optional(v.number()),
    portionLarge: v.optional(v.number()),
    portionSuper: v.optional(v.number()),
    brand: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["userId"] }),

  mealItems: defineTable({
    mealId: v.id("meals"),
    ingredientId: v.id("ingredients"),
    weightGrams: v.number(),
    kcal: v.number(),
  }).index("by_meal", ["mealId"]),

  meals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    mealType: v.union(
      v.literal("colazione"),
      v.literal("spuntino_mattina"),
      v.literal("pranzo"),
      v.literal("spuntino_pomeriggio"),
      v.literal("cena"),
      v.literal("altro")
    ),
    totalKcal: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "mealType"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["userId"] }),

  dayMealSlots: defineTable({
    dayId: v.id("days"),
    mealId: v.id("meals"),
    mealType: v.union(
      v.literal("colazione"),
      v.literal("spuntino_mattina"),
      v.literal("pranzo"),
      v.literal("spuntino_pomeriggio"),
      v.literal("cena"),
      v.literal("altro")
    ),
    order: v.number(),
    overrideItems: v.optional(v.array(v.object({
      ingredientId: v.id("ingredients"),
      weightGrams: v.number(),
      kcal: v.number(),
    }))),
  }).index("by_day", ["dayId"]),

  days: defineTable({
    userId: v.id("users"),
    name: v.string(),
    totalKcal: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["userId"] }),

  weeks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  weekDays: defineTable({
    weekId: v.id("weeks"),
    dayId: v.id("days"),
    dayOfWeek: v.number(),
    customSlots: v.optional(v.array(v.object({
      mealId: v.id("meals"),
      mealType: v.union(
        v.literal("colazione"),
        v.literal("spuntino_mattina"),
        v.literal("pranzo"),
        v.literal("spuntino_pomeriggio"),
        v.literal("cena"),
        v.literal("altro")
      ),
      order: v.number(),
      mealName: v.optional(v.string()),
      totalKcal: v.number(),
      items: v.array(v.object({
        ingredientId: v.id("ingredients"),
        weightGrams: v.number(),
        kcal: v.number(),
      })),
    }))),
  })
    .index("by_week", ["weekId"])
    .index("by_week_and_day", ["weekId", "dayOfWeek"]),

  shoppingLists: defineTable({
    userId: v.id("users"),
    weekId: v.optional(v.id("weeks")),
    name: v.string(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  shoppingItems: defineTable({
    listId: v.id("shoppingLists"),
    ingredientId: v.optional(v.id("ingredients")),
    name: v.string(),
    quantity: v.string(),
    brand: v.optional(v.string()),
    nutritionNotes: v.optional(v.string()),
    checked: v.boolean(),
    category: v.optional(v.string()),
  }).index("by_list", ["listId"]),

  // Collezioni di pasti (selezioni salvate)
  mealCollections: defineTable({
    userId: v.id("users"),
    name: v.string(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  mealCollectionItems: defineTable({
    collectionId: v.id("mealCollections"),
    mealId: v.id("meals"),
    order: v.number(),
  }).index("by_collection", ["collectionId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

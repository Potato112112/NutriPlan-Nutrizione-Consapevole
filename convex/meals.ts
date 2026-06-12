import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await Promise.all(meals.map(async (meal) => {
      const items = await ctx.db
        .query("mealItems")
        .withIndex("by_meal", (q) => q.eq("mealId", meal._id))
        .collect();
      const ingredientIds = items.map((i) => i.ingredientId);
      const ingredients = await Promise.all(ingredientIds.map((id) => ctx.db.get(id)));
      const totalProt = items.reduce((sum, item, idx) => {
        const ing = ingredients[idx];
        if (!ing || ing.proteinsPer100g == null) return sum;
        return sum + (ing.proteinsPer100g * item.weightGrams) / 100;
      }, 0);
      return { ...meal, totalProt };
    }));
  },
});

export const getWithItems = query({
  args: { mealId: v.id("meals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== userId) return null;
    const items = await ctx.db
      .query("mealItems")
      .withIndex("by_meal", (q) => q.eq("mealId", args.mealId))
      .collect();
    const itemsWithIngredients = await Promise.all(
      items.map(async (item) => {
        const ingredient = await ctx.db.get(item.ingredientId);
        return { ...item, ingredient };
      })
    );
    return { ...meal, items: itemsWithIngredients };
  },
});

export const getManyWithItems = query({
  args: { mealIds: v.array(v.id("meals")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const result = [];
    for (const mealId of args.mealIds) {
      const meal = await ctx.db.get(mealId);
      if (!meal || meal.userId !== userId) continue;
      const items = await ctx.db
        .query("mealItems")
        .withIndex("by_meal", (q) => q.eq("mealId", mealId))
        .collect();
      const itemsWithIngredients = await Promise.all(
        items.map(async (item) => {
          const ingredient = await ctx.db.get(item.ingredientId);
          return { ...item, ingredient };
        })
      );
      result.push({ ...meal, items: itemsWithIngredients });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    mealType: v.union(
      v.literal("colazione"),
      v.literal("spuntino_mattina"),
      v.literal("pranzo"),
      v.literal("spuntino_pomeriggio"),
      v.literal("cena"),
      v.literal("altro")
    ),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        weightGrams: v.number(),
        kcal: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const totalKcal = args.items.reduce((sum, item) => sum + item.kcal, 0);
    const mealId = await ctx.db.insert("meals", {
      userId,
      name: args.name,
      mealType: args.mealType,
      totalKcal,
      notes: args.notes,
    });
    for (const item of args.items) {
      await ctx.db.insert("mealItems", { mealId, ...item });
    }
    return mealId;
  },
});

export const update = mutation({
  args: {
    id: v.id("meals"),
    name: v.string(),
    mealType: v.union(
      v.literal("colazione"),
      v.literal("spuntino_mattina"),
      v.literal("pranzo"),
      v.literal("spuntino_pomeriggio"),
      v.literal("cena"),
      v.literal("altro")
    ),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        weightGrams: v.number(),
        kcal: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const totalKcal = args.items.reduce((sum, item) => sum + item.kcal, 0);
    await ctx.db.patch(args.id, {
      name: args.name,
      mealType: args.mealType,
      totalKcal,
      notes: args.notes,
    });
    const oldItems = await ctx.db
      .query("mealItems")
      .withIndex("by_meal", (q) => q.eq("mealId", args.id))
      .collect();
    for (const item of oldItems) await ctx.db.delete(item._id);
    for (const item of args.items) {
      await ctx.db.insert("mealItems", { mealId: args.id, ...item });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const items = await ctx.db
      .query("mealItems")
      .withIndex("by_meal", (q) => q.eq("mealId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(args.id);
  },
});

export const duplicate = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const { _id, _creationTime, ...rest } = existing;
    const newId = await ctx.db.insert("meals", { ...rest, name: `${rest.name} (copia)` });
    const items = await ctx.db
      .query("mealItems")
      .withIndex("by_meal", (q) => q.eq("mealId", args.id))
      .collect();
    for (const item of items) {
      const { _id: _iid, _creationTime: _ict, mealId, ...ir } = item;
      await ctx.db.insert("mealItems", { ...ir, mealId: newId });
    }
    return newId;
  },
});

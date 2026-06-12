import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mealTypeValidator } from "./validators";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("days")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getWithMeals = query({
  args: { dayId: v.id("days") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const day = await ctx.db.get(args.dayId);
    if (!day || day.userId !== userId) return null;
    const slots = await ctx.db
      .query("dayMealSlots")
      .withIndex("by_day", (q) => q.eq("dayId", args.dayId))
      .collect();
    const slotsWithMeals = await Promise.all(
      slots.map(async (slot) => {
        const meal = await ctx.db.get(slot.mealId);
        if (!meal) return null;
        const baseItems = await ctx.db
          .query("mealItems")
          .withIndex("by_meal", (q) => q.eq("mealId", slot.mealId))
          .collect();
        const effectiveItems = slot.overrideItems ?? baseItems;
        const itemsWithIngredients = await Promise.all(
          effectiveItems.map(async (item) => {
            const ingredient = await ctx.db.get(item.ingredientId);
            return { ...item, ingredient };
          })
        );
        const totalKcal = effectiveItems.reduce((sum, item) => sum + item.kcal, 0);
        return { ...slot, meal: { ...meal, name: slot.mealName ?? meal.name, totalKcal, items: itemsWithIngredients } };
      })
    );
    const validSlots = slotsWithMeals.filter(Boolean);
    validSlots.sort((a, b) => (a!.order ?? 0) - (b!.order ?? 0));
    const computedTotal = validSlots.reduce((sum, slot) => sum + (slot?.meal?.totalKcal ?? 0), 0);
    return { ...day, totalKcal: computedTotal, slots: validSlots };
  },
});

export const getManyWithMeals = query({
  args: { dayIds: v.array(v.id("days")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const result = [];
    for (const dayId of args.dayIds) {
      const day = await ctx.db.get(dayId);
      if (!day || day.userId !== userId) continue;
      const slots = await ctx.db
        .query("dayMealSlots")
        .withIndex("by_day", (q) => q.eq("dayId", dayId))
        .collect();
      const slotsWithMeals = await Promise.all(
        slots.map(async (slot) => {
          const meal = await ctx.db.get(slot.mealId);
          if (!meal) return null;
          const baseItems = await ctx.db
            .query("mealItems")
            .withIndex("by_meal", (q) => q.eq("mealId", slot.mealId))
            .collect();
          const effectiveItems = slot.overrideItems ?? baseItems;
          const itemsWithIngredients = await Promise.all(
            effectiveItems.map(async (item) => {
              const ingredient = await ctx.db.get(item.ingredientId);
              return { ...item, ingredient };
            })
          );
          const totalKcal = effectiveItems.reduce((sum, item) => sum + item.kcal, 0);
          return { ...slot, meal: { ...meal, name: slot.mealName ?? meal.name, totalKcal, items: itemsWithIngredients } };
        })
      );
      const validSlots = slotsWithMeals.filter(Boolean).sort((a, b) => (a!.order ?? 0) - (b!.order ?? 0));
      const totalKcal = validSlots.reduce((sum, slot) => sum + (slot?.meal?.totalKcal ?? 0), 0);
      result.push({ ...day, totalKcal, slots: validSlots });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
    mealSlots: v.array(
      v.object({
        mealId: v.id("meals"),
        mealType: mealTypeValidator,
        order: v.number(),
        mealName: v.optional(v.string()),
        overrideItems: v.optional(v.array(v.object({
          ingredientId: v.id("ingredients"),
          weightGrams: v.number(),
          kcal: v.number(),
        }))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    let totalKcal = 0;
    for (const slot of args.mealSlots) {
      if (slot.overrideItems) {
        totalKcal += slot.overrideItems.reduce((sum, item) => sum + item.kcal, 0);
        continue;
      }
      const meal = await ctx.db.get(slot.mealId);
      if (meal) totalKcal += meal.totalKcal;
    }
    const dayId = await ctx.db.insert("days", {
      userId,
      name: args.name,
      totalKcal,
      notes: args.notes,
    });
    for (const slot of args.mealSlots) {
      await ctx.db.insert("dayMealSlots", { dayId, ...slot });
    }
    return dayId;
  },
});

export const update = mutation({
  args: {
    id: v.id("days"),
    name: v.string(),
    notes: v.optional(v.string()),
    mealSlots: v.array(
      v.object({
        mealId: v.id("meals"),
        mealType: mealTypeValidator,
        order: v.number(),
        mealName: v.optional(v.string()),
        overrideItems: v.optional(v.array(v.object({
          ingredientId: v.id("ingredients"),
          weightGrams: v.number(),
          kcal: v.number(),
        }))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    let totalKcal = 0;
    for (const slot of args.mealSlots) {
      if (slot.overrideItems) {
        totalKcal += slot.overrideItems.reduce((sum, item) => sum + item.kcal, 0);
        continue;
      }
      const meal = await ctx.db.get(slot.mealId);
      if (meal) totalKcal += meal.totalKcal;
    }
    await ctx.db.patch(args.id, { name: args.name, totalKcal, notes: args.notes });
    const oldSlots = await ctx.db
      .query("dayMealSlots")
      .withIndex("by_day", (q) => q.eq("dayId", args.id))
      .collect();
    for (const slot of oldSlots) await ctx.db.delete(slot._id);
    for (const slot of args.mealSlots) {
      await ctx.db.insert("dayMealSlots", { dayId: args.id, ...slot });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("days") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const slots = await ctx.db
      .query("dayMealSlots")
      .withIndex("by_day", (q) => q.eq("dayId", args.id))
      .collect();
    for (const slot of slots) await ctx.db.delete(slot._id);
    await ctx.db.delete(args.id);
  },
});

export const duplicate = mutation({
  args: { id: v.id("days") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const { _id, _creationTime, ...rest } = existing;
    const newId = await ctx.db.insert("days", { ...rest, name: `${rest.name} (copia)` });
    const slots = await ctx.db
      .query("dayMealSlots")
      .withIndex("by_day", (q) => q.eq("dayId", args.id))
      .collect();
    for (const slot of slots) {
      const { _id: _sid, _creationTime: _sct, dayId, ...sr } = slot;
      await ctx.db.insert("dayMealSlots", { ...sr, dayId: newId });
    }
    return newId;
  },
});

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
      .query("weeks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getWithDays = query({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const week = await ctx.db.get(args.weekId);
    if (!week || week.userId !== userId) return null;
    const weekDays = await ctx.db
      .query("weekDays")
      .withIndex("by_week", (q) => q.eq("weekId", args.weekId))
      .collect();
    const daysData = await Promise.all(
      weekDays.map(async (wd) => {
        const day = await ctx.db.get(wd.dayId);
        if (!day) return null;
        const slots = await ctx.db
          .query("dayMealSlots")
          .withIndex("by_day", (q) => q.eq("dayId", wd.dayId))
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
        if (wd.customSlots && wd.customSlots.length > 0) {
          const customSlots = await Promise.all(
            wd.customSlots.map(async (slot) => {
              const ingredientItems = await Promise.all(
                slot.items.map(async (item) => {
                  const ingredient = await ctx.db.get(item.ingredientId);
                  return { ...item, ingredient };
                })
              );
              return {
                _id: `${wd._id}_${slot.order}`,
                mealId: slot.mealId,
                mealType: slot.mealType,
                order: slot.order,
                meal: {
                  _id: slot.mealId,
                  name: slot.mealName ?? "Pasto personalizzato",
                  mealType: slot.mealType,
                  totalKcal: slot.totalKcal,
                  items: ingredientItems,
                },
              };
            })
          );
          const customTotal = customSlots.reduce((sum, slot) => sum + (slot.meal?.totalKcal ?? 0), 0);
          return { ...wd, day: { ...day, name: wd.customDayName ?? day.name, totalKcal: customTotal, slots: customSlots } };
        }
        const dayTotal = validSlots.reduce((sum, slot) => sum + (slot?.meal?.totalKcal ?? 0), 0);
        return { ...wd, day: { ...day, name: wd.customDayName ?? day.name, totalKcal: dayTotal, slots: validSlots } };
      })
    );
    const validDays = daysData.filter(Boolean);
    validDays.sort((a, b) => (a!.dayOfWeek ?? 0) - (b!.dayOfWeek ?? 0));
    return { ...week, days: validDays };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
    weekDays: v.array(
      v.object({
        dayId: v.id("days"),
        dayOfWeek: v.number(),
        customDayName: v.optional(v.string()),
        customSlots: v.optional(v.array(v.object({
          mealId: v.id("meals"),
          mealType: mealTypeValidator,
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
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const weekId = await ctx.db.insert("weeks", {
      userId,
      name: args.name,
      notes: args.notes,
    });
    for (const wd of args.weekDays) {
      await ctx.db.insert("weekDays", { weekId, ...wd });
    }
    return weekId;
  },
});

export const update = mutation({
  args: {
    id: v.id("weeks"),
    name: v.string(),
    notes: v.optional(v.string()),
    weekDays: v.array(
      v.object({
        dayId: v.id("days"),
        dayOfWeek: v.number(),
        customDayName: v.optional(v.string()),
        customSlots: v.optional(v.array(v.object({
          mealId: v.id("meals"),
          mealType: mealTypeValidator,
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
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    await ctx.db.patch(args.id, { name: args.name, notes: args.notes });
    const oldDays = await ctx.db
      .query("weekDays")
      .withIndex("by_week", (q) => q.eq("weekId", args.id))
      .collect();
    for (const wd of oldDays) await ctx.db.delete(wd._id);
    for (const wd of args.weekDays) {
      await ctx.db.insert("weekDays", { weekId: args.id, ...wd });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("weeks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const wds = await ctx.db
      .query("weekDays")
      .withIndex("by_week", (q) => q.eq("weekId", args.id))
      .collect();
    for (const wd of wds) await ctx.db.delete(wd._id);
    await ctx.db.delete(args.id);
  },
});

export const duplicate = mutation({
  args: { id: v.id("weeks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const { _id, _creationTime, ...rest } = existing;
    const newId = await ctx.db.insert("weeks", { ...rest, name: `${rest.name} (copia)` });
    const wds = await ctx.db
      .query("weekDays")
      .withIndex("by_week", (q) => q.eq("weekId", args.id))
      .collect();
    for (const wd of wds) {
      const { _id: _wid, _creationTime: _wct, weekId, ...wr } = wd;
      await ctx.db.insert("weekDays", { ...wr, weekId: newId });
    }
    return newId;
  },
});

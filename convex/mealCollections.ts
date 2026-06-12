import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("mealCollections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getWithMeals = query({
  args: { collectionId: v.id("mealCollections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== userId) return null;
    const items = await ctx.db
      .query("mealCollectionItems")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.collectionId))
      .collect();
    const itemsSorted = items.sort((a, b) => a.order - b.order);
    const mealsWithItems = await Promise.all(
      itemsSorted.map(async (item) => {
        const meal = await ctx.db.get(item.mealId);
        if (!meal) return null;
        const mealItems = await ctx.db
          .query("mealItems")
          .withIndex("by_meal", (q) => q.eq("mealId", item.mealId))
          .collect();
        const mealItemsWithIng = await Promise.all(
          mealItems.map(async (mi) => {
            const ingredient = await ctx.db.get(mi.ingredientId);
            return { ...mi, ingredient };
          })
        );
        return { ...meal, items: mealItemsWithIng, collectionItemId: item._id };
      })
    );
    return { ...collection, meals: mealsWithItems.filter(Boolean) };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
    mealIds: v.array(v.id("meals")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const collectionId = await ctx.db.insert("mealCollections", {
      userId,
      name: args.name,
      notes: args.notes,
    });
    for (let i = 0; i < args.mealIds.length; i++) {
      await ctx.db.insert("mealCollectionItems", {
        collectionId,
        mealId: args.mealIds[i],
        order: i,
      });
    }
    return collectionId;
  },
});

export const update = mutation({
  args: {
    id: v.id("mealCollections"),
    name: v.string(),
    notes: v.optional(v.string()),
    mealIds: v.array(v.id("meals")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    await ctx.db.patch(args.id, { name: args.name, notes: args.notes });
    const oldItems = await ctx.db
      .query("mealCollectionItems")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.id))
      .collect();
    for (const item of oldItems) await ctx.db.delete(item._id);
    for (let i = 0; i < args.mealIds.length; i++) {
      await ctx.db.insert("mealCollectionItems", {
        collectionId: args.id,
        mealId: args.mealIds[i],
        order: i,
      });
    }
  },
});

export const getMealsWithItems = query({
  args: { mealIds: v.array(v.id("meals")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const result = await Promise.all(
      args.mealIds.map(async (mealId) => {
        const meal = await ctx.db.get(mealId);
        if (!meal || meal.userId !== userId) return null;
        const mealItems = await ctx.db
          .query("mealItems")
          .withIndex("by_meal", (q) => q.eq("mealId", mealId))
          .collect();
        const mealItemsWithIng = await Promise.all(
          mealItems.map(async (mi) => {
            const ingredient = await ctx.db.get(mi.ingredientId);
            return { ...mi, ingredient };
          })
        );
        return { ...meal, items: mealItemsWithIng };
      })
    );
    return result.filter(Boolean);
  },
});

export const remove = mutation({
  args: { id: v.id("mealCollections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const items = await ctx.db
      .query("mealCollectionItems")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(args.id);
  },
});

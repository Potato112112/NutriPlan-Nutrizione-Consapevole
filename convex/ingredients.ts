import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const categoryValidator = v.union(
  v.literal("carboidrati_complessi"),
  v.literal("zuccheri_semplici"),
  v.literal("proteine"),
  v.literal("grassi"),
  v.literal("minerali_vitamine_fibre"),
  v.literal("spezie_erbe_condimenti")
);

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.category) {
      return await ctx.db
        .query("ingredients")
        .withIndex("by_user_and_category", (q) =>
          q.eq("userId", userId).eq("category", args.category as any)
        )
        .collect();
    }
    return await ctx.db
      .query("ingredients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!args.query) {
      return await ctx.db
        .query("ingredients")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(20);
    }
    return await ctx.db
      .query("ingredients")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("userId", userId)
      )
      .take(20);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    return await ctx.db.insert("ingredients", { ...args, userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.string(),
    category: categoryValidator,
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const { id, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    await ctx.db.delete(args.id);
  },
});

export const duplicate = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Non autorizzato");
    const { _id, _creationTime, ...rest } = existing;
    return await ctx.db.insert("ingredients", { ...rest, name: `${rest.name} (copia)` });
  },
});

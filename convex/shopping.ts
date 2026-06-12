import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getListWithItems = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) return null;
    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    return { ...list, items };
  },
});

export const createList = mutation({
  args: {
    name: v.string(),
    weekId: v.optional(v.id("weeks")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    return await ctx.db.insert("shoppingLists", {
      userId,
      name: args.name,
      weekId: args.weekId,
      notes: args.notes,
    });
  },
});

export const deleteList = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const list = await ctx.db.get(args.id);
    if (!list || list.userId !== userId) throw new Error("Non autorizzato");
    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(args.id);
  },
});

export const addItem = mutation({
  args: {
    listId: v.id("shoppingLists"),
    ingredientId: v.optional(v.id("ingredients")),
    name: v.string(),
    quantity: v.string(),
    brand: v.optional(v.string()),
    nutritionNotes: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("Non autorizzato");
    return await ctx.db.insert("shoppingItems", { ...args, checked: false });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("shoppingItems"),
    name: v.string(),
    quantity: v.string(),
    brand: v.optional(v.string()),
    nutritionNotes: v.optional(v.string()),
    category: v.optional(v.string()),
    checked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const toggleItem = mutation({
  args: { id: v.id("shoppingItems"), checked: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    await ctx.db.patch(args.id, { checked: args.checked });
  },
});

export const deleteItem = mutation({
  args: { id: v.id("shoppingItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    await ctx.db.delete(args.id);
  },
});

export const generateFromWeek = mutation({
  args: {
    weekId: v.id("weeks"),
    listName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autenticato");
    const week = await ctx.db.get(args.weekId);
    if (!week || week.userId !== userId) throw new Error("Non autorizzato");

    // Collect all ingredients from the week
    const weekDays = await ctx.db
      .query("weekDays")
      .withIndex("by_week", (q) => q.eq("weekId", args.weekId))
      .collect();

    // Map: ingredientId -> { name, totalGrams, category }
    const ingredientMap: Record<string, { name: string; totalGrams: number; category: string; brand?: string; notes?: string }> = {};

    for (const wd of weekDays) {
      if (wd.customSlots && wd.customSlots.length > 0) {
        for (const slot of wd.customSlots) {
          for (const item of slot.items) {
            const ing = await ctx.db.get(item.ingredientId);
            if (!ing) continue;
            const key = item.ingredientId;
            if (ingredientMap[key]) {
              ingredientMap[key].totalGrams += item.weightGrams;
            } else {
              ingredientMap[key] = {
                name: ing.name,
                totalGrams: item.weightGrams,
                category: ing.category,
                brand: ing.brand,
                notes: ing.notes,
              };
            }
          }
        }
        continue;
      }
      const slots = await ctx.db
        .query("dayMealSlots")
        .withIndex("by_day", (q) => q.eq("dayId", wd.dayId))
        .collect();
      for (const slot of slots) {
        const items = slot.overrideItems
          ? slot.overrideItems
          : await ctx.db
            .query("mealItems")
            .withIndex("by_meal", (q) => q.eq("mealId", slot.mealId))
            .collect();
        for (const item of items) {
          const ing = await ctx.db.get(item.ingredientId);
          if (!ing) continue;
          const key = item.ingredientId;
          if (ingredientMap[key]) {
            ingredientMap[key].totalGrams += item.weightGrams;
          } else {
            ingredientMap[key] = {
              name: ing.name,
              totalGrams: item.weightGrams,
              category: ing.category,
              brand: ing.brand,
              notes: ing.notes,
            };
          }
        }
      }
    }

    // Create the list
    const listId = await ctx.db.insert("shoppingLists", {
      userId,
      weekId: args.weekId,
      name: args.listName,
    });

    // Insert items
    for (const [ingId, data] of Object.entries(ingredientMap)) {
      await ctx.db.insert("shoppingItems", {
        listId,
        ingredientId: ingId as any,
        name: data.name,
        quantity: `${Math.ceil(data.totalGrams)}g`,
        category: data.category,
        brand: data.brand,
        nutritionNotes: data.notes,
        checked: false,
      });
    }

    return listId;
  },
});

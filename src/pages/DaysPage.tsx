import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MACRO_BG, MacroCategory, MealType } from "../types";
import { MacroBadge } from "../components/MacroBadge";
import { IngredientPicker } from "../components/IngredientPicker";
import { DayPrintView } from "../components/DayPrintView";
import { Plus, Pencil, Trash2, X, Printer, ChevronDown, ChevronUp, Copy, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";

type DaySlotForm = {
  mealId: Id<"meals"> | "";
  mealType: MealType;
  order: number;
  mealName?: string;
  overrideItems?: {
    ingredientId: Id<"ingredients"> | "";
    weightGrams: string;
  }[];
};

type DayForm = {
  name: string;
  notes: string;
  slots: DaySlotForm[];
};

const emptyForm = (): DayForm => ({
  name: "",
  notes: "",
  slots: [],
});

type SortOption = "name_asc" | "name_desc" | "kcal_asc" | "kcal_desc" | "newest";

function calcItemProt(item: any): number {
  if (item.ingredient?.proteinsPer100g == null) return 0;
  return (item.ingredient.proteinsPer100g * item.weightGrams) / 100;
}

export function DaysPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"days"> | null>(null);
  const [form, setForm] = useState<DayForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<Id<"days"> | null>(null);
  const [printDayId, setPrintDayId] = useState<Id<"days"> | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const days = useQuery(api.days.list);
  const meals = useQuery(api.meals.list);
  const ingredients = useQuery(api.ingredients.list, {});
  const expandedDay = useQuery(api.days.getWithMeals, expandedId ? { dayId: expandedId } : "skip");
  const printDay = useQuery(api.days.getWithMeals, printDayId ? { dayId: printDayId } : "skip");
  const selectedMealIdsForForm = form.slots
    .map((slot) => slot.mealId)
    .filter((mealId): mealId is Id<"meals"> => Boolean(mealId));
  const selectedMealsWithItems = useQuery(
    api.meals.getManyWithItems,
    selectedMealIdsForForm.length > 0 ? { mealIds: selectedMealIdsForForm } : "skip"
  );
  const createDay = useMutation(api.days.create);
  const updateDay = useMutation(api.days.update);
  const removeDay = useMutation(api.days.remove);
  const duplicateDay = useMutation(api.days.duplicate);

  const sortedDays = [...(days ?? [])]
    .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "it");
      if (sortBy === "name_desc") return b.name.localeCompare(a.name, "it");
      if (sortBy === "kcal_asc") return a.totalKcal - b.totalKcal;
      if (sortBy === "kcal_desc") return b.totalKcal - a.totalKcal;
      return b._creationTime - a._creationTime;
    });

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(day: any) {
    setExpandedId(day._id);
    setEditId(day._id);
    setForm({ name: day.name, notes: day.notes ?? "", slots: [] });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSlots = form.slots.filter((s) => s.mealId);
    const mealSlots = validSlots.map((s, i) => ({
      mealId: s.mealId as Id<"meals">,
      mealType: s.mealType,
      order: i,
      ...(s.mealName?.trim() ? { mealName: s.mealName.trim() } : {}),
      overrideItems: s.overrideItems
        ?.filter((item) => item.ingredientId && item.weightGrams && parseFloat(item.weightGrams) > 0)
        .map((item) => {
          const ing = (ingredients ?? []).find((x) => x._id === item.ingredientId);
          const grams = parseFloat(item.weightGrams);
          const kcal = ing ? (ing.kcalPer100g * grams) / 100 : 0;
          return {
            ingredientId: item.ingredientId as Id<"ingredients">,
            weightGrams: grams,
            kcal,
          };
        }),
    }));
    try {
      if (editId) {
        await updateDay({ id: editId, name: form.name, notes: form.notes || undefined, mealSlots });
        toast.success("Giornata aggiornata");
      } else {
        await createDay({ name: form.name, notes: form.notes || undefined, mealSlots });
        toast.success("Giornata creata");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: Id<"days">) {
    if (!confirm("Eliminare questa giornata?")) return;
    try {
      await removeDay({ id });
      toast.success("Giornata eliminata");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDuplicate(id: Id<"days">) {
    try {
      await duplicateDay({ id });
      toast.success("Giornata duplicata");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function addSlot() {
    const order = form.slots.length;
    setForm({ ...form, slots: [...form.slots, { mealId: "", mealType: "colazione", order }] });
  }

  function removeSlot(idx: number) {
    setForm({ ...form, slots: form.slots.filter((_, i) => i !== idx) });
  }

  function updateSlot(idx: number, field: keyof DaySlotForm, value: any) {
    const slots = [...form.slots];
    if (field === "mealId" && value) {
      const meal = (meals ?? []).find((m) => m._id === value);
      slots[idx] = { ...slots[idx], mealId: value, mealType: meal?.mealType as MealType ?? slots[idx].mealType, overrideItems: undefined, mealName: undefined };
    } else {
      slots[idx] = { ...slots[idx], [field]: value };
    }
    setForm({ ...form, slots });
  }

  const totalKcal = form.slots.reduce((sum, slot) => {
    if (slot.overrideItems && slot.overrideItems.length > 0) {
      const slotKcal = slot.overrideItems.reduce((slotSum, item) => {
        if (!item.ingredientId || !item.weightGrams) return slotSum;
        const ing = (ingredients ?? []).find((i) => i._id === item.ingredientId);
        if (!ing) return slotSum;
        return slotSum + (ing.kcalPer100g * parseFloat(item.weightGrams)) / 100;
      }, 0);
      return sum + slotKcal;
    }
    if (!slot.mealId) return sum;
    const meal = (meals ?? []).find((m) => m._id === slot.mealId);
    return sum + (meal?.totalKcal ?? 0);
  }, 0);

  const SORT_LABELS: Record<SortOption, string> = {
    newest: "Più recenti",
    name_asc: "Nome A→Z",
    name_desc: "Nome Z→A",
    kcal_asc: "Kcal ↑",
    kcal_desc: "Kcal ↓",
  };

  return (
    <div>
      {printDayId && printDay && (
        <DayPrintView day={printDay} onClose={() => setPrintDayId(null)} />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Giornate Alimentari</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nuova Giornata
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca giornata..."
            className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-52"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 shrink-0">Ordina:</span>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${sortBy === opt ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
              >
                {SORT_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedDays.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
            {search ? "Nessuna giornata trovata" : "Nessuna giornata alimentare creata"}
          </div>
        )}
        {sortedDays.map((day) => (
          <div key={day._id} className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <div className="font-semibold text-gray-800">{day.name}</div>
                  {day.notes && <div className="text-xs text-gray-500">{day.notes}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-700 text-sm">{Math.round(day.totalKcal)} kcal</span>
                <button
                  onClick={() => setPrintDayId(day._id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Stampa A4 Verticale"
                >
                  <Printer size={15} />
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === day._id ? null : day._id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  {expandedId === day._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => openEdit(day)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDuplicate(day._id)}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                  title="Duplica"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleDelete(day._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expandedId === day._id && expandedDay && expandedDay._id === day._id && (
              <div className="border-t bg-gray-50 px-4 py-3">
                <div className="space-y-3">
                  {(expandedDay.slots as any[]).map((slot: any) => {
                    const slotProt = Math.round(
                      (slot.meal?.items ?? []).reduce((s: number, it: any) => s + calcItemProt(it), 0)
                    );
                    return (
                      <div key={slot._id} className="bg-white rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{MEAL_TYPE_ICONS[slot.mealType as MealType]}</span>
                          <span className="text-xs text-gray-500 font-medium">{MEAL_TYPE_LABELS[slot.mealType as MealType]}</span>
                          <span className="font-semibold text-gray-700 text-sm">{slot.meal?.name}</span>
                          <span className="ml-auto flex items-center gap-2">
                            <span className="font-bold text-blue-600 text-xs">{slotProt}g prot.</span>
                            <span className="font-bold text-emerald-700 text-sm">{Math.round(slot.meal?.totalKcal ?? 0)} kcal</span>
                          </span>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b">
                              <th className="text-left pb-1 font-medium">Ingrediente</th>
                              <th className="text-right pb-1 font-medium">Peso</th>
                              <th className="text-right pb-1 font-medium">Prot.</th>
                              <th className="text-right pb-1 font-medium">Kcal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slot.meal?.items?.map((item: any) => {
                              const prot = item.ingredient?.proteinsPer100g != null
                                ? Math.round(calcItemProt(item))
                                : null;
                              return (
                                <tr key={item._id} className="border-b last:border-0">
                                  <td className="py-0.5">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs ${MACRO_BG[item.ingredient?.category as MacroCategory] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                      {item.ingredient && <MacroBadge category={item.ingredient.category as MacroCategory} />}
                                      {item.ingredient?.name}
                                      {item.ingredient?.brand && <span className="opacity-60">({item.ingredient.brand})</span>}
                                    </span>
                                  </td>
                                  <td className="py-0.5 text-right text-gray-600 whitespace-nowrap">{item.weightGrams}g</td>
                                  <td className="py-0.5 text-right font-semibold text-blue-600 whitespace-nowrap">{prot != null ? `${prot}g` : "—"}</td>
                                  <td className="py-0.5 text-right font-semibold text-emerald-700 whitespace-nowrap">{Math.round(item.kcal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                  <div className="text-right font-bold text-sm pt-1 flex items-center justify-end gap-3">
                    <span className="text-blue-600">
                      Prot. totali: {Math.round(
                        (expandedDay.slots as any[]).reduce((s: number, slot: any) =>
                          s + (slot.meal?.items ?? []).reduce((ss: number, it: any) => ss + calcItemProt(it), 0), 0)
                      )}g
                    </span>
                    <span className="text-emerald-700">
                      Totale giornata: {Math.round(day.totalKcal)} kcal
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <DayFormModal
          form={form}
          setForm={setForm}
          editId={editId}
          meals={meals ?? []}
          totalKcal={totalKcal}
          ingredients={ingredients ?? []}
          selectedMealsWithItems={selectedMealsWithItems ?? []}
          addSlot={addSlot}
          removeSlot={removeSlot}
          updateSlot={updateSlot}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          expandedDay={editId && expandedDay?._id === editId ? expandedDay : null}
        />
      )}
    </div>
  );
}

function MealPicker({ value, onChange, meals }: {
  value: string;
  onChange: (id: string) => void;
  meals: any[];
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const sorted = [...meals].sort((a, b) => a.name.localeCompare(b.name, "it"));
  const filtered = search
    ? sorted.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const selected = meals.find((m) => m._id === value);

  if (selected) {
    return (
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-emerald-50 border-emerald-200">
        <span className="text-sm">{MEAL_TYPE_ICONS[selected.mealType as MealType]}</span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800">{selected.name}</span>
          <span className="text-xs text-gray-500 ml-1">({Math.round(selected.totalKcal)} kcal)</span>
          {selected.notes && <span className="text-xs text-gray-400 italic block truncate">{selected.notes}</span>}
        </span>
        <button type="button" onClick={() => onChange("")} className="text-gray-400 hover:text-red-500">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cerca pasto..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 50).map((m: any) => (
            <button
              key={m._id}
              type="button"
              onMouseDown={() => { onChange(m._id); setSearch(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 flex items-start gap-2"
            >
              <span className="mt-0.5">{MEAL_TYPE_ICONS[m.mealType as MealType]}</span>
              <span className="flex-1 min-w-0">
                <span className="font-medium text-gray-800 block">{m.name}</span>
                {m.notes && <span className="text-xs text-gray-400 italic block truncate">{m.notes}</span>}
              </span>
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">{Math.round(m.totalKcal)} kcal</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">Nessun risultato</p>
          )}
        </div>
      )}
    </div>
  );
}

function DayFormModal({ form, setForm, editId, meals, ingredients, selectedMealsWithItems, totalKcal, addSlot, removeSlot, updateSlot, onSubmit, onClose, expandedDay }: any) {
  const [initialized, setInitialized] = useState(false);
  const mealsWithItemsMap = new Map((selectedMealsWithItems as any[]).map((meal) => [meal._id, meal]));
  if (editId && expandedDay && !initialized) {
    setInitialized(true);
    setForm((f: DayForm) => ({
      ...f,
      slots: (expandedDay.slots as any[]).map((slot: any, i: number) => ({
        mealId: slot.mealId,
        mealType: slot.mealType,
        order: i,
        mealName: slot.mealName,
        overrideItems: slot.overrideItems?.map((item: any) => ({
          ingredientId: item.ingredientId,
          weightGrams: String(item.weightGrams),
        })),
      })),
    }));
  }

  function getEffectiveItems(slot: DaySlotForm) {
    if (slot.overrideItems && slot.overrideItems.length > 0) return slot.overrideItems;
    if (!slot.mealId) return [];
    const meal = mealsWithItemsMap.get(slot.mealId);
    return (meal?.items ?? []).map((item: any) => ({ ingredientId: item.ingredientId, weightGrams: String(item.weightGrams) }));
  }

  function enableOverride(idx: number) {
    const slots = [...form.slots];
    const base = getEffectiveItems(slots[idx]);
    const meal = mealsWithItemsMap.get(slots[idx].mealId) ?? (meals as any[]).find((m: any) => m._id === slots[idx].mealId);
    slots[idx] = {
      ...slots[idx],
      mealName: slots[idx].mealName ?? meal?.name ?? "",
      overrideItems: base.length > 0 ? base : [{ ingredientId: "", weightGrams: "" }],
    };
    setForm({ ...form, slots });
  }

  function clearOverride(idx: number) {
    const slots = [...form.slots];
    slots[idx] = { ...slots[idx], overrideItems: undefined, mealName: undefined };
    setForm({ ...form, slots });
  }

  function updateOverrideName(idx: number, name: string) {
    const slots = [...form.slots];
    slots[idx] = { ...slots[idx], mealName: name };
    setForm({ ...form, slots });
  }

  function updateOverrideItem(slotIdx: number, itemIdx: number, field: "ingredientId" | "weightGrams", value: string) {
    const slots = [...form.slots];
    const current = [...(slots[slotIdx].overrideItems ?? [])];
    current[itemIdx] = { ...current[itemIdx], [field]: value };
    slots[slotIdx] = { ...slots[slotIdx], overrideItems: current };
    setForm({ ...form, slots });
  }

  function addOverrideItem(slotIdx: number) {
    const slots = [...form.slots];
    const current = [...(slots[slotIdx].overrideItems ?? [])];
    current.push({ ingredientId: "", weightGrams: "" });
    slots[slotIdx] = { ...slots[slotIdx], overrideItems: current };
    setForm({ ...form, slots });
  }

  function removeOverrideItem(slotIdx: number, itemIdx: number) {
    const slots = [...form.slots];
    const current = [...(slots[slotIdx].overrideItems ?? [])].filter((_: any, i: number) => i !== itemIdx);
    slots[slotIdx] = { ...slots[slotIdx], overrideItems: current.length > 0 ? current : [{ ingredientId: "", weightGrams: "" }] };
    setForm({ ...form, slots });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-800">{editId ? "Modifica Giornata" : "Nuova Giornata"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome giornata *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="es. Giornata tipo A"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Pasti della giornata</label>
              <button
                type="button"
                onClick={addSlot}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <Plus size={13} /> Aggiungi pasto
              </button>
            </div>
            <div className="space-y-2">
              {form.slots.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4 border rounded-lg">
                  Nessun pasto aggiunto. Clicca "Aggiungi pasto".
                </p>
              )}
              {form.slots.map((slot: DaySlotForm, idx: number) => (
                <div key={idx} className="border rounded-lg p-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <MealPicker value={slot.mealId} onChange={(id) => updateSlot(idx, "mealId", id)} meals={meals} />
                    </div>
                    <button type="button" onClick={() => removeSlot(idx)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                      <X size={14} />
                    </button>
                  </div>
                  {slot.mealId && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Ingredienti nel contesto giornata</span>
                        {slot.overrideItems ? (
                          <button type="button" onClick={() => clearOverride(idx)} className="text-xs text-gray-500 hover:text-gray-700 underline">
                            Usa originale
                          </button>
                        ) : (
                          <button type="button" onClick={() => enableOverride(idx)} className="text-xs text-emerald-600 hover:text-emerald-700 underline">
                            Personalizza
                          </button>
                        )}
                      </div>
                      {slot.overrideItems && (
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-xs text-gray-500">Nome pasto (solo in questa giornata)</label>
                            <input
                              type="text"
                              value={slot.mealName ?? ""}
                              onChange={(e) => updateOverrideName(idx, e.target.value)}
                              className="w-full mt-0.5 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
                              placeholder="Nome del pasto"
                            />
                          </div>
                          {slot.overrideItems.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex gap-2 items-center">
                              <div className="flex-1">
                                <IngredientPicker size="sm" value={item.ingredientId} onChange={(id) => updateOverrideItem(idx, itemIdx, "ingredientId", id)} ingredients={ingredients} />
                              </div>
                              <input type="number" min="1" step="1" value={item.weightGrams} onChange={(e) => updateOverrideItem(idx, itemIdx, "weightGrams", e.target.value)} className="w-24 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="grammi" />
                              <button type="button" onClick={() => removeOverrideItem(idx, itemIdx)} className="p-1 text-gray-400 hover:text-red-500"><X size={12} /></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => addOverrideItem(idx)} className="text-xs text-emerald-600 hover:text-emerald-700">+ Aggiungi ingrediente</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 text-right font-bold text-emerald-700">
              Totale: {Math.round(totalKcal)} kcal
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annulla
            </button>
            <button type="submit"
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700">
              {editId ? "Salva" : "Crea Giornata"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

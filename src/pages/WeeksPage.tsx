import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { DAY_NAMES, MealType, MEAL_TYPE_ICONS } from "../types";
import { WeekPrintView } from "../components/WeekPrintView";
import { IngredientPicker } from "../components/IngredientPicker";
import { moveArrayItem, ReorderButtons } from "../components/ReorderButtons";
import { Plus, Pencil, Trash2, X, Printer, ChevronDown, ChevronUp, ShoppingCart, Copy, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";

type WeekDayForm = {
  dayId: Id<"days"> | "";
  dayOfWeek: number;
  customDayName?: string;
  customSlots?: {
    mealId: Id<"meals">;
    mealType: MealType;
    order: number;
    mealName?: string;
    items: {
      ingredientId: Id<"ingredients"> | "";
      weightGrams: string;
    }[];
  }[];
};

type WeekForm = {
  name: string;
  notes: string;
  weekDays: WeekDayForm[];
};

const emptyForm = (): WeekForm => ({
  name: "",
  notes: "",
  weekDays: Array.from({ length: 7 }, (_, i) => ({ dayId: "", dayOfWeek: i })),
});

type SortOption = "newest" | "name_asc" | "name_desc";

export function WeeksPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"weeks"> | null>(null);
  const [form, setForm] = useState<WeekForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<Id<"weeks"> | null>(null);
  const [printWeekId, setPrintWeekId] = useState<Id<"weeks"> | null>(null);
  const [generatingShoppingFor, setGeneratingShoppingFor] = useState<Id<"weeks"> | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const weeks = useQuery(api.weeks.list);
  const days = useQuery(api.days.list);
  const ingredients = useQuery(api.ingredients.list, {});
  const expandedWeek = useQuery(api.weeks.getWithDays, expandedId ? { weekId: expandedId } : "skip");
  const printWeek = useQuery(api.weeks.getWithDays, printWeekId ? { weekId: printWeekId } : "skip");
  const selectedDayIds = form.weekDays
    .map((wd) => wd.dayId)
    .filter((dayId): dayId is Id<"days"> => Boolean(dayId));
  const selectedDaysWithMeals = useQuery(
    api.days.getManyWithMeals,
    selectedDayIds.length > 0 ? { dayIds: selectedDayIds } : "skip"
  );
  const createWeek = useMutation(api.weeks.create);
  const updateWeek = useMutation(api.weeks.update);
  const removeWeek = useMutation(api.weeks.remove);
  const duplicateWeek = useMutation(api.weeks.duplicate);
  const generateShopping = useMutation(api.shopping.generateFromWeek);

  const sortedWeeks = [...(weeks ?? [])]
    .filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "it");
      if (sortBy === "name_desc") return b.name.localeCompare(a.name, "it");
      return b._creationTime - a._creationTime;
    });

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(week: any) {
    setExpandedId(week._id);
    setEditId(week._id);
    setShowForm(true);
    setForm({ name: week.name, notes: week.notes ?? "", weekDays: Array.from({ length: 7 }, (_, i) => ({ dayId: "", dayOfWeek: i })) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validDays = form.weekDays.filter((wd) => wd.dayId);
    const weekDays = validDays.map((wd) => ({
      dayId: wd.dayId as Id<"days">,
      dayOfWeek: wd.dayOfWeek,
      ...(wd.customDayName?.trim() ? { customDayName: wd.customDayName.trim() } : {}),
      customSlots: wd.customSlots
        ?.map((slot) => {
          const mappedItems = slot.items
            .filter((item) => item.ingredientId && item.weightGrams && parseFloat(item.weightGrams) > 0)
            .map((item) => {
              const ing = (ingredients ?? []).find((i) => i._id === item.ingredientId);
              const grams = parseFloat(item.weightGrams);
              return {
                ingredientId: item.ingredientId as Id<"ingredients">,
                weightGrams: grams,
                kcal: ing ? (ing.kcalPer100g * grams) / 100 : 0,
              };
            });
          return {
            mealId: slot.mealId,
            mealType: slot.mealType,
            order: slot.order,
            mealName: slot.mealName,
            totalKcal: mappedItems.reduce((sum, item) => sum + item.kcal, 0),
            items: mappedItems,
          };
        })
        .filter((slot) => slot.items.length > 0),
    }));
    try {
      if (editId) {
        await updateWeek({ id: editId, name: form.name, notes: form.notes || undefined, weekDays });
        toast.success("Settimana aggiornata");
      } else {
        await createWeek({ name: form.name, notes: form.notes || undefined, weekDays });
        toast.success("Settimana creata");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: Id<"weeks">) {
    if (!confirm("Eliminare questa settimana?")) return;
    try {
      await removeWeek({ id });
      toast.success("Settimana eliminata");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDuplicate(id: Id<"weeks">) {
    try {
      await duplicateWeek({ id });
      toast.success("Settimana duplicata");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleGenerateShopping(weekId: Id<"weeks">, weekName: string) {
    setGeneratingShoppingFor(weekId);
    try {
      await generateShopping({ weekId, listName: `Lista spesa – ${weekName}` });
      toast.success("Lista della spesa generata! Vai nella sezione Lista Spesa.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGeneratingShoppingFor(null);
    }
  }

  function updateDayForWeekday(dayOfWeek: number, dayId: string) {
    setForm((f) => ({
      ...f,
      weekDays: f.weekDays.map((wd) =>
        wd.dayOfWeek === dayOfWeek ? { ...wd, dayId: dayId as Id<"days"> | "", customSlots: undefined, customDayName: undefined } : wd
      ),
    }));
  }

  const editWeekData = useQuery(api.weeks.getWithDays, editId && showForm ? { weekId: editId } : "skip");

  const SORT_LABELS: Record<SortOption, string> = {
    newest: "Più recenti",
    name_asc: "Nome A→Z",
    name_desc: "Nome Z→A",
  };

  return (
    <div>
      {printWeekId && printWeek && (
        <WeekPrintView week={printWeek} onClose={() => setPrintWeekId(null)} />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Settimane Alimentari</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nuova Settimana
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca settimana..."
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
        {sortedWeeks.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
            {search ? "Nessuna settimana trovata" : "Nessuna settimana alimentare creata"}
          </div>
        )}
        {sortedWeeks.map((week) => (
          <div key={week._id} className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📆</span>
                <div>
                  <div className="font-semibold text-gray-800">{week.name}</div>
                  {week.notes && <div className="text-xs text-gray-500">{week.notes}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateShopping(week._id, week.name)}
                  disabled={generatingShoppingFor === week._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  title="Genera lista della spesa"
                >
                  <ShoppingCart size={13} />
                  {generatingShoppingFor === week._id ? "..." : "Lista Spesa"}
                </button>
                <button
                  onClick={() => setPrintWeekId(week._id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Stampa A4 Orizzontale"
                >
                  <Printer size={15} />
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === week._id ? null : week._id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  {expandedId === week._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => openEdit(week)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDuplicate(week._id)}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                  title="Duplica"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleDelete(week._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expandedId === week._id && expandedWeek && expandedWeek._id === week._id && (
              <div className="border-t bg-gray-50 px-4 py-3">
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const wd = (expandedWeek.days as any[]).find((d: any) => d.dayOfWeek === i);
                    return (
                      <div key={i} className="bg-white rounded-lg border overflow-hidden">
                        <div className="bg-gray-700 text-white text-center py-1.5 px-1">
                          <div className="text-xs font-bold">{DAY_NAMES[i].slice(0, 3)}</div>
                        </div>
                        {wd ? (
                          <div className="p-2">
                            <div className="text-xs font-semibold text-gray-700 mb-1 truncate">{wd.day?.name}</div>
                            {(() => {
                              const totalProt = (wd.day?.slots ?? []).reduce((acc: number, slot: any) =>
                                acc + (slot.meal?.items ?? []).reduce((a: number, item: any) =>
                                  a + ((item.ingredient?.proteinsPer100g ?? 0) * item.weightGrams / 100), 0), 0);
                              return (
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span className="text-xs font-bold text-emerald-700">{Math.round(wd.day?.totalKcal ?? 0)} kcal</span>
                                  {totalProt > 0 && <span className="text-xs font-semibold text-blue-600">{Math.round(totalProt)}g prot.</span>}
                                </div>
                              );
                            })()}
                            <div className="space-y-0.5">
                              {(wd.day?.slots ?? []).map((slot: any) => (
                                <div key={slot._id} className="flex items-center gap-1">
                                  <span className="text-xs">{MEAL_TYPE_ICONS[slot.mealType as MealType]}</span>
                                  <span className="text-xs text-gray-600 truncate">{slot.meal?.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 text-center text-xs text-gray-300">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <WeekFormModal
          form={form}
          setForm={setForm}
          editId={editId}
          days={days ?? []}
          ingredients={ingredients ?? []}
          editWeekData={editId ? editWeekData : null}
          selectedDaysWithMeals={selectedDaysWithMeals ?? []}
          updateDayForWeekday={updateDayForWeekday}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function getEffectiveDayKcal(wd: WeekDayForm | undefined, assignedDay: any, selectedDaysWithMeals: any[], ingredients: any[]): number {
  if (!wd?.dayId) return 0;
  if (wd.customSlots && wd.customSlots.length > 0) {
    return wd.customSlots.reduce((daySum, slot) => {
      const slotKcal = slot.items
        .filter((item) => item.ingredientId && item.weightGrams && parseFloat(item.weightGrams) > 0)
        .reduce((sum, item) => {
          const ing = ingredients.find((i) => i._id === item.ingredientId);
          const grams = parseFloat(item.weightGrams);
          return sum + (ing ? (ing.kcalPer100g * grams) / 100 : 0);
        }, 0);
      return daySum + slotKcal;
    }, 0);
  }
  const dayWithMeals = selectedDaysWithMeals.find((d) => d._id === wd.dayId);
  return dayWithMeals?.totalKcal ?? assignedDay?.totalKcal ?? 0;
}

function WeekFormModal({ form, setForm, editId, days, ingredients, editWeekData, selectedDaysWithMeals, updateDayForWeekday, onSubmit, onClose }: any) {
  const [initialized, setInitialized] = useState(false);
  const [customizingDayOfWeek, setCustomizingDayOfWeek] = useState<number | null>(null);

  function swapWeekDays(dayOfWeekA: number, dayOfWeekB: number) {
    setForm((f: WeekForm) => {
      const a = f.weekDays.find((wd) => wd.dayOfWeek === dayOfWeekA);
      const b = f.weekDays.find((wd) => wd.dayOfWeek === dayOfWeekB);
      if (!a || !b) return f;
      return {
        ...f,
        weekDays: f.weekDays.map((wd) => {
          if (wd.dayOfWeek === dayOfWeekA) {
            return { ...wd, dayId: b.dayId, customDayName: b.customDayName, customSlots: b.customSlots };
          }
          if (wd.dayOfWeek === dayOfWeekB) {
            return { ...wd, dayId: a.dayId, customDayName: a.customDayName, customSlots: a.customSlots };
          }
          return wd;
        }),
      };
    });
  }

  function moveWeekDay(dayOfWeek: number, dir: -1 | 1) {
    const target = dayOfWeek + dir;
    if (target < 0 || target > 6) return;
    swapWeekDays(dayOfWeek, target);
  }
  if (editId && editWeekData && !initialized) {
    setInitialized(true);
    setForm((f: WeekForm) => ({
      ...f,
      name: editWeekData.name,
      notes: editWeekData.notes ?? "",
      weekDays: Array.from({ length: 7 }, (_, i) => {
        const found = (editWeekData.days as any[]).find((d: any) => d.dayOfWeek === i);
        const originalDay = found?.dayId ? (days as any[]).find((d: any) => d._id === found.dayId) : null;
        const effectiveDayName = found?.day?.name;
        const customDayName = found?.customDayName
          ?? (originalDay && effectiveDayName && effectiveDayName !== originalDay.name ? effectiveDayName : undefined);
        return {
          dayId: found ? found.dayId : "",
          dayOfWeek: i,
          customDayName,
          customSlots: found?.customSlots?.map((slot: any) => ({
            mealId: slot.mealId,
            mealType: slot.mealType,
            order: slot.order,
            mealName: slot.mealName,
            items: (slot.items ?? []).map((item: any) => ({
              ingredientId: item.ingredientId,
              weightGrams: String(item.weightGrams),
            })),
          })),
        };
      }),
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-800">{editId ? "Modifica Settimana" : "Nuova Settimana"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome settimana *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                placeholder="es. Settimana tipo A"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assegna una giornata per ogni giorno
              <span className="text-xs text-gray-400 font-normal ml-2">(usa ↑↓ per scambiare le assegnazioni)</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const wd = form.weekDays.find((w: WeekDayForm) => w.dayOfWeek === i);
                const assignedDay = wd?.dayId ? (days as any[]).find((d: any) => d._id === wd.dayId) : null;
                const effectiveDayName = wd?.customDayName ?? assignedDay?.name;
                const hasCustomName = Boolean(wd?.customDayName && wd.customDayName !== assignedDay?.name);
                const effectiveDayKcal = getEffectiveDayKcal(wd, assignedDay, selectedDaysWithMeals ?? [], ingredients ?? []);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <ReorderButtons idx={i} total={7} onMove={(dir) => moveWeekDay(i, dir)} />
                      <div className="w-20 shrink-0">
                        <span className="text-sm font-semibold text-gray-700">{DAY_NAMES[i]}</span>
                      </div>
                      <select
                        value={wd?.dayId ?? ""}
                        onChange={(e) => updateDayForWeekday(i, e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      >
                        <option value="">— Nessuna giornata —</option>
                        {days.map((d: any) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({Math.round(d.totalKcal)} kcal)
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!wd?.dayId}
                        onClick={() => setCustomizingDayOfWeek(i)}
                        className="px-3 py-2 text-xs font-medium border rounded-lg text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40"
                      >
                        Personalizza
                      </button>
                    </div>
                    {wd?.dayId && effectiveDayName && (
                      <div className="ml-[4.5rem] text-xs text-gray-500">
                        Nome in questa settimana:{" "}
                        <span className={`font-medium ${hasCustomName ? "text-emerald-700" : "text-gray-700"}`}>
                          {effectiveDayName}
                        </span>
                        <span className="font-medium text-emerald-600"> ({Math.round(effectiveDayKcal)} kcal)</span>
                        {hasCustomName && assignedDay?.name && (
                          <span className="text-gray-400"> · originale: {assignedDay.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
              {editId ? "Salva" : "Crea Settimana"}
            </button>
          </div>
        </form>
      </div>
      {customizingDayOfWeek !== null && (
        <WeekDayCustomizeModal
          dayOfWeek={customizingDayOfWeek}
          form={form}
          setForm={setForm}
          selectedDaysWithMeals={selectedDaysWithMeals}
          ingredients={ingredients}
          onClose={() => setCustomizingDayOfWeek(null)}
        />
      )}
    </div>
  );
}

function buildInitialSlots(wd: WeekDayForm | undefined, selectedDay: any) {
  if (wd?.customSlots && wd.customSlots.length > 0) return wd.customSlots;
  return (selectedDay.slots ?? []).map((slot: any) => ({
    mealId: slot.mealId,
    mealType: slot.mealType,
    order: slot.order,
    mealName: slot.meal?.name,
    items: (slot.meal?.items ?? []).map((item: any) => ({
      ingredientId: item.ingredientId,
      weightGrams: String(item.weightGrams),
    })),
  }));
}

function WeekDayCustomizeModal({ dayOfWeek, form, setForm, selectedDaysWithMeals, ingredients, onClose }: any) {
  const wd = form.weekDays.find((x: WeekDayForm) => x.dayOfWeek === dayOfWeek);
  const selectedDay = (selectedDaysWithMeals as any[]).find((d: any) => d._id === wd?.dayId);
  const [slots, setSlots] = useState<any[]>([]);
  const [customDayName, setCustomDayName] = useState("");

  useEffect(() => {
    if (!selectedDay || !wd?.dayId) return;
    setSlots(buildInitialSlots(wd, selectedDay));
    setCustomDayName(wd?.customDayName ?? selectedDay.name ?? "");
  }, [dayOfWeek, wd?.dayId, wd?.customDayName, selectedDay?._id]);

  function updateMealName(slotIdx: number, name: string) {
    const next = [...slots];
    next[slotIdx] = { ...next[slotIdx], mealName: name };
    setSlots(next);
  }

  function updateItem(slotIdx: number, itemIdx: number, field: "ingredientId" | "weightGrams", value: string) {
    const next = [...slots];
    next[slotIdx].items[itemIdx] = { ...next[slotIdx].items[itemIdx], [field]: value };
    setSlots(next);
  }

  function addItem(slotIdx: number) {
    const next = [...slots];
    next[slotIdx].items.push({ ingredientId: "", weightGrams: "" });
    setSlots(next);
  }

  function removeItem(slotIdx: number, itemIdx: number) {
    const next = [...slots];
    next[slotIdx].items = next[slotIdx].items.filter((_: any, i: number) => i !== itemIdx);
    if (next[slotIdx].items.length === 0) next[slotIdx].items = [{ ingredientId: "", weightGrams: "" }];
    setSlots(next);
  }

  function moveSlot(slotIdx: number, dir: -1 | 1) {
    setSlots((prev) => moveArrayItem(prev, slotIdx, dir).map((s, i) => ({ ...s, order: i })));
  }

  function moveItem(slotIdx: number, itemIdx: number, dir: -1 | 1) {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], items: moveArrayItem(next[slotIdx].items, itemIdx, dir) };
      return next;
    });
  }

  function saveCustomizations() {
    const trimmedName = customDayName.trim();
    setForm((prev: WeekForm) => ({
      ...prev,
      weekDays: prev.weekDays.map((x) => x.dayOfWeek === dayOfWeek ? {
        ...x,
        customDayName: trimmedName || undefined,
        customSlots: slots,
      } : x),
    }));
    onClose();
  }

  function clearCustomizations() {
    setForm((prev: WeekForm) => ({
      ...prev,
      weekDays: prev.weekDays.map((x) => x.dayOfWeek === dayOfWeek ? { ...x, customSlots: undefined, customDayName: undefined } : x),
    }));
    onClose();
  }

  if (!selectedDay) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-lg text-gray-800">Personalizza {DAY_NAMES[dayOfWeek]}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500">Nome giornata (solo in questa settimana)</label>
            <input
              type="text"
              value={customDayName}
              onChange={(e) => setCustomDayName(e.target.value)}
              className="w-full mt-0.5 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="Nome della giornata"
            />
          </div>
          {slots.map((slot, slotIdx) => (
            <div key={`${slot.mealId}_${slotIdx}`} className="border rounded-lg p-3">
              <div className="flex gap-2 items-start">
                {slots.length > 1 && (
                  <div className="pt-1">
                    <ReorderButtons idx={slotIdx} total={slots.length} onMove={(dir) => moveSlot(slotIdx, dir)} />
                  </div>
                )}
                <div className="flex-1">
                  <div className="mb-2">
                    <label className="text-xs text-gray-500">{MEAL_TYPE_ICONS[slot.mealType]} Nome pasto (solo in questa settimana)</label>
                    <input
                      type="text"
                      value={slot.mealName ?? ""}
                      onChange={(e) => updateMealName(slotIdx, e.target.value)}
                      className="w-full mt-0.5 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      placeholder="Nome del pasto"
                    />
                  </div>
                  <div className="space-y-1.5">
                    {(slot.items ?? []).map((item: any, itemIdx: number) => (
                      <div key={itemIdx} className="flex gap-2 items-center">
                        {(slot.items ?? []).length > 1 && (
                          <ReorderButtons idx={itemIdx} total={(slot.items ?? []).length} onMove={(dir) => moveItem(slotIdx, itemIdx, dir)} />
                        )}
                        <div className="flex-1">
                          <IngredientPicker size="sm" value={item.ingredientId} onChange={(id) => updateItem(slotIdx, itemIdx, "ingredientId", id)} ingredients={ingredients} />
                        </div>
                        <input type="number" min="1" step="1" value={item.weightGrams} onChange={(e) => updateItem(slotIdx, itemIdx, "weightGrams", e.target.value)} className="w-24 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="grammi" />
                        <button type="button" onClick={() => removeItem(slotIdx, itemIdx)} className="p-1 text-gray-400 hover:text-red-500"><X size={12} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addItem(slotIdx)} className="text-xs text-emerald-600 hover:text-emerald-700">+ Aggiungi ingrediente</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={clearCustomizations} className="border rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Rimuovi personalizzazioni</button>
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="border rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
            <button type="button" onClick={saveCustomizations} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-emerald-700">Salva personalizzazione</button>
          </div>
        </div>
      </div>
    </div>
  );
}

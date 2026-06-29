import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MacroCategory, MealType, ALL_MEAL_TYPES } from "../types";
import { MacroBadge } from "../components/MacroBadge";
import { IngredientPicker } from "../components/IngredientPicker";
import { MealCollectionPrintView } from "../components/MealCollectionPrintView";
import { moveArrayItem, ReorderButtons } from "../components/ReorderButtons";
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Copy, ArrowUpDown,
  CheckSquare, Square, Printer, Save, ChevronUp as Up, ChevronDown as Down,
  GripVertical, Search,
} from "lucide-react";
import { toast } from "sonner";

const MEAL_TYPES: MealType[] = ALL_MEAL_TYPES;

const MEAL_TYPE_ORDER: Record<MealType, number> = {
  colazione: 0, spuntino_mattina: 1, pranzo: 2,
  spuntino_pomeriggio: 3, cena: 4, pasto: 5, extra: 6,
  attivita_motoria: 7, altro: 8,
};

type SortOption = "type" | "name_asc" | "name_desc" | "kcal_asc" | "kcal_desc";
type TabOption = "list" | "selection" | "collections";

type MealItemForm = {
  ingredientId: Id<"ingredients"> | "";
  weightGrams: string;
};

type MealForm = {
  name: string;
  mealType: MealType;
  notes: string;
  items: MealItemForm[];
};

const emptyForm = (): MealForm => ({
  name: "",
  mealType: "pranzo",
  notes: "",
  items: [{ ingredientId: "", weightGrams: "" }],
});

function calcItemProtFromExpanded(item: any): number {
  if (item.ingredient?.proteinsPer100g == null) return 0;
  return (item.ingredient.proteinsPer100g * item.weightGrams) / 100;
}

export function MealsPage() {
  const [activeTab, setActiveTab] = useState<TabOption>("list");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"meals"> | null>(null);
  const [form, setForm] = useState<MealForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<Id<"meals"> | null>(null);
  const [filterType, setFilterType] = useState<MealType | "">("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("type");

  const [selectedMealOrder, setSelectedMealOrder] = useState<Id<"meals">[]>([]);
  const selectedMealIds = new Set(selectedMealOrder);
  const [selFilterType, setSelFilterType] = useState<MealType | "">("");
  const [selSearch, setSelSearch] = useState("");
  const [selSortBy, setSelSortBy] = useState<SortOption>("type");
  const [showPrint, setShowPrint] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCollectionName, setSaveCollectionName] = useState("");
  const [saveCollectionNotes, setSaveCollectionNotes] = useState("");
  const [editCollectionId, setEditCollectionId] = useState<Id<"mealCollections"> | null>(null);

  const [expandedCollectionId, setExpandedCollectionId] = useState<Id<"mealCollections"> | null>(null);
  const [printCollectionId, setPrintCollectionId] = useState<Id<"mealCollections"> | null>(null);
  const [collectionLocalOrder, setCollectionLocalOrder] = useState<Id<"meals">[] | null>(null);

  const meals = useQuery(api.meals.list);
  const ingredients = useQuery(api.ingredients.list, {});
  const expandedMeal = useQuery(api.meals.getWithItems, expandedId ? { mealId: expandedId } : "skip");
  const collections = useQuery(api.mealCollections.list);
  const expandedCollection = useQuery(api.mealCollections.getWithMeals, expandedCollectionId ? { collectionId: expandedCollectionId } : "skip");
  const printCollection = useQuery(api.mealCollections.getWithMeals, printCollectionId ? { collectionId: printCollectionId } : "skip");

  const createMeal = useMutation(api.meals.create);
  const updateMeal = useMutation(api.meals.update);
  const removeMeal = useMutation(api.meals.remove);
  const duplicateMeal = useMutation(api.meals.duplicate);
  const createCollection = useMutation(api.mealCollections.create);
  const updateCollection = useMutation(api.mealCollections.update);
  const removeCollection = useMutation(api.mealCollections.remove);

  const filtered = [...(meals ?? [])]
    .filter((m) => !filterType || m.mealType === filterType)
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "it");
      if (sortBy === "name_desc") return b.name.localeCompare(a.name, "it");
      if (sortBy === "kcal_asc") return a.totalKcal - b.totalKcal;
      if (sortBy === "kcal_desc") return b.totalKcal - a.totalKcal;
      return MEAL_TYPE_ORDER[a.mealType as MealType] - MEAL_TYPE_ORDER[b.mealType as MealType];
    });

  const selFiltered = [...(meals ?? [])]
    .filter((m) => !selFilterType || m.mealType === selFilterType)
    .filter((m) => !selSearch || m.name.toLowerCase().includes(selSearch.toLowerCase()))
    .sort((a, b) => {
      if (selSortBy === "name_asc") return a.name.localeCompare(b.name, "it");
      if (selSortBy === "name_desc") return b.name.localeCompare(a.name, "it");
      if (selSortBy === "kcal_asc") return a.totalKcal - b.totalKcal;
      if (selSortBy === "kcal_desc") return b.totalKcal - a.totalKcal;
      return MEAL_TYPE_ORDER[a.mealType as MealType] - MEAL_TYPE_ORDER[b.mealType as MealType];
    });

  const selectedMeals = selectedMealOrder
    .map((id) => (meals ?? []).find((m) => m._id === id))
    .filter(Boolean) as typeof meals extends (infer T)[] | undefined ? T[] : never[];
  const selectedTotalKcal = selectedMeals.reduce((s, m) => s + (m as any).totalKcal, 0);

  function toggleSelect(id: Id<"meals">) {
    setSelectedMealOrder((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function selectAll() {
    const existing = new Set(selectedMealOrder);
    const toAdd = selFiltered.map((m) => m._id).filter((id) => !existing.has(id));
    setSelectedMealOrder((prev) => [...prev, ...toAdd]);
  }
  function clearSelection() { setSelectedMealOrder([]); }
  function moveSelectionItem(idx: number, dir: -1 | 1) {
    setSelectedMealOrder((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function removeFromSelection(id: Id<"meals">) {
    setSelectedMealOrder((prev) => prev.filter((x) => x !== id));
  }

  function getCollectionOrder(): Id<"meals">[] {
    if (collectionLocalOrder) return collectionLocalOrder;
    return (expandedCollection?.meals ?? []).map((m: any) => m._id);
  }
  function moveCollectionItem(idx: number, dir: -1 | 1) {
    const order = getCollectionOrder();
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setCollectionLocalOrder(next);
  }
  async function saveCollectionOrder() {
    if (!expandedCollectionId || !collectionLocalOrder) return;
    const col = expandedCollection;
    if (!col) return;
    try {
      await updateCollection({ id: expandedCollectionId, name: col.name, notes: col.notes, mealIds: collectionLocalOrder });
      setCollectionLocalOrder(null);
      toast.success("Ordine salvato");
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleSaveCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!saveCollectionName.trim()) return;
    try {
      if (editCollectionId) {
        await updateCollection({ id: editCollectionId, name: saveCollectionName.trim(), notes: saveCollectionNotes || undefined, mealIds: selectedMealOrder });
        toast.success("Collezione aggiornata");
      } else {
        await createCollection({ name: saveCollectionName.trim(), notes: saveCollectionNotes || undefined, mealIds: selectedMealOrder });
        toast.success("Collezione salvata");
      }
      setShowSaveModal(false); setSaveCollectionName(""); setSaveCollectionNotes(""); setEditCollectionId(null); setActiveTab("collections");
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDeleteCollection(id: Id<"mealCollections">) {
    if (!confirm("Eliminare questa collezione?")) return;
    try {
      await removeCollection({ id });
      if (expandedCollectionId === id) setExpandedCollectionId(null);
      toast.success("Collezione eliminata");
    } catch (err: any) { toast.error(err.message); }
  }

  function calcKcal(item: MealItemForm): number {
    if (!item.ingredientId || !item.weightGrams) return 0;
    const ing = (ingredients ?? []).find((i) => i._id === item.ingredientId);
    if (!ing) return 0;
    return Math.round((ing.kcalPer100g * parseFloat(item.weightGrams)) / 100);
  }
  const totalKcal = form.items.reduce((sum, item) => sum + calcKcal(item), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = form.items.filter((i) => i.ingredientId && i.weightGrams && parseFloat(i.weightGrams) > 0);
    if (validItems.length === 0) { toast.error("Aggiungi almeno un ingrediente"); return; }
    const items = validItems.map((i) => ({ ingredientId: i.ingredientId as Id<"ingredients">, weightGrams: parseFloat(i.weightGrams), kcal: calcKcal(i) }));
    try {
      if (editId) { await updateMeal({ id: editId, name: form.name, mealType: form.mealType, notes: form.notes || undefined, items }); toast.success("Pasto aggiornato"); }
      else { await createMeal({ name: form.name, mealType: form.mealType, notes: form.notes || undefined, items }); toast.success("Pasto creato"); }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete(id: Id<"meals">) {
    if (!confirm("Eliminare questo pasto?")) return;
    try { await removeMeal({ id }); toast.success("Pasto eliminato"); } catch (err: any) { toast.error(err.message); }
  }
  async function handleDuplicate(id: Id<"meals">) {
    try { await duplicateMeal({ id }); toast.success("Pasto duplicato"); } catch (err: any) { toast.error(err.message); }
  }

  function addItem() { setForm({ ...form, items: [...form.items, { ingredientId: "", weightGrams: "" }] }); }
  function removeItem(idx: number) { setForm({ ...form, items: form.items.filter((_, i) => i !== idx) }); }
  function moveItem(idx: number, dir: -1 | 1) {
    setForm((f) => ({ ...f, items: moveArrayItem(f.items, idx, dir) }));
  }
  function updateItem(idx: number, field: keyof MealItemForm, value: string) {
    const items = [...form.items];
    if (field === "ingredientId" && value) {
      const ing = (ingredients ?? []).find((i) => i._id === value);
      const defaultGrams = ing?.portionMedium ? String(ing.portionMedium) : items[idx].weightGrams;
      items[idx] = { ...items[idx], ingredientId: value as Id<"ingredients">, weightGrams: defaultGrams };
    } else { items[idx] = { ...items[idx], [field]: value }; }
    setForm({ ...form, items });
  }
  function openEditWithItems(meal: any) {
    setExpandedId(meal._id); setEditId(meal._id); setShowForm(true);
    setForm({ name: meal.name, mealType: meal.mealType, notes: meal.notes ?? "", items: [{ ingredientId: "", weightGrams: "" }] });
  }

  const SORT_LABELS: Record<SortOption, string> = { type: "Tipo pasto", name_asc: "Nome A→Z", name_desc: "Nome Z→A", kcal_asc: "Kcal ↑", kcal_desc: "Kcal ↓" };

  return (
    <div>
      {printCollectionId && printCollection && (
        <MealCollectionPrintView name={printCollection.name} notes={printCollection.notes} meals={printCollection.meals ?? []} onClose={() => setPrintCollectionId(null)} />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Pasti</h1>
        <button onClick={() => { setForm(emptyForm()); setEditId(null); setShowForm(true); }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> Nuovo Pasto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {([{ key: "list", label: "📋 Tutti i Pasti" }, { key: "selection", label: "☑️ Selezione & Stampa" }, { key: "collections", label: "📁 Collezioni Salvate" }] as { key: TabOption; label: string }[]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: TUTTI I PASTI ─────────────────────────────────────────────── */}
      {activeTab === "list" && (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca pasto..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-52"
              />
            </div>
            <button onClick={() => setFilterType("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!filterType ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>Tutti</button>
            {MEAL_TYPES.map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterType === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                {MEAL_TYPE_ICONS[t]} {MEAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <ArrowUpDown size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500 shrink-0">Ordina:</span>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <button key={opt} onClick={() => setSortBy(opt)} className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${sortBy === opt ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nessun pasto trovato</div>}
            {filtered.map((meal) => (
              <div key={meal._id} className="bg-white rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{MEAL_TYPE_ICONS[meal.mealType as MealType]}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{meal.name}</div>
                      <div className="text-xs text-gray-500">{MEAL_TYPE_LABELS[meal.mealType as MealType]}</div>
                      {(meal as any).notes && <div className="text-xs text-gray-400 italic mt-0.5">{(meal as any).notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Kcal and proteins side by side */}
                    <span className="font-bold text-emerald-700 text-sm">{Math.round(meal.totalKcal)} kcal</span>
                    {(meal as any).totalProt != null && (meal as any).totalProt > 0 && (
                      <span className="font-bold text-blue-600 text-sm">{Math.round((meal as any).totalProt)}g prot.</span>
                    )}
                    <button onClick={() => setExpandedId(expandedId === meal._id ? null : meal._id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                      {expandedId === meal._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => openEditWithItems(meal)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                    <button onClick={() => handleDuplicate(meal._id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Duplica"><Copy size={14} /></button>
                    <button onClick={() => handleDelete(meal._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
                {expandedId === meal._id && expandedMeal && expandedMeal._id === meal._id && (
                  <div className="border-t px-4 py-3 bg-gray-50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left pb-2">Ingrediente</th>
                          <th className="text-center pb-2 w-8">Cat.</th>
                          <th className="text-right pb-2">Peso</th>
                          <th className="text-right pb-2 text-blue-600">Prot.</th>
                          <th className="text-right pb-2 text-emerald-700">Kcal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expandedMeal.items.map((item: any) => {
                          const p = item.ingredient?.proteinsPer100g != null
                            ? Math.round(calcItemProtFromExpanded(item)) : null;
                          return (
                            <tr key={item._id} className="border-b last:border-0">
                              <td className="py-1.5 font-medium text-gray-700">{item.ingredient?.name ?? "—"}</td>
                              <td className="py-1.5 text-center">{item.ingredient && <MacroBadge category={item.ingredient.category as MacroCategory} />}</td>
                              <td className="py-1.5 text-right text-gray-600">{item.weightGrams}g</td>
                              <td className="py-1.5 text-right font-semibold text-blue-600">{p != null ? `${p}g` : "—"}</td>
                              <td className="py-1.5 text-right font-semibold text-emerald-700">{Math.round(item.kcal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold border-t">
                          <td colSpan={3} className="pt-2 text-right text-gray-700">Totale:</td>
                          <td className="pt-2 text-right text-blue-600">{Math.round(expandedMeal.items.reduce((s: number, it: any) => s + calcItemProtFromExpanded(it), 0))}g</td>
                          <td className="pt-2 text-right text-emerald-700">{Math.round(meal.totalKcal)} kcal</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: SELEZIONE & STAMPA ────────────────────────────────────────── */}
      {activeTab === "selection" && (
        <SelectionTab
          meals={meals ?? []} selFiltered={selFiltered} selectedMealIds={selectedMealIds}
          selectedMealOrder={selectedMealOrder} selectedTotalKcal={selectedTotalKcal}
          selFilterType={selFilterType} setSelFilterType={setSelFilterType}
          selSearch={selSearch} setSelSearch={setSelSearch} selSortBy={selSortBy} setSelSortBy={setSelSortBy}
          toggleSelect={toggleSelect} selectAll={selectAll} clearSelection={clearSelection}
          moveItem={moveSelectionItem} removeFromSelection={removeFromSelection}
          onPrint={() => setShowPrint(true)}
          onSave={() => { setSaveCollectionName(""); setSaveCollectionNotes(""); setEditCollectionId(null); setShowSaveModal(true); }}
        />
      )}

      {/* ── TAB: COLLEZIONI SALVATE ────────────────────────────────────────── */}
      {activeTab === "collections" && (
        <CollectionsTab
          collections={collections ?? []} expandedCollectionId={expandedCollectionId}
          setExpandedCollectionId={(id: Id<"mealCollections"> | null) => { setExpandedCollectionId(id); setCollectionLocalOrder(null); }}
          expandedCollection={expandedCollection} collectionLocalOrder={collectionLocalOrder}
          moveCollectionItem={moveCollectionItem} saveCollectionOrder={saveCollectionOrder}
          hasLocalChanges={!!collectionLocalOrder}
          onPrint={(id: Id<"mealCollections">) => setPrintCollectionId(id)}
          onEdit={(col: any) => {
            if (expandedCollection && expandedCollection._id === col._id) {
              const order = collectionLocalOrder ?? (expandedCollection.meals ?? []).map((m: any) => m._id as Id<"meals">);
              setSelectedMealOrder(order);
            }
            setEditCollectionId(col._id); setSaveCollectionName(col.name); setSaveCollectionNotes(col.notes ?? "");
            setExpandedCollectionId(col._id); setActiveTab("selection"); setShowSaveModal(true);
          }}
          onDelete={handleDeleteCollection}
        />
      )}

      {showPrint && selectedMealOrder.length > 0 && (
        <SelectionPrintLoader mealIds={selectedMealOrder} name="Selezione Pasti" onClose={() => setShowPrint(false)} />
      )}
      {showSaveModal && (
        <SaveCollectionModal name={saveCollectionName} setName={setSaveCollectionName} notes={saveCollectionNotes} setNotes={setSaveCollectionNotes}
          selectedCount={selectedMealOrder.length} isEdit={!!editCollectionId} onSubmit={handleSaveCollection}
          onClose={() => { setShowSaveModal(false); setEditCollectionId(null); }} />
      )}
      {showForm && (
        <MealFormModal form={form} setForm={setForm} editId={editId} ingredients={ingredients ?? []} totalKcal={totalKcal}
          calcKcal={calcKcal} addItem={addItem} removeItem={removeItem} updateItem={updateItem} moveItem={moveItem}
          onSubmit={handleSubmit} onClose={() => setShowForm(false)}
          expandedMeal={editId && expandedMeal?._id === editId ? expandedMeal : null} />
      )}
    </div>
  );
}

// ── Selection Tab ─────────────────────────────────────────────────────────────
function SelectionTab({ meals, selFiltered, selectedMealIds, selectedMealOrder, selectedTotalKcal, selFilterType, setSelFilterType, selSearch, setSelSearch, selSortBy, setSelSortBy, toggleSelect, selectAll, clearSelection, moveItem, removeFromSelection, onPrint, onSave }: any) {
  const mealMap = Object.fromEntries((meals as any[]).map((m: any) => [m._id, m]));
  const orderedSelected: any[] = (selectedMealOrder as string[]).map((id: string) => mealMap[id]).filter(Boolean);
  const SEL_SORT_LABELS: Record<string, string> = { type: "Tipo pasto", name_asc: "Nome A→Z", name_desc: "Nome Z→A", kcal_asc: "Kcal ↑", kcal_desc: "Kcal ↓" };

  return (
    <div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-emerald-800">
              {selectedMealOrder.length === 0 ? "Nessun pasto selezionato" : `${selectedMealOrder.length} pasto${selectedMealOrder.length > 1 ? "i" : ""} selezionato${selectedMealOrder.length > 1 ? "i" : ""}`}
            </div>
            {selectedMealOrder.length > 0 && <div className="text-xs text-emerald-600 mt-0.5">Totale: <strong>{Math.round(selectedTotalKcal)} kcal</strong></div>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={selectAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"><CheckSquare size={13} /> Seleziona tutti</button>
            <button onClick={clearSelection} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"><Square size={13} /> Deseleziona tutti</button>
            <button disabled={selectedMealOrder.length === 0} onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"><Printer size={13} /> Stampa selezione</button>
            <button disabled={selectedMealOrder.length === 0} onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"><Save size={13} /> Salva come collezione</button>
          </div>
        </div>
      </div>

      {orderedSelected.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <GripVertical size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ordine selezione</span>
            <span className="text-xs text-gray-400">(usa ↑↓ per riordinare)</span>
          </div>
          <div className="space-y-1.5">
            {orderedSelected.map((meal: any, idx: number) => (
              <div key={meal._id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-emerald-600 w-5 shrink-0 text-center">{idx + 1}</span>
                <span className="text-sm shrink-0">{MEAL_TYPE_ICONS[meal.mealType as MealType]}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-800 text-sm">{meal.name}</span>
                  {meal.notes && <span className="text-xs text-gray-400 italic ml-1.5">{meal.notes}</span>}
                </div>
                <span className="text-xs font-bold text-emerald-700 shrink-0">{Math.round(meal.totalKcal)} kcal</span>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-emerald-600 disabled:opacity-20 rounded"><ChevronUp size={14} /></button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === orderedSelected.length - 1} className="p-0.5 text-gray-400 hover:text-emerald-600 disabled:opacity-20 rounded"><ChevronDown size={14} /></button>
                </div>
                <button onClick={() => removeFromSelection(meal._id)} className="p-1 text-gray-300 hover:text-red-500 rounded shrink-0"><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-emerald-200 mt-4 mb-4" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setSelFilterType("")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selFilterType ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>Tutti</button>
        {MEAL_TYPES.map((t: MealType) => (
          <button key={t} onClick={() => setSelFilterType(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selFilterType === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            {MEAL_TYPE_ICONS[t]} {MEAL_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={selSearch}
            onChange={(e) => setSelSearch(e.target.value)}
            placeholder="Cerca pasto..."
            className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-52"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown size={14} className="text-gray-400 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">Ordina:</span>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(SEL_SORT_LABELS) as SortOption[]).map((opt) => (
            <button key={opt} onClick={() => setSelSortBy(opt)} className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${selSortBy === opt ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>{SEL_SORT_LABELS[opt]}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {selFiltered.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nessun pasto trovato</div>}
        {selFiltered.map((meal: any) => {
          const isSelected = selectedMealIds.has(meal._id);
          return (
            <button key={meal._id} onClick={() => toggleSelect(meal._id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${isSelected ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30"}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"}`}>
                {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span className="text-lg shrink-0">{MEAL_TYPE_ICONS[meal.mealType as MealType]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm">{meal.name}</div>
                <div className="text-xs text-gray-500">{MEAL_TYPE_LABELS[meal.mealType as MealType]}</div>
                {meal.notes && <div className="text-xs text-gray-400 italic mt-0.5 truncate">{meal.notes}</div>}
              </div>
              <span className={`font-bold text-sm shrink-0 ${isSelected ? "text-emerald-700" : "text-gray-500"}`}>{Math.round(meal.totalKcal)} kcal</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Collections Tab ───────────────────────────────────────────────────────────
function CollectionsTab({ collections, expandedCollectionId, setExpandedCollectionId, expandedCollection, collectionLocalOrder, moveCollectionItem, saveCollectionOrder, hasLocalChanges, onPrint, onEdit, onDelete }: any) {
  return (
    <div>
      {collections.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nessuna collezione salvata. Vai su "Selezione & Stampa" per crearne una.</div>}
      <div className="space-y-3">
        {collections.map((col: any) => {
          const isExpanded = expandedCollectionId === col._id;
          const meals: any[] = isExpanded && expandedCollection?._id === col._id ? (expandedCollection.meals ?? []) : [];
          const orderedMeals = isExpanded && collectionLocalOrder
            ? collectionLocalOrder.map((id: string) => meals.find((m: any) => m._id === id)).filter(Boolean) : meals;
          return (
            <div key={col._id} className="bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📁</span>
                  <div>
                    <div className="font-semibold text-gray-800">{col.name}</div>
                    {col.notes && <div className="text-xs text-gray-500">{col.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onPrint(col._id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Stampa"><Printer size={15} /></button>
                  <button onClick={() => setExpandedCollectionId(isExpanded ? null : col._id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                  <button onClick={() => onEdit(col)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifica"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(col._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
              {isExpanded && expandedCollection && expandedCollection._id === col._id && (
                <div className="border-t bg-gray-50 px-4 py-3">
                  {orderedMeals.length === 0 ? <p className="text-sm text-gray-400 text-center py-3">Nessun pasto in questa collezione.</p> : (
                    <div className="space-y-1.5">
                      {orderedMeals.map((meal: any, idx: number) => (
                        <div key={meal._id} className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2">
                          <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                          <span className="text-sm shrink-0">{MEAL_TYPE_ICONS[meal.mealType as MealType]}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 text-sm">{meal.name}</div>
                            <div className="text-xs text-gray-400 truncate">{(meal.items ?? []).map((item: any) => item.ingredient?.name).filter(Boolean).join(", ")}</div>
                          </div>
                          <span className="font-bold text-emerald-700 text-sm shrink-0">{Math.round(meal.totalKcal)} kcal</span>
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button onClick={() => moveCollectionItem(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-emerald-600 disabled:opacity-20 rounded"><ChevronUp size={14} /></button>
                            <button onClick={() => moveCollectionItem(idx, 1)} disabled={idx === orderedMeals.length - 1} className="p-0.5 text-gray-400 hover:text-emerald-600 disabled:opacity-20 rounded"><ChevronDown size={14} /></button>
                          </div>
                        </div>
                      ))}
                      {hasLocalChanges && (
                        <div className="flex justify-end pt-1">
                          <button onClick={saveCollectionOrder} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"><Save size={12} /> Salva ordine</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Selection Print Loader ────────────────────────────────────────────────────
function SelectionPrintLoader({ mealIds, name, onClose }: { mealIds: Id<"meals">[]; name: string; onClose: () => void }) {
  const data = useQuery(api.mealCollections.getMealsWithItems, { mealIds });
  if (!data) return <div className="fixed inset-0 z-50 bg-white flex items-center justify-center"><div className="text-gray-500">Caricamento...</div></div>;
  return <MealCollectionPrintView name={name} meals={data} onClose={onClose} />;
}

// ── Save Collection Modal ─────────────────────────────────────────────────────
function SaveCollectionModal({ name, setName, notes, setNotes, selectedCount, isEdit, onSubmit, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-800">{isEdit ? "Modifica Collezione" : "Salva Collezione"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700 font-medium">
            {selectedCount} pasto{selectedCount !== 1 ? "i" : ""} selezionato{selectedCount !== 1 ? "i" : ""}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome collezione *</label>
            <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="es. Pasti proteici, Colazioni veloci..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" rows={2} placeholder="es. Per la fase di massa..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Annulla</button>
            <button type="submit" className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700">{isEdit ? "Aggiorna" : "Salva"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Meal Form Modal ───────────────────────────────────────────────────────────
function MealFormModal({ form, setForm, editId, ingredients, totalKcal, calcKcal, addItem, removeItem, updateItem, moveItem, onSubmit, onClose, expandedMeal }: any) {
  const [initialized, setInitialized] = useState(false);
  if (editId && expandedMeal && !initialized) {
    setInitialized(true);
    setForm((f: MealForm) => ({ ...f, items: expandedMeal.items.map((item: any) => ({ ingredientId: item.ingredientId, weightGrams: String(item.weightGrams) })) }));
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-800">{editId ? "Modifica Pasto" : "Nuovo Pasto"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="es. Pasta al pomodoro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo pasto *</label>
              <select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value as MealType })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {ALL_MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>{MEAL_TYPE_ICONS[t]} {MEAL_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Ingredienti</label>
                {form.items.length > 1 && <span className="text-xs text-gray-400 ml-2">(usa ↑↓ per riordinare)</span>}
              </div>
              <button type="button" onClick={addItem} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"><Plus size={13} /> Aggiungi ingrediente</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item: MealItemForm, idx: number) => {
                const kcal = calcKcal(item);
                const ing = ingredients.find((i: any) => i._id === item.ingredientId);
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    {form.items.length > 1 && (
                      <div className="pt-2">
                        <ReorderButtons idx={idx} total={form.items.length} onMove={(dir) => moveItem(idx, dir)} />
                      </div>
                    )}
                    <div className="flex-1">
                      <IngredientPicker value={item.ingredientId} onChange={(id) => updateItem(idx, "ingredientId", id)} ingredients={ingredients} />
                      {ing && (ing.portionSmall || ing.portionMedium || ing.portionLarge || ing.portionSuper) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {ing.portionSmall && <button type="button" onClick={() => updateItem(idx, "weightGrams", String(ing.portionSmall))} className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 rounded border text-gray-600 hover:text-emerald-700">S:{ing.portionSmall}g</button>}
                          {ing.portionMedium && <button type="button" onClick={() => updateItem(idx, "weightGrams", String(ing.portionMedium))} className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 rounded border text-gray-600 hover:text-emerald-700">M:{ing.portionMedium}g</button>}
                          {ing.portionLarge && <button type="button" onClick={() => updateItem(idx, "weightGrams", String(ing.portionLarge))} className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 rounded border text-gray-600 hover:text-emerald-700">L:{ing.portionLarge}g</button>}
                          {ing.portionSuper && <button type="button" onClick={() => updateItem(idx, "weightGrams", String(ing.portionSuper))} className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 rounded border text-gray-600 hover:text-emerald-700">XL:{ing.portionSuper}g</button>}
                        </div>
                      )}
                    </div>
                    <input type="number" min="1" step="1" value={item.weightGrams} onChange={(e) => updateItem(idx, "weightGrams", e.target.value)} placeholder="g" className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    <span className="text-xs text-emerald-700 font-semibold w-16 text-right pt-2">{kcal > 0 ? `${kcal} kcal` : ""}</span>
                    <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 rounded mt-0.5"><X size={14} /></button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-right font-bold text-emerald-700">Totale: {totalKcal} kcal</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Annulla</button>
            <button type="submit" className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700">{editId ? "Salva" : "Crea Pasto"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

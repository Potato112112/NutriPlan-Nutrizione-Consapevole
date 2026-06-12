import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MACRO_LABELS, MACRO_BG, MacroCategory, PORTION_LABELS } from "../types";
import { MacroBadge, MacroTag } from "../components/MacroBadge";
import { Plus, Pencil, Trash2, Search, X, Copy } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: MacroCategory[] = [
  "carboidrati_complessi",
  "zuccheri_semplici",
  "proteine",
  "grassi",
  "minerali_vitamine_fibre",
  "spezie_erbe_condimenti",
];

type IngredientForm = {
  name: string;
  category: MacroCategory;
  kcalPer100g: string;
  carbsPer100g: string;
  proteinsPer100g: string;
  fatsPer100g: string;
  fibersPer100g: string;
  portionSmall: string;
  portionMedium: string;
  portionLarge: string;
  portionSuper: string;
  brand: string;
  notes: string;
};

const emptyForm = (): IngredientForm => ({
  name: "",
  category: "proteine",
  kcalPer100g: "",
  carbsPer100g: "",
  proteinsPer100g: "",
  fatsPer100g: "",
  fibersPer100g: "",
  portionSmall: "",
  portionMedium: "",
  portionLarge: "",
  portionSuper: "",
  brand: "",
  notes: "",
});

function calcPortionKcal(kcalPer100g: number, grams: number | undefined): string {
  if (!grams) return "—";
  return `${Math.round((kcalPer100g * grams) / 100)} kcal`;
}

type SortKey = "name" | "brand" | "category" | "kcal" | "carbs" | "proteins" | "fats" | "fibers";

function getSortValue(ing: any, key: SortKey): any {
  switch (key) {
    case "name": return ing.name?.toLowerCase() ?? "";
    case "brand": return ing.brand?.toLowerCase() ?? "";
    case "category": return ing.category ?? "";
    case "kcal": return ing.kcalPer100g ?? 0;
    case "carbs": return ing.carbsPer100g ?? -1;
    case "proteins": return ing.proteinsPer100g ?? -1;
    case "fats": return ing.fatsPer100g ?? -1;
    case "fibers": return ing.fibersPer100g ?? -1;
    default: return "";
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-300 ml-0.5">↕</span>;
  return <span className="text-emerald-600 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<MacroCategory | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"ingredients"> | null>(null);
  const [form, setForm] = useState<IngredientForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<Id<"ingredients"> | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const ingredients = useQuery(api.ingredients.list, filterCat ? { category: filterCat } : {});
  const createIngredient = useMutation(api.ingredients.create);
  const updateIngredient = useMutation(api.ingredients.update);
  const removeIngredient = useMutation(api.ingredients.remove);
  const duplicateIngredient = useMutation(api.ingredients.duplicate);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = (ingredients ?? [])
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(ing: any) {
    setForm({
      name: ing.name,
      category: ing.category,
      kcalPer100g: String(ing.kcalPer100g),
      carbsPer100g: String(ing.carbsPer100g ?? ""),
      proteinsPer100g: String(ing.proteinsPer100g ?? ""),
      fatsPer100g: String(ing.fatsPer100g ?? ""),
      fibersPer100g: String(ing.fibersPer100g ?? ""),
      portionSmall: String(ing.portionSmall ?? ""),
      portionMedium: String(ing.portionMedium ?? ""),
      portionLarge: String(ing.portionLarge ?? ""),
      portionSuper: String(ing.portionSuper ?? ""),
      brand: ing.brand ?? "",
      notes: ing.notes ?? "",
    });
    setEditId(ing._id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category,
      kcalPer100g: parseFloat(form.kcalPer100g) || 0,
      carbsPer100g: form.carbsPer100g ? parseFloat(form.carbsPer100g) : undefined,
      proteinsPer100g: form.proteinsPer100g ? parseFloat(form.proteinsPer100g) : undefined,
      fatsPer100g: form.fatsPer100g ? parseFloat(form.fatsPer100g) : undefined,
      fibersPer100g: form.fibersPer100g ? parseFloat(form.fibersPer100g) : undefined,
      portionSmall: form.portionSmall ? parseFloat(form.portionSmall) : undefined,
      portionMedium: form.portionMedium ? parseFloat(form.portionMedium) : undefined,
      portionLarge: form.portionLarge ? parseFloat(form.portionLarge) : undefined,
      portionSuper: form.portionSuper ? parseFloat(form.portionSuper) : undefined,
      brand: form.brand || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editId) {
        await updateIngredient({ id: editId, ...payload });
        toast.success("Ingrediente aggiornato");
      } else {
        await createIngredient(payload);
        toast.success("Ingrediente aggiunto");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: Id<"ingredients">) {
    if (!confirm("Eliminare questo ingrediente?")) return;
    try {
      await removeIngredient({ id });
      toast.success("Ingrediente eliminato");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDuplicate(id: Id<"ingredients">) {
    try {
      await duplicateIngredient({ id });
      toast.success("Ingrediente duplicato");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function Th({ col, label, className = "" }: { col: SortKey; label: string; className?: string }) {
    return (
      <th
        className={`py-3 font-semibold text-gray-600 cursor-pointer select-none hover:text-emerald-700 hover:bg-emerald-50 transition-colors ${className}`}
        onClick={() => toggleSort(col)}
      >
        {label}<SortIcon active={sortKey === col} dir={sortDir} />
      </th>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Ingredienti</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca ingrediente..."
            className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-52"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as any)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <option value="">Tutte le categorie</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{MACRO_LABELS[c]}</option>
          ))}
        </select>
        <div className="text-xs text-gray-400 flex items-center ml-1">
          Clicca le intestazioni per ordinare
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <Th col="name" label="Nome" className="text-left px-4" />
              <Th col="brand" label="Marca" className="text-left px-3 hidden md:table-cell" />
              <Th col="category" label="Cat." className="text-center px-3" />
              <Th col="kcal" label="Kcal/100g" className="text-right px-4" />
              <Th col="carbs" label="C" className="text-right px-3 hidden md:table-cell" />
              <Th col="proteins" label="P" className="text-right px-3 hidden md:table-cell" />
              <Th col="fats" label="G" className="text-right px-3 hidden md:table-cell" />
              <Th col="fibers" label="F" className="text-right px-3 hidden lg:table-cell" />
              <th className="text-center px-3 py-3 font-semibold text-gray-600 hidden lg:table-cell">Porzioni</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400">
                  Nessun ingrediente trovato
                </td>
              </tr>
            )}
            {filtered.map((ing) => (
              <>
                <tr
                  key={ing._id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === ing._id ? null : ing._id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{ing.name}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    {(ing as any).brand && (
                      <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{(ing as any).brand}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <MacroBadge category={ing.category as MacroCategory} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{ing.kcalPer100g}</td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden md:table-cell">{ing.carbsPer100g != null ? `${ing.carbsPer100g}g` : "—"}</td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden md:table-cell">{ing.proteinsPer100g != null ? `${ing.proteinsPer100g}g` : "—"}</td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden md:table-cell">{ing.fatsPer100g != null ? `${ing.fatsPer100g}g` : "—"}</td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden lg:table-cell">{ing.fibersPer100g != null ? `${ing.fibersPer100g}g` : "—"}</td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {ing.portionSmall && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">S:{ing.portionSmall}g</span>}
                      {ing.portionMedium && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">M:{ing.portionMedium}g</span>}
                      {ing.portionLarge && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">L:{ing.portionLarge}g</span>}
                      {ing.portionSuper && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">XL:{ing.portionSuper}g</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(ing); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(ing._id); }}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Duplica"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(ing._id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === ing._id && (
                  <tr key={`${ing._id}-expanded`} className="bg-blue-50 border-b">
                    <td colSpan={10} className="px-6 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500 mb-1 font-medium">Categoria</div>
                          <MacroTag category={ing.category as MacroCategory} />
                        </div>
                        {(ing as any).brand && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1 font-medium">Marca</div>
                            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 font-medium">{(ing as any).brand}</span>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-gray-500 mb-1 font-medium">Macronutrienti / 100g</div>
                          <div className="flex gap-2 flex-wrap text-xs">
                            {ing.carbsPer100g != null && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Carb: {ing.carbsPer100g}g</span>}
                            {ing.proteinsPer100g != null && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Prot: {ing.proteinsPer100g}g</span>}
                            {ing.fatsPer100g != null && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Grassi: {ing.fatsPer100g}g</span>}
                            {ing.fibersPer100g != null && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Fibre: {ing.fibersPer100g}g</span>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1 font-medium">Porzioni standard</div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {ing.portionSmall && <span className="bg-white border rounded px-2 py-0.5">S: {ing.portionSmall}g → {calcPortionKcal(ing.kcalPer100g, ing.portionSmall)}</span>}
                            {ing.portionMedium && <span className="bg-white border rounded px-2 py-0.5">M: {ing.portionMedium}g → {calcPortionKcal(ing.kcalPer100g, ing.portionMedium)}</span>}
                            {ing.portionLarge && <span className="bg-white border rounded px-2 py-0.5">L: {ing.portionLarge}g → {calcPortionKcal(ing.kcalPer100g, ing.portionLarge)}</span>}
                            {ing.portionSuper && <span className="bg-white border rounded px-2 py-0.5">XL: {ing.portionSuper}g → {calcPortionKcal(ing.kcalPer100g, ing.portionSuper)}</span>}
                          </div>
                        </div>
                        {(ing as any).notes && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1 font-medium">Note Nutrizionali</div>
                            <p className="text-xs text-gray-600">{(ing as any).notes}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg text-gray-800">
                {editId ? "Modifica Ingrediente" : "Nuovo Ingrediente"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    placeholder="es. Petto di pollo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as MacroCategory })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{MACRO_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kcal per 100g *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.kcalPer100g}
                    onChange={(e) => setForm({ ...form, kcalPer100g: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    placeholder="es. 165"
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Macronutrienti per 100g (g)</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "carbsPer100g", label: "Carboidrati" },
                    { key: "proteinsPer100g", label: "Proteine" },
                    { key: "fatsPer100g", label: "Grassi" },
                    { key: "fibersPer100g", label: "Fibre" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-600 mb-1">{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={(form as any)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        placeholder="g"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Porzioni standard (g)</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "portionSmall", label: "S — Piccola" },
                    { key: "portionMedium", label: "M — Media" },
                    { key: "portionLarge", label: "L — Grande" },
                    { key: "portionSuper", label: "XL — Super" },
                  ].map(({ key, label }) => {
                    const grams = parseFloat((form as any)[key]);
                    const kcal = form.kcalPer100g && grams ? Math.round((parseFloat(form.kcalPer100g) * grams) / 100) : null;
                    return (
                      <div key={key}>
                        <label className="block text-xs text-gray-600 mb-1">{label}</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={(form as any)[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            placeholder="g"
                          />
                          {kcal !== null && (
                            <span className="text-xs text-emerald-700 font-semibold w-16 text-right">{kcal} kcal</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note Nutrizionali</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                  rows={2}
                  placeholder="Note opzionali..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  placeholder="es. Barilla, Galbani, Muller..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700"
                >
                  {editId ? "Salva" : "Aggiungi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

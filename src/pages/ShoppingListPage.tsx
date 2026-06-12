import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MacroCategory, MACRO_LABELS, MACRO_SHORT, MACRO_BADGE_COLORS, ALL_MACRO_CATEGORIES } from "../types";
import { MacroBadge } from "../components/MacroBadge";
import { Plus, Trash2, X, Printer, ChevronDown, ChevronUp, Check, Pencil, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

type ItemForm = {
  name: string;
  quantity: string;
  brand: string;
  nutritionNotes: string;
  category: string;
};

const emptyItemForm = (): ItemForm => ({
  name: "",
  quantity: "",
  brand: "",
  nutritionNotes: "",
  category: "",
});

export function ShoppingListPage() {
  const [expandedListId, setExpandedListId] = useState<Id<"shoppingLists"> | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showAddItem, setShowAddItem] = useState<Id<"shoppingLists"> | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());
  const [editItemId, setEditItemId] = useState<Id<"shoppingItems"> | null>(null);
  const [printListId, setPrintListId] = useState<Id<"shoppingLists"> | null>(null);
  const [ingSearch, setIngSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");

  const lists = useQuery(api.shopping.listLists);
  const allIngredients = useQuery(api.ingredients.list, {});
  const expandedList = useQuery(
    api.shopping.getListWithItems,
    expandedListId ? { listId: expandedListId } : "skip"
  );
  const printList = useQuery(
    api.shopping.getListWithItems,
    printListId ? { listId: printListId } : "skip"
  );

  const createList = useMutation(api.shopping.createList);
  const deleteList = useMutation(api.shopping.deleteList);
  const addItem = useMutation(api.shopping.addItem);
  const updateItem = useMutation(api.shopping.updateItem);
  const toggleItem = useMutation(api.shopping.toggleItem);
  const deleteItem = useMutation(api.shopping.deleteItem);

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      const id = await createList({ name: newListName.trim() });
      setNewListName("");
      setShowNewList(false);
      setExpandedListId(id);
      toast.success("Lista creata");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteList(id: Id<"shoppingLists">) {
    if (!confirm("Eliminare questa lista della spesa?")) return;
    try {
      await deleteList({ id });
      if (expandedListId === id) setExpandedListId(null);
      toast.success("Lista eliminata");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!showAddItem || !itemForm.name.trim()) return;
    try {
      if (editItemId) {
        await updateItem({
          id: editItemId,
          name: itemForm.name.trim(),
          quantity: itemForm.quantity,
          brand: itemForm.brand || undefined,
          nutritionNotes: itemForm.nutritionNotes || undefined,
          category: itemForm.category || undefined,
          checked: false,
        });
        toast.success("Voce aggiornata");
      } else {
        await addItem({
          listId: showAddItem,
          name: itemForm.name.trim(),
          quantity: itemForm.quantity,
          brand: itemForm.brand || undefined,
          nutritionNotes: itemForm.nutritionNotes || undefined,
          category: itemForm.category || undefined,
        });
        toast.success("Voce aggiunta");
      }
      setItemForm(emptyItemForm());
      setEditItemId(null);
      setShowAddItem(null);
      setIngSearch("");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function openEditItem(item: any, listId: Id<"shoppingLists">) {
    setItemForm({
      name: item.name,
      quantity: item.quantity,
      brand: item.brand ?? "",
      nutritionNotes: item.nutritionNotes ?? "",
      category: item.category ?? "",
    });
    setEditItemId(item._id);
    setShowAddItem(listId);
  }

  function groupByCategory(items: any[]) {
    const groups: Record<string, any[]> = {};
    for (const item of items) {
      const cat = item.category || "altro";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }

  const checkedCount = (expandedList?.items ?? []).filter((i: any) => i.checked).length;
  const totalCount = (expandedList?.items ?? []).length;

  const SORT_LABELS: Record<string, string> = {
    newest: "Più recenti",
    oldest: "Più vecchie",
    name_asc: "Nome A→Z",
    name_desc: "Nome Z→A",
  };

  const sortedLists = [...(lists ?? [])].sort((a, b) => {
    if (sortBy === "name_asc") return a.name.localeCompare(b.name, "it");
    if (sortBy === "name_desc") return b.name.localeCompare(a.name, "it");
    if (sortBy === "oldest") return a._creationTime - b._creationTime;
    return b._creationTime - a._creationTime;
  });

  return (
    <div>
      {printListId && printList && (
        <ShoppingPrintView list={printList} onClose={() => setPrintListId(null)} />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Lista della Spesa</h1>
        <button
          onClick={() => setShowNewList(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nuova Lista
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Puoi generare automaticamente una lista dalla sezione <strong>Settimane</strong> cliccando "Lista Spesa", oppure creare una lista manuale qui.
      </p>

      {/* Sort bar */}
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown size={14} className="text-gray-400 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">Ordina:</span>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(SORT_LABELS) as Array<"newest" | "oldest" | "name_asc" | "name_desc">).map((opt) => (
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

      {showNewList && (
        <form onSubmit={handleCreateList} className="bg-white border rounded-xl p-4 mb-4 flex gap-3">
          <input
            autoFocus
            required
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nome lista (es. Spesa settimana 1)"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            Crea
          </button>
          <button type="button" onClick={() => setShowNewList(false)} className="border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <X size={16} />
          </button>
        </form>
      )}

      <div className="space-y-3">
        {sortedLists.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
            Nessuna lista della spesa. Creane una o generala da una settimana.
          </div>
        )}
        {sortedLists.map((list) => (
          <div key={list._id} className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🛒</span>
                <div>
                  <div className="font-semibold text-gray-800">{list.name}</div>
                  {list.notes && <div className="text-xs text-gray-500">{list.notes}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowAddItem(list._id); setItemForm(emptyItemForm()); setEditItemId(null); setIngSearch(""); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                  <Plus size={12} /> Aggiungi voce
                </button>
                <button
                  onClick={() => setPrintListId(list._id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Stampa lista"
                >
                  <Printer size={15} />
                </button>
                <button
                  onClick={() => setExpandedListId(expandedListId === list._id ? null : list._id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  {expandedListId === list._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteList(list._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expandedListId === list._id && expandedList && expandedList._id === list._id && (
              <div className="border-t bg-gray-50 px-4 py-3">
                {totalCount > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{checkedCount} / {totalCount} acquistati</span>
                      <span>{Math.round((checkedCount / totalCount) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {expandedList.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Nessuna voce. Clicca "Aggiungi voce" per iniziare.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupByCategory(expandedList.items)).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="flex items-center gap-2 mb-1.5">
                          {cat !== "altro" && (
                            <MacroBadge category={cat as MacroCategory} />
                          )}
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {MACRO_LABELS[cat as MacroCategory] ?? "Altro"}
                          </span>
                        </div>
                        <div className="space-y-1.5 pl-2">
                          {(items as any[]).map((item: any) => (
                            <div
                              key={item._id}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${item.checked ? "bg-gray-100 border-gray-200 opacity-60" : "bg-white border-gray-200"}`}
                            >
                              <button
                                onClick={() => toggleItem({ id: item._id, checked: !item.checked })}
                                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-emerald-400"}`}
                              >
                                {item.checked && <Check size={12} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`} style={{ fontSize: "14.5px" }}>
                                    {item.name}
                                  </span>
                                  <span className="font-semibold bg-emerald-50 px-2 py-0.5 rounded text-emerald-700" style={{ fontSize: "13.5px" }}>
                                    {item.quantity}
                                  </span>
                                  {item.brand && (
                                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200" style={{ fontSize: "12px" }}>
                                      {item.brand}
                                    </span>
                                  )}
                                </div>
                                {item.nutritionNotes && (
                                  <p className="text-xs text-gray-500 mt-0.5">{item.nutritionNotes}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => openEditItem(item, list._id)}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => deleteItem({ id: item._id })}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddItem && (
        <AddItemModal
          editItemId={editItemId}
          itemForm={itemForm}
          setItemForm={setItemForm}
          ingSearch={ingSearch}
          setIngSearch={setIngSearch}
          allIngredients={allIngredients ?? []}
          onSubmit={handleAddItem}
          onClose={() => { setShowAddItem(null); setEditItemId(null); setIngSearch(""); }}
        />
      )}
    </div>
  );
}

function AddItemModal({ editItemId, itemForm, setItemForm, ingSearch, setIngSearch, allIngredients, onSubmit, onClose }: any) {
  const filteredIngs = allIngredients.filter((i: any) =>
    !ingSearch || i.name.toLowerCase().includes(ingSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-800">{editItemId ? "Modifica voce" : "Aggiungi voce"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-3">
          {!editItemId && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                📦 Seleziona dal database ingredienti
              </div>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={ingSearch}
                  onChange={(e) => setIngSearch(e.target.value)}
                  placeholder="Cerca ingrediente..."
                  className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5 bg-white rounded-lg border p-1">
                {filteredIngs.slice(0, 25).map((ing: any) => (
                  <button
                    key={ing._id}
                    type="button"
                    onClick={() => {
                      setItemForm({
                        name: ing.name,
                        quantity: ing.portionMedium ? `${ing.portionMedium}g` : "",
                        brand: ing.brand ?? "",
                        nutritionNotes: ing.notes ?? "",
                        category: ing.category,
                      });
                      setIngSearch("");
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-emerald-50 text-left transition-colors"
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white shrink-0 ${MACRO_BADGE_COLORS[ing.category as MacroCategory]}`}>
                      {MACRO_SHORT[ing.category as MacroCategory]}
                    </span>
                    <span className="text-xs font-medium text-gray-700 flex-1 truncate">{ing.name}</span>
                    {ing.brand && <span className="text-xs text-blue-600 shrink-0 font-medium">{ing.brand}</span>}
                    <span className="text-xs text-gray-400 shrink-0">{ing.kcalPer100g} kcal/100g</span>
                  </button>
                ))}
                {filteredIngs.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">Nessun ingrediente trovato</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">↑ Clicca un ingrediente per pre-compilare il form</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome prodotto *</label>
            <input
              required
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="es. Petto di pollo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
              <input
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                placeholder="es. 500g, 2 pz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                value={itemForm.brand}
                onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                placeholder="es. Barilla"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="">Nessuna categoria</option>
              {ALL_MACRO_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {MACRO_SHORT[cat]} — {MACRO_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note nutrizionali</label>
            <textarea
              value={itemForm.nutritionNotes}
              onChange={(e) => setItemForm({ ...itemForm, nutritionNotes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              rows={2}
              placeholder="es. senza glutine, biologico, alto contenuto proteico..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annulla
            </button>
            <button type="submit"
              className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700">
              {editItemId ? "Salva" : "Aggiungi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ─── Colori categoria ────────────────────────────────────────────────────────
const CAT_HEX: Record<string, string> = {
  carboidrati_complessi: "#f59e0b",
  zuccheri_semplici: "#f97316",
  proteine: "#3b82f6",
  grassi: "#a855f7",
  minerali_vitamine_fibre: "#22c55e",
  spezie_erbe_condimenti: "#ec4899",
  altro: "#6b7280",
  integratori: "#14b8a6",
};
const CAT_LETTER: Record<string, string> = {
  carboidrati_complessi: "C", zuccheri_semplici: "Z",
  proteine: "P", grassi: "G", minerali_vitamine_fibre: "V",
  spezie_erbe_condimenti: "S", altro: "A", integratori: "I",
};

function ShoppingPrintView({ list, onClose }: { list: any; onClose: () => void }) {
  function groupByCategory(items: any[]) {
    const groups: Record<string, any[]> = {};
    for (const item of items) {
      const cat = item.category || "altro";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }

  const groups = groupByCategory(list.items ?? []);
  const itemsWithNotes = (list.items ?? []).filter((i: any) => i.nutritionNotes);

  return (
    <div className="fixed inset-0 z-50 bg-gray-300 overflow-auto">
      {/* Toolbar — nascosta in stampa */}
      <div className="print:hidden flex items-center gap-3 p-4 bg-gray-100 border-b sticky top-0 z-10">
        <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200">
          ← Chiudi
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          🖨️ Stampa A4 Verticale
        </button>
        <span className="text-sm text-gray-500">Formato: A4 Verticale (Portrait)</span>
      </div>

      {/* Anteprima — visibile a schermo e in stampa */}
      <div className="flex justify-center py-8 px-4 print:p-0 print:block">
        <div
          className="sp-printable bg-white shadow-xl print:shadow-none"
          style={{ width: "210mm", padding: "12mm 15mm", boxSizing: "border-box" }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1f2937", paddingBottom: "6px", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>
                Lista della Spesa
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                {list.name}
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "#6b7280", fontWeight: 600, marginTop: "4px" }}>
              {list.items?.length ?? 0} prodotti
            </div>
          </div>

          {/* Categorie — column flow per riempire lo spazio senza vuoti */}
          <div style={{ columnCount: 2, columnGap: "20px", marginBottom: "8px" }}>
            {Object.entries(groups).map(([cat, items]) => (
              <div key={cat} style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: "7px" }}>
                {/* Intestazione categoria */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", borderBottom: "1.5px solid #e5e7eb", paddingBottom: "2px", marginBottom: "4px" }}>
                  {cat !== "altro" && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: "15px", height: "15px", borderRadius: "50%",
                      backgroundColor: CAT_HEX[cat] ?? "#9ca3af",
                      fontSize: "9px", fontWeight: 800, color: "white", flexShrink: 0,
                    }}>
                      {CAT_LETTER[cat] ?? "?"}
                    </span>
                  )}
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {MACRO_LABELS[cat as MacroCategory] ?? "Altro"}
                  </span>
                </div>
                {/* Voci */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {(items as any[]).map((item: any) => (
                    <div key={item._id} style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                      <div style={{ width: "10px", height: "10px", border: "1.5px solid #9ca3af", borderRadius: "2px", flexShrink: 0, marginTop: "2px" }} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: "12px", fontWeight: 600, color: "#1f2937", lineHeight: 1.3 }}>
                        {item.name}
                        {item.nutritionNotes && <span style={{ color: "#d97706", fontWeight: 700, marginLeft: "1px" }}>*</span>}
                        {item.brand && <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: 400 }}> ({item.brand})</span>}
                        {item.quantity && (
                          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700, marginLeft: "5px" }}>
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Note nutrizionali */}
          {itemsWithNotes.length > 0 && (
            <div style={{ marginTop: "6px", padding: "6px 9px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "4px", breakInside: "avoid" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
                📋 Note Nutrizionali
              </div>
              <div style={{ columnCount: 2, columnGap: "16px" }}>
                {itemsWithNotes.map((item: any) => (
                  <div key={item._id} style={{ display: "flex", gap: "4px", alignItems: "baseline", breakInside: "avoid", marginBottom: "2px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", flexShrink: 0 }}>{item.name}*</span>
                    <span style={{ fontSize: "10px", color: "#78350f", lineHeight: 1.3 }}>{item.nutritionNotes}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          .sp-printable, .sp-printable * { visibility: visible; }
          .sp-printable {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
}


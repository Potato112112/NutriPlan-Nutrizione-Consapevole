import { useState } from "react";
import { Pencil, X } from "lucide-react";

type IngredientPickerProps = {
  value: string;
  onChange: (id: string) => void;
  ingredients: any[];
  size?: "sm" | "md";
};

export function IngredientPicker({ value, onChange, ingredients, size = "md" }: IngredientPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name, "it"));
  const filteredIngs = search
    ? sorted.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;
  const selected = ingredients.find((i) => i._id === value);

  const isSm = size === "sm";
  const inputClass = isSm
    ? "w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
    : "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300";
  const chipClass = isSm
    ? "flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-emerald-50 border-emerald-200"
    : "flex items-center gap-2 border rounded-lg px-3 py-2 bg-emerald-50 border-emerald-200";
  const nameClass = isSm ? "text-xs font-medium text-gray-800 flex-1" : "text-sm font-medium text-gray-800 flex-1";
  const itemClass = isSm
    ? "w-full text-left px-3 py-2 text-xs hover:bg-emerald-50"
    : "w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 flex items-center gap-2";

  function startEditing() {
    setSearch(selected?.name ?? "");
    setEditing(true);
    setOpen(true);
  }

  function cancelEditing() {
    setEditing(false);
    setSearch("");
    setOpen(false);
  }

  function selectIngredient(id: string) {
    onChange(id);
    setEditing(false);
    setSearch("");
    setOpen(false);
  }

  if (selected && !editing) {
    return (
      <div className={chipClass}>
        <span className={nameClass}>
          {selected.name}
          {!isSm && (
            <span className="text-xs text-gray-500"> ({selected.kcalPer100g} kcal/100g)</span>
          )}
        </span>
        <button
          type="button"
          onClick={startEditing}
          className="text-gray-400 hover:text-blue-600"
          title="Cambia ingrediente"
        >
          <Pencil size={isSm ? 12 : 13} />
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-gray-400 hover:text-red-500"
          title="Rimuovi"
        >
          <X size={isSm ? 12 : 13} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Cerca ingrediente..."
          className={inputClass}
          autoFocus={editing}
        />
        {editing && selected && (
          <button
            type="button"
            onClick={cancelEditing}
            className="shrink-0 px-2 text-xs text-gray-500 hover:text-gray-700 border rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredIngs.slice(0, 50).map((i: any) => (
            <button
              key={i._id}
              type="button"
              onMouseDown={() => selectIngredient(i._id)}
              className={itemClass}
            >
              <span className="font-medium text-gray-800 flex-1">{i.name}</span>
              {!isSm && (
                <span className="text-xs text-gray-400 shrink-0">{i.kcalPer100g} kcal/100g</span>
              )}
            </button>
          ))}
          {filteredIngs.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">Nessun risultato</p>
          )}
        </div>
      )}
    </div>
  );
}

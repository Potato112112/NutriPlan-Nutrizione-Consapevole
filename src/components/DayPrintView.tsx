import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS, MACRO_SHORT, MACRO_LABELS, MacroCategory, MealType, ALL_MACRO_CATEGORIES, MACRO_COLORS } from "../types";

const ALL_CATS: MacroCategory[] = ALL_MACRO_CATEGORIES;

const CAT_HEX: Record<MacroCategory, string> = MACRO_COLORS;

function calcItemProt(item: any): number {
  if (item.ingredient?.proteinsPer100g == null) return 0;
  return (item.ingredient.proteinsPer100g * item.weightGrams) / 100;
}

export function DayPrintView({ day, onClose }: { day: any; onClose: () => void }) {
  const totalProt = Math.round(
    (day.slots as any[]).reduce((s: number, slot: any) =>
      s + (slot.meal?.items ?? []).reduce((ss: number, it: any) => ss + calcItemProt(it), 0), 0)
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-300 overflow-auto">
      {/* Toolbar */}
      <div className="print:hidden flex items-center gap-3 p-4 bg-gray-100 border-b sticky top-0 z-10">
        <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200">
          ← Chiudi
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          🖨️ Stampa A4 Verticale
        </button>
        <span className="text-sm text-gray-500">Formato: A4 Verticale (Portrait)</span>
      </div>

      {/* Preview */}
      <div className="flex justify-center py-8 px-4 print:p-0 print:block">
        <div
          className="dp-printable bg-white shadow-xl print:shadow-none"
          style={{ width: "210mm", padding: "10mm 14mm", boxSizing: "border-box" }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1f2937", paddingBottom: "5px", marginBottom: "7px" }}>
            <div>
              <div style={{ fontSize: "7px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1px" }}>
                Schema Alimentare Giornaliero
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                {day.name}
              </div>
              {day.notes && (
                <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "1px" }}>{day.notes}</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "flex-end" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#059669", lineHeight: 1 }}>{Math.round(day.totalKcal)}</div>
                  <div style={{ fontSize: "8px", color: "#6b7280", fontWeight: 600 }}>kcal totali</div>
                </div>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#3b82f6", lineHeight: 1 }}>{totalProt}g</div>
                  <div style={{ fontSize: "8px", color: "#6b7280", fontWeight: 600 }}>prot. totali</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            {ALL_CATS.map((cat) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "13px", height: "13px", borderRadius: "50%",
                  backgroundColor: CAT_HEX[cat], fontSize: "8px", fontWeight: 800, color: "white",
                }}>
                  {MACRO_SHORT[cat]}
                </span>
                <span style={{ fontSize: "9px", color: "#4b5563" }}>{MACRO_LABELS[cat]}</span>
              </div>
            ))}
          </div>

          {/* Meals — single column layout */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {(day.slots as any[]).map((slot: any, idx: number) => {
              const slotProt = Math.round(
                (slot.meal?.items ?? []).reduce((s: number, it: any) => s + calcItemProt(it), 0)
              );
              return (
                <div key={slot._id ?? idx} style={{ breakInside: "avoid", pageBreakInside: "avoid", border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
                  {/* Meal header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 9px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "12px" }}>{MEAL_TYPE_ICONS[slot.mealType as MealType]}</span>
                      <div>
                        <div style={{ fontSize: "7px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {MEAL_TYPE_LABELS[slot.mealType as MealType]}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#1f2937", lineHeight: 1.2 }}>{slot.meal?.name}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#3b82f6", whiteSpace: "nowrap" }}>
                        {slotProt}g prot.
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap", marginLeft: "4px" }}>
                        {Math.round(slot.meal?.totalKcal ?? 0)} kcal
                      </span>
                    </div>
                  </div>

                  {/* Ingredients — aligned columns */}
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "auto" }} />
                      <col style={{ width: "24px" }} />
                      <col style={{ width: "38px" }} />
                      <col style={{ width: "38px" }} />
                      <col style={{ width: "50px" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "1px 9px", fontSize: "7.5px", fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ingrediente</th>
                        <th style={{ padding: "1px 3px", fontSize: "7.5px", fontWeight: 700, color: "#9ca3af", textAlign: "center", textTransform: "uppercase" }}>Cat.</th>
                        <th style={{ padding: "1px 9px", fontSize: "7.5px", fontWeight: 700, color: "#9ca3af", textAlign: "right", textTransform: "uppercase" }}>Peso</th>
                        <th style={{ padding: "1px 4px", fontSize: "7.5px", fontWeight: 700, color: "#3b82f6", textAlign: "right", textTransform: "uppercase" }}>Prot.</th>
                        <th style={{ padding: "1px 9px", fontSize: "7.5px", fontWeight: 700, color: "#9ca3af", textAlign: "right", textTransform: "uppercase" }}>Kcal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slot.meal?.items?.map((item: any) => {
                        const prot = item.ingredient?.proteinsPer100g != null
                          ? Math.round(calcItemProt(item))
                          : null;
                        return (
                          <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "1.5px 9px", fontSize: "10px", fontWeight: 600, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.ingredient?.name ?? "—"}
                              {item.ingredient?.brand && <span style={{ fontWeight: 400, color: "#9ca3af", fontStyle: "italic", marginLeft: "3px" }}>({item.ingredient.brand})</span>}
                            </td>
                            <td style={{ padding: "1.5px 3px", textAlign: "center" }}>
                              {item.ingredient && (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: "13px", height: "13px", borderRadius: "50%",
                                  backgroundColor: CAT_HEX[item.ingredient.category as MacroCategory] ?? "#9ca3af",
                                  fontSize: "7px", fontWeight: 800, color: "white",
                                }}>
                                  {MACRO_SHORT[item.ingredient.category as MacroCategory]}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "1.5px 9px", textAlign: "right", fontSize: "9.5px", color: "#6b7280", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{item.weightGrams}g</td>
                            <td style={{ padding: "1.5px 4px", textAlign: "right", fontSize: "9.5px", fontWeight: 700, color: "#3b82f6", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                              {prot != null ? `${prot}g` : "—"}
                            </td>
                            <td style={{ padding: "1.5px 9px", textAlign: "right", fontSize: "9.5px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{Math.round(item.kcal)} kcal</td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="dp-footer">
        <div style={{ borderTop: "0.3pt solid #e5e7eb", paddingTop: "1.5mm", textAlign: "center" }}>
          <div style={{ fontSize: "7pt", fontWeight: 600, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "ui-sans-serif, system-ui, sans-serif", marginBottom: "1mm" }}>
            NutriPlan – Nutrizione Consapevole
          </div>
          <div style={{ fontSize: "6pt", color: "#9ca3af", letterSpacing: "0.01em", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
            Indicazioni fornite dal Dott. Ferdinando A. Giannone, esperto in nutrizione clinica. Contenuti di sua esclusiva proprietà. Vietata la riproduzione e divulgazione senza consenso preventivo.
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          .dp-printable, .dp-printable * { visibility: visible; }
          .dp-printable {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 210mm !important;
            padding: 10mm 14mm 22mm !important;
            box-sizing: border-box !important;
          }
          .dp-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 210mm !important;
            padding: 0 14mm 4mm !important;
            box-sizing: border-box !important;
            visibility: visible !important;
          }
        }
        .dp-footer { display: none; }
        @media print { .dp-footer { display: block !important; } }
      `}</style>
    </div>
  );
}

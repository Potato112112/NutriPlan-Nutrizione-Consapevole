import React from "react";
import { MEAL_TYPE_ICONS, MACRO_SHORT, MacroCategory, MealType, DAY_NAMES, ALL_MACRO_CATEGORIES } from "../types";

const CAT_COLOR: Record<string, string> = {
  carboidrati_complessi: "bg-amber-500",
  zuccheri_semplici: "bg-orange-500",
  proteine: "bg-blue-500",
  grassi: "bg-purple-500",
  minerali_vitamine_fibre: "bg-green-500",
  spezie_erbe_condimenti: "bg-pink-500",
  altro: "bg-gray-500",
  integratori: "bg-teal-500",
};

const CAT_LABEL: Record<string, string> = {
  carboidrati_complessi: "Carb.",
  zuccheri_semplici: "Zucc.",
  proteine: "Prot.",
  grassi: "Grassi",
  minerali_vitamine_fibre: "Vit.",
  spezie_erbe_condimenti: "Spezie",
  altro: "Altro",
  integratori: "Integ.",
};

function calcSlotProt(slot: any): number {
  return (slot.meal?.items ?? []).reduce((a: number, item: any) =>
    a + ((item.ingredient?.proteinsPer100g ?? 0) * item.weightGrams / 100), 0);
}

function collectNotes(days: any[]): { ingName: string; note: string }[] {
  const seen = new Set<string>();
  const result: { ingName: string; note: string }[] = [];
  for (const wd of days) {
    for (const slot of (wd.day?.slots ?? [])) {
      for (const item of (slot.meal?.items ?? [])) {
        const name = item.ingredient?.name;
        const note = item.ingredient?.notes;
        if (name && note && !seen.has(name)) {
          seen.add(name);
          result.push({ ingName: name, note });
        }
      }
    }
  }
  return result;
}

export function WeekPrintView({ week, onClose }: { week: any; onClose: () => void }) {
  const days = week.days ?? [];
  const numDays = Math.min(days.length, 7);
  const nutritionNotes = collectNotes(days);
  const [extraNotes, setExtraNotes] = React.useState("");

  return (
    <div className="fixed inset-0 z-50 bg-gray-200 overflow-auto">
      {/* Screen controls */}
      <div className="print:hidden flex items-center gap-3 p-4 bg-gray-100 border-b sticky top-0 z-10">
        <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200">
          ← Chiudi
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          🖨️ Stampa A4 Orizzontale
        </button>
        <span className="text-sm text-gray-500">Formato: A4 Orizzontale (Landscape)</span>
      </div>

      {/* Preview wrapper */}
      <div className="week-print-wrapper">
        <div className="week-print-page">

          {/* Header */}
          <div className="wp-header">
            <div>
              <div className="wp-label">Schema Alimentare Settimanale</div>
              <div className="wp-title">{week.name}</div>
              {week.notes && <div className="wp-week-notes">{week.notes}</div>}
            </div>
            <div className="wp-legend">
              {ALL_MACRO_CATEGORIES.map((cat) => (
                <div key={cat} className="wp-legend-item">
                  <span className={`wp-macro-dot ${CAT_COLOR[cat]}`}>{MACRO_SHORT[cat]}</span>
                  <span className="wp-legend-label">{CAT_LABEL[cat]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="wp-grid" style={{ gridTemplateColumns: `repeat(${numDays}, 1fr)` }}>
            {days.map((wd: any) => {
              const dayTotalProt = (wd.day?.slots ?? []).reduce((acc: number, slot: any) => acc + calcSlotProt(slot), 0);
              return (
                <div key={wd._id} className="wp-day">
                  {/* Day header */}
                  <div className="wp-day-header">
                    <div className="wp-day-name">{DAY_NAMES[wd.dayOfWeek]}</div>
                    {wd.day?.name && <div className="wp-day-subname">{wd.day.name}</div>}
                    {/* Kcal and prot side by side */}
                    <div className="wp-day-stats">
                      <span className="wp-day-kcal">{Math.round(wd.day?.totalKcal ?? 0)} kcal</span>
                      {dayTotalProt > 0 && <span className="wp-day-prot">{Math.round(dayTotalProt)}g prot.</span>}
                    </div>
                  </div>

                  {/* Slots */}
                  <div className="wp-slots">
                    {(wd.day?.slots ?? []).map((slot: any) => {
                      const sp = Math.round(calcSlotProt(slot));
                      return (
                        <div key={slot._id} className="wp-slot">
                          <div className="wp-slot-header">
                            <span className="wp-slot-icon">{MEAL_TYPE_ICONS[slot.mealType as MealType]}</span>
                            <span className="wp-slot-name">{slot.meal?.name}</span>
                            {/* Prot and kcal side by side */}
                            {sp > 0 && <span className="wp-slot-prot">{sp}g</span>}
                            <span className="wp-slot-kcal">{Math.round(slot.meal?.totalKcal ?? 0)}</span>
                          </div>
                          <div className="wp-ingredients">
                            {slot.meal?.items?.map((item: any) => (
                              <div key={item._id} className="wp-ing-row">
                                {item.ingredient && (
                                  <span className={`wp-ing-dot ${CAT_COLOR[item.ingredient.category] ?? "bg-gray-400"}`}>
                                    {MACRO_SHORT[item.ingredient.category as MacroCategory]}
                                  </span>
                                )}
                                <span className="wp-ing-name">{item.ingredient?.name}</span>
                                <span className="wp-ing-g">{item.weightGrams}g</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom row */}
          <div className="wp-bottom-row">

            {/* Indicazioni Extra */}
            <div className={`wp-extra-box${!extraNotes ? " wp-extra-empty" : ""}`}>
              <div className="wp-extra-title">✏️ Indicazioni Extra</div>
              <textarea
                className="wp-extra-textarea"
                placeholder="Scrivi qui indicazioni extra, consigli, varianti..."
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                rows={1}
              />
              <div className="wp-extra-print-text">{extraNotes}</div>
            </div>

            {/* Note Nutrizionali */}
            {nutritionNotes.length > 0 && (
              <div className="wp-notes-footer">
                <div className="wp-notes-footer-title">📋 Note Nutrizionali Ingredienti</div>
                <div className="wp-notes-footer-grid">
                  {nutritionNotes.map((n, i) => (
                    <div key={i} className="wp-note-item">
                      <span className="wp-note-ing">{n.ingName}:</span>
                      <span className="wp-note-text">{n.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Print footer */}
      <div className="wp-print-footer">
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
        /* ── Preview wrapper ── */
        .week-print-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 24px 16px 40px;
          min-height: calc(100vh - 65px);
          background: #d1d5db;
        }

        /* ── Page (sized like A4 landscape) ── */
        .week-print-page {
          background: white;
          width: 277mm;
          padding: 8mm 8mm 6mm;
          box-sizing: border-box;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          border-radius: 2px;
        }

        /* ── Header ── */
        .wp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 5px;
          padding-bottom: 4px;
          border-bottom: 2px solid #1f2937;
        }
        .wp-label      { font-size: 8px;  font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .wp-title      { font-size: 15px; font-weight: 800; color: #111827; line-height: 1.2; }
        .wp-week-notes { font-size: 9px;  color: #6b7280; margin-top: 2px; }
        .wp-legend     { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
        .wp-legend-item  { display: flex; align-items: center; gap: 3px; }
        .wp-legend-label { font-size: 9px; color: #4b5563; }

        /* ── Grid ── */
        .wp-grid {
          display: grid;
          gap: 5px;
        }

        /* ── Day column ── */
        .wp-day {
          border: 1.5px solid #d1d5db;
          border-radius: 5px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .wp-day-header {
          background: #1f2937;
          color: white;
          padding: 5px 6px 4px;
          text-align: center;
        }
        .wp-day-name    { font-size: 12px; font-weight: 800; color: #fff; line-height: 1.2; }
        .wp-day-subname { font-size: 8.5px; color: #d1d5db; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Kcal and prot side by side in day header */
        .wp-day-stats   { display: flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: wrap; }
        .wp-day-kcal    { font-size: 11px; font-weight: 700; color: #6ee7b7; line-height: 1.3; }
        .wp-day-prot    { font-size: 9.5px; font-weight: 600; color: #93c5fd; line-height: 1.2; }

        /* ── Slots ── */
        .wp-slots {
          flex: 1;
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ── Single meal slot ── */
        .wp-slot {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 4px 5px 3px;
        }
        .wp-slot-header {
          display: flex;
          align-items: center;
          gap: 3px;
          padding-bottom: 3px;
          margin-bottom: 3px;
          border-bottom: 1px solid #e5e7eb;
        }
        .wp-slot-icon { font-size: 11px; flex-shrink: 0; }
        .wp-slot-name { font-size: 10.5px; font-weight: 700; color: #1f2937; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        /* Prot shown before kcal, side by side */
        .wp-slot-prot { font-size: 9px; font-weight: 700; color: #3b82f6; flex-shrink: 0; }
        .wp-slot-kcal { font-size: 10px; font-weight: 700; color: #059669; flex-shrink: 0; margin-left: 2px; }

        /* ── Ingredients ── */
        .wp-ingredients {
          display: flex;
          flex-direction: column;
          gap: 2.5px;
        }
        .wp-ing-row {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .wp-ing-name { font-size: 9.5px; color: #374151; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wp-ing-g    { font-size: 9px; color: #6b7280; flex-shrink: 0; font-weight: 600; }

        /* ── Macro dots ── */
        .wp-macro-dot, .wp-ing-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }
        .wp-macro-dot { width: 14px; height: 14px; font-size: 8px; }
        .wp-ing-dot   { width: 12px; height: 12px; font-size: 7.5px; }

        /* ── Bottom row ── */
        .wp-bottom-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 6px;
        }

        /* ── Indicazioni Extra ── */
        .wp-extra-box {
          width: 100%;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 4px;
          padding: 3px 7px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
        }
        .wp-extra-title {
          font-size: 8px;
          font-weight: 700;
          color: #166534;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .wp-extra-textarea {
          flex: 1;
          font-size: 8.5px;
          color: #1f2937;
          border: 1px solid #d1fae5;
          border-radius: 3px;
          padding: 2px 5px;
          resize: none;
          background: white;
          line-height: 1.4;
          box-sizing: border-box;
          font-family: inherit;
          min-height: 22px;
          overflow: hidden;
        }
        .wp-extra-textarea:focus { outline: none; border-color: #6ee7b7; }
        .wp-extra-print-text {
          display: none;
          font-size: 8.5px;
          color: #1f2937;
          line-height: 1.4;
          white-space: pre-wrap;
          flex: 1;
        }

        /* ── Nutrition notes footer ── */
        .wp-notes-footer {
          width: 100%;
          padding: 5px 7px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 4px;
        }
        .wp-notes-footer-title {
          font-size: 8px;
          font-weight: 700;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 4px;
        }
        .wp-notes-footer-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3px 14px;
        }
        .wp-note-item {
          display: flex;
          gap: 3px;
          align-items: baseline;
        }
        .wp-note-ing  { font-size: 8px; font-weight: 700; color: #b45309; flex-shrink: 0; }
        .wp-note-text { font-size: 8px; color: #78350f; line-height: 1.4; }

        /* ── PRINT ── */
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden; }
          .week-print-page, .week-print-page * { visibility: visible; }
          .week-print-wrapper { visibility: hidden; }
          .week-print-page {
            position: fixed;
            top: 0; left: 0;
            width: 297mm;
            padding: 7mm 8mm 20mm;
            box-shadow: none;
            border-radius: 0;
            box-sizing: border-box;
          }
          .wp-extra-textarea { display: none !important; }
          .wp-extra-print-text { display: block !important; }
          .wp-extra-empty { display: none !important; }
          .wp-print-footer {
            position: fixed !important;
            bottom: 0 !important; left: 0 !important; right: 0 !important;
            width: 297mm !important; padding: 0 8mm 4mm !important;
            box-sizing: border-box !important; visibility: visible !important;
          }
        }
        .wp-print-footer { display: none; }
        @media print { .wp-print-footer { display: block !important; } }
      `}</style>
    </div>
  );
}

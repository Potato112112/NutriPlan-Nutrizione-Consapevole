import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";
import { IngredientsPage } from "./pages/IngredientsPage";
import { MealsPage } from "./pages/MealsPage";
import { DaysPage } from "./pages/DaysPage";
import { WeeksPage } from "./pages/WeeksPage";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import {
  UtensilsCrossed, Apple, CalendarDays, CalendarRange,
  LayoutDashboard, ShoppingCart
} from "lucide-react";

type Page = "dashboard" | "ingredients" | "meals" | "days" | "weeks" | "shopping";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster richColors position="top-right" />
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🥗</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">NutriPlan</h1>
              <p className="text-sm font-semibold text-emerald-600 tracking-wide mb-1">Nutrizione Consapevole</p>
              <p className="text-gray-500">Il tuo pianificatore alimentare personale</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

function AuthenticatedApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const user = useQuery(api.auth.loggedInUser);

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "ingredients", label: "Ingredienti", icon: <Apple size={18} /> },
    { id: "meals", label: "Pasti", icon: <UtensilsCrossed size={18} /> },
    { id: "days", label: "Giornate", icon: <CalendarDays size={18} /> },
    { id: "weeks", label: "Settimane", icon: <CalendarRange size={18} /> },
    { id: "shopping", label: "Lista Spesa", icon: <ShoppingCart size={18} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <div>
              <span className="font-bold text-gray-800 text-lg leading-none">NutriPlan</span>
              <span className="block text-[10px] font-semibold text-emerald-600 tracking-wide leading-none">Nutrizione Consapevole</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r bg-white print:hidden">
          <nav className="p-3 flex flex-col gap-1 sticky top-14">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  page === item.id
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6">
          {page === "dashboard" && <DashboardPage setPage={setPage} />}
          {page === "ingredients" && <IngredientsPage />}
          {page === "meals" && <MealsPage />}
          {page === "days" && <DaysPage />}
          {page === "weeks" && <WeeksPage />}
          {page === "shopping" && <ShoppingListPage />}
        </main>
      </div>

      {/* Footer */}
      <footer className="print:hidden border-t bg-white py-2.5 px-4 text-center print:hidden">
        <p className="text-[10px] text-gray-400 leading-relaxed max-w-4xl mx-auto">
          Le presenti indicazioni sono fornite dal{" "}
          <span className="font-semibold text-gray-500">Dott. Ferdinando A. Giannone</span>
          {" "}quale esperto in nutrizione clinica. I contenuti sono di sua esclusiva proprietà.{" "}
          <span className="font-medium">È vietata la riproduzione, l'utilizzo e la divulgazione a fini commerciali e non commerciali senza esplicito consenso preventivo.</span>
        </p>
      </footer>
    </div>
  );
}

function DashboardPage({ setPage }: { setPage: (p: Page) => void }) {
  const ingredients = useQuery(api.ingredients.list, {});
  const meals = useQuery(api.meals.list);
  const days = useQuery(api.days.list);
  const weeks = useQuery(api.weeks.list);
  const shoppingLists = useQuery(api.shopping.listLists);

  const cards = [
    { label: "Ingredienti", count: ingredients?.length ?? 0, icon: "🥦", color: "bg-green-50 border-green-200", page: "ingredients" as Page },
    { label: "Pasti", count: meals?.length ?? 0, icon: "🍽️", color: "bg-blue-50 border-blue-200", page: "meals" as Page },
    { label: "Giornate", count: days?.length ?? 0, icon: "📅", color: "bg-amber-50 border-amber-200", page: "days" as Page },
    { label: "Settimane", count: weeks?.length ?? 0, icon: "📆", color: "bg-purple-50 border-purple-200", page: "weeks" as Page },
    { label: "Liste Spesa", count: shoppingLists?.length ?? 0, icon: "🛒", color: "bg-rose-50 border-rose-200", page: "shopping" as Page },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Macro legend */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Legenda Macronutrienti</div>
        <div className="flex flex-wrap gap-3">
          {[
            { key: "C", label: "Carboidrati Complessi", color: "bg-amber-500" },
            { key: "Z", label: "Zuccheri Semplici", color: "bg-orange-500" },
            { key: "P", label: "Proteine", color: "bg-blue-500" },
            { key: "G", label: "Grassi", color: "bg-purple-500" },
            { key: "V", label: "Minerali / Vitamine / Fibre", color: "bg-green-500" },
            { key: "S", label: "Spezie, Erbe e Condimenti", color: "bg-pink-500" },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white ${color}`}>
                {key}
              </span>
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => setPage(card.page)}
            className={`${card.color} border rounded-xl p-5 text-left hover:shadow-md transition-shadow`}
          >
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{card.count}</div>
            <div className="text-sm text-gray-600">{card.label}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-700 mb-3">Come iniziare</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2"><span className="font-bold text-emerald-600">1.</span> Aggiungi gli <strong>ingredienti</strong> con kcal, macronutrienti e porzioni standard (S/M/L/XL)</li>
          <li className="flex gap-2"><span className="font-bold text-emerald-600">2.</span> Crea i <strong>pasti</strong> combinando ingredienti — le porzioni si auto-compilano</li>
          <li className="flex gap-2"><span className="font-bold text-emerald-600">3.</span> Componi le <strong>giornate alimentari</strong> con i pasti del giorno e stampa in A4 verticale</li>
          <li className="flex gap-2"><span className="font-bold text-emerald-600">4.</span> Pianifica le <strong>settimane</strong> assegnando una giornata per ogni giorno e stampa in A4 orizzontale</li>
          <li className="flex gap-2"><span className="font-bold text-emerald-600">5.</span> Genera la <strong>lista della spesa</strong> automaticamente da una settimana, con quantità, marche e note</li>
        </ol>
      </div>
    </div>
  );
}

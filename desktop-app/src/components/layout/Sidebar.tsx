import { Package, Compass, LayoutGrid, Bot, Settings as SettingsIcon, User as UserIcon, Crown, ArrowRight } from "lucide-react";
import { type User as FirebaseUser } from "firebase/auth";
import type { Plan } from "../../types";

interface SidebarProps {
  view: string;
  setView: (view: any) => void;
  theme: "dark" | "light";
  user: FirebaseUser | null;
  plan: Plan;
}

export const Sidebar = ({ view, setView, theme, user, plan }: SidebarProps) => {
  return (
    <aside
      className={`w-72 border-r flex flex-col relative z-30 ${
        theme === "dark"
          ? "bg-[#050d0d]/60 border-white/5 backdrop-blur-3xl"
          : "bg-white border-slate-200 shadow-xl"
      }`}
    >
      <div className="p-10">
        <h1
          className={`text-3xl font-black flex items-center gap-4 tracking-tighter bg-clip-text text-transparent ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#CFFFDC] to-[#68BA7F]"
              : "bg-gradient-to-br from-green-600 to-green-800"
          }`}
        >
          <Package
            className={`h-7 w-7 ${theme === "dark" ? "text-[#68BA7F]" : "text-green-600"}`}
          />{" "}
          Appztore
        </h1>
      </div>

      <nav className="flex-1 px-6 space-y-2">
        {[
          { id: "discover", label: "Discover", icon: Compass },
          { id: "my-apps", label: "My Apps", icon: LayoutGrid },
          { id: "ai-tools", label: "AI Tools", icon: Bot },
          { id: "settings", label: "Settings", icon: SettingsIcon },
          { id: "profile", label: "Profile", icon: UserIcon },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all font-bold ${
              view === item.id
                ? theme === "dark"
                  ? "bg-[#2E6F40]/20 text-[#CFFFDC]"
                  : "bg-green-100 text-green-800"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <item.icon className="h-5 w-5" /> {item.label}
          </button>
        ))}
      </nav>

      {/* Plan Status Indicator */}
      <div className="p-6">
        <button
          onClick={() => setView("profile")}
          className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left group ${
            theme === "dark"
              ? "bg-black/20 border-white/5 hover:bg-white/5 hover:border-[#68BA7F]/30"
              : "bg-slate-50 border-slate-200 shadow-sm hover:bg-white hover:border-green-300"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors overflow-hidden ${
              theme === "dark"
                ? "bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 group-hover:border-[#68BA7F]/50"
                : "bg-white border-slate-200"
            }`}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover" />
            ) : (
              <Crown className={`h-5 w-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`font-bold text-sm truncate ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {user?.displayName || "Guest Session"}
            </h4>
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  plan === "free" ? "bg-[#68BA7F]" : "bg-amber-400"
                } animate-pulse`}
              />
              <p className="text-[10px] font-black text-[#68BA7F] uppercase tracking-widest">
                {plan} • Profile
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
        </button>
      </div>
    </aside>
  );
};

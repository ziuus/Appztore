import { Star, Download, ShieldCheck } from "lucide-react";
import type { AppResult } from "../../types";
import { Card } from "../ui/card";

interface AppCardProps {
  app: AppResult;
  onClick: (app: AppResult) => void;
  theme: "dark" | "light";
}

export const AppCard = ({ app, onClick, theme }: AppCardProps) => {
  return (
    <Card
      onClick={() => onClick(app)}
      className={`group relative overflow-hidden rounded-[32px] border transition-all duration-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
        theme === "dark"
          ? "bg-[#0a1a1a]/40 border-white/5 hover:border-[#68BA7F]/40 hover:bg-[#0a1a1a]/60"
          : "bg-white border-slate-200 hover:border-green-300 shadow-sm hover:shadow-xl"
      }`}
    >
      <div className="aspect-[16/10] overflow-hidden relative">
        <img
          src={app.hero_image || app.icon_url}
          alt={app.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
            {app.category}
          </div>
        </div>
      </div>

      <div className="p-6 flex gap-5">
        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
          <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-black text-lg truncate ${theme === "dark" ? "text-[#CFFFDC]" : "text-slate-800"}`}>
              {app.name}
            </h3>
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-[10px] font-black">{app.rating}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-bold truncate mb-3 italic">
            by {app.developer}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Download className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {app.downloads}
              </span>
            </div>
            {app.source === "verified" && (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-[#68BA7F]" />
                <span className="text-[10px] font-black text-[#68BA7F] uppercase tracking-widest">
                  Verified
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

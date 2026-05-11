import { motion } from "framer-motion";
import { Package, X } from "lucide-react";

interface MyAppsViewProps {
  systemApps: any[];
  handleUninstall: (app: any) => void;
  theme: "dark" | "light";
}

export const MyAppsView = ({ systemApps, handleUninstall, theme }: MyAppsViewProps) => {
  return (
    <motion.div
      key="my-apps"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 py-12"
    >
      <div className="flex justify-between items-end">
        <h2 className="text-5xl font-black tracking-tighter">My Applications</h2>
        <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          {systemApps?.length || 0} Apps Detected
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systemApps.map((app) => (
          <div
            key={app.id}
            className={`p-6 rounded-[32px] border flex items-center gap-6 ${
              theme === "dark" ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center border border-white/5 overflow-hidden shrink-0">
              {app.icon_url ? (
                <img
                  src={app.icon_url}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://api.dicebear.com/7.x/initials/svg?seed=" +
                      app.name +
                      "&backgroundColor=030303&fontSize=45&fontFamily=Arial";
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-8 w-8 text-[#68BA7F]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-lg truncate">{app.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest opacity-60">
                  {app.source}
                </span>
                <span className="text-[10px] font-bold text-slate-500">v{app.version}</span>
              </div>
            </div>
            <button
              onClick={() => handleUninstall(app)}
              className="p-3 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

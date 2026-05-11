import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Monitor, ShieldCheck, Bot } from "lucide-react";
import type { AppResult } from "../../types";
import { SpotlightButton } from "./SpotlightButton";

interface AppDetailOverlayProps {
  selectedApp: AppResult | null;
  setSelectedApp: (app: AppResult | null) => void;
  handleInstall: (app: AppResult) => void;
  isAppInstalled: (app: AppResult) => boolean;
  theme: "dark" | "light";
}

export const AppDetailOverlay = ({
  selectedApp,
  setSelectedApp,
  handleInstall,
  isAppInstalled,
  theme,
}: AppDetailOverlayProps) => {
  return (
    <AnimatePresence>
      {selectedApp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center p-8 bg-black/80 backdrop-blur-2xl"
          onClick={() => setSelectedApp(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-[48px] border relative ${
              theme === "dark" ? "bg-[#0a1a1a] border-white/10" : "bg-white border-slate-200 shadow-2xl"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute top-8 right-8 z-50 p-4 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            <div className="relative h-96 w-full overflow-hidden bg-black">
              <img src={selectedApp.hero_image} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a1a] via-transparent to-transparent" />
              <div className="absolute bottom-12 left-12 flex items-end gap-8">
                <div className="w-32 h-32 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white/10 bg-black/50">
                  <img
                    src={
                      selectedApp.icon_url ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedApp.name}`
                    }
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://api.dicebear.com/7.x/identicon/svg?seed=" + selectedApp.name;
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mb-2">
                  <h2 className="text-6xl font-black tracking-tighter text-white">
                    {selectedApp.name}
                  </h2>
                  <p className="text-xl font-bold text-white/40 uppercase tracking-[0.2em] mt-2">
                    {selectedApp.developer}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2 space-y-10">
                  <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                      <span className="text-xl font-black">{selectedApp.rating}</span>
                    </div>
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-slate-400" />
                      <span className="text-xl font-black">{selectedApp.downloads}</span>
                    </div>
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" />
                      <span className="text-sm font-black uppercase tracking-widest text-[#68BA7F]">
                        Verified
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl font-black tracking-tight uppercase tracking-widest opacity-40">
                      Description
                    </h3>
                    <p
                      className={`text-xl leading-relaxed ${
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {selectedApp.description}
                    </p>
                  </div>

                  {/* AI Insight Section if applicable */}
                  <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#2E6F40]/10 to-[#68BA7F]/5 border border-[#68BA7F]/20">
                    <div className="flex items-center gap-4 mb-6">
                      <Bot className="h-8 w-8 text-[#68BA7F]" />
                      <h4 className="text-xl font-black">AI System Insights</h4>
                    </div>
                    <p className="text-slate-400 font-medium">
                      This application has been verified for security and performance. AI analysis
                      detects 0 conflicting dependencies on your current Linux kernel.
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div
                    className={`p-8 rounded-[40px] border ${
                      theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <h4 className="text-lg font-black mb-6 uppercase tracking-widest opacity-40">
                      Installation
                    </h4>
                    <SpotlightButton
                      onClick={() => handleInstall(selectedApp)}
                      className="w-full h-16 text-xl font-black mb-4"
                    >
                      {isAppInstalled(selectedApp) ? "Installed" : "Install Now"}
                    </SpotlightButton>
                    <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Source: {selectedApp.source}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-4">
                      <span className="text-sm font-bold text-slate-500">Version</span>
                      <span className="font-black">1.2.4</span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                      <span className="text-sm font-bold text-slate-500">Size</span>
                      <span className="font-black">84.2 MB</span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                      <span className="text-sm font-bold text-slate-500">Category</span>
                      <span className="font-black">{selectedApp.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

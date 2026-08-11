import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Activity, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import type { InstallState } from "../../types";

interface InstallProgressProps {
  installState: InstallState | null;
  theme: "dark" | "light";
}

export const InstallProgress = ({ installState, theme }: InstallProgressProps) => {
  const [showLogs, setShowLogs] = useState(true);

  return (
    <AnimatePresence>
      {installState && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={`fixed bottom-8 right-8 z-[300] w-[420px] p-6 rounded-[32px] border shadow-2xl backdrop-blur-3xl transition-all ${
            theme === "dark"
              ? "bg-[#0a1a1a]/95 border-[#68BA7F]/30 text-white"
              : "bg-white/95 border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2E6F40] to-[#68BA7F] flex items-center justify-center shadow-lg shrink-0">
              {installState.progress === 100 ? (
                <ShieldCheck className="h-6 w-6 text-black" />
              ) : (
                <Activity className="h-6 w-6 text-black animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm truncate">
                {installState.progress === 100 ? "Installation Complete" : "Installing Application"}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                {installState.step}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-black tracking-tighter">{installState.progress}%</span>
            </div>
          </div>

          <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${installState.progress}%` }}
              className="h-full bg-gradient-to-r from-[#2E6F40] to-[#68BA7F]"
            />
          </div>

          {/* Live Terminal Output Window */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-400 hover:text-white transition-colors py-1"
            >
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#68BA7F]">
                <Terminal className="h-3.5 w-3.5" /> Real-Time Output Stream
              </span>
              {showLogs ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>

            {showLogs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-2 p-3 rounded-2xl bg-black/80 font-mono text-[11px] text-emerald-400 max-h-40 overflow-y-auto border border-white/10 space-y-1 scrollbar-thin shadow-inner"
              >
                {installState.logs && installState.logs.length > 0 ? (
                  installState.logs.slice(-15).map((line, idx) => (
                    <div key={idx} className="leading-tight break-all opacity-90">
                      <span className="text-slate-500 mr-2">&gt;</span>
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">
                    &gt; {installState.currentLog || installState.step || "Connecting to package manager stream..."}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

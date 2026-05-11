import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Activity } from "lucide-react";
import type { InstallState } from "../../types";

interface InstallProgressProps {
  installState: InstallState | null;
  theme: "dark" | "light";
}

export const InstallProgress = ({ installState, theme }: InstallProgressProps) => {
  return (
    <AnimatePresence>
      {installState && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={`fixed bottom-8 right-8 z-[300] w-96 p-6 rounded-[32px] border shadow-2xl backdrop-blur-3xl ${
            theme === "dark" ? "bg-[#0a1a1a]/90 border-[#68BA7F]/30" : "bg-white/90 border-green-200"
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2E6F40] to-[#68BA7F] flex items-center justify-center shadow-lg">
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {installState.step}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black tracking-tighter">{installState.progress}%</span>
            </div>
          </div>
          <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${installState.progress}%` }}
              className="h-full bg-gradient-to-r from-[#2E6F40] to-[#68BA7F]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

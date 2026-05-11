import { motion } from "framer-motion";
import { Crown, ShieldCheck, X } from "lucide-react";
import { SpotlightButton } from "./SpotlightButton";
import type { Plan } from "../../types";

interface UpgradeModalProps {
  show: boolean;
  onClose: () => void;
  plan: Plan;
  theme: "dark" | "light";
}

export const UpgradeModal = ({ show, onClose, plan, theme }: UpgradeModalProps) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`max-w-4xl w-full p-12 rounded-[48px] border text-center relative overflow-hidden ${
          theme === "dark"
            ? "bg-[#0a1a1a] border-white/10 shadow-[0_0_100px_rgba(46,111,64,0.3)]"
            : "bg-white border-slate-200 shadow-2xl"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-500 hover:text-white"
        >
          <X className="h-8 w-8" />
        </button>
        <Crown className="h-20 w-20 text-amber-400 mx-auto mb-8 animate-bounce" />
        <h2 className="text-6xl font-black tracking-tighter mb-4">Upgrade Your Experience</h2>
        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto">
          Your Free trial has ended. Choose a plan to unlock unlimited installs, premium AI tools,
          and early access features.
        </p>
        <div className="grid grid-cols-3 gap-8 text-left">
          {/* Free Plan */}
          <div
            className={`p-10 rounded-[40px] border flex flex-col relative overflow-hidden ${
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
            }`}
          >
            {plan === "free" && (
              <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-slate-500/20 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-500/20">
                Current
              </div>
            )}
            <h3 className="text-3xl font-black mb-2">Appztore Free</h3>
            <p className="text-sm text-slate-500 mb-8 font-bold">For individual exploration</p>
            <div className="text-5xl font-black mb-10 tracking-tighter">
              $0<span className="text-lg opacity-40">/mo</span>
            </div>
            <ul className="space-y-4 mb-12">
              <li className="flex items-center gap-3 text-sm font-bold opacity-60">
                <ShieldCheck className="h-5 w-5 text-slate-500" /> Standard Repositories
              </li>
              <li className="flex items-center gap-3 text-sm font-bold opacity-60">
                <ShieldCheck className="h-5 w-5 text-slate-500" /> Basic AI Search
              </li>
              <li className="flex items-center gap-3 text-sm font-bold opacity-60">
                <ShieldCheck className="h-5 w-5 text-slate-500" /> Community Support
              </li>
            </ul>
            <SpotlightButton
              disabled
              variant="secondary"
              className="h-14 font-black text-lg mt-auto opacity-50"
            >
              Current Plan
            </SpotlightButton>
          </div>

          {/* Pro Plan */}
          <div
            className={`p-10 rounded-[40px] border flex flex-col ${
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
            }`}
          >
            <h3 className="text-3xl font-black mb-2">Appztore Pro</h3>
            <p className="text-sm text-slate-500 mb-8 font-bold">Best for individual creators</p>
            <div className="text-5xl font-black mb-10 tracking-tighter">
              $9<span className="text-lg opacity-40">/mo</span>
            </div>
            <ul className="space-y-4 mb-12">
              <li className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Unlimited Installs
              </li>
              <li className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Pro AI Search Models
              </li>
              <li className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Priority Support
              </li>
            </ul>
            <SpotlightButton variant="action" className="h-14 font-black text-lg mt-auto">
              Subscribe Pro
            </SpotlightButton>
          </div>

          {/* Max Plan */}
          <div
            className={`p-10 rounded-[40px] border border-[#68BA7F]/40 flex flex-col relative overflow-hidden ${
              theme === "dark" ? "bg-[#2E6F40]/10" : "bg-green-50"
            }`}
          >
            <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-[#68BA7F] text-black text-[10px] font-black uppercase tracking-widest">
              Most Popular
            </div>
            <h3 className="text-3xl font-black mb-2">Appztore Max</h3>
            <p className="text-sm text-slate-500 mb-8 font-bold">The ultimate power user setup</p>
            <div className="text-5xl font-black mb-10 tracking-tighter">
              $19<span className="text-lg opacity-40">/mo</span>
            </div>
            <ul className="space-y-4 mb-12">
              <li className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Everything in Pro
              </li>
              <li className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> 100GB Cloud Storage
              </li>
              <li className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Early Access SDK
              </li>
            </ul>
            <SpotlightButton variant="action" className="h-14 font-black text-lg mt-auto">
              Go Max
            </SpotlightButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

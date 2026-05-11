import { motion } from "framer-motion";
import { User as UserIcon, Crown } from "lucide-react";
import { type User as FirebaseUser } from "firebase/auth";
import { SpotlightButton } from "../shared/SpotlightButton";
import type { Plan } from "../../types";

interface ProfileViewProps {
  user: FirebaseUser | null;
  plan: Plan;
  installCount: number;
  systemApps: any[];
  handleSignOut: () => void;
  setShowUpgradeModal: (show: boolean) => void;
  theme: "dark" | "light";
  showDeveloperApps: boolean;
  setShowDeveloperApps: (show: boolean) => void;
}

export const ProfileView = ({
  user,
  plan,
  installCount,
  systemApps,
  handleSignOut,
  setShowUpgradeModal,
  theme,
  showDeveloperApps,
  setShowDeveloperApps,
}: ProfileViewProps) => {
  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-12 py-12"
    >
      <div className="flex items-center gap-8 mb-16">
        <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-[#2E6F40] to-[#68BA7F] flex items-center justify-center shadow-2xl overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="h-16 w-16 text-black" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-6xl font-black tracking-tighter truncate max-w-xl">
            {user?.displayName || "Guest User"}
          </h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-widest mt-2">
            {plan} Member • {user?.email || "No email"}
          </p>
        </div>
        <SpotlightButton variant="secondary" onClick={handleSignOut} className="px-8 h-12 font-black">
          Sign Out
        </SpotlightButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          className={`p-10 rounded-[48px] border ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl"
          }`}
        >
          <h3 className="text-2xl font-black mb-8 tracking-tight">Subscription</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">Current Tier</span>
              <span className="font-black uppercase text-[#68BA7F]">{plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">Billing Cycle</span>
              <span className="font-black">Monthly</span>
            </div>
            <div className="pt-6 border-t border-white/5">
              <SpotlightButton
                onClick={() => setShowUpgradeModal(true)}
                className="w-full h-12 font-black"
              >
                Manage Plan
              </SpotlightButton>
            </div>
          </div>
        </div>

        <div
          className={`p-10 rounded-[48px] border ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl"
          }`}
        >
          <h3 className="text-2xl font-black mb-8 tracking-tight">Account Usage</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">Total Installs</span>
              <span className="font-black">{installCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">Detected Apps</span>
              <span className="font-black">{systemApps?.length || 0}</span>
            </div>
            <div className="pt-6 border-t border-white/5">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">
                  Developer Mode
                </span>
                <input
                  type="checkbox"
                  checked={showDeveloperApps}
                  onChange={(e) => setShowDeveloperApps(e.target.checked)}
                  className="w-10 h-5 bg-slate-800 rounded-full appearance-none checked:bg-[#68BA7F] transition-all relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-5"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

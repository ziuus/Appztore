import { motion, AnimatePresence } from "framer-motion";
import { SpotlightButton } from "../shared/SpotlightButton";
import { ShieldCheck, Cpu } from "lucide-react";

interface OnboardingViewProps {
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  handleGoogleSignIn: () => void;
  theme: "dark" | "light";
  setView: (view: any) => void;
}

export const OnboardingView = ({
  onboardingStep,
  setOnboardingStep,
  handleGoogleSignIn,
  setView,
}: OnboardingViewProps) => {
  const handleDirectLaunch = () => {
    localStorage.setItem("appztore_setup_complete", "true");
    setView("discover");
  };

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-[#081212] flex items-center justify-center p-8"
    >
      <div className="fixed inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[#2E6F40]/20 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-[#68BA7F]/10 blur-[150px]" />
      </div>

      <AnimatePresence mode="wait">
        {onboardingStep === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-xl text-center space-y-10 relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E6F40]/20 border border-[#68BA7F]/30 text-[#CFFFDC] text-xs font-bold font-mono">
              <ShieldCheck className="h-4 w-4 text-[#68BA7F]" /> Pure Native Linux Orchestrator
            </div>

            <h2 className="text-7xl font-black tracking-tighter leading-[0.85] text-[#CFFFDC]">
              Welcome to <br />
              <span className="text-[#68BA7F]">Appztore.</span>
            </h2>

            <p className="text-lg text-slate-400 font-bold leading-relaxed max-w-lg mx-auto">
              Universal package search, security auditing, and one-click installation across Pacman, Flatpak, AUR, Snap, and Docker.
            </p>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <SpotlightButton
                variant="action"
                onClick={handleDirectLaunch}
                className="px-12 h-16 text-xl font-black w-full sm:w-auto"
              >
                Launch Appztore Store
              </SpotlightButton>
              <button
                onClick={() => setOnboardingStep(2)}
                className="px-8 h-16 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 hover:text-white transition-all text-base w-full sm:w-auto"
              >
                Configure Registries
              </button>
            </div>

            <div className="pt-4">
              <button
                onClick={handleGoogleSignIn}
                className="text-xs text-slate-500 hover:text-slate-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Optional: Sign in with Google Account
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-xl text-center space-y-10 relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
              <Cpu className="h-4 w-4 text-[#68BA7F]" /> System Package Detection
            </div>

            <h2 className="text-7xl font-black tracking-tighter leading-[0.85] text-[#CFFFDC]">
              Detected <br />
              <span className="text-[#68BA7F]">Registries.</span>
            </h2>

            <p className="text-lg text-slate-400 font-bold leading-relaxed">
              Your system package managers are detected and ready for unified search.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {["Pacman", "Flatpak", "AUR (Yay)", "Docker"].map((src) => (
                <div
                  key={src}
                  className="p-6 rounded-3xl border border-[#68BA7F]/30 bg-[#2E6F40]/10 text-[#CFFFDC] font-black text-center flex items-center justify-center gap-2 shadow-inner"
                >
                  <ShieldCheck className="h-4 w-4 text-[#68BA7F]" /> {src}
                </div>
              ))}
            </div>

            <div className="pt-6">
              <SpotlightButton
                variant="action"
                onClick={handleDirectLaunch}
                className="px-16 h-16 text-xl font-black w-full sm:w-auto"
              >
                Start Exploring Packages
              </SpotlightButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

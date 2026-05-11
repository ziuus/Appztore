import { motion, AnimatePresence } from "framer-motion";
import { SpotlightButton } from "../shared/SpotlightButton";

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
  theme,
  setView,
}: OnboardingViewProps) => {
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
            className="max-w-xl text-center space-y-12 relative z-10"
          >
            <h2 className="text-8xl font-black tracking-tighter leading-[0.8] text-[#CFFFDC]">
              Welcome to <br />
              <span className="text-[#68BA7F]">Appztore.</span>
            </h2>
            <p className="text-xl text-slate-500 font-bold leading-relaxed">
              Your Linux experience, unified. Let's get your workstation synchronized with the cloud.
            </p>
            <div className="pt-8">
              <SpotlightButton
                variant="action"
                onClick={handleGoogleSignIn}
                className="px-16 h-20 text-2xl font-black"
              >
                Sign in with Google
              </SpotlightButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-xl text-center space-y-12 relative z-10"
          >
            <h2 className="text-8xl font-black tracking-tighter leading-[0.8] text-[#CFFFDC]">
              Personalize <br />
              <span className="text-[#68BA7F]">Workstation.</span>
            </h2>
            <p className="text-xl text-slate-500 font-bold leading-relaxed">
              Choose your primary registries. You can always change this in settings later.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {["Pacman", "Flatpak", "AUR", "Snap"].map((src) => (
                <button
                  key={src}
                  className="p-6 rounded-3xl border border-white/10 bg-white/5 font-black hover:border-[#68BA7F] transition-all"
                >
                  {src}
                </button>
              ))}
            </div>
            <div className="pt-8">
              <SpotlightButton
                variant="action"
                onClick={() => {
                  localStorage.setItem("appztore_setup_complete", "true");
                  setView("discover");
                }}
                className="px-16 h-16 text-xl font-black"
              >
                Finalize Setup
              </SpotlightButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

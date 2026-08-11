import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DiscoverView } from "./components/views/DiscoverView";
import { MyAppsView } from "./components/views/MyAppsView";
import { AIToolsView } from "./components/views/AIToolsView";
import { SettingsView } from "./components/views/SettingsView";
import { ProfileView } from "./components/views/ProfileView";
import { OnboardingView } from "./components/views/OnboardingView";
import { UpgradeModal } from "./components/shared/UpgradeModal";
import { InstallProgress } from "./components/shared/InstallProgress";
import { AppDetailOverlay } from "./components/shared/AppDetailOverlay";

// Hooks
import { useAuth } from "./hooks/useAuth";
import { useSearch } from "./hooks/useSearch";
import { useInstall } from "./hooks/useInstall";
import { useFeaturedData } from "./hooks/useFeaturedData";

// Types
import type { View, Plan, AppResult } from "./types";

export default function App() {
  // --- State ---
  const [view, setView] = useState<View>(() => {
    return localStorage.getItem("appztore_setup_complete") === "true" ? "discover" : "onboarding";
  });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem("appztore_api_key");
  });
  const [aiProvider, setAiProvider] = useState<string | null>(() => {
    return localStorage.getItem("appztore_ai_provider") || "auto";
  });
  const [aiModel, setAiModel] = useState<string | null>(() => {
    return localStorage.getItem("appztore_ai_model");
  });
  const [plan, setPlan] = useState<Plan>(() => {
    return (localStorage.getItem("appztore_plan") as Plan) || "free";
  });
  const [showDeveloperApps, setShowDeveloperApps] = useState<boolean>(true);
  const [selectedApp, setSelectedApp] = useState<AppResult | null>(null);

  // --- Hooks ---
  const { user, handleGoogleSignIn, handleSignOut } = useAuth();
  const {
    query,
    setQuery,
    isSearching,
    results,
    setResults,
    searchHistory,
    handleSearch,
    clearHistory,
  } = useSearch(apiKey, aiProvider, aiModel);

  const {
    installState,
    installCount,
    systemApps,
    showUpgradeModal,
    setShowUpgradeModal,
    handleInstall,
    handleUninstall,
    isAppInstalled,
  } = useInstall(plan, results, apiKey, aiProvider, aiModel);

  const { featuredData } = useFeaturedData(view);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem("appztore_plan", plan);
  }, [plan]);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("appztore_api_key", apiKey);
    } else {
      localStorage.removeItem("appztore_api_key");
    }
  }, [apiKey]);

  useEffect(() => {
    if (aiProvider && aiProvider !== "auto") {
      localStorage.setItem("appztore_ai_provider", aiProvider);
    } else {
      localStorage.removeItem("appztore_ai_provider");
    }
  }, [aiProvider]);

  useEffect(() => {
    if (aiModel) {
      localStorage.setItem("appztore_ai_model", aiModel);
    } else {
      localStorage.removeItem("appztore_ai_model");
    }
  }, [aiModel]);

  // --- Handlers ---
  const onSearch = (e: React.FormEvent, customQuery?: string) => {
    setView("search");
    handleSearch(e, customQuery);
  };

  const onGoogleSignIn = async () => {
    try {
      await handleGoogleSignIn();
      setOnboardingStep(2);
    } catch (error) {
      console.error("Sign-in error", error);
    }
  };

  const onSignOut = async () => {
    await handleSignOut();
    setView("onboarding");
    setOnboardingStep(1);
  };

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${
        theme === "dark" ? "bg-[#081212] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <AnimatePresence mode="wait">
        {view === "onboarding" ? (
          <OnboardingView
            onboardingStep={onboardingStep}
            setOnboardingStep={setOnboardingStep}
            handleGoogleSignIn={onGoogleSignIn}
            theme={theme}
            setView={setView}
          />
        ) : (
          <>
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none opacity-60 overflow-hidden">
              <div
                className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] ${
                  theme === "dark" ? "bg-[#2E6F40]/20" : "bg-green-200/40"
                }`}
              />
              <div
                className={`absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] ${
                  theme === "dark" ? "bg-[#68BA7F]/15" : "bg-blue-100/30"
                }`}
              />
            </div>

            <Sidebar view={view} setView={setView} theme={theme} user={user} plan={plan} />

            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
              <Header
                query={query}
                setQuery={setQuery}
                handleSearch={onSearch}
                searchHistory={searchHistory}
                clearHistory={clearHistory}
                theme={theme}
                isSearching={isSearching}
              />

              <div className="flex-1 overflow-y-auto px-12">
                <AnimatePresence mode="wait">
                  {isSearching ? (
                    <motion.div
                      key="searching"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col items-center justify-center h-full py-20"
                    >
                      <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden mb-8">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#2E6F40] to-[#68BA7F]"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                      <h3 className="text-2xl font-black tracking-tighter animate-pulse">
                        AI Brain Resolving Intent...
                      </h3>
                      <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">
                        Searching across multiple Linux sources
                      </p>
                    </motion.div>
                  ) : view === "discover" || view === "search" ? (
                    <DiscoverView
                      results={results}
                      query={query}
                      setQuery={setQuery}
                      handleSearch={onSearch}
                      theme={theme}
                      featuredData={featuredData}
                      setSelectedApp={setSelectedApp}
                      handleInstall={handleInstall}
                      isAppInstalled={isAppInstalled}
                      setResults={setResults}
                    />
                  ) : view === "my-apps" ? (
                    <MyAppsView
                      systemApps={systemApps}
                      handleUninstall={handleUninstall}
                      theme={theme}
                    />
                  ) : view === "ai-tools" ? (
                    <AIToolsView
                      theme={theme}
                      onSearchQuery={(q) => onSearch({ preventDefault: () => {} } as any, q)}
                    />
                   ) : view === "settings" ? (
                     <SettingsView
                       theme={theme}
                       setTheme={setTheme}
                       showDeveloperApps={showDeveloperApps}
                       setShowDeveloperApps={setShowDeveloperApps}
                       apiKey={apiKey}
                       setApiKey={setApiKey}
                       aiProvider={aiProvider}
                       setAiProvider={setAiProvider}
                       aiModel={aiModel}
                       setAiModel={setAiModel}
                     />
                   ) : view === "profile" ? (
                    <ProfileView
                      user={user}
                      plan={plan}
                      installCount={installCount}
                      systemApps={systemApps}
                      handleSignOut={onSignOut}
                      setShowUpgradeModal={setShowUpgradeModal}
                      theme={theme}
                      showDeveloperApps={showDeveloperApps}
                      setShowDeveloperApps={setShowDeveloperApps}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </main>
          </>
        )}
      </AnimatePresence>

      <UpgradeModal
        show={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        plan={plan}
        theme={theme}
      />

      <InstallProgress installState={installState} theme={theme} />

      <AppDetailOverlay
        selectedApp={selectedApp}
        setSelectedApp={setSelectedApp}
        handleInstall={handleInstall}
        isAppInstalled={isAppInstalled}
        theme={theme}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { Card } from "./components/ui/card";
import {
  Search,
  Package,
  LayoutGrid,
  Star,
  Compass,
  Zap,
  Gamepad2,
  Code,
  Music,
  Palette,
  X,
  ShieldCheck,
  Users,
  Box,
  Server,
  Activity,
  ArrowLeft,
  Sparkles,
  Settings as SettingsIcon,
  Crown,
  Monitor,
  Video,
  MessageSquare,
  Bot,
  Brain,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  User as UserIcon,
} from "lucide-react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";

const API_BASE = "http://localhost:8000";
const API_TOKEN = ""; // Placeholder for potential API token

// Spotlight Button Component with Cursor tracking
const SpotlightButton = ({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: (e: any) => void;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "action";
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const variants = {
    primary: "bg-[#2E6F40] text-[#CFFFDC] border-[#68BA7F]/20",
    secondary: "bg-white/5 border-white/10 text-white/70",
    ghost: "bg-transparent border-transparent text-white/40",
    action:
      "bg-gradient-to-r from-[#2E6F40] to-[#68BA7F] text-black font-black",
  };

  return (
    <button
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(104, 186, 127, 0.15), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </button>
  );
};

const CATEGORIES = [
  { name: "Productivity", icon: Zap, color: "text-blue-400" },
  { name: "Gaming", icon: Gamepad2, color: "text-purple-400" },
  { name: "Development", icon: Code, color: "text-green-400" },
  { name: "Audio & Music", icon: Music, color: "text-amber-400" },
  { name: "Design", icon: Palette, color: "text-pink-400" },
  { name: "Video", icon: Video, color: "text-red-400" },
  { name: "Communication", icon: MessageSquare, color: "text-cyan-400" },
  { name: "AI Tools", icon: Bot, color: "text-emerald-400" },
];

type Plan = "free" | "pro" | "max";

interface AppResult {
  id: string;
  name: string;
  description: string;
  developer: string;
  icon_url: string;
  hero_image: string;
  rating: number;
  downloads: string;
  category: string;
  install_command: string;
  source?: string;
  // Add other properties if needed
}

interface InstallState {
  id: string;
  step: string;
  progress: number;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [searchTab, setSearchTab] = useState<"verified" | "web">("verified");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AppResult[] | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppResult | null>(null);
  const [featuredData, setFeaturedData] = useState<any>(null);
  const [view, setView] = useState<
    "onboarding" | "discover" | "my-apps" | "ai-tools" | "settings" | "profile"
  >(() => {
    return localStorage.getItem("appztore_setup_complete") === "true" ? "discover" : "onboarding";
  });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "pacman",
    "flatpak",
  ]);
  const [showInstallDetails, setShowInstallDetails] = useState(false);
  const [installInsight, setInstallInsight] = useState<any>(null);
  const [systemApps, setSystemApps] = useState<any[]>([]);
  const [plan, setPlan] = useState<Plan>(() => {
    return (localStorage.getItem("appztore_plan") as Plan) || "free";
  });
  const [installCount, setInstallCount] = useState<number>(() => {
    return parseInt(localStorage.getItem("appztore_install_count") || "0");
  });
  const [installedApps, setInstalledApps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("appztore_installed_apps");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem("appztore_plan", plan);
  }, [plan]);

  useEffect(() => {
    localStorage.setItem("appztore_install_count", installCount.toString());
  }, [installCount]);

  useEffect(() => {
    localStorage.setItem("appztore_installed_apps", JSON.stringify(Array.from(installedApps)));
  }, [installedApps]);

  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showDeveloperApps, setShowDeveloperApps] = useState<boolean>(true);
  const [installState, setInstallState] = useState<InstallState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(unsubscribeUser(currentUser));
    });
    return () => unsubscribe();
  }, []);

  const unsubscribeUser = (u: FirebaseUser | null) => {
    if (u) {
      // In a real app, you'd sync with your backend here
      localStorage.setItem("appztore_user_id", u.uid);
    } else {
      localStorage.removeItem("appztore_user_id");
    }
    return u;
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      // Proceed to step 2 after sign in
      setOnboardingStep(2);
    } catch (error) {
      console.error("Google Sign-In failed", error);
      setErrorMessage("Authentication failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setView("onboarding");
      setOnboardingStep(1);
    } catch (error) {
      console.error("Sign-out failed", error);
    }
  };

  const placeholders = [
    "What are we building today?",
    "Find your next favorite game...",
    "Explore AI-powered workflows...",
    "Search for system utilities...",
    "Discover premium dev tools...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all system apps and featured data
  const fetchSystemApps = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/system/apps`);
      const data = await res.json();
      setSystemApps(data.apps);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (view === "my-apps") fetchSystemApps();

    const fetchFeaturedData = async () => {
      console.log("Fetching featured data...");
      try {
        const platform = navigator.platform.toLowerCase();
        let os = "linux";
        if (platform.includes("win")) os = "windows";
        else if (platform.includes("mac")) os = "macos";

        const res = await fetch(`${API_BASE}/api/v1/featured?os=${os}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Featured data fetched successfully:", data);
        setFeaturedData(data);
      } catch (e) {
        console.error("Failed to fetch featured data", e);
      }
    };

    if (view === "discover") {
      fetchFeaturedData();
    }
  }, [view]);

  // Set up Tauri install-progress listener - MOVED TO TOP LEVEL
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupTauri = async () => {
      try {
        const unlistenFn = await tauriListen(
          "install-progress",
          async (event: any) => {
            setInstallState(event.payload);
            
            // Handle Success with Verification
            if (event.payload.step === "Done") {
              const app = results?.find(a => a.id === event.payload.id) || 
                          systemApps?.find((a: any) => a.id === event.payload.id);
              
              if (app) {
                setInstallState(prev => prev ? { ...prev, step: "Verifying installation..." } : null);
                try {
                  const verifyRes = await fetch(`${API_BASE}/api/v1/install/verify`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      app_id: app.id, 
                      name: app.name,
                      source: app.source 
                    }),
                  });
                  const verifyData = await verifyRes.json();
                  if (verifyData.installed) {
                    setInstallState(prev => prev ? { ...prev, step: `Verified! Available at ${verifyData.binary_path || "system path"}`, progress: 100 } : null);
                  } else {
                    setInstallState(prev => prev ? { ...prev, step: "Verification failed. Check system logs.", progress: 100 } : null);
                  }
                } catch (e) {
                  console.error("Verification error:", e);
                }
              }
              
              setInstalledApps((prev) => new Set([...prev, event.payload.id]));
              setTimeout(() => setInstallState(null), 5000);
            }

            // Handle Failure with AI Analysis
            if (event.payload.step.includes("failed") && event.payload.log) {
              const app = results?.find(a => a.id === event.payload.id);
              try {
                const analysisRes = await fetch(`${API_BASE}/api/v1/install/analyze-error`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    app_id: event.payload.id, 
                    logs: event.payload.log,
                    command: app?.install_command 
                  }),
                });
                const analysis = await analysisRes.json();
                setInstallState(prev => prev ? { 
                  ...prev, 
                  step: `AI Analysis: ${analysis.reason}`,
                  log: `Fix Suggestion: ${analysis.fix_command || "Manual check required"}`
                } : null);
              } catch (e) {
                console.error("Analysis error:", e);
              }
            }
          },
        );
        unlisten = unlistenFn as unknown as () => void;
      } catch (e) {
        console.error("Tauri listen failed", e);
      }
    };
    setupTauri();
    return () => {
      if (unlisten) unlisten();
    };
  }, [results, systemApps]);

  const handleInstall = async (app: any) => {
    if (plan === "free" && installCount >= 1 && !isAppInstalled(app)) {
      setShowUpgradeModal(true);
      return;
    }

    // Get AI Insight first
    try {
      const res = await fetch(`${API_BASE}/api/v1/install/insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: app.id }),
      });
      const insight = await res.json();
      setInstallInsight(insight);
    } catch (e) {
      console.error(e);
    }

    setInstallState({ id: app.id, step: "Authenticating...", progress: 5 });
    setInstallCount((prev) => prev + 1);
    invoke("install_app", {
      appId: app.id,
      installCommand: app.install_command,
    });
  };

  // Helper to check if app is installed natively or tracked in local storage
  const isAppInstalled = (app: any) => {
    if (!app) return false;
    if (installedApps.has(app.id)) return true;
    
    const appNameLower = app.name.toLowerCase();
    const appIdLower = app.id.toLowerCase();
    
    return systemApps.some((sysApp: any) => {
      const sysNameLower = sysApp.name.toLowerCase();
      const sysIdLower = sysApp.id.toLowerCase();
      // Match common identifiers across package managers (e.g. "org.videolan.vlc" vs "vlc")
      return sysIdLower.includes(appIdLower) || 
             appIdLower.includes(sysIdLower) ||
             (sysNameLower === appNameLower);
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 25000);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const platform = navigator.platform.toLowerCase();
      let os = "linux";
      if (platform.includes("win")) os = "windows";
      else if (platform.includes("mac")) os = "macos";

      const response = await fetch(`${API_BASE}/api/v1/search`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({ query, os }),
      });
      clearTimeout(id);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data.results);
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        setErrorMessage("Search timed out. Please try again.");
      } else {
        setErrorMessage("Search failed. Please try again.");
      }
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${theme === "dark" ? "bg-[#081212] text-white" : "bg-slate-50 text-slate-900"}`}
    >
      <AnimatePresence mode="wait">
        {view === "onboarding" ? (
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
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-2xl text-center space-y-8 relative z-10"
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-[#CFFFDC] to-[#68BA7F] rounded-[40px] mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(104,186,127,0.3)]">
                    <Package className="h-16 w-16 text-black" />
                  </div>
                  <h1 className="text-7xl font-black tracking-tighter">
                    Welcome to the Future of Apps.
                  </h1>
                  <p className="text-xl text-white/40 font-medium">
                    Appztore uses advanced AI to manage your workstation.
                    Sign in to sync your tools across all your devices.
                  </p>
                  <div className="flex flex-col gap-4 items-center">
                    <SpotlightButton
                      onClick={handleGoogleSignIn}
                      className="px-12 h-16 text-xl font-black flex items-center gap-4"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/hf/google.svg" className="h-6 w-6 bg-white rounded-full p-1" />
                      Continue with Google
                    </SpotlightButton>
                    <button 
                      onClick={() => setOnboardingStep(2)}
                      className="text-white/20 hover:text-white/40 font-bold uppercase tracking-widest text-[10px] transition-colors"
                    >
                      Continue as Guest
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="max-w-4xl w-full space-y-12 relative z-10"
                >
                  <div className="text-center space-y-4">
                    <h2 className="text-5xl font-black tracking-tighter">
                      Configure Your Sources
                    </h2>
                    <p className="text-white/40 font-bold">
                      Select the package managers you want Appztore to manage.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { id: "pacman", name: "Arch Native", desc: "Stable & Core", icon: ShieldCheck },
                      { id: "yay", name: "AUR", desc: "Community Driven", icon: Users },
                      { id: "flatpak", name: "Flatpak", desc: "Universal Sandbox", icon: Box },
                      { id: "docker", name: "Docker", desc: "Containerized", icon: Layers },
                      { id: "appimage", name: "AppImage", desc: "Portable Exec", icon: Zap },
                      { id: "npm", name: "NPM/Web", desc: "JS Ecosystem", icon: Code },
                      { id: "steam", name: "Steam", desc: "Gaming/Proton", icon: Gamepad2 },
                      { id: "wine", name: "Wine/Windows", desc: "Cross-Platform", icon: Monitor },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          setSelectedSources((prev) =>
                            prev.includes(s.id)
                              ? prev.filter((x) => x !== s.id)
                              : [...prev, s.id],
                          )
                        }
                        className={`p-8 rounded-[32px] border transition-all text-left space-y-4 ${selectedSources.includes(s.id) ? "bg-[#2E6F40]/20 border-[#68BA7F]/50 shadow-[0_0_30px_rgba(104,186,127,0.1)]" : "bg-white/5 border-white/5 opacity-40"}`}
                      >
                        <s.icon className={`h-8 w-8 ${selectedSources.includes(s.id) ? "text-[#CFFFDC]" : "text-white/20"}`} />
                        <div>
                          <h4 className="font-black text-sm">{s.name}</h4>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <SpotlightButton
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
        ) : null}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none opacity-60 overflow-hidden">
        <div
          className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] ${theme === "dark" ? "bg-[#2E6F40]/20" : "bg-green-200/40"}`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] ${theme === "dark" ? "bg-[#68BA7F]/15" : "bg-blue-100/30"}`}
        />
      </div>

      <aside
        className={`w-72 border-r flex flex-col relative z-30 ${theme === "dark" ? "bg-[#050d0d]/60 border-white/5 backdrop-blur-3xl" : "bg-white border-slate-200 shadow-xl"}`}
      >
        <div className="p-10">
          <h1
            className={`text-3xl font-black flex items-center gap-4 tracking-tighter bg-clip-text text-transparent ${theme === "dark" ? "bg-gradient-to-br from-[#CFFFDC] to-[#68BA7F]" : "bg-gradient-to-br from-green-600 to-green-800"}`}
          >
            <Package
              className={`h-7 w-7 ${theme === "dark" ? "text-[#68BA7F]" : "text-green-600"}`}
            />{" "}
            Appztore
          </h1>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <button
            onClick={() => setView("discover")}
            className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all font-bold ${view === "discover" ? (theme === "dark" ? "bg-[#2E6F40]/20 text-[#CFFFDC]" : "bg-green-100 text-green-800") : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}
          >
            <Compass className="h-5 w-5" /> Discover
          </button>
          <button
            onClick={() => setView("my-apps")}
            className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all font-bold ${view === "my-apps" ? (theme === "dark" ? "bg-[#2E6F40]/20 text-[#CFFFDC]" : "bg-green-100 text-green-800") : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}
          >
            <LayoutGrid className="h-5 w-5" /> My Apps
          </button>
          <button
            onClick={() => setView("ai-tools")}
            className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all font-bold ${view === "ai-tools" ? (theme === "dark" ? "bg-[#2E6F40]/20 text-[#CFFFDC]" : "bg-green-100 text-green-800") : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}
          >
            <Bot className="h-5 w-5" /> AI Tools
          </button>
          <button
            onClick={() => setView("settings")}
            className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all font-bold ${view === "settings" ? (theme === "dark" ? "bg-[#2E6F40]/20 text-[#CFFFDC]" : "bg-green-100 text-green-800") : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}
          >
            <SettingsIcon className="h-5 w-5" /> Settings
          </button>
          <button
            onClick={() => setView("profile")}
            className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-all font-bold ${view === "profile" ? (theme === "dark" ? "bg-[#2E6F40]/20 text-[#CFFFDC]" : "bg-green-100 text-green-800") : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}
          >
            <UserIcon className="h-5 w-5" /> Profile
          </button>
        </nav>

        {/* Plan Status Indicator */}
        <div className="p-6">
          <button
            onClick={() => setView("profile")}
            className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left group ${theme === "dark" ? "bg-black/20 border-white/5 hover:bg-white/5 hover:border-[#68BA7F]/30" : "bg-slate-50 border-slate-200 shadow-sm hover:bg-white hover:border-green-300"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors overflow-hidden ${theme === "dark" ? "bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 group-hover:border-[#68BA7F]/50" : "bg-white border-slate-200"}`}>
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-full h-full object-cover" />
              ) : (
                <Crown className={`h-5 w-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm truncate ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                {user?.displayName || "Guest Session"}
              </h4>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${plan === "free" ? "bg-[#68BA7F]" : "bg-amber-400"} animate-pulse`} />
                <p className="text-[10px] font-black text-[#68BA7F] uppercase tracking-widest">
                  {plan} • Profile
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="px-12 pt-12 pb-8 bg-transparent z-20 sticky top-0">
          <form
            onSubmit={handleSearch}
            className="max-w-4xl mx-auto relative group"
          >
            <div
              className={`absolute -inset-1 bg-gradient-to-r from-[#2E6F40]/40 to-[#68BA7F]/40 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700`}
            />
            <div className="relative flex items-center">
              <Search className="absolute left-6 h-6 w-6 text-slate-400 opacity-50 z-20" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`pl-16 h-16 w-full text-xl rounded-2xl outline-none border transition-all relative z-10 ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/10 text-white backdrop-blur-2xl focus:border-[#68BA7F]/50" : "bg-white/50 border-slate-200 text-slate-900 focus:border-green-500 shadow-sm"}`}
              />
              {!query && (
                <div className="absolute left-16 pointer-events-none overflow-hidden h-6 flex items-center z-20">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={placeholderIndex}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className={`text-xl font-medium ${theme === "dark" ? "text-white/20" : "text-slate-400"}`}
                    >
                      {placeholders[placeholderIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}
              <Sparkles
                className={`absolute right-6 h-5 w-5 z-20 ${theme === "dark" ? "text-[#68BA7F]" : "text-green-600"} animate-pulse`}
              />
            </div>
          </form>
        </header>

        <div className="flex-1 overflow-y-auto px-12 pb-12 relative z-10 scroll-smooth">
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center space-y-8"
              >
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-t-4 border-b-4 border-[#68BA7F] animate-spin" />
                  <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-[#68BA7F] animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter animate-pulse">
                    AI is analyzing registries...
                  </h3>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                    Searching Pacman, AUR, Flatpak, and Docker Hub
                  </p>
                </div>
              </motion.div>
            ) : errorMessage ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center space-y-6"
              >
                <div className="p-6 rounded-full bg-red-500/10 border border-red-500/20">
                  <X className="h-12 w-12 text-red-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black tracking-tighter text-red-500">
                    Search Error
                  </h3>
                  <p className="text-slate-500 font-bold mt-2">{errorMessage}</p>
                </div>
                <SpotlightButton
                  onClick={() => setErrorMessage(null)}
                  className="px-8 h-12 font-black"
                >
                  Clear Error
                </SpotlightButton>
              </motion.div>
            ) : view === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto space-y-12 py-12"
              >
                <h2 className="text-5xl font-black tracking-tighter">
                  Settings
                </h2>
                <div className="space-y-6">
                  <div
                    className={`p-8 rounded-[32px] border flex items-center justify-between ${theme === "dark" ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}
                  >
                    <div>
                      <h4 className="font-bold text-lg">Theme Mode</h4>
                      <p className="text-sm text-slate-500">
                        Switch between dark and light forest aesthetic
                      </p>
                    </div>
                    <div
                      className={`p-1 rounded-2xl flex ${theme === "dark" ? "bg-black/40" : "bg-slate-100"}`}
                    >
                      <button
                        onClick={() => setTheme("dark")}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${theme === "dark" ? "bg-[#2E6F40] text-white shadow-lg" : "text-slate-500"}`}
                      >
                        <Moon className="h-4 w-4" /> Dark
                      </button>
                      <button
                        onClick={() => setTheme("light")}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${theme === "light" ? "bg-white text-green-800 shadow-sm" : "text-slate-500"}`}
                      >
                        <Sun className="h-4 w-4" /> Light
                      </button>
                    </div>
                  </div>

                  <div
                    className={`p-8 rounded-[32px] border flex items-center justify-between ${theme === "dark" ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}
                  >
                    <div>
                      <h4 className="font-bold text-lg">Show Extra Apps</h4>
                      <p className="text-sm text-slate-500">
                        Toggle visibility of the "More from Us" section at the
                        bottom
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeveloperApps(!showDeveloperApps)}
                      className={`w-14 h-8 rounded-full transition-all relative ${showDeveloperApps ? "bg-green-500" : "bg-slate-300"}`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${showDeveloperApps ? "left-7" : "left-1"}`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : view === "discover" ? (
              <motion.div
                key="discover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-20 pb-20"
              >
                {/* Search Results if query active */}
                {results && (
                  <div className="max-w-5xl mx-auto space-y-10">
                    <div className={`flex items-center justify-between mb-8 pb-4 border-b ${theme === "dark" ? "border-white/10" : "border-slate-200"}`}>
                      <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                        <Layers className="text-[#68BA7F]" /> Search Results
                      </h3>
                      <div className={`flex rounded-xl p-1 border ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"}`}>
                         <button 
                            onClick={() => setSearchTab("verified")} 
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${searchTab === "verified" ? "bg-[#2E6F40] text-[#CFFFDC] shadow-lg" : "text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white"}`}
                         >
                           Package Managers
                         </button>
                         <button 
                            onClick={() => setSearchTab("web")} 
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${searchTab === "web" ? "bg-[#2E6F40] text-[#CFFFDC] shadow-lg" : "text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white"}`}
                         >
                           Internet & GitHub
                         </button>
                      </div>
                    </div>
                    {results.filter((app) => {
                      const src = (app.source || "").toLowerCase();
                      const verified = ["flatpak", "arch", "aur", "pacman", "yay", "snap"];
                      return searchTab === "verified" ? verified.includes(src) : (!verified.includes(src) || src === "custom");
                    }).length === 0 ? (
                      <div className="text-center py-20 opacity-50 font-bold">No {searchTab} apps found matching your query.</div>
                    ) : results.filter((app) => {
                      const src = (app.source || "").toLowerCase();
                      const verified = ["flatpak", "arch", "aur", "pacman", "yay", "snap"];
                      return searchTab === "verified" ? verified.includes(src) : (!verified.includes(src) || src === "custom");
                    }).map((app, i) => (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card
                          onClick={() => setSelectedApp(app)}
                          className={`overflow-hidden border group cursor-pointer rounded-[32px] transition-all hover:scale-[1.01] ${theme === "dark" ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]" : "bg-white border-slate-200 hover:shadow-2xl shadow-sm"}`}
                        >
                          <div className="flex h-56">
                            <div className="w-64 relative overflow-hidden bg-black">
                              <img
                                src={app.icon_url}
                                className="absolute inset-0 w-full h-full object-cover opacity-60 transition-all group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                            </div>
                            <div className="flex-1 p-10 flex flex-col">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-2xl font-black mb-1">
                                    {app.name}
                                  </h3>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    {app.developer}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <span className="text-xs font-black">
                                    4.8
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-500 mt-4 line-clamp-2 leading-relaxed">
                                {app.description}
                              </p>
                              <div className="mt-auto flex items-center justify-between">
                                <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
                                  {app.source}
                                </span>
                                <SpotlightButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInstall(app);
                                  }}
                                  className="px-10 h-11 font-black"
                                >
                                  {isAppInstalled(app)
                                    ? "Installed"
                                    : "Install"}
                                </SpotlightButton>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Categories Grid */}
                {!results && (
                  <div className="max-w-6xl mx-auto space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => setQuery(cat.name)}
                          className={`p-8 rounded-[32px] border transition-all flex flex-col items-center gap-6 group hover:-translate-y-1 ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/5 hover:border-[#68BA7F]/30" : "bg-white border-slate-200 hover:shadow-xl"}`}
                        >
                          <cat.icon
                            className={`h-8 w-8 ${cat.color} group-hover:scale-110 transition-transform`}
                          />
                          <span className="font-black text-sm tracking-tight">
                            {cat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Spotlight Section */}
                {featuredData?.spotlight && (
                  <section
                    className={`max-w-6xl mx-auto rounded-[48px] p-12 relative overflow-hidden border ${theme === "dark" ? "bg-[#0a1a1a]/60 border-white/5" : "bg-white border-slate-200 shadow-2xl"}`}
                  >
                    <div
                      className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l opacity-10 pointer-events-none ${theme === "dark" ? "from-[#68BA7F] to-transparent" : "from-green-200 to-transparent"}`}
                    />
                    <div className="flex flex-col lg:flex-row gap-16 items-center">
                      <div className="flex-1 space-y-8">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 ${theme === "dark" ? "bg-[#2E6F40]/20 text-[#CFFFDC]" : "bg-green-100 text-green-800"}`}
                        >
                          <Sparkles className="h-3 w-3" /> AI Spotlight
                        </span>
                        <h2 className="text-6xl font-black leading-[0.9] tracking-tighter">
                          {featuredData.spotlight.title}
                        </h2>
                        <p className="text-xl text-slate-500 leading-relaxed max-w-xl">
                          {featuredData.spotlight.description}
                        </p>
                        <div className="flex gap-4">
                          <SpotlightButton
                            variant="action"
                            className="px-10 h-14 text-lg"
                          >
                            Explore AI Apps
                          </SpotlightButton>
                          <SpotlightButton
                            variant="secondary"
                            className="px-10 h-14 text-lg"
                          >
                            Learn More
                          </SpotlightButton>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
                        {featuredData.spotlight.apps.map((app: any) => (
                          <motion.div
                            whileHover={{ y: -5, scale: 1.05 }}
                            key={app.id}
                            className={`p-8 rounded-[40px] border flex flex-col items-center gap-4 text-center group cursor-pointer ${theme === "dark" ? "bg-black/40 border-white/10" : "bg-slate-50 border-slate-200 shadow-sm"}`}
                          >
                            <div className="w-20 h-20 rounded-[24px] overflow-hidden shadow-2xl">
                              <img
                                src={app.icon}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <h4 className="font-black text-sm">{app.name}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              AI Powered
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Trending Section */}
                {featuredData?.trending && (
                  <section className="max-w-6xl mx-auto space-y-10">
                    <div className="flex justify-between items-end">
                      <h3 className="text-4xl font-black tracking-tighter">
                        Trending This Week
                      </h3>
                      <button className="text-xs font-black uppercase tracking-widest text-[#68BA7F] flex items-center gap-2 hover:gap-4 transition-all">
                        View All <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {featuredData.trending.map((app: any) => (
                        <motion.div
                          onClick={() => setSelectedApp(app)}
                          key={app.id}
                          className={`group cursor-pointer rounded-[40px] border overflow-hidden flex flex-col transition-all hover:-translate-y-2 ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/5" : "bg-white border-slate-200 shadow-xl"}`}
                        >
                          <div className="h-48 relative overflow-hidden">
                            <img
                              src={app.hero_image}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute top-6 left-6 w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 backdrop-blur-xl">
                              <img
                                src={app.icon_url}
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                          <div className="p-8 flex-1 flex flex-col">
                            <h4 className="text-xl font-black mb-2">
                              {app.name}
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                              {app.description}
                            </p>
                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <span className="text-[10px] font-black">
                                    {app.rating}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Monitor className="h-3 w-3 text-slate-500" />
                                  <span className="text-[10px] font-black text-slate-500">
                                    {app.downloads}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-[#68BA7F] uppercase tracking-widest">
                                {app.category}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Top Games Section */}
                {featuredData?.games && (
                  <section className="max-w-6xl mx-auto space-y-10">
                    <div className="flex justify-between items-end">
                      <h3 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                        <Gamepad2 className="text-purple-400 h-8 w-8" /> Top Games
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {featuredData.games.map((app: any) => (
                        <motion.div
                          onClick={() => setSelectedApp(app)}
                          key={app.id}
                          className={`group cursor-pointer rounded-[40px] border overflow-hidden flex flex-row transition-all hover:-translate-y-2 ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/5" : "bg-white border-slate-200 shadow-xl"}`}
                        >
                          <div className="w-1/3 relative overflow-hidden">
                            <img
                              src={app.hero_image}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          </div>
                          <div className="p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10">
                                <img src={app.icon_url} className="w-full h-full" />
                              </div>
                              <div>
                                <h4 className="text-xl font-black">{app.name}</h4>
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{app.category}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                              {app.description}
                            </p>
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <span className="text-[10px] font-black">{app.rating}</span>
                                </div>
                              </div>
                              <SpotlightButton onClick={(e) => { e.stopPropagation(); handleInstall(app); }} className="px-6 h-9 text-[10px] font-black">
                                {isAppInstalled(app) ? "Installed" : "Install Now"}
                              </SpotlightButton>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Productivity Section */}
                {featuredData?.productivity && (
                  <section className="max-w-6xl mx-auto space-y-10">
                    <div className="flex justify-between items-end">
                      <h3 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                        <Zap className="text-blue-400 h-8 w-8" /> Productivity Essentials
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {featuredData.productivity.map((app: any) => (
                        <motion.div
                          onClick={() => setSelectedApp(app)}
                          key={app.id}
                          className={`group cursor-pointer rounded-[40px] border overflow-hidden flex flex-row transition-all hover:-translate-y-2 ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/5" : "bg-white border-slate-200 shadow-xl"}`}
                        >
                          <div className="w-1/3 relative overflow-hidden">
                            <img
                              src={app.hero_image}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          </div>
                          <div className="p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10">
                                <img src={app.icon_url} className="w-full h-full" />
                              </div>
                              <div>
                                <h4 className="text-xl font-black">{app.name}</h4>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{app.category}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                              {app.description}
                            </p>
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <span className="text-[10px] font-black">{app.rating}</span>
                                </div>
                              </div>
                              <SpotlightButton onClick={(e) => { e.stopPropagation(); handleInstall(app); }} className="px-6 h-9 text-[10px] font-black">
                                Get App
                              </SpotlightButton>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Education Section */}
                {featuredData?.education && (
                  <section className="max-w-6xl mx-auto space-y-10">
                    <div className="flex justify-between items-end">
                      <h3 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                        <Brain className="text-amber-400 h-8 w-8" /> Learning & Education
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {featuredData.education.map((app: any) => (
                        <motion.div
                          onClick={() => setSelectedApp(app)}
                          key={app.id}
                          className={`group cursor-pointer rounded-[40px] border overflow-hidden flex flex-row transition-all hover:-translate-y-2 ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/5" : "bg-white border-slate-200 shadow-xl"}`}
                        >
                          <div className="w-1/3 relative overflow-hidden">
                            <img
                              src={app.hero_image}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          </div>
                          <div className="p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10">
                                <img src={app.icon_url} className="w-full h-full" />
                              </div>
                              <div>
                                <h4 className="text-xl font-black">{app.name}</h4>
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{app.category}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                              {app.description}
                            </p>
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <span className="text-[10px] font-black">{app.rating}</span>
                                </div>
                              </div>
                              <SpotlightButton onClick={(e) => { e.stopPropagation(); handleInstall(app); }} className="px-6 h-9 text-[10px] font-black">
                                Install
                              </SpotlightButton>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}


                {/* More From Us Section */}
                {showDeveloperApps && featuredData?.our_apps && (
                  <section className="max-w-6xl mx-auto space-y-10">
                    <h3 className="text-3xl font-black tracking-tighter opacity-40">
                      More From Appztore Labs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {featuredData.our_apps.map((app: any) => (
                        <div
                          key={app.id}
                          className={`p-8 rounded-[32px] border transition-all hover:bg-white/5 group flex items-center justify-between ${theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"}`}
                        >
                          <div>
                            <h5 className="font-black mb-1">{app.name}</h5>
                            <p className="text-xs text-slate-500 font-bold">
                              {app.desc}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all text-[#68BA7F]" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            ) : view === "my-apps" ? (
              <motion.div
                key="my-apps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto space-y-12 py-12"
              >
                <div className="flex justify-between items-end">
                  <h2 className="text-5xl font-black tracking-tighter">
                    My Applications
                  </h2>
                  <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                    {systemApps.length} Apps Detected
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systemApps.map((app) => (
                    <div
                      key={app.id}
                      className={`p-6 rounded-[32px] border flex items-center gap-6 ${theme === "dark" ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center border border-white/5">
                        <Package className="h-8 w-8 text-[#68BA7F]" />
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
                      <button className="p-3 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : view === "ai-tools" ? (
              <motion.div
                key="ai-tools"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto space-y-12 py-12"
              >
                <div className="text-center space-y-4 max-w-3xl mx-auto mb-20">
                  <h2 className="text-6xl font-black tracking-tighter">
                    AI Power Tools
                  </h2>
                  <p className="text-xl text-slate-500">
                    A curated collection of industry-leading AI applications, directly accessible from your system.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      name: "Llama 3 Terminal",
                      desc: "Run Meta's latest LLM directly in your shell with optimized performance.",
                      icon: Brain,
                      tags: ["LLM", "Local"],
                    },
                    {
                      name: "Diffusion Studio",
                      desc: "State-of-the-art image generation with complete local control.",
                      icon: Sparkles,
                      tags: ["Image Gen", "Local"],
                    },
                    {
                      name: "Neural Code",
                      desc: "AI-powered pair programmer with deep repository understanding.",
                      icon: Code,
                      tags: ["Dev", "Cloud"],
                    },
                    {
                      name: "Audio Morph",
                      desc: "Advanced neural audio synthesis and voice cloning tools.",
                      icon: Music,
                      tags: ["Audio", "Local"],
                    },
                    {
                      name: "Vision Lab",
                      desc: "Object detection and real-time computer vision toolkit.",
                      icon: Eye,
                      tags: ["Vision", "Local"],
                    },
                    {
                      name: "Semantic Search",
                      desc: "Vectorize your local documents for instant, intelligent retrieval.",
                      icon: Search,
                      tags: ["Search", "Local"],
                    },
                  ].map((tool, i) => (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-10 rounded-[48px] border group hover:-translate-y-2 transition-all ${theme === "dark" ? "bg-[#0a1a1a]/40 border-white/5 hover:border-[#68BA7F]/30" : "bg-white border-slate-200 shadow-xl"}`}
                    >
                      <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#2E6F40] to-[#68BA7F] flex items-center justify-center mb-8 shadow-2xl">
                        <tool.icon className="h-8 w-8 text-black" />
                      </div>
                      <h4 className="text-2xl font-black mb-4 tracking-tighter">{tool.name}</h4>
                      <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                        {tool.desc}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-8">
                        {tool.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest opacity-60">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <SpotlightButton className="w-full h-14 font-black">
                        Launch Tool
                      </SpotlightButton>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : view === "profile" ? (
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
                  <SpotlightButton 
                    variant="secondary" 
                    onClick={handleSignOut}
                    className="px-8 h-12 font-black"
                  >
                    Sign Out
                  </SpotlightButton>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={`p-10 rounded-[48px] border ${theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl"}`}>
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
                        <SpotlightButton onClick={() => setShowUpgradeModal(true)} className="w-full h-12 font-black">
                          Manage Plan
                        </SpotlightButton>
                      </div>
                    </div>
                  </div>

                  <div className={`p-10 rounded-[48px] border ${theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl"}`}>
                    <h3 className="text-2xl font-black mb-8 tracking-tight">Account Usage</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold">Total Installs</span>
                        <span className="font-black">{installCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold">Detected Apps</span>
                        <span className="font-black">{systemApps.length}</span>
                      </div>
                      <div className="pt-6 border-t border-white/5">
                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Developer Mode</span>
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
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {/* Detail Overlay, Upgrade Modal, and Footer remain... */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`max-w-4xl w-full p-12 rounded-[48px] border text-center relative overflow-hidden ${theme === "dark" ? "bg-[#0a1a1a] border-white/10 shadow-[0_0_100px_rgba(46,111,64,0.3)]" : "bg-white border-slate-200 shadow-2xl"}`}
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-8 right-8 text-slate-500 hover:text-white"
              >
                <X className="h-8 w-8" />
              </button>
              <Crown className="h-20 w-20 text-amber-400 mx-auto mb-8 animate-bounce" />
              <h2 className="text-6xl font-black tracking-tighter mb-4">
                Upgrade Your Experience
              </h2>
              <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto">
                Your Free trial has ended. Choose a plan to unlock unlimited
                installs, premium AI tools, and early access features.
              </p>
              <div className="grid grid-cols-3 gap-8">
                <div
                  className={`p-10 rounded-[40px] border flex flex-col text-left relative overflow-hidden ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}
                >
                  {plan === "free" && (
                    <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-slate-500/20 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-500/20">
                      Current
                    </div>
                  )}
                  <h3 className="text-3xl font-black mb-2">Appztore Free</h3>
                  <p className="text-sm text-slate-500 mb-8 font-bold">
                    For individual exploration
                  </p>
                  <div className="text-5xl font-black mb-10 tracking-tighter">
                    $0<span className="text-lg opacity-40">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-12">
                    <li className="flex items-center gap-3 text-sm font-bold opacity-60">
                      <ShieldCheck className="h-5 w-5 text-slate-500" />{" "}
                      Standard Repositories
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold opacity-60">
                      <ShieldCheck className="h-5 w-5 text-slate-500" /> Basic AI Search
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold opacity-60">
                      <ShieldCheck className="h-5 w-5 text-slate-500" />{" "}
                      Community Support
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
                <div
                  className={`p-10 rounded-[40px] border flex flex-col text-left ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}
                >
                  <h3 className="text-3xl font-black mb-2">Appztore Pro</h3>
                  <p className="text-sm text-slate-500 mb-8 font-bold">
                    Best for individual creators
                  </p>
                  <div className="text-5xl font-black mb-10 tracking-tighter">
                    $9<span className="text-lg opacity-40">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-12">
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" />{" "}
                      Unlimited Installs
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Pro AI
                      Search Models
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" />{" "}
                      Priority Support
                    </li>
                  </ul>
                  <SpotlightButton
                    variant="action"
                    className="h-14 font-black text-lg mt-auto"
                  >
                    Subscribe Pro
                  </SpotlightButton>
                </div>
                <div
                  className={`p-10 rounded-[40px] border border-[#68BA7F]/40 flex flex-col text-left relative overflow-hidden ${theme === "dark" ? "bg-[#2E6F40]/10" : "bg-green-50"}`}
                >
                  <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-[#68BA7F] text-black text-[10px] font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                  <h3 className="text-3xl font-black mb-2">Appztore Max</h3>
                  <p className="text-sm text-slate-500 mb-8 font-bold">
                    The ultimate power user setup
                  </p>
                  <div className="text-5xl font-black mb-10 tracking-tighter">
                    $19<span className="text-lg opacity-40">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-12">
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" />{" "}
                      Everything in Pro
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> 100GB
                      Cloud Storage
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <ShieldCheck className="h-5 w-5 text-[#68BA7F]" /> Early
                      Access SDK
                    </li>
                  </ul>
                  <SpotlightButton
                    variant="action"
                    className="h-14 font-black text-lg mt-auto"
                  >
                    Go Max
                  </SpotlightButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Installation Progress Indicator */}
      <AnimatePresence>
        {installState && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-[300] w-96 p-6 rounded-[32px] border shadow-2xl backdrop-blur-3xl ${theme === "dark" ? "bg-[#0a1a1a]/90 border-[#68BA7F]/30" : "bg-white/90 border-green-200"}`}
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
                <span className="text-lg font-black tracking-tighter">
                  {installState.progress}%
                </span>
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

      {/* App Detail Overlay */}
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
              className={`max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-[48px] border relative ${theme === "dark" ? "bg-[#0a1a1a] border-white/10" : "bg-white border-slate-200 shadow-2xl"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedApp(null)}
                className="absolute top-8 right-8 z-50 p-4 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              <div className="relative h-96 w-full overflow-hidden bg-black">
                <img
                  src={selectedApp.hero_image}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a1a] via-transparent to-transparent" />
                <div className="absolute bottom-12 left-12 flex items-end gap-8">
                  <div className="w-32 h-32 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white/10">
                    <img src={selectedApp.icon_url} className="w-full h-full" />
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
                        <span className="text-sm font-black uppercase tracking-widest text-[#68BA7F]">Verified</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-2xl font-black tracking-tight uppercase tracking-widest opacity-40">Description</h3>
                      <p className={`text-xl leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
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
                        This application has been verified for security and performance.
                        AI analysis detects 0 conflicting dependencies on your current Linux kernel.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className={`p-8 rounded-[40px] border ${theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"}`}>
                      <h4 className="text-lg font-black mb-6 uppercase tracking-widest opacity-40">Installation</h4>
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
    </div>
  );
}

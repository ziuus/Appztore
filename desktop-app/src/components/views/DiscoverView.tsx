import { motion } from "framer-motion";
import {
  ArrowLeft,
  Layers,
  Sparkles,
  ArrowRight,
  Gamepad2,
  Monitor,
  Star,
  Package,
  ShieldCheck,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import type { AppResult } from "../../types";
import { CATEGORIES } from "../../constants";
import { Card } from "../ui/card";
import { SpotlightButton } from "../shared/SpotlightButton";
import { useState } from "react";

interface DiscoverViewProps {
  results: AppResult[] | null;
  query: string;
  setQuery: (q: string) => void;
  handleSearch: (e: React.FormEvent, customQuery?: string) => void;
  theme: "dark" | "light";
  featuredData: any;
  setSelectedApp: (app: AppResult) => void;
  handleInstall: (app: AppResult) => void;
  isAppInstalled: (app: AppResult) => boolean;
  setResults: (res: AppResult[] | null) => void;
  isStreaming?: boolean;
  apiKey?: string | null;
}

type TabFilter = "all" | "pacman_aur" | "flatpak" | "snap" | "github" | "docker";

export const DiscoverView = ({
  results,
  query,
  setQuery,
  handleSearch,
  theme,
  featuredData,
  setSelectedApp,
  handleInstall,
  isAppInstalled,
  setResults,
  isStreaming = false,
  apiKey,
}: DiscoverViewProps) => {
  const [searchTab, setSearchTab] = useState<TabFilter>("all");

  const filteredResults = (results || []).filter((app) => {
    const src = (app.source || app.registry || "").toLowerCase();
    if (searchTab === "all") return true;
    if (searchTab === "pacman_aur")
      return src === "pacman" || src === "arch" || src === "aur" || src === "yay";
    if (searchTab === "flatpak") return src === "flatpak";
    if (searchTab === "snap") return src === "snap";
    if (searchTab === "github") return src === "github" || src === "custom";
    if (searchTab === "docker") return src === "docker";
    return true;
  });

  // Source breakdown counts
  const sourceCounts = (results || []).reduce(
    (acc, app) => {
      const src = (app.source || app.registry || "").toLowerCase();
      if (src === "pacman" || src === "arch" || src === "aur" || src === "yay")
        acc.pacman_aur += 1;
      else if (src === "flatpak") acc.flatpak += 1;
      else if (src === "snap") acc.snap += 1;
      else if (src === "github" || src === "custom") acc.github += 1;
      else if (src === "docker") acc.docker += 1;
      return acc;
    },
    { pacman_aur: 0, flatpak: 0, snap: 0, github: 0, docker: 0 }
  );

  return (
    <motion.div
      key="discover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-20 pb-20"
    >
      {/* Search Results if query active */}
      {results && (
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header & Filter Tabs */}
          <div
            className={`space-y-6 mb-8 pb-6 border-b ${
              theme === "dark" ? "border-white/10" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    setResults(null);
                    setQuery("");
                  }}
                  className="flex items-center gap-2 text-[#68BA7F] font-black text-sm uppercase tracking-widest hover:gap-4 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                  <Layers className="text-[#68BA7F]" /> Registry Search Results
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 opacity-70">
                {results.length} package{results.length === 1 ? "" : "s"} resolved
              </span>
            </div>

            {/* Search status banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 text-xs ${
                theme === "dark"
                  ? "bg-[#0a1a1a]/80 border-[#68BA7F]/20 text-slate-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-[#68BA7F] shrink-0" />
                <span className="font-bold">
                  {apiKey ? "AI Intent:" : "Registry Search:"}{" "}
                  <span className="text-[#68BA7F]">"{query}"</span>
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {isStreaming && (
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400">
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
                    />
                    Loading more sources...
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {apiKey ? "AI + OS Search Active" : "Pure OS Search Active"}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#68BA7F]" />
                  Command Safety Verified
                </span>
              </div>
            </div>

            {/* Filter Tabs (All, Pacman/AUR, Flatpak, Snap, GitHub, Docker) */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { id: "all", label: `All (${results.length})` },
                { id: "pacman_aur", label: `Pacman/AUR (${sourceCounts.pacman_aur})` },
                { id: "flatpak", label: `Flatpak (${sourceCounts.flatpak})` },
                { id: "snap", label: `Snap (${sourceCounts.snap})` },
                { id: "github", label: `GitHub (${sourceCounts.github})` },
                { id: "docker", label: `Docker (${sourceCounts.docker})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSearchTab(tab.id as TabFilter)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    searchTab === tab.id
                      ? "bg-[#2E6F40] text-[#CFFFDC] shadow-lg border border-[#68BA7F]/40"
                      : theme === "dark"
                      ? "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result Cards */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-20 opacity-50 font-bold text-white/40">
              No packages found in tab "{searchTab}". Try selecting "All" or a different registry tab.
            </div>
          ) : (
            filteredResults.map((app) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  onClick={() => setSelectedApp(app)}
                  className={`overflow-hidden border group cursor-pointer rounded-[32px] transition-all hover:scale-[1.01] ${
                    theme === "dark"
                      ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                      : "bg-white border-slate-200 hover:shadow-2xl shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center p-6 gap-6 relative">
                    {app.hero_image && (
                      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none rounded-[32px] overflow-hidden">
                        <img src={app.hero_image} className="w-full h-full object-cover" />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${
                            theme === "dark"
                              ? "from-[#0a1a1a] via-[#0a1a1a]/80 to-transparent"
                              : "from-white via-white/80 to-transparent"
                          }`}
                        />
                      </div>
                    )}
                    <div className="w-24 h-24 relative overflow-hidden rounded-2xl border border-white/10 shadow-lg shrink-0 bg-black/20 flex items-center justify-center z-10">
                      {app.icon_url ? (
                        <img
                          src={app.icon_url}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://api.dicebear.com/7.x/initials/svg?seed=" +
                              app.name +
                              "&backgroundColor=030303&fontSize=45&fontFamily=Arial";
                            (e.target as HTMLImageElement).className =
                              "absolute inset-0 w-full h-full object-contain p-4 opacity-50";
                          }}
                          className="absolute inset-0 w-full h-full object-cover transition-all group-hover:scale-110"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col text-left z-10 w-full overflow-hidden">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-2xl font-black mb-1 truncate ${
                              theme === "dark" ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {app.name}
                          </h3>
                          <p
                            className={`text-xs font-bold uppercase tracking-widest ${
                              theme === "dark" ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            {app.developer || "Linux Package Manager"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Security Score Badge */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6F40]/20 border border-[#68BA7F]/30 text-[#CFFFDC]">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#68BA7F]" />
                            <span className="text-xs font-black">
                              {app.security_score || 95}% Verified
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span
                              className={`text-xs font-black ${
                                theme === "dark" ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {app.rating || 4.8}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p
                        className={`text-sm mt-4 line-clamp-2 leading-relaxed flex-1 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        {app.description || "No description available for this package."}
                      </p>
                      <div className="mt-4 pt-4 flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                          <span className="font-black tracking-[0.2em] text-[#68BA7F] uppercase">
                            Registry: {app.source || app.registry}
                          </span>
                          {app.version && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                              v{app.version}
                            </span>
                          )}
                        </div>
                        <SpotlightButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstall(app);
                          }}
                          className="px-8 h-10 text-xs font-black"
                        >
                          {isAppInstalled(app) ? "Installed" : "Install"}
                        </SpotlightButton>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Categories Grid */}
      {!results && (
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setQuery(cat.name);
                  handleSearch({ preventDefault: () => {} } as any, cat.name);
                }}
                className={`p-8 rounded-[32px] border transition-all flex flex-col items-center gap-6 group hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-[#0a1a1a]/40 border-white/5 hover:border-[#68BA7F]/30"
                    : "bg-white border-slate-200 hover:shadow-xl"
                }`}
              >
                <cat.icon
                  className={`h-8 w-8 ${cat.color} group-hover:scale-110 transition-transform`}
                />
                <span className="font-black text-sm tracking-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verified Spotlight Section */}
      {!results && featuredData?.spotlight && (
        <section
          className={`max-w-6xl mx-auto rounded-[48px] p-12 relative overflow-hidden border ${
            theme === "dark"
              ? "bg-[#0a1a1a]/60 border-white/5"
              : "bg-white border-slate-200 shadow-2xl"
          }`}
        >
          <div
            className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l opacity-10 pointer-events-none ${
              theme === "dark" ? "from-[#68BA7F] to-transparent" : "from-green-200 to-transparent"
            }`}
          />
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 space-y-8">
              <span
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 ${
                  theme === "dark"
                    ? "bg-[#2E6F40]/20 text-[#CFFFDC]"
                    : "bg-green-100 text-green-800"
                }`}
              >
                <Sparkles className="h-3 w-3" /> System Verified Spotlight
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
                  onClick={() => handleSearch({ preventDefault: () => {} } as any, "development")}
                >
                  Explore Dev Apps
                </SpotlightButton>
                <SpotlightButton
                  variant="secondary"
                  className="px-10 h-14 text-lg"
                  onClick={() => handleSearch({ preventDefault: () => {} } as any, "vlc")}
                >
                  Popular Media Players
                </SpotlightButton>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
              {featuredData.spotlight.apps.map((app: any) => (
                <motion.div
                  whileHover={{ y: -5, scale: 1.05 }}
                  key={app.id}
                  onClick={() => handleSearch({ preventDefault: () => {} } as any, app.name)}
                  className={`p-8 rounded-[40px] border flex flex-col items-center gap-4 text-center group cursor-pointer ${
                    theme === "dark"
                      ? "bg-black/40 border-white/10"
                      : "bg-slate-50 border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="w-20 h-20 rounded-[24px] overflow-hidden shadow-2xl">
                    <img src={app.icon} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-black text-sm">{app.name}</h4>
                  <p className="text-[10px] font-bold text-[#68BA7F] uppercase tracking-widest">
                    Verified Package
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Section */}
      {!results && featuredData?.trending && (
        <section className="max-w-6xl mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <h3 className="text-4xl font-black tracking-tighter">Trending Package Managers</h3>
            <button
              onClick={() => handleSearch({ preventDefault: () => {} } as any, "media")}
              className="text-xs font-black uppercase tracking-widest text-[#68BA7F] flex items-center gap-2 hover:gap-4 transition-all"
            >
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredData.trending.map((app: any) => (
              <motion.div
                onClick={() => setSelectedApp(app)}
                key={app.id}
                className={`group cursor-pointer rounded-[40px] border overflow-hidden flex flex-col transition-all hover:-translate-y-2 ${
                  theme === "dark"
                    ? "bg-[#0a1a1a]/40 border-white/5"
                    : "bg-white border-slate-200 shadow-xl"
                }`}
              >
                <div className="h-48 relative overflow-hidden">
                  <img
                    src={app.hero_image}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-6 left-6 w-14 h-14 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 backdrop-blur-xl">
                    <img src={app.icon_url} className="w-full h-full" />
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h4 className="text-xl font-black mb-2">{app.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                    {app.description}
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-black">{app.rating}</span>
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
      {!results && featuredData?.games && (
        <section className="max-w-6xl mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <h3 className="text-4xl font-black tracking-tighter flex items-center gap-4">
              <Gamepad2 className="text-purple-400 h-8 w-8" /> Native Linux Games
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredData.games.map((app: any) => (
              <motion.div
                onClick={() => setSelectedApp(app)}
                key={app.id}
                className={`group cursor-pointer rounded-[40px] border overflow-hidden flex flex-row transition-all hover:-translate-y-2 ${
                  theme === "dark"
                    ? "bg-[#0a1a1a]/40 border-white/5"
                    : "bg-white border-slate-200 shadow-xl"
                }`}
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
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                        {app.category}
                      </span>
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
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3 text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500">
                          {app.downloads}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
};

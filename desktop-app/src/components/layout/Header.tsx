import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface HeaderProps {
  query: string;
  setQuery: (q: string) => void;
  handleSearch: (e: React.FormEvent, customQuery?: string) => void;
  searchHistory: string[];
  clearHistory: () => void;
  theme: "dark" | "light";
  isSearching?: boolean;
}

export const Header = ({
  query,
  setQuery,
  handleSearch,
  searchHistory,
  clearHistory,
  theme,
  isSearching,
}: HeaderProps) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <header className="px-12 pt-12 pb-8 bg-transparent z-20 sticky top-0">
      <form
        onSubmit={(e) => {
          handleSearch(e);
          setShowHistory(false);
        }}
        className="max-w-4xl mx-auto relative group"
      >
        <div
          className={`absolute -inset-1 bg-gradient-to-r from-[#2E6F40]/40 to-[#68BA7F]/40 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700`}
        />
        <div className="relative flex items-center">
          {isSearching ? (
            <Loader2 className="absolute left-6 h-6 w-6 text-[#68BA7F] animate-spin z-20" />
          ) : (
            <Search className="absolute left-6 h-6 w-6 text-slate-400 opacity-50 z-20" />
          )}
          <input
            value={query}
            onFocus={() => setShowHistory(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch(e as any);
                setShowHistory(false);
              }
            }}
            className={`pl-16 h-16 w-full text-xl rounded-2xl outline-none border transition-all relative z-10 ${
              theme === "dark"
                ? "bg-[#0a1a1a]/40 border-white/10 text-white backdrop-blur-2xl focus:border-[#68BA7F]/50"
                : "bg-white/50 border-slate-200 text-slate-900 focus:border-green-500 shadow-sm"
            }`}
          />
          <AnimatePresence>
            {showHistory && searchHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute top-20 left-0 right-0 z-[100] p-4 rounded-2xl border backdrop-blur-3xl shadow-2xl ${
                  theme === "dark" ? "bg-black/90 border-white/10" : "bg-white/90 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-center mb-4 px-2">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Recent Searches
                  </h5>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setQuery(h);
                        handleSearch({ preventDefault: () => {} } as any, h);
                        setShowHistory(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-colors ${
                        theme === "dark" ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Search className="h-4 w-4 opacity-40" />
                      <span className="font-bold text-sm">{h}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </header>
  );
};

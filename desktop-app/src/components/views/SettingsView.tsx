import { motion } from "framer-motion";
import { Bot, Key, ShieldCheck, ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";

interface SettingsViewProps {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  showDeveloperApps: boolean;
  setShowDeveloperApps: (show: boolean) => void;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  aiProvider: string | null;
  setAiProvider: (provider: string | null) => void;
  aiModel: string | null;
  setAiModel: (model: string | null) => void;
}

const PROVIDERS = [
  {
    id: "auto",
    name: "Auto-detect",
    description: "Detect provider from API key format",
    prefixHint: "(gsk_ → Groq, sk_ → OpenAI, etc.)",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Blazing fast LPU inference",
    getKeyUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, o1",
    getKeyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude Opus",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.0 Flash, Gemini 1.5 Pro",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "mistral",
    name: "Mistral",
    description: "Mistral Large, Codestral",
    getKeyUrl: "https://console.mistral.ai/api-keys/",
    defaultModel: "mistral-large-latest",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Run models locally on your machine",
    apiBase: "http://localhost:11434",
    defaultModel: "llama3.1:8b",
  },
  {
    id: "together",
    name: "Together AI",
    description: "Open source models at scale",
    getKeyUrl: "https://api.together.xyz/settings/api-keys",
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Sonar, online LLMs",
    getKeyUrl: "https://www.perplexity.ai/settings/api",
    defaultModel: "llama-3.1-sonar-large-128k-online",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    description: "Fast open source inference",
    getKeyUrl: "https://fireworks.ai/api-keys",
    defaultModel: "accounts/fireworks/models/llama-v3p1-405b-instruct",
  },
];

export const SettingsView = ({
  theme,
  setTheme,
  showDeveloperApps,
  setShowDeveloperApps,
  apiKey,
  setApiKey,
  aiProvider,
  setAiProvider,
  aiModel,
  setAiModel,
}: SettingsViewProps) => {
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === (aiProvider || "auto")) || PROVIDERS[0];

  const handleProviderSelect = (providerId: string) => {
    setAiProvider(providerId);
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (provider && provider.defaultModel && !aiModel) {
      // Only set default if user hasn't set a custom model
      // Use setAiModel only if we want to auto-set, but let's not override user's choice
    }
    setShowProviderDropdown(false);
  };

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-12 py-12"
    >
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-5xl font-black tracking-tighter">Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 ml-4">
            Appearance
          </h3>
          <div
            className={`p-8 rounded-[32px] border flex items-center justify-between ${
              theme === "dark" ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div>
              <h4 className="font-bold text-lg">Theme Mode</h4>
              <p className="text-sm text-slate-500">Choose between light and dark aesthetics</p>
            </div>
            <div
              className={`flex rounded-xl p-1 border ${
                theme === "dark" ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => setTheme("light")}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                  theme === "light"
                    ? "bg-white text-black shadow-lg"
                    : "text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                  theme === "dark"
                    ? "bg-[#2E6F40] text-[#CFFFDC] shadow-lg"
                    : "text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </section>

        {/* AI Intelligence Section (BYOK with Provider Selection) */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 ml-4">
            AI Intelligence
          </h3>
          <div
            className={`p-8 rounded-[48px] border ${
              theme === "dark"
                ? "bg-white/5 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                : "bg-white border-slate-200 shadow-xl"
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#68BA7F]/20 flex items-center justify-center">
                <Bot className="h-6 w-6 text-[#68BA7F]" />
              </div>
              <div>
                <h4 className="font-bold text-xl tracking-tight">Bring Your Own Key</h4>
                <p className="text-sm text-slate-500">
                  Power AI features with your personal API key — supports 100+ providers
                </p>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-slate-400">
                AI Provider
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  className={`w-full h-14 px-4 rounded-2xl border flex items-center justify-between transition-all ${
                    theme === "dark"
                      ? "bg-black/40 border-white/10 hover:border-white/20"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="font-bold">{selectedProvider.name}</div>
                      <div className="text-xs text-slate-500">{selectedProvider.description}</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 transition-transform ${
                      showProviderDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showProviderDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-2xl border z-50 shadow-2xl ${
                      theme === "dark"
                        ? "bg-[#0a0a0a] border-white/10"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider.id)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${
                          selectedProvider.id === provider.id
                            ? theme === "dark"
                              ? "bg-[#2E6F40]/20 text-[#68BA7F]"
                              : "bg-green-50 text-green-700"
                            : theme === "dark"
                            ? "hover:bg-white/5"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm">{provider.name}</div>
                          <div className="text-xs text-slate-500">
                            {provider.description}
                            {provider.prefixHint && (
                              <span className="text-slate-600 ml-1">{provider.prefixHint}</span>
                            )}
                          </div>
                        </div>
                        {provider.getKeyUrl && (
                          <a
                            href={provider.getKeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1 text-xs ${
                              theme === "dark" ? "text-[#68BA7F] hover:text-[#8fdf9f]" : "text-green-600 hover:text-green-700"
                            }`}
                          >
                            Get Key
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* API Key Input */}
            <div className="relative group">
              <label className="block text-sm font-semibold mb-2 text-slate-400">
                API Key
              </label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#68BA7F] transition-colors">
                  <Key className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  placeholder={
                    selectedProvider.id === "auto"
                      ? "Enter your API key (auto-detects provider)..."
                      : `Enter your ${selectedProvider.name} API key...`
                  }
                  value={apiKey || ""}
                  onChange={(e) => setApiKey(e.target.value || null)}
                  className={`w-full h-14 pl-14 pr-6 rounded-2xl border transition-all outline-none font-mono text-sm ${
                    theme === "dark"
                      ? "bg-black/40 border-white/10 focus:border-[#68BA7F]/50 focus:bg-black/60"
                      : "bg-slate-50 border-slate-200 focus:border-green-500/50"
                  }`}
                />
              </div>
            </div>

            {/* Custom Model Input (Optional) */}
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2 text-slate-400">
                Custom Model (Optional)
              </label>
              <input
                type="text"
                placeholder={
                  selectedProvider.defaultModel
                    ? `Default: ${selectedProvider.defaultModel}`
                    : "e.g., gpt-4o, claude-sonnet-4-20250514"
                }
                value={aiModel || ""}
                onChange={(e) => setAiModel(e.target.value || null)}
                className={`w-full h-12 px-4 rounded-2xl border transition-all outline-none text-sm ${
                  theme === "dark"
                    ? "bg-black/40 border-white/10 focus:border-[#68BA7F]/30 focus:bg-black/50 placeholder:text-white/20"
                    : "bg-slate-50 border-slate-200 focus:border-green-500/30 placeholder:text-slate-400"
                }`}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Leave empty to use the default model for your provider.
                {selectedProvider.defaultModel && (
                  <span> Default: <code className="text-[#68BA7F]">{selectedProvider.defaultModel}</code></span>
                )}
              </p>
            </div>

            {/* Info / Help */}
            <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
              <ShieldCheck className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-400 leading-relaxed">
                <p className="mb-1">
                  Your key is stored <strong>locally in your browser</strong> and is never stored on our servers.
                  It is only sent to the Appztore backend to authorize AI-powered search and installation analysis.
                </p>
                <p>
                  <strong>100+ providers supported</strong> via LiteLLM: OpenAI, Anthropic, Groq, Google Gemini,
                  Mistral, Together, Perplexity, Fireworks, Ollama (local), AWS Bedrock, Azure OpenAI, and more.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 ml-4">
            Developer
          </h3>
          <div
            className={`p-8 rounded-[32px] border flex items-center justify-between ${
              theme === "dark" ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div>
              <h4 className="font-bold text-lg">Show Extra Apps</h4>
              <p className="text-sm text-slate-500">
                Toggle visibility of the "More from Us" section at the bottom
              </p>
            </div>
            <button
              onClick={() => setShowDeveloperApps(!showDeveloperApps)}
              className={`w-14 h-8 rounded-full transition-all relative ${
                showDeveloperApps ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${
                  showDeveloperApps ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

import { motion } from "framer-motion";
import { Brain, Sparkles, Code, Music, Eye, Search, ShieldCheck } from "lucide-react";
import { SpotlightButton } from "../shared/SpotlightButton";

interface AIToolsViewProps {
  theme: "dark" | "light";
  onSearchQuery?: (query: string) => void;
}

const AI_TOOLS = [
  {
    name: "Ollama / Llama 3",
    desc: "Run open-source LLMs locally in your shell with hardware acceleration.",
    icon: Brain,
    tags: ["LLM", "Local Package"],
    query: "ollama",
  },
  {
    name: "Stable Diffusion WebUI",
    desc: "State-of-the-art image generation tools with local WebUI control.",
    icon: Sparkles,
    tags: ["Image Gen", "Verified"],
    query: "stable-diffusion",
  },
  {
    name: "Neovim AI Workstation",
    desc: "AI-enhanced pair programming editor environment.",
    icon: Code,
    tags: ["Dev", "Source"],
    query: "neovim",
  },
  {
    name: "Audacity Audio Lab",
    desc: "Advanced open-source audio processing and neural synthesis plugins.",
    icon: Music,
    tags: ["Audio", "Package"],
    query: "audacity",
  },
  {
    name: "OpenCV Computer Vision",
    desc: "Real-time computer vision and object recognition toolkit.",
    icon: Eye,
    tags: ["Vision", "Library"],
    query: "opencv",
  },
  {
    name: "Elastic / Vector Search",
    desc: "Local document vectorization and high-performance retrieval engine.",
    icon: Search,
    tags: ["Search", "System"],
    query: "search",
  },
];

export const AIToolsView = ({ theme, onSearchQuery }: AIToolsViewProps) => {
  return (
    <motion.div
      key="ai-tools"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 py-12"
    >
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 bg-[#2E6F40]/20 text-[#CFFFDC] border border-[#68BA7F]/30">
          <ShieldCheck className="h-3.5 w-3.5 text-[#68BA7F]" /> Verified System AI Packages
        </span>
        <h2 className="text-6xl font-black tracking-tighter">AI Power Tools</h2>
        <p className="text-xl text-slate-500">
          Curated open-source AI applications and developer toolkits available directly across your system package managers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {AI_TOOLS.map((tool, i) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-10 rounded-[48px] border group hover:-translate-y-2 transition-all flex flex-col justify-between ${
              theme === "dark"
                ? "bg-[#0a1a1a]/40 border-white/5 hover:border-[#68BA7F]/30"
                : "bg-white border-slate-200 shadow-xl"
            }`}
          >
            <div>
              <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#2E6F40] to-[#68BA7F] flex items-center justify-center mb-8 shadow-2xl">
                <tool.icon className="h-8 w-8 text-black" />
              </div>
              <h4 className="text-2xl font-black mb-4 tracking-tighter">{tool.name}</h4>
              <p className="text-slate-400 font-medium mb-6 leading-relaxed text-sm">{tool.desc}</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest opacity-70 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <SpotlightButton
              onClick={() => onSearchQuery?.(tool.query)}
              className="w-full h-14 font-black text-xs"
            >
              Discover {tool.query.toUpperCase()} Packages
            </SpotlightButton>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

import { motion } from "framer-motion";
import { Brain, Sparkles, Code, Music, Eye, Search } from "lucide-react";
import { SpotlightButton } from "../shared/SpotlightButton";

interface AIToolsViewProps {
  theme: "dark" | "light";
}

const AI_TOOLS = [
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
];

export const AIToolsView = ({ theme }: AIToolsViewProps) => {
  return (
    <motion.div
      key="ai-tools"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 py-12"
    >
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-20">
        <h2 className="text-6xl font-black tracking-tighter">AI Power Tools</h2>
        <p className="text-xl text-slate-500">
          A curated collection of industry-leading AI applications, directly accessible from your system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {AI_TOOLS.map((tool, i) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-10 rounded-[48px] border group hover:-translate-y-2 transition-all ${
              theme === "dark"
                ? "bg-[#0a1a1a]/40 border-white/5 hover:border-[#68BA7F]/30"
                : "bg-white border-slate-200 shadow-xl"
            }`}
          >
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#2E6F40] to-[#68BA7F] flex items-center justify-center mb-8 shadow-2xl">
              <tool.icon className="h-8 w-8 text-black" />
            </div>
            <h4 className="text-2xl font-black mb-4 tracking-tighter">{tool.name}</h4>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{tool.desc}</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest opacity-60"
                >
                  {tag}
                </span>
              ))}
            </div>
            <SpotlightButton className="w-full h-14 font-black">Launch Tool</SpotlightButton>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Sparkle, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Ancient Egypt", "Formula 1 legends", "Marvel Cinematic Universe",
  "Space exploration", "Python programming", "World War II",
  "Harry Potter books", "K-Pop groups", "Astronomy basics",
];

export default function AIQuiz() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const go = async (t) => {
    const clean = (t || topic).trim();
    if (clean.length < 2) return toast.error("Enter a topic");
    setLoading(true);
    try {
      const r = await api.post("/quiz/ai/start", { topic: clean, count: 10 });
      // Navigate to a generic quiz play route using AI category and preload state
      nav(`/quiz/ai`, { state: { quiz: r.data } });
    } catch (e) {
      toast.error(e.response?.data?.detail || "AI generation failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-[10px] uppercase tracking-[0.3em] text-neon-pink font-bold">AI Quiz</div>
        <h1 className="font-display font-black uppercase tracking-tighter text-4xl md:text-5xl mt-2">
          Type any topic.<br /><span className="text-neon-pink">Get instant quiz.</span>
        </h1>
        <p className="mt-3 text-zinc-400">Powered by Gemini. 10 questions · 15s each · same scoring rules.</p>

        <div className="mt-8 card-surface rounded-sm p-6">
          <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Topic</label>
          <div className="mt-2 flex gap-3">
            <input
              data-testid="ai-topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Ancient Egypt, F1 legends, React hooks…"
              className="flex-1 bg-void-surface border border-void-border px-4 py-3 rounded-sm focus:outline-none focus:border-neon-yellow focus:ring-1 focus:ring-neon-yellow/50"
              onKeyDown={(e) => e.key === "Enter" && go()}
            />
            <button
              data-testid="ai-generate-btn"
              disabled={loading}
              onClick={() => go()}
              className="btn-primary px-5 rounded-sm font-display uppercase text-xs tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? "Generating…" : <>Generate <ArrowRight size={14} /></>}
            </button>
          </div>

          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-2">Try one</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  data-testid={`suggest-${s.replace(/\s+/g,"-").toLowerCase()}`}
                  onClick={() => { setTopic(s); }}
                  className="text-xs uppercase tracking-widest text-zinc-300 px-3 py-1.5 border border-void-border rounded-full hover:border-neon-yellow hover:text-neon-yellow"
                  style={{ transition: "border-color 200ms, color 200ms" }}
                >
                  <Sparkle weight="fill" size={10} className="inline mr-1 text-neon-pink" />{s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

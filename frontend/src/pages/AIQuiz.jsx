import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Sparkle, ArrowRight, Crown, Lightning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const SUGGESTIONS = [
  "Ancient Egypt", "Formula 1 legends", "Marvel Cinematic Universe",
  "Space exploration", "Python programming", "World War II",
  "Harry Potter books", "K-Pop groups", "Astronomy basics",
];

export default function AIQuiz() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitModal, setLimitModal] = useState(null); // {used, limit}
  const nav = useNavigate();

  const go = async (t) => {
    const clean = (t || topic).trim();
    if (clean.length < 2) return toast.error("Enter a topic");
    setLoading(true);
    try {
      const r = await api.post("/quiz/ai/start", { topic: clean, count: 10 });
      nav(`/quiz/ai`, { state: { quiz: r.data } });
    } catch (e) {
      const d = e.response?.data?.detail;
      if (e.response?.status === 402 && typeof d === "object" && d?.code === "AI_LIMIT_REACHED") {
        setLimitModal({ used: d.used, limit: d.limit });
      } else {
        toast.error((typeof d === "string" && d) || "AI generation failed");
      }
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

      <Dialog open={!!limitModal} onOpenChange={(o) => !o && setLimitModal(null)}>
        <DialogContent data-testid="ai-limit-modal" className="bg-void-surface border-neon-yellow">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Crown weight="fill" className="text-neon-yellow" size={22} />
              <DialogTitle className="font-display uppercase tracking-tight text-2xl">Daily AI limit reached</DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              You've used all {limitModal?.limit} free AI quizzes today. Upgrade to <span className="text-neon-yellow font-bold">Elite Pro</span> for unlimited AI quizzes — one-time $9.99, forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setLimitModal(null)} className="btn-ghost px-4 py-2 rounded-sm text-xs uppercase tracking-widest" data-testid="ai-limit-later">Maybe later</button>
            <Link to="/pricing" data-testid="ai-limit-upgrade" className="btn-primary px-4 py-2 rounded-sm text-xs uppercase tracking-widest inline-flex items-center gap-2">
              <Lightning weight="fill" size={12} /> Get Elite Pro
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useLocation, Link, Navigate } from "react-router-dom";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Trophy, ArrowClockwise, ShareNetwork, Check, X } from "@phosphor-icons/react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function Result() {
  const { state } = useLocation();
  const { width, height } = useWindowSize();
  const [showAll, setShowAll] = useState(false);

  if (!state?.result) return <Navigate to="/" replace />;
  const r = state.result;
  const perfect = r.accuracy === 100;

  const share = async () => {
    const text = `I scored ${r.score} pts (${r.accuracy}%) on ${state.category} at EliteQuizGame. Beat me!`;
    try {
      if (navigator.share) await navigator.share({ title: "EliteQuizGame", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Score copied to clipboard!");
      }
    } catch {}
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {r.accuracy >= 60 && <Confetti width={width} height={height} numberOfPieces={perfect ? 400 : 180} recycle={false} colors={["#E4FF00", "#00F0FF", "#FF0055", "#00FF66"]} />}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold" data-testid="result-heading">
            {state.category} · Complete
          </div>
          <div className="mt-4 font-display font-black text-6xl md:text-7xl tracking-tighter text-neon-yellow" data-testid="result-score">
            {r.score}
          </div>
          <div className="mt-2 text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">Total Score</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <Stat label="Correct" value={`${r.correct}/${r.total}`} color="text-neon-green" />
          <Stat label="Accuracy" value={`${r.accuracy}%`} color="text-neon-cyan" />
          <Stat label="Best Streak" value={r.best_streak} color="text-neon-pink" />
          <Stat label="XP Earned" value={`+${r.xp_earned}`} color="text-neon-yellow" />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/categories" data-testid="play-again-btn" className="btn-primary px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest inline-flex items-center gap-2">
            <ArrowClockwise weight="bold" size={14} /> Play Again
          </Link>
          <button data-testid="share-btn" onClick={share} className="btn-ghost px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest inline-flex items-center gap-2">
            <ShareNetwork weight="bold" size={14} /> Share Score
          </button>
          <Link to="/leaderboard" data-testid="leader-btn" className="btn-ghost px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest inline-flex items-center gap-2">
            <Trophy weight="fill" size={14} /> Leaderboard
          </Link>
        </div>

        <div className="mt-12 card-surface rounded-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold uppercase tracking-tight">Review</h3>
            <button onClick={() => setShowAll((s) => !s)} data-testid="review-toggle" className="text-xs uppercase tracking-widest text-neon-yellow hover:underline">
              {showAll ? "Hide" : "Show"} all
            </button>
          </div>
          {showAll && (
            <div className="space-y-4">
              {r.corrections.map((c, i) => (
                <div key={i} className="p-4 card-raised rounded-sm">
                  <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-2">
                    Q{i + 1}
                    {c.is_correct ? <span className="inline-flex items-center gap-1 text-neon-green"><Check size={12}/> Correct</span> : <span className="inline-flex items-center gap-1 text-neon-pink"><X size={12}/> Wrong</span>}
                  </div>
                  <div className="font-semibold mb-2">{c.question}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {c.options.map((o, j) => (
                      <div key={j} className={`px-3 py-2 rounded-sm text-sm border ${
                        j === c.correct ? "border-neon-green text-neon-green" :
                        j === c.chosen ? "border-neon-pink text-neon-pink" : "border-void-border text-zinc-400"
                      }`}>
                        {String.fromCharCode(65 + j)}. {o}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card-surface rounded-sm p-5 text-center">
      <div className={`font-display font-black text-2xl md:text-3xl tracking-tighter ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">{label}</div>
    </div>
  );
}

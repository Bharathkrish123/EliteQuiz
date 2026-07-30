import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lightning, Trophy, Brain, ArrowRight, GameController, Sparkle, ClockCountdown } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function Landing() {
  const [top, setTop] = useState([]);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    api.get("/leaderboard?limit=5").then((r) => setTop(r.data.rows || [])).catch(() => {});
    api.get("/categories").then((r) => setCats(r.data.categories || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-70 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 card-raised rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-zinc-300">Live · 8 categories · AI powered</span>
            </div>
            <h1 className="font-display font-black uppercase tracking-tighter text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
              Prove you're the<br />
              <span className="text-neon-yellow">elite quizzer.</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400 max-w-xl">
              Timed multiple-choice battles across 8 categories. Climb the global leaderboard,
              unlock XP, and generate any topic with our AI Quiz mode.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/categories"
                data-testid="hero-play-btn"
                className="btn-primary px-6 py-3.5 rounded-sm inline-flex items-center gap-2 font-display uppercase text-sm tracking-widest"
              >
                <Lightning weight="fill" size={18} /> Play Now
              </Link>
              <Link
                to="/ai-quiz"
                data-testid="hero-ai-btn"
                className="btn-ghost px-6 py-3.5 rounded-sm inline-flex items-center gap-2 font-display uppercase text-sm tracking-widest"
              >
                <Sparkle weight="bold" size={18} /> Try AI Quiz
              </Link>
            </div>
          </motion.div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {[
              { k: "Categories", v: "8+", icon: GameController, c: "text-neon-yellow" },
              { k: "Questions", v: "120+", icon: Brain, c: "text-neon-cyan" },
              { k: "Timer", v: "15s", icon: ClockCountdown, c: "text-neon-green" },
              { k: "AI Topics", v: "∞", icon: Sparkle, c: "text-neon-pink" },
            ].map((s, i) => (
              <motion.div
                key={s.k}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                className="card-surface p-5 rounded-sm flex items-center gap-4"
              >
                <s.icon weight="duotone" size={28} className={s.c} />
                <div>
                  <div className="font-display font-black text-2xl tracking-tighter">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{s.k}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories preview */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold">Choose your battle</div>
            <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-4xl mt-2">Categories</h2>
          </div>
          <Link to="/categories" data-testid="see-all-cats" className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white inline-flex items-center gap-1">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cats.slice(0, 4).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/quiz/${c.id}`}
                data-testid={`cat-card-${c.id}`}
                className="group block relative aspect-[3/4] overflow-hidden rounded-sm border border-void-border hover:border-neon-yellow transition-colors"
              >
                <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105" style={{ transition: "opacity 300ms, transform 500ms" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                <div className="relative h-full p-4 flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: c.color }}>10 · Questions</div>
                  <div className="font-display font-black uppercase text-xl tracking-tight leading-tight">{c.name}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard preview + AI CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card-surface rounded-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy weight="fill" size={20} className="text-neon-yellow" />
            <h3 className="font-display font-bold uppercase tracking-tight text-xl">Global Top 5</h3>
          </div>
          {top.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">No scores yet — be the first to top the board.</div>
          ) : (
            <div className="divide-y divide-void-border">
              {top.map((r, i) => (
                <div key={i} data-testid={`leader-preview-${i}`} className="py-3 flex items-center gap-4">
                  <div className={`font-display font-black text-2xl w-8 ${i === 0 ? "text-neon-yellow" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-600"}`}>#{i + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold">{r.username}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest">{r.category_name}</div>
                  </div>
                  <div className="font-display font-black tracking-tighter text-xl">{r.score}</div>
                </div>
              ))}
            </div>
          )}
          <Link to="/leaderboard" data-testid="full-leader" className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-neon-yellow hover:underline">
            View full leaderboard <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-surface rounded-sm p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-neon-pink/10 blur-3xl" />
          <Sparkle weight="fill" size={28} className="text-neon-pink" />
          <h3 className="mt-4 font-display font-black uppercase tracking-tight text-2xl leading-tight">Any topic. Any moment.</h3>
          <p className="mt-3 text-sm text-zinc-400">Type any subject and our AI drops a fresh 10-question quiz in seconds.</p>
          <Link to="/ai-quiz" data-testid="ai-cta-btn" className="mt-6 btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-sm text-sm font-display uppercase tracking-widest">
            Generate Quiz <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-void-border mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="font-display font-bold uppercase tracking-tight text-sm">Elite<span className="text-neon-yellow">Quiz</span>Game</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest">Built for real quizzers. © {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}

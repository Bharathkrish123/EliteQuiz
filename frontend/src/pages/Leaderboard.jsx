import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Trophy, Crown } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [cats, setCats] = useState([]);
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState("all");

  useEffect(() => { api.get("/categories").then((r) => setCats(r.data.categories || [])); }, []);
  useEffect(() => {
    api.get(`/leaderboard?limit=50${active !== "all" ? `&category=${active}` : ""}`)
      .then((r) => setRows(r.data.rows || []));
  }, [active]);

  const rankColor = (i) => (i === 0 ? "text-neon-yellow" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-600");

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3">
          <Trophy weight="fill" size={28} className="text-neon-yellow" />
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl md:text-5xl">Leaderboard</h1>
        </div>
        <p className="mt-2 text-zinc-400">Top scores across all EliteQuizGame players.</p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <FilterPill active={active === "all"} onClick={() => setActive("all")} testId="filter-all">All</FilterPill>
          {cats.map((c) => (
            <FilterPill key={c.id} active={active === c.id} onClick={() => setActive(c.id)} testId={`filter-${c.id}`}>
              {c.name}
            </FilterPill>
          ))}
        </div>

        <div className="mt-8 card-surface rounded-sm overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-void-border text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-4 hidden sm:block">Category</div>
            <div className="col-span-2">Accuracy</div>
            <div className="col-span-3 sm:col-span-1 text-right">Score</div>
          </div>
          {rows.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm uppercase tracking-widest">No scores yet.</div>
          ) : rows.map((r, i) => (
            <motion.div
              key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              data-testid={`leader-row-${i}`}
              className={`grid grid-cols-12 items-center px-5 py-4 border-b border-void-border ${i === 0 ? "bg-neon-yellow/5" : i === 1 ? "bg-zinc-300/5" : i === 2 ? "bg-orange-400/5" : ""}`}
            >
              <div className={`col-span-1 font-display font-black text-xl ${rankColor(i)}`}>
                {i === 0 ? <Crown weight="fill" /> : `#${i + 1}`}
              </div>
              <div className="col-span-4 font-bold truncate">{r.username}</div>
              <div className="col-span-4 hidden sm:block text-xs uppercase tracking-widest text-zinc-400 truncate">{r.category_name}</div>
              <div className="col-span-2 text-neon-cyan font-mono text-sm">{r.accuracy}%</div>
              <div className="col-span-3 sm:col-span-1 text-right font-display font-black tracking-tighter text-lg">{r.score}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterPill({ children, active, onClick, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-xs uppercase tracking-widest font-bold border transition-colors ${
        active ? "bg-neon-yellow text-black border-neon-yellow" : "text-zinc-400 border-void-border hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

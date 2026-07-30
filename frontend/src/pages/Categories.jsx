import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

export default function Categories() {
  const [cats, setCats] = useState([]);
  useEffect(() => { api.get("/categories").then((r) => setCats(r.data.categories || [])); }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold">Step 1</div>
        <h1 className="font-display font-black uppercase tracking-tighter text-4xl md:text-5xl mt-2">Pick a category</h1>
        <p className="mt-2 text-zinc-400 max-w-lg">10 questions · 15 seconds each · streak bonuses count.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10">
          {cats.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/quiz/${c.id}`}
                data-testid={`category-${c.id}`}
                className="group block relative aspect-[3/4] overflow-hidden rounded-sm border border-void-border hover:border-neon-yellow transition-colors"
              >
                <img src={c.image} alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 group-hover:scale-105"
                  style={{ transition: "opacity 300ms, transform 500ms" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
                <div className="relative h-full p-5 flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: c.color }}>
                    10 Questions
                  </div>
                  <div>
                    <div className="font-display font-black uppercase text-2xl tracking-tight leading-tight">{c.name}</div>
                    <div className="mt-2 text-xs uppercase tracking-widest text-zinc-400 group-hover:text-neon-yellow">Play →</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

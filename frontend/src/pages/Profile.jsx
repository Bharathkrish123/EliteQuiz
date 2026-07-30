import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Trophy, Fire, Lightning, Target, Crown } from "@phosphor-icons/react";

export default function Profile() {
  const { user, ready } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (user) api.get("/me/history").then((r) => setHistory(r.data.rows || []));
  }, [user]);

  if (!ready) return null;
  if (!user) return <Navigate to="/auth?mode=login" replace />;

  const xpToNext = 500 - (user.xp % 500);
  const pct = ((user.xp % 500) / 500) * 100;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header card */}
        <div className="card-surface rounded-sm p-8 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-56 h-56 bg-neon-yellow/10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-5">
            <img
              src="https://images.unsplash.com/photo-1740252117013-4fb21771e7ca?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHw0fHxnYW1lciUyMHByb2ZpbGUlMjBhdmF0YXJ8ZW58MHx8fHwxNzg1MzkwNzQ3fDA&ixlib=rb-4.1.0&q=85"
              alt="avatar" className="w-20 h-20 rounded-sm object-cover border border-void-border"
            />
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold flex items-center gap-2">
                Player
                {user.is_pro && (
                  <span data-testid="profile-pro-badge" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-yellow text-black text-[9px] font-black">
                    <Crown weight="fill" size={10} /> PRO
                  </span>
                )}
              </div>
              <div className="font-display font-black text-3xl tracking-tighter uppercase" data-testid="profile-username">{user.username}</div>
              <div className="text-xs text-zinc-400 mt-1">{user.email}</div>
              {!user.is_pro && (
                <Link to="/pricing" data-testid="profile-upgrade-link" className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-neon-yellow hover:underline">
                  <Crown weight="fill" size={10} /> Upgrade to Elite Pro
                </Link>
              )}
            </div>
            <div className="ml-auto text-right">
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Level</div>
              <div className="font-display font-black text-4xl text-neon-cyan tracking-tighter" data-testid="profile-level">L{user.level}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500 font-bold">
              <span>Progress</span>
              <span data-testid="profile-xp">{user.xp} XP · {xpToNext} to next</span>
            </div>
            <div className="mt-2 h-2 bg-void-raised rounded-full overflow-hidden">
              <div className="h-full bg-neon-yellow" style={{ width: `${pct}%`, transition: "width 400ms" }} />
            </div>
          </div>
        </div>

        {/* Stats bento */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBig icon={Trophy} color="text-neon-yellow" label="Games" value={user.games_played} testid="stat-games" />
          <StatBig icon={Target} color="text-neon-cyan" label="Total Score" value={user.total_score} testid="stat-score" />
          <StatBig icon={Fire} color="text-neon-pink" label="Best Streak" value={user.best_streak} testid="stat-streak" />
          <StatBig icon={Lightning} color="text-neon-green" label="XP" value={user.xp} testid="stat-xp" />
        </div>

        {/* History */}
        <div className="mt-10">
          <h2 className="font-display font-bold uppercase tracking-tight text-2xl">Recent Games</h2>
          <div className="mt-4 card-surface rounded-sm overflow-hidden">
            {history.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm uppercase tracking-widest">No games yet. Play one!</div>
            ) : history.map((h, i) => (
              <div key={i} data-testid={`history-${i}`} className="grid grid-cols-12 items-center px-5 py-4 border-b border-void-border last:border-b-0">
                <div className="col-span-5 md:col-span-6 font-bold truncate">{h.category_name}</div>
                <div className="col-span-3 text-xs uppercase tracking-widest text-zinc-400">{h.correct}/{h.total}</div>
                <div className="col-span-2 text-neon-cyan font-mono text-sm">{h.accuracy}%</div>
                <div className="col-span-2 md:col-span-1 text-right font-display font-black tracking-tighter text-lg">{h.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBig({ icon: I, color, label, value, testid }) {
  return (
    <div data-testid={testid} className="card-surface rounded-sm p-5">
      <I weight="duotone" size={22} className={color} />
      <div className={`mt-3 font-display font-black text-3xl tracking-tighter ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500">{label}</div>
    </div>
  );
}

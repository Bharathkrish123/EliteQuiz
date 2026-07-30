import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Trophy, User, SignOut, Lightning, Crown } from "@phosphor-icons/react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `text-xs tracking-[0.2em] font-bold uppercase transition-colors ${
      isActive ? "text-neon-yellow" : "text-zinc-400 hover:text-white"
    }`;

  return (
    <header
      data-testid="site-navbar"
      className="sticky top-0 z-40 backdrop-blur-xl bg-[#0F0F11]/80 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group">
          <div className="w-8 h-8 grid place-items-center bg-neon-yellow text-black rounded-sm neon-yellow-glow">
            <Lightning weight="fill" size={20} />
          </div>
          <div className="font-display font-black uppercase tracking-tighter text-lg leading-none">
            Elite<span className="text-neon-yellow">Quiz</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/categories" className={linkClass} data-testid="nav-play">Play</NavLink>
          <NavLink to="/ai-quiz" className={linkClass} data-testid="nav-ai">AI Quiz</NavLink>
          <NavLink to="/leaderboard" className={linkClass} data-testid="nav-leaderboard">Leaderboard</NavLink>
          <NavLink to="/pricing" className={linkClass} data-testid="nav-pricing">Pro</NavLink>
          {user && <NavLink to="/profile" className={linkClass} data-testid="nav-profile">Profile</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 card-raised rounded-full">
                {user.is_pro && <Crown weight="fill" size={12} className="text-neon-yellow" data-testid="nav-pro-badge" />}
                <Trophy weight="fill" size={14} className="text-neon-yellow" />
                <span data-testid="nav-xp" className="font-display text-xs font-bold">{user.xp} XP</span>
                <span className="text-xs text-zinc-500">·</span>
                <span data-testid="nav-level" className="font-display text-xs font-bold text-neon-cyan">L{user.level}</span>
              </div>
              <button
                data-testid="logout-btn"
                onClick={() => { logout(); navigate("/"); }}
                className="btn-ghost text-xs uppercase tracking-widest px-3 py-2 rounded-sm flex items-center gap-2"
              >
                <SignOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth?mode=login"
                data-testid="nav-login-btn"
                className="btn-ghost text-xs uppercase tracking-widest px-4 py-2 rounded-sm"
              >
                Login
              </Link>
              <Link
                to="/auth?mode=register"
                data-testid="nav-register-btn"
                className="btn-primary text-xs uppercase tracking-widest px-4 py-2 rounded-sm hidden sm:inline-flex items-center gap-2"
              >
                <User weight="bold" size={14} /> Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

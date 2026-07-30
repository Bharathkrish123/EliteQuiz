import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Lightning } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Auth() {
  const params = new URLSearchParams(useLocation().search);
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const { login, register } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Welcome back!");
      } else {
        await register(email, username, password);
        toast.success("Account created — let's play!");
      }
      nav("/categories");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-md mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 mb-8" data-testid="auth-logo">
          <div className="w-8 h-8 grid place-items-center bg-neon-yellow text-black rounded-sm">
            <Lightning weight="fill" size={20} />
          </div>
          <span className="font-display font-black uppercase tracking-tighter">Elite<span className="text-neon-yellow">Quiz</span></span>
        </Link>

        <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold">{mode === "login" ? "Welcome back" : "Get started"}</div>
        <h1 className="mt-2 font-display font-black uppercase tracking-tighter text-4xl">
          {mode === "login" ? "Log in" : "Create account"}
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">Track XP, streaks, and climb the leaderboard.</p>

        <form onSubmit={submit} className="mt-8 card-surface rounded-sm p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Email</label>
            <input
              data-testid="auth-email"
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-void-surface border border-void-border px-4 py-3 rounded-sm focus:outline-none focus:border-neon-yellow focus:ring-1 focus:ring-neon-yellow/50"
            />
          </div>
          {mode === "register" && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Username</label>
              <input
                data-testid="auth-username"
                required minLength={2} maxLength={24}
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full bg-void-surface border border-void-border px-4 py-3 rounded-sm focus:outline-none focus:border-neon-yellow focus:ring-1 focus:ring-neon-yellow/50"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Password</label>
            <input
              data-testid="auth-password"
              type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-void-surface border border-void-border px-4 py-3 rounded-sm focus:outline-none focus:border-neon-yellow focus:ring-1 focus:ring-neon-yellow/50"
            />
          </div>
          <button
            data-testid="auth-submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-sm font-display uppercase text-xs tracking-widest disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {mode === "login" ? (
            <>New here? <button data-testid="switch-register" onClick={() => setMode("register")} className="text-neon-yellow hover:underline">Create an account</button></>
          ) : (
            <>Already have one? <button data-testid="switch-login" onClick={() => setMode("login")} className="text-neon-yellow hover:underline">Log in</button></>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/categories" data-testid="continue-guest" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white">
            Continue as guest →
          </Link>
        </div>
      </div>
    </div>
  );
}

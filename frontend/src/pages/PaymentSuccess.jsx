import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Crown, ArrowRight, ClockCountdown, XCircle } from "@phosphor-icons/react";

const MAX_POLLS = 8;
const POLL_INTERVAL_MS = 2000;

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState({ payment_status: "pending" });
  const [polls, setPolls] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const { refresh } = useAuth();
  const timerRef = useRef(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!sessionId) return;
    let attempt = 0;

    const poll = async () => {
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        setStatus(r.data);
        setPolls(attempt + 1);
        if (r.data.payment_status === "paid") {
          clearInterval(timerRef.current);
          refresh(); // refresh user to get is_pro=true
          return;
        }
        if (["failed", "expired"].includes(r.data.payment_status)) {
          clearInterval(timerRef.current);
          return;
        }
      } catch {}
      attempt += 1;
      if (attempt >= MAX_POLLS) {
        clearInterval(timerRef.current);
        setTimedOut(true);
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [sessionId, refresh]);

  const paid = status.payment_status === "paid";
  const failed = ["failed", "expired"].includes(status.payment_status);

  return (
    <div className="min-h-screen">
      <Navbar />
      {paid && <Confetti width={width} height={height} numberOfPieces={400} recycle={false} colors={["#E4FF00", "#00F0FF", "#FF0055", "#00FF66"]} />}
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        {paid ? (
          <>
            <Crown weight="fill" size={56} className="text-neon-yellow mx-auto neon-yellow-glow" />
            <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold" data-testid="pay-success-heading">Payment successful</div>
            <h1 className="mt-3 font-display font-black uppercase tracking-tighter text-5xl md:text-6xl">
              Welcome to<br /><span className="text-neon-yellow">Elite Pro.</span>
            </h1>
            <p className="mt-4 text-zinc-400">Unlimited AI quizzes are now unlocked and your profile carries the Pro badge.</p>
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              <Link to="/ai-quiz" data-testid="go-ai-btn" className="btn-primary px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest inline-flex items-center gap-2">
                Try AI Quiz <ArrowRight size={14} />
              </Link>
              <Link to="/profile" data-testid="go-profile-btn" className="btn-ghost px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest">
                View profile
              </Link>
            </div>
          </>
        ) : failed ? (
          <>
            <XCircle weight="fill" size={56} className="text-neon-pink mx-auto" />
            <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neon-pink font-bold">Payment {status.payment_status}</div>
            <h1 className="mt-3 font-display font-black uppercase tracking-tighter text-4xl">Something went wrong</h1>
            <Link to="/pricing" data-testid="try-again-btn" className="mt-8 inline-block btn-primary px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest">Try again</Link>
          </>
        ) : timedOut ? (
          <>
            <ClockCountdown weight="duotone" size={56} className="text-neon-cyan mx-auto" />
            <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neon-cyan font-bold">Still confirming</div>
            <h1 className="mt-3 font-display font-black uppercase tracking-tighter text-4xl">We're still confirming your payment</h1>
            <p className="mt-4 text-zinc-400 text-sm">This can take a few extra seconds. Refresh in a moment to see your Pro status update.</p>
            <button onClick={() => window.location.reload()} data-testid="refresh-status-btn" className="mt-8 btn-primary px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest">Refresh</button>
          </>
        ) : (
          <>
            <ClockCountdown weight="duotone" size={56} className="text-neon-cyan mx-auto animate-pulse" />
            <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neon-cyan font-bold" data-testid="pay-pending-heading">Confirming payment…</div>
            <h1 className="mt-3 font-display font-black uppercase tracking-tighter text-3xl">Hang tight</h1>
            <p className="mt-4 text-zinc-400 text-sm">Poll {polls} · this usually takes 2–5 seconds.</p>
          </>
        )}
      </div>
    </div>
  );
}

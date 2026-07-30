import { motion } from "framer-motion";

export default function TimerRing({ seconds, total = 15 }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, seconds / total));
  const offset = c * (1 - pct);
  const color = seconds > 8 ? "#00FF66" : seconds > 4 ? "#E4FF00" : "#FF0055";

  return (
    <div className="relative w-20 h-20" data-testid="timer-ring">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#27272A" strokeWidth="6" fill="none" />
        <motion.circle
          cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display font-black text-2xl tracking-tighter" style={{ color }}>
          {seconds}
        </span>
      </div>
    </div>
  );
}

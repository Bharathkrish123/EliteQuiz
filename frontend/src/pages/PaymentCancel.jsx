import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { XCircle, ArrowLeft } from "@phosphor-icons/react";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <XCircle weight="fill" size={56} className="text-neon-pink mx-auto" />
        <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neon-pink font-bold" data-testid="pay-cancel-heading">Checkout cancelled</div>
        <h1 className="mt-3 font-display font-black uppercase tracking-tighter text-5xl">No charge made.</h1>
        <p className="mt-4 text-zinc-400">You can grab Elite Pro any time — one payment, unlocked forever.</p>
        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <Link to="/pricing" data-testid="back-pricing" className="btn-primary px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest">Back to pricing</Link>
          <Link to="/" data-testid="back-home" className="btn-ghost px-5 py-3 rounded-sm font-display uppercase text-xs tracking-widest inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}

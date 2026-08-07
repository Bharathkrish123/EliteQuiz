import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check, Lightning, Sparkle, Infinity as InfinityIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatPrice(pkg) {
  if (!pkg) return null;
  const symbol = pkg.currency === "INR" ? "₹" : pkg.currency === "USD" ? "$" : `${pkg.currency} `;
  return `${symbol}${pkg.amount}`;
}

export default function Pricing() {
  const [pkgs, setPkgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState(null); // { qr_code_id, image_url, amount, currency, expires_at }
  const [qrLoading, setQrLoading] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/payments/packages").then((r) => setPkgs(r.data.packages || []));
  }, []);

  // Poll QR payment status every 3s while a QR is on screen
  useEffect(() => {
    if (!qr) return;
    const interval = setInterval(async () => {
      try {
        const r = await api.get(`/payments/qr-status/${qr.qr_code_id}`);
        if (r.data.payment_status === "paid") {
          clearInterval(interval);
          toast.success("Payment received — you're Elite Pro now 🎉");
          window.location.href = "/categories";
        }
      } catch (e) {
        // ignore transient poll errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qr]);

  const pkg = pkgs.find((p) => p.id === "elite_pro_lifetime");

  const showQr = async (pkg_id) => {
    if (!user) {
      toast.error("Log in first so we can attach Pro to your account");
      nav("/auth?mode=login");
      return;
    }
    setQrLoading(true);
    try {
      const r = await api.post("/payments/qr", { package_id: pkg_id });
      setQr(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't generate QR code");
    } finally {
      setQrLoading(false);
    }
  };

  const buy = async (pkg_id) => {
    if (!user) {
      toast.error("Log in first so we can attach Pro to your account");
      nav("/auth?mode=login");
      return;
    }

    const scriptReady = await loadRazorpayScript();
    if (!scriptReady) {
      toast.error("Couldn't load the payment widget — check your connection and try again");
      return;
    }

    setLoading(true);
    try {
      const r = await api.post("/payments/order", { package_id: pkg_id });
      const order = r.data;

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        theme: { color: "#e8ff00" },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("You're Elite Pro now 🎉");
            // Full reload so the auth context re-fetches the user with is_pro: true
            window.location.href = "/categories";
          } catch (e) {
            toast.error("Payment verification failed — contact support if you were charged");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.error("Checkout cancelled");
          },
        },
      });

      rzp.on("payment.failed", () => {
        toast.error("Payment failed — please try again");
        setLoading(false);
      });

      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Checkout failed");
      setLoading(false);
    }
  };

  const isPro = user?.is_pro;
  const price = formatPrice(pkg);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold">Elite Pro</div>
          <h1 className="mt-3 font-display font-black uppercase tracking-tighter text-5xl md:text-6xl">
            Unlock the full<br /><span className="text-neon-yellow">arsenal.</span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            One payment. Forever. Unlimited AI quizzes on any topic, an exclusive Pro badge on the
            leaderboard, and permanent bragging rights.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {/* Free tier */}
          <div className="card-surface rounded-sm p-8">
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Free</div>
            <div className="mt-3 font-display font-black text-4xl tracking-tighter">₹0</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">forever</div>
            <ul className="mt-6 space-y-3 text-sm">
              <Line>All 8 curated categories</Line>
              <Line>Global leaderboard</Line>
              <Line>3 AI quizzes per day</Line>
              <Line>XP, streaks, levels</Line>
            </ul>
            <div className="mt-8">
              <Link to="/categories" data-testid="free-cta" className="btn-ghost inline-block w-full text-center py-3 rounded-sm uppercase tracking-widest text-xs font-display">
                Continue Free
              </Link>
            </div>
          </div>

          {/* Pro tier */}
          <div className="card-raised rounded-sm p-8 border-2 border-neon-yellow neon-yellow-glow relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-neon-yellow/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-2">
              <Crown weight="fill" size={16} className="text-neon-yellow" />
              <div className="text-[10px] uppercase tracking-[0.3em] text-neon-yellow font-bold">Elite Pro · Lifetime</div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display font-black text-5xl tracking-tighter text-neon-yellow">{price || "—"}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-widest">once · forever</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <Line pro>Everything in Free</Line>
              <Line pro><InfinityIcon size={14} weight="bold" className="inline mr-1" /> Unlimited AI-generated quizzes</Line>
              <Line pro>Exclusive Pro badge on leaderboard</Line>
              <Line pro>Priority Gemini model access</Line>
              <Line pro>Support ongoing development</Line>
            </ul>
            <div className="mt-8">
              {isPro ? (
                <div data-testid="already-pro" className="w-full text-center py-3 rounded-sm bg-neon-green/10 text-neon-green uppercase tracking-widest text-xs font-display font-bold border border-neon-green/30">
                  ✓ You're already Elite Pro
                </div>
              ) : qr ? (
                <div className="border border-zinc-700 rounded-sm p-4 text-center bg-black/40">
                  <img src={qr.image_url} alt="Scan to pay with UPI" className="mx-auto w-48 h-48 bg-white p-2 rounded-sm" />
                  <div className="mt-3 text-sm text-zinc-300">
                    Scan with any UPI app to pay {qr.currency === "INR" ? "₹" : ""}{qr.amount}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500 animate-pulse">
                    Waiting for payment…
                  </div>
                  <button
                    onClick={() => setQr(null)}
                    className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500 underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    data-testid="buy-pro-btn"
                    disabled={loading}
                    onClick={() => buy("elite_pro_lifetime")}
                    className="btn-primary w-full py-3 rounded-sm uppercase tracking-widest text-sm font-display flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Lightning weight="fill" size={16} />
                    {loading ? "Opening Checkout…" : "Get Elite Pro"}
                  </button>
                  <button
                    data-testid="pay-via-qr-btn"
                    disabled={qrLoading}
                    onClick={() => showQr("elite_pro_lifetime")}
                    className="btn-ghost w-full py-3 mt-3 rounded-sm uppercase tracking-widest text-xs font-display disabled:opacity-60"
                  >
                    {qrLoading ? "Generating QR…" : "Pay via UPI QR"}
                  </button>
                </>
              )}
              <div className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500 text-center">
                Secure checkout via Razorpay · UPI, cards, netbanking &amp; wallets
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 card-surface rounded-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkle weight="fill" size={16} className="text-neon-pink" />
            <div className="font-display uppercase tracking-tight text-sm">FAQ</div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <FaqItem q="Is this a subscription?">No — it's a one-time payment. Pay once, unlocked forever.</FaqItem>
            <FaqItem q="How do refunds work?">Contact us within 7 days for a full refund, no questions asked.</FaqItem>
            <FaqItem q="Which AI powers the quizzes?">Google's Gemini 2.5 Flash generates fresh questions for any topic.</FaqItem>
            <FaqItem q="What payment methods are supported?">UPI, credit/debit cards, netbanking, and wallets — all handled securely through Razorpay.</FaqItem>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ children, pro }) {
  return (
    <li className="flex items-start gap-2">
      <Check weight="bold" size={14} className={pro ? "text-neon-yellow mt-1" : "text-neon-green mt-1"} />
      <span className={pro ? "text-white" : "text-zinc-300"}>{children}</span>
    </li>
  );
}

function FaqItem({ q, children }) {
  return (
    <div>
      <div className="font-bold text-sm">{q}</div>
      <div className="mt-1 text-zinc-400 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

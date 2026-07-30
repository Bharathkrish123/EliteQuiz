import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import TimerRing from "@/components/TimerRing";
import { api } from "@/lib/api";
import { Fire, Lightning } from "@phosphor-icons/react";

const TIMER_SECS = 15;

export default function QuizPlay() {
  const { category } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const preloaded = location.state?.quiz;

  const [quiz, setQuiz] = useState(preloaded || null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [secs, setSecs] = useState(TIMER_SECS);
  const [streak, setStreak] = useState(0);
  const [startTime] = useState(() => Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (preloaded) return;
    api.post(`/quiz/start/${category}`)
      .then((r) => setQuiz(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load quiz"));
  }, [category, preloaded]);

  const q = quiz?.questions?.[idx];
  const total = quiz?.questions?.length || 0;

  // Timer
  useEffect(() => {
    if (!q || locked) return;
    setSecs(TIMER_SECS);
    timerRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          handleLock(-1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [idx, quiz]);

  const handleLock = (choice) => {
    if (locked) return;
    setLocked(true);
    setSelected(choice);
    clearInterval(timerRef.current);
    const isCorrect = choice !== -1 && q.correctPreview === choice; // we don't have this — server holds truth
    // We can't verify locally without answer; visually just mark chosen.
    setStreak((s) => (choice === -1 ? 0 : s + 1));
    setAnswers((a) => {
      const copy = [...a];
      copy[idx] = choice;
      return copy;
    });
    setTimeout(() => {
      if (idx + 1 >= total) {
        submit([...answers.slice(0, idx), choice]);
      } else {
        setIdx((i) => i + 1);
        setSelected(null);
        setLocked(false);
      }
    }, 900);
  };

  const submit = async (finalAnswers) => {
    try {
      const time_taken_ms = Date.now() - startTime;
      const r = await api.post("/quiz/submit", {
        quiz_id: quiz.quiz_id,
        answers: finalAnswers,
        time_taken_ms,
      });
      nav("/result", { state: { result: r.data, category: quiz.category_name } });
    } catch (e) {
      setError(e.response?.data?.detail || "Submit failed");
    }
  };

  const progressPct = useMemo(() => (total ? ((idx) / total) * 100 : 0), [idx, total]);

  if (error) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="max-w-2xl mx-auto p-10 text-center">
          <div className="text-neon-pink font-display uppercase tracking-widest">{error}</div>
          <button onClick={() => nav(-1)} className="mt-6 btn-ghost px-4 py-2 rounded-sm text-sm uppercase tracking-widest" data-testid="quiz-error-back">Back</button>
        </div>
      </div>
    );
  }

  if (!quiz) return <div className="min-h-screen"><Navbar />
    <div className="max-w-2xl mx-auto p-10 text-center text-zinc-400 uppercase tracking-widest text-sm">Loading quiz…</div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-neon-yellow font-bold">
              {quiz.category_name}
            </div>
            <div className="mt-1 font-display font-black text-2xl tracking-tighter">
              Question <span className="text-neon-yellow">{idx + 1}</span>
              <span className="text-zinc-600"> / {total}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 card-raised px-3 py-2 rounded-sm">
              <Fire weight="fill" size={16} className="text-neon-pink" />
              <span className="font-display font-black text-sm" data-testid="streak-count">{streak}</span>
              <span className="text-[10px] tracking-widest uppercase text-zinc-500">Streak</span>
            </div>
            <TimerRing seconds={secs} total={TIMER_SECS} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1 bg-void-raised rounded-full overflow-hidden">
          <div className="h-full bg-neon-yellow" style={{ width: `${progressPct}%`, transition: "width 400ms ease" }} />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="mt-10"
          >
            <h2 className="font-display font-bold text-2xl md:text-3xl leading-snug tracking-tight" data-testid="question-text">
              {q.question}
            </h2>

            <div className="mt-8 grid gap-3">
              {q.options.map((opt, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    data-testid={`option-${i}`}
                    disabled={locked}
                    onClick={() => handleLock(i)}
                    className={`text-left px-5 py-4 rounded-sm border flex items-center gap-4 transition-colors ${
                      isSelected
                        ? "bg-neon-yellow text-black border-neon-yellow"
                        : "card-raised hover:border-neon-yellow border-void-border"
                    }`}
                    style={{ transition: "background-color 200ms, border-color 200ms, color 200ms" }}
                  >
                    <span className={`w-8 h-8 grid place-items-center border rounded-sm font-display font-black text-sm ${isSelected ? "border-black text-black" : "border-void-border text-zinc-400"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 font-medium">{opt}</span>
                    {isSelected && <Lightning weight="fill" size={16} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";
import Categories from "@/pages/Categories";
import QuizPlay from "@/pages/QuizPlay";
import Result from "@/pages/Result";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import AIQuiz from "@/pages/AIQuiz";
import Auth from "@/pages/Auth";
import Pricing from "@/pages/Pricing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/quiz/:category" element={<QuizPlay />} />
            <Route path="/result" element={<Result />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai-quiz" element={<AIQuiz />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-center" toastOptions={{
          style: { background: "#0F0F11", color: "#fff", border: "1px solid #27272A" }
        }} />
      </AuthProvider>
    </div>
  );
}

export default App;

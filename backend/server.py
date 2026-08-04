from google import genai
import json
import os
import json
import uuid
import random
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from dotenv import load_dotenv

from quiz_data import CATEGORIES, QUESTIONS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
JWT_ALG = "HS256"
JWT_EXP_MINUTES = 60 * 24 * 7  # 7 days

# Server-defined product catalog — clients only send package_id, never amounts.
PACKAGES = {
    "elite_pro_lifetime": {
        "name": "Elite Pro — Lifetime",
        "amount": 10,
        "currency": "INR",
        "description": "One-time · unlocks unlimited AI quizzes + Pro badge forever.",
    },
}
FREE_AI_QUIZZES_PER_DAY = 3

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
# Initialize Gemini client
gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)
app = FastAPI(title="EliteQuizGame API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("elitequiz")


# =========================
# Models
# =========================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str = Field(min_length=2, max_length=24)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    username: str
    xp: int = 0
    level: int = 1
    games_played: int = 0
    total_score: int = 0
    best_streak: int = 0
    is_pro: bool = False
    created_at: str


class AuthOut(BaseModel):
    token: str
    user: UserOut


class Question(BaseModel):
    id: str
    question: str
    options: List[str]
    # note: correct answer NOT returned to client on quiz-start


class QuizStartOut(BaseModel):
    quiz_id: str
    category_id: str
    category_name: str
    questions: List[Question]


class SubmitIn(BaseModel):
    quiz_id: str
    answers: List[int]  # index chosen per question (-1 = skipped)
    time_taken_ms: int = 0


class SubmitOut(BaseModel):
    score: int
    correct: int
    total: int
    accuracy: float
    xp_earned: int
    new_level: int
    best_streak: int
    corrections: List[dict]  # per-question: {question, chosen, correct, is_correct, explanation}


class AIQuizIn(BaseModel):
    topic: str = Field(min_length=2, max_length=80)
    count: int = Field(default=10, ge=5, le=15)


class LeaderRow(BaseModel):
    username: str
    score: int
    category: str
    accuracy: float
    created_at: str


# =========================
# Utilities
# =========================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXP_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def level_from_xp(xp: int) -> int:
    # Level up every 500 xp
    return max(1, xp // 500 + 1)


# =========================
# Auth routes
# =========================
@api.get("/")
async def root():
    return {"service": "EliteQuizGame", "status": "ok"}


@api.post("/auth/register", response_model=AuthOut)
async def register(data: RegisterIn):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "xp": 0,
        "level": 1,
        "games_played": 0,
        "total_score": 0,
        "best_streak": 0,
        "is_pro": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_token(user_id)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return {"token": token, "user": doc}


@api.post("/auth/login", response_model=AuthOut)
async def login(data: LoginIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    dummy = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO4jMhFqzr2WGxvZ8XmvjF8w4LvNSSf62"
    stored = user["password_hash"] if user else dummy
    ok = verify_password(data.password, stored)
    if not user or not ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(user["id"])
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return user


# =========================
# Categories & Quiz
# =========================
@api.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}


@api.post("/quiz/start/{category_id}", response_model=QuizStartOut)
async def start_quiz(category_id: str):
    if category_id not in QUESTIONS:
        raise HTTPException(status_code=404, detail="Category not found")
    cat = next((c for c in CATEGORIES if c["id"] == category_id), None)
    pool = QUESTIONS[category_id][:]
    random.shuffle(pool)
    selected = pool[:10]

    quiz_id = str(uuid.uuid4())
    stored_qs = []
    client_qs = []
    for q in selected:
        qid = str(uuid.uuid4())
        stored_qs.append({
            "id": qid, "question": q["q"], "options": q["opts"], "answer_index": q["a"],
            "explanation": q.get("exp", "")
        })
        client_qs.append({"id": qid, "question": q["q"], "options": q["opts"]})

    await db.quizzes.insert_one({
        "id": quiz_id,
        "category_id": category_id,
        "category_name": cat["name"],
        "questions": stored_qs,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "quiz_id": quiz_id,
        "category_id": category_id,
        "category_name": cat["name"],
        "questions": client_qs,
    }


@api.post("/quiz/ai/start", response_model=QuizStartOut)
async def start_ai_quiz(
    data: AIQuizIn,
    authorization: Optional[str] = Header(default=None)
):
    # ---------------------------
    # Check logged-in user
    # ---------------------------
    user = None

    if authorization and authorization.lower().startswith("bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            user = await db.users.find_one({"id": payload["sub"]})
        except Exception:
            user = None

    is_pro = bool(user and user.get("is_pro"))

    # ---------------------------
    # Daily free limit
    # ---------------------------
    if not is_pro:

        key = user["id"] if user else None

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        q = {"user_id": key, "day": today} if key else {
            "anon": True,
            "day": today
        }

        rec = await db.ai_daily.find_one(q)

        used = (rec or {}).get("count", 0)

        if used >= FREE_AI_QUIZZES_PER_DAY:
            raise HTTPException(
                status_code=402,
                detail="Daily AI quiz limit reached."
            )

    # ---------------------------
    # Prompt
    # ---------------------------
    prompt = f"""
You are a professional quiz generator.

Generate exactly {data.count} multiple-choice questions about:

{data.topic}

Rules:

- Return ONLY JSON.
- No markdown.
- No explanation.
- Exactly {data.count} questions.
- Four options.
- Correct answer index 0-3.

Format:

{{
  "questions":[
    {{
      "q":"Question",
      "opts":["A","B","C","D"],
      "a":0
    }}
  ]
}}
"""

    try:

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )

        text = response.text

        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

        parsed = json.loads(text)

        items = parsed["questions"]

    except Exception as e:
        logger.exception(e)
        raise HTTPException(
            status_code=500,
            detail="AI generation failed"
        )

    quiz_id = str(uuid.uuid4())

    stored_qs = []

    client_qs = []

    for item in items:

        qid = str(uuid.uuid4())

        stored_qs.append({
            "id": qid,
            "question": item["q"],
            "options": item["opts"],
            "answer_index": item["a"],
            "explanation": ""
        })

        client_qs.append({
            "id": qid,
            "question": item["q"],
            "options": item["opts"]
        })

    await db.quizzes.insert_one({
        "id": quiz_id,
        "category_id": "ai",
        "category_name": data.topic,
        "questions": stored_qs,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    if not is_pro:

        key = user["id"] if user else None

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        q = {"user_id": key, "day": today} if key else {
            "anon": True,
            "day": today
        }

        await db.ai_daily.update_one(
            q,
            {"$inc": {"count": 1}},
            upsert=True
        )

    return {
        "quiz_id": quiz_id,
        "category_id": "ai",
        "category_name": data.topic,
        "questions": client_qs
    }
@api.post("/quiz/submit", response_model=SubmitOut)
async def submit_quiz(
    data: SubmitIn,
    authorization: Optional[str] = Header(default=None),
):
    quiz = await db.quizzes.find_one({"id": data.quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    qs = quiz["questions"]
    total = len(qs)
    correct = 0
    streak = 0
    best_streak = 0
    corrections = []
    for i, q in enumerate(qs):
        chosen = data.answers[i] if i < len(data.answers) else -1
        is_correct = chosen == q["answer_index"]
        if is_correct:
            correct += 1
            streak += 1
            best_streak = max(best_streak, streak)
        else:
            streak = 0
        corrections.append({
            "question": q["question"],
            "options": q["options"],
            "chosen": chosen,
            "correct": q["answer_index"],
            "is_correct": is_correct,
        })

    # Scoring: 100 base per correct + streak bonus, time bonus
    score = correct * 100 + best_streak * 25
    time_bonus = max(0, 300 - (data.time_taken_ms // 1000)) if data.time_taken_ms else 0
    score += time_bonus
    accuracy = round((correct / total) * 100, 1) if total else 0

    # Determine user (optional)
    user = None
    user_id = None
    username = "Guest"
    if authorization and authorization.lower().startswith("bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            user = await db.users.find_one({"id": payload["sub"]})
            if user:
                user_id = user["id"]
                username = user["username"]
        except Exception:
            pass

    xp_earned = correct * 20 + best_streak * 10
    new_level = 1
    new_best_streak = best_streak

    if user:
        new_xp = user.get("xp", 0) + xp_earned
        new_level = level_from_xp(new_xp)
        new_best_streak = max(user.get("best_streak", 0), best_streak)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "xp": new_xp,
                "level": new_level,
                "best_streak": new_best_streak,
            },
             "$inc": {
                "games_played": 1,
                "total_score": score,
             }}
        )

    # Save leaderboard entry (guests too, but attributed 'Guest')
    await db.scores.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": username,
        "category_id": quiz["category_id"],
        "category_name": quiz["category_name"],
        "score": score,
        "correct": correct,
        "total": total,
        "accuracy": accuracy,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "accuracy": accuracy,
        "xp_earned": xp_earned,
        "new_level": new_level,
        "best_streak": new_best_streak,
        "corrections": corrections,
    }


@api.get("/leaderboard")
async def leaderboard(category: Optional[str] = None, limit: int = 20):
    q = {}
    if category and category != "all":
        q["category_id"] = category
    rows = await db.scores.find(q, {"_id": 0}).sort("score", -1).limit(limit).to_list(limit)
    return {"rows": rows}


@api.get("/me/history")
async def my_history(user=Depends(get_current_user), limit: int = 20):
    rows = await db.scores.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"rows": rows}


# =========================
# Payments (Stripe — Flow B via emergentintegrations)
# =========================
class CheckoutIn(BaseModel):
    package_id: str
    origin_url: str


@api.get("/payments/packages")
async def list_packages():
    return {
        "packages": [
            {"id": pid, **{k: v for k, v in pkg.items() if k != "amount"}, "amount": pkg["amount"]}
            for pid, pkg in PACKAGES.items()
        ]
    }


def _stripe_checkout(request: Request) -> StripeCheckout:
    # Build webhook URL from incoming request base_url — never hardcode
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api.post("/payments/checkout")
async def create_checkout(data: CheckoutIn, request: Request, authorization: Optional[str] = Header(default=None)):
    pkg = PACKAGES.get(data.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Unknown package")

    # Attach user_id if authenticated (optional)
    user_id = None
    if authorization and authorization.lower().startswith("bearer "):
        try:
            payload = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG])
            user_id = payload.get("sub")
        except Exception:
            user_id = None

    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"

    sc = _stripe_checkout(request)
    req = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency=pkg["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user_id or "", "package_id": data.package_id},
    )
    session = await sc.create_checkout_session(req)

    # Persist BEFORE returning
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user_id,
        "package_id": data.package_id,
        "amount": pkg["amount"],
        "currency": pkg["currency"],
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}


async def _apply_paid_side_effects(txn: dict):
    """Idempotent: grant Pro to user if package is elite_pro_lifetime."""
    if txn.get("package_id") == "elite_pro_lifetime" and txn.get("user_id"):
        await db.users.update_one({"id": txn["user_id"]}, {"$set": {"is_pro": True}})


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.get("payment_status") != "paid":
        try:
            sc = _stripe_checkout(request)
            status = await sc.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                res = await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                if res.modified_count:
                    await _apply_paid_side_effects(txn)
                txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except Exception as e:
            logger.warning(f"status poll error: {e}")

    return {
        "session_id": txn["session_id"],
        "status": txn["status"],
        "payment_status": txn["payment_status"],
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "") or request.headers.get("stripe-signature", "")
    sc = _stripe_checkout(request)
    try:
        evt = await sc.handle_webhook(body, sig)
    except Exception as e:
        logger.warning(f"webhook verify error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    session_id = getattr(evt, "session_id", None)
    payment_status_val = getattr(evt, "payment_status", None)
    if session_id and payment_status_val == "paid":
        res = await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {
                "status": "completed",
                "payment_status": "paid",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        if res.modified_count:
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if txn:
                await _apply_paid_side_effects(txn)
    return {"ok": True}


# =========================
# App wiring
# =========================
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

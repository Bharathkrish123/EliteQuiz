"""
Backend tests for Stripe payments integration + AI free-tier daily limit.
Uses public REACT_APP_BACKEND_URL. Cleans up TEST_ users and test payment/ai_daily records.
"""
import os
import uuid
import time
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

# Load backend .env to access MONGO_URL / DB_NAME
load_dotenv(Path(__file__).parent.parent / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fall back to reading frontend .env
    fe_env = Path(__file__).parent.parent.parent / "frontend" / ".env"
    for ln in fe_env.read_text().splitlines():
        if ln.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")
            break

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def fresh_user(api_client):
    """Create a fresh user and return (token, user, email)."""
    email = f"TEST_{uuid.uuid4().hex[:10]}@test.com"
    r = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "pass1234", "username": f"t{uuid.uuid4().hex[:6]}"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    yield data["token"], data["user"], email
    # cleanup
    try:
        db.users.delete_many({"email": email})
        db.ai_daily.delete_many({"user_id": data["user"]["id"]})
        db.payment_transactions.delete_many({"user_id": data["user"]["id"]})
    except Exception:
        pass


# ---------- Payments ----------
class TestPayments:
    def test_list_packages(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/payments/packages")
        assert r.status_code == 200
        pkgs = r.json()["packages"]
        elite = next((p for p in pkgs if p["id"] == "elite_pro_lifetime"), None)
        assert elite is not None, "elite_pro_lifetime missing"
        assert elite["amount"] == 9.99
        assert elite["currency"] == "usd"

    def test_checkout_creates_session_and_persists_txn(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "elite_pro_lifetime",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert "checkout_url" in j and "session_id" in j
        assert j["checkout_url"].startswith("https://checkout.stripe.com"), f"bad url: {j['checkout_url']}"

        # persisted?
        txn = db.payment_transactions.find_one({"session_id": j["session_id"]})
        assert txn is not None
        assert txn["status"] == "initiated"
        assert txn["payment_status"] == "pending"
        assert txn["amount"] == 9.99
        # cleanup
        db.payment_transactions.delete_one({"session_id": j["session_id"]})

    def test_checkout_unknown_package(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "does_not_exist",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 400

    def test_payment_status_pending_for_new_session(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "elite_pro_lifetime",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 200
        sid = r.json()["session_id"]
        r2 = api_client.get(f"{BASE_URL}/api/payments/status/{sid}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["session_id"] == sid
        assert d["payment_status"] in ("pending", "paid")  # brand new should be pending
        # cleanup
        db.payment_transactions.delete_one({"session_id": sid})

    def test_payment_status_not_found(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/payments/status/no_such_session_id_xyz")
        assert r.status_code == 404


# ---------- AI free-tier daily limit ----------
class TestAILimit:
    def test_free_user_hits_402_on_4th_call(self, api_client, fresh_user):
        token, user, _ = fresh_user
        headers = {"Authorization": f"Bearer {token}"}
        # Pre-seed ai_daily counter to 3 to avoid burning Gemini calls
        today = time.strftime("%Y-%m-%d", time.gmtime())
        db.ai_daily.update_one(
            {"user_id": user["id"], "day": today},
            {"$set": {"count": 3}},
            upsert=True,
        )
        r = api_client.post(f"{BASE_URL}/api/quiz/ai/start",
                            headers=headers,
                            json={"topic": "Space", "count": 5})
        assert r.status_code == 402, r.text
        detail = r.json().get("detail", {})
        assert isinstance(detail, dict)
        assert detail.get("code") == "AI_LIMIT_REACHED"
        assert detail.get("limit") == 3

    def test_pro_user_bypasses_limit(self, api_client, fresh_user):
        token, user, _ = fresh_user
        headers = {"Authorization": f"Bearer {token}"}
        today = time.strftime("%Y-%m-%d", time.gmtime())
        # push counter well over limit AND make user pro
        db.ai_daily.update_one(
            {"user_id": user["id"], "day": today},
            {"$set": {"count": 99}},
            upsert=True,
        )
        db.users.update_one({"id": user["id"]}, {"$set": {"is_pro": True}})
        # pro user should NOT get 402. We don't need a full AI generation to succeed —
        # accept 200 or 502 (AI upstream), but MUST NOT be 402.
        r = api_client.post(f"{BASE_URL}/api/quiz/ai/start",
                            headers=headers,
                            json={"topic": "Cats", "count": 5})
        assert r.status_code != 402, f"pro user was rate-limited: {r.status_code} {r.text}"

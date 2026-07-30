# EliteQuizGame — PRD

## Original problem statement
Build a quiz competition website that looks very attractive and host it for free in the name of "EliteQuizGame.com" — share final output as live URL.

## Architecture
- Backend: FastAPI (server.py) + MongoDB (motor) — all routes prefixed with `/api`
- Auth: JWT (bcrypt) with 7-day tokens
- Quiz content: 8 curated categories × 15 questions each in `quiz_data.py` (10 randomly picked per quiz)
- AI Quiz: Gemini 2.5 Flash via emergentintegrations universal key
- Frontend: React (CRA) + Tailwind, Framer Motion, Phosphor Icons, react-confetti, sonner toasts
- Design: "Electric & Neon" dark theme (Unbounded display + Outfit body), void black with neon yellow/pink/cyan/green accents

## Core requirements (static)
- Timed 10-question MCQ quizzes (15s per Q)
- 8 categories + AI mode (any topic)
- Global leaderboard with category filter
- User profile with XP, level (500 XP per level), best streak, games played
- Guest play supported (attributed "Guest" on leaderboard)
- Score = correct × 100 + best_streak × 25 + time_bonus(max 300)

## What's been implemented (2026-02)
- FastAPI backend with auth (register/login/me), categories, quiz start (curated + AI), quiz submit with corrections, leaderboard, personal history
- React frontend with routes: `/`, `/categories`, `/quiz/:category`, `/result`, `/leaderboard`, `/profile`, `/ai-quiz`, `/auth`
- Landing hero + stats + category preview + leaderboard preview + AI CTA
- Timer ring SVG, streak counter, question progression, animated result screen with confetti
- Global leaderboard with category filter pills, Profile page with bento stats + XP bar + history
- Data-testids on all interactive/informational elements

## Backlog (P1/P2)
- P1: Difficulty selector (easy/med/hard)
- P1: Weekly/daily leaderboard windows
- P2: Head-to-head realtime multiplayer (websocket)
- P2: Badges/achievements system
- P2: Category-specific streaks & season passes
- P2: Custom user avatars

## Next tasks
- Run testing agent end-to-end (backend + frontend)
- Fix any P0/P1 issues found

# AI Fitness Assistant - Deployment Handoff

## 1) Project Overview

This project is a **Next.js (Pages Router) web app** with:
- a MongoDB-backed API layer inside Next.js (`pages/api/*`)
- a separate Python FastAPI inference service for fridge detection (`inference/`)
- optional external ML endpoints (hydration/gym-plan) reached via `NEXT_PUBLIC_API_URL`

Target deployment:
- **Frontend + Next API routes:** Vercel
- **Python inference service:** Render

---

## 2) Runtime Architecture

### User-facing app (Vercel)
- React UI modules render dashboard, onboarding, hydration, workout, diet, fridge, chatbot.
- UI calls either:
  - Next API routes (`/api/*`) for DB-backed operations
  - external ML endpoint via `NEXT_PUBLIC_API_URL` for hydration/gym features

### Fridge detection path
1. Browser uploads image to `POST /api/fridge/detect` (Next API).
2. Route parses multipart image with `formidable`.
3. If `USE_LOCAL_MODEL=true`, Next route calls Render FastAPI service (`LOCAL_MODEL_URL/detect`).
4. Python service loads YOLO model from `MODEL_PATH` (default `models/best.pt`).
5. Detections are merged into MongoDB user fridge items.

### Data store
- MongoDB via `mongoose`, single `User` document model with nested sections:
  - login, personalDetails, fitnessGoals, schedule, workoutPlan, progress, hydration, fridge.

---

## 3) Top-Level Structure (What Each Folder Does)

```text
AI-Fitness-Assistant-fridge-analyzer/
├─ components/              # UI components (sidebar + feature modules)
├─ data/                    # Static CSV data (e.g., gym mapping)
├─ deploy/                  # Standalone model package (best.pt + labels + local inference example)
├─ inference/               # Python FastAPI YOLO service for fridge detection
├─ lib/                     # Shared server utilities (DB, API clients, heuristics, lookups)
├─ models/                  # Mongoose schema definitions
├─ pages/                   # Next.js pages + API routes
├─ public/                  # Static assets
├─ styles/                  # Styling
├─ tests/                   # Jest tests for frontend/modules
├─ utils/                   # Frontend helpers/constants (auth validation, prompt text, etc.)
├─ env.example              # Environment variable template
└─ package.json             # Next.js scripts/dependencies
```

---

## 4) Key Application Pages

### `pages/index.js`
- Login/signup screen.
- Calls:
  - `POST /api/users/login`
  - `POST /api/users/signup`
  - `GET /api/users/me` after login

### `pages/onboarding.js`
- Multi-step onboarding wizard.
- Generates workout plan through `POST /api/ai/workout-plan` (Gemini-backed).
- Saves user profile + workout plan through `PUT /api/users/me`.

### `pages/dashboard.js`
- Main shell and tab routing for modules:
  - Home, Workout, Hydration, Posture, Chat, DietPlanner, FridgeDetector.

### `pages/profile.js`
- Read-only profile/summary from `GET /api/users/me`.

### `pages/settings.js`
- User settings editor.
- Uses `PUT /api/users/me` and `DELETE /api/users/me?userId=...`.

---

## 5) Feature Modules (`components/modules`)

### `HomeComponent.js`
- Dashboard summary cards and quick actions.

### `Workout.js`
- Workout plan rendering + completion/progress interactions.

### `Hydration.js`
- Water tracking + weather-assisted hydration calculator.
- Calls external backend endpoint:
  - `${NEXT_PUBLIC_API_URL}/hydration/predict`
- Persists hydration updates via internal API route:
  - `POST /api/update-hydration`

### `DietPlanner.js`
- Builds diet/gym recommendations.
- First tries `POST /api/diet/predict` (internal route with local fallback logic).
- Can fallback to remote `${NEXT_PUBLIC_API_URL}/diet/predict` if needed.

### `FridgeDetector.js`
- Upload fridge image and trigger detection.
- Calls `POST /api/fridge/detect`.
- Manual item management via `GET/POST/DELETE /api/fridge/items`.

### `Chatbot.js`
- AI chat/workout-plan parsing UI logic.

### `Posture.js`
- Posture tracker module using remote API base (`NEXT_PUBLIC_API_URL`) when configured.

---

## 6) Next API Routes (`pages/api`) and Purpose

### Auth and user core
- `users/signup.js` - create user.
- `users/login.js` - authenticate user (currently plain-text password comparison).
- `users/me.js` - central profile fetch/update endpoint (GET/PUT/PATCH/DELETE behavior used across app).
- `users/route.js` - generic list/create users route.

### Profile sub-sections (legacy/specialized)
- `personal-details.js` - read/update personal details.
- `fitness-goals.js` - read/update fitness goals.
- `schedule.js` - read/update schedule.
- `progress.js` - read/update progress.
- `hydration.js` - read/update hydration.
- `updateProfile.js` - alternate profile update endpoint.
- `update-hydration.js` - targeted hydration goal/progress update.

### Diet and nutrition
- `diet/info.js` - static selectable options for UI.
- `diet/predict.js` - computes BMI/targets, tries remote gym-plan model, falls back to CSV lookup, builds fridge recipes.

### Fridge management
- `fridge/items.js` - CRUD-like operations for fridge items in MongoDB.
- `fridge/detect.js` - image upload parsing + detector call + fridge merge logic.

### AI generation
- `ai/workout-plan.js` - Gemini prompt route using:
  - `GEMINI_API_KEY` (preferred)
  - fallback `NEXT_PUBLIC_GEMINI_API_KEY`

---

## 7) Core Server Libraries (`lib`)

### `lib/mongodb.js`
- Creates cached MongoDB connection using `NEXT_MONGODB_URI`.

### `lib/fastApiClient.js`
- Central helper for remote backend base URL resolution and request handling.
- Uses:
  - `LOCAL_MODEL_URL` for local/render fridge YOLO service
  - `NEXT_PUBLIC_API_URL` / `FASTAPI_URL` / `ML_API_URL` for external ML routes

### `lib/dietHeuristics.js`
- Local deterministic BMI and calorie/protein target calculations.

### `lib/gymCsvIndex.js`
- Reads `data/GYM.csv` and performs fallback gym-plan lookup when remote model unavailable.

### `lib/nutritionLookup.js`
- Looks up food nutrition metadata from CSV dataset (if present).

### `lib/recipesFromFridge.js`
- Builds simple recipe suggestions from fridge items + user targets.

---

## 8) Data Model

### `models/User.js`
- Single comprehensive user schema containing:
  - `login` (fullName, email, password)
  - `personalDetails`
  - `fitnessGoals`
  - `schedule`
  - `workoutPlan` + `workoutHistory`
  - `dailyProgress`
  - `progress`
  - `hydration`
  - `fridge` (items + nutrition snapshot + lastDetectedImageAt)

---

## 9) Python Inference Service (Render)

### `inference/app.py`
- FastAPI app exposing:
  - `GET /health`
  - `POST /detect` (multipart `image`, optional `conf`)
- Loads model at startup with Ultralytics:
  - `MODEL_PATH` env (default `models/best.pt`)

### `inference/requirements.txt`
- `fastapi`, `uvicorn[standard]`, `ultralytics`, `python-multipart`, `Pillow`

### `inference/models/best.pt`
- Active YOLO weight file currently used by backend inference service.

### `deploy/` package
- `deploy/best.pt`, `deploy/labels.txt`, `deploy/inference_example.py`
- This is a clean model artifact bundle; app runtime currently uses `inference/models/best.pt`.

---

## 10) Environment Variables by Platform

## Vercel (Next.js app)
- `NEXT_MONGODB_URI` - MongoDB connection string.
- `USE_LOCAL_MODEL=true` - route fridge detection to Render YOLO service.
- `LOCAL_MODEL_URL=https://<render-service-url>` - Render base URL for `POST /detect`.
- `NEXT_PUBLIC_API_URL=https://<remote-ml-api>` - required for hydration/posture and remote gym-plan routes.
- `GEMINI_API_KEY=<server key>` - recommended for workout-plan API route.
- `NEXT_PUBLIC_GEMINI_API_KEY=<optional fallback>`

## Render (Python inference service)
- `MODEL_PATH=models/best.pt` (or absolute path if changed)
- `CORS_ORIGINS=https://<your-vercel-domain>`
- Start command should run Uvicorn for `inference/app.py` (for example: `uvicorn app:app --host 0.0.0.0 --port $PORT` from `inference/`).

---

## 11) Build and Run Commands

## Frontend (local)
- `npm install`
- `npm run dev`

## Inference service (local)
- `cd inference`
- `pip install -r requirements.txt`
- `uvicorn app:app --host 0.0.0.0 --port 8000`

---

## 12) Deployment Checklist (for handoff engineer)

1. Configure Vercel env vars listed above.
2. Deploy Render service from `inference/` directory.
3. Ensure Render has the model file at `inference/models/best.pt` and correct `MODEL_PATH`.
4. Verify Render health endpoint returns model loaded:
   - `GET /health` -> `"model_loaded": true`
5. In Vercel, set:
   - `USE_LOCAL_MODEL=true`
   - `LOCAL_MODEL_URL=<render-url>`
6. Smoke test in app:
   - Login/signup
   - Onboarding plan generation
   - Fridge detect upload/save
   - Diet planner generation
   - Hydration prediction call

---

## 13) Known Implementation Notes

- Authentication currently compares plain-text passwords in `users/login.js`; no hashing/JWT/session.
- Some legacy API routes overlap in purpose with `users/me.js`.
- Hydration and some ML paths rely on `NEXT_PUBLIC_API_URL` endpoint availability.
- Do not share `.env.local` directly; it contains secrets. Share only sanitized values through deployment platform env settings.


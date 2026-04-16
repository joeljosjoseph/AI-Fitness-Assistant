# Branch checklist: diet + fridge (teammate merge)

## What this branch is meant to include

Your scope is **Diet Planner** and **Fridge image detection**. The app should still work with a deployed backend when `NEXT_PUBLIC_API_URL` is set: the Diet Planner tries the local Next.js routes first, then falls back to `{NEXT_PUBLIC_API_URL}/diet/info` and `/diet/predict`.

## Files that belong to this contribution

### Diet

| Path | Purpose |
|------|---------|
| `components/modules/DietPlanner.js` | UI, fridge-aware recipes, GYM / ML copy |
| `pages/api/diet/info.js` | Dropdown options |
| `pages/api/diet/predict.js` | BMI + targets + FastAPI ML call + CSV fallback + recipes |
| `lib/dietHeuristics.js` | Calorie / protein heuristics |
| `lib/gymCsvIndex.js` | `GYM.csv` lookup fallback |
| `lib/parseCsvLine.js` | CSV parsing for `GYM.csv` |
| `lib/recipesFromFridge.js` | Fridge-based recipe templates |
| `lib/fastApiClient.js` | Server-side FastAPI client for ML-backed routes |
| `ml_api/main.py` | Single FastAPI app entrypoint |
| `ml_api/diet_model.py` | Diet-model inference helper |
| `ml_api/_bmi.py` | Shared diet BMI helpers |
| `ml_api/artifacts/diet_rf_pipeline.joblib` | Trained Random Forest artifact |
| `ml_api/artifacts/diet_rf_meta.json` | Diet model metadata |
| `data/GYM.csv` | Training data + CSV fallback (~16 MB) |
| `tests/DietPlanner.test.js` | Tests |
| `package.json` | Next.js app scripts |

### Fridge (image)

| Path | Purpose |
|------|---------|
| `ml_api/fridge_model.py` | Fridge-model inference helper |
| `components/modules/FridgeDetector.js` | Fridge UI |
| `pages/api/fridge/detect.js` | Calls FastAPI detector, saves to user |
| `pages/api/fridge/items.js` (and related) | Fridge CRUD if present |
| `backend/runs/detect/smart_fridge_train/weights/best.pt` | Fridge detector model artifact |

### Shared / data used by fridge nutrition

| Path | Purpose |
|------|---------|
| `archive/daily_food_nutrition_dataset.csv` | Nutrition lookup (if `lib/nutritionLookup` uses it) |
| `lib/nutritionLookup.js` | Match detected items to nutrition |

## First-time setup (teammate)

1. `npm install`
2. `cp env.sample .env.local` and set `NEXT_PUBLIC_API_URL`, MongoDB, etc.
3. Set `NEXT_PUBLIC_API_URL` so the Next.js server can reach the deployed FastAPI service.
4. The FastAPI service now uses `ml_api/main.py` as the single entrypoint, with separate helper files for diet and fridge model inference.

## Do not commit

- `.env.local` (secrets) — already gitignored via `.env*`

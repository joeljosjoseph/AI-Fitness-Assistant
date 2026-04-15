# Branch checklist: diet + fridge (teammate merge)

## What this branch is meant to include

Your scope is **Diet Planner** and **Fridge image detection**. The app should still work with a deployed backend when `NEXT_PUBLIC_API_URL` is set: the Diet Planner tries the local Next.js routes first, then falls back to `{NEXT_PUBLIC_API_URL}/diet/info` and `/diet/predict`.

## Files that belong to this contribution

### Diet

| Path | Purpose |
|------|---------|
| `components/modules/DietPlanner.js` | UI, fridge-aware recipes, GYM / ML copy |
| `pages/api/diet/info.js` | Dropdown options |
| `pages/api/diet/predict.js` | BMI + targets + sklearn inference + CSV fallback + recipes |
| `lib/dietHeuristics.js` | Calorie / protein heuristics |
| `lib/gymCsvIndex.js` | `GYM.csv` lookup fallback |
| `lib/parseCsvLine.js` | CSV parsing for `GYM.csv` |
| `lib/recipesFromFridge.js` | Fridge-based recipe templates |
| `lib/runDietMlInfer.js` | Spawns `python -m ml_diet.diet_predict_infer` |
| `ml_diet/` | Training + inference package |
| `ml_diet/artifacts/diet_rf_pipeline.joblib` | Trained Random Forest (commit so clone works) |
| `ml_diet/artifacts/diet_rf_meta.json` | Training metadata |
| `GYM.csv` | Training data + CSV fallback (~16 MB) |
| `requirements-diet-ai.txt` | `pip install -r` for diet ML |
| `tests/DietPlanner.test.js` | Tests |
| `package.json` | `train-diet-ai` script |

### Fridge (image)

| Path | Purpose |
|------|---------|
| `fridge_detect_infer.py` | Ultralytics inference (Windows-safe import patch) |
| `components/modules/FridgeDetector.js` | Fridge UI |
| `pages/api/fridge/detect.js` | Runs Python detector, saves to user |
| `pages/api/fridge/items.js` (and related) | Fridge CRUD if present |
| `backend/runs/detect/smart_fridge_train/weights/best.pt` | **Only** this weight file is kept in git; training plots/extra runs stay local |
| `train_fridge_model.py`, `train_diet_fridge_yolo.py` | Optional retraining |

### Shared / data used by fridge nutrition

| Path | Purpose |
|------|---------|
| `archive/daily_food_nutrition_dataset.csv` | Nutrition lookup (if `lib/nutritionLookup` uses it) |
| `lib/nutritionLookup.js` | Match detected items to nutrition |

## First-time setup (teammate)

1. `npm install`
2. `cp env.sample .env.local` and set `NEXT_PUBLIC_API_URL`, MongoDB, etc.
3. Diet ML (optional retrain): `pip install -r requirements-diet-ai.txt` then `npm run train-diet-ai`
4. Fridge: Python env with Ultralytics; `npm run dev` and `python` on PATH for `/api/fridge/detect`
5. Training YOLO from scratch: `yolov8n.pt` is gitignored; Ultralytics can fetch it automatically, or download once locally.

## Do not commit

- `.env.local` (secrets) — already gitignored via `.env*`

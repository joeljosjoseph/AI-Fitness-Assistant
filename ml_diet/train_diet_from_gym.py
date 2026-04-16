"""
Train a RandomForest on data/GYM.csv: (gender, goal, BMI band, numeric BMI) -> exercise + meal plan.
Same workflow idea as fridge YOLO: train once, save artifacts, infer from Python.

Usage (repo root):
  pip install -r ml_diet/requirements.txt
  python -m ml_diet.train_diet_from_gym
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml_diet._bmi import bmi_category_to_csv

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "GYM.csv"
ART_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = ART_DIR / "diet_rf_pipeline.joblib"
META_PATH = ART_DIR / "diet_rf_meta.json"

BMI_BANDS = {
    "Underweight": (16.0, 18.4),
    "Normal weight": (18.5, 24.9),
    "Overweight": (25.0, 29.9),
    "Obesity": (30.0, 40.0),
}


def sample_bmi_for_row(csv_bmi_cat: str, rng: np.random.Generator) -> float:
    key = (csv_bmi_cat or "").strip()
    low, high = BMI_BANDS.get(key, (20.0, 25.0))
    return float(rng.uniform(low, high))


def load_gym_df() -> pd.DataFrame:
    if not CSV_PATH.is_file():
        raise FileNotFoundError(f"Missing {CSV_PATH}")
    df = pd.read_csv(CSV_PATH, encoding="utf-8")
    need = {"Gender", "Goal", "BMI Category", "Exercise Schedule", "Meal Plan"}
    missing = need - set(df.columns)
    if missing:
        raise ValueError(f"GYM.csv missing columns: {missing}")
    return df


def main() -> int:
    rng = np.random.default_rng(42)
    df = load_gym_df()
    df = df.dropna(subset=["Gender", "Goal", "BMI Category", "Exercise Schedule", "Meal Plan"])

    bmi_numeric = np.array([sample_bmi_for_row(row["BMI Category"], rng) for _, row in df.iterrows()])
    df = df.copy()
    df["bmi"] = bmi_numeric

    y_raw = df["Exercise Schedule"].astype(str) + "|||" + df["Meal Plan"].astype(str)
    y_codes, uniques = pd.factorize(y_raw)

    X = df[["Gender", "Goal", "BMI Category", "bmi"]].copy()

    # Avoid stratify: many rare label combinations in GYM.csv
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_codes, test_size=0.15, random_state=42
    )

    cat_features = ["Gender", "Goal", "BMI Category"]
    num_features = ["bmi"]
    try:
        ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        ohe = OneHotEncoder(handle_unknown="ignore", sparse=False)
    preprocess = ColumnTransformer(
        [
            ("cat", ohe, cat_features),
            ("num", "passthrough", num_features),
        ]
    )
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=28,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    pipe = Pipeline([("prep", preprocess), ("clf", clf)])
    pipe.fit(X_train, y_train)

    pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, pred)

    ART_DIR.mkdir(parents=True, exist_ok=True)
    bundle = {
        "pipeline": pipe,
        "label_names": uniques.tolist(),
    }
    joblib.dump(bundle, MODEL_PATH)

    meta = {
        "model": "RandomForestClassifier",
        "train_rows": int(len(df)),
        "n_classes": int(len(uniques)),
        "holdout_accuracy": round(float(acc), 4),
        "features": cat_features + num_features,
        "data_source": "data/GYM.csv",
    }
    META_PATH.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Wrote {MODEL_PATH}")
    print(f"Wrote {META_PATH}")
    print(f"Holdout accuracy: {acc:.4f} ({len(uniques)} classes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

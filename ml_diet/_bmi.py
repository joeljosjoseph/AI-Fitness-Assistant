"""Shared BMI helpers for training and inference."""


def bmi(weight_kg: float, height_cm: float) -> float:
    h_m = height_cm / 100.0
    if h_m <= 0:
        return 0.0
    return round(weight_kg / (h_m * h_m), 1)


def bmi_category(bmi_val: float) -> str:
    if bmi_val < 18.5:
        return "Underweight"
    if bmi_val < 25:
        return "Normal"
    if bmi_val < 30:
        return "Overweight"
    return "Obese"


def bmi_category_to_csv(cat: str) -> str:
    s = (cat or "").strip()
    if s == "Normal":
        return "Normal weight"
    if s == "Obese":
        return "Obesity"
    return s


def ui_goal_to_csv_goal(goal: str) -> str:
    s = (goal or "").strip()
    if s == "Lose Weight":
        return "fat_burn"
    if s in ("Get Fit", "Improve Endurance", "Build Muscle"):
        return "muscle_gain"
    return "muscle_gain"


def norm_gender(g: str) -> str:
    s = (g or "").strip().lower()
    if s == "male":
        return "Male"
    if s == "female":
        return "Female"
    if s == "other":
        return "Other"
    return "Female"

import pandas as pd
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    average_precision_score,
    roc_auc_score,
)

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = PROJECT_ROOT / "data" / "processed" / "fraud_detection_cleaned.csv"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_FILE = MODEL_DIR / "fraud_detection_model.joblib"

print("Loading dataset...")
df = pd.read_csv(DATA_FILE)

# Keep a stratified sample for the first training run.
# This preserves the approximate fraud/non-fraud proportions.
SAMPLE_SIZE = min(200_000, len(df))
df = df.groupby("isFraud", group_keys=False).sample(
    n=None,
    frac=SAMPLE_SIZE / len(df),
    random_state=42
)

print("Sample shape:", df.shape)
print("Fraud counts:\n", df["isFraud"].value_counts())

# Drop identifiers and the existing flag to avoid leakage.
X = df.drop(columns=["isFraud", "nameOrig", "nameDest", "isFlaggedFraud"])
y = df["isFraud"]

categorical_features = ["type"]
numerical_features = [
    "step",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
]

preprocessor = ColumnTransformer(
    transformers=[
        ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ("numerical", StandardScaler(), numerical_features),
    ]
)

model_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ]
)

print("Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

print("Training Random Forest model...")
model_pipeline.fit(X_train, y_train)

print("Evaluating model...")
y_pred = model_pipeline.predict(X_test)
y_prob = model_pipeline.predict_proba(X_test)[:, 1]

print("\nClassification report:")
print(classification_report(y_test, y_pred, zero_division=0))

print("Confusion matrix:")
print(confusion_matrix(y_test, y_pred))

print("Average precision:", average_precision_score(y_test, y_prob))
print("ROC-AUC:", roc_auc_score(y_test, y_prob))

joblib.dump(model_pipeline, MODEL_FILE)
print("\nModel saved to:", MODEL_FILE)

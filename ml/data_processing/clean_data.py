import pandas as pd
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_FILE = PROJECT_ROOT / "data" / "raw" / "PS_20174392719_1491204439457_log.csv"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_FILE = PROCESSED_DIR / "fraud_detection_cleaned.csv"

# Create the output folder if needed
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

print("Loading dataset...")
df = pd.read_csv(RAW_FILE)

print("Original dataset shape:", df.shape)

# Remove duplicate rows
df = df.drop_duplicates()

# Remove rows with missing values, if any
df = df.dropna()

# Save the cleaned dataset
df.to_csv(OUTPUT_FILE, index=False)

print("Cleaned dataset shape:", df.shape)
print("Missing values remaining:", df.isnull().sum().sum())
print("Duplicate rows remaining:", df.duplicated().sum())
print("Saved cleaned dataset to:", OUTPUT_FILE)

from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "models" / "fraud_detection_model.joblib"

# Create the FastAPI application
app = FastAPI(
    title="Fraud Detection API",
    description="API for predicting potentially fraudulent financial transactions.",
    version="1.0.0",
)
# Configure CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Load the trained model
try:
    model = joblib.load(MODEL_PATH)
except Exception as exc:
    raise RuntimeError(
        f"Could not load the model at {MODEL_PATH}. Train the model first."
    ) from exc


class Transaction(BaseModel):
    step: int = Field(ge=1)
    type: str
    amount: float = Field(ge=0)
    oldbalanceOrg: float = Field(ge=0)
    newbalanceOrig: float = Field(ge=0)
    oldbalanceDest: float = Field(ge=0)
    newbalanceDest: float = Field(ge=0)


@app.get("/")
def home():
    return {
        "message": "Fraud Detection API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": True}


@app.post("/predict")
def predict(transaction: Transaction):
    try:
        # Build input using the features expected by the model
        input_data = pd.DataFrame(
            [
                {
                    "step": transaction.step,
                    "type": transaction.type,
                    "amount": transaction.amount,
                    "oldbalanceOrg": transaction.oldbalanceOrg,
                    "newbalanceOrig": transaction.newbalanceOrig,
                    "oldbalanceDest": transaction.oldbalanceDest,
                    "newbalanceDest": transaction.newbalanceDest,
                }
            ]
        )

        prediction = int(model.predict(input_data)[0])
        probability = float(model.predict_proba(input_data)[0][1])

        return {
            "prediction": prediction,
            "result": "Fraud" if prediction == 1 else "Legitimate",
            "fraud_probability": round(probability, 4),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}",
        ) from exc

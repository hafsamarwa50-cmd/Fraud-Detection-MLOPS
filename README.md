# Fraud Detection MLOps

An end-to-end machine learning project that detects potentially fraudulent financial transactions using the PaySim dataset.

## Project Features

- Data cleaning and preprocessing
- Exploratory data analysis
- Random Forest fraud detection model
- FastAPI backend for predictions
- React and Vite frontend dashboard
- Model evaluation and performance metrics
- Docker and MLOps configuration

## Technology Stack

- Python
- Pandas and NumPy
- Scikit-learn
- FastAPI
- React and Vite
- Docker

## Model Performance

The current model was trained on a stratified sample of 200,000 transactions.

| Metric | Score |
|---|---:|
| Precision | 0.92 |
| Recall | 0.65 |
| F1-score | 0.76 |
| Average Precision | 0.7913 |
| ROC-AUC | 0.9893 |

These results reflect the current evaluation and do not guarantee the same performance on real-world transactions.

## Project Structure

- `backend/` — FastAPI prediction service
- `frontend/` — React and Vite dashboard
- `ml/` — Machine learning code
- `mlops/` — MLOps components
- `models/` — Trained model
- `notebooks/` — Analysis notebooks
- `scripts/` — Utility scripts
- `tests/` — Tests
- `data/` — Dataset files, excluded from Git upload

## Run Locally

### Start the backend

From the project root, run:

```bash
python -m uvicorn backend.app.main:app --reload
```

API documentation: http://127.0.0.1:8000/docs

Health check: http://127.0.0.1:8000/health

### Start the frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite.

## Dataset

This project uses the PaySim synthetic financial transaction dataset. The large raw and processed CSV files are excluded from this repository. Obtain the dataset separately and place it in the appropriate `data/` directory before running data preparation or training.

## Disclaimer

This project is for educational and demonstration purposes. A model prediction is an estimate, not definitive proof of fraud.

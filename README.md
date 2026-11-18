# Customer Churn Prediction & Retention Strategy

Predicts which telecom customers are likely to cancel, segments them by risk, and recommends where a retention team should focus. Includes a trained model, a FastAPI prediction service, and a React site that explains the project in plain language and lets you try the model.

## Results

Dataset: IBM Telco Customer Churn (7,043 customers, 26.5% churned).

| Model | ROC-AUC (test) | ROC-AUC (5-fold CV) | Churn recall | Churn precision |
|---|---|---|---|---|
| Logistic Regression (chosen) | 0.842 | 0.845 ± 0.012 | 0.80 | 0.51 |
| Random Forest | 0.841 | 0.843 ± 0.010 | 0.77 | 0.54 |

The two models are statistically tied on ranking ability, so I chose logistic regression for interpretability and slightly higher recall.

**Decision threshold:** tuned from 0.50 to 0.66 using out-of-fold predictions and a simple cost model. On the held-out test set this raised net value by about 27% (16,220 vs 12,760) at the cost of lower recall (0.64) and higher precision (0.58). The cost figures (customer value $800, offer cost $100, 30% save rate) are **placeholder assumptions**, so replace them with real numbers before relying on the threshold.

### Risk segments (out-of-fold scores, all customers)

| Segment | Customers | Actual churn rate | Avg monthly bill |
|---|---|---|---|
| Low (< 0.40) | 3,550 | 6.6% | $56 |
| Medium (0.40-0.66) | 1,508 | 28.6% | $67 |
| High (≥ 0.66) | 1,985 | 60.6% | $78 |

The High segment is 28% of customers but holds roughly 64% of all churners.

### What drives churn

The typical high-risk customer is **new (first year), on a month-to-month contract, on fiber optic, paying by electronic check, with no online security or tech support.** Logistic regression coefficients and Random Forest importances agree on these drivers.

### Retention ideas

1. Offer incentives to move month-to-month customers to a 1-year contract.
2. Bundle online security and tech support for fiber customers (largest group by revenue).
3. Offer a small credit for switching from electronic check to automatic payment.
4. Run a structured first-year onboarding program.
5. Use only cheap automated nudges for the Medium segment.

These are hypotheses drawn from correlations in historical data, not proven causes. They should be validated with an A/B pilot.

## Project structure

```
Customer-Churn-Prediction/
├── data/
│   ├── raw/                 # Telco CSV (not committed)
│   └── processed/           # intermediate splits (not committed)
├── models/                  # trained model artifact (not committed)
├── notebooks/               # EDA, feature engineering, modeling, segmentation
├── reports/
│   └── metrics.json         # evaluation output
├── src/
│   ├── data_prep.py         # loading and cleaning
│   ├── features.py          # feature engineering + preprocessing
│   ├── train.py             # trains and saves the final model
│   ├── evaluate.py          # held-out evaluation + cross-validation
│   └── api.py               # FastAPI prediction service
├── frontend/                # React site + predictor UI
├── requirements.txt
└── README.md
```

## Approach

1. **EDA:** fixed `TotalCharges` (stored as text; 11 blanks belong to brand-new customers), explored churn by contract, internet service, payment method, and tenure.
2. **Feature selection:** ranked columns by mutual information on the training set and dropped three with ~zero signal (`gender`, `PhoneService`, `MultipleLines`).
3. **Feature engineering:** tenure groups, add-on count, security + support flag, month-to-month + electronic-check flag, and a charge-change feature (current bill vs. average spend).
4. **Preprocessing:** one-hot encoding and scaling in a `ColumnTransformer`, fitted on training data only to avoid leakage.
5. **Modeling:** logistic regression and Random Forest with class weighting, compared on a stratified 80/20 split and 5-fold cross-validation.
6. **Threshold tuning and segmentation:** cost-based threshold, then out-of-fold risk scores for every customer.

## Getting started

Requires Python 3.10+ and Node 18+.

```bash
# 1. Install Python dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Get the data
mkdir -p data/raw
curl -L -o data/raw/Telco-Customer-Churn.csv \
  https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv

# 3. Train the model and (optionally) evaluate it
python -m src.train
python -m src.evaluate

# 4. Start the API
uvicorn src.api:app --reload
```

Interactive API docs: http://127.0.0.1:8000/docs

```bash
# 5. Start the frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## API

`POST /predict` takes a customer's raw fields and returns churn probability, risk segment, and a churn flag.

```bash
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d '{
  "SeniorCitizen": 0, "Partner": "No", "Dependents": "No", "tenure": 3,
  "InternetService": "Fiber optic", "OnlineSecurity": "No", "OnlineBackup": "No",
  "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "No", "StreamingMovies": "No",
  "Contract": "Month-to-month", "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check",
  "MonthlyCharges": 85.0, "TotalCharges": 255.0
}'
```

```json
{"churn_probability": 0.8, "risk_segment": "High", "predicted_churn": true}
```

(Example output shape; the exact probability will differ.)

Inputs are validated: unknown categories (e.g. a misspelled contract type) return a 422 error instead of a silently wrong prediction. `GET /health` returns service status.

## Limitations

- **Single dataset.** It is a public sample dataset, so performance on real customers would need re-validation.
- **Correlation, not causation.** The retention actions are untested hypotheses.
- **Placeholder economics.** The tuned threshold depends on assumed customer value, offer cost, and save rate.
- **No time dimension.** The data is a snapshot, so the model can't be checked for drift over time.
- **Correlated features.** Tenure, total charges, and monthly charges overlap, so individual logistic regression coefficients should not be read in isolation.

## Tech stack

Python, pandas, scikit-learn, FastAPI, React (Vite)

## Author

Bishesh Pokharel · 
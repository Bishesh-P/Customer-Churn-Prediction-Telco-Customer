import joblib
import pandas as pd
from typing import Literal
from pydantic import BaseModel, Field
from src.train import MODEL_PATH

artifact = joblib.load(MODEL_PATH)
pipeline, THRESHOLD = artifact['pipeline'], artifact['threshold']

YesNo = Literal['Yes', 'No']
AddOn = Literal['Yes', 'No', 'No internet service']

class Customer(BaseModel):
    SeniorCitizen: Literal[0, 1]
    Partner: YesNo
    Dependents: YesNo
    tenure: int = Field(ge=0, le=100)
    InternetService: Literal['DSL', 'Fiber optic', 'No']
    OnlineSecurity: AddOn
    OnlineBackup: AddOn
    DeviceProtection: AddOn
    TechSupport: AddOn
    StreamingTV: AddOn
    StreamingMovies: AddOn
    Contract: Literal['Month-to-month', 'One year', 'Two year']
    PaperlessBilling: YesNo
    PaymentMethod: Literal['Electronic check', 'Mailed check',
                           'Bank transfer (automatic)', 'Credit card (automatic)']
    MonthlyCharges: float = Field(ge=0)
    TotalCharges: float = Field(ge=0)

def segment(p: float) -> str:
    return 'High' if p >= THRESHOLD else 'Medium' if p >= 0.40 else 'Low'

def score(customer: Customer) -> dict:
    df = pd.DataFrame([customer.model_dump()])
    p = float(pipeline.predict_proba(df)[0, 1])
    return {
        'churn_probability': round(p, 3),
        'risk_segment': segment(p),
        'predicted_churn': p >= THRESHOLD,
    }
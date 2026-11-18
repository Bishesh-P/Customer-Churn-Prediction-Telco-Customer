from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / 'data' / 'raw' / 'Telco-Customer-Churn.csv'

def load_data(path=RAW_PATH):
    df = pd.read_csv(path)
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce').fillna(0)
    y = (df['Churn'] == 'Yes').astype(int)
    X = df.drop(columns=['customerID', 'Churn'])
    return X, y
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DROP_COLS = ['gender', 'PhoneService', 'MultipleLines']
CAT_COLS = ['Partner', 'Dependents', 'InternetService', 'OnlineSecurity', 'OnlineBackup',
            'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies',
            'Contract', 'PaperlessBilling', 'PaymentMethod', 'tenure_group']
NUM_COLS = ['tenure', 'MonthlyCharges', 'TotalCharges', 'charge_change', 'num_addons']
BIN_COLS = ['SeniorCitizen', 'has_security_support', 'mtm_echeck']

def add_features(d):
    d = d.drop(columns=DROP_COLS, errors='ignore').copy()
    addons = ['OnlineSecurity', 'OnlineBackup', 'DeviceProtection',
              'TechSupport', 'StreamingTV', 'StreamingMovies']
    d['tenure_group'] = pd.cut(d['tenure'], bins=[-1, 12, 24, 48, 72],
                               labels=['0-12', '13-24', '25-48', '49-72']).astype(str)
    d['num_addons'] = (d[addons] == 'Yes').sum(axis=1)
    d['has_security_support'] = ((d['OnlineSecurity'] == 'Yes') & (d['TechSupport'] == 'Yes')).astype(int)
    d['mtm_echeck'] = ((d['Contract'] == 'Month-to-month') &
                       (d['PaymentMethod'] == 'Electronic check')).astype(int)
    avg_spend = (d['TotalCharges'] / d['tenure'].replace(0, np.nan)).fillna(d['MonthlyCharges'])
    d['charge_change'] = d['MonthlyCharges'] - avg_spend
    return d

def build_preprocessor():
    return ColumnTransformer([
        ('cat', OneHotEncoder(drop='if_binary', handle_unknown='ignore'), CAT_COLS),
        ('num', StandardScaler(), NUM_COLS),
        ('bin', 'passthrough', BIN_COLS),
    ], sparse_threshold=0)
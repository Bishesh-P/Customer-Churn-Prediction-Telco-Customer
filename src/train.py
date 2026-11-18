import joblib
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer
from sklearn.linear_model import LogisticRegression
from src.data_prep import load_data, ROOT
from src.features import add_features, build_preprocessor

THRESHOLD = 0.66   # from threshold tuning (based on placeholder cost assumptions)
MODEL_PATH = ROOT / 'models' / 'churn_model.joblib'

def build_pipeline():
    return Pipeline([
        ('features', FunctionTransformer(add_features)),
        ('prep', build_preprocessor()),
        ('model', LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)),
    ])

def main():
    X, y = load_data()
    pipe = build_pipeline()
    pipe.fit(X, y)
    MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump({'pipeline': pipe, 'threshold': THRESHOLD}, MODEL_PATH)
    print(f'Saved {MODEL_PATH}')

if __name__ == '__main__':
    main()

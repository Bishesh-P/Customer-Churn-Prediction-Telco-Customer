import json
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from src.data_prep import load_data
from src.train import build_pipeline, THRESHOLD

def main():
    X, y = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42)

    pipe = build_pipeline()
    pipe.fit(X_train, y_train)
    proba = pipe.predict_proba(X_test)[:, 1]

    results = {'roc_auc_test': round(roc_auc_score(y_test, proba), 3)}
    for t in (0.5, THRESHOLD):
        pred = (proba >= t).astype(int)
        print(f'\n--- Threshold {t} ---')
        print(classification_report(y_test, pred, target_names=['No churn', 'Churn']))
        print(confusion_matrix(y_test, pred))
        results[f'threshold_{t}'] = classification_report(
            y_test, pred, target_names=['No churn', 'Churn'], output_dict=True)['Churn']

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(build_pipeline(), X_train, y_train, cv=cv, scoring='roc_auc')
    results['roc_auc_cv'] = f'{cv_auc.mean():.3f} ± {cv_auc.std():.3f}'
    print('\nROC-AUC test:', results['roc_auc_test'], '| CV:', results['roc_auc_cv'])

    with open('reports/metrics.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == '__main__':
    main()
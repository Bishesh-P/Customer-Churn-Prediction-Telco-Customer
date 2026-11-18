from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api import Customer, THRESHOLD, score

app = FastAPI(title='Customer Churn API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_origin_regex=r'https://.*\.vercel\.app',
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/health')
def health():
    return {'status': 'ok', 'threshold': THRESHOLD}

@app.post('/predict')
def predict(customer: Customer):
    return score(customer)
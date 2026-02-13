# Quick Start - 5 Steps

## Step 1: Database (2 min)
```bash
createdb carbonscorex
cd backend
npm install
npm run migrate
npm run seed
```

## Step 2: ML Model (3 min)
```bash
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/train_model.py
```

## Step 3: Start ML Service
```bash
python src/api.py
# Runs on http://localhost:8000
```

## Step 4: Start Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your secrets
npm start
# Runs on http://localhost:5000
```

## Step 5: Start Frontend
```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

## Test
Login with: `greentech@example.com` / `password123`

Done! 🎉

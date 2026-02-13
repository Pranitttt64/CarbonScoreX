# CarbonScoreX - Carbon Credit Exchange Platform

Production-ready carbon credit exchange with ML-powered scoring and verifiable digital certificates.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Python 3.9+

### Installation

1. **Database Setup**
```bash
createdb carbonscorex
cd backend
npm run migrate
npm run seed
```

2. **ML Service**
```bash
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/train_model.py
python src/api.py
```

3. **Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

4. **Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

## Demo Accounts

All passwords: `password123`

- Company: `greentech@example.com`
- Individual: `john.tree@example.com`
- Government: `admin@carbonscorex.gov`

## API Documentation

See API_SPEC.md for complete REST API documentation.

## Features

- ML-powered carbon scoring (XGBoost)
- Verifiable PDF certificates with QR codes
- Credit trading marketplace
- Government tender system
- Real-time WebSocket updates
- Automatic subsidies/tariffs

## Architecture

```
Frontend (React) → Backend (Express) → PostgreSQL
                         ↓
                  ML Service (FastAPI)
```

## License

MIT

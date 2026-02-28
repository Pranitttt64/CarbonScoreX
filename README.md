<p align="center">
  <h1 align="center">🌿 CarbonScoreX</h1>
  <p align="center">
    <strong>Carbon Credit Exchange System</strong>
    <br />
    A full-stack platform for carbon credit trading, AI-powered sustainability scoring, and compliance management — aligned with India's Carbon Credit Trading Scheme (CCTS).
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/python-%3E%3D3.9-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
</p>

---

## ✨ Features

| Role | Capabilities |
|------|-------------|
| **🏢 Companies** | AI-powered carbon score assessment · PDF certificates with QR codes · Credit marketplace · Score history tracking · Gemini-powered improvement recommendations |
| **👤 Individuals** | Credit balance management · Sell credits to companies · Full transaction audit trail |
| **🏛️ Government** | Industry-wide analytics dashboard · Company monitoring with ML analysis · Individual tracking · User management & bans · Tender system with minimum score requirements |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Frontend                          │
│               React · Vite · TailwindCSS              │
│                    :3000                              │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│                     Backend                           │
│               Node.js · Express · JWT                 │
│                    :5000                              │
└──────────┬─────────────────────┬─────────────────────┘
           │                     │
           ▼                     ▼
┌────────────────────┐  ┌────────────────────┐
│    ML Service      │  │    PostgreSQL       │
│  FastAPI · Python  │  │    Database         │
│      :8000         │  │      :5432          │
│                    │  │                     │
│  • Carbon Score    │  │  • Users            │
│  • Risk Analysis   │  │  • Companies        │
│  • Credibility     │  │  • Credits          │
│  • System Tier     │  │  • Certificates     │
└────────────────────┘  └─────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **Python** ≥ 3.9
- **PostgreSQL** ≥ 14

### 1 · Clone

```bash
git clone https://github.com/Pranitttt64/CarbonScoreX.git
cd CarbonScoreX
```

### 2 · Database

```bash
cd backend
psql -U postgres -c "CREATE DATABASE carbonscorex;"
psql -U postgres -d carbonscorex -f migrations/001_init_schema.sql
psql -U postgres -d carbonscorex -f migrations/002_credit_listings.sql
psql -U postgres -d carbonscorex -f seeds/seed_data.sql
```

### 3 · ML Service

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
python src/train_model.py     # Train models (first time only)
python src/api.py             # Starts on :8000
```

### 4 · Backend

```bash
cd backend
npm install
cp .env.example .env          # Edit with your credentials
npm run dev                   # Starts on :5000
```

### 5 · Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start                     # Opens on :3000
```

---

## 📁 Project Structure

```
CarbonScoreX/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/            # Database & JWT config
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth & validation
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # ML & Gemini integrations
│   │   └── utils/             # PDF generation
│   ├── migrations/            # SQL schema migrations
│   └── seeds/                 # Sample data
│
├── frontend/                   # React SPA
│   └── src/
│       ├── components/        # Dashboard components
│       ├── pages/             # Route pages
│       └── services/          # API client
│
└── ml-service/                 # Python ML microservice
    └── src/
        ├── api.py             # FastAPI endpoints
        ├── pipeline.py        # ML pipeline orchestration
        ├── preprocess.py      # Data preprocessing
        ├── inference.py       # Model inference
        └── train_model.py     # Model training
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate & receive JWT |
| `GET` | `/api/auth/profile` | Get current user profile |

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/companies` | List all companies |
| `POST` | `/api/companies/:id/data` | Submit data for scoring |
| `GET` | `/api/companies/:id/score-history` | Score history |

### Credits & Marketplace
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/credits/balance` | Credit balance |
| `POST` | `/api/credits/transfer` | Transfer credits |
| `GET` | `/api/credits/listings` | Marketplace listings |
| `POST` | `/api/credits/purchase` | Purchase credits |

### Certificates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/certificates/download/:id` | Download PDF certificate |
| `GET` | `/verify/:certId` | Public certificate verification |

### Government
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/gov/dashboard` | Dashboard analytics |
| `GET` | `/api/gov/companies` | All companies with scores |
| `POST` | `/api/gov/users/:id/ban` | Ban/unban user |

---

## 🤖 ML Pipeline

Four specialized models work in concert:

| Model | Input | Output |
|-------|-------|--------|
| **Carbon Score** | Emission data, energy mix, waste metrics | 0–100 sustainability score |
| **Risk Analysis** | Industry sector, compliance history | Environmental risk probability |
| **Credibility** | Reported vs verified data | Greenwashing detection flag |
| **System Tier** | Composite metrics | Platinum · Gold · Silver · Bronze |

---

## 🛡️ Security

- **JWT** token-based authentication
- **bcrypt** password hashing
- **Helmet.js** HTTP security headers
- **CORS** origin restriction
- **Certificate signatures** with QR verification

---

## 📜 Indian Carbon Market Compliance

Aligned with the Bureau of Energy Efficiency's **Carbon Credit Trading Scheme (CCTS)**:

- GHG Emission Intensity tracking
- Carbon Credit Certificate issuance
- Verification workflow support
- Government oversight & monitoring tools

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TailwindCSS · Recharts · Lucide Icons |
| Backend | Node.js · Express · PostgreSQL · WebSocket |
| ML Service | Python · FastAPI · scikit-learn |
| AI | Google Gemini API |
| Auth | JWT · bcrypt |
| Docs | PDFKit · QR Code |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

<p align="center"><strong>Built with ❤️ for a sustainable future</strong></p>

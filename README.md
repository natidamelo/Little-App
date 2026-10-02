# SpendPulse 🚀

A modern personal expense tracker and budget control dashboard.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Recharts + Lucide React
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB

## Project Structure
```
spendpulse/
├── backend/         # FastAPI Python backend
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── seed.py
│       └── routes/  (transactions, budgets, analytics)
└── frontend/        # Next.js frontend
    └── src/
        ├── app/     (page.tsx, transactions, budgets)
        ├── components/
        └── lib/api.ts
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB running on `localhost:27017`

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt

# Seed with mock data (optional but recommended):
python -m app.seed

# Start the API server:
uvicorn app.main:app --reload --port 8000
```
API docs available at: http://localhost:8000/docs

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend available at: http://localhost:3000

## Features
- 📊 **Dashboard**: Stat cards, area chart, donut pie chart
- 💳 **Transactions**: Add/edit/delete with filter by month & category
- 🎯 **Budgets**: Set monthly limits + per-category progress bars with 80%/100% alerts
- 🌙 **Dark Mode**: Glassmorphism design with animated components

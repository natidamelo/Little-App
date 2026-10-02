"""
Seed script — populates SpendPulse with 3 months of realistic mock data.
Run: python -m app.seed
"""
import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Ensure robust DNS resolution for mongodb+srv across all networks
try:
    import dns.resolver
    resolver = dns.resolver.get_default_resolver()
    resolver.nameservers = ['8.8.8.8', '1.1.1.1'] + [ns for ns in resolver.nameservers if ns not in ['8.8.8.8', '1.1.1.1']]
except Exception:
    pass

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "spendpulse")

CATEGORIES = ["Food", "Transport", "Utilities", "Entertainment", "Others"]
PAYMENT_METHODS = ["Cash", "CBE", "Abyssinia", "Telebirr"]

CATEGORY_RANGES = {
    "Food": (5, 80),
    "Transport": (2, 40),
    "Utilities": (20, 150),
    "Entertainment": (10, 100),
    "Others": (5, 60),
}

NOTES = [
    "Grocery run", "Lunch at work", "Netflix sub", "Electricity bill",
    "Uber ride", "Coffee", "Weekend dinner", "Gym membership",
    "Internet bill", "Book purchase", None, None, None,
]


import certifi

async def seed():
    client_kwargs = {}
    if "mongodb+srv" in MONGODB_URL or "ssl=true" in MONGODB_URL.lower():
        client_kwargs["tlsCAFile"] = certifi.where()
    client = AsyncIOMotorClient(MONGODB_URL, **client_kwargs)
    db = client[DATABASE_NAME]

    # Clear existing data
    await db.transactions.delete_many({})
    await db.budgets.delete_many({})
    print("[OK] Cleared existing data")

    # Seed 3 months: 2026-08, 2026-09, 2026-10
    today = datetime(2026, 10, 1)
    months = ["2026-08", "2026-09", "2026-10"]

    all_transactions = []
    for month_str in months:
        year, mon = int(month_str[:4]), int(month_str[5:])
        num_days = 28 if mon == 2 else 30 if mon in [4, 6, 9, 11] else 31
        # Limit Oct to day 1 (today)
        if month_str == "2026-10":
            num_days = 1

        for day in range(1, num_days + 1):
            # 1–4 expenses per day
            for _ in range(random.randint(1, 4)):
                cat = random.choice(CATEGORIES)
                low, high = CATEGORY_RANGES[cat]
                all_transactions.append({
                    "amount": round(random.uniform(low, high), 2),
                    "category": cat,
                    "date": datetime(year, mon, day),
                    "payment_method": random.choice(PAYMENT_METHODS),
                    "note": random.choice(NOTES),
                    "created_at": datetime.utcnow(),
                })

    await db.transactions.insert_many(all_transactions)
    print(f"[OK] Inserted {len(all_transactions)} transactions")

    # Seed monthly budgets
    budgets = [
        {
            "month_year": "2026-08",
            "overall_limit": 1500.0,
            "category_limits": {"Food": 400, "Transport": 200, "Utilities": 300, "Entertainment": 200, "Others": 400},
            "updated_at": datetime.utcnow(),
        },
        {
            "month_year": "2026-09",
            "overall_limit": 1600.0,
            "category_limits": {"Food": 420, "Transport": 180, "Utilities": 300, "Entertainment": 250, "Others": 450},
            "updated_at": datetime.utcnow(),
        },
        {
            "month_year": "2026-10",
            "overall_limit": 1500.0,
            "category_limits": {"Food": 400, "Transport": 200, "Utilities": 300, "Entertainment": 200, "Others": 400},
            "updated_at": datetime.utcnow(),
        },
    ]
    await db.budgets.insert_many(budgets)
    print(f"[OK] Inserted {len(budgets)} monthly budgets")
    print("[DONE] Seed complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())

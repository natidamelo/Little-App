import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "spendpulse")

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    global client, db
    client_kwargs = {}
    if "mongodb+srv" in MONGODB_URL or "ssl=true" in MONGODB_URL.lower():
        client_kwargs["tlsCAFile"] = certifi.where()

    client = AsyncIOMotorClient(MONGODB_URL, **client_kwargs)
    db = client[DATABASE_NAME]

    # Create indexes for performance
    try:
        await db.transactions.create_index([("date", -1)])
        await db.transactions.create_index([("category", 1)])
        await db.budgets.create_index([("month_year", 1)], unique=True)
    except Exception as e:
        print(f"MongoDB index setup warning: {e}")

    print(f"Connected to MongoDB: {DATABASE_NAME}")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_database():
    return db

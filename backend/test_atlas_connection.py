import os
import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Ensure robust DNS resolution for mongodb+srv across all networks
try:
    import dns.resolver
    resolver = dns.resolver.get_default_resolver()
    resolver.nameservers = ['8.8.8.8', '1.1.1.1'] + [ns for ns in resolver.nameservers if ns not in ['8.8.8.8', '1.1.1.1']]
except Exception:
    pass

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "")
DATABASE_NAME = os.getenv("DATABASE_NAME", "spendpulse")

async def test_connection():
    print("Testing connection to MongoDB Atlas...")
    if not MONGODB_URL or "localhost" in MONGODB_URL:
        print("Note: MONGODB_URL is currently pointing to local or is not set.")
        print(f"Current URL: {MONGODB_URL}")
        return False

    # Mask password for safe display
    masked = MONGODB_URL
    if "@" in masked and "://" in masked:
        proto, rest = masked.split("://", 1)
        creds, host = rest.split("@", 1)
        masked = f"{proto}://*****:*****@{host}"
    print(f"Target URL: {masked}")

    client_kwargs = {}
    if "mongodb+srv" in MONGODB_URL or "ssl=true" in MONGODB_URL.lower():
        client_kwargs["tlsCAFile"] = certifi.where()

    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=8000, **client_kwargs)
        # Force a server roundtrip
        info = await client.server_info()
        db = client[DATABASE_NAME]
        collections = await db.list_collection_names()
        print("[SUCCESS] Connected successfully to MongoDB Atlas!")
        print(f"MongoDB Version: {info.get('version')}")
        print(f"Database: {DATABASE_NAME}")
        print(f"Existing collections: {collections}")
        client.close()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to connect: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())

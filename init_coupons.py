import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Get Config from .env
PG_DBNAME = os.getenv("POSTGRES_DB", "feature_store")
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "Sanvi@123")
PG_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
PG_PORT = os.getenv("POSTGRES_PORT", "5433")

def init_coupons():
    try:
        conn = psycopg2.connect(
            dbname=PG_DBNAME, user=PG_USER, 
            password=PG_PASS, host=PG_HOST, port=PG_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("--- Setting up Coupons Table ---")

        # 1. Create Table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS coupons (
            code VARCHAR(50) PRIMARY KEY,
            discount_percent INT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE
        );
        """
        cur.execute(create_table_sql)
        print("✅ Table 'coupons' created.")

        # 2. Insert Dummy Coupons
        coupons = [
            ('SAVE20', 20, True),
            ('WELCOME10', 10, True),
            ('BLACKFRIDAY', 50, True),
            ('EXPIRED', 90, False) # Inactive coupon
        ]

        for code, discount, active in coupons:
            # Upsert (Insert or Update if exists)
            sql = """
            INSERT INTO coupons (code, discount_percent, is_active) 
            VALUES (%s, %s, %s)
            ON CONFLICT (code) DO UPDATE 
            SET discount_percent = EXCLUDED.discount_percent, is_active = EXCLUDED.is_active;
            """
            cur.execute(sql, (code, discount, active))
        
        print("✅ Coupons inserted: SAVE20, WELCOME10, BLACKFRIDAY")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    init_coupons()
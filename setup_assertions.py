import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# DB Config
PG_DBNAME = os.getenv("POSTGRES_DB", "feature_store")
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "Sanvi@123")
PG_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
PG_PORT = os.getenv("POSTGRES_PORT", "5433")

def create_assertions():
    try:
        conn = psycopg2.connect(dbname=PG_DBNAME, user=PG_USER, password=PG_PASS, host=PG_HOST, port=PG_PORT)
        conn.autocommit = True
        cur = conn.cursor()

        print("--- Setting up Database Assertions (Constraints) ---")

        # 1. Add a CHECK Constraint to transactions_log
        # Rule: Amount must always be greater than 0
        print("1. Adding check: Transaction amount must be positive...")
        try:
            cur.execute("""
                ALTER TABLE transactions_log
                ADD CONSTRAINT check_positive_amount 
                CHECK (amount > 0);
            """)
            print("✅ Assertion 'check_positive_amount' added.")
        except psycopg2.errors.DuplicateObject:
            print("⚠️ Assertion already exists.")
        except Exception as e:
            print(f"⚠️ Notice: {e}")

        # 2. Add a CHECK Constraint to coupons
        # Rule: Discount percent must be between 1 and 100
        print("2. Adding check: Discount must be 1-100%...")
        try:
            cur.execute("""
                ALTER TABLE coupons
                ADD CONSTRAINT check_valid_discount
                CHECK (discount_percent > 0 AND discount_percent <= 100);
            """)
            print("✅ Assertion 'check_valid_discount' added.")
        except psycopg2.errors.DuplicateObject:
            print("⚠️ Assertion already exists.")
        except Exception as e:
            print(f"⚠️ Notice: {e}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_assertions()
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

def optimize_database():
    try:
        conn = psycopg2.connect(dbname=PG_DBNAME, user=PG_USER, password=PG_PASS, host=PG_HOST, port=PG_PORT)
        conn.autocommit = True
        cur = conn.cursor()

        print("--- Optimizing Database Performance ---")

        # 1. Create Indexes (Speed up User Search)
        print("1. Creating B-Tree Indexes...")
        # Index on user_id (Speed up finding user history)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tx_user_id ON transactions_log(user_id);")
        # Index on timestamp (Speed up finding recent transactions)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions_log(timestamp DESC);")
        print("✅ Indexes created on 'user_id' and 'timestamp'.")

        # 2. Create Materialized View (Speed up Analytics)
        print("2. Creating Materialized View for Daily Sales...")
        cur.execute("DROP MATERIALIZED VIEW IF EXISTS daily_sales_summary;")
        cur.execute("""
            CREATE MATERIALIZED VIEW daily_sales_summary AS
            SELECT 
                date_trunc('day', timestamp) AS sales_day, 
                SUM(amount) AS total_sales,
                COUNT(*) as tx_count
            FROM transactions_log
            GROUP BY sales_day
            ORDER BY sales_day DESC;
        """)
        print("✅ Materialized View 'daily_sales_summary' created.")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    optimize_database()
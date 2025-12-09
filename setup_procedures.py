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

def create_procedures():
    try:
        conn = psycopg2.connect(dbname=PG_DBNAME, user=PG_USER, password=PG_PASS, host=PG_HOST, port=PG_PORT)
        conn.autocommit = True
        cur = conn.cursor()

        print("--- Setting up Stored Procedures ---")

        # SQL to create the function
        # This function runs multiple queries internally and returns the result as one row
        procedure_sql = """
        CREATE OR REPLACE FUNCTION get_dashboard_metrics()
        RETURNS TABLE (
            total_tx BIGINT, 
            total_vol DECIMAL, 
            total_users BIGINT
        ) 
        AS $$
        BEGIN
            RETURN QUERY SELECT 
                (SELECT COUNT(*) FROM transactions_log) AS total_tx,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions_log) AS total_vol,
                (SELECT COUNT(*) FROM user_historical_features) AS total_users;
        END;
        $$ LANGUAGE plpgsql;
        """

        cur.execute(procedure_sql)
        print("✅ Stored Procedure 'get_dashboard_metrics' created successfully.")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_procedures()
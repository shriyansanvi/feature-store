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

def create_triggers():
    try:
        conn = psycopg2.connect(dbname=PG_DBNAME, user=PG_USER, password=PG_PASS, host=PG_HOST, port=PG_PORT)
        conn.autocommit = True
        cur = conn.cursor()

        print("--- Setting up SQL Triggers ---")

        # 1. Create the Audit Logs Table
        print("1. Creating 'audit_logs' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id SERIAL PRIMARY KEY,
                event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                severity VARCHAR(20),
                message TEXT
            );
        """)

        # 2. Create the Trigger Function (PL/pgSQL)
        # This function runs inside the database whenever a transaction happens
        print("2. Creating Trigger Function...")
        cur.execute("""
            CREATE OR REPLACE FUNCTION log_high_risk_transaction()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Check if the new transaction is flagged
                IF NEW.is_flagged = TRUE THEN
                    -- Insert a warning into the audit_logs table automatically
                    INSERT INTO audit_logs (severity, message)
                    VALUES ('HIGH_RISK', 'Suspicious transaction detected: User ' || NEW.user_id || ' spent $' || NEW.amount);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        # 3. Attach the Trigger to the Transactions Table
        print("3. Attaching Trigger to 'transactions_log'...")
        cur.execute("""
            DROP TRIGGER IF EXISTS fraud_detector_trigger ON transactions_log;
            
            CREATE TRIGGER fraud_detector_trigger
            AFTER INSERT ON transactions_log
            FOR EACH ROW
            EXECUTE FUNCTION log_high_risk_transaction();
        """)

        print("✅ Database Triggers configured successfully!")
        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_triggers()
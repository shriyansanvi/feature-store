import psycopg2
import csv

# --- Database Connection Config ---
# !! Replace 'your_password' with the password you set in your docker run command !!
DB_NAME = "feature_store"
DB_USER = "postgres"
DB_PASS = "Sanvi@123" # <--- ⚠️ CHANGE THIS
DB_HOST = "127.0.0.1"  # This works because we published the port
DB_PORT = "5433"

def batch_load_data():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        cur = conn.cursor()
        print("✅ Database connection successful.")

        # === 1. Load transactions_log ===
        print("Loading data into 'transactions_log'...")
        with open('transactions.csv', 'r') as f:
            # Skip header row
            next(f)
            # Use COPY for bulk loading, it's very fast
            cur.copy_expert(
                "COPY transactions_log(user_id, amount, timestamp) FROM STDIN WITH CSV", f
            )
        conn.commit()
        print("✅ Successfully loaded into 'transactions_log'.")

        # === 2. Calculate and Load Historical Features ===
        print("Calculating historical features...")
        calculate_features_sql = """
        INSERT INTO user_historical_features (user_id, total_spent, average_transaction_amount)
        SELECT
            user_id,
            SUM(amount) AS total_spent,
            AVG(amount) AS average_transaction_amount
        FROM
            transactions_log
        GROUP BY
            user_id
        ON CONFLICT (user_id) DO UPDATE 
        SET 
            total_spent = EXCLUDED.total_spent,
            average_transaction_amount = EXCLUDED.average_transaction_amount,
            last_updated = CURRENT_TIMESTAMP;
        """

        cur.execute(calculate_features_sql)
        conn.commit()
        print("✅ Successfully calculated and loaded 'user_historical_features'.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    batch_load_data()
import psycopg2
import redis
import random
import time
from datetime import datetime

# --- Database Connection Config ---
DB_NAME = "feature_store"
DB_USER = "postgres"
DB_PASS = "Sanvi@123" # Your password
DB_HOST = "127.0.0.1"
DB_PORT = "5433"      # <-- The new port

# Redis key for the 1-hour transaction count
TRANSACTIONS_1H_KEY = "user:{user_id}:transactions_in_last_hour"
# Redis key for the last transaction amount
LAST_TRANSACTION_KEY = "user:{user_id}:last_transaction_amount"
HOUR_IN_SECONDS = 3600

# Initialize variables for the finally block
pg_conn = None
pg_cur = None

def start_pipeline():
    global pg_conn, pg_cur  # Use the global variables
    
    try:
        # Connect to PostgreSQL (Offline Store)
        pg_conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT
        )
        pg_conn.autocommit = True 
        pg_cur = pg_conn.cursor()
        print("✅ PostgreSQL connection successful.")
        
        # Connect to Redis (Online Store)
        r = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True) 
        r.ping()
        print("✅ Redis connection successful.")
        
        print("\n--- Starting Real-time Pipeline (Press Ctrl+C to stop) ---\n")
        
        while True:
            # 1. Simulate a new event
            user_id = random.randint(1, 500) 
            amount = round(random.uniform(5.0, 500.0), 2)
            timestamp = datetime.now()
            
            # 2. Write to Offline Store (PostgreSQL)
            insert_sql = "INSERT INTO transactions_log (user_id, amount, timestamp) VALUES (%s, %s, %s)"
            pg_cur.execute(insert_sql, (user_id, amount, timestamp))
            
            # 3. Write to Online Store (Redis)
            
            # Get the keys for this user
            last_tx_key = LAST_TRANSACTION_KEY.format(user_id=user_id)
            tx_1h_key = TRANSACTIONS_1H_KEY.format(user_id=user_id)

            # *** CORRECTED REDIS LOGIC ***
            # Use a 'pipeline' to send all commands at once
            pipe = r.pipeline()
            
            # a) Set 'last_transaction_amount'
            pipe.set(last_tx_key, amount)
            
            # b) Increment 'transactions_in_last_hour'
            pipe.incr(tx_1h_key)
            
            # c) Set/reset the 1-hour expiration on the counter key
            pipe.expire(tx_1h_key, HOUR_IN_SECONDS)
            
            # d) Execute all commands in the pipeline
            pipe.execute()
            # *******************************
            
            print(f"[{timestamp.strftime('%H:%M:%S')}] User {user_id} transaction: ${amount}. Updated real-time features.")
            
            time.sleep(random.uniform(1.0, 3.0)) 

    except KeyboardInterrupt:
        print("\nPipeline stopped by user.")
    except Exception as e:
        print(f"❌ An error occurred in the pipeline: {e}")
    finally:
        # Clean up
        if pg_cur:
            pg_cur.close()
        if pg_conn:
            pg_conn.close()
        print("Database connections closed.")

if __name__ == "__main__":
    start_pipeline()
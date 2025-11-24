from fastapi import FastAPI, HTTPException, Request
from datetime import datetime
import redis
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
import csv
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.responses import HTMLResponse

class TransactionRequest(BaseModel):
    user_id: int
    amount: float

app = FastAPI(title="Real-time Feature Store API")

origins = ["*", "null"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

try:
    r = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)
    r.ping()
    print("✅ Connected to Redis for API.")
except Exception as e:
    print(f"❌ Could not connect to Redis: {e}")
    r = None

PG_DBNAME = "feature_store"
PG_USER = "postgres"
PG_PASS = "Sanvi@123"
PG_HOST = "127.0.0.1"
PG_PORT = "5433"
    
TRANSACTIONS_1H_KEY = "user:{user_id}:transactions_in_last_hour"
LAST_TRANSACTION_KEY = "user:{user_id}:last_transaction_amount"
HOUR_IN_SECONDS = 3600

def get_pg_conn():
    return psycopg2.connect(dbname=PG_DBNAME, user=PG_USER, password=PG_PASS, host=PG_HOST, port=PG_PORT)

# --- HTML Routes ---
@app.get("/login", response_class=HTMLResponse)
async def serve_login(request: Request): return templates.TemplateResponse(request=request, name="login.html")
@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request): return templates.TemplateResponse(request=request, name="index.html")
@app.get("/explorer", response_class=HTMLResponse)
async def serve_explorer(request: Request): return templates.TemplateResponse(request=request, name="explorer.html")
@app.get("/simulator", response_class=HTMLResponse)
async def serve_simulator(request: Request): return templates.TemplateResponse(request=request, name="simulator.html")
@app.get("/analytics", response_class=HTMLResponse)
async def serve_analytics(request: Request): return templates.TemplateResponse(request=request, name="analytics.html")
@app.get("/users", response_class=HTMLResponse)
async def serve_users(request: Request): return templates.TemplateResponse(request=request, name="users.html")
@app.get("/settings", response_class=HTMLResponse)
async def serve_settings(request: Request): return templates.TemplateResponse(request=request, name="settings.html")
@app.get("/logs", response_class=HTMLResponse)
async def serve_logs(request: Request): return templates.TemplateResponse(request=request, name="logs.html")
@app.get("/shop", response_class=HTMLResponse)
async def serve_shop_home(request: Request): return templates.TemplateResponse(request=request, name="shop_index.html")
@app.get("/shop/checkout", response_class=HTMLResponse)
async def serve_shop_checkout(request: Request): return templates.TemplateResponse(request=request, name="shop_checkout.html")
# ... existing shop routes ...

# ... inside main.py ...

@app.get("/shop/login", response_class=HTMLResponse)
async def serve_shop_login(request: Request):
    return templates.TemplateResponse(request=request, name="shop_login.html")

# ...

@app.get("/shop/profile", response_class=HTMLResponse)
async def serve_shop_profile(request: Request):
    return templates.TemplateResponse(request=request, name="shop_profile.html")

# ... rest of the code ...

# --- API Endpoints ---

@app.post("/submit-transaction")
async def submit_transaction(transaction: TransactionRequest):
    if r is None:
        raise HTTPException(status_code=503, detail="Redis service unavailable.")
    user_id = transaction.user_id
    amount = transaction.amount
    
    is_flagged = False
    flag_reason = "Normal"

    # 1. Fraud Check (Logic Change: We just set a flag, we don't stop it)
    try:
        current_avg_spend = r.get(f"user:{user_id}:historical_avg")
        if current_avg_spend is None:
            conn = get_pg_conn()
            cur = conn.cursor()
            cur.execute("SELECT average_transaction_amount FROM user_historical_features WHERE user_id = %s", (user_id,))
            result = cur.fetchone()
            current_avg_spend = float(result[0]) if result else 50.0
            r.set(f"user:{user_id}:historical_avg", current_avg_spend)
            cur.close()
            conn.close()
        else:
            current_avg_spend = float(current_avg_spend)
        
        # THE RULE: If amount is 5x average, FLAG IT.
        if amount > (current_avg_spend * 5) and amount > 300:
            is_flagged = True
            flag_reason = f"Suspicious: ${amount} vs Avg ${current_avg_spend:.2f}"
            
    except Exception as e:
        print(f"Fraud check error: {e}")

    # 2. Process Transaction (ALWAYS save it)
    pg_conn = None
    pg_cur = None
    try:
        pg_conn = get_pg_conn()
        pg_conn.autocommit = True
        pg_cur = pg_conn.cursor()
        
        # Insert with the new 'is_flagged' column
        sql = "INSERT INTO transactions_log (user_id, amount, timestamp, is_flagged) VALUES (%s, %s, %s, %s)"
        pg_cur.execute(sql, (user_id, amount, datetime.now(), is_flagged))
        
        pipe = r.pipeline()
        pipe.set(LAST_TRANSACTION_KEY.format(user_id=user_id), amount)
        tx_1h_key = TRANSACTIONS_1H_KEY.format(user_id=user_id)
        pipe.incr(tx_1h_key)
        pipe.expire(tx_1h_key, HOUR_IN_SECONDS)
        pipe.execute()
        
        # ALWAYS RETURN APPROVED to the shop
        return {"status": "Approved", "reason": "Transaction successful."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if pg_cur: pg_cur.close()
        if pg_conn: pg_conn.close()

@app.get("/transactions/recent/global")
def get_global_recent_transactions():
    pg_conn = None
    pg_cur = None
    try:
        pg_conn = get_pg_conn()
        pg_cur = pg_conn.cursor()
        # Select the 'is_flagged' column too
        sql = "SELECT user_id, amount, timestamp, is_flagged FROM transactions_log ORDER BY timestamp DESC LIMIT 5"
        pg_cur.execute(sql)
        transactions = pg_cur.fetchall()
        return {"recent_transactions": [{"user_id": row[0], "amount": row[1], "timestamp": row[2], "is_flagged": row[3]} for row in transactions]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostgreSQL error: {e}")
    finally:
        if pg_cur: pg_cur.close()
        if pg_conn: pg_conn.close()

@app.get("/stats/global")
def get_global_stats():
    pg_conn = None
    pg_cur = None
    try:
        pg_conn = get_pg_conn()
        pg_cur = pg_conn.cursor()
        pg_cur.execute("SELECT COUNT(*), SUM(amount) FROM transactions_log")
        stats = pg_cur.fetchone()
        pg_cur.execute("SELECT COUNT(*) FROM user_historical_features")
        user_count = pg_cur.fetchone()
        return {"total_transactions": stats[0] or 0, "total_volume": stats[1] or 0, "total_users": user_count[0] or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostgreSQL error: {e}")
    finally:
        if pg_cur: pg_cur.close()
        if pg_conn: pg_conn.close()

@app.get("/features/{user_id}")
def get_real_time_features(user_id: int):
    if r is None: raise HTTPException(status_code=503, detail="Redis unavailable.")
    try:
        pipe = r.pipeline()
        pipe.get(LAST_TRANSACTION_KEY.format(user_id=user_id))
        pipe.get(TRANSACTIONS_1H_KEY.format(user_id=user_id))
        results = pipe.execute()
        last_amount = results[0]
        count_1h = results[1]
        return {"user_id": user_id, "retrieved_at": datetime.now(), "real_time_features": {"last_transaction_amount": float(last_amount) if last_amount else 0.0, "transactions_in_last_hour": int(count_1h) if count_1h else 0}}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Error: {e}")

@app.get("/features/historical/{user_id}")
def get_historical_features(user_id: int):
    pg_conn = None
    try:
        pg_conn = get_pg_conn()
        cur = pg_conn.cursor()
        cur.execute("SELECT total_spent, average_transaction_amount FROM user_historical_features WHERE user_id = %s", (user_id,))
        res = cur.fetchone()
        cur.close()
        if res: return {"user_id": user_id, "historical_features": {"total_spent": res[0], "average_transaction_amount": res[1]}}
        else: raise HTTPException(status_code=404, detail="User not found")
    except Exception as e: raise HTTPException(status_code=500, detail=f"Error: {e}")
    finally:
        if pg_conn: pg_conn.close()

@app.get("/transactions/all/{user_id}")
def get_all_transactions(user_id: int):
    pg_conn = None
    try:
        pg_conn = get_pg_conn()
        cur = pg_conn.cursor()
        cur.execute("SELECT amount, timestamp FROM transactions_log WHERE user_id = %s ORDER BY timestamp DESC", (user_id,))
        res = cur.fetchall()
        cur.close()
        return {"user_id": user_id, "transactions": [{"amount": row[0], "timestamp": row[1]} for row in res]}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Error: {e}")
    finally:
        if pg_conn: pg_conn.close()

@app.get("/analytics/all")
def get_all_analytics():
    pg_conn = None
    try:
        pg_conn = get_pg_conn()
        cur = pg_conn.cursor()
        cur.execute("SELECT date_trunc('day', timestamp) AS sales_day, SUM(amount) AS total_sales FROM transactions_log GROUP BY sales_day ORDER BY sales_day;")
        sales = cur.fetchall()
        cur.execute("SELECT user_id, SUM(amount) AS total_spent FROM transactions_log GROUP BY user_id ORDER BY total_spent DESC LIMIT 10;")
        spenders = cur.fetchall()
        cur.close()
        return {"sales_over_time": [{"day": row[0], "sales": row[1]} for row in sales], "top_spenders": [{"user_id": row[0], "total": row[1]} for row in spenders]}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Error: {e}")
    finally:
        if pg_conn: pg_conn.close()

# CSV Route
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE_PATH = os.path.join(BASE_DIR, "transactions.csv")
@app.get("/analytics/from-csv")
def get_csv_analytics():
    data = []
    try:
        with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    row['user_id'] = int(row['user_id'])
                    row['amount'] = float(row['amount'])
                except ValueError: continue
                data.append(row)
        return {"total_rows": len(data), "data": data}
    except Exception: raise HTTPException(status_code=404)
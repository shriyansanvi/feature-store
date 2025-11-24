import csv
from faker import Faker
import random
from datetime import datetime, timedelta

fake = Faker()

# A list of 500 user IDs to generate data for
user_ids = list(range(1, 501))
records = 10000

print(f"Generating {records} fake transactions...")

with open('transactions.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    # Write the header row
    writer.writerow(['user_id', 'amount', 'timestamp'])

    for i in range(records):
        # Pick a random user
        user_id = random.choice(user_ids)

        # Generate a random amount
        amount = round(random.uniform(5.0, 500.0), 2)

        # Generate a random timestamp in the last year
        timestamp = fake.date_time_between(start_date='-1y', end_date='now')

        writer.writerow([user_id, amount, timestamp])

print("✅ Generation complete. File 'transactions.csv' created.")
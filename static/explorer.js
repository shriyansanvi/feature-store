// --- explorer.js (Handles New Users Gracefully) ---
const API_BASE_URL = "http://127.0.0.1:8000";

// --- Form Elements ---
const userIdInput = document.getElementById('user-id');
const searchBtn = document.getElementById('search-btn');
const searchStatus = document.getElementById('search-status');

// --- Display Elements ---
const lastTxEl = document.getElementById('val-last-tx');
const tx1hEl = document.getElementById('val-tx-1h');
const totalSpentEl = document.getElementById('val-total-spent');
const avgSpentEl = document.getElementById('val-avg-spent');
const logEl = document.getElementById('transaction-log');

async function exploreUser(userId) {
    if (!userId) {
        alert("Please enter a User ID.");
        return;
    }
    
    // Reset UI
    searchStatus.textContent = "Loading data for User " + userId + "...";
    searchStatus.style.color = "#666";
    lastTxEl.textContent = "...";
    tx1hEl.textContent = "...";
    totalSpentEl.textContent = "...";
    avgSpentEl.textContent = "...";
    logEl.innerHTML = "<li>Loading...</li>";
    
    try {
        // Run all 3 fetches
        const [realtimeRes, historicalRes, allTxRes] = await Promise.all([
            fetch(`${API_BASE_URL}/features/${userId}`),
            fetch(`${API_BASE_URL}/features/historical/${userId}`),
            fetch(`${API_BASE_URL}/transactions/all/${userId}`)
        ]);
        
        // --- 1. Real-time Features ---
        if (realtimeRes.ok) {
            const realtimeData = await realtimeRes.json();
            const feats = realtimeData.real_time_features;
            lastTxEl.textContent = `$${feats.last_transaction_amount.toFixed(2)}`;
            tx1hEl.textContent = feats.transactions_in_last_hour;
        } else {
            // If not found in Redis, assume 0 (New User)
            lastTxEl.textContent = "$0.00";
            tx1hEl.textContent = "0";
        }
        
        // --- 2. Historical Stats ---
        if (historicalRes.ok) {
            const historicalData = await historicalRes.json();
            const feats = historicalData.historical_features;
            totalSpentEl.textContent = `$${parseFloat(feats.total_spent).toFixed(2)}`;
            avgSpentEl.textContent = `$${parseFloat(feats.average_transaction_amount).toFixed(2)}`;
        } else if (historicalRes.status === 404) {
            // HANDLE 404: User exists but has no history (New User)
            totalSpentEl.textContent = "$0.00";
            avgSpentEl.textContent = "$0.00 (New User)";
        } else {
            throw new Error("Failed to load historical stats");
        }

        // --- 3. All Transactions ---
        if (allTxRes.ok) {
            const logData = await allTxRes.json();
            logEl.innerHTML = ""; // Clear
            if (logData.transactions.length === 0) {
                logEl.innerHTML = "<li>No transactions found.</li>";
            } else {
                logData.transactions.forEach(tx => {
                    const li = document.createElement('li');
                    const txDate = new Date(tx.timestamp).toLocaleString();
                    li.textContent = `$${parseFloat(tx.amount).toFixed(2)} on ${txDate}`;
                    logEl.appendChild(li);
                });
            }
        } else {
            logEl.innerHTML = "<li>No data available.</li>";
        }
        
        searchStatus.textContent = "Loaded data for User " + userId;
        searchStatus.style.color = "green";
    
    } catch (error) {
        console.error(error);
        searchStatus.textContent = "Error: " + error.message;
        searchStatus.style.color = "red";
    }
}

searchBtn.addEventListener('click', () => {
    exploreUser(userIdInput.value);
});

// Load default user on page load
window.addEventListener('load', () => {
    exploreUser(userIdInput.value);
});
// --- explorer.js ---
const API_BASE_URL = "http://127.0.0.1:8000";

// --- Form Elements ---
const userIdInput = document.getElementById('user-id');
const searchBtn = document.getElementById('search-btn');
const searchStatus = document.getElementById('search-status');

// --- Display Elements (now pointing to table cells) ---
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
    
    // Set loading state
    searchStatus.textContent = "Loading all data for User " + userId;
    lastTxEl.textContent = "Loading...";
    tx1hEl.textContent = "Loading...";
    totalSpentEl.textContent = "Loading...";
    avgSpentEl.textContent = "Loading...";
    logEl.innerHTML = "<li>Loading...</li>";
    
    try {
        // Run all 3 fetches at the same time
        const [realtimeRes, historicalRes, allTxRes] = await Promise.all([
            fetch(`${API_BASE_URL}/features/${userId}`),
            fetch(`${API_BASE_URL}/features/historical/${userId}`),
            fetch(`${API_BASE_URL}/transactions/all/${userId}`)
        ]);
        
        // --- 1. Real-time Features ---
        if (!realtimeRes.ok) throw new Error("Could not load real-time features.");
        const realtimeData = await realtimeRes.json();
        const realTimeFeatures = realtimeData.real_time_features;
        
        // Populate the table cells
        lastTxEl.textContent = `$${realTimeFeatures.last_transaction_amount.toFixed(2)}`;
        tx1hEl.textContent = realTimeFeatures.transactions_in_last_hour;
        
        // --- 2. Historical Stats ---
        if (!historicalRes.ok) throw new Error("Could not load historical stats.");
        const historicalData = await historicalRes.json();
        const historicalFeatures = historicalData.historical_features;
        
        // Populate the table cells
        totalSpentEl.textContent = `$${parseFloat(historicalFeatures.total_spent).toFixed(2)}`;
        avgSpentEl.textContent = `$${parseFloat(historicalFeatures.average_transaction_amount).toFixed(2)}`;

        
        // --- 3. All Transactions ---
        if (!allTxRes.ok) throw new Error("Could not load transaction log.");
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
        
        searchStatus.textContent = "Successfully loaded all data for User " + userId;
    
    } catch (error) {
        // Set error state
        searchStatus.textContent = "Error: " + error.message;
        lastTxEl.textContent = "Error";
        tx1hEl.textContent = "Error";
        totalSpentEl.textContent = "Error";
        avgSpentEl.textContent = "Error";
        logEl.innerHTML = "<li>Error.</li>";
    }
}

searchBtn.addEventListener('click', () => {
    exploreUser(userIdInput.value);
});

// Load default user on page load
window.addEventListener('load', () => {
    exploreUser(userIdInput.value);
});
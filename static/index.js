// --- index.js ---
const API_BASE_URL = "http://127.0.0.1:8000";

const totalTxEl = document.getElementById('stats-total-tx');
const totalVolEl = document.getElementById('stats-total-vol');
const totalUsersEl = document.getElementById('stats-total-users');
const globalLogEl = document.getElementById('global-log');

// --- NEW: Chart Setup ---
const ctx = document.getElementById('liveChart').getContext('2d');
const liveChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['1m ago', '50s', '40s', '30s', '20s', '10s', 'Now'],
        datasets: [{
            label: 'Transactions Received',
            data: [12, 19, 3, 5, 2, 3, 10],
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
    }
});

async function getGlobalStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats/global`);
        if (!response.ok) throw new Error("Stats API failed");
        const data = await response.json();
        
        totalTxEl.textContent = data.total_transactions.toLocaleString();
        totalVolEl.textContent = `$${data.total_volume.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        totalUsersEl.textContent = data.total_users.toLocaleString();
        
        // Simulate Live Chart Update
        const newData = Math.floor(Math.random() * 20);
        liveChart.data.datasets[0].data.shift(); // Remove old
        liveChart.data.datasets[0].data.push(newData); // Add new
        liveChart.update();

    } catch (error) {
        console.error(error);
    }
}

async function getRecentTransactions() {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions/recent/global`);
        if (!response.ok) throw new Error("Recent Tx API failed");
        const data = await response.json();
        
        globalLogEl.innerHTML = ""; 
        if (data.recent_transactions.length === 0) {
            globalLogEl.innerHTML = "<li>No transactions yet.</li>";
            return;
        }

        data.recent_transactions.forEach(tx => {
            const li = document.createElement('li');
            const txTime = new Date(tx.timestamp).toLocaleTimeString();
            
            let statusHtml = '';
            let rowStyle = '';
            if (tx.is_flagged) {
                rowStyle = 'background-color: #ffe6e6; border-left: 5px solid red;'; 
                statusHtml = `<span style="color: red; font-weight: bold; margin-left: 10px;">⚠️ FLAG: HIGH RISK</span>`;
            }

            li.style.cssText = rowStyle;
            li.innerHTML = `<strong>User ${tx.user_id}</strong> paid <span style="color: green; font-weight: bold;">$${parseFloat(tx.amount).toFixed(2)}</span> at ${txTime} ${statusHtml}`;
            globalLogEl.appendChild(li);
        });
    } catch (error) { console.error(error); }
}

window.addEventListener('load', () => {
    getGlobalStats();
    getRecentTransactions();
    setInterval(getGlobalStats, 3000); // Update stats & chart every 3s
    setInterval(getRecentTransactions, 2000);
});
// --- analytics.js ---
const API_BASE_URL = "http://127.0.0.1:8000";

// --- Chart Element ---
const salesCtx = document.getElementById('salesOverTimeChart').getContext('2d');
let salesChart = null;

// --- Table Element ---
const spendersTableBody = document.querySelector("#spenders-table tbody");


async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/all`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        
        // 1. Render the Top Spenders Table
        spendersTableBody.innerHTML = ""; // Clear loading row
        if (data.top_spenders.length === 0) {
            spendersTableBody.innerHTML = `<tr><td colspan="3">No data yet.</td></tr>`;
        } else {
            data.top_spenders.forEach((spender, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>#${index + 1}</td>
                    <td>User ${spender.user_id}</td>
                    <td>$${parseFloat(spender.total).toFixed(2)}</td>
                `;
                spendersTableBody.appendChild(row);
            });
        }
        
        // 2. Render the Sales Over Time Chart
        const salesData = data.sales_over_time.map(item => ({
            x: new Date(item.day),
            y: item.sales
        }));
        
        if (salesChart) salesChart.destroy(); // Clear old chart
        
        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Total Sales per Day',
                    data: salesData,
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'day' },
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Total Sales ($)' },
                        ticks: { callback: value => `$` + value }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Failed to load analytics:", error);
        spendersTableBody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
    }
}

// Load data when the page opens
window.addEventListener('load', loadAnalytics);

// --- NEW: Export to CSV Function ---
function downloadCSV() {
    const rows = [];
    const table = document.getElementById("spenders-table");
    
    // 1. Get Headers
    const headers = [];
    table.querySelectorAll("thead td").forEach(th => headers.push(th.innerText));
    rows.push(headers.join(","));
    
    // 2. Get Data
    table.querySelectorAll("tbody tr").forEach(tr => {
        const rowData = [];
        tr.querySelectorAll("td").forEach(td => rowData.push(td.innerText));
        rows.push(rowData.join(","));
    });
    
    // 3. Create File
    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "top_spenders_report.csv");
    document.body.appendChild(link);
    
    // 4. Download
    link.click();
    document.body.removeChild(link);
}
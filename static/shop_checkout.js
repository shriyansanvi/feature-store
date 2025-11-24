// --- shop_checkout.js (Final Version) ---

console.log("✅ Checkout Logic Loaded");

const userIdInput = document.getElementById('user_id');
const payBtn = document.getElementById('pay-btn');
const statusBox = document.getElementById('payment-status');
const checkoutItemsContainer = document.getElementById('checkout-items');
const checkoutTotalEl = document.getElementById('checkout-total');
const checkoutSubtotalEl = document.getElementById('checkout-subtotal');

// 1. Load User ID
// We check LocalStorage directly to avoid conflicts
const checkoutUser = localStorage.getItem('shopUser') || '123';
if (userIdInput) userIdInput.value = checkoutUser;

// 2. Load Cart Items
const checkoutCart = JSON.parse(localStorage.getItem('shopCart')) || [];
let totalAmount = 0;

// 3. Render Items & Calculate Total
if (checkoutItemsContainer) {
    checkoutItemsContainer.innerHTML = ''; // Clear placeholder

    if (checkoutCart.length === 0) {
        checkoutItemsContainer.innerHTML = '<p style="padding: 10px; color: #777;">Your cart is empty.</p>';
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.style.background = "#ccc";
            payBtn.style.cursor = "not-allowed";
            payBtn.textContent = "Cart Empty";
        }
    } else {
        checkoutCart.forEach(item => {
            totalAmount += item.price;
            
            // Create HTML for the item row
            const div = document.createElement('div');
            div.className = 'summary-row';
            div.innerHTML = `
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
            `;
            checkoutItemsContainer.appendChild(div);
        });
    }
}

// 4. Update Total text on screen
if (checkoutTotalEl) {
    checkoutTotalEl.textContent = `$${totalAmount.toFixed(2)}`;
}
if (checkoutSubtotalEl) {
    checkoutSubtotalEl.textContent = `$${totalAmount.toFixed(2)}`;
}

const API_URL = "http://127.0.0.1:8000";

// 5. Handle Payment Click
if (payBtn) {
    payBtn.addEventListener('click', async () => {
        if (totalAmount <= 0) return;

        const userId = parseInt(userIdInput.value);
        
        // Show processing state
        statusBox.textContent = "Processing... Checking for fraud...";
        statusBox.className = "status-box status-pending";
        statusBox.style.display = "block";

        try {
            const response = await fetch(`${API_URL}/submit-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, amount: totalAmount }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Unknown error");

            if (result.status === "Approved") {
                statusBox.textContent = `✅ ${result.status}: ${result.reason}`;
                statusBox.className = "status-box status-success";
                
                // Clear cart on success
                localStorage.removeItem('shopCart');
                
                // Redirect after 3 seconds
                setTimeout(() => { window.location.href = '/shop'; }, 3000);
                
            } else {
                statusBox.textContent = `❌ Transaction Declined: ${result.reason}`;
                statusBox.className = "status-box status-fail";
            }
        } catch (error) {
            console.error(error);
            statusBox.textContent = `❌ Error: ${error.message}`;
            statusBox.className = "status-box status-fail";
        }
    });
}
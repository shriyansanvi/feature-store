// --- shop_checkout.js (Debug Version) ---

console.log("✅ Checkout Script v500 Loaded");

const userIdInput = document.getElementById('user_id');
const payBtn = document.getElementById('pay-btn');
const statusBox = document.getElementById('payment-status');
const checkoutItemsContainer = document.getElementById('checkout-items');
const checkoutTotalEl = document.getElementById('checkout-total');
const checkoutSubtotalEl = document.getElementById('checkout-subtotal');

// Coupon Elements
const couponInput = document.getElementById('coupon-code');
const applyBtn = document.getElementById('apply-coupon');
const couponMsg = document.getElementById('coupon-msg');
const discountRow = document.getElementById('discount-row');
const discountAmountEl = document.getElementById('discount-amount');

// Load User & Cart
const checkoutUser = localStorage.getItem('shopUser') || '123';
if (userIdInput) userIdInput.value = checkoutUser;

// DEBUG: Check cart immediately
const rawCart = localStorage.getItem('shopCart');
console.log("RAW CART DATA:", rawCart);
const checkoutCart = JSON.parse(rawCart) || [];

let subtotal = 0;
let discount = 0;
let finalTotal = 0;

function renderCheckout() {
    if (!checkoutItemsContainer) return;
    checkoutItemsContainer.innerHTML = ''; 

    if (checkoutCart.length === 0) {
        console.warn("⚠️ Cart is empty!");
        checkoutItemsContainer.innerHTML = '<p style="padding: 10px; color: #777;">Your cart is empty.</p>';
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.style.background = "#ccc";
            payBtn.textContent = "Cart Empty";
        }
    } else {
        subtotal = 0;
        checkoutCart.forEach(item => {
            subtotal += item.price;
            const div = document.createElement('div');
            div.className = 'summary-row';
            div.innerHTML = `<span>${item.name}</span><span>$${item.price.toFixed(2)}</span>`;
            checkoutItemsContainer.appendChild(div);
        });
        console.log("💰 Calculated Subtotal:", subtotal);
    }
    updateTotals();
}

function updateTotals() {
    finalTotal = subtotal - discount;
    if (finalTotal < 0) finalTotal = 0;

    if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (checkoutTotalEl) checkoutTotalEl.textContent = `$${finalTotal.toFixed(2)}`;
    
    if (discount > 0) {
        discountRow.style.display = 'flex';
        discountAmountEl.textContent = `-$${discount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }
}

const API_URL = "http://127.0.0.1:8000";

if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
        const code = couponInput.value.trim();
        if (!code) return;

        applyBtn.textContent = "...";
        couponMsg.textContent = "";

        try {
            const response = await fetch(`${API_URL}/check-coupon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code }),
            });
            
            const result = await response.json();

            if (result.valid) {
                const percent = result.discount_percent;
                discount = subtotal * (percent / 100);
                couponMsg.textContent = `Success! ${percent}% discount applied.`;
                couponMsg.className = "coupon-msg text-success";
                updateTotals();
            } else {
                discount = 0;
                couponMsg.textContent = result.message || "Invalid code.";
                couponMsg.className = "coupon-msg text-error";
                updateTotals();
            }
        } catch (error) {
            console.error(error);
            couponMsg.textContent = "Error checking coupon.";
        } finally {
            applyBtn.textContent = "Apply";
        }
    });
}

if (payBtn) {
    payBtn.addEventListener('click', async () => {
        if (finalTotal <= 0 && checkoutCart.length === 0) return;

        const userId = parseInt(userIdInput.value);
        
        statusBox.textContent = "Processing... Checking for fraud...";
        statusBox.className = "status-box status-pending";
        statusBox.style.display = "block";

        try {
            const response = await fetch(`${API_URL}/submit-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, amount: finalTotal }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Unknown error");

            if (result.status === "Approved") {
                statusBox.textContent = `✅ ${result.status}: ${result.reason}`;
                statusBox.className = "status-box status-success";
                localStorage.removeItem('shopCart');
                setTimeout(() => { window.location.href = '/shop'; }, 3000);
            } else {
                statusBox.textContent = `❌ Transaction Declined: ${result.reason}`;
                statusBox.className = "status-box status-fail";
            }
        } catch (error) {
            statusBox.textContent = `❌ Error: ${error.message}`;
            statusBox.className = "status-box status-fail";
        }
    });
}

// Initialize
renderCheckout();
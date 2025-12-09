// --- shop_checkout.js (Final Complete Version) ---

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

// Security Modal Elements
const secModal = document.getElementById('security-modal');
const btnVerify = document.getElementById('btn-verify');
const btnDeny = document.getElementById('btn-deny');

// 1. Load User ID from Local Storage
// We check 'shopUser' which is set by shop_core.js logic
const checkoutUser = localStorage.getItem('shopUser') || '123';
if (userIdInput) userIdInput.value = checkoutUser;

// 2. Load Cart Items
const checkoutCart = JSON.parse(localStorage.getItem('shopCart')) || [];

// State variables for calculation
let subtotal = 0;
let discount = 0;
let finalTotal = 0;

// 3. Render Items & Calculate Initial Totals
function renderCheckout() {
    if (!checkoutItemsContainer) return;
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
        subtotal = 0;
        checkoutCart.forEach(item => {
            subtotal += item.price;
            
            // Create HTML row for the item
            const div = document.createElement('div');
            div.className = 'summary-row';
            div.innerHTML = `<span>${item.name}</span><span>$${item.price.toFixed(2)}</span>`;
            checkoutItemsContainer.appendChild(div);
        });
    }
    updateTotals();
}

// 4. Update UI with Calculations
function updateTotals() {
    finalTotal = subtotal - discount;
    if (finalTotal < 0) finalTotal = 0;

    if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (checkoutTotalEl) checkoutTotalEl.textContent = `$${finalTotal.toFixed(2)}`;
    
    // Show/Hide Discount Row
    if (discount > 0) {
        discountRow.style.display = 'flex';
        discountAmountEl.textContent = `-$${discount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }
}

const API_URL = "http://127.0.0.1:8000";

// 5. Coupon Logic (Calls Backend)
if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
        const code = couponInput.value.trim();
        if (!code) return;

        // UI Feedback
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
            couponMsg.className = "coupon-msg text-error";
        } finally {
            applyBtn.textContent = "Apply";
        }
    });
}

// 6. Payment Logic
if (payBtn) {
    payBtn.addEventListener('click', async () => {
        if (finalTotal <= 0 && checkoutCart.length === 0) return;
        initiateTransaction(false); // Start normal transaction flow
    });
}

async function initiateTransaction(isConfirmation) {
    const userId = parseInt(userIdInput.value);
    
    // Which endpoint to call? Normal submit OR Confirmation
    const endpoint = isConfirmation ? '/confirm-transaction' : '/submit-transaction';
    
    statusBox.textContent = "Processing... Checking for fraud...";
    statusBox.className = "status-box status-pending";
    statusBox.style.display = "block";

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, amount: finalTotal }),
        });

        const result = await response.json();

        // CASE 1: SECURITY CHALLENGE (Step-Up Auth)
        if (result.status === "Challenge") {
            statusBox.style.display = "none"; // Hide processing box
            secModal.classList.add('active'); // Show Security Modal
            return;
        }

        // CASE 2: APPROVED
        if (result.status === "Approved") {
            statusBox.textContent = `✅ ${result.status}: ${result.reason}`;
            statusBox.className = "status-box status-success";
            
            // Clear cart on success
            localStorage.removeItem('shopCart');
            
            // Redirect after 3 seconds
            setTimeout(() => { window.location.href = '/shop'; }, 3000);
            
        } else {
            // CASE 3: DECLINED (Hard Block)
            statusBox.textContent = `❌ Transaction Declined: ${result.reason}`;
            statusBox.className = "status-box status-fail";
        }
    } catch (error) {
        console.error(error);
        statusBox.textContent = `❌ Error: ${error.message}`;
        statusBox.className = "status-box status-fail";
    }
}

// --- MODAL BUTTON HANDLERS ---
if (btnVerify) {
    btnVerify.addEventListener('click', () => {
        secModal.classList.remove('active');
        initiateTransaction(true); // Call confirm endpoint (isConfirmation=true)
    });
}
if (btnDeny) {
    btnDeny.addEventListener('click', () => {
        secModal.classList.remove('active');
        statusBox.style.display = "block";
        statusBox.textContent = "❌ Transaction Cancelled by User.";
        statusBox.className = "status-box status-fail";
    });
}

// Initialize the page
renderCheckout();
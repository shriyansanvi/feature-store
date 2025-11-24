// --- shop_core.js ---

// 1. SECURITY CHECK: Are we logged into the Shop?
// We check LocalStorage for 'shopUser'.
const currentUser = localStorage.getItem('shopUser');

// If no user is found AND we are not already on the login page...
if (!currentUser && !window.location.pathname.includes('/shop/login')) {
    // Redirect to the SHOP login page
    window.location.href = '/shop/login';
}

// 2. Cart Logic (Standard)
let cart = JSON.parse(localStorage.getItem('shopCart')) || [];

// DOM Elements
const cartBadge = document.getElementById('cart-badge');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');

function toggleCart() {
    if(cartSidebar) cartSidebar.classList.toggle('open');
    if(cartOverlay) cartOverlay.classList.toggle('active');
    renderCart();
}

function addToCart(name, price) {
    cart.push({ name, price });
    saveCart();
    updateBadge();
    toggleCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
    updateBadge();
}

function saveCart() {
    localStorage.setItem('shopCart', JSON.stringify(cart));
}

function updateBadge() {
    if (cartBadge) cartBadge.textContent = cart.length;
}

function renderCart() {
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Your cart is empty.</p>';
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toFixed(2)}</p>
                </div>
                <i class="fas fa-trash remove-item" onclick="removeFromCart(${index})"></i>
            `;
            cartItemsContainer.appendChild(div);
        });
    }
    
    if (cartTotalEl) cartTotalEl.textContent = `$${total.toFixed(2)}`;
}

// Initialize
updateBadge();
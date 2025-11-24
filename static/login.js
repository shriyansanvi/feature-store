// --- login.js ---
if (sessionStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = '/'; // <-- CHANGED
}
const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
loginForm.addEventListener('submit', (event) => {
    event.preventDefault(); 
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user === 'admin' && pass === 'admin') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = '/'; // <-- CHANGED
    } else {
        errorMsg.textContent = 'Invalid username or password.';
    }
});
// --- auth.js ---
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '/login'; // <-- CHANGED
}
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            window.location.href = '/login'; // <-- CHANGED
        });
    }
});
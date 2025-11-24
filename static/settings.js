// --- settings.js ---
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

saveBtn.addEventListener('click', () => {
    saveStatus.textContent = "Saving...";
    
    // Simulate a network delay
    setTimeout(() => {
        saveStatus.textContent = "✅ Settings saved successfully!";
        
        // Clear the message after 3 seconds
        setTimeout(() => {
            saveStatus.textContent = "";
        }, 3000);
        
    }, 1000);
});
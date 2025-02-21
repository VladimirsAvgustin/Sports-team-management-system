document.addEventListener("DOMContentLoaded", function() {
    const darkModeToggle = document.querySelector('.toggle-dark-mode');
    const body = document.body;

    // Function to update button text
    function updateToggleText() {
        if (body.classList.contains('dark-mode')) {
            darkModeToggle.textContent = "Light Mode";
        } else {
            darkModeToggle.textContent = "Dark Mode";
        }
    }

    // Toggle Dark Mode
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }

        updateToggleText(); // Update button text
    });

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        body.classList.add('dark-mode');
    }

    updateToggleText(); // Ensure correct button text on page load
});

document.addEventListener("DOMContentLoaded", function () {
    

    // Login Modal Functionality
    const loginModal = document.getElementById("loginModal");
    const loginBtn = document.querySelector(".login-btn");
    const closeBtn = document.querySelector(".close-btn");

    // Open Login Modal
    loginBtn.addEventListener("click", function () {
        loginModal.style.display = "flex";
    });

    // Close Login Modal
    closeBtn.addEventListener("click", function () {
        loginModal.style.display = "none";
    });

    // Close modal when clicking outside the content
    window.addEventListener("click", function (event) {
        if (event.target === loginModal) {
            loginModal.style.display = "none";
        }
    });
});

const loginModal = document.getElementById("loginModal");
    const loginBtns = document.querySelectorAll(".login-btn"); // Get all login buttons
    const closeBtn = document.querySelector(".close-btn");

    loginBtns.forEach(btn => {
        btn.addEventListener("click", function () {
            loginModal.style.display = "flex";
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            loginModal.style.display = "none";
        });
    }

    window.addEventListener("click", function (event) {
        if (event.target === loginModal) {
            loginModal.style.display = "none";
        }
    });


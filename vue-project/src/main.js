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

// Modal logic
function openModal(content) {
    document.getElementById('modalText').innerText = content;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Hamburger menu
function toggleMenu() {
    var mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu.style.display === "block") {
        mobileMenu.style.display = "none";
    } else {
        mobileMenu.style.display = "block";
    }
}

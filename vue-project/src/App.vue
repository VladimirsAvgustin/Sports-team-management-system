

<template>
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TeamFlow</title>
    <link rel="stylesheet" href="src/assets/main.css">
    <link rel="stylesheet " href="main.js">
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
</head>
<body>

    <!-- Navigation -->
    <header>
        <nav>
            <ul id="pc">
                <li><a href="#" onclick="navigateTo('home.html')">Home</a></li>
                <li><a href="#" onclick="navigateTo('about.html')">About</a></li>
                <li class="dropdown">
                    <a href="#">Services</a>
                    <ul class="dropdown-content">
                        <li><a href="#">Team Management</a></li>
                        <li><a href="#">Schedule Organization</a></li>
                        <li><a href="#">Player Statistics</a></li>
                    </ul>
                </li>
                <li><a href="#" onclick="navigateTo('contact.html')">Contact</a></li>
                <li><a href="#" onclick="navigateTo('registration.html')">Registration</a></li>
                <li><a class="btn login-btn" style="position: relative; left: 1500px; background-color: rgb(3, 99, 19);" >Login</a></li>
            </ul>

            <button class="toggle-dark-mode">Toggle Dark Mode</button>

            <div id="hamburger" class="hamburger" onclick="toggleMenu()">&#9776;</div>
        </nav>
    </header>

    <!-- Main Section -->
    <main>
        <h1>Welcome to TeamFlow</h1>
        <h2>Manage Your Team Effectively</h2>
        <p>TeamFlow allows you to organize schedules, track player statistics, and communicate with your team in one platform.</p>
        <img src="src/images/sport_system_logo.png" alt="Sports Logo">

        <!-- Card Container -->
        <div class="card-container">
            <div class="card" id="card1">
                <img src="src/images/login_image.png" alt="Login">
                <h3>Login</h3>
                <p>Sign in to your account to access team information and manage schedules.</p>
                <button class="btn login-btn">Login</button>
            </div>
            <div class="card">
                <img src="src/images/schedule.png" alt="Schedule">
                <h3>Team Schedule</h3>
                <p>View and manage training sessions and match schedules easily.</p>
            </div>

            <div class="card">
                <img src="src/images/registration.png" alt="Registration">
                <h3>Registration</h3>
                <p>Register your team and players to get started with TeamFlow.</p>
                <button class="btn" onclick="navigateTo('registration.html')">Registration</button>
            </div>
        </div>
    </main>

    <!-- Login Modal (FIXED) -->
    <div id="loginModal" class="modal" style="display: none;">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Login</h2>
            <form>
                <label for="username">Username:</label>
                <input type="text" id="username" required>
                <label for="password">Password:</label>
                <input type="password" id="password" required>
                <button type="submit" class="btn">Login</button>
            </form>
        </div>
    </div>

    <!-- Sidebar -->
    <aside>
        <h3>Related Articles</h3>
        <ul>
            <li><a href="#">How to manage a sports team</a></li>
            <li><a href="#">Benefits of team collaboration</a></li>
            <li><a href="#">Tips for organizing schedules</a></li>
        </ul>
    </aside>

    <!-- Footer -->
    <footer>
        <p>&copy; 2025 TeamFlow. All rights reserved.</p>
        <ul class="footer-links">
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Contact Us</a></li>
        </ul>
    </footer>

    <!-- FIX: Moved the script to the end to ensure everything loads correctly -->
    <script src="src/main.js"></script>

</body>
</html>

</template>

<script>
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


</script>
<style>
/* General Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Arial', sans-serif;
}

/* Light Mode (Default) */
body {
  background-color: #f4f4f4;
  color: #333;
  transition: background 0.3s, color 0.3s;
}

/* Dark Mode */
body.dark-mode {
  background-color: #222;
  color: #f4f4f4;
}

/* Dark Mode for Navbar */
.dark-mode nav {
  background-color: #111;
}

/* Dark Mode for Cards */
.dark-mode .card {
  background-color: #333;
  color: white;
}

/* Dark Mode for Footer */
.dark-mode footer {
  background-color: #111;
}

/* Toggle Button Style */
.toggle-dark-mode {
  background: #ff9800;
  color: white;
  padding: 10px 15px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 14px;
}

.toggle-dark-mode:hover {
  background: #e68900;
}


/* Navigation */
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0073e6;
  padding: 15px 30px;
}

nav ul {
  list-style: none;
  display: flex;
}

nav ul li {
  margin: 0 15px;
}

nav ul li a {
  color: white;
  text-decoration: none;
  font-size: 16px;
}

nav ul li a:hover {
  text-decoration: underline;
}

/* Dark Mode Button */
.toggle-dark-mode {
  background: #ff9800;
  color: white;
  padding: 10px 15px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 14px;
}

.toggle-dark-mode:hover {
  background: #e68900;
}

/* Hero Section */
main {
  text-align: center;
  padding: 50px 20px;
}

main h1 {
  font-size: 2.5em;
}

main h2 {
  font-size: 1.8em;
  margin: 10px 0;
}

main p {
  font-size: 1.2em;
  margin: 20px 0;
}

/* Cards */
.card-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
}

.card {
  background: white;
  width: 300px;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  margin: 10px;
  text-align: center;
  transition: transform 0.3s;
}

.dark-mode .card {
  background: #333;
  color: white;
}

.card:hover {
  transform: scale(1.05);
}

.card img {
  width: 100%;
  height: auto;
  border-radius: 5px;
}

.card h3 {
  margin: 15px 0;
}

.btn {
  background: #0073e6;
  color: white;
  border: none;
  padding: 10px 15px;
  cursor: pointer;
  margin-top: 10px;
  border-radius: 5px;
}

.btn:hover {
  background: #005bb5;
}

/* Footer */
footer {
  text-align: center;
  padding: 20px;
  background: #333;
  color: white;
  margin-top: 50px;
}

.footer-links {
  list-style: none;
  padding: 10px;
}

.footer-links li {
  display: inline;
  margin: 0 15px;
}

.footer-links li a {
  color: white;
  text-decoration: none;
}

.footer-links li a:hover {
  text-decoration: underline;
}

/* Dark Mode Styles */
.dark-mode nav {
  background: #111;
}

.dark-mode .btn {
  background: #ff9800;
}

.dark-mode .btn:hover {
  background: #e68900;
}

.dark-mode footer {
  background: #111;
}

/* Responsive Design */
@media (max-width: 768px) {
  nav {
      flex-direction: column;
      align-items: center;
  }
  
  nav ul {
      flex-direction: column;
      text-align: center;
  }
  
  nav ul li {
      margin: 10px 0;
  }

  .card-container {
      flex-direction: column;
      align-items: center;
  }
}

/* Hide dropdown by default */
.dropdown-content {
  display: none;
  position: absolute;
  background-color: white;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  padding: 10px;
  list-style: none;
}

/* Show dropdown on hover */
.dropdown:hover .dropdown-content {
  display: block;
}

/* Style for dropdown items */
.dropdown-content li {
  padding: 8px 15px;
}

.dropdown-content li a {
  text-decoration: none;
  color: black;
  display: block;
}

/* Hover effect for dropdown links */
.dropdown-content li a:hover {
  background: #f4f4f4;
}

/* General Aside Styling */
aside {
  background: #f8f9fa;
  padding: 20px;
  border-left: 5px solid #0073e6;
  margin-top: 20px;
  border-radius: 10px;
  width: 300px;
}

aside h3 {
  font-size: 1.5em;
  margin-bottom: 10px;
}

aside ul {
  list-style: none;
  padding: 0;
}

aside ul li {
  margin-bottom: 10px;
}

aside ul li a {
  text-decoration: none;
  color: #0073e6;
  font-weight: bold;
}

aside ul li a:hover {
  text-decoration: underline;
}

/* Dark Mode for Aside */
.dark-mode aside {
  background: #333;
  color: white;
  border-left: 5px solid #ff9800;
}

.dark-mode aside ul li a {
  color: #ff9800;
}

/* Toggle Button Styling */
.toggle-dark-mode {
  background: #003569;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
  transition: background 0.3s ease, transform 0.2s ease;
}

.toggle-dark-mode:hover {
  background: #005bb5;
  transform: scale(1.05);
}

/* Dark Mode Button */
.dark-mode .toggle-dark-mode {
  background: #ff9800;
  color: black;
}

.dark-mode .toggle-dark-mode:hover {
  background: #e68900;
}

/* General Image Styling */
/* Image Hover Effect */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 10px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* Zoom & Glow on Hover */
img:hover {
  transform: scale(1.05);
  box-shadow: 0px 4px 15px rgba(0, 115, 230, 0.3);
}

/* Dark Mode - Slightly Dim Images */
.dark-mode img {
  filter: brightness(0.85);
}


/* Logo Image */
.logo {
  width: 150px;  /* Adjust based on your logo size */
  height: auto;
}

/* Card Images */
.card img {
  width: 100%;
  height: 200px; /* Ensures uniform height */
  object-fit: cover; /* Ensures images fill the space without distortion */
  border-radius: 8px;
}

/* Dark Mode Image Adjustments */
.dark-mode img {
  filter: brightness(0.8); /* Slightly dims images in dark mode */
}

/* Responsive Design */
@media (max-width: 768px) {
  img {
      width: 100%;
      height: auto;
  }
}

/* Login Modal */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 10px;
  width: 350px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: fadeIn 0.3s;
}

.dark-mode .modal-content {
  background: #222;
  color: white;
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
}

.modal-content h2 {
  margin-bottom: 15px;
  font-size: 22px;
}

/* Close Button */
.close-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  color: red;
  font-size: 24px;
  cursor: pointer;
}

.close-btn:hover {
  color: darkred;
}

/* Login Form Fields */
.modal-content form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-content label {
  align-self: flex-start;
  font-size: 14px;
  margin-bottom: 5px;
  color: #333;
}

.dark-mode .modal-content label {
  color: white;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
}

.dark-mode .modal-content input {
  background: #333;
  color: white;
  border: 1px solid #555;
}

/* Login Button */
.modal-content .btn {
  background: #013569;
  color: white;
  padding: 10px 15px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
  width: 100%;
  transition: background 0.3s;
}

.modal-content .btn:hover {
  background: #005bb5;
}

/* Dark Mode Login Button */
.dark-mode .modal-content .btn {
  background: #ff9800;
}

.dark-mode .modal-content .btn:hover {
  background: #e68900;
}

/* Fade-in Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive Login Modal */
@media (max-width: 480px) {
  .modal-content {
    width: 90%;
  }
}


</style>

<header>
    <nav>
        <ul id="pc">
            <li><router-link to="HomePage">Home</router-link></li>
            <li class="dropdown">
                <a href="#">Services</a>
                <ul class="dropdown-content">
                    <li><a href="#">Team Management</a></li>
                    <li><a href="#">Schedule Organization</a></li>
                    <li><a href="#">Player Statistics</a></li>
                </ul>
            </li>
            <li><router-link to="Contact">Contact</router-link></li>
            <li><router-link to="register">Registration</router-link></li>
            <li><a class="btn login-btn" style="position: relative; left: 1400px; background-color: rgb(3, 99, 19);" >Login</a></li>
        </ul>

        <button class="toggle-dark-mode">Toggle Dark Mode</button>

        <div id="hamburger" class="hamburger" onclick="toggleMenu()">&#9776;</div>
        
    </nav>
</header>
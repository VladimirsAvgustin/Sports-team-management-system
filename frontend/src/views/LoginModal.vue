<template> 

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

</template>
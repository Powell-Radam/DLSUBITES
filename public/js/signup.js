document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", (e) => {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (!username || !password || !confirmPassword) {
            e.preventDefault();
            alert("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            e.preventDefault();
            alert("Passwords do not match.");
        }
    });
});
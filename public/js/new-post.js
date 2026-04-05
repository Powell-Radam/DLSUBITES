document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("newPostForm");

    if (!form) return;

    form.addEventListener("submit", (e) => {
        const title = document.getElementById("title").value.trim();
        const location = document.getElementById("location").value.trim();
        const store = document.getElementById("store").value.trim();
        const description = document.getElementById("description").value.trim();

        if (!title || !location || !store || !description) {
            e.preventDefault();
            alert("Please fill in all fields.");
        }
    });
});
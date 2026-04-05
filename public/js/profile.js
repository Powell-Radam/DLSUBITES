document.addEventListener("DOMContentLoaded", () => {
    const editBtn = document.getElementById("editProfileBtn");
    const cancelBtn = document.getElementById("cancelProfileBtn");
    const panel = document.getElementById("editProfilePanel");

    if (editBtn && panel) {
        editBtn.addEventListener("click", () => {
            panel.hidden = false;
        });
    }

    if (cancelBtn && panel) {
        cancelBtn.addEventListener("click", () => {
            panel.hidden = true;
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const replyButtons = document.querySelectorAll(".reply-btn");
    const editPostButton = document.querySelector(".edit-post-btn");
    const editCommentButtons = document.querySelectorAll(".edit-comment-btn");

    replyButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const comment = button.closest(".comment-box");
            const form = comment.querySelector(".reply-form");

            if (form) {
                form.hidden = !form.hidden;
            }
        });
    });
    

    if (editPostButton) {
        editPostButton.addEventListener("click", () => {
            const form = document.querySelector(".edit-post-form");

            if (form) {
                form.hidden = !form.hidden;
            }
        });
    }

    editCommentButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const comment = button.closest(".comment-box");
            const form = comment.querySelector(".edit-comment-form");

            if (form) {
                form.hidden = !form.hidden;
            }
        });
    });
});
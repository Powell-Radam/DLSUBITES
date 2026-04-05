document.addEventListener("DOMContentLoaded", () => {
    const reactionButtons = document.querySelectorAll(".reaction");

    reactionButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const postId = button.dataset.postId;
            const value = Number(button.dataset.value);

            try {
                const response = await fetch(`/post/${postId}/react`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({ value })
                });

                if (response.status === 401) {
                    alert("You need to log in to react.");
                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    alert(data.error || "Something went wrong.");
                    return;
                }

                const scoreElements = document.querySelectorAll(`[data-score-for="${postId}"]`);
                scoreElements.forEach((el) => {
                    el.textContent = data.score;
                });

                const allButtonsForPost = document.querySelectorAll(`.reaction[data-post-id="${postId}"]`);
                allButtonsForPost.forEach((btn) => {
                    btn.classList.remove("active");

                    if (data.userReaction === 1 && btn.dataset.value === "1") {
                        btn.classList.add("active");
                    }

                    if (data.userReaction === -1 && btn.dataset.value === "-1") {
                        btn.classList.add("active");
                    }
                });
            } catch (err) {
                console.log(err);
                alert("Error reacting to post.");
            }
        });
    });
});
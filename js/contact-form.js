window.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.querySelector("#contactForm");

    if (!contactForm) {
        return;
    }

    const submitButton = contactForm.querySelector("#submitButton");
    const notice = contactForm.querySelector("#contactFormNotice");

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!contactForm.reportValidity()) {
            return;
        }

        const formData = new FormData(contactForm);
        const submitLabel = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
        notice.textContent = "Sending your message...";
        notice.classList.remove("text-danger", "text-success");

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(formData))
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Unable to send your message. Please try again.");
            }

            contactForm.reset();
            notice.textContent = result.message;
            notice.classList.add("text-success");
        } catch (error) {
            notice.textContent = error instanceof TypeError
                ? "Could not reach the contact service. Please try again later."
                : error.message;
            notice.classList.add("text-danger");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = submitLabel;
        }
    });
});

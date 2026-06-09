const signupBtn =
  document.querySelector(".sign-btn");

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const fullname =
      document.getElementById("full_name")
        ?.value
        .trim();

    const username =
      document.getElementById("user_name")
        ?.value
        .trim();

    const password =
      document.getElementById("password")
        ?.value;

    const confirmPassword =
      document.getElementById("password_confirmed")
        ?.value;

    const agreementChecked =
      document.getElementById("agreement_checker")
        ?.checked;

    if (isEmpty(fullname)) {
      showToast(
        "Full name required",
        "Please enter your full name.",
        "warning"
      );
      return;
    }

    if (!isValidFullName(fullname)) {
      showToast(
        "Invalid full name",
        "Please enter a valid full name.",
        "error"
      );
      return;
    }

    if (isEmpty(username)) {
      showToast(
        "Username required",
        "Please create a username.",
        "warning"
      );
      return;
    }

    if (!isValidUsername(username)) {
      showToast(
        "Invalid username",
        "Username must start with a letter and be 3–30 characters.",
        "error"
      );
      return;
    }

    if (isEmpty(password)) {
      showToast(
        "Password required",
        "Please create a password.",
        "warning"
      );
      return;
    }

    if (!isValidPassword(password)) {
      showToast(
        "Weak password",
        "Use uppercase, lowercase, number, special character, and 8+ characters.",
        "error"
      );
      return;
    }

    if (isEmpty(confirmPassword)) {
      showToast(
        "Confirm password",
        "Please confirm your password.",
        "warning"
      );
      return;
    }

    if (password !== confirmPassword) {
      showToast(
        "Passwords do not match",
        "Please check and try again.",
        "error"
      );
      return;
    }

    if (!agreementChecked) {
      showToast(
        "Terms not accepted",
        "Please agree to the Terms & Conditions.",
        "warning"
      );
      return;
    }

    try {
      manage_loader(1);

      signupBtn.disabled = true;
      signupBtn.style.opacity = "0.7";
      signupBtn.style.pointerEvents = "none";

      const response = await fetch("/api/auth/signup", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          fullname,
          username,
          password
        })
      });

      const contentType =
        response.headers.get("content-type");

      if (
        !contentType ||
        !contentType.includes("application/json")
      ) {
        const text = await response.text();

        console.error(
          "Invalid signup response:",
          text
        );

        showToast(
          "Signup failed",
          "Server returned an invalid response.",
          "error"
        );

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        showToast(
          "Signup failed",
          data?.message ||
          "Unable to create account.",
          "error"
        );
        return;
      }

      showToast(
        "Account created",
        "Redirecting to login...",
        "success"
      );

      setTimeout(() => {
        window.location.href = "/pages/login";
      }, 600);

    } catch (error) {
      console.error("Signup Fetch Error:", error);

      if (!navigator.onLine) {
        showToast(
          "No internet connection",
          "Please check your network and try again.",
          "error"
        );
      } else {
        showToast(
          "Something went wrong",
          "Unable to create account right now.",
          "error"
        );
      }

    } finally {
      manage_loader(0);

      signupBtn.disabled = false;
      signupBtn.style.opacity = "1";
      signupBtn.style.pointerEvents = "auto";
    }
  });
}
function isEmpty(str) {
    return !str || str.trim() === "";
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
}

function transport(location) {
    if (!isEmpty(location)) {
        window.location.href = location;
    } else {
        console.log("ERROR: Failed to transport to requested location");
    }
}
function manage_loader(visibility_code) {
    const loader = document.querySelector(".centralize_loader");

    if (!loader) return;

    if (visibility_code === 0) {
        loader.style.display = "none";
    } else if (visibility_code === 1) {
        loader.style.display = "flex";
    }
}
function showToast(
  title,
  message = "",
  type = "info"
) {
  const existingToast =
    document.querySelector(".live-toast");

  if (existingToast) {
    existingToast.remove();
  }

  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "notifications",
    live: "ads_click"
  };

  const toast =
    document.createElement("div");

  toast.className =
    `live-toast ${type}`;

  toast.innerHTML = `
    <div class="toast-icon">
      <span class="material-symbols-outlined">
        ${icons[type] || icons.info}
      </span>
    </div>

    <div class="toast-content">
      <div class="toast-title inter-bold">
        ${title}
      </div>

      ${
        message
          ? `
            <div class="toast-message inter-regular">
              ${message}
            </div>
          `
          : ""
      }
    </div>

    <button
      class="toast-close"
      type="button"
    >
      <span class="material-symbols-outlined">
        close
      </span>
    </button>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  toast
    .querySelector(".toast-close")
    .addEventListener("click", () => {
      removeToast(toast);
    });

  setTimeout(() => {
    removeToast(toast);
  }, 3500);

  return toast;
}


function removeToast(toast) {
  if (!toast) return;

  toast.classList.remove("show");

  setTimeout(() => {
    toast.remove();
  }, 300);
}
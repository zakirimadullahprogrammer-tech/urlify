/* Login */
const loginBtn =
  document.querySelector(".log-btn");

if (loginBtn) {
  loginBtn.addEventListener(
    "click",
    async () => {

      const username =
        document.getElementById("username")
          ?.value
          .trim();

      const password =
        document.getElementById("password")
          ?.value;

      if (isEmpty(username)) {
        showToast(
          "Username required",
          "Please enter your username.",
          "warning"
        );
        return;
      }

      if (isEmpty(password)) {
        showToast(
          "Password required",
          "Please enter your password.",
          "warning"
        );
        return;
      }

      try {
        manage_loader(1);

        loginBtn.disabled = true;
        loginBtn.style.opacity = "0.7";
        loginBtn.style.pointerEvents =
          "none";

        const response =
          await fetch(
            "/api/auth/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
                "Accept":
                  "application/json"
              },

              credentials:
                "include",

              body: JSON.stringify({
                username,
                password
              })
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          );

        if (
          !contentType ||
          !contentType.includes(
            "application/json"
          )
        ) {
          const text =
            await response.text();

          console.error(
            "Invalid login response:",
            text
          );

          showToast(
            "Login failed",
            "Server returned an invalid response.",
            "error"
          );

          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          showToast(
            "Login failed",
            data?.message ||
            "Invalid credentials.",
            "error"
          );
          return;
        }

        showToast(
          "Login successful",
          "Redirecting to dashboard...",
          "success"
        );

        setTimeout(() => {
          window.location.href =
            "/pages/dashboard";
        }, 500);

      } catch (error) {

        console.error(
          "Login Fetch Error:",
          error
        );

        if (!navigator.onLine) {
          showToast(
            "No internet connection",
            "Please check your network and try again.",
            "error"
          );
        } else {
          showToast(
            "Something went wrong",
            "Unable to login right now.",
            "error"
          );
        }

      } finally {

        manage_loader(0);

        loginBtn.disabled = false;
        loginBtn.style.opacity = "1";
        loginBtn.style.pointerEvents =
          "auto";
      }
    }
  );
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
function isEmpty(str) {
  return !str || str.trim() === "";
}

function transport(location) {
  if (!isEmpty(location)) {
    window.location.href = location;
  }
}

function showToast(title, message = "", type = "info") {
  const existingToast = document.querySelector(".live-toast");

  if (existingToast) {
    existingToast.remove();
  }

  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "notifications"
  };

  const toast = document.createElement("div");

  toast.className = `live-toast ${type}`;

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
          ? `<div class="toast-message inter-regular">${message}</div>`
          : ""
      }
    </div>

    <button class="toast-close" type="button">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  toast.querySelector(".toast-close").addEventListener("click", () => {
    removeToast(toast);
  });

  setTimeout(() => {
    removeToast(toast);
  }, 3500);
}

function removeToast(toast) {
  if (!toast) return;

  toast.classList.remove("show");

  setTimeout(() => {
    toast.remove();
  }, 300);
}

const shortenBtn = document.querySelector(".short_ad_btn");

if (shortenBtn) {
  shortenBtn.addEventListener("click", () => {
    const urlInput = document.querySelector("#url");
    const url = urlInput?.value.trim();

    if (!url) {
      showToast(
        "Invalid URL",
        "Please paste your long URL first.",
        "warning"
      );
      return;
    }

    if (!/^https?:\/\/.+/i.test(url)) {
      showToast(
        "Invalid URL",
        "URL must start with http:// or https://",
        "error"
      );
      return;
    }

    window.location.href = "/pages/signup";
  });
}
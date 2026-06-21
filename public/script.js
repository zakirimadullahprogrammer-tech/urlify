/* =========================
   URLify Script.js
   Cleaned Dashboard + Auth
========================= */

/* =========================
   Global State
========================= */

var shouldRefreshLinks = true;
var liveClickCount = 0;
var activeToast = null;

var allLinks = [];
var recentActivityData = [];

var analyticsLoadedOnce = false;
var analyticsNeedsRefresh = false;
var analyticsLoading = false;
var analyticsAutoRefreshEnabled = false;
var liveNotificationsEnabled = true;

var analyticsAutoRefreshTimer = null;
var liveRefreshTimer = null;
var refreshTimer = null;

var isLinksLoading = false;
var isRedirectingToLogin = false;
var activeSectionLoading = false;

var chartRangeRequestId = 0;

var socket = null;
var socketInitialized = false;

var recentActivityVisibleCount = 3;
var DEFAULT_VISIBLE = 3;
var LOAD_MORE_STEP = 3;

window.currentAnalyticsMode = "overall";
window.currentAnalyticsLinkId = null;

var btn = document.getElementById("mobileMenuBtn");
var sidebar = document.querySelector(".ds1");
var overlay = document.getElementById("mobileMenuOverlay");

var createLinkBtn = document.querySelector(".open_maker");
var searchInput = document.getElementById("searcher");
var clearButton = document.getElementById("clearSearch");

var statusFilter = document.getElementById("statusFilter");
var sortFilter = document.getElementById("sortFilter");
var searcher = document.getElementById("searcher");

var logoutBtn = document.getElementById("logoutBtn");

var analyticsSyncBtn = document.querySelector(".analytics-sync-btn");
var linksSyncBtn = document.querySelector(".links-sync-btn");
var settingsSyncBtn = document.querySelector(".settings-sync-btn");

var topRegionStat = document.getElementById("topRegionStat");

/* =========================
   Section History
========================= */

class HistoryNode {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.prev = null;
  }
}

let currentSectionId = "analyticsSection";
let historyTop = null;

function pushHistory(sectionId) {
  if (!sectionId) return;

  const node = new HistoryNode(sectionId);
  node.prev = historyTop;
  historyTop = node;

  updateGlobalBackButton();
}
function updateAnalyticsCards(data) {
  const totalClicks =
    Number(data?.cards?.totalClicks?.value || 0);

  const uniqueVisitors =
    Number(data?.cards?.uniqueVisitors?.value || 0);

  const totalClicksEl =
    document.getElementById("totalClicks");

  if (totalClicksEl) {
    totalClicksEl.textContent =
      formatCompactNumber(totalClicks);

    totalClicksEl.title =
      totalClicks.toLocaleString("en-IN");
  }

  const uniqueVisitorsEl =
    document.getElementById("uniqueVisitors");

  if (uniqueVisitorsEl) {
    uniqueVisitorsEl.textContent =
      totalClicks > 0
        ? formatCompactNumber(uniqueVisitors)
        : "No data";

    uniqueVisitorsEl.title =
      totalClicks > 0
        ? uniqueVisitors.toLocaleString("en-IN")
        : "No data";
  }

  const avgRedirectTimeEl =
    document.getElementById("avgRedirectTime");

  if (avgRedirectTimeEl) {
    avgRedirectTimeEl.textContent =
      totalClicks > 0
        ? data?.cards?.avgRedirectTime?.value || "0ms"
        : "No data";
  }

  updateTopRegionCard(data, totalClicks);

  return totalClicks;
}
function showSection(sectionId) {
  document.querySelectorAll(".page_section").forEach(section => {
    section.classList.remove("active_section");
  });

  document.querySelectorAll(".nav_box[data-section]").forEach(nav => {
    nav.classList.remove("active");
  });

  document.getElementById(sectionId)?.classList.add("active_section");

  document
    .querySelector(`.nav_box[data-section="${sectionId}"]`)
    ?.classList.add("active");

  currentSectionId = sectionId;
  updateGlobalBackButton();
}

function lockSectionSwitching() {
  activeSectionLoading = true;

  document
    .querySelectorAll(".nav_box[data-section]")
    .forEach(nav => {
      nav.classList.add("nav-disabled");
    });
}

function unlockSectionSwitching() {
  activeSectionLoading = false;

  document
    .querySelectorAll(".nav_box[data-section]")
    .forEach(nav => {
      nav.classList.remove("nav-disabled");
    });
}

/* =========================
   Mobile Menu
========================= */

function openMobileMenu() {
  sidebar?.classList.add("mobile-open");
  overlay?.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeMobileMenu() {
  sidebar?.classList.remove("mobile-open");
  overlay?.classList.remove("show");
  document.body.style.overflow = "";
}

/* =========================
   Common Helpers
========================= */

function isEmpty(str) {
  return !str || str.trim() === "";
}

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

function isValidUsername(username) {
  const regex = /^[a-z][a-z0-9_]{2,29}$/;
  return regex.test(username.trim());
}

function isValidFullName(fullname) {
  const regex = /^[A-Za-z][A-Za-z\s'.-]{1,99}$/;
  return regex.test(fullname.trim());
}

function isValidPassword(password) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/;

  return regex.test(password);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function manage_loader(visibility_code) {
  const loader = document.querySelector(".centralize_loader");
  if (!loader) return;

  loader.style.display = visibility_code === 1 ? "flex" : "none";
}

function showshowToastAfterLoader(message) {
  setTimeout(() => {
    showToast(message);
  }, 50);
}

function setSyncButtonState(button, isSyncing) {
  if (!button) return;

  button.disabled = isSyncing;
  button.classList.toggle("syncing", isSyncing);
}

function setSectionSyncing(sectionId, isSyncing) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.classList.toggle("section-syncing", isSyncing);
}

function formatCompactNumber(value) {
  const number = Number(value || 0);

  if (number >= 10000000) {
    return (
      (number / 10000000)
        .toFixed(1)
        .replace(/\.0$/, "") + "Cr"
    );
  }

  if (number >= 100000) {
    return (
      (number / 100000)
        .toFixed(1)
        .replace(/\.0$/, "") + "L"
    );
  }

  if (number >= 1000) {
    return (
      (number / 1000)
        .toFixed(1)
        .replace(/\.0$/, "") + "K"
    );
  }

  return number.toLocaleString("en-IN");
}

function getRelativeTime(dateString) {
  if (!dateString || dateString === "Never") {
    return "Never";
  }

  const fixedDateString =
    dateString.endsWith("Z")
      ? dateString
      : dateString + "Z";

  const now = new Date();
  const past = new Date(fixedDateString);

  const diffInSeconds =
    Math.floor((now - past) / 1000);

  if (diffInSeconds < 0 || diffInSeconds < 5) {
    return "Just now";
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes =
    Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours =
    Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays =
    Math.floor(diffInHours / 24);

  return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
}

function formatDate(dateString) {
  if (!dateString || dateString === "Never") {
    return "Never";
  }

  const fixedDateString =
    dateString.endsWith("Z")
      ? dateString
      : dateString + "Z";

  return new Date(fixedDateString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getCountryName(code) {
  try {
    return (
      new Intl.DisplayNames(["en"], {
        type: "region"
      }).of(code) || code
    );
  } catch {
    return code;
  }
}

function getShortCodeFromUrl(shortLink) {
  try {
    return new URL(shortLink).pathname.replace("/", "");
  } catch {
    return String(shortLink || "").split("/").pop();
  }
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options
  });

  if (response.status === 401) {
    handleSessionExpired("Please login again");
    throw new Error("Unauthorized");
  }

  return response;
}

function handleSessionExpired(message) {
  if (isRedirectingToLogin) return;

  isRedirectingToLogin = true;

  showToast(
    "Session expired",
    message || "Please login to URLify again",
    "info"
  );

  setTimeout(() => {
    window.location.replace("/pages/login");
  }, 500);
}

/* =========================
   Toast
========================= */

function showToast(title, message = "", type = "info") {
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
        ${escapeHtml(title)}
      </div>

      ${
        message
          ? `
            <div class="toast-message inter-regular">
              ${escapeHtml(message)}
            </div>
          `
          : ""
      }
    </div>

    <button class="toast-close" type="button">
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

/* =========================
   Login / Signup
========================= */

document.querySelector(".log-btn")?.addEventListener("click", async () => {
  manage_loader(1);

  const username = document.getElementById("username")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (isEmpty(username)) {
    manage_loader(0);
    showToast("Error", "Please enter your username", "error");
    return;
  }

  if (isEmpty(password)) {
    manage_loader(0);
    showToast("Error", "Please enter your password", "error");
    return;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token || "");
      localStorage.setItem("user", JSON.stringify(data.user || {}));

      showshowToastAfterLoader(data.message || "Login successful");

      setTimeout(() => {
        window.location.href = "/pages/dashboard";
      }, 150);
    } else {
      showshowToastAfterLoader(data.message || "Login failed");
    }
  } catch (err) {
    console.error("Login Fetch Error:", err);
    showshowToastAfterLoader("Something went wrong");
  } finally {
    manage_loader(0);
  }
});

document.querySelector(".sign-btn")?.addEventListener("click", async () => {
  const fullname = document.querySelector("#full_name")?.value.trim();
  const username = document.querySelector("#user_name")?.value.trim();
  const password = document.querySelector("#password")?.value;
  const confirmPassword = document.querySelector("#password_confirmed")?.value;

  if (isEmpty(fullname)) {
    showToast("Full name required", "Please enter your full name.", "warning");
    return;
  }

  if (!isValidFullName(fullname)) {
    showToast("Invalid full name", "Please enter a valid full name.", "error");
    return;
  }

  if (isEmpty(username)) {
    showToast("Username required", "Please enter a username.", "warning");
    return;
  }

  if (!isValidUsername(username)) {
    showToast("Invalid username", "Username must be 3–30 characters and valid.", "error");
    return;
  }

  if (isEmpty(password)) {
    showToast("Password required", "Please create a password.", "warning");
    return;
  }

  if (isEmpty(confirmPassword)) {
    showToast("Confirm password", "Please confirm your password.", "warning");
    return;
  }

  if (!isValidPassword(password)) {
    showToast(
      "Weak password",
      "Password must contain uppercase, lowercase, number, special character and be 8+ characters long.",
      "error"
    );
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "Please check and try again.", "error");
    return;
  }

  if (!document.querySelector("#agreement_checker")?.checked) {
    showToast("Terms not accepted", "Please agree to the terms & conditions.", "warning");
    return;
  }

  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        fullname
      })
    });

    const data = await response.json();

    if (response.ok) {
      showshowToastAfterLoader(data.message || "Signup successful");

      setTimeout(() => {
        window.location.href = "/pages/login";
      }, 150);
    } else {
      showshowToastAfterLoader(data.message || "Signup failed");
    }
  } catch (err) {
    console.error("Signup Fetch Error:", err);
    showshowToastAfterLoader("Something went wrong");
  }
});

document.querySelector("#password_checker")?.addEventListener("click", () => {
  const passwordInput = document.querySelector("#password");
  const checker = document.querySelector("#password_checker");

  if (!passwordInput || !checker) return;

  passwordInput.type = checker.checked ? "text" : "password";
});

/* =========================
   Links
========================= */

function toggleLinksControls(enabled) {
  const controls = [
    document.getElementById("searcher"),
    document.getElementById("statusFilter"),
    document.getElementById("sortFilter"),
    document.querySelector(".open_maker")
  ];

  controls.forEach(el => {
    if (!el) return;

    el.disabled = !enabled;
    el.style.pointerEvents = enabled ? "auto" : "none";
    el.style.opacity = enabled ? "1" : "0.65";
    el.style.cursor = enabled ? "pointer" : "wait";
  });
}

function guardLinksLoading() {
  if (!isLinksLoading) return false;

  showToast(
    "Loading links",
    "Please wait a moment.",
    "info"
  );

  return true;
}

async function getLinksFromAPI() {
  const hadLinksBefore = allLinks.length > 0;

  isLinksLoading = true;

  setSyncButtonState(linksSyncBtn, true);
  setSectionSyncing("linksSection", true);

  toggleLinksControls(false);

  if (!hadLinksBefore) {
    showLinksSkeletons();
  }

  try {
    const response = await fetch("/api/links", {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (
      response.status === 401 &&
      data?.code === "SESSION_EXPIRED"
    ) {
      handleSessionExpired(data.message);
      return false;
    }

    if (!response.ok) {
      throw new Error(
        data?.message || "Failed to fetch links"
      );
    }

    allLinks = Array.isArray(data.links)
      ? data.links
      : [];

    if (!hadLinksBefore) {
      hideLinksSkeletons();
    }

    applyFiltersSortingAndSearch();
    updateStats();

    return true;
  } catch (error) {
    console.log("Error fetching links:", error);

    if (!hadLinksBefore) {
      hideLinksSkeletons();

      const tableBody =
        document.getElementById("linksTableBody");

      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-table">
              No network connection
            </td>
          </tr>
        `;
      }
    }

    showToast(
      "Unable to refresh links",
      "Please check your internet connection.",
      "error"
    );

    return false;
  } finally {
    isLinksLoading = false;

    toggleLinksControls(true);

    setSectionSyncing("linksSection", false);
    setSyncButtonState(linksSyncBtn, false);
  }
}

function displayLinks(links) {
  const tableBody = document.getElementById("linksTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!links || links.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          Try changing filters or create a new link.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = links.map(link => {
    const shortLink = escapeHtml(link.shortLink);
    const originalUrl = escapeHtml(link.originalUrl);
    const status = escapeHtml(link.status || "Active");

    return `
      <tr>
        <td>
          <div
            class="clickable-link"
            onclick="openUrl('${shortLink}')"
          >
            <span class="link-text">${shortLink}</span>
            <span class="material-symbols-outlined">arrow_outward</span>
          </div>
        </td>

        <td class="url-cell">
          <div
            class="clickable-link"
            title="${originalUrl}"
            onclick="openUrl('${originalUrl}')"
          >
            <span class="link-text">${originalUrl}</span>
            <span class="material-symbols-outlined">arrow_outward</span>
          </div>
        </td>

        <td>${Number(link.clicks || 0)}</td>

        <td>
          <span class="status-badge ${status.toLowerCase()}">
            ${status}
          </span>
        </td>

        <td>
          <span title="${formatDate(link.created)}">
            ${getRelativeTime(link.created)}
          </span>
        </td>

        <td>
          ${
            link.lastClick === "Never"
              ? "Never"
              : `
                <span title="${formatDate(link.lastClick)}">
                  ${getRelativeTime(link.lastClick)}
                </span>
              `
          }
        </td>

        <td class="actions">
          <button
            class="action-btn"
            title="Copy"
            onclick="copyLink(event, '${shortLink}')"
          >
            <span class="material-symbols-outlined grey-similar">content_copy</span>
          </button>

          <button
            class="action-btn"
            onclick="openLinkAnalytics(event, ${Number(link.id)})"
            title="Analytics"
          >
            <span class="material-symbols-outlined grey-similar">analytics</span>
          </button>

          <button
            class="action-btn edit-link-btn"
            title="Edit"
            data-id="${Number(link.id)}"
          >
            <span class="material-symbols-outlined grey-similar">edit</span>
          </button>

          <button
            class="action-btn"
            title="Download QR"
            onclick="downloadQR('${shortLink}')"
          >
            <span class="material-symbols-outlined grey-similar">qr_code_2</span>
          </button>

          <button
            class="action-btn"
            title="Open"
            onclick="openUrl('${shortLink}')"
          >
            <span class="material-symbols-outlined grey-similar">arrow_outward</span>
          </button>

          <button
            type="button"
            class="action-btn delete-link-btn"
            title="Delete"
            data-id="${Number(link.id)}"
            data-short="${shortLink}"
          >
            <span class="material-symbols-outlined grey-similar">delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function applyFiltersSortingAndSearch() {
  const searcherEl = document.getElementById("searcher");
  const statusFilterEl = document.getElementById("statusFilter");
  const sortFilterEl = document.getElementById("sortFilter");

  if (!searcherEl || !statusFilterEl || !sortFilterEl) {
    displayLinks(allLinks);
    updateStats();
    return;
  }

  const searchValue =
    searcherEl.value.toLowerCase().trim();

  const selectedStatus =
    statusFilterEl.value;

  const selectedSort =
    sortFilterEl.value;

  let filteredLinks = [...allLinks];

  if (searchValue !== "") {
    filteredLinks = filteredLinks.filter(link => {
      const shortLink =
        String(link.shortLink || "").toLowerCase();

      const originalUrl =
        String(link.originalUrl || "").toLowerCase();

      return (
        shortLink.includes(searchValue) ||
        originalUrl.includes(searchValue)
      );
    });
  }

  if (selectedStatus !== "all") {
    filteredLinks = filteredLinks.filter(link =>
      String(link.status || "").toLowerCase() === selectedStatus
    );
  }

  switch (selectedSort) {
    case "newest":
      filteredLinks.sort((a, b) => new Date(b.created) - new Date(a.created));
      break;

    case "oldest":
      filteredLinks.sort((a, b) => new Date(a.created) - new Date(b.created));
      break;

    case "most-clicked":
      filteredLinks.sort((a, b) => Number(b.clicks || 0) - Number(a.clicks || 0));
      break;

    case "least-clicked":
      filteredLinks.sort((a, b) => Number(a.clicks || 0) - Number(b.clicks || 0));
      break;

    case "recently-clicked":
      filteredLinks.sort((a, b) => {
        if (a.lastClick === "Never") return 1;
        if (b.lastClick === "Never") return -1;

        return new Date(b.lastClick) - new Date(a.lastClick);
      });
      break;
  }

  displayLinks(filteredLinks);
  updateStats();
}

function updateStats() {
  const active =
    allLinks.filter(link => link.status === "Active").length;

  const inactive =
    allLinks.filter(link => link.status === "Inactive").length;

  const expired =
    allLinks.filter(link => link.status === "Expired").length;

  const totalLinksEl = document.getElementById("totalLinks");
  const activeLinksEl = document.getElementById("activeLinks");
  const inactiveLinksEl = document.getElementById("inactiveLinks");
  const expiredLinksEl = document.getElementById("expiredLinks");

  if (totalLinksEl) totalLinksEl.innerText = allLinks.length;
  if (activeLinksEl) activeLinksEl.innerText = active;
  if (inactiveLinksEl) inactiveLinksEl.innerText = inactive;
  if (expiredLinksEl) expiredLinksEl.innerText = expired;
}

function openUrl(url) {
  shouldRefreshLinks = true;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyLink(event, shortLink) {
  event.stopPropagation();

  try {
    await navigator.clipboard.writeText(shortLink);

    showToast(
      "Short link copied",
      "The link has been copied to your clipboard.",
      "success"
    );
  } catch {
    showToast(
      "Copy failed",
      "Please copy the link manually.",
      "error"
    );
  }
}

async function downloadQR(url) {
  try {
    const response = await fetch(
      `/api/qr?url=${encodeURIComponent(url)}`
    );

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      let message = "Failed to generate QR code.";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        message = data.message || message;
      }

      showToast(
        "Download failed",
        message,
        "error"
      );
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "qrcode.png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);

    showToast(
      "QR code downloaded",
      "The QR code image has been saved.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showToast(
      "Something went wrong",
      "Unable to contact the server. Please try again.",
      "error"
    );
  }
}
function refreshLinksAfterClick() {
  if (!shouldRefreshLinks) return;

  shouldRefreshLinks = false;

  clearTimeout(refreshTimer);

  refreshTimer = setTimeout(async () => {
    await getLinksFromAPI();

    setTimeout(() => {
      getLinksFromAPI();
    }, 1200);
  }, 700);
}

/* =========================
   Create Link Modal
========================= */

function setupCreateLinkModal() {
  document.querySelectorAll(".close_maker").forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelector(".centralize_maker")
        ?.style.setProperty("display", "none");
    });
  });

  if (createLinkBtn) {
    createLinkBtn.addEventListener("click", event => {
      if (guardLinksLoading()) {
        event.preventDefault();
        return;
      }

      document.querySelector(".centralize_maker").style.display = "flex";
    });
  }

  const expirySelect = document.getElementById("expiry");
  const hiddenDate = document.getElementById("hiddenDate");

  if (expirySelect && hiddenDate) {
    expirySelect.addEventListener("change", () => {
      if (expirySelect.value === "custom") {
        if (typeof hiddenDate.showPicker === "function") {
          hiddenDate.showPicker();
        } else {
          hiddenDate.click();
        }
      }
    });

    hiddenDate.addEventListener("change", () => {
      const selectedDate = hiddenDate.value;

      if (!selectedDate) return;

      const existingSelected =
        expirySelect.querySelector('option[value="selected"]');

      if (existingSelected) {
        existingSelected.remove();
      }

      expirySelect.innerHTML += `
        <option value="selected" selected>
          ${selectedDate}
        </option>
      `;
    });
  }

  const aliasInput = document.getElementById("customAlias");
  const previewLink = document.getElementById("previewLink");

  if (aliasInput && previewLink) {
    const baseUrl = window.location.origin + "/";

    previewLink.textContent = baseUrl + "my-link";

    aliasInput.addEventListener("input", () => {
      const alias = aliasInput.value.trim();

      previewLink.textContent =
        alias === ""
          ? baseUrl + "abc123"
          : baseUrl + alias;
    });
  }

  document.querySelector(".link_maker_2")?.addEventListener("click", createNewLink);
}

async function createNewLink() {
  const originalUrl =
    document.getElementById("longUrl")?.value.trim();

  const customAlias =
    document.getElementById("customAlias")?.value.trim();

  const expiry =
    document.getElementById("expiry")?.value || "never";

  if (!originalUrl) {
    showToast("Error", "Please enter your long URL", "error");
    return;
  }

  if (!/^https?:\/\/.+/i.test(originalUrl)) {
    showToast(
      "Error",
      "URL must start with http:// or https://",
      "error"
    );
    return;
  }

  if (
    customAlias &&
    !/^[a-zA-Z0-9_-]{3,30}$/.test(customAlias)
  ) {
    showToast(
      "Error",
      "Custom alias must be 3-30 characters and contain only letters, numbers, _ or -",
      "error"
    );
    return;
  }

  try {
    const response = await fetch("/api/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        originalUrl,
        customAlias,
        expiry
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(
        "Error",
        data.message || "Failed to create link",
        "error"
      );
      return;
    }

    showToast(
      "Success",
      "Short link created successfully",
      "success"
    );

    await getLinksFromAPI();

    document.getElementById("longUrl").value = "";
    document.getElementById("customAlias").value = "";
    document.getElementById("expiry").value = "never";

    document.getElementById("previewLink").textContent =
      window.location.origin + "/abc123";

    document.querySelector(".centralize_maker").style.display = "none";
  } catch (error) {
    console.error("Create link error:", error);

    showToast(
      "Error",
      "Something went wrong. Please try again.",
      "error"
    );
  }
}

/* =========================
   Delete / Edit Links
========================= */

async function deleteLink(event, urlId, shortCode) {
  event.stopPropagation();

  document.getElementById("deleteDialog")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="deleteDialog" class="dialog-overlay">
      <div class="dialog-box">
        <span class="material-symbols-outlined dialog-icon">
          delete
        </span>

        <h2 class="inter-bold">
          Delete Link?
        </h2>

        <p class="inter-regular">
          Are you sure you want to delete
          <strong>${escapeHtml(shortCode)}</strong>?
          <br>
          This action cannot be undone.
        </p>

        <div class="dialog-actions">
          <button
            id="cancelDeleteBtn"
            class="dialog-btn cancel-btn inter-bold"
          >
            Cancel
          </button>

          <button
            id="confirmDeleteBtn"
            class="dialog-btn delete-btn inter-bold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    `
  );

  const dialog = document.getElementById("deleteDialog");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  const closeDialog = () => dialog.remove();

  cancelBtn.addEventListener("click", closeDialog);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting...";

    try {
      const response = await fetch(`/api/links/${urlId}`, {
        method: "DELETE",
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok) {
        showToast(
          "Link deleted successfully",
          "The link has been removed.",
          "success"
        );

        allLinks = allLinks.filter(link => link.id != urlId);
        applyFiltersSortingAndSearch();
        closeDialog();
      } else {
        showToast(
          "Failed to delete link",
          data.message || "Please try again.",
          "error"
        );

        closeDialog();
      }
    } catch (error) {
      console.error("Delete Error:", error);

      showToast(
        "Something went wrong",
        "Please try again.",
        "error"
      );

      closeDialog();
    }
  });
}

window.deleteLink = deleteLink;

function showEditLinkDialog(link) {
  document.getElementById("editLinkDialog")?.remove();

  const shortCode = getShortCodeFromUrl(link.shortLink);
  const now = new Date();

  let selectedExpiry = "never";

  if (link.expiresAt) {
    const expiryDate = new Date(link.expiresAt);
    const diffMs = expiryDate - now;

    const diffHours =
      Math.ceil(diffMs / (1000 * 60 * 60));

    const diffDays =
      Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours <= 1) {
      selectedExpiry = "1hour";
    } else if (diffHours <= 12) {
      selectedExpiry = "12hours";
    } else if (diffDays <= 1) {
      selectedExpiry = "1day";
    } else if (diffDays <= 7) {
      selectedExpiry = "7days";
    } else if (diffDays <= 30) {
      selectedExpiry = "30days";
    } else if (diffDays <= 90) {
      selectedExpiry = "90days";
    } else {
      selectedExpiry = "custom";
    }
  }

  const isActive = link.status === "Active";

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="editLinkDialog" class="dialog-overlay">
      <div class="edit-link-dialog">
        <div class="edit-dialog-header">
          <div>
            <h2 class="inter-bold">
              Edit Link
            </h2>

            <p class="inter-regular">
              Update destination, alias, expiry and status.
            </p>
          </div>

          <button
            type="button"
            class="edit-dialog-close"
            id="closeEditDialogBtn"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="edit-field">
          <label class="inter-bold" for="editOriginalUrl">
            Destination URL
          </label>

          <div class="edit-input-wrap">
            <span class="material-symbols-outlined">link</span>

            <input
              id="editOriginalUrl"
              class="inter-regular"
              type="text"
              value="${escapeHtml(link.originalUrl)}"
            >
          </div>
        </div>

        <div class="edit-field">
          <label class="inter-bold" for="editCustomAlias">
            Custom Alias
          </label>

          <div class="edit-input-wrap">
            <span class="material-symbols-outlined">alternate_email</span>

            <input
              id="editCustomAlias"
              class="inter-regular"
              type="text"
              value="${escapeHtml(shortCode)}"
            >
          </div>
        </div>

        <div class="edit-field">
          <label class="inter-bold" for="editExpiry">
            Expiry
          </label>

          <select id="editExpiry" class="edit-select inter-regular">
            <option value="never" ${selectedExpiry === "never" ? "selected" : ""}>Never Expire</option>
            <option value="1hour" ${selectedExpiry === "1hour" ? "selected" : ""}>1 Hour</option>
            <option value="12hours" ${selectedExpiry === "12hours" ? "selected" : ""}>12 Hours</option>
            <option value="1day" ${selectedExpiry === "1day" ? "selected" : ""}>1 Day</option>
            <option value="7days" ${selectedExpiry === "7days" ? "selected" : ""}>7 Days</option>
            <option value="30days" ${selectedExpiry === "30days" ? "selected" : ""}>30 Days</option>
            <option value="90days" ${selectedExpiry === "90days" ? "selected" : ""}>90 Days</option>
            <option value="custom" ${selectedExpiry === "custom" ? "selected" : ""}>Custom Date</option>
          </select>

          <input
            type="date"
            id="editCustomExpiry"
            style="display:${selectedExpiry === "custom" ? "block" : "none"};"
          >
        </div>

        <div class="edit-status-box">
          <div>
            <h3 class="inter-bold">
              Link Status
            </h3>

            <p class="inter-regular">
              Disable the link without deleting its analytics.
            </p>
          </div>

          <label class="edit-switch">
            <input
              id="editIsActive"
              type="checkbox"
              ${isActive ? "checked" : ""}
            >
            <span></span>
          </label>
        </div>

        <div class="edit-preview-box">
          <p class="inter-bold">
            Preview
          </p>

          <div class="edit-preview-link inter-regular">
            ${window.location.origin}/<span id="editPreviewCode">${escapeHtml(shortCode)}</span>
          </div>
        </div>

        <div class="edit-dialog-actions">
          <button
            type="button"
            class="edit-secondary-btn inter-bold"
            id="cancelEditLinkBtn"
          >
            Cancel
          </button>

          <button
            type="button"
            class="edit-primary-btn inter-bold"
            id="saveEditLinkBtn"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
    `
  );

  const dialog = document.getElementById("editLinkDialog");

  const closeDialog = () => {
    dialog.remove();
  };

  const aliasInput = document.getElementById("editCustomAlias");
  const previewCode = document.getElementById("editPreviewCode");
  const editExpiry = document.getElementById("editExpiry");
  const editCustomExpiry = document.getElementById("editCustomExpiry");

  aliasInput.addEventListener("input", () => {
    previewCode.textContent =
      aliasInput.value.trim() || "abc123";
  });

  editExpiry.addEventListener("change", () => {
    editCustomExpiry.style.display =
      editExpiry.value === "custom" ? "block" : "none";
  });

  document
    .getElementById("closeEditDialogBtn")
    ?.addEventListener("click", closeDialog);

  document
    .getElementById("cancelEditLinkBtn")
    ?.addEventListener("click", closeDialog);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  document
    .getElementById("saveEditLinkBtn")
    ?.addEventListener("click", async () => {
      await updateLink(link.id, closeDialog);
    });
}

async function updateLink(linkId, closeDialog) {
  const saveBtn =
    document.getElementById("saveEditLinkBtn");

  const originalUrl =
    document.getElementById("editOriginalUrl").value.trim();

  const customAlias =
    document.getElementById("editCustomAlias").value.trim();

  const expiry =
    document.getElementById("editExpiry").value;

  const customExpiry =
    document.getElementById("editCustomExpiry")?.value || "";

  const isActive =
    document.getElementById("editIsActive").checked;

  if (!originalUrl) {
    showToast(
      "Destination URL required",
      "Please enter a valid URL.",
      "warning"
    );
    return;
  }

  if (!/^https?:\/\/.+/i.test(originalUrl)) {
    showToast(
      "Invalid URL",
      "URL must start with http:// or https://.",
      "warning"
    );
    return;
  }

  if (
    customAlias &&
    !/^[a-zA-Z0-9_-]{3,30}$/.test(customAlias)
  ) {
    showToast(
      "Invalid alias",
      "Use 3-30 characters: letters, numbers, _ or -.",
      "warning"
    );
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const response = await fetch(`/api/links/${linkId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        originalUrl,
        customAlias,
        expiry,
        customExpiry,
        isActive
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(
        "Update failed",
        data.message || "Please try again.",
        "error"
      );
      return;
    }

    showToast(
      "Link updated",
      "Your changes have been saved.",
      "success"
    );

    closeDialog();

    await getLinksFromAPI();
  } catch (error) {
    console.error("Update Link Error:", error);

    showToast(
      "Something went wrong",
      "Please try again.",
      "error"
    );
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

/* =========================
   Links Skeletons
========================= */

function showLinksSkeletons() {
  const textSkeletons = [
    ["totalLinks", "70px", "34px"],
    ["activeLinks", "60px", "34px"],
    ["inactiveLinks", "60px", "34px"],
    ["expiredLinks", "60px", "34px"],

    ["totalLinksLabel", "100px", "18px"],
    ["activeLinksLabel", "70px", "18px"],
    ["inactiveLinksLabel", "85px", "18px"],
    ["expiredLinksLabel", "75px", "18px"],

    ["linksTitle", "90px", "40px"],
    ["linksLastUpdated", "130px", "14px"]
  ];

  textSkeletons.forEach(([id, width, height]) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.dataset.originalText = el.textContent;
    el.textContent = "";

    el.style.setProperty("--links-skeleton-width", width);
    el.style.setProperty("--links-skeleton-height", height);

    el.classList.add("links-text-loading");
  });

  document
    .getElementById("linksControls")
    ?.classList.add("links-controls-loading");

  const tableBody = document.getElementById("linksTableBody");

  if (tableBody) {
    tableBody.innerHTML = getLinksTableSkeleton();
  }
}

function hideLinksSkeletons() {
  document
    .querySelectorAll("#linksSection .links-text-loading")
    .forEach(el => {
      el.classList.remove("links-text-loading");
      el.style.removeProperty("--links-skeleton-width");
      el.style.removeProperty("--links-skeleton-height");

      if (el.dataset.originalText !== undefined) {
        el.textContent = el.dataset.originalText;
        delete el.dataset.originalText;
      }
    });

  document
    .getElementById("linksControls")
    ?.classList.remove("links-controls-loading");

  const linksTitle = document.getElementById("linksTitle");
  if (linksTitle) linksTitle.textContent = "Links";

  const totalLinksLabel = document.getElementById("totalLinksLabel");
  if (totalLinksLabel) totalLinksLabel.textContent = "Total Links";

  const activeLinksLabel = document.getElementById("activeLinksLabel");
  if (activeLinksLabel) activeLinksLabel.textContent = "Active";

  const inactiveLinksLabel = document.getElementById("inactiveLinksLabel");
  if (inactiveLinksLabel) inactiveLinksLabel.textContent = "Inactive";

  const expiredLinksLabel = document.getElementById("expiredLinksLabel");
  if (expiredLinksLabel) expiredLinksLabel.textContent = "Expired";
}

function getLinksTableSkeleton() {
  return Array(6)
    .fill("")
    .map(() => `
      <tr class="link-row-skeleton">
        <td><div class="skeleton-link-short"></div></td>
        <td><div class="skeleton-link-url"></div></td>
        <td><div class="skeleton-small"></div></td>
        <td><div class="skeleton-pill"></div></td>
        <td><div class="skeleton-small"></div></td>
        <td><div class="skeleton-small"></div></td>
        <td>
          <div class="skeleton-actions">
            <div class="skeleton-icon-btn"></div>
            <div class="skeleton-icon-btn"></div>
            <div class="skeleton-icon-btn"></div>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

/* =========================
   Analytics
========================= */

function startAnalyticsAutoRefresh() {
  stopAnalyticsAutoRefresh();

  analyticsAutoRefreshTimer = setInterval(async () => {
    const analyticsSection =
      document.getElementById("analyticsSection");

    const isAnalyticsVisible =
      analyticsSection?.classList.contains("active_section");

    if (
      !analyticsAutoRefreshEnabled ||
      !isAnalyticsVisible ||
      document.hidden ||
      analyticsLoading
    ) {
      return;
    }

    try {
      analyticsLoading = true;
      await loadAnalytics(false, true);
    } catch (error) {
      console.log("Auto refresh failed:", error);
    } finally {
      analyticsLoading = false;
    }
  }, 20000);
}

function stopAnalyticsAutoRefresh() {
  clearInterval(analyticsAutoRefreshTimer);
  analyticsAutoRefreshTimer = null;
}

function refreshAnalyticsAfterLiveClick() {
  if (!analyticsAutoRefreshEnabled) return;
  if (document.hidden) return;

  const analyticsSection =
    document.getElementById("analyticsSection");

  const isAnalyticsVisible =
    analyticsSection?.classList.contains("active_section");

  if (!isAnalyticsVisible) {
    analyticsNeedsRefresh = true;
    return;
  }

  clearTimeout(liveRefreshTimer);

  liveRefreshTimer = setTimeout(async () => {
    if (analyticsLoading) {
      analyticsNeedsRefresh = true;
      return;
    }

    try {
      analyticsLoading = true;

      await loadAnalytics(true, true);

      liveClickCount = 0;
      analyticsNeedsRefresh = false;
    } finally {
      analyticsLoading = false;
    }
  }, 700);
}

async function loadAnalytics(
  fullReload = true,
  silent = false,
  requestId = null,
  showSuccessToast = false
) {
  const loaderStartTime = Date.now();
  const minimumLoaderTime = 600;

  let analyticsUpdatedSuccessfully = false;
  let data = null;
  let selectedRange = "30";
  let totalClicks = 0;

  const isFirstFullLoad =
    fullReload && !silent && !analyticsLoadedOnce;

  const isRangeRefresh =
    requestId !== null && analyticsLoadedOnce;

  const chartRangeLoader =
    document.getElementById("chartRangeLoader");

  const chartCanvas =
    document.getElementById("clickChart2");

  try {
    setSyncButtonState(analyticsSyncBtn, true);
    setSectionSyncing("analyticsSection", true);

    if (isFirstFullLoad) {
      showAnalyticsSkeletons();
    }

    if (!silent) {
      lockSectionSwitching();
    }

    selectedRange =
      document.getElementById("analyticsRange")?.value || "30";

    loadAnalytics.currentRange = selectedRange;

    if (isRangeRefresh) {
      if (chartRangeLoader) {
        chartRangeLoader.style.display = "flex";
      }

      if (chartCanvas) {
        chartCanvas.style.opacity = "0";
      }
    }

    const analyticsUrl =
      window.currentAnalyticsMode === "single" &&
      window.currentAnalyticsLinkId
        ? `/api/analytics/link/${window.currentAnalyticsLinkId}?range=${selectedRange}`
        : `/api/analytics?range=${selectedRange}`;

    const response = await fetch(analyticsUrl, {
      credentials: "include"
    });

    try {
      data = await response.json();
    } catch {
      throw new Error("Invalid analytics response");
    }

    if (
      response.status === 401 &&
      data?.code === "SESSION_EXPIRED"
    ) {
      handleSessionExpired(data.message);
      return;
    }

    if (!response.ok) {
      throw new Error(
        data?.message || "Analytics request failed"
      );
    }

    if (
      requestId !== null &&
      requestId !== chartRangeRequestId
    ) {
      return;
    }

    updateAnalyticsModeUI(data);

    

   totalClicks =
  Number(data?.cards?.totalClicks?.value || 0);

if (fullReload) {
  recentActivityData =
    Array.isArray(data?.recentActivity)
      ? data.recentActivity
      : [];

  recentActivityVisibleCount = 3;
}

    analyticsUpdatedSuccessfully = true;
    liveClickCount = 0;
  } catch (error) {
    console.error("Analytics fetch error:", error);

    if (!analyticsLoadedOnce) {
      hideAnalyticsSkeletons();

      showCardError("totalClicks");
      showCardError("uniqueVisitors");
      showCardError("avgRedirectTime");
      showTopRegionError();

      showListError("trafficSourcesContainer", "No network connection");
      showListError("browserAnalyticsContainer", "No network connection");
      showListError("osAnalyticsContainer", "No network connection");
      showListError("topLinksContainer", "No network connection");
      showListError("recentActivityContainer", "No network connection");

      showMapError("No network connection");
      showClickChartError("No network connection");

      const deviceLegend =
        document.getElementById("deviceLegend");

      const deviceWrap =
        document.querySelector(".device-chart-wrap");

      if (deviceWrap) {
        deviceWrap.innerHTML = `<canvas id="deviceChart"></canvas>`;
      }

      if (deviceLegend) {
        deviceLegend.innerHTML = `
          <div class="empty-analytics">
            No network connection
          </div>
        `;
      }
    } else {
      console.warn("Refresh failed — keeping previous analytics");
    }

    if (!silent) {
      showToast(
        "Unable to refresh overview",
        "Please check your internet connection.",
        "error"
      );
    }
  } finally {
    const elapsedTime =
      Date.now() - loaderStartTime;

    const remainingTime =
      Math.max(minimumLoaderTime - elapsedTime, 0);

    const delay =
      analyticsLoadedOnce ? 150 : remainingTime;

    await new Promise(resolve => setTimeout(resolve, delay));

    if (analyticsUpdatedSuccessfully && data) {
  if (fullReload && !silent) {
    hideAnalyticsSkeletons();
  }

  totalClicks = updateAnalyticsCards(data);

  if (isRangeRefresh) {
        const freshLoader =
          document.getElementById("chartRangeLoader");

        const freshCanvas =
          document.getElementById("clickChart2");

        if (freshLoader) {
          freshLoader.style.display = "none";
        }

        if (freshCanvas) {
          freshCanvas.style.opacity = "1";
        }
      }

      requestAnimationFrame(() => {
        if (fullReload) {
          renderWorldMapWhenVisible(
            data?.topRegions || [],
            totalClicks
          );

          renderDeviceBreakdown(
            data?.devices ||
            data?.deviceBreakdown ||
            []
          );

          renderAnalyticsBars(
            document.getElementById("trafficSourcesContainer"),
            data?.trafficSources,
            "source",
            "No traffic source data yet",
            "clicks"
          );

          renderAnalyticsBars(
            document.getElementById("browserAnalyticsContainer"),
            data?.browsers,
            "browser",
            "No browser analytics yet",
            "visits"
          );

          renderAnalyticsBars(
            document.getElementById("osAnalyticsContainer"),
            data?.operatingSystems,
            "operatingSystem",
            "No OS analytics yet",
            "visits"
          );

          renderTopLinks(data, totalClicks);
          renderRecentActivity();
        }

        if (
          requestId === null ||
          requestId === chartRangeRequestId
        ) {
          renderClickAnalyticsChart(data, selectedRange);
        }

        updateAnalyticsLastUpdated();
        analyticsLoadedOnce = true;

        if (showSuccessToast) {
          showToast(
            "Overview synced",
            "Overview has been refreshed.",
            "success"
          );
        }
      });
    } else {
      if (!analyticsLoadedOnce) {
        hideAnalyticsSkeletons();
      }

      if (isRangeRefresh) {
        if (chartRangeLoader) {
          chartRangeLoader.style.display = "none";
        }

        if (chartCanvas) {
          chartCanvas.style.opacity = "1";
        }
      }
    }

    setSyncButtonState(analyticsSyncBtn, false);
    setSectionSyncing("analyticsSection", false);

    if (!silent) {
      unlockSectionSwitching();
    }
  }
}

function updateTopRegionCard(data, totalClicks) {
  const topRegionData =
    Array.isArray(data?.topRegions) &&
    data.topRegions.length > 0
      ? data.topRegions[0]
      : null;

  const regionFlag =
    document.getElementById("regionFlag");

  const regionName =
    document.getElementById("regionName");

  if (topRegionData && totalClicks > 0) {
    const topCode =
      String(topRegionData.country || "").toUpperCase();

    const countryName =
      getCountryName(topCode);

    if (regionFlag) {
  regionFlag.style.display = "";
  regionFlag.className = "";
  regionFlag.innerHTML =
    `<span class="fi fi-${topCode.toLowerCase()}"></span>`;
}

if (regionName) {
  regionName.textContent = countryName;
  regionName.title = countryName;
  regionName.classList.remove("no-region-data");
}
  } else {
  if (regionFlag) {
    regionFlag.className = "";
    regionFlag.innerHTML = "";
    regionFlag.style.display = "none";
  }

  if (regionName) {
    regionName.textContent = "No data";
    regionName.title = "No data";
    regionName.classList.add("no-region-data");
  }
}
}

function updateAnalyticsModeUI(data) {
  const modeLabel =
    document.getElementById("analyticsModeLabel");

  const topLinksCard =
    document
      .getElementById("topLinksContainer")
      ?.closest(".region_card");

  const recentActivityTitle =
    document
      .getElementById("recentActivityContainer")
      ?.closest(".region_card")
      ?.querySelector("h3");

  if (window.currentAnalyticsMode === "single") {
    const link = data?.link;

    if (modeLabel && link) {
      modeLabel.innerHTML =
        `Viewing analytics for <strong>/${escapeHtml(link.shortCode)}</strong>`;
    }

    if (topLinksCard) {
      topLinksCard.style.display = "none";
    }

    if (recentActivityTitle) {
      recentActivityTitle.textContent =
        "Recent Click Activity";
    }
  } else {
    if (modeLabel) {
      modeLabel.textContent = "";
    }

    if (topLinksCard) {
      topLinksCard.style.display = "";
    }

    if (recentActivityTitle) {
      recentActivityTitle.textContent =
        "Recent Activity Feed";
    }
  }

  updateGlobalBackButton();
}

function setAnalyticsHeaderMode(mode, link = null) {
  const lastUpdated =
    document.getElementById("analyticsLastUpdated");

  const modeLabel =
    document.getElementById("analyticsModeLabel");

  if (mode === "single") {
    if (lastUpdated) {
      lastUpdated.textContent = "Loading link analytics...";
    }

    if (modeLabel) {
      modeLabel.innerHTML = link
        ? `Viewing analytics for <strong>/${escapeHtml(link.shortCode)}</strong>`
        : "Viewing single link analytics";
    }

    updateGlobalBackButton();
    return;
  }

  if (modeLabel) {
    modeLabel.textContent = "";
  }

  if (lastUpdated) {
    lastUpdated.textContent = "Syncing...";
  }

  updateGlobalBackButton();
}

function updateAnalyticsLastUpdated() {
  const lastUpdated =
    document.getElementById("analyticsLastUpdated");

  if (!lastUpdated) return;

  const now = new Date();

  lastUpdated.textContent =
    `Last synced ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

function setTextError(id, message = "No data") {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function showCardError(cardType) {
  const errors = {
    totalClicks: "No data",
    uniqueVisitors: "No data",
    avgRedirectTime: "No data"
  };

  setTextError(cardType, errors[cardType] || "No data");
}

function showTopRegionError() {
  const regionFlag =
    document.getElementById("regionFlag");

  const regionName =
    document.getElementById("regionName");

  if (regionFlag) {
    regionFlag.className = "material-symbols-outlined";
    regionFlag.textContent = "public";
  }

  if (regionName) {
    regionName.textContent = "No data";
    regionName.title = "No data";
  }
}

function showListError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="empty-analytics">
      ${escapeHtml(message)}
    </div>
  `;
}

/* =========================
   Analytics Skeletons
========================= */

function showAnalyticsSkeletons() {
  const textSkeletons = [
    ["analyticsTitle", "140px", "36px"],
    ["analyticsLastUpdated", "130px", "16px"],
    ["analyticsModeLabel", "170px", "16px"],
    ["totalClicks", "72px", "38px"],
    ["uniqueVisitors", "90px", "38px"],
    ["avgRedirectTime", "90px", "38px"],
    ["regionName", "120px", "38px"],
    ["chartTitle", "180px", "24px"]
  ];

  textSkeletons.forEach(([id, width, height]) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.dataset.originalText = el.textContent;
    el.textContent = "";
    el.style.setProperty("--analytics-skeleton-width", width);
    el.style.setProperty("--analytics-skeleton-height", height);
    el.classList.add("analytics-text-loading");
  });

  document
    .querySelectorAll("#analyticsSection .stat-card h4")
    .forEach(label => {
      label.dataset.originalText = label.textContent;
      label.textContent = "";
      label.style.setProperty("--analytics-skeleton-width", "120px");
      label.style.setProperty("--analytics-skeleton-height", "16px");
      label.classList.add("analytics-text-loading");
    });

  const regionFlag = document.getElementById("regionFlag");

  if (regionFlag) {
    regionFlag.dataset.originalClass = regionFlag.className;
    regionFlag.dataset.originalText = regionFlag.textContent;
    regionFlag.className = "analytics-text-loading";
    regionFlag.textContent = "";
    regionFlag.style.setProperty("--analytics-skeleton-width", "42px");
    regionFlag.style.setProperty("--analytics-skeleton-height", "34px");
  }

  const syncBtn =
    document.querySelector(".analytics-sync-btn");

  if (syncBtn) {
    syncBtn.classList.add("syncing");
    syncBtn.disabled = true;
  }

  const analyticsRange =
    document.getElementById("analyticsRange");

  const dropdownSkeleton =
    document.getElementById("dropdownSkeleton");

  if (analyticsRange) {
    analyticsRange.setAttribute("hidden", true);
  }

  if (dropdownSkeleton) {
    dropdownSkeleton.removeAttribute("hidden");
    dropdownSkeleton.style.display = "block";
    dropdownSkeleton.className = "analytics-text-loading";
    dropdownSkeleton.style.setProperty("--analytics-skeleton-width", "120px");
    dropdownSkeleton.style.setProperty("--analytics-skeleton-height", "40px");
  }

  showClickChartSkeleton();
  showMapSkeleton();
  showDeviceSkeleton();

  const trafficContainer =
    document.getElementById("trafficSourcesContainer");

  const browserContainer =
    document.getElementById("browserAnalyticsContainer");

  const osContainer =
    document.getElementById("osAnalyticsContainer");

  const topLinksContainer =
    document.getElementById("topLinksContainer");

  const recentActivityContainer =
    document.getElementById("recentActivityContainer");

  if (trafficContainer) {
    trafficContainer.innerHTML = getAnalyticsBarsSkeleton();
  }

  if (browserContainer) {
    browserContainer.innerHTML = getAnalyticsBarsSkeleton();
  }

  if (osContainer) {
    osContainer.innerHTML = getAnalyticsBarsSkeleton();
  }

  if (topLinksContainer) {
    topLinksContainer.innerHTML = getTopLinksSkeleton();
  }

  if (recentActivityContainer) {
    recentActivityContainer.innerHTML = getRecentActivitySkeleton();
  }
}

function hideAnalyticsSkeletons() {
  const analyticsSection =
    document.getElementById("analyticsSection");

  if (!analyticsSection) return;

  analyticsSection
    .querySelectorAll(".analytics-text-loading")
    .forEach(el => {
      el.classList.remove("analytics-text-loading");

      el.style.removeProperty("--analytics-skeleton-width");
      el.style.removeProperty("--analytics-skeleton-height");

      if (el.dataset.originalText !== undefined) {
        el.textContent = el.dataset.originalText;
        delete el.dataset.originalText;
      }

      if (el.dataset.originalClass !== undefined) {
        el.className = el.dataset.originalClass;
        delete el.dataset.originalClass;
      }
    });

  const syncBtn =
    document.querySelector(".analytics-sync-btn");

  if (syncBtn) {
    syncBtn.classList.remove("syncing");
    syncBtn.disabled = false;
  }

  const analyticsRange =
    document.getElementById("analyticsRange");

  const dropdownSkeleton =
    document.getElementById("dropdownSkeleton");

  if (analyticsRange) {
    analyticsRange.removeAttribute("hidden");
  }

  if (dropdownSkeleton) {
    dropdownSkeleton.setAttribute("hidden", true);
    dropdownSkeleton.style.display = "none";
    dropdownSkeleton.className = "";
  }

  hideClickChartSkeleton();
  hideMapSkeleton();
  hideDeviceSkeleton();

  const analyticsTitle =
    document.getElementById("analyticsTitle");

  if (analyticsTitle) {
    analyticsTitle.textContent =
      window.currentAnalyticsMode === "single"
        ? "Link Analytics"
        : "Overview";
  }

  const chartTitle =
    document.getElementById("chartTitle");

  if (chartTitle) {
    chartTitle.textContent = "Click Analytics";
  }
}

function showClickChartSkeleton() {
  const chartSkeletonContainer =
    document.getElementById("chartSkeletonContainer");

  if (!chartSkeletonContainer) return;

  if (window.clickChartInstance) {
    window.clickChartInstance.destroy();
    window.clickChartInstance = null;
  }

  chartSkeletonContainer.innerHTML = `
    <div class="chart-skeleton-box">
      <div class="chart-skeleton-line"></div>
    </div>
  `;
}

function hideClickChartSkeleton() {
  const chartSkeletonContainer =
    document.getElementById("chartSkeletonContainer");

  if (!chartSkeletonContainer) return;

  chartSkeletonContainer.innerHTML = `
    <div
      id="chartRangeLoader"
      class="chart-range-loader"
      style="display: none;"
    ></div>
    <canvas id="clickChart2"></canvas>
  `;
}

function showMapSkeleton() {
  const mapWrapper =
    document.querySelector(".map-wrapper");

  if (!mapWrapper) return;

  safelyDestroyWorldMap();

  mapWrapper.innerHTML = `
    <div class="map-skeleton-box"></div>
  `;
}

function hideMapSkeleton() {
  const mapWrapper =
    document.querySelector(".map-wrapper");

  if (!mapWrapper) return;

  mapWrapper.innerHTML = `
    <div
      id="mapLoader"
      class="map-loader"
      style="display: none;"
    ></div>
    <div id="worldMap"></div>
  `;
}

function showDeviceSkeleton() {
  const deviceWrap =
    document.querySelector(".device-chart-wrap");

  const deviceLegend =
    document.getElementById("deviceLegend");

  if (window.deviceChartInstance) {
    window.deviceChartInstance.destroy();
    window.deviceChartInstance = null;
  }

  if (deviceWrap) {
    deviceWrap.innerHTML = `
      <div class="device-skeleton-box">
        <div class="device-donut-skeleton"></div>
      </div>
    `;
  }

  if (deviceLegend) {
    deviceLegend.innerHTML = `
      <div class="device-legend-skeleton">
        ${Array(4).fill(`
          <div class="device-legend-skeleton-row">
            <div class="device-legend-left-skeleton">
              <div class="skeleton-dot"></div>
              <div class="skeleton-text-sm"></div>
            </div>
            <div class="skeleton-text-xs"></div>
          </div>
        `).join("")}
      </div>
    `;
  }
}

function hideDeviceSkeleton() {
  const deviceWrap =
    document.querySelector(".device-chart-wrap");

  const deviceLegend =
    document.getElementById("deviceLegend");

  if (window.deviceChartInstance) {
    window.deviceChartInstance.destroy();
    window.deviceChartInstance = null;
  }

  if (deviceWrap) {
    deviceWrap.innerHTML = `
      <canvas id="deviceChart"></canvas>
    `;
  }

  if (deviceLegend) {
    deviceLegend.innerHTML = "";
  }
}

function getAnalyticsBarsSkeleton() {
  return `
    <div class="analytics-bars-skeleton">
      ${Array(4).fill(`
        <div class="metric-row-skeleton">
          <div class="metric-header-skeleton">
            <div class="skeleton-bar skeleton-short"></div>
            <div class="skeleton-bar skeleton-mini"></div>
          </div>

          <div class="skeleton-progress"></div>
        </div>
      `).join("")}
    </div>
  `;
}

function getTopLinksSkeleton() {
  return `
    ${Array(4).fill(`
      <div class="top-link-card-skeleton">
        <div class="skeleton-rank"></div>

        <div>
          <div class="skeleton-bar skeleton-short-link"></div>
          <div class="skeleton-bar skeleton-full-link"></div>
        </div>

        <div>
          <div class="skeleton-bar skeleton-click-value"></div>
          <div class="skeleton-bar skeleton-click-label"></div>
        </div>
      </div>
    `).join("")}
  `;
}

function getRecentActivitySkeleton() {
  return `
    <div class="recent-activity-skeleton">
      ${Array(4).fill(`
        <div class="activity-item-skeleton">
          <div class="skeleton-bar skeleton-activity-title"></div>
          <div class="skeleton-bar skeleton-activity-subtitle"></div>
          <div class="skeleton-bar skeleton-activity-time"></div>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   Analytics Renderers
========================= */

function renderClickAnalyticsChart(data, selectedRange) {
  
 const chartSkeletonContainer =
    document.getElementById("chartSkeletonContainer");

  if (
    chartSkeletonContainer &&
    !chartSkeletonContainer.querySelector("#clickChart2")
  ) {
    chartSkeletonContainer.innerHTML = `
      <div
        id="chartRangeLoader"
        class="chart-range-loader"
        style="display: none;"
      ></div>

      <canvas id="clickChart2"></canvas>
    `;
  }

  const canvas = document.getElementById("clickChart2");


  if (!canvas || typeof Chart === "undefined") return;

  const analyticsData = Array.isArray(data?.clickAnalytics)
    ? data.clickAnalytics
    : [];

  const granularity = data?.granularity || "daily";

  const labels = analyticsData.length
    ? analyticsData.map(item => item.day)
    : ["No data"];

  const rawClicks = analyticsData.length
    ? analyticsData.map(item => Number(item?.clicks || 0))
    : [0];

  const hasRealData =
    rawClicks.some(click => click > 0);

    if (!hasRealData) {
  showClickAnalyticsEmptyState();
  return;
}

  if (window.clickChartInstance) {
    window.clickChartInstance.destroy();
    window.clickChartInstance = null;
  }

  const noDataPlugin = {
    id: "noDataPlugin",

    afterDraw(chart) {
      if (hasRealData) return;

      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      ctx.save();
      ctx.font = "18px Arial";
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        "No analytics data available",
        (chartArea.left + chartArea.right) / 2,
        (chartArea.top + chartArea.bottom) / 2
      );

      ctx.restore();
    }
  };

  window.clickChartInstance = new Chart(canvas, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Clicks",
          data: rawClicks,
          borderColor: "rgba(59,130,246,0.85)",
          borderWidth: 2,
          backgroundColor: "rgba(59,130,246,0.18)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 20,
          pointBackgroundColor: "#60a5fa",
          pointBorderWidth: 0
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      animation: {
        duration: analyticsLoadedOnce ? 250 : 700
      },

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          enabled: hasRealData,

          backgroundColor: "#ffffff",
          titleColor: "#111827",
          bodyColor: "#374151",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,

          callbacks: {
            title(context) {
              const index = context[0].dataIndex;
              const item = analyticsData[index];

              if (!item?.day) return "No data";

              return formatTooltipDate(item.day, granularity);
            },

            label(context) {
              return `Clicks: ${context.parsed.y.toLocaleString("en-IN")}`;
            }
          }
        }
      },

      scales: {
        x: {
          grid: {
            display: false
          },

          border: {
            color: "#e5e7eb"
          },

          ticks: {
            display: true,
            color: "#6b7280",

            font: {
              size: 12,
              weight: "500"
            },

            padding: 10,

            callback(value, index) {
              return formatXAxisLabel(
                labels[index],
                index,
                labels.length,
                granularity,
                selectedRange
              );
            }
          }
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "#eef2f7",
            drawBorder: false
          },

          border: {
            color: "#e5e7eb"
          },

          ticks: {
            display: true,
            color: "#6b7280",

            font: {
              size: 12,
              weight: "500"
            },

            padding: 10,
            precision: 0,

            callback(value) {
              return formatCompactNumber(value);
            }
          }
        }
      }
    },

    plugins: [noDataPlugin]
  });

  canvas.style.opacity = "1";
}

function showClickChartError(message = "No click analytics available") {
  const canvas = document.getElementById("clickChart2");
  if (!canvas || typeof Chart === "undefined") return;

  if (window.clickChartInstance) {
    window.clickChartInstance.destroy();
    window.clickChartInstance = null;
  }

  window.clickChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: ["No data"],
      datasets: [
        {
          data: [0],
          borderWidth: 0,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false },
          border: { display: false }
        },
        y: {
          display: false,
          grid: { display: false },
          border: { display: false }
        }
      }
    },
    plugins: [
      {
        id: "emptyStatePlugin",
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#6b7280";
          ctx.font = "500 15px Inter, sans-serif";
          ctx.fillText(
            message,
            (chartArea.left + chartArea.right) / 2,
            (chartArea.top + chartArea.bottom) / 2
          );
          ctx.restore();
        }
      }
    ]
  });

  canvas.style.opacity = "1";
}

function formatTooltipDate(value, granularity) {
  const date = new Date(value);

  if (granularity === "weekly") {
    return `Week of ${date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })}`;
  }

  if (granularity === "monthly") {
    return date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric"
    });
  }

  if (granularity === "quarterly") {
    const quarter =
      Math.floor(date.getMonth() / 3) + 1;

    return `Q${quarter} ${date.getFullYear()}`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatXAxisLabel(value, index, total, granularity, selectedRange) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = date.getDate();

  const month = date.toLocaleDateString("en-IN", {
    month: "short"
  });

  const year = date.getFullYear();

  if (selectedRange === "7") {
    return `${day} ${month}`;
  }

  if (selectedRange === "30") {
    if (![0, 4, 9, 14, 19, 24, 29].includes(index)) return "";
    return `${day} ${month}`;
  }

  if (selectedRange === "90") {
    if (![0, 14, 29, 44, 59, 74, 89].includes(index)) return "";
    return `${day} ${month}`;
  }

  if (selectedRange === "all") {
    if (granularity === "monthly") {
      return `${month} ${year}`;
    }

    if (granularity === "quarterly") {
      const quarter =
        Math.floor(date.getMonth() / 3) + 1;

      return `Q${quarter} ${year}`;
    }

    if (index === 0 || index === total - 1 || index % 30 === 0) {
      return `${day} ${month}`;
    }

    return "";
  }

  return `${day} ${month}`;
}

function safelyDestroyWorldMap() {
  if (!window.worldMapInstance) return;

  try {
    window.worldMapInstance.destroy();
  } catch (error) {
    console.warn("World map destroy skipped:", error);
  }

  window.worldMapInstance = null;

  const mapElement =
    document.getElementById("worldMap");

  if (mapElement) {
    mapElement.innerHTML = "";
  }
}

function renderWorldMapWhenVisible(topRegions, totalClicks) {
  const overview =
    document.getElementById("analyticsSection");

  if (!overview?.classList.contains("active_section")) {
    window.pendingWorldMapRender = {
      topRegions,
      totalClicks
    };
    return;
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      renderWorldMap(topRegions, totalClicks);
    }, 80);
  });
}

function renderWorldMap(topRegions, totalClicks) {
  const mapElement = document.getElementById("worldMap");
  const mapLoader = document.getElementById("mapLoader");
  const mapWrapper = document.querySelector(".map-wrapper");

  if (mapLoader) {
    mapLoader.style.display = "flex";
  }

  if (!mapElement || typeof jsVectorMap === "undefined") {
    if (mapLoader) mapLoader.style.display = "none";
    return;
  }

  if (
    !Array.isArray(topRegions) ||
    topRegions.length === 0 ||
    Number(totalClicks) === 0
  ) {
    safelyDestroyWorldMap();
    showEmptyWorldMapState();
    return;
  }

  if (
    mapElement.offsetWidth === 0 ||
    mapElement.offsetHeight === 0
  ) {
    if (mapLoader) mapLoader.style.display = "none";
    return;
  }

  safelyDestroyWorldMap();
  mapElement.innerHTML = "";

  const regionData = {};
  const regionClicks = {};

  topRegions.forEach(region => {
    const code =
      String(region.country || "").toUpperCase();

    const clicks =
      Number(region.clicks || region.totalClicks || 0);

    if (code && clicks > 0) {
      regionData[code] = 1;
      regionClicks[code] = clicks;
    }
  });

  const topRegion = topRegions[0];

  if (topRegion && topRegionStat) {
    const countryCode =
      String(topRegion.country || "").toLowerCase();

    const countryName =
      getCountryName(topRegion.country);

    const clicks =
      Number(topRegion.clicks || topRegion.totalClicks || 0);

    topRegionStat.innerHTML = `
      <span class="fi fi-${countryCode}"></span>
      ${countryName} • ${clicks.toLocaleString()} clicks
    `;
  }

  try {
    window.worldMapInstance = new jsVectorMap({
      selector: "#worldMap",
      map: "world",
      backgroundColor: "transparent",
      zoomButtons: true,
      draggable: window.innerWidth > 768,
      zoomOnScroll: false,

      regionStyle: {
        initial: {
          fill: "#e5e7eb",
          fillOpacity: 1,
          stroke: "#ffffff",
          strokeWidth: 0.8
        },

        hover: {
          fill: "#93c5fd",
          fillOpacity: 1,
          stroke: "#2563eb",
          strokeWidth: 1,
          cursor: "pointer"
        }
      },

      series: {
        regions: [
          {
            attribute: "fill",
            values: regionData,
            scale: {
              1: "#2563eb"
            }
          }
        ]
      },

      onRegionTooltipShow(event, tooltip, code) {
        const countryCode =
          String(code).toUpperCase();

        const clicks =
          Number(regionClicks[countryCode] || 0);

        const countryName =
          getCountryName(countryCode);

        tooltip._tooltip.innerHTML = `
          <div style="
            display:flex;
            align-items:center;
            gap:8px;
            font-size:14px;
            padding:6px 8px;
            color:#111827;
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:8px;
            box-shadow:0 4px 12px rgba(16,24,40,0.12);
          ">
            <span class="fi fi-${countryCode.toLowerCase()}"></span>
            <span>
              ${countryName} • ${clicks.toLocaleString()}
              click${clicks !== 1 ? "s" : ""}
            </span>
          </div>
        `;
      }
    });
  } catch (error) {
    console.warn("World map render failed:", error);
    showEmptyWorldMapState();
    return;
  }

  if (mapLoader) {
    mapLoader.style.display = "none";
  }

  if (mapWrapper) {
    mapWrapper.classList.remove("skeleton-text");
  }

  mapElement.style.opacity = "1";
}

function showEmptyWorldMapState() {
  const worldMap = document.getElementById("worldMap");
  const mapLoader = document.getElementById("mapLoader");

  if (!worldMap) return;

  if (mapLoader) {
    mapLoader.style.display = "none";
  }

  worldMap.style.opacity = "1";

  worldMap.innerHTML = `
    <div class="map-empty-state">
      <span class="material-symbols-outlined analytics-empty-icon">public</span>

      <h4 class="inter-regular">
        No geographic analytics yet
      </h4>
    </div>
  `;
}
function showClickAnalyticsEmptyState() {
  const chartSkeletonContainer =
    document.getElementById("chartSkeletonContainer");

  if (!chartSkeletonContainer) return;

  if (window.clickChartInstance) {
    window.clickChartInstance.destroy();
    window.clickChartInstance = null;
  }

  chartSkeletonContainer.innerHTML = `
    <div
      id="chartRangeLoader"
      class="chart-range-loader"
      style="display: none;"
    ></div>

    <div class="analytics-empty-state click-empty-state">
      <span class="material-symbols-outlined analytics-empty-icon">
        monitoring
      </span>

      <p class="analytics-empty-text">
        No click analytics yet
      </p>
    </div>
  `;
}

function showMapError(message = "Failed to load geographic analytics") {
  const worldMap = document.getElementById("worldMap");
  if (!worldMap) return;

  worldMap.innerHTML = `
    <div class="empty-analytics map-empty-state">
      ${escapeHtml(message)}
    </div>
  `;

  worldMap.style.opacity = "1";
}

function renderAnalyticsBars(
  container,
  items,
  labelKey,
  emptyMessage,
  clickLabel = "clicks"
) {
  if (!container) return;

  const validItems = Array.isArray(items)
    ? items.slice(0, 5)
    : [];

  if (!validItems.length) {
    container.innerHTML = `
      <div class="empty-analytics">
        ${escapeHtml(emptyMessage)}
      </div>
    `;
    return;
  }

  container.innerHTML = validItems.map((item, index) => {
    const percentage = Math.min(
      Math.max(parseFloat(item.percentage) || 0, 0),
      100
    );

    const clicks =
      Number(item.clicks || item.visits || 0);

    const singularText =
      clickLabel === "visits"
        ? "visit"
        : "click";

    const pluralText =
      clickLabel === "visits"
        ? "visits"
        : "clicks";

    const metricText =
      clicks === 1 ? singularText : pluralText;

    const fillId =
      `${labelKey}Fill${index + 1}`;

    return `
      <div class="wrap_inner">
        <div>
          <div class="metric-label-row">
            <span>
              ${escapeHtml(item[labelKey] || "Unknown")}
            </span>

            <span>
              ${percentage}%
              •
              ${clicks}
              ${metricText}
            </span>
          </div>

          <br>

          <div class="progress-line">
            <div
              id="${fillId}"
              class="progress-fill"
            ></div>
          </div>
        </div>
      </div>

      <br>
    `;
  }).join("");

  requestAnimationFrame(() => {
    validItems.forEach((item, index) => {
      const percentage = Math.min(
        Math.max(parseFloat(item.percentage) || 0, 0),
        100
      );

      const fill =
        document.getElementById(`${labelKey}Fill${index + 1}`);

      if (fill) {
        fill.style.width = `${percentage}%`;
      }
    });
  });
}

function renderTopLinks(data, totalClicks) {
  const topLinksContainer =
    document.getElementById("topLinksContainer");

  if (!topLinksContainer) return;

  const topLinks = (data?.topLinks || [])
    .filter(link => Number(link.totalClicks) > 0)
    .slice(0, 5);

  if (!topLinks.length || totalClicks === 0) {
    topLinksContainer.innerHTML = `
      <div class="empty-analytics">
        No link performance data yet
      </div>
    `;
    return;
  }

  topLinksContainer.innerHTML = topLinks
    .map((link, index) => {
      const shortCode = escapeHtml(link.shortCode);
      const originalUrl = escapeHtml(link.originalUrl);

      return `
        <div class="top-link-card">
          <div class="top-link-rank">
            #${index + 1}
          </div>

          <div class="top-link-content">
            <div class="top-link-short">
              <button
                type="button"
                class="analytics-short-link-btn"
                onclick="openAnalyticsByShortCode(event, '${shortCode}')"
              >
                /${shortCode}
              </button>
            </div>

            <div class="top-link-original" title="${originalUrl}">
              ${originalUrl}
            </div>
          </div>

          <div class="top-link-clicks">
            <div class="click-number" title="${Number(link.totalClicks || 0).toLocaleString("en-IN")}">
              ${formatCompactNumber(link.totalClicks)}
            </div>

            <div class="click-label">
              clicks
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentActivity() {
  const container =
    document.getElementById("recentActivityContainer");

  if (!container) return;

  container.innerHTML = "";

  if (!recentActivityData.length) {
    container.innerHTML = `
      <div class="empty-analytics">
        No recent activity yet
      </div>
    `;
    return;
  }

  const countryNames = {
    IN: "India",
    US: "United States",
    GB: "United Kingdom",
    DE: "Germany",
    FR: "France",
    CA: "Canada",
    AU: "Australia",
    JP: "Japan",
    CN: "China"
  };

  const visibleItems =
    recentActivityData.slice(0, recentActivityVisibleCount);

  visibleItems.forEach(activity => {
    const countryCode =
      String(activity.country || "XX").toUpperCase();

    const countryName =
      countryNames[countryCode] || countryCode;

    const flag =
      countryCode !== "XX"
        ? `<span class="fi fi-${countryCode.toLowerCase()}"></span>`
        : `<span>🌍</span>`;

    const relativeTime =
      activity.clickedAt
        ? formatRelativeTime(activity.clickedAt)
        : "Unknown time";

    const fullTime =
      activity.clickedAt
        ? formatFullDateTime(activity.clickedAt)
        : "Unknown time";

    container.innerHTML += `
      <div class="activity-card">
        <div class="activity-top-row">
          <div class="activity-header">
            ${flag}
            <span>
              ${escapeHtml(countryName)} clicked
              <button
                type="button"
                class="analytics-short-link-btn"
                onclick="openAnalyticsByShortCode(event, '${escapeHtml(activity.shortCode || "")}')"
              >
                /${escapeHtml(activity.shortCode || "unknown")}
              </button>
            </span>
          </div>

          <div class="activity-time" title="${escapeHtml(fullTime)}">
            ${escapeHtml(relativeTime)}
          </div>
        </div>

        <div class="activity-meta">
          ${escapeHtml(activity.browser || "Unknown")}
          •
          ${escapeHtml(activity.device || "Unknown")}
          •
          ${escapeHtml(activity.trafficSource || "Direct")}
        </div>
      </div>
    `;
  });

  if (recentActivityData.length > 3) {
    const reachedEnd =
      recentActivityVisibleCount >= recentActivityData.length;

    container.innerHTML += `
      <button
        type="button"
        class="show-more-activity inter-bold"
        onclick="showMoreRecentActivity()"
      >
        ${reachedEnd ? "Show less" : "Show more"}

        <span class="material-symbols-outlined">
          ${reachedEnd ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </span>
      </button>
    `;
  }
}
function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const now = new Date();
  const diffMs = now - date;

  if (diffMs < 0) {
    return "Just now";
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour === 1) return "1 hour ago";
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatFullDateTime(dateInput) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}
function showMoreRecentActivity() {
  const total = recentActivityData.length;

  const reachedEnd =
    recentActivityVisibleCount >= total;

  if (reachedEnd) {
    recentActivityVisibleCount = DEFAULT_VISIBLE;
  } else {
    recentActivityVisibleCount =
      Math.min(
        recentActivityVisibleCount + LOAD_MORE_STEP,
        total
      );
  }

  renderRecentActivity();
}

window.showMoreRecentActivity = showMoreRecentActivity;

function renderDeviceBreakdown(devices = []) {
  const deviceWrap =
    document.querySelector(".device-chart-wrap");

  if (deviceWrap && !deviceWrap.querySelector("#deviceChart")) {
    deviceWrap.innerHTML = `
      <canvas id="deviceChart"></canvas>
    `;
  }

  const canvas =
    document.getElementById("deviceChart");

  const legend =
    document.getElementById("deviceLegend");

  if (!canvas || typeof Chart === "undefined") return;

  if (window.deviceChartInstance) {
    window.deviceChartInstance.destroy();
    window.deviceChartInstance = null;
  }

  const validDevices = Array.isArray(devices)
    ? devices.filter(item =>
        Number(item.clicks || item.visits || 0) > 0
      )
    : [];

  if (!validDevices.length) {
  if (window.deviceChartInstance) {
    window.deviceChartInstance.destroy();
    window.deviceChartInstance = null;
  }

  if (deviceWrap) {
    deviceWrap.innerHTML = `
  <div class="analytics-empty-state device-empty-state">
    <span class="material-symbols-outlined analytics-empty-icon">
      devices
    </span>

    <p class="analytics-empty-text">
      No device data yet
    </p>
  </div>
`;
  }

  if (legend) {
    legend.innerHTML = "";
  }

  return;
}

  const labels = validDevices.map(item =>
    item.device || item.deviceType || "Unknown"
  );

  const values = validDevices.map(item =>
    Number(item.clicks || item.visits || 0)
  );

  const total =
    values.reduce((sum, value) => sum + value, 0);

  const colors = [
    "#2563eb",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6"
  ];

  window.deviceChartInstance = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels,

      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 6
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          backgroundColor: "#ffffff",
          titleColor: "#111827",
          bodyColor: "#374151",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          displayColors: true,

          callbacks: {
            label(context) {
              const value = context.parsed;

              const percentage =
  total ? Math.round((value / total) * 100) : 0;

              return `${context.label}: ${value} visits • ${percentage}%`;
            }
          }
        }
      }
    }
  });

  if (legend) {
    legend.innerHTML = validDevices
      .map((item, index) => {
        const label =
          item.device || item.deviceType || "Unknown";

        const value =
          Number(item.clicks || item.visits || 0);

        const percentage =
  total ? Math.round((value / total) * 100) : 0;
        return `
          <div class="device-legend-item">
            <div class="device-legend-left">
              <span
                class="device-dot"
                style="background:${colors[index % colors.length]}"
              ></span>

              <span class="inter-regular">
                ${escapeHtml(label)}
              </span>
            </div>

            <strong class="inter-bold">
              ${percentage}%
            </strong>
          </div>
        `;
      })
      .join("");
  }
}

/* =========================
   Single Link Analytics / Back
========================= */

async function openLinkAnalytics(event, linkId) {
  event.preventDefault();
  event.stopPropagation();

  if (analyticsLoading) return;

  const selectedLink =
    allLinks.find(link => link.id == linkId);

  if (currentSectionId !== "analyticsSection") {
    pushHistory(currentSectionId);
  }

  window.currentAnalyticsMode = "single";
  window.currentAnalyticsLinkId = linkId;

  showSection("analyticsSection");

  setAnalyticsHeaderMode(
    "single",
    selectedLink
      ? {
          shortCode:
            getShortCodeFromUrl(selectedLink.shortLink)
        }
      : null
  );

  analyticsLoading = true;

  try {
    await loadAnalytics(true, false, null);
  } finally {
    analyticsLoading = false;
    updateGlobalBackButton();
  }
}

window.openLinkAnalytics = openLinkAnalytics;

window.openAnalyticsByShortCode = async function (event, shortCode) {
  event.preventDefault();
  event.stopPropagation();

  if (!shortCode || shortCode === "unknown") {
    return;
  }

  const cleanShortCode =
    String(shortCode).replace("/", "");

  const selectedLink =
    allLinks.find(link => {
      const linkCode =
        getShortCodeFromUrl(link.shortLink);

      return linkCode === cleanShortCode;
    });

  if (!selectedLink) {
    showToast(
      "Link not found",
      "Please refresh links and try again.",
      "error"
    );
    return;
  }

  await openLinkAnalytics(event, selectedLink.id);
};

async function handleGlobalBack(event) {
  event?.preventDefault();
  event?.stopPropagation();

  if (activeSectionLoading || analyticsLoading) return;

  const analyticsSection =
    document.getElementById("analyticsSection");

  const isAnalyticsVisible =
    analyticsSection?.classList.contains("active_section");

  const isSingleAnalytics =
    isAnalyticsVisible &&
    window.currentAnalyticsMode === "single";

  if (isSingleAnalytics) {
    analyticsLoading = true;

    try {
      window.currentAnalyticsMode = "overall";
      window.currentAnalyticsLinkId = null;

      setAnalyticsHeaderMode("overall");

      await loadAnalytics(true, false, null);
    } finally {
      analyticsLoading = false;
      updateGlobalBackButton();
    }

    return;
  }

  if (!historyTop) return;

  const previousSectionId = historyTop.sectionId;
  historyTop = historyTop.prev;

  showSection(previousSectionId);

  try {
    activeSectionLoading = true;

    if (previousSectionId === "analyticsSection") {
      window.currentAnalyticsMode = "overall";
      window.currentAnalyticsLinkId = null;

      await loadAnalytics(true, false, null);
    }

    if (previousSectionId === "linksSection") {
      await getLinksFromAPI();
    }

    if (previousSectionId === "settingsSection") {
      await loadSettings();
    }
  } finally {
    activeSectionLoading = false;
    updateGlobalBackButton();
  }
}

function updateGlobalBackButton() {
  const analyticsSection =
    document.getElementById("analyticsSection");

  const isAnalyticsVisible =
    analyticsSection?.classList.contains("active_section");

  const isSingleAnalytics =
    isAnalyticsVisible &&
    window.currentAnalyticsMode === "single";

  const shouldShowBack =
    isSingleAnalytics || Boolean(historyTop);

  document.querySelectorAll(".global-back-btn").forEach(btn => {
    const parentSection = btn.closest(".page_section");

    const isInsideActiveSection =
      parentSection?.classList.contains("active_section");

    if (!shouldShowBack || !isInsideActiveSection) {
      btn.style.display = "none";
      return;
    }

    btn.style.display = "flex";

    const text =
      btn.querySelector(".globalBackText");

    if (text) {
      text.textContent = "Back";
    }
  });
}

/* =========================
   Settings
========================= */

async function loadSettings() {
  const fullNameInput =
    document.getElementById("settingsFullName");

  if (!fullNameInput) return false;

  const settingsAlreadyLoaded =
    fullNameInput.value.trim() !== "";

  setSyncButtonState(settingsSyncBtn, true);
  setSectionSyncing("settingsSection", true);

  if (!settingsAlreadyLoaded) {
    showSettingsSkeletons();
  }

  try {
    const response = await fetch("/api/settings", {
      credentials: "include"
    });

    const data = await response.json();

    if (
      response.status === 401 &&
      data?.code === "SESSION_EXPIRED"
    ) {
      handleSessionExpired(data.message);
      return false;
    }

    if (!response.ok) {
      throw new Error(
        data?.message || "Failed to load settings"
      );
    }

    document.getElementById("settingsFullName").value =
      data.user.fullname || "";

    document.getElementById("settingsUsername").value =
      data.user.username || "";

    document.getElementById("defaultExpiry").value =
      data.preferences.defaultExpiry || "never";

    document.getElementById("liveNotifications").checked =
      Boolean(data.preferences.liveNotifications);

    document.getElementById("analyticsAutoRefresh").checked =
      Boolean(data.preferences.analyticsAutoRefresh);

    liveNotificationsEnabled =
      Boolean(data.preferences.liveNotifications);

    analyticsAutoRefreshEnabled =
      Boolean(data.preferences.analyticsAutoRefresh);

    if (analyticsAutoRefreshEnabled) {
      startAnalyticsAutoRefresh();
    } else {
      stopAnalyticsAutoRefresh();
    }

    updateSettingsLastUpdated();

    return true;
  } catch (error) {
    console.error("Settings Load Error:", error);

    showToast(
      "Unable to refresh settings",
      "Please check your internet connection.",
      "error"
    );

    return false;
  } finally {
    setSyncButtonState(settingsSyncBtn, false);
    setSectionSyncing("settingsSection", false);

    if (!settingsAlreadyLoaded) {
      hideSettingsSkeletons();
    }
  }
}

async function saveAccountSettings() {
  const fullNameElement =
    document.getElementById("settingsFullName");

  const usernameElement =
    document.getElementById("settingsUsername");

  const fullname =
    fullNameElement.value.trim();

  const username =
    usernameElement.value.trim();

  const oldFullname =
    fullNameElement.dataset.previous || fullname;

  const oldUsername =
    usernameElement.dataset.previous || username;

  if (!fullname || !username) {
    showToast(
      "Missing required fields",
      "Please enter both full name and username.",
      "warning"
    );
    return;
  }

  try {
    setSectionSyncing("settingsSection", true);

    const response =
      await fetch("/api/settings/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          fullname,
          username
        })
      });

    const data = await response.json();

    if (!response.ok) {
      showToast(
        "Update failed",
        data.message ||
          "We couldn't update your account details. Please try again.",
        "error"
      );
      return;
    }

    const changes = [];

    if (oldFullname !== fullname) {
      changes.push("Full name updated");
    }

    if (oldUsername !== username) {
      changes.push("Username updated");
    }

    showToast(
      "Account updated",
      changes.length
        ? changes.join(" • ")
        : "Your account details are already up to date.",
      "success"
    );

    fullNameElement.dataset.previous = fullname;
    usernameElement.dataset.previous = username;
  } catch {
    showToast(
      "Unable to update account",
      "Please check your connection and try again.",
      "error"
    );
  } finally {
    setSectionSyncing("settingsSection", false);
  }
}

async function updatePassword() {
  const currentPassword =
    document.getElementById("currentPassword").value;

  const newPassword =
    document.getElementById("newPassword").value;

  const confirmNewPassword =
    document.getElementById("confirmNewPassword").value;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showToast(
      "Missing password fields",
      "Please complete all password fields.",
      "warning"
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast(
      "Password mismatch",
      "New password and confirmation password do not match.",
      "warning"
    );
    return;
  }

  if (currentPassword === newPassword) {
    showToast(
      "Choose a new password",
      "Your new password must be different from the current password.",
      "warning"
    );
    return;
  }

  try {
    setSectionSyncing("settingsSection", true);

    const response =
      await fetch("/api/settings/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

    const data = await response.json();

    if (!response.ok) {
      showToast(
        "Password update failed",
        data.message ||
          "We couldn't update your password. Please try again.",
        "error"
      );
      return;
    }

    [
      "currentPassword",
      "newPassword",
      "confirmNewPassword"
    ].forEach(id => {
      document.getElementById(id).value = "";
    });

    showToast(
      "Password updated",
      "Your password has been changed successfully.",
      "success"
    );
  } catch {
    showToast(
      "Unable to update password",
      "Please check your connection and try again.",
      "error"
    );
  } finally {
    setSectionSyncing("settingsSection", false);
  }
}

async function savePreferences() {
  const expiryElement =
    document.getElementById("defaultExpiry");

  const liveElement =
    document.getElementById("liveNotifications");

  const refreshElement =
    document.getElementById("analyticsAutoRefresh");

  const defaultExpiry =
    expiryElement.value;

  const liveNotifications =
    liveElement.checked;

  const analyticsAutoRefresh =
    refreshElement.checked;

  const oldExpiry =
    expiryElement.dataset.previous || defaultExpiry;

  const oldLive =
    liveElement.dataset.previous === "true";

  const oldRefresh =
    refreshElement.dataset.previous === "true";

  try {
    setSectionSyncing("settingsSection", true);

    const response =
      await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          defaultExpiry,
          liveNotifications,
          analyticsAutoRefresh
        })
      });

    const data = await response.json();

    if (!response.ok) {
      showToast(
        "Update failed",
        data.message ||
          "We couldn't update your preferences. Please try again.",
        "error"
      );
      return;
    }

    const changes = [];

    if (oldExpiry !== defaultExpiry) {
      const formattedExpiry =
        defaultExpiry === "never"
          ? "never expires"
          : defaultExpiry.replace(
              /(\d+)([a-zA-Z]+)/,
              "$1 $2"
            );

      changes.push(
        `Default expiry set to ${formattedExpiry}`
      );
    }

    if (oldLive !== liveNotifications) {
      changes.push(
        `Live notifications ${
          liveNotifications ? "enabled" : "disabled"
        }`
      );
    }

    if (oldRefresh !== analyticsAutoRefresh) {
      changes.push(
        `Auto refresh ${
          analyticsAutoRefresh ? "enabled" : "disabled"
        }`
      );
    }

    showToast(
      "Preferences updated",
      changes.length
        ? changes.join(" • ")
        : "Your settings are already up to date.",
      "success"
    );

    expiryElement.dataset.previous = defaultExpiry;
    liveElement.dataset.previous = liveNotifications;
    refreshElement.dataset.previous = analyticsAutoRefresh;

    liveNotificationsEnabled = liveNotifications;
    analyticsAutoRefreshEnabled = analyticsAutoRefresh;

    if (analyticsAutoRefreshEnabled) {
      startAnalyticsAutoRefresh();
    } else {
      stopAnalyticsAutoRefresh();
    }
  } catch {
    showToast(
      "Unable to update settings",
      "Please check your connection and try again.",
      "error"
    );
  } finally {
    setSectionSyncing("settingsSection", false);
  }
}

function showSettingsSkeletons() {
  const textSkeletons = [
    ["settingsSectionTitle", "110px", "36px"],

    ["accountSettingsTitle", "190px", "24px"],
    ["accountSettingsDesc", "245px", "14px"],
    ["fullNameLabel", "95px", "14px"],
    ["usernameLabel", "80px", "14px"],

    ["securityTitle", "105px", "24px"],
    ["securityDesc", "230px", "14px"],
    ["currentPasswordLabel", "155px", "14px"],
    ["newPasswordLabel", "125px", "14px"],
    ["confirmPasswordLabel", "155px", "14px"],

    ["linkPreferencesTitle", "185px", "24px"],
    ["linkPreferencesDesc", "255px", "14px"],
    ["defaultExpiryLabel", "120px", "14px"],
    ["liveNotificationLabel", "205px", "14px"],
    ["liveNotificationDesc", "275px", "13px"],
    ["autoRefreshLabel", "195px", "14px"],
    ["autoRefreshDesc", "220px", "13px"],

    ["dataPrivacyTitle", "150px", "24px"],
    ["dataPrivacyDesc", "245px", "14px"],

    ["dangerZoneTitle", "145px", "24px"],
    ["dangerZoneDesc", "290px", "14px"]
  ];

  textSkeletons.forEach(([id, width, height]) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.dataset.originalText = el.textContent;
    el.textContent = "";
    el.style.setProperty("--settings-skeleton-width", width);
    el.style.setProperty("--settings-skeleton-height", height);
    el.classList.add("settings-text-loading");
  });
}

function hideSettingsSkeletons() {
  document
    .querySelectorAll(".settings-text-loading")
    .forEach(el => {
      el.classList.remove("settings-text-loading");

      el.style.removeProperty("--settings-skeleton-width");
      el.style.removeProperty("--settings-skeleton-height");

      if (el.dataset.originalText !== undefined) {
        el.textContent = el.dataset.originalText;
        delete el.dataset.originalText;
      }
    });
}

function updateSettingsLastUpdated() {
  const el =
    document.getElementById("settingsLastUpdated");

  if (!el) return;

  const now = new Date();

  el.textContent =
    `Updated ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

/* =========================
   Socket
========================= */

function initializeSocket() {
  if (socketInitialized) return;

  socketInitialized = true;

  if (typeof io === "undefined") return;

  socket = io({
    withCredentials: true
  });

  socket.on("connect", () => {
    console.log("Live analytics connected");
  });

  socket.on("connect_error", err => {
    console.log("Socket error:", err.message);
  });

  socket.on("liveClick", data => {
    liveClickCount++;

    if (analyticsAutoRefreshEnabled) {
      refreshAnalyticsAfterLiveClick();
    }

    if (!liveNotificationsEnabled) return;

    if (activeToast) {
      activeToast.remove();
    }

    activeToast = showToast(
      "Live click",
      `/${data.shortCode} was clicked • ${liveClickCount} new click${
        liveClickCount > 1 ? "s" : ""
      } since last sync`,
      "live"
    );
  });
}

/* =========================
   Logout
========================= */

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(
        "Error",
        data.message || "Failed to logout",
        "error"
      );
      return;
    }

    showToast(
      "Success",
      "You have been logged out.",
      "success"
    );

    window.location.href = "/pages/login";
  } catch (error) {
    console.error("Logout Error:", error);

    showToast(
      "Error",
      "Something went wrong. Please try again.",
      "error"
    );
  }
}

/* =========================
   Event Listeners
========================= */

document.addEventListener("DOMContentLoaded", () => {
  if (btn && sidebar && overlay) {
    btn.addEventListener("click", () => {
      if (sidebar.classList.contains("mobile-open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    overlay.addEventListener("click", closeMobileMenu);
  }

  document.querySelectorAll(".global-back-btn").forEach(backBtn => {
    backBtn.addEventListener("click", handleGlobalBack);
  });

  document
    .querySelectorAll(".nav_box[data-section]")
    .forEach(nav => {
      nav.addEventListener("click", async event => {
        event.preventDefault();

        if (activeSectionLoading) return;

        const targetSectionId = nav.dataset.section;

        if (
          !targetSectionId ||
          targetSectionId === currentSectionId
        ) {
          closeMobileMenu();
          return;
        }

        pushHistory(currentSectionId);
        showSection(targetSectionId);
        closeMobileMenu();

        try {
          lockSectionSwitching();

          if (targetSectionId === "analyticsSection") {
            window.currentAnalyticsMode = "overall";
            window.currentAnalyticsLinkId = null;

            await loadAnalytics(true, false, null);
          }

          if (targetSectionId === "linksSection") {
            await getLinksFromAPI();
          }

          if (targetSectionId === "settingsSection") {
            await loadSettings();
          }
        } finally {
          unlockSectionSwitching();
          updateGlobalBackButton();
        }
      });
    });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  if (analyticsSyncBtn) {
    analyticsSyncBtn.addEventListener("click", async () => {
      if (analyticsSyncBtn.disabled) return;

      await loadAnalytics(true, false, null, true);
    });
  }

  if (linksSyncBtn) {
    linksSyncBtn.addEventListener("click", async () => {
      if (linksSyncBtn.disabled) return;

      const success = await getLinksFromAPI();

      if (success) {
        showToast(
          "Links synced",
          "Your latest links have been refreshed.",
          "success"
        );
      }
    });
  }

  if (settingsSyncBtn) {
    settingsSyncBtn.addEventListener("click", async () => {
      if (settingsSyncBtn.disabled) return;

      const success = await loadSettings();

      if (success) {
        showToast(
          "Settings refreshed",
          "Your latest settings have been loaded.",
          "success"
        );
      }
    });
  }

  statusFilter?.addEventListener("change", applyFiltersSortingAndSearch);
  sortFilter?.addEventListener("change", applyFiltersSortingAndSearch);

  if (searchInput && clearButton) {
    searchInput.addEventListener("input", () => {
      clearButton.classList.toggle(
        "show",
        searchInput.value.trim() !== ""
      );

      applyFiltersSortingAndSearch();
    });

    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      clearButton.classList.remove("show");

      applyFiltersSortingAndSearch();
      searchInput.focus();
    });
  }

  [searcher, statusFilter, sortFilter].forEach(el => {
    if (!el) return;

    el.addEventListener("mousedown", event => {
      if (guardLinksLoading()) {
        event.preventDefault();
      }
    });

    el.addEventListener("focus", event => {
      if (guardLinksLoading()) {
        event.target.blur();
      }
    });
  });

  document
    .getElementById("analyticsAutoRefresh")
    ?.addEventListener("change", event => {
      analyticsAutoRefreshEnabled = event.target.checked;

      if (analyticsAutoRefreshEnabled) {
        startAnalyticsAutoRefresh();
      } else {
        stopAnalyticsAutoRefresh();
      }
    });

  document.addEventListener("click", event => {
    const deleteBtn =
      event.target.closest(".delete-link-btn");

    if (!deleteBtn) return;

    event.preventDefault();
    event.stopPropagation();

    deleteLink(
      event,
      deleteBtn.dataset.id,
      deleteBtn.dataset.short
    );
  });

  document.addEventListener("click", event => {
    const editBtn =
      event.target.closest(".edit-link-btn");

    if (!editBtn) return;

    event.preventDefault();
    event.stopPropagation();

    const linkId = editBtn.dataset.id;

    const link =
      allLinks.find(item => item.id == linkId);

    if (!link) {
      showToast(
        "Link not found",
        "Please refresh and try again.",
        "error"
      );
      return;
    }

    showEditLinkDialog(link);
  });

  document
    .getElementById("saveAccountSettingsBtn")
    ?.addEventListener("click", saveAccountSettings);

  document
    .getElementById("updatePasswordBtn")
    ?.addEventListener("click", updatePassword);

  document
    .getElementById("savePreferencesBtn")
    ?.addEventListener("click", savePreferences);

  document
    .getElementById("exportLinksBtn")
    ?.addEventListener("click", () => {
      showToast(
        "Download started",
        "Your links export will be available shortly...",
        "info"
      );

      window.location.href = "/api/settings/export/links";
    });

  document
    .getElementById("exportAnalyticsBtn")
    ?.addEventListener("click", () => {
      showToast(
        "Download started",
        "Your analytics export will be available shortly...",
        "info"
      );

      window.location.href = "/api/settings/export/analytics";
    });

  const analyticsRange =
    document.getElementById("analyticsRange");

  if (analyticsRange) {
    analyticsRange.addEventListener("change", async () => {
      chartRangeRequestId++;

      const requestId = chartRangeRequestId;

      await loadAnalytics(false, true, requestId);
    });
  }

  setupCreateLinkModal();

  if (document.getElementById("linksSection")) {
    getLinksFromAPI();
  }

  if (document.getElementById("analyticsSection")) {
    loadAnalytics(true, false, null, false);
    initializeSocket();
  }

  if (document.getElementById("settingsSection")) {
    loadSettings();
  }

  updateGlobalBackButton();
});

/* =========================
   Page Focus Refresh
========================= */

window.addEventListener("focus", refreshLinksAfterClick);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshLinksAfterClick();
  }
});

window.addEventListener("pageshow", () => {
  const statusFilterEl =
    document.getElementById("statusFilter");

  const sortFilterEl =
    document.getElementById("sortFilter");

  if (statusFilterEl) {
    statusFilterEl.value = "all";
  }

  if (sortFilterEl) {
    sortFilterEl.value = "newest";
  }
});
const deleteAccountBtn =
  document.getElementById("deleteAccountBtn");

const deleteAccountModal =
  document.getElementById("deleteAccountModal");

const closeDeleteModalBtn =
  document.getElementById("closeDeleteModalBtn");

const cancelDeleteAccountBtn =
  document.getElementById("cancelDeleteAccountBtn");

const confirmDeleteAccountBtn =
  document.getElementById("confirmDeleteAccountBtn");

const deletePasswordInput =
  document.getElementById("deletePassword");

const deleteConfirmTextInput =
  document.getElementById("deleteConfirmText");

const deleteAccountError =
  document.getElementById("deleteAccountError");

function openDeleteAccountModal() {
  if (!deleteAccountModal) return;

  deleteAccountModal.classList.add("open");

  if (deletePasswordInput) {
    deletePasswordInput.value = "";
  }

  if (deleteConfirmTextInput) {
    deleteConfirmTextInput.value = "";
  }

  hideDeleteAccountError();

  setTimeout(() => {
    deletePasswordInput?.focus();
  }, 50);
}

function closeDeleteAccountModal() {
  if (!deleteAccountModal) return;

  deleteAccountModal.classList.remove("open");

  if (deletePasswordInput) {
    deletePasswordInput.value = "";
  }

  if (deleteConfirmTextInput) {
    deleteConfirmTextInput.value = "";
  }

  hideDeleteAccountError();
}

function showDeleteAccountError(message) {
  if (!deleteAccountError) return;

  deleteAccountError.textContent =
    message || "Something went wrong";

  deleteAccountError.classList.add("show");
}

function hideDeleteAccountError() {
  if (!deleteAccountError) return;

  deleteAccountError.textContent = "";
  deleteAccountError.classList.remove("show");
}

async function handleDeleteAccount() {
  const password =
    deletePasswordInput?.value.trim();

  const confirmText =
    deleteConfirmTextInput?.value.trim();

  hideDeleteAccountError();

  if (!password) {
    showDeleteAccountError("Password is required");
    return;
  }

  if (confirmText !== "DELETE") {
    showDeleteAccountError(
      "Please type DELETE to confirm account deletion"
    );
    return;
  }

  if (!confirmDeleteAccountBtn) return;

  confirmDeleteAccountBtn.disabled = true;
  confirmDeleteAccountBtn.textContent = "Deleting...";

  try {
    const response = await fetch("/api/settings/account", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        password,
        confirmText
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || "Failed to delete account"
      );
    }

    closeDeleteAccountModal();

    showToast(
      "Account deleted",
      data?.message ||
        "Your account has been deleted successfully.",
      "success"
    );

    setTimeout(() => {
      window.location.replace("/pages/login");
    }, 1200);

  } catch (error) {
    console.error("Delete account error:", error);

    showDeleteAccountError(
      error.message || "Failed to delete account"
    );

  } finally {
    confirmDeleteAccountBtn.disabled = false;
    confirmDeleteAccountBtn.textContent =
      "Delete permanently";
  }
}

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener(
    "click",
    openDeleteAccountModal
  );
}

if (closeDeleteModalBtn) {
  closeDeleteModalBtn.addEventListener(
    "click",
    closeDeleteAccountModal
  );
}

if (cancelDeleteAccountBtn) {
  cancelDeleteAccountBtn.addEventListener(
    "click",
    closeDeleteAccountModal
  );
}

if (confirmDeleteAccountBtn) {
  confirmDeleteAccountBtn.addEventListener(
    "click",
    handleDeleteAccount
  );
}

if (deleteAccountModal) {
  deleteAccountModal.addEventListener("click", event => {
    if (event.target === deleteAccountModal) {
      closeDeleteAccountModal();
    }
  });
}

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    deleteAccountModal?.classList.contains("open")
  ) {
    closeDeleteAccountModal();
  }
});
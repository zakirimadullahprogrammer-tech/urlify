var shouldRefreshLinks = true;
var liveClickCount = 0;
var activeToast = null;
var allLinks = [];
var analyticsLoadedOnce = false;
var analyticsRequestSeq = 0;
var refreshTimer = null;
var isChartRangeUpdating = false;
var chartRangeRequestId = 0;
var settingsSyncBtn = document.querySelector(".settings-sync-btn");
var isLinksLoading = false;
var analyticsNeedsRefresh = false;
var analyticsAutoRefreshEnabled = false;
var liveNotificationsEnabled = true;
var analyticsAutoRefreshTimer = null;
var liveRefreshTimer = null;
var analyticsLoading = false;
var btn = document.getElementById("mobileMenuBtn");
var sidebar = document.querySelector(".ds1");
var overlay = document.getElementById("mobileMenuOverlay");
var recentActivityVisibleCount = 3;
var createLinkBtn = document.querySelector(".open_maker");
var searchInput =document.getElementById("searcher");
var link_section = document.querySelector(".links");
var resetMapBtn = document.getElementById("resetMapBtn");
var topRegionStat = document.getElementById("topRegionStat");
var clearBtn = document.getElementById("clearSearch");
var logoutBtn = document.getElementById("logoutBtn");
var clearButton = document.getElementById("clearSearch");
var progressBars = {};
var statusFilter = document.getElementById("statusFilter");
var sortFilter = document.getElementById("sortFilter");
var searcher = document.getElementById("searcher");
var isRedirectingToLogin = false;
var socket = null;
var socketInitialized = false;
var activeToast = null;
var analyticsSyncBtn = document.querySelector(".analytics-sync-btn");
var linksSyncBtn = document.querySelector(".links-sync-btn");
var recentActivityExpanded = false;
var RECENT_ACTIVITY_STEP = 3;
var DEFAULT_VISIBLE = 3;
var LOAD_MORE_STEP = 3;
var activeSectionLoading = false;
window.currentAnalyticsMode = "overall";
window.currentAnalyticsLinkId = null;

function lockSectionSwitching() {
  activeSectionLoading = true;

  document.querySelectorAll(".nav_box[data-section]").forEach(nav => {
  nav.addEventListener("click", () => {
    switchDashboardSection(nav.dataset.section);
  });
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
function handleSessionExpired(message) {
  if (isRedirectingToLogin) return;

  isRedirectingToLogin = true;

  showToast(
    "Session expired",
    "Please login to Urlify again",
    "info"
  );

  window.location.replace("/pages/login");
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

function showshowToastAfterLoader(message) {
    ;

    setTimeout(() => {
        showToast(message);
    }, 50);
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

/* Short URL button */
if (document.querySelector(".short_ad_btn")) {
    document.querySelector(".short_ad_btn").addEventListener("click", function() {
        const url = document.querySelector("#url").value;

        if (isEmpty(url)) {
            showToast("Invalid URL", "Please enter your long URL", "error");
        } else {
            showToast("Proceeding...");
        }
    });
}

/* Chart */
if (document.querySelector("#clickChart")) {
    const ctx = document.getElementById("clickChart");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: ["Day 1", "Day 5", "Day 10", "Day 15", "Day 20", "Day 25", "Day 30"],
            datasets: [
  {
    label: "Clicks",
    data: clicks,

    borderColor: "#2563eb",
    borderWidth: 2.5,

    backgroundColor: "rgba(37,99,235,0.08)",

    fill: true,

    tension: 0.4,

    pointRadius: 0,
    pointHoverRadius: 5,
    pointHitRadius: 20,

    pointBackgroundColor: "#2563eb",
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2
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
      cornerRadius: 12,
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
      color: "#6b7280",   // visible on white bg

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
      color: "#6b7280",  // visible on white bg

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
}
    });
}

/* Login */
if (document.querySelector(".log-btn")) {
    document.querySelector(".log-btn").addEventListener("click", async () => {
       manage_loader(1);
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (isEmpty(username)) {
            showToast("Error","Please enter your username","error");
            return;
        }

        if (isEmpty(password)) {
            showToast("Error", "Please enter your password", "error");
            return;
        }

        try {
            ;

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
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                showshowToastAfterLoader(data.message);

                setTimeout(() => {
                    window.location.href = "/pages/dashboard";
                }, 150);
            } else {
                showshowToastAfterLoader(data.message);
            }

        } catch (err) {
            console.error("Login Fetch Error:", err);
            showshowToastAfterLoader("Something went wrong");
        }finally{
          manage_loader(0);
        }
    });
}

/* Progress bars */
if (document.querySelector("#p1")) {
    const values = [42, 18, 9, 6, 42, 28, 19, 11];

    for (let i = 1; i <= 8; i++) {
    const bar = new ProgressBar.Line(`#p${i}`, {
  strokeWidth: 6,
  color: "#ffffff",
  trailColor: "rgba(255,255,255,0.2)",
  trailWidth: 6,
  easing: "easeInOut",
  duration: 900,

  svgStyle: {
    width: "100%",
    height: "100%"
  },

  from: {
    color: "#ffffff"
  },

  to: {
    color: "#ffffff"
  },

  step(state, bar) {
    bar.path.setAttribute(
      "stroke-linecap",
      "round"
    );

    bar.trail.setAttribute(
      "stroke-linecap",
      "round"
    );
  }
});

        bar.animate(values[i - 1] / 100);
    }
}

/* Signup */
if (document.querySelector(".sign-btn")) {
    document.querySelector(".sign-btn").addEventListener("click", async () => {
        const fullname = document.querySelector("#full_name").value.trim();
        const username = document.querySelector("#user_name").value.trim();
        const password = document.querySelector("#password").value;
        const confirmPassword = document.querySelector("#password_confirmed").value;

        if (isEmpty(fullname)) {
  showToast(
    "Full name required",
    "Please enter your full name.",
    "warning"
  );
  return;

} else if (!isValidFullName(fullname)) {
  showToast(
    "Invalid full name",
    "Please enter a valid full name.",
    "error"
  );
  return;

} else if (isEmpty(username)) {
  showToast(
    "Username required",
    "Please enter a username.",
    "warning"
  );
  return;

} else if (!isValidUsername(username)) {
  showToast(
    "Invalid username",
    "Username must be 3–30 characters and valid.",
    "error"
  );
  return;

} else if (isEmpty(password)) {
  showToast(
    "Password required",
    "Please create a password.",
    "warning"
  );
  return;

} else if (isEmpty(confirmPassword)) {
  showToast(
    "Confirm password",
    "Please confirm your password.",
    "warning"
  );
  return;

} else if (!isValidPassword(password)) {
  showToast(
    "Weak password",
    "Password must contain uppercase, lowercase, number, special character and be 8+ characters long.",
    "error"
  );
  return;

} else if (password !== confirmPassword) {
  showToast(
    "Passwords do not match",
    "Please check and try again.",
    "error"
  );
  return;

} else if (
  !document.querySelector("#agreement_checker").checked
) {
  showToast(
    "Terms not accepted",
    "Please agree to the terms & conditions.",
    "warning"
  );
  return;
} else {

            try {
                ;

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
                    showshowToastAfterLoader(data.message);

                    setTimeout(() => {
                        window.location.href = "/pages/login";
                    }, 150);
                } else {
                    showshowToastAfterLoader(data.message);
                }

            } catch (err) {
                console.error("Signup Fetch Error:", err);
                showshowToastAfterLoader("Something went wrong");
            }
        }
    });
}
if (document.querySelector("#password_checker")) {
    document.querySelector("#password_checker").addEventListener("click", () => {
        if (document.querySelector("#password_checker").checked) {
            document.querySelector("#password").type = "text";
        } else {
            document.querySelector("#password").type = "password";
        }
    });
}

function isValidUsername(username) {
    const regex = /^[a-z][a-z0-9_]{2,29}$/;
    return regex.test(username.trim());
}
function startAnalyticsAutoRefresh() {

  stopAnalyticsAutoRefresh();

  analyticsAutoRefreshTimer =
    setInterval(async () => {

      const analyticsSection =
        document.getElementById(
          "analyticsSection"
        );

      const isAnalyticsVisible =
        analyticsSection?.classList.contains(
          "active_section"
        );

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
        console.log(
          "Auto refresh failed:",
          error
        );

      } finally {
        analyticsLoading = false;
      }

    }, 20000); // 20 sec
}

function stopAnalyticsAutoRefresh() {

  clearInterval(
    analyticsAutoRefreshTimer
  );

  analyticsAutoRefreshTimer =
    null;
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

    el.style.pointerEvents =
      enabled ? "auto" : "none";

    el.style.opacity =
      enabled ? "1" : "0.65";

    el.style.cursor =
      enabled ? "pointer" : "wait";
  });
}
async function getLinksFromAPI() {
  const hadLinksBefore = allLinks.length > 0;

  isLinksLoading = true;

  setSyncButtonState(linksSyncBtn, true);
  setSectionSyncing("linksSection", true);

  toggleLinksControls(false);
  lockSectionSwitching();

  if (!hadLinksBefore) {
    showLinksSkeletons();
  }

  try {
    const response = await fetch("/api/links", {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

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

    if (searcher && statusFilter && sortFilter) {
      applyFiltersSortingAndSearch();
    } else {
      displayLinks(allLinks);
      updateStats();
    }

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
    unlockSectionSwitching();

    setSectionSyncing("linksSection", false);
    setSyncButtonState(linksSyncBtn, false);
  }
}
function refreshAnalyticsAfterLiveClick() {
  if (!analyticsAutoRefreshEnabled) return;
  if (analyticsLoading) return;
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
    try {
  analyticsLoading = true;

  showAnalyticsSkeletons();

  await loadAnalytics(true, false);

  liveClickCount = 0;
  analyticsNeedsRefresh = false;

  console.log("Live click count reset:", liveClickCount);

} catch (error) {
  console.log("Live refresh failed:", error);

} finally {
  analyticsLoading = false;
} 
  }, 700);
}
function applyFiltersAndSorting() {

    const selectedStatus =
        document.getElementById("statusFilter").value;

    const selectedSort =
        document.getElementById("sortFilter").value;

    // Start from all links
    let filteredLinks = [...allLinks];

    // 1. FILTER FIRST
    if (selectedStatus !== "all") {
        filteredLinks = filteredLinks.filter(link =>
            link.status.toLowerCase() === selectedStatus
        );
    }

    // 2. SORT FILTERED RESULT
    switch (selectedSort) {

        case "newest":
            filteredLinks.sort(
                (a, b) =>
                new Date(b.created) -
                new Date(a.created)
            );
            break;

        case "oldest":
            filteredLinks.sort(
                (a, b) =>
                new Date(a.created) -
                new Date(b.created)
            );
            break;

        case "most-clicked":
            filteredLinks.sort(
                (a, b) =>
                b.clicks - a.clicks
            );
            break;

        case "least-clicked":
            filteredLinks.sort(
                (a, b) =>
                a.clicks - b.clicks
            );
            break;

        case "recently-clicked":
            filteredLinks.sort((a, b) => {

                if (a.lastClick === "Never") return 1;
                if (b.lastClick === "Never") return -1;

                return (
                    new Date(b.lastClick) -
                    new Date(a.lastClick)
                );
            });
            break;
    }

    // 3. DISPLAY RESULT
    displayLinks(filteredLinks);
}

if(document.getElementById("statusFilter") && document.getElementById("sortFilter")){
    document
    .getElementById("statusFilter")
    .addEventListener("change", applyFiltersSortingAndSearch);

document
    .getElementById("sortFilter")
    .addEventListener("change", applyFiltersSortingAndSearch);
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
function displayLinks(links) {
    const tableBody = document.getElementById("linksTableBody");

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

    links.forEach(link => {
        const shortLink = link.shortLink;
        const originalUrl = link.originalUrl;
        const status = link.status || "Active";

        tableBody.innerHTML += `
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

        <td>${link.clicks}</td>

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
          ${link.lastClick === "Never"
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
  onclick="openLinkAnalytics(event, ${link.id})"
  title="Analytics"
>
  <span class="material-symbols-outlined grey-similar">
    analytics
  </span>
</button>

          <button
  class="action-btn edit-link-btn"
  title="Edit"
  data-id="${link.id}"
>
  <span class="material-symbols-outlined grey-similar">
    edit
  </span>
</button>
          <button
  class="action-btn"
  title="Download QR"
  onclick="downloadQR('${link.shortLink}')"
>
  <span class="material-symbols-outlined grey-similar">
    qr_code_2
  </span>
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
  data-id="${link.id}"
  data-short="${link.shortLink}"
>
  <span class="material-symbols-outlined grey-similar">
    delete
  </span>
</button>
        </td>
      </tr>
    `;
    });
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
function openUrl(url) {
    shouldRefreshLinks = true;
    window.open(url, "_blank", "noopener,noreferrer");
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
getLinksFromAPI();

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

window.addEventListener("pageshow", () => {
    document.getElementById("statusFilter").value = "all";
    document.getElementById("sortFilter").value = "newest";
});



function applyFiltersSortingAndSearch() {
  const searcher = document.getElementById("searcher");
  const statusFilter = document.getElementById("statusFilter");
  const sortFilter = document.getElementById("sortFilter");

  if (!searcher || !statusFilter || !sortFilter) {
    return;
  }

  const searchValue = searcher.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
const selectedSort = sortFilter.value;

    let filteredLinks = [...allLinks];

    // Search by short link or original URL
    if (searchValue !== "") {
        filteredLinks = filteredLinks.filter(link => {
            const shortLink = link.shortLink.toLowerCase();
            const originalUrl = link.originalUrl.toLowerCase();

            return (
                shortLink.includes(searchValue) ||
                originalUrl.includes(searchValue)
            );
        });
    }

    // Status filter
    if (selectedStatus !== "all") {
        filteredLinks = filteredLinks.filter(link =>
            link.status.toLowerCase() === selectedStatus
        );
    }

    // Sorting
    switch (selectedSort) {
        case "newest":
            filteredLinks.sort((a, b) => new Date(b.created) - new Date(a.created));
            break;

        case "oldest":
            filteredLinks.sort((a, b) => new Date(a.created) - new Date(b.created));
            break;

        case "most-clicked":
            filteredLinks.sort((a, b) => b.clicks - a.clicks);
            break;

        case "least-clicked":
            filteredLinks.sort((a, b) => a.clicks - b.clicks);
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
        allLinks.filter(
            link =>
            link.status === "Active"
        ).length;

    const inactive =
        allLinks.filter(
            link =>
            link.status === "Inactive"
        ).length;

    const expired =
        allLinks.filter(
            link =>
            link.status === "Expired"
        ).length;

    document.getElementById(
            "totalLinks"
        ).innerText =
        allLinks.length;

    document.getElementById(
            "activeLinks"
        ).innerText =
        active;

    document.getElementById(
            "inactiveLinks"
        ).innerText =
        inactive;

    document.getElementById(
            "expiredLinks"
        ).innerText =
        expired;
}
// Search live while typing
if (searcher) {
  searcher.addEventListener(
  "focus",
  (e) => {

    if (guardLinksLoading()) {
      e.target.blur();
    }
  }
);
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

window.addEventListener("focus", refreshLinksAfterClick);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        refreshLinksAfterClick();
    }
});




if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    const searcher = document.getElementById("searcher");

    if (!searcher) return;

    searcher.value = "";
    clearBtn.style.display = "none";

    applyFiltersSortingAndSearch();
    searcher.focus();
  });
}
async function deleteLink(
  event,
  urlId,
  shortCode
) {

  event.stopPropagation();

  document
    .getElementById(
      "deleteDialog"
    )
    ?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div
      id="deleteDialog"
      class="dialog-overlay"
    >
      <div class="dialog-box">

        <span
          class="material-symbols-outlined dialog-icon"
        >
          delete
        </span>

        <h2 class="inter-bold">
          Delete Link?
        </h2>

        <p
          class="inter-regular"
        >
          Are you sure you want to delete
          <strong>${shortCode}</strong>?
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

  const dialog =
    document.getElementById(
      "deleteDialog"
    );

  const cancelBtn =
    document.getElementById(
      "cancelDeleteBtn"
    );

  const confirmBtn =
    document.getElementById(
      "confirmDeleteBtn"
    );

  const closeDialog =
    () => dialog.remove();

  cancelBtn.addEventListener(
    "click",
    closeDialog
  );

  dialog.addEventListener(
    "click",
    e => {
      if (
        e.target === dialog
      ) {
        closeDialog();
      }
    }
  );

  confirmBtn.addEventListener(
    "click",
    async () => {

      confirmBtn.disabled =
        true;

      confirmBtn.textContent =
        "Deleting...";

      try {

        const response =
          await fetch(
            `/api/links/${urlId}`,
            {
              method:
                "DELETE",
              credentials:
                "include"
            }
          );

        const data =
          await response.json();

        if (
          response.ok
        ) {

          showToast(
  "Link deleted successfully",
  "The link has been removed.",
  "success"
);

          allLinks =
            allLinks.filter(
              link =>
                link.id !=
                urlId
            );

          applyFiltersSortingAndSearch();

          closeDialog();

        } else {

          showToast(
            data.message ||
            "Failed to delete link"
          );

          closeDialog();
        }

      } catch (
        error
      ) {

        console.error(
          "Delete Error:",
          error
        );

        showToast(
  "Something went wrong",
  "Please try again.",
  "error"
);

        closeDialog();
      }
    }
  );
}
window.deleteLink = deleteLink;

if (searchInput && clearButton) {
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() !== "") {
      clearButton.classList.add("show");
    } else {
      clearButton.classList.remove("show");
    }

    applyFiltersSortingAndSearch();
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    clearButton.classList.remove("show");

    applyFiltersSortingAndSearch();
    searchInput.focus();
  });
}

if(clearButton){
  clearButton.addEventListener("click", () => {

    searchInput.value = "";

    clearButton.classList.remove("show");

    applyFiltersSortingAndSearch();

    searchInput.focus();
});
}

function downloadQR(url) {
  const encodedUrl = encodeURIComponent(url);

  const link = document.createElement("a");

  link.href = `/api/qr?url=${encodedUrl}`;
  link.download = "qrcode.png";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(
    "QR code downloaded",
    "The QR code image has been saved.",
    "success"
  );
}
if(document.getElementById("expiry")){
    const expirySelect = document.getElementById("expiry");
const hiddenDate = document.getElementById("hiddenDate");

expirySelect.addEventListener("change", () => {
  if (expirySelect.value === "custom") {

    // Open native date picker
    hiddenDate.showPicker();

    // fallback for some browsers
    hiddenDate.click();
  }
});

// Capture selected date
hiddenDate.addEventListener("change", () => {
  const selectedDate = hiddenDate.value;

  console.log("Selected Date:", selectedDate);

  // Example:
  // store in variable
  // send to backend
  // show selected date in UI

  expirySelect.innerHTML += `
    <option value="selected" selected>
      ${selectedDate}
    </option>
  `;
});
}

if (document.getElementById("customAlias")) {

    const aliasInput =
      document.getElementById("customAlias");

    const previewLink =
      document.getElementById("previewLink");

    const baseUrl =
      window.location.origin + "/";

    // Initial preview
    previewLink.textContent =
      baseUrl + "my-link";

    // Live update
    aliasInput.addEventListener("input", () => {

        const alias =
          aliasInput.value.trim();

        previewLink.textContent =
          alias === ""
            ? baseUrl + "abc123"
            : baseUrl + alias;
    });
}

var closeButtons =
  document.querySelectorAll(
    ".close_maker"
  );

if (closeButtons.length) {

  closeButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelector(
            ".centralize_maker"
          )
          ?.style.setProperty(
            "display",
            "none"
          );
      }
    );

  });
}

if(document.querySelector(".link_maker_2")){
    const confirmBtn =
  document.querySelector(".link_maker_2");

confirmBtn.addEventListener("click", async () => {

  const originalUrl =
    document.getElementById("longUrl")
      .value
      .trim();

  const customAlias =
    document.getElementById("customAlias")
      .value
      .trim();

  const expiry =
    document.getElementById("expiry")
      .value;

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

    // Show loader
    

    const response = await fetch(
      "/api/links",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          originalUrl,
          customAlias,
          expiry
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      showToast(
        "Error",
        data.message ||
        "Failed to create link",
        "error"
      );
      return;
    }

    showToast(
      "Success",
  "Short link created successfully",
  "success"
);

// refresh dashboard immediately
await getLinksFromAPI();

// reset inputs
document.getElementById(
  "longUrl"
).value = "";

document.getElementById(
  "customAlias"
).value = "";

document.getElementById(
  "expiry"
).value = "never";

// reset preview
document.getElementById(
  "previewLink"
).textContent =
  window.location.origin + "/abc123";

// optional: close modal
document.querySelector(
  ".centralize_maker"
).style.display = "none";

    // optional
    // fetchLinks();
    // closeDialog();

  } catch (error) {

    console.error(
      "Create link error:",
      error
    );

    showToast(
      "Error",
      "Something went wrong. Please try again.",
      "error"
    );

  } finally {

    // Hide loader always
    ;
  }
});
}









window.showMoreRecentActivity = showMoreRecentActivity;


function showMoreRecentActivity() {

  const total =
    recentActivityData.length;

  const reachedEnd =
    recentActivityVisibleCount >= total;

  if (reachedEnd) {

    // collapse instantly
    recentActivityVisibleCount =
      DEFAULT_VISIBLE;

  } else {

    // expand by +3
    recentActivityVisibleCount =
      Math.min(
        recentActivityVisibleCount +
        LOAD_MORE_STEP,
        total
      );
  }

  renderRecentActivity();
}

function renderRecentActivity() {
  const container = document.getElementById("recentActivityContainer");
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

  const visibleItems = recentActivityData.slice(
    0,
    recentActivityVisibleCount
  );

  visibleItems.forEach((activity) => {
    const countryCode = (activity.country || "XX").toUpperCase();
    const countryName = countryNames[countryCode] || countryCode;

    const flag =
      countryCode !== "XX"
        ? `<span class="fi fi-${countryCode.toLowerCase()}"></span>`
        : `<span>🌍</span>`;

    container.innerHTML += `
      <div class="activity-card">
        <div class="activity-header">
          ${flag}
          <span>
            ${countryName} clicked 
<button
  type="button"
  class="analytics-short-link-btn"
  onclick="openAnalyticsByShortCode(event, '${activity.shortCode}')"
>
  /${activity.shortCode || "unknown"}
</button>
          </span>
        </div>

        <div class="activity-meta">
          ${activity.browser || "Unknown"}
          •
          ${activity.device || "Unknown"}
          •
          ${activity.trafficSource || "Direct"}
        </div>

        <div class="activity-time">
          ${
            activity.clickedAt
              ? new Date(activity.clickedAt).toLocaleString()
              : "Unknown time"
          }
        </div>
      </div>
    `;
  });

if (recentActivityData.length > 3) {

  const reachedEnd =
    recentActivityVisibleCount >=
    recentActivityData.length;

  container.innerHTML += `
    <button
      type="button"
      class="show-more-activity inter-bold"
      onclick="showMoreRecentActivity()"
    >
      ${
        reachedEnd
          ? "Show less"
          : "Show more"
      }

      <span class="material-symbols-outlined">
        ${
          reachedEnd
            ? "keyboard_arrow_up"
            : "keyboard_arrow_down"
        }
      </span>
    </button>
  `;
}}
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
function safelyDestroyWorldMap() {
  if (!window.worldMapInstance) return;

  try {
    window.worldMapInstance.destroy();
  } catch (error) {
    console.warn("World map destroy skipped:", error);
  }

  window.worldMapInstance = null;

  const mapElement = document.getElementById("worldMap");

  if (mapElement) {
    mapElement.innerHTML = "";
  }
}
function renderWorldMap(topRegions, totalClicks) {
  const mapElement = document.getElementById("worldMap");
  const mapLoader = document.getElementById("mapLoader");
  const mapTitle = document.querySelector(".ga-tag");
  const mapWrapper = document.querySelector(".map-wrapper");
  const mapContainer = document.querySelector(".map-chart-skeleton");

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
    const code = String(region.country || "").toUpperCase();
    const clicks = Number(region.clicks || region.totalClicks || 0);

    if (code && clicks > 0) {
      regionData[code] = 1;
      regionClicks[code] = clicks;
    }
  });

  const topRegion = topRegions[0];

  if (topRegion && typeof topRegionStat !== "undefined" && topRegionStat) {
    const countryCode = String(topRegion.country || "").toLowerCase();
    const countryName = getCountryName(topRegion.country);
    const clicks = Number(topRegion.clicks || topRegion.totalClicks || 0);

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
        const countryCode = String(code).toUpperCase();
        const clicks = Number(regionClicks[countryCode] || 0);
        const countryName = getCountryName(countryCode);

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

  if (mapTitle) {
    mapTitle.classList.remove("skeleton-top-regions");
  }

  if (mapContainer) {
    mapContainer.classList.remove("map-chart-skeleton");
  }

  mapElement.style.opacity = "1";
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
        ${emptyMessage}
      </div>
    `;
    return;
  }

  container.innerHTML = validItems.map((item, index) => {
    const percentage = Math.min(
      Math.max(parseFloat(item.percentage) || 0, 0),
      100
    );

    const clicks = Number(item.clicks || 0);

    const singularText =
      clickLabel === "visits"
        ? "visit"
        : "click";

    const pluralText =
      clickLabel === "visits"
        ? "visits"
        : "clicks";

    const metricText =
      clicks === 1
        ? singularText
        : pluralText;

    const fillId =
      `${labelKey}Fill${index + 1}`;

    return `
      <div class="wrap_inner">
        <div>

          <div class="metric-label-row">
            <span>
              ${item[labelKey] || "Unknown"}
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
        document.getElementById(
          `${labelKey}Fill${index + 1}`
        );

      if (fill) {
        fill.style.width =
          `${percentage}%`;
      }
    });
  });
}

function showClickChartSkeleton() {
  const chartSkeletonContainer =
    document.getElementById("chartSkeletonContainer");

  const chartRangeLoader =
    document.getElementById("chartRangeLoader");

  const chartCanvas =
    document.getElementById("clickChart2");

  if (chartSkeletonContainer) {
    chartSkeletonContainer.classList.add(
      "analytics-chart-skeleton"
    );
  }

  if (chartRangeLoader) {
    chartRangeLoader.style.display = "flex";
    chartRangeLoader.classList.add(
      "skeleton-graph-cover"
    );
  }

  if (chartCanvas) {
    chartCanvas.style.opacity = "0";
  }
}
function hideClickChartSkeleton() {
  const chartSkeletonContainer =
    document.getElementById("chartSkeletonContainer");

  const chartRangeLoader =
    document.getElementById("chartRangeLoader");

  const chartCanvas =
    document.getElementById("clickChart2");

  if (chartSkeletonContainer) {
    chartSkeletonContainer.classList.remove(
      "analytics-chart-skeleton"
    );
  }

  if (chartRangeLoader) {
    chartRangeLoader.style.display = "none";
    chartRangeLoader.classList.remove(
      "skeleton-graph-cover"
    );
  }

  if (chartCanvas) {
    chartCanvas.style.opacity = "1";
  }
}
function showAnalyticsSkeletons() {
  const textSkeletons = [
    ["analyticsTitle", "120px", "36px"],
    ["analyticsLastUpdated", "110px", "18px"],
    ["analyticsModeLabel", "150px", "18px"],
    ["totalClicks", "70px", "34px"],
    ["uniqueVisitors", "90px", "34px"],
    ["avgRedirectTime", "95px", "34px"],
    ["regionName", "120px", "34px"],
    ["chartTitle", "180px", "28px"]
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

  const syncBtn = document.querySelector(".analytics-sync-btn");

  if (syncBtn) {
    syncBtn.classList.add("analytics-sync-loading");
    syncBtn.disabled = true;
  }

  const backBtn = document.getElementById("backToOverallAnalyticsBtn");

  if (backBtn && !backBtn.hidden) {
    backBtn.classList.add("analytics-btn-loading");
    backBtn.disabled = true;
  }

  const labelSkeletons = [
    ...document.querySelectorAll(
      "#analyticsSection .stat-card h4, #analyticsSection .region_card > h3"
    )
  ];

  labelSkeletons.forEach(label => {
    label.style.setProperty("--analytics-skeleton-width", "140px");
    label.style.setProperty("--analytics-skeleton-height", "22px");
    label.classList.add("analytics-text-loading");
  });

  const regionFlag = document.getElementById("regionFlag");

  if (regionFlag) {
    regionFlag.innerHTML = "";
    regionFlag.style.setProperty("--analytics-skeleton-width", "42px");
    regionFlag.style.setProperty("--analytics-skeleton-height", "34px");
    regionFlag.className = "analytics-text-loading";
  }

  const geographicAnalyticsTitle = document.querySelector(".ga-tag");

  if (geographicAnalyticsTitle) {
    geographicAnalyticsTitle.style.setProperty("--analytics-skeleton-width", "210px");
    geographicAnalyticsTitle.style.setProperty("--analytics-skeleton-height", "28px");
    geographicAnalyticsTitle.classList.add("analytics-text-loading");
  }

  document.getElementById("chartSkeletonContainer")
    ?.classList.add("analytics-chart-skeleton");

  const chartRangeLoader = document.getElementById("chartRangeLoader");
  if (chartRangeLoader) {
    chartRangeLoader.style.display = "flex";
    chartRangeLoader.classList.add("skeleton-graph-cover");
  }

  const chartCanvas = document.getElementById("clickChart2");
  if (chartCanvas) chartCanvas.style.opacity = "0";

  const dropdownSkeleton = document.getElementById("dropdownSkeleton");
  if (dropdownSkeleton) {
    dropdownSkeleton.removeAttribute("hidden");
    dropdownSkeleton.classList.remove("hidden");
    dropdownSkeleton.style.display = "block";
  }

  document.getElementById("analyticsRange")?.setAttribute("hidden", true);

  document.querySelector(".map-wrapper")?.classList.add("map-chart-skeleton");

  const mapLoader = document.getElementById("mapLoader");
  if (mapLoader) {
    mapLoader.style.display = "flex";
    mapLoader.classList.add("skeleton-map-cover");
  }

  const worldMap = document.getElementById("worldMap");
  if (worldMap) {
    worldMap.innerHTML = "";
    worldMap.style.opacity = "0";
  }

  safelyDestroyWorldMap();

  const skeletonContainers = [
    ["trafficSourcesContainer", getAnalyticsBarsSkeleton],
    ["browserAnalyticsContainer", getAnalyticsBarsSkeleton],
    ["osAnalyticsContainer", getAnalyticsBarsSkeleton],
    ["topLinksContainer", getTopLinksSkeleton],
    ["recentActivityContainer", getRecentActivitySkeleton]
  ];

  skeletonContainers.forEach(([id, skeletonFunction]) => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = skeletonFunction();
  });
}
function hideAnalyticsSkeletons() {
  const analyticsSection = document.getElementById("analyticsSection");
  if (!analyticsSection) return;

  const skeletonClasses = [
    "analytics-text-loading",
    "skeleton-text",
    "skeleton-ms",
    "skeleton-flag",
    "skeleton-label",
    "skeleton-title",
    "skeleton-top-regions",
    "skeleton-graph-cover",
    "skeleton-map-cover",
    "map-chart-skeleton",
    "analytics-chart-skeleton",
    "analytics-sync-loading",
    "analytics-btn-loading"
  ];

  analyticsSection.querySelectorAll("*").forEach(el => {
    el.classList.remove(...skeletonClasses);
    el.style.removeProperty("--analytics-skeleton-width");
    el.style.removeProperty("--analytics-skeleton-height");
  });

  const analyticsTitle = document.getElementById("analyticsTitle");

if (analyticsTitle) {
  analyticsTitle.textContent =
    window.currentAnalyticsMode === "single"
      ? "Link Analytics"
      : "Overview";
}

  const syncBtn = document.querySelector(".analytics-sync-btn");
  if (syncBtn) syncBtn.disabled = false;

  const backBtn = document.getElementById("backToOverallAnalyticsBtn");
  if (backBtn) backBtn.disabled = false;

  ["chartRangeLoader", "mapLoader", "dropdownSkeleton"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.style.display = "none";
    el.setAttribute("hidden", true);
  });

  ["clickChart2", "worldMap"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = "1";
  });

  document.getElementById("analyticsRange")?.removeAttribute("hidden");

  const chartTitle = document.getElementById("chartTitle");

if (chartTitle) {
  chartTitle.textContent = "Click Analytics";
}

}
function renderTopLinks(data, totalClicks) {
  const topLinksContainer =
    document.getElementById("topLinksContainer");

  if (!topLinksContainer) return;

  topLinksContainer.innerHTML = "";

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
    .map((link, index) => `
      <div class="top-link-card">
        <div class="top-link-rank">
          #${index + 1}
        </div>

        <div class="top-link-content">
          <div class="top-link-short">
            <button
  type="button"
  class="analytics-short-link-btn"
  onclick="openAnalyticsByShortCode(event, '${link.shortCode}')"
>
  /${link.shortCode}
</button>
          </div>

          <div class="top-link-original" title="${link.originalUrl}">
            ${link.originalUrl}
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
    `)
    .join("");
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
async function loadAnalytics(
  fullReload = true,
  silent = false,
  requestId = null,
  showSuccessToast = false
) {
  setSyncButtonState(analyticsSyncBtn, true);   
  setSectionSyncing("analyticsSection", true);
   let analyticsUpdatedSuccessfully = false;

  if (fullReload && !silent && !analyticsLoadedOnce) {
  showAnalyticsSkeletons();
}

  if (!silent) {
    lockSectionSwitching();
  }

  const loaderStartTime = Date.now();
  const minimumLoaderTime = 600;

  const chartRangeLoader =
    document.getElementById("chartRangeLoader");

  const chartCanvas =
    document.getElementById("clickChart2");

  try {
    const selectedRange =
      document.getElementById("analyticsRange")?.value || "30";

    loadAnalytics.currentRange = selectedRange;
if (requestId !== null && analyticsLoadedOnce) {
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

    let data = null;

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
if (requestId !== null && requestId !== chartRangeRequestId) {
  return;
}

updateAnalyticsModeUI(data);

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

    if (fullReload) {
      renderWorldMapWhenVisible(
        data?.topRegions || [],
        totalClicks
      );


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
          regionFlag.className = "";
          regionFlag.innerHTML =
            `<span class="fi fi-${topCode.toLowerCase()}"></span>`;
        }

        if (regionName) {
          regionName.textContent = countryName;
          regionName.title = countryName;
        }
      } else {
        if (regionFlag) {
          regionFlag.className = "material-symbols-outlined";
          regionFlag.textContent = "public";
        }

        if (regionName) {
          regionName.textContent = "No data";
          regionName.title = "No data";
        }
      }

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

      recentActivityData =
        Array.isArray(data?.recentActivity)
          ? data.recentActivity
          : [];

      recentActivityVisibleCount = 3;
      recentActivityExpanded = false;

      renderRecentActivity();
    }

    if (
  requestId === null ||
  requestId === chartRangeRequestId
) {
  renderClickAnalyticsChart(data, selectedRange);
}
    analyticsUpdatedSuccessfully = true;
    liveClickCount = 0;

   } catch (error) {
  console.error(
    "Analytics fetch error:",
    error
  );

  // First load failed
  if (!analyticsLoadedOnce) {

    hideAnalyticsSkeletons();
    hideClickChartSkeleton();

    showCardError("totalClicks");
    showCardError("uniqueVisitors");
    showCardError("avgRedirectTime");

    showTopRegionError();

    showListError(
      "trafficSourcesContainer",
      "No network connection"
    );

    showListError(
      "browserAnalyticsContainer",
      "No network connection"
    );

    showListError(
      "osAnalyticsContainer",
      "No network connection"
    );

    showListError(
      "topLinksContainer",
      "No network connection"
    );

    showListError(
      "recentActivityContainer",
      "No network connection"
    );

    showMapError(
      "No network connection"
    );

    showClickChartError(
      "No network connection"
    );
  }

  // Already loaded once
  else {
    console.warn(
      "Refresh failed — keeping previous analytics"
    );
  }

  if (!silent) {
    showToast(
      "Unable to refresh analytics",
      "Please check your internet connection.",
      "error"
    );
  }
} finally {
  setSyncButtonState(analyticsSyncBtn, false);
  setSectionSyncing("analyticsSection", false);
  
    const elapsedTime =
      Date.now() - loaderStartTime;

    const remainingTime =
      Math.max(minimumLoaderTime - elapsedTime, 0);
    
const delay = analyticsLoadedOnce ? 150 : remainingTime;
await new Promise(resolve => setTimeout(resolve, delay));

requestAnimationFrame(() => {
  if (analyticsUpdatedSuccessfully) {
  requestAnimationFrame(() => {
    if (fullReload && !silent) {
  hideAnalyticsSkeletons();
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

    if (requestId !== null) {
  if (chartCanvas) {
    chartCanvas.style.opacity = "1";
  }

  if (chartRangeLoader) {
    chartRangeLoader.style.display = "none";
  }
}
  }

  if (!silent) {
    unlockSectionSwitching();
  }
});
  }



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
  const regionFlag = document.getElementById("regionFlag");
  const regionName = document.getElementById("regionName");

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
    <div class="empty-analytics">${message}</div>
  `;
}

function showMapError(message = "Failed to load geographic analytics") {
  const worldMap = document.getElementById("worldMap");
  if (!worldMap) return;

  worldMap.innerHTML = `
    <div class="empty-analytics map-empty-state">
      ${message}
    </div>
  `;

  worldMap.style.opacity = "1";
}

function showClickChartError(message = "No click analytics available") {
  const canvas = document.getElementById("clickChart2");
  if (!canvas) return;

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
document.addEventListener("DOMContentLoaded", () => {
  const analyticsRange =
    document.getElementById("analyticsRange");

  if (analyticsRange) {
  analyticsRange.addEventListener("change", async () => {
  if (isChartRangeUpdating) return;

  isChartRangeUpdating = true;
  analyticsRange.disabled = true;

  const requestId = ++chartRangeRequestId;

  showClickChartSkeleton();

  try {
    await loadAnalytics(false, true, requestId);

    await new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );

  } finally {
    if (requestId === chartRangeRequestId) {
      hideClickChartSkeleton();
      analyticsRange.disabled = false;
      isChartRangeUpdating = false;
    }
  }
});
}

  /* keep your navBoxes code below this */
});

loadAnalytics(true, false, null, false);
loadSettings();
  



if (logoutBtn) {
  logoutBtn.addEventListener(
    "click",
    logout
  );
}

async function logout() {
  try {
    const response = await fetch(
      "/api/auth/logout",
      {
        method: "POST",
        credentials: "include"
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      showToast(
        "Error",
        data.message ||
        "Failed to logout",
        "error"
      );
      return;
    }

    showToast(
      "Success",
      "You have been logged out.",
      "success"
    );

    window.location.href =
      "/pages/login";

  } catch (error) {
    console.error(
      "Logout Error:",
      error
    );

    showToast(
      "Error",
      "Something went wrong. Please try again.",
      "error"
    );
  }
}
/*
<div class="flex-20-col">
   <div class="region_card balsamiq-sans-bold white">
      <h2 class="balsamiq-sans-bold white skeleton-label">Device Breakdown</h2>

      <div class="device-chart-box">
        <canvas id="deviceChart"></canvas>
      </div>

      <div id="deviceLegend" class="device-legend"></div>
    </div>
  </div>
*/


function getAnalyticsBarsSkeleton() {
  return `
    <div class="analytics-skeleton">

      <div class="metric-row-skeleton">
        <div class="metric-header-skeleton">
          <div class="skeleton-bar skeleton-short"></div>
          <div class="skeleton-bar skeleton-mini"></div>
        </div>
        <div class="skeleton-progress"></div>
      </div>

      <div class="metric-row-skeleton">
        <div class="metric-header-skeleton">
          <div class="skeleton-bar skeleton-short"></div>
          <div class="skeleton-bar skeleton-mini"></div>
        </div>
        <div class="skeleton-progress"></div>
      </div>

      <div class="metric-row-skeleton">
        <div class="metric-header-skeleton">
          <div class="skeleton-bar skeleton-short"></div>
          <div class="skeleton-bar skeleton-mini"></div>
        </div>
        <div class="skeleton-progress"></div>
      </div>

    </div>
  `;
}
function getTopLinksSkeleton() {
  return `
    <div class="top-link-card">
      <div class="top-link-rank skeleton-rank"></div>

      <div class="top-link-content">
        <div class="top-link-short skeleton-bar skeleton-short-link"></div>

        <div class="top-link-original skeleton-bar skeleton-full-link"></div>
      </div>

      <div class="top-link-clicks">
        <div class="click-number skeleton-bar skeleton-mini"></div>

        <div class="click-label skeleton-bar skeleton-click-label"></div>
      </div>
    </div>

    <div class="top-link-card">
      <div class="top-link-rank skeleton-rank"></div>

      <div class="top-link-content">
        <div class="top-link-short skeleton-bar skeleton-short-link"></div>

        <div class="top-link-original skeleton-bar skeleton-full-link"></div>
      </div>

      <div class="top-link-clicks">
        <div class="click-number skeleton-bar skeleton-mini"></div>

        <div class="click-label skeleton-bar skeleton-click-label"></div>
      </div>
    </div>

    <div class="top-link-card">
      <div class="top-link-rank skeleton-rank"></div>

      <div class="top-link-content">
        <div class="top-link-short skeleton-bar skeleton-short-link"></div>

        <div class="top-link-original skeleton-bar skeleton-full-link"></div>
      </div>

      <div class="top-link-clicks">
        <div class="click-number skeleton-bar skeleton-mini"></div>

        <div class="click-label skeleton-bar skeleton-click-label"></div>
      </div>
    </div>
  `;
}
function getRecentActivitySkeleton() {
  return `
    <div class="recent-activity-skeleton">

      <div class="activity-item-skeleton">
        <div class="activity-content-skeleton">

          <div class="skeleton-bar skeleton-activity-title">
          </div>

          <div class="skeleton-bar skeleton-activity-subtitle">
          </div>

          <div class="skeleton-bar skeleton-activity-time">
          </div>

        </div>
      </div>

      <div class="activity-item-skeleton">
        <div class="activity-content-skeleton">

          <div class="skeleton-bar skeleton-activity-title">
          </div>

          <div class="skeleton-bar skeleton-activity-subtitle">
          </div>

          <div class="skeleton-bar skeleton-activity-time">
          </div>

        </div>
      </div>

      <div class="activity-item-skeleton">
        <div class="activity-content-skeleton">

          <div class="skeleton-bar skeleton-activity-title">
          </div>

          <div class="skeleton-bar skeleton-activity-subtitle">
          </div>

          <div class="skeleton-bar skeleton-activity-time">
          </div>

        </div>
      </div>

    </div>
  `;
}
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

  socket.on("connect_error", (err) => {
    console.log("Socket error:", err.message);
  });

  socket.on("liveClick", (data) => {
  liveClickCount++;

  refreshAnalyticsAfterLiveClick();

  if (!liveNotificationsEnabled) return;

  if (activeToast) {
    activeToast.remove();
  }

  activeToast = showToast(
    "Live click",
    `/${data.shortCode} was clicked • ${liveClickCount} new click${liveClickCount > 1 ? "s" : ""} since last sync`,
    "live"
  );
});
}

if (document.getElementById("analyticsSection")) {
  initializeSocket();
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

    await loadSettings();

    showToast(
      "Settings refreshed",
      "Your latest settings have been loaded.",
      "success"
    );
  });
}

function showDeleteDialog(linkId, shortCode) {

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

        <p id="deleteDialogText" class="inter-regular">
          Are you sure you want to delete
          <strong>${shortCode}</strong>?
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

  const dialog =
    document.getElementById("deleteDialog");

  const cancelBtn =
    document.getElementById(
      "cancelDeleteBtn"
    );

  const confirmBtn =
    document.getElementById(
      "confirmDeleteBtn"
    );

  const closeDialog = () => {
    dialog.remove();
  };

  cancelBtn.addEventListener(
    "click",
    closeDialog
  );

  dialog.addEventListener(
    "click",
    e => {
      if (e.target === dialog) {
        closeDialog();
      }
    }
  );

  confirmBtn.addEventListener(
    "click",
    async () => {

      confirmBtn.disabled = true;
      confirmBtn.textContent =
        "Deleting...";

      try {

        const res = await fetch(
          `/api/links/${linkId}`,
          {
            method: "DELETE",
            credentials: "include"
          }
        );

        const data =
          await res.json();

        if (!res.ok) {
          showToast(
  "Failed to delete link",
  "Please try again.",
  "error"
);

          closeDialog();
          return;
        }

        showToast(
          "Success",
          "Link deleted successfully",
          "success"
        );

        closeDialog();

        await loadLinks();

      } catch (err) {

        console.error(err);

        showToast(
          "Error",
          "Something went wrong",
          "error"
        );

        closeDialog();
      }
    }
  );
}
window.deleteLink = deleteLink;
document.addEventListener("click", function (event) {
  const deleteBtn = event.target.closest(".delete-link-btn");

  if (!deleteBtn) return;

  event.preventDefault();
  event.stopPropagation();

  console.log("Delete clicked");

  deleteLink(
    event,
    deleteBtn.dataset.id,
    deleteBtn.dataset.short
  );
});


function hideLinksSkeletons() {

  document
    .querySelectorAll(
      "#linksSection .skeleton-title, #linksSection .skeleton-label, #linksSection .skeleton-text"
    )
    .forEach(el => {
      el.classList.remove(
        "skeleton-title",
        "skeleton-label",
        "skeleton-text"
      );
    });

  /* remove stat card skeleton text */
  [
    "totalLinks",
    "activeLinks",
    "inactiveLinks",
    "expiredLinks"
  ].forEach(id => {
    document
      .getElementById(id)
      ?.classList.remove(
        "skeleton-text"
      );
  });

  /* clear table skeleton rows */
  const tableBody =
    document.getElementById(
      "linksTableBody"
    );

  if (tableBody) {
    tableBody.innerHTML = "";
  }

  document
    .getElementById(
      "linksControls"
    )
    ?.classList.remove(
      "links-controls-skeleton"
    );

  document
    .querySelector(
      "#linksSection .table-wrapper"
    )
    ?.classList.remove(
      "links-table-skeleton"
    );
}
function showLinksSkeletons() {
  const controls =
    document.getElementById("linksControls");

  const tableWrapper =
    document.querySelector(
      "#linksSection .table-wrapper"
    );

  const tableBody =
    document.getElementById(
      "linksTableBody"
    );

  const statItems = [
  "totalLinks",
  "activeLinks",
  "inactiveLinks",
  "expiredLinks"
];

statItems.forEach(id => {
  const value =
    document.getElementById(id);

  if (value) {
    value.textContent = "";
    value.classList.add(
      "skeleton-text"
    );
  }
});

  /* table body skeleton */
  if (tableBody) {
    tableBody.innerHTML = `
      ${Array(6).fill(`
        <tr class="table-skeleton-row">

          <td>
            <div class="skeleton-cell skeleton-short"></div>
          </td>

          <td>
            <div class="skeleton-cell skeleton-long"></div>
          </td>

          <td>
            <div class="skeleton-cell skeleton-mini"></div>
          </td>

          <td>
            <div class="skeleton-cell skeleton-status"></div>
          </td>

          <td>
            <div class="skeleton-cell skeleton-date"></div>
          </td>

          <td>
            <div class="skeleton-cell skeleton-date"></div>
          </td>

          <td>
            <div class="table-actions-skeleton">

              <div class="skeleton-icon-btn"></div>
              <div class="skeleton-icon-btn"></div>
              <div class="skeleton-icon-btn"></div>
              <div class="skeleton-icon-btn"></div>

            </div>
          </td>

        </tr>
      `).join("")}
    `;
  }

  tableWrapper?.classList.add(
    "links-table-skeleton"
  );
}
function hideLinksSkeletons() {
  document
    .querySelectorAll(
      "#linksSection .skeleton-title, #linksSection .skeleton-label, #linksSection .skeleton-text"
    )
    .forEach(el => {
      el.classList.remove(
        "skeleton-title",
        "skeleton-label",
        "skeleton-text"
      );
    });

  document
    .getElementById("linksControls")
    ?.classList.remove("links-controls-skeleton");

  document
    .querySelector("#linksSection .table-wrapper")
    ?.classList.remove("links-table-skeleton");
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

async function openLinkAnalytics(event, linkId) {
  event.stopPropagation();

  if (analyticsLoading) return;

  const selectedLink = allLinks.find(link => link.id == linkId);

  window.currentAnalyticsMode = "single";
  window.currentAnalyticsLinkId = linkId;

  setAnalyticsHeaderMode(
    "single",
    selectedLink
      ? { shortCode: selectedLink.shortLink.split("/").pop() }
      : null
  );

  document.querySelectorAll(".page_section").forEach(section => {
    section.classList.remove("active_section");
  });

  document.querySelectorAll(".nav_box").forEach(nav => {
    nav.classList.remove("active");
  });

  document.getElementById("analyticsSection")?.classList.add("active_section");
  document.querySelector('[data-section="analyticsSection"]')?.classList.add("active");

  analyticsLoading = true;

try {
  await loadAnalytics(true, false, null);
} finally {
  analyticsLoading = false;
}

  
}

window.openLinkAnalytics = openLinkAnalytics;

window.openLinkAnalytics = openLinkAnalytics;
function updateAnalyticsModeUI(data) {
  const backBtn =
    document.getElementById("backToOverallAnalyticsBtn");

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

    if (backBtn) {
      backBtn.hidden = false;
    }

    if (modeLabel && link) {
      modeLabel.innerHTML =
        `Viewing analytics for <strong>${link.shortCode}</strong>`;
    }

    if (topLinksCard) {
      topLinksCard.style.display = "none";
    }

    if (recentActivityTitle) {
      recentActivityTitle.textContent =
        "Recent Click Activity";
    }

  } else {
    if (backBtn) {
      backBtn.hidden = true;
    }

    if (modeLabel) {
      modeLabel.textContent = "";
    }

    if (topLinksCard) {
      topLinksCard.style.display = "flex";
    }

    if (recentActivityTitle) {
      recentActivityTitle.textContent =
        "Recent Activity Feed";
    }
  }
}
window.openLinkAnalytics = openLinkAnalytics;
function populateAnalyticsUI(data) {

  renderCards(data.cards);

  renderChart(
    data.clickAnalytics
  );

  renderWorldMap(
    data.topRegions
  );

  renderTrafficSources(
    data.trafficSources
  );

  renderBrowserAnalytics(
    data.browsers
  );

  renderOSAnalytics(
    data.operatingSystems
  );

  renderTopLinks(
    data.topLinks || []
  );

  renderRecentActivity(
    data.recentActivity
  );
}
function updateAnalyticsModeUI(data) {
  const modeLabel =
    document.getElementById("analyticsModeLabel");

  const backBtn =
    document.getElementById("backToOverallAnalyticsBtn");

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
        `| Viewing analytics for <strong>/${link.shortCode}</strong>`;
    }

    if (backBtn) {
      backBtn.hidden = false;
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

    if (backBtn) {
      backBtn.hidden = true;
    }

    if (topLinksCard) {
      topLinksCard.style.display = "flex";
    }

    if (recentActivityTitle) {
      recentActivityTitle.textContent =
        "Recent Activity Feed";
    }
  }
}

async function backToLinksSection() {
  window.currentAnalyticsMode = "overall";
  window.currentAnalyticsLinkId = null;

  setAnalyticsHeaderMode("overall");

  await switchDashboardSection("linksSection");
}

document
  .getElementById("backToOverallAnalyticsBtn")
  ?.addEventListener("click", backToLinksSection);

  function setAnalyticsHeaderMode(mode, link = null) {
  const backBtn =
    document.getElementById("backToOverallAnalyticsBtn");

  const lastUpdated =
    document.getElementById("analyticsLastUpdated");

  const modeLabel =
    document.getElementById("analyticsModeLabel");

  if (mode === "single") {
    if (backBtn) {
      backBtn.hidden = false;
    }

    showAnalyticsSkeletons();

    if (lastUpdated) {
      lastUpdated.textContent = "Loading link analytics...";
    }

    if (modeLabel) {
      modeLabel.innerHTML = link
        ? `Viewing analytics for <strong>/${link.shortCode}</strong>`
        : "Viewing single link analytics";
    }

    return;
  }

  if (backBtn) {
    backBtn.hidden = true;
  }

  if (modeLabel) {
    modeLabel.textContent = "";
  }

  if (lastUpdated) {
    lastUpdated.textContent = "Syncing...";
  }
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
function getShortCodeFromUrl(shortLink) {
  try {
    return new URL(shortLink).pathname.replace("/", "");
  } catch {
    return shortLink.split("/").pop();
  }
}

function showEditLinkDialog(link) {
  document.getElementById("editLinkDialog")?.remove();

  const shortCode =
    getShortCodeFromUrl(link.shortLink);

    const now = new Date();

let selectedExpiry = "never";
let customExpiryValue = "";

if (link.expiresAt) {
  const expiryDate =
    new Date(link.expiresAt);

  const diffMs =
    expiryDate - now;

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

    customExpiryValue =
      expiryDate
        .toISOString()
        .slice(0, 10);
  }
}

  const isActive =
    link.status === "Active";

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
            <span class="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <div class="edit-field">
          <label class="inter-bold" for="editOriginalUrl">
            Destination URL
          </label>

          <div class="edit-input-wrap">
            <span class="material-symbols-outlined">
              link
            </span>

            <input
              id="editOriginalUrl"
              class="inter-regular"
              type="text"
              value="${link.originalUrl}"
            >
          </div>
        </div>

        <div class="edit-field">
          <label class="inter-bold" for="editCustomAlias">
            Custom Alias
          </label>

          <div class="edit-input-wrap">
            <span class="material-symbols-outlined">
              alternate_email
            </span>

            <input
              id="editCustomAlias"
              class="inter-regular"
              type="text"
              value="${shortCode}"
            >
          </div>
        </div>

        <div class="edit-field">
          <label class="inter-bold" for="editExpiry">
            Expiry
          </label>

          <select
  id="editExpiry"
  class="edit-select inter-regular"
>
  <option
    value="never"
    ${selectedExpiry === "never"
      ? "selected"
      : ""}
  >
    Never Expire
  </option>

  <option
    value="1hour"
    ${selectedExpiry === "1hour"
      ? "selected"
      : ""}
  >
    1 Hour
  </option>

  <option
    value="12hours"
    ${selectedExpiry === "12hours"
      ? "selected"
      : ""}
  >
    12 Hours
  </option>

  <option
    value="1day"
    ${selectedExpiry === "1day"
      ? "selected"
      : ""}
  >
    1 Day
  </option>

  <option
    value="7days"
    ${selectedExpiry === "7days"
      ? "selected"
      : ""}
  >
    7 Days
  </option>

  <option
    value="30days"
    ${selectedExpiry === "30days"
      ? "selected"
      : ""}
  >
    30 Days
  </option>

  <option
    value="90days"
    ${selectedExpiry === "90days"
      ? "selected"
      : ""}
  >
    90 Days
  </option>

  <option
    value="custom"
    ${selectedExpiry === "custom"
      ? "selected"
      : ""}
  >
    Custom Date
  </option>
</select>

<input
  type="date"
  id="editCustomExpiry"
  style="
    display:
    ${selectedExpiry === "custom"
      ? "block"
      : "none"};
  "
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
            ${window.location.origin}/<span id="editPreviewCode">${shortCode}</span>
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

  const dialog =
    document.getElementById("editLinkDialog");

  const closeDialog = () => {
    dialog.remove();
  };

  const aliasInput =
    document.getElementById("editCustomAlias");

  const previewCode =
    document.getElementById("editPreviewCode");

  aliasInput.addEventListener("input", () => {
    previewCode.textContent =
      aliasInput.value.trim() || "abc123";
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
    document.getElementById("editOriginalUrl")
      .value
      .trim();

  const customAlias =
    document.getElementById("editCustomAlias")
      .value
      .trim();

  const expiry =
    document.getElementById("editExpiry")
      .value;

  const isActive =
    document.getElementById("editIsActive")
      .checked;

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

    const response = await fetch(
      `/api/links/${linkId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          originalUrl,
          customAlias,
          expiry,
          isActive
        })
      }
    );

    const data =
      await response.json();

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

document.addEventListener("click", event => {
  const editBtn =
    event.target.closest(".edit-link-btn");

  if (!editBtn) return;

  event.preventDefault();
  event.stopPropagation();

  const linkId =
    editBtn.dataset.id;

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
function renderClickAnalyticsChart(data, selectedRange) {
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

  const hasRealData = rawClicks.some(click => click > 0);

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

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          enabled: hasRealData,

          callbacks: {
            title(context) {
              const index = context[0].dataIndex;
              const item = analyticsData[index];

              if (!item?.day) return "No data";

              return formatTooltipDate(
                item.day,
                granularity
              );
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
    const quarter = Math.floor(date.getMonth() / 3) + 1;
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
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${year}`;
    }

    if (index === 0 || index === total - 1 || index % 30 === 0) {
      return `${day} ${month}`;
    }

    return "";
  }

  return `${day} ${month}`;
}
async function loadSettings() {
  const fullNameInput =
    document.getElementById("settingsFullName");

  const settingsAlreadyLoaded =
    fullNameInput &&
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

    if (!settingsAlreadyLoaded) {
      hideSettingsSkeletons();
    }

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
  const fullname =
    document.getElementById("settingsFullName").value.trim();

  const username =
    document.getElementById("settingsUsername").value.trim();

  if (!fullname || !username) {
    showToast(
      "Missing fields",
      "Full name and username are required.",
      "warning"
    );
    return;
  }

  try {
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

    const data =
      await response.json();

    if (!response.ok) {
      showToast(
        "Update failed",
        data.message || "Please try again.",
        "error"
      );
      return;
    }

    showToast(
      "Account updated",
      "Your profile has been saved.",
      "success"
    );

  } catch (error) {
    showToast(
      "Something went wrong",
      "Please try again.",
      "error"
    );
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
      "Please fill all password fields.",
      "warning"
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast(
      "Password mismatch",
      "New password and confirm password do not match.",
      "warning"
    );
    return;
  }

  try {
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

    const data =
      await response.json();

    if (!response.ok) {
      showToast(
        "Password update failed",
        data.message || "Please try again.",
        "error"
      );
      return;
    }

    ["currentPassword", "newPassword", "confirmNewPassword"]
      .forEach(id => {
        document.getElementById(id).value = "";
      });

    showToast(
      "Password updated",
      "Your password has been changed.",
      "success"
    );

  } catch {
    showToast(
      "Something went wrong",
      "Please try again.",
      "error"
    );
  }
}

async function savePreferences() {
  const defaultExpiry =
    document.getElementById("defaultExpiry").value;

  const liveNotifications =
    document.getElementById("liveNotifications").checked;

  const analyticsAutoRefresh =
    document.getElementById("analyticsAutoRefresh").checked;

  try {
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

    const data =
      await response.json();

    if (!response.ok) {
      showToast(
        "Preferences not saved",
        data.message || "Please try again.",
        "error"
      );
      return;
    }

    showToast(
      "Preferences saved",
      "Your default settings have been updated.",
      "success"
    );

    liveNotificationsEnabled =
  liveNotifications;

analyticsAutoRefreshEnabled =
  analyticsAutoRefresh;

if (analyticsAutoRefreshEnabled) {
  startAnalyticsAutoRefresh();
} else {
  stopAnalyticsAutoRefresh();
}

  } catch {
    showToast(
      "Something went wrong",
      "Please try again.",
      "error"
    );
  }
}

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

  [searcher, statusFilter, sortFilter].forEach(el => {
  if (!el) return;

  el.addEventListener("mousedown", e => {
    if (guardLinksLoading()) {
      e.preventDefault();
    }
  });

  el.addEventListener("focus", e => {
    if (guardLinksLoading()) {
      e.target.blur();
    }
  });
});


if (createLinkBtn) {
  createLinkBtn.addEventListener("click", e => {
    if (guardLinksLoading()) {
      e.preventDefault();
      return;
    }

    document.querySelector(".centralize_maker").style.display = "flex";
  });
}

function showSettingsSkeletons() {
  const textSkeletons = [
    // Settings page title
    ["settingsSectionTitle", "110px", "36px"],

    // Account
    ["accountSettingsTitle", "190px", "24px"],
    ["accountSettingsDesc", "245px", "14px"],
    ["fullNameLabel", "95px", "14px"],
    ["usernameLabel", "80px", "14px"],

    // Security
    ["securityTitle", "105px", "24px"],
    ["securityDesc", "230px", "14px"],
    ["currentPasswordLabel", "155px", "14px"],
    ["newPasswordLabel", "125px", "14px"],
    ["confirmPasswordLabel", "155px", "14px"],

    // Link Preferences
    ["linkPreferencesTitle", "185px", "24px"],
    ["linkPreferencesDesc", "255px", "14px"],
    ["defaultExpiryLabel", "120px", "14px"],
    ["liveNotificationLabel", "205px", "14px"],
    ["liveNotificationDesc", "275px", "13px"],
    ["autoRefreshLabel", "195px", "14px"],
    ["autoRefreshDesc", "220px", "13px"],

    // Privacy
    ["dataPrivacyTitle", "150px", "24px"],
    ["dataPrivacyDesc", "245px", "14px"],

    // Danger Zone
    ["dangerZoneTitle", "145px", "24px"],
    ["dangerZoneDesc", "290px", "14px"]
  ];

  textSkeletons.forEach(([id, width, height]) => {
    const el = document.getElementById(id);

    if (!el) return;

    el.style.setProperty(
      "--settings-skeleton-width",
      width
    );

    el.style.setProperty(
      "--settings-skeleton-height",
      height
    );

    el.classList.add(
      "settings-text-loading"
    );
  });
}

function hideSettingsSkeletons() {
  document
    .querySelectorAll(
      ".settings-text-loading"
    )
    .forEach(el => {
      el.classList.remove(
        "settings-text-loading"
      );

      el.style.removeProperty(
        "--settings-skeleton-width"
      );

      el.style.removeProperty(
        "--settings-skeleton-height"
      );
    });
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
      <span class="material-symbols-outlined map-empty-icon">public</span>

      <h4 class="inter-regular">
        Failed to load geographic analytics
      </h4>

      <p class="inter-regular">
      
      </p>
    </div>
  `;
}
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

    el.textContent = "";

    el.style.setProperty("--links-skeleton-width", width);
    el.style.setProperty("--links-skeleton-height", height);

    el.classList.add("links-text-loading");
  });

  const linksControls = document.getElementById("linksControls");

  if (linksControls) {
    linksControls.classList.add("links-controls-loading");
  }

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

document.addEventListener("DOMContentLoaded", () => {
  const navBoxes =
    document.querySelectorAll(
      ".nav_box[data-section]"
    );

  const sections =
    document.querySelectorAll(
      ".page_section"
    );

  navBoxes.forEach(nav => {
    nav.addEventListener(
      "click",
      async () => {

        if (activeSectionLoading) {
       
          return;
        }

        const targetSectionId =
          nav.dataset.section;

        if (!targetSectionId) return;

        navBoxes.forEach(box =>
          box.classList.remove("active")
        );

        nav.classList.add("active");

        sections.forEach(section =>
          section.classList.remove(
            "active_section"
          )
        );

        const targetSection =
          document.getElementById(
            targetSectionId
          );

        if (targetSection) {
          targetSection.classList.add(
            "active_section"
          );
        }

        if (
          targetSectionId ===
          "linksSection"
        ) {
          await getLinksFromAPI();
        }

        if (
          targetSectionId ===
          "analyticsSection"
        ) {
          if (
            !analyticsLoadedOnce ||
            analyticsNeedsRefresh
          ) {
            await loadAnalytics(
              true,
              true
            );

            analyticsNeedsRefresh =
              false;
          }

          renderWorldMapWhenVisible?.();
        }

        if (
          targetSectionId ===
          "settingsSection"
        ) {
          await loadSettings();
        }
      }
    );
  });
});
document.addEventListener("DOMContentLoaded", () => {


  if (!btn || !sidebar || !overlay) return;

  function openMenu() {
    sidebar.classList.add("mobile-open");
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => {
    sidebar.classList.contains("mobile-open")
      ? closeMenu()
      : openMenu();
  });

  overlay.addEventListener("click", closeMenu);

  document.querySelectorAll(".ds1 .nav_box").forEach(nav => {
    nav.addEventListener("click", closeMenu);
  });
});

btn.onclick = () => {
  sidebar.classList.toggle("mobile-open");
  overlay.classList.toggle("show");
};

overlay.onclick = () => {
  sidebar.classList.remove("mobile-open");
  overlay.classList.remove("show");
};
function setSyncButtonState(button, isSyncing) {
  if (!button) return;

  button.disabled = isSyncing;
  button.classList.toggle("syncing", isSyncing);
}
document
  .querySelectorAll(".nav_box[data-section]")
  .forEach(nav => {

    nav.addEventListener("click", async () => {
      if (activeSectionLoading) return;

      const targetSection =
        nav.dataset.section;

      const section =
        document.getElementById(
          targetSection
        );

      const isAlreadyActive =
        section?.classList.contains(
          "active_section"
        );

      if (isAlreadyActive) return;

      // remove active
      document
        .querySelectorAll(".section")
        .forEach(section => {
          section.classList.remove(
            "active_section"
          );
        });

      // activate target
      section?.classList.add(
        "active_section"
      );

      // SYNC TARGET SECTION
      try {
        lockSectionSwitching();

        if (
          targetSection ===
          "analyticsSection"
        ) {
          await loadAnalytics(
            true,
            false,
            null
          );
        }

        else if (
          targetSection ===
          "linksSection"
        ) {
          await getLinksFromAPI();
        }

        else if (
          targetSection ===
          "settingsSection"
        ) {
          await loadSettings();
        }

      } finally {
        unlockSectionSwitching();
      }
    });
  });
  document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".ds1");
  const overlay = document.getElementById("mobileMenuOverlay");

  if (!btn || !sidebar || !overlay) return;

  btn.addEventListener("click", () => {
    sidebar.classList.add("mobile-open");
    overlay.classList.add("show");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("show");
  });

  document.querySelectorAll(".nav_box").forEach(nav => {
    nav.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      overlay.classList.remove("show");
    });
  });
});
async function switchDashboardSection(targetSection) {
  if (activeSectionLoading) return;

  const targetNav = document.querySelector(
    `.nav_box[data-section="${targetSection}"]`
  );

  const targetEl = document.getElementById(targetSection);

  if (!targetEl || !targetNav) return;

  document.querySelectorAll(".nav_box[data-section]").forEach(nav => {
    nav.classList.remove("active");
  });

  targetNav.classList.add("active");

  document.querySelectorAll(".page_section").forEach(section => {
    section.classList.remove("active_section");
  });

  targetEl.classList.add("active_section");

  try {
    lockSectionSwitching();

    if (targetSection === "analyticsSection") {
      await loadAnalytics(true, false, null);
    } else if (targetSection === "linksSection") {
      await getLinksFromAPI();
    } else if (targetSection === "settingsSection") {
      await loadSettings();
    }
  } finally {
    unlockSectionSwitching();
  }
}
function setSectionSyncing(sectionId, isSyncing) {
  const section = document.getElementById(sectionId);

  if (!section) return;

  section.classList.toggle(
    "section-syncing",
    isSyncing
  );
}
class HistoryNode {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.prev = null;
  }
}

let currentSectionId = "analyticsSection";
let historyTop = null;

function updateBackButtons() {
  document.querySelectorAll(".section-back-btn").forEach(btn => {
    btn.style.display = historyTop ? "flex" : "none";
  });
}

function pushHistory(sectionId) {
  const node = new HistoryNode(sectionId);
  node.prev = historyTop;
  historyTop = node;

  updateBackButtons();
}

function switchSection(newSectionId) {
  if (newSectionId === currentSectionId) return;

  pushHistory(currentSectionId);

  showSection(newSectionId);

  currentSectionId = newSectionId;

  updateBackButtons();
}

function goBackSection() {
  if (!historyTop) return;

  const previousSectionId = historyTop.sectionId;

  historyTop = historyTop.prev;

  showSection(previousSectionId);

  currentSectionId = previousSectionId;

  updateBackButtons();
}

function showSection(sectionId) {
  document.querySelectorAll(".page_section").forEach(section => {
    section.classList.remove("active_section");
  });

  document.querySelectorAll(".nav_box").forEach(nav => {
    nav.classList.remove("active");
  });

  document.getElementById(sectionId)?.classList.add("active_section");

  document
    .querySelector(`.nav_box[data-section="${sectionId}"]`)
    ?.classList.add("active");
}

document.querySelectorAll(".nav_box[data-section]").forEach(nav => {
  nav.addEventListener("click", () => {
    switchSection(nav.dataset.section);
  });
});

updateBackButtons();

window.goBackSection = goBackSection;
window.switchSection = switchSection;
window.openAnalyticsByShortCode = async function (event, shortCode) {
  event.preventDefault();
  event.stopPropagation();

  if (!shortCode || shortCode === "unknown") {
    return;
  }

  const cleanShortCode = shortCode.replace("/", "");

  const selectedLink = allLinks.find(link => {
    const linkCode = getShortCodeFromUrl(link.shortLink);
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
async function apiFetch(
  url,
  options = {}
) {
  const response =
    await fetch(url, {
      credentials:
        "include",
      ...options
    });

  if (
    response.status === 401
  ) {
    showToast(
      "Session expired",
      "Please login again",
      "info"
    );

    setTimeout(() => {
      window.location.replace(
        "/pages/login"
      );
    }, 500);

    throw new Error(
      "Unauthorized"
    );
  }

  return response;
}
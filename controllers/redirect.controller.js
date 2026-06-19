const { pool } = require("../config/db");
const redisClient = require("../config/redis");
const path = require("path");
const fs = require("fs");

const {
  getCacheKey,
  cacheUrl
} = require("../services/cache.service");

const {
  recordClick
} = require("../services/clickTracking.service");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStatusPage(fileName, shortCode) {
  const filePath = path.join(
    process.cwd(),
    "public",
    "pages",
    fileName
  );

  let html = fs.readFileSync(filePath, "utf8");

  const safeShortCode = escapeHtml(shortCode);

  html = html.replace(
    "</body>",
    `
      <script>
        const requestedLinkBox = document.getElementById("requestedLinkBox");
        const requestedShortCode = document.getElementById("requestedShortCode");

        if (requestedLinkBox && requestedShortCode) {
          requestedShortCode.textContent = "/${safeShortCode}";
          requestedLinkBox.style.display = "flex";
        }
      </script>
    </body>`
  );

  return html;
}

async function redirectToOriginalUrl(req, res) {
  const startTime = performance.now();
  const clickedAt = new Date();

  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res
        .status(404)
        .send(renderStatusPage("link-not-found.html", ""));
    }

    let url = null;

    try {
      const cached = await redisClient.get(
        getCacheKey(shortCode)
      );

      if (cached) {
        try {
          url =
            typeof cached === "string"
              ? JSON.parse(cached)
              : cached;
        } catch (parseError) {
          console.error(
            "Redis Parse Error:",
            parseError
          );
        }
      }
    } catch (redisError) {
      console.error(
        "Redis Connection Error:",
        redisError
      );
    }

    if (!url) {
      const result = await pool.query(
        `
        SELECT
          id,
          user_id,
          original_url,
          short_code,
          is_active,
          expires_at
        FROM urls
        WHERE short_code = $1
        `,
        [shortCode]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .send(
            renderStatusPage(
              "link-not-found.html",
              shortCode
            )
          );
      }

      url = result.rows[0];

      cacheUrl(shortCode, url).catch(err => {
        console.error("Cache Error:", err);
      });
    }

    if (!url.is_active) {
      return res
        .status(410)
        .send(
          renderStatusPage(
            "link-inactive.html",
            shortCode
          )
        );
    }

    if (
      url.expires_at &&
      new Date(url.expires_at) < new Date()
    ) {
      return res
        .status(410)
        .send(
          renderStatusPage(
            "link-expired.html",
            shortCode
          )
        );
    }

    const redirectTimeMs = Math.round(
      performance.now() - startTime
    );

    res.redirect(302, url.original_url);

    setImmediate(async () => {
      try {
        await recordClick(
          url,
          req,
          redirectTimeMs,
          clickedAt
        );

        const io = req.app.get("io");

        if (io) {
          io.to(`user:${url.user_id}`).emit(
            "liveClick",
            {
              urlId: url.id,
              shortCode:
                url.short_code || shortCode,
              originalUrl:
                url.original_url,
              clickedAt,
              redirectTimeMs
            }
          );
        }
      } catch (error) {
        console.error(
          "Analytics Error:",
          error
        );
      }
    });

  } catch (error) {
    console.error(
      "Redirect Error:",
      error
    );

    if (!res.headersSent) {
      return res
        .status(500)
        .send("Internal Server Error");
    }
  }
}

module.exports = {
  redirectToOriginalUrl
};
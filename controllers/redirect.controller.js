const { pool } = require("../config/db");
const redisClient = require("../config/redis");

const {
  getCacheKey,
  cacheUrl
} = require("../services/cache.service");

const {
  recordClick
} = require("../services/clickTracking.service");

async function redirectToOriginalUrl(req, res) {
  try {
    const { shortCode } = req.params;

    const startTime = performance.now();
    const clickedAt = new Date();

    let url = null;

    // ------------------------
    // REDIS CACHE LOOKUP
    // ------------------------

    const cached = await redisClient.get(
      getCacheKey(shortCode)
    );

    if (cached) {
      url =
        typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
    }

    // ------------------------
    // POSTGRES FALLBACK
    // ------------------------

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
        return res.status(404).send("Link not found");
      }

      url = result.rows[0];

      await cacheUrl(shortCode, url);
    }

    // ------------------------
    // LINK VALIDATION
    // ------------------------

    if (!url.is_active) {
      return res.status(410).send("This link is inactive");
    }

    if (
      url.expires_at &&
      new Date(url.expires_at) < new Date()
    ) {
      return res.status(410).send("This link has expired");
    }

    // ------------------------
    // ANALYTICS
    // ------------------------

    const redirectTimeMs = Math.round(
      performance.now() - startTime
    );

    recordClick(
      url,
      req,
      redirectTimeMs,
      clickedAt
    ).catch(error => {
      console.error("Analytics Error:", error);
    });

    // ------------------------
    // LIVE SOCKET NOTIFICATION
    // ------------------------

    const io = req.app.get("io");

if (io) {
  const shortCodeValue =
    url.short_code || url.shortCode || shortCode;

  io.to(`user:${url.user_id}`).emit("liveClick", {
    urlId: url.id,
    shortCode: shortCodeValue,
    originalUrl: url.original_url || url.originalUrl,
    clickedAt,
    redirectTimeMs
  });
}

    // ------------------------
    // REDIRECT
    // ------------------------

    return res.redirect(302, url.original_url);

  } catch (error) {
    console.error("Redirect Error:", error);

    return res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  redirectToOriginalUrl
};
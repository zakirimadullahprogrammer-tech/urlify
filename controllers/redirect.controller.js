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
  const startTime = performance.now();
  const clickedAt = new Date();

  try {
    const { shortCode } = req.params;

    let url = null;

    // 1. Try Redis first
    const cached = await redisClient.get(getCacheKey(shortCode));

    if (cached) {
      url =
        typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
    }

    // 2. DB fallback only if cache miss
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

      cacheUrl(shortCode, url).catch(err => {
        console.error("Cache Error:", err);
      });
    }

    // 3. Validate before redirect
    if (!url.is_active) {
      return res.status(410).send("This link is inactive");
    }

    if (url.expires_at && new Date(url.expires_at) < new Date()) {
      return res.status(410).send("This link has expired");
    }

    const redirectTimeMs = Math.round(performance.now() - startTime);

    // 4. REDIRECT IMMEDIATELY
    res.redirect(302, url.original_url);

    // 5. Do everything else after redirect
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
      io.to(`user:${url.user_id}`).emit("liveClick", {
        urlId: url.id,
        shortCode: url.short_code || shortCode,
        originalUrl: url.original_url,
        clickedAt,
        redirectTimeMs
      });
    }

  } catch (error) {
    console.error("Analytics Error:", error);
  }
});

  } catch (error) {
    console.error("Redirect Error:", error);

    if (!res.headersSent) {
      return res.status(500).send("Internal Server Error");
    }
  }
}

module.exports = {
  redirectToOriginalUrl
};
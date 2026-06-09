const redisClient = require("../config/redis");

const SHORT_URL_CACHE_TTL = 60 * 60 * 6;

function getCacheKey(shortCode) {
  return `short:${shortCode}`;
}

function getRedisTTL(expiresAt) {
  if (!expiresAt) return SHORT_URL_CACHE_TTL;

  const secondsLeft = Math.floor(
    (new Date(expiresAt).getTime() - Date.now()) / 1000
  );

  if (secondsLeft <= 0) return 0;

  return Math.min(secondsLeft, SHORT_URL_CACHE_TTL);
}

async function cacheUrl(shortCode, url) {
  const ttl = getRedisTTL(url.expires_at);

  if (ttl <= 0) return;

  await redisClient.set(
    getCacheKey(shortCode),
    JSON.stringify({
      id: url.id,
      user_id: url.user_id,
      original_url: url.original_url,
      is_active: url.is_active,
      expires_at: url.expires_at
    }),
    {
      ex: ttl
    }
  );
}

module.exports = {
  getCacheKey,
  cacheUrl
};
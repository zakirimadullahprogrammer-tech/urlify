const { pool } = require("../config/db");
const UAParser = require("ua-parser-js");
const geoip = require("geoip-lite");

async function recordClick(url, req, redirectTimeMs, clickedAt) {
  const client = await pool.connect();

  try {
    const rawIp = getClientIp(req) || "";
    const cleanIp = rawIp.replace("::ffff:", "");

    const geo = geoip.lookup(cleanIp);
    const country = geo?.country || "Unknown";

    const userAgent = req.headers["user-agent"] || "";
    const referer = req.headers.referer || req.headers.referrer || "";

    const parser = new UAParser(userAgent);
    const parsedUA = parser.getResult();

    const uaString = userAgent.toLowerCase();
    const ref = referer.toLowerCase();

    const deviceType = normalizeDeviceType(parsedUA, uaString);
    const browser = normalizeBrowser(parsedUA, uaString);
    const operatingSystem = normalizeOS(parsedUA, uaString);
    const trafficSource = detectTrafficSource(req, uaString, ref);

    await client.query("BEGIN");

    await client.query(
      `
      UPDATE urls
      SET total_clicks = total_clicks + 1,
          updated_at = $2
      WHERE id = $1
      `,
      [url.id, clickedAt]
    );

    await client.query(
      `
      INSERT INTO click_analytics (
        url_id,
        ip_address,
        user_agent,
        device_type,
        browser,
        operating_system,
        country,
        referer,
        traffic_source,
        redirect_time_ms,
        clicked_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        url.id,
        cleanIp,
        userAgent,
        deviceType,
        browser,
        operatingSystem,
        country,
        referer || "Direct",
        trafficSource,
        redirectTimeMs,
        clickedAt
      ]
    );

    await client.query("COMMIT");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function getClientIp(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress
  );
}
function normalizeDeviceType(parsedUA, uaString) {
  if (
    uaString.includes("postman") ||
    uaString.includes("curl") ||
    uaString.includes("insomnia") ||
    uaString.includes("thunder client")
  ) {
    return "API Client";
  }

  const type = parsedUA.device?.type;

  if (!type) return "Desktop";

  if (type === "mobile") return "Mobile";
  if (type === "tablet") return "Tablet";

  return "Desktop";
}
function normalizeBrowser(parsedUA, uaString) {
  if (uaString.includes("postman")) {
    return "Postman";
  }

  if (uaString.includes("curl")) {
    return "cURL";
  }

  if (uaString.includes("insomnia")) {
    return "Insomnia";
  }

  if (uaString.includes("thunder client")) {
    return "Thunder Client";
  }

  if (uaString.includes("instagram")) {
    return "Instagram In-App Browser";
  }

  if (
    uaString.includes("fbav") ||
    uaString.includes("fb_iab") ||
    uaString.includes("facebook")
  ) {
    return "Facebook In-App Browser";
  }

  if (uaString.includes("whatsapp")) {
    return "WhatsApp In-App Browser";
  }

  const browser = parsedUA.browser?.name || "Unknown";

  const browserLower = browser.toLowerCase();

  if (browserLower.includes("chrome")) return "Chrome";
  if (browserLower.includes("firefox")) return "Firefox";
  if (browserLower.includes("safari")) return "Safari";
  if (browserLower.includes("edge")) return "Edge";
  if (browserLower.includes("opera")) return "Opera";

  return browser;
}
function normalizeOS(parsedUA, uaString) {
  if (
    uaString.includes("postman") ||
    uaString.includes("curl") ||
    uaString.includes("insomnia") ||
    uaString.includes("thunder client")
  ) {
    return "API Client";
  }

  const os = parsedUA.os?.name || "Unknown";
  const osLower = os.toLowerCase();

  if (osLower.includes("android")) return "Android";
  if (osLower.includes("ios")) return "iOS";
  if (osLower.includes("windows")) return "Windows";
  if (osLower.includes("mac")) return "macOS";

  if (
    osLower.includes("ubuntu") ||
    osLower.includes("linux") ||
    osLower.includes("debian") ||
    osLower.includes("fedora") ||
    osLower.includes("arch")
  ) {
    return "Linux";
  }

  return os;
}
function detectTrafficSource(req, uaString, ref) {
  const utmSource = (req.query.utm_source || "").toLowerCase();

  if (
    utmSource.includes("instagram") ||
    ref.includes("instagram") ||
    uaString.includes("instagram")
  ) {
    return "Instagram";
  }

  if (
    utmSource.includes("facebook") ||
    ref.includes("facebook") ||
    uaString.includes("fbav") ||
    uaString.includes("fb_iab")
  ) {
    return "Facebook";
  }

  if (
    utmSource.includes("whatsapp") ||
    ref.includes("whatsapp") ||
    uaString.includes("whatsapp")
  ) {
    return "WhatsApp";
  }

  if (
    utmSource.includes("linkedin") ||
    ref.includes("linkedin")
  ) {
    return "LinkedIn";
  }

  if (
    utmSource.includes("twitter") ||
    utmSource.includes("x") ||
    ref.includes("twitter") ||
    ref.includes("x.com")
  ) {
    return "Twitter/X";
  }

  if (
    ref.includes("google") ||
    ref.includes("bing") ||
    ref.includes("yahoo") ||
    ref.includes("duckduckgo")
  ) {
    return "Search";
  }

  if (ref) {
    return "Referral";
  }

  return "Direct";
}
module.exports = {
  recordClick
};
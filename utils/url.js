function getBaseUrl(req) {
  if (!req) {
    return null;
  }

  const protocol =
    req.protocol ||
    "http";

  const host =
    req.get?.("host") ||
    req.headers?.host;

  if (
    !host ||
    typeof host !== "string"
  ) {
    return null;
  }

  const normalizedHost =
    host.trim();

  if (!normalizedHost) {
    return null;
  }

  return `${protocol}://${normalizedHost}`;
}

module.exports = {
  getBaseUrl
};
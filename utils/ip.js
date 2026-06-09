function getClientIp(req) {
  if (!req) {
    return "unknown";
  }

  const forwardedFor =
    req.headers?.["x-forwarded-for"]
      ?.split(",")[0]
      ?.trim();

  const ip =
    forwardedFor ||
    req.socket?.remoteAddress ||
    req.ip;

  if (!ip || typeof ip !== "string") {
    return "unknown";
  }

  const normalizedIp = ip.trim();

  if (!normalizedIp) {
    return "unknown";
  }

  // Convert IPv4-mapped IPv6
  if (normalizedIp.startsWith("::ffff:")) {
    return normalizedIp.replace("::ffff:", "");
  }

  // Normalize localhost IPv6
  if (normalizedIp === "::1") {
    return "127.0.0.1";
  }

  return normalizedIp;
}

module.exports = {
  getClientIp
};
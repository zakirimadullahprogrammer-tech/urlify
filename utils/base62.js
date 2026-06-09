const BASE62 =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateShortCode(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid ID for shortcode");
  }

  let shortCode = "";

  while (id > 0) {
    shortCode = BASE62[id % 62] + shortCode;
    id = Math.floor(id / 62);
  }

  return shortCode;
}

module.exports = { generateShortCode };
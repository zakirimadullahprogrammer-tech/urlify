const DEVICE_TYPES = Object.freeze({
  MOBILE: "Mobile",
  TABLET: "Tablet",
  DESKTOP: "Desktop",
  SMART_TV: "Smart TV",
  WEARABLE: "Wearable",
  CONSOLE: "Console",
  BOT: "Bot",
  UNKNOWN: "Unknown"
});

const DEVICE_ALIASES = Object.freeze({
  mobile: DEVICE_TYPES.MOBILE,
  phone: DEVICE_TYPES.MOBILE,
  smartphone: DEVICE_TYPES.MOBILE,

  tablet: DEVICE_TYPES.TABLET,
  ipad: DEVICE_TYPES.TABLET,

  desktop: DEVICE_TYPES.DESKTOP,
  pc: DEVICE_TYPES.DESKTOP,
  computer: DEVICE_TYPES.DESKTOP,
  laptop: DEVICE_TYPES.DESKTOP,

  smarttv: DEVICE_TYPES.SMART_TV,
  tv: DEVICE_TYPES.SMART_TV,
  television: DEVICE_TYPES.SMART_TV,

  wearable: DEVICE_TYPES.WEARABLE,
  watch: DEVICE_TYPES.WEARABLE,

  console: DEVICE_TYPES.CONSOLE,
  gamingconsole: DEVICE_TYPES.CONSOLE,

  bot: DEVICE_TYPES.BOT,
  crawler: DEVICE_TYPES.BOT,
  spider: DEVICE_TYPES.BOT
});

function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeKey(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function titleCase(value) {
  return cleanString(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");
}

function normalizeDeviceType(deviceType) {
  const key = normalizeKey(deviceType);

  if (!key) {
    return DEVICE_TYPES.DESKTOP;
  }

  return (
    DEVICE_ALIASES[key] ||
    DEVICE_TYPES.DESKTOP
  );
}

function normalizeBrowser(browser) {
  const cleaned = cleanString(browser);

  if (!cleaned) {
    return "Unknown";
  }

  const key = normalizeKey(cleaned);

  const browserMap = {
    chrome: "Chrome",
    chromium: "Chromium",
    firefox: "Firefox",
    safari: "Safari",
    edge: "Microsoft Edge",
    edg: "Microsoft Edge",
    opera: "Opera",
    opr: "Opera",
    samsungbrowser: "Samsung Internet",
    samsunginternet: "Samsung Internet",
    brave: "Brave",
    vivaldi: "Vivaldi",
    internetexplorer: "Internet Explorer",
    ie: "Internet Explorer"
  };

  return browserMap[key] || titleCase(cleaned);
}

function normalizeOS(os) {
  const cleaned = cleanString(os);

  if (!cleaned) {
    return "Unknown";
  }

  const key = normalizeKey(cleaned);

  const osMap = {
    windows: "Windows",
    macos: "macOS",
    macosx: "macOS",
    osx: "macOS",
    ios: "iOS",
    android: "Android",
    linux: "Linux",
    ubuntu: "Ubuntu",
    debian: "Debian",
    fedora: "Fedora",
    chromeos: "ChromeOS",
    cros: "ChromeOS"
  };

  return osMap[key] || titleCase(cleaned);
}

module.exports = {
  normalizeDeviceType,
  normalizeBrowser,
  normalizeOS
};
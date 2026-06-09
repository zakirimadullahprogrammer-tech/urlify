function detectTrafficSource(referer) {
  if (
    !referer ||
    typeof referer !== "string"
  ) {
    return "Direct";
  }

  const ref =
    referer
      .trim()
      .toLowerCase();

  if (!ref) {
    return "Direct";
  }

  const sourceMap = {
    Search: [
      "google",
      "bing",
      "yahoo",
      "duckduckgo",
      "baidu",
      "yandex",
      "ecosia"
    ],

    Social: [
      "facebook",
      "instagram",
      "twitter",
      "x.com",
      "linkedin",
      "tiktok",
      "reddit",
      "pinterest",
      "snapchat"
    ],

    Messaging: [
      "whatsapp",
      "telegram",
      "discord",
      "messenger"
    ]
  };

  for (const [
    category,
    domains
  ] of Object.entries(
    sourceMap
  )) {
    if (
      domains.some(domain =>
        ref.includes(domain)
      )
    ) {
      return category;
    }
  }

  return "Referral";
}

module.exports = {
  detectTrafficSource
};
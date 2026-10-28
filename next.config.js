const createNextIntlPlugin = require("next-intl/plugin");

// next-intl serves the vendored didit.me chrome's labels (see i18n/request.ts).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["upload.wikimedia.org", "developer.apple.com"],
  },
};

module.exports = withNextIntl(nextConfig);

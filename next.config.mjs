/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Twilio / Stripe / Resend are optional server-only deps. If they are not
  // installed, the app still builds because they are imported lazily.
  serverExternalPackages: ["twilio", "stripe", "resend"],
};

export default nextConfig;

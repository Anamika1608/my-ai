/** @type {import('next').NextConfig} */
const nextConfig = {
  // The brain route runs on the Edge runtime (declared per-route).
  // Keep server external packages out of the edge bundle; pdf-parse is only
  // used in the Node-based ingest script, never in app routes.
  reactStrictMode: true,
};

export default nextConfig;

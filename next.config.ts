import type { NextConfig } from "next";

// Allow next/image to load recipe images served from the local Supabase
// Storage endpoint. Derived from NEXT_PUBLIC_SUPABASE_URL so it works for any
// host the mini PC is reached on.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const { hostname, port, protocol } = new URL(supabaseUrl);

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for the Docker image.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        port: port || undefined,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

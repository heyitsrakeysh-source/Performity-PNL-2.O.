import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't emit AGENTS.md / CLAUDE.md into the repo root on build.
  agentRules: false,
};

export default nextConfig;

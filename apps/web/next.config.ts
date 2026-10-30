import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

function getPrivateIpv4Hosts(): string[] {
  const hosts = new Set<string>();
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      const octets = address.address.split(".").map(Number);
      if (
        octets.length !== 4 ||
        octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
      ) continue;
      const [first, second] = octets;
      if (first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)) {
        hosts.add(address.address);
      }
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: { position: "top-left" },
  ...(process.env.NODE_ENV === "development" ? { allowedDevOrigins: getPrivateIpv4Hosts() } : {}),
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

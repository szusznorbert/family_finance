import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { networkInterfaces } from "node:os";
import { prisma } from "@/lib/prisma";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

function getTrustedOrigins(): string[] {
  const origins = new Set([webOrigin]);
  if (process.env.NODE_ENV === "development") {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family !== "IPv4" || address.internal) continue;
        const octets = address.address.split(".").map(Number);
        if (
          octets.length !== 4 ||
          octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
        ) continue;
        const [first, second] = octets;
        const isPrivate =
          first === 10 ||
          (first === 172 && second >= 16 && second <= 31) ||
          (first === 192 && second === 168);
        if (isPrivate) origins.add(`http://${address.address}:3000`);
      }
    }
  }
  return [...origins];
}

export const auth = betterAuth({
  baseURL: webOrigin,
  trustedOrigins: getTrustedOrigins(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
});

import { reconcile } from "./lib/private-document-storage";
import { prisma } from "./lib/prisma";

try {
  const anomalies = await reconcile();
  const counts = anomalies.reduce<Record<string, number>>((result, anomaly) => {
    result[anomaly.kind] = (result[anomaly.kind] ?? 0) + 1;
    return result;
  }, {});
  console.info("Private document reconciliation:", JSON.stringify({ anomalyCount: anomalies.length, counts }));
  if (process.argv.includes("--details")) {
    for (const anomaly of anomalies) console.info(JSON.stringify(anomaly));
  }
} catch (error) {
  console.error("Private document reconciliation failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

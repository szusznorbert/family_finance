import { writeFile, rename } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "./lib/prisma";
import { recurringErrorCode, runRecurringSweep } from "./lib/recurring-cost";

const intervalMs = 60 * 60 * 1000;
const statusPath = "/tmp/recurring-worker-status.json";
const stopWaiting = new AbortController();
let stopping = false;

const status = {
  pid: process.pid,
  startedAt: new Date().toISOString(),
  lastCompletedSweepAt: null as string | null,
  lastSuccessfulSweepAt: null as string | null,
  lastFailureCount: 0,
  lastFatalErrorCode: null as string | null,
};

async function publishStatus() {
  const temporaryPath = `${statusPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(status), { mode: 0o600 });
  await rename(temporaryPath, statusPath);
}

function stop() {
  stopping = true;
  stopWaiting.abort();
}

process.once("SIGTERM", stop);
process.once("SIGINT", stop);

async function main() {
  await publishStatus();
  while (!stopping) {
    const result = await runRecurringSweep();
    status.lastCompletedSweepAt = new Date().toISOString();
    status.lastFailureCount = result.failures;
    if (result.failures === 0) status.lastSuccessfulSweepAt = status.lastCompletedSweepAt;
    await publishStatus();
    console.info("Recurring sweep completed", result);

    if (!stopping) {
      try {
        await delay(intervalMs, undefined, { signal: stopWaiting.signal });
      } catch (error) {
        if (!stopping) throw error;
      }
    }
  }
}

main().catch(async (error: unknown) => {
  status.lastFatalErrorCode = recurringErrorCode(error);
  console.error("Recurring worker stopped after a fatal error", { code: status.lastFatalErrorCode });
  try {
    await publishStatus();
  } catch {
    // The nonzero exit is the final operational signal if status publishing fails.
  }
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});

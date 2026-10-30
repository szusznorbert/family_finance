import { materializeRecurringMonth, recurringErrorCode } from "./lib/recurring-cost";
import { prisma } from "./lib/prisma";

const usage = "Usage: pnpm --filter api worker:recurring:verify -- <synthetic-rule-id> <YYYY-MM> <YYYY-MM> [--as-of YYYY-MM-DD]";
const cliArgs = process.argv.slice(2);
if (cliArgs[0] === "--") cliArgs.shift();
const [ruleId, fromMonth, toMonth, ...options] = cliArgs;
const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
const datePattern = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parseMonth(value: string) {
  const match = monthPattern.exec(value);
  if (!match) throw new Error(`Invalid month: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

function parseAsOf(value: string | undefined) {
  if (value === undefined) return new Date();
  const match = datePattern.exec(value);
  if (!match) throw new Error("Invalid --as-of date; expected YYYY-MM-DD.");
  const date = new Date(`${value}T12:00:00.000Z`);
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) throw new Error("Invalid --as-of calendar date.");
  return date;
}

async function main() {
  if (!ruleId || !fromMonth || !toMonth) throw new Error(usage);
  let asOfValue: string | undefined;
  if (options.length) {
    if (options.length !== 2 || options[0] !== "--as-of") throw new Error(usage);
    asOfValue = options[1];
  }
  const asOf = parseAsOf(asOfValue);
  const from = parseMonth(fromMonth);
  const to = parseMonth(toMonth);
  const span = (to.year - from.year) * 12 + to.month - from.month;
  if (span < 0 || span > 11) throw new Error("Month range must be ordered and at most 12 months.");

  const rule = await prisma.recurringExpenseRule.findUnique({
    where: { id: ruleId },
    select: { id: true, household: { select: { members: { where: { role: "OWNER" }, select: { user: { select: { email: true } } } } } } },
  });
  if (!rule) throw new Error("Rule not found.");
  const owners = rule.household.members;
  if (owners.length !== 1 || !owners[0].user.email.toLowerCase().endsWith("@example.test")) {
    throw new Error("Targeted verification is limited to a single-owner synthetic example.test household.");
  }

  const outcomes: string[] = [];
  for (let offset = 0; offset <= span; offset += 1) {
    const number = from.year * 12 + from.month - 1 + offset;
    const month = { year: Math.floor(number / 12), month: (number % 12) + 1 };
    outcomes.push(`${month.year}-${String(month.month).padStart(2, "0")}:${await materializeRecurringMonth(ruleId, month, asOf)}`);
  }
  console.info("Targeted recurring verification completed", { ruleReference: "synthetic-rule", outcomes });
}

main()
  .catch((error: unknown) => {
    console.error("Targeted recurring verification failed", { code: recurringErrorCode(error) });
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

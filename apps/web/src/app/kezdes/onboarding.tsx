"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DEFAULT_EXPENSE_CATEGORIES, type DefaultExpenseCategoryCode } from "@household-finance/shared";
import AppShell from "../app-shell";
import { authClient } from "@/lib/auth-client";
import styles from "./onboarding.module.css";

type Step = "choose" | "create" | "join";
type FixedCostField = "name" | "amount" | "categoryCode" | "dayOfMonth" | "startMonth";
type FixedCostDraft = {
  id: number;
  name: string;
  amount: string;
  categoryCode: DefaultExpenseCategoryCode | "";
  dayOfMonth: string;
  startMonth: string;
};
type FixedCostErrors = Partial<Record<FixedCostField, string>>;

const selectedHouseholdKey = "household-selection:v1";
const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const maxFixedCosts = 20;

function bucharestMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

function normalizedRonAmount(value: string) {
  const match = /^(0|[1-9]\d{0,15})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents = (match[2] ?? "").padEnd(2, "0");
  if (match[1] === "0" && cents === "00") return null;
  return `${match[1]}.${cents}`;
}

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function saveSelectedHouseholdId(id: string) {
  try {
    window.localStorage.setItem(selectedHouseholdKey, id);
  } catch {
    // The overview can select the first household when storage is unavailable.
  }
}

function isHouseholdSummary(value: unknown): value is { id: string; name: string; currency: "RON" } {
  if (!value || typeof value !== "object") return false;
  const household = value as Record<string, unknown>;
  return typeof household.id === "string" &&
    typeof household.name === "string" &&
    household.currency === "RON";
}

function invitationTokenFromLink(value: string): string | null {
  try {
    const url = new URL(value);
    const tokens = new URLSearchParams(url.hash.slice(1)).getAll("token");
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.origin !== window.location.origin ||
      url.pathname !== "/invitations/accept" ||
      url.search !== "" ||
      tokens.length !== 1 ||
      !invitationTokenPattern.test(tokens[0])
    ) {
      return null;
    }
    return tokens[0];
  } catch {
    return null;
  }
}

export default function Onboarding() {
  const router = useRouter();
  const { data, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [step, setStep] = useState<Step>("choose");
  const [householdName, setHouseholdName] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [pending, setPending] = useState(false);
  const [checkingHouseholds, setCheckingHouseholds] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [fixedCostsOpen, setFixedCostsOpen] = useState(false);
  const [fixedCosts, setFixedCosts] = useState<FixedCostDraft[]>([]);
  const [fixedCostErrors, setFixedCostErrors] = useState<Record<number, FixedCostErrors>>({});
  const nextFixedCostId = useRef(1);
  const addFixedCostButton = useRef<HTMLButtonElement>(null);
  const userId = data?.user?.id;

  function addFixedCost() {
    if (fixedCosts.length >= maxFixedCosts) return;
    const id = nextFixedCostId.current++;
    setFixedCosts((items) => [...items, {
      id,
      name: "",
      amount: "",
      categoryCode: "",
      dayOfMonth: "",
      startMonth: bucharestMonth(),
    }]);
    window.requestAnimationFrame(() => document.getElementById(`fixed-cost-${id}-name`)?.focus());
  }

  function removeFixedCost(id: number) {
    setFixedCosts((items) => items.filter((item) => item.id !== id));
    setFixedCostErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    window.requestAnimationFrame(() => addFixedCostButton.current?.focus());
  }

  function updateFixedCost<K extends Exclude<keyof FixedCostDraft, "id">>(
    id: number,
    field: K,
    value: FixedCostDraft[K],
  ) {
    setFixedCosts((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setFixedCostErrors((current) => {
      if (!current[id]?.[field]) return current;
      return { ...current, [id]: { ...current[id], [field]: undefined } };
    });
  }

  useEffect(() => {
    if (!sessionPending && !sessionError && !userId) {
      router.replace("/bejelentkezes");
    }
  }, [router, sessionError, sessionPending, userId]);

  useEffect(() => {
    if (sessionPending || sessionError || !userId) return;

    let active = true;
    async function checkExistingHouseholds() {
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(responseMessage(payload, "A háztartásaid most nem ellenőrizhetők."));
        }

        const households = payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).households
          : null;
        if (!Array.isArray(households) || !households.every(isHouseholdSummary)) {
          throw new Error("A háztartásaid adatai nem olvashatók.");
        }
        if (!active) return;
        setFeedback(null);

        if (households.length > 0) {
          router.replace("/");
        }
      } catch (error) {
        if (active) {
          setFeedback(error instanceof Error
            ? error.message
            : "A háztartásaid most nem ellenőrizhetők.");
        }
      } finally {
        if (active) setCheckingHouseholds(false);
      }
    }

    void checkExistingHouseholds();
    return () => {
      active = false;
    };
  }, [router, retry, sessionError, sessionPending, userId]);

  async function createHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const trimmedName = householdName.trim();
    if (!trimmedName || Array.from(trimmedName).length > 100) {
      setFeedback("A háztartás neve 1 és 100 karakter közötti lehet.");
      return;
    }

    const errors: Record<number, FixedCostErrors> = {};
    let firstInvalidField: string | null = null;
    const currentMonth = bucharestMonth();
    const normalizedFixedCosts = fixedCosts.map((item) => {
      const itemErrors: FixedCostErrors = {};
      const name = item.name.trim();
      const amount = normalizedRonAmount(item.amount);
      const day = Number(item.dayOfMonth);
      if (!name || Array.from(name).length > 100) itemErrors.name = "Adj meg 1–100 karakteres megnevezést.";
      if (!amount) itemErrors.amount = "Adj meg pozitív RON-összeget, legfeljebb két tizedessel.";
      if (!DEFAULT_EXPENSE_CATEGORIES.some((category) => category.code === item.categoryCode)) {
        itemErrors.categoryCode = "Válassz kiadási kategóriát.";
      }
      if (!/^(?:[1-9]|[12]\d|3[01])$/.test(item.dayOfMonth)) {
        itemErrors.dayOfMonth = "A havi nap 1 és 31 között lehet.";
      }
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(item.startMonth) || item.startMonth < currentMonth) {
        itemErrors.startMonth = "Az aktuális vagy egy későbbi hónapot válaszd.";
      }
      if (Object.keys(itemErrors).length > 0) {
        errors[item.id] = itemErrors;
        if (!firstInvalidField) firstInvalidField = `fixed-cost-${item.id}-${Object.keys(itemErrors)[0]}`;
      }
      return { name, amount, categoryCode: item.categoryCode, dayOfMonth: day, startMonth: item.startMonth };
    });
    if (firstInvalidField) {
      setFixedCostErrors(errors);
      setFixedCostsOpen(true);
      setFeedback("Ellenőrizd a megjelölt fix költség mezőit.");
      const target = firstInvalidField;
      window.requestAnimationFrame(() => document.getElementById(target)?.focus());
      return;
    }
    setFixedCostErrors({});

    setPending(true);
    try {
      const response = await fetch("/api/v1/households", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          ...(fixedCostsOpen || fixedCosts.length > 0 ? { fixedCosts: normalizedFixedCosts } : {}),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseMessage(payload, "A háztartás létrehozása nem sikerült."));
      }

      const household = payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).household
        : null;
      if (!isHouseholdSummary(household)) {
        throw new Error("A létrehozott háztartás adatai nem olvashatók.");
      }

      saveSelectedHouseholdId(household.id);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error
        ? error.message
        : "A háztartás létrehozása nem sikerült.");
    } finally {
      setPending(false);
    }
  }

  function openInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = invitationLink.trim();
    setInvitationLink("");
    setFeedback(null);

    const token = invitationTokenFromLink(candidate);
    if (!token) {
      setFeedback("A meghívólink nem érvényes. Ellenőrizd a linket, vagy kérj újat a tulajdonostól.");
      return;
    }

    // Keep the existing bearer-token flow: same-origin path, fragment only, never a query parameter.
    window.location.replace(`/invitations/accept#${new URLSearchParams({ token }).toString()}`);
  }

  const waiting = sessionPending || checkingHouseholds;
  const signedIn = Boolean(data?.user);

  return (
    <AppShell>
      <main className="app-main">
        <div className="onboarding-main">
          {waiting ? (
            <p className="status-message" role="status">
              {sessionPending ? "Fiók ellenőrzése…" : "Háztartás ellenőrzése…"}
            </p>
          ) : sessionError && !signedIn ? (
            <div className="status-message status-error" role="alert">
              <p>A fiók állapota most nem ellenőrizhető.</p>
              <button className="mt-3 min-h-11 rounded-xl border px-4 py-2" onClick={() => void refetch()} type="button">
                Újrapróbálás
              </button>
            </div>
          ) : feedback && step === "choose" ? (
            <div className="status-message status-error" role="alert">
              <p>{feedback}</p>
              <button className="mt-3 min-h-11 rounded-xl border px-4 py-2" onClick={() => setRetry((value) => value + 1)} type="button">
                Újrapróbálás
              </button>
            </div>
          ) : step === "choose" ? (
            <>
              <h1 className="onboarding-title">Kezdjük a közös pénzügyeket</h1>
              <p className="onboarding-description">
                Hozz létre háztartást, vagy csatlakozz egy meghívólinkkel.
              </p>
              <div aria-label="Háztartás beállítása" className="onboarding-choice-list">
                <button className="onboarding-choice" onClick={() => { setStep("create"); setFeedback(null); }} type="button">
                  <span className="onboarding-choice-copy">
                    <span className="onboarding-choice-title">Új háztartás létrehozása</span>
                    <span className="onboarding-choice-description">Te leszel a háztartás tulajdonosa.</span>
                  </span>
                </button>
                <button className="onboarding-choice" onClick={() => { setStep("join"); setFeedback(null); }} type="button">
                  <span className="onboarding-choice-copy">
                    <span className="onboarding-choice-title">Meghívólinkkel csatlakozom</span>
                    <span className="onboarding-choice-description">A tulajdonostól kapott linkkel.</span>
                  </span>
                </button>
              </div>
            </>
          ) : step === "create" ? (
            <>
              <button className="onboarding-back" onClick={() => { setStep("choose"); setFeedback(null); }} type="button">
                Vissza
              </button>
              <h1 className="onboarding-title">Új háztartás</h1>
              <p className="onboarding-description">Adj nevet annak a háztartásnak, amelynek a pénzügyeit együtt követitek.</p>
              <form className="onboarding-form" onSubmit={(event) => void createHousehold(event)}>
                <div className="onboarding-field">
                  <label htmlFor="household-name">Háztartás neve</label>
                  <input
                    autoComplete="off"
                    id="household-name"
                    maxLength={100}
                    onChange={(event) => setHouseholdName(event.currentTarget.value)}
                    placeholder="Például: Család"
                    required
                    value={householdName}
                  />
                </div>
                <div className="onboarding-currency-row">
                  <span>Pénznem</span>
                  <strong>RON</strong>
                </div>
                <section aria-labelledby="fixed-costs-title" className={styles.optionalSection}>
                  <button
                    aria-controls="fixed-costs-fields"
                    aria-expanded={fixedCostsOpen}
                    className={styles.disclosure}
                    onClick={() => setFixedCostsOpen((open) => !open)}
                    type="button"
                  >
                    <span className={styles.disclosureCopy}>
                      <strong id="fixed-costs-title">Havi fix költségek</strong>
                      <span>{fixedCosts.length > 0
                        ? `${fixedCosts.length} megadott tétel`
                        : "Nem kötelező"}</span>
                    </span>
                    <span aria-hidden="true" className={styles.disclosureIcon}>{fixedCostsOpen ? "⌄" : "›"}</span>
                  </button>
                  <div className={styles.optionalContent} hidden={!fixedCostsOpen} id="fixed-costs-fields">
                    <p className={styles.optionalIntro}>Itt megadhatod a havonta ismétlődő kiadásokat. Ha kihagyod, a háztartás ezek nélkül jön létre.</p>
                    {fixedCosts.map((item, index) => {
                      const rowErrors = fixedCostErrors[item.id] ?? {};
                      const fieldId = (field: FixedCostField) => `fixed-cost-${item.id}-${field}`;
                      return (
                        <div className={styles.costRow} key={item.id}>
                          <div className={styles.rowHeading}>
                            <h2>Fix költség {index + 1}</h2>
                            <button
                              aria-label={`${index + 1}. fix költség eltávolítása`}
                              className={styles.removeButton}
                              onClick={() => removeFixedCost(item.id)}
                              type="button"
                            >Eltávolítás</button>
                          </div>
                          <div className={styles.fields}>
                            <div className={styles.field}>
                              <label htmlFor={fieldId("name")}>Megnevezés</label>
                              <input
                                aria-describedby={rowErrors.name ? `${fieldId("name")}-error` : undefined}
                                aria-invalid={Boolean(rowErrors.name)}
                                id={fieldId("name")}
                                maxLength={100}
                                onChange={(event) => updateFixedCost(item.id, "name", event.currentTarget.value)}
                                placeholder="Például: Lakbér"
                                value={item.name}
                              />
                              {rowErrors.name && <p className={styles.fieldError} id={`${fieldId("name")}-error`}>{rowErrors.name}</p>}
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={fieldId("amount")}>Havi összeg · RON</label>
                              <input
                                aria-describedby={rowErrors.amount ? `${fieldId("amount")}-error` : undefined}
                                aria-invalid={Boolean(rowErrors.amount)}
                                autoComplete="off"
                                id={fieldId("amount")}
                                inputMode="decimal"
                                maxLength={20}
                                onChange={(event) => updateFixedCost(item.id, "amount", event.currentTarget.value)}
                                placeholder="Például: 1200,00"
                                type="text"
                                value={item.amount}
                              />
                              {rowErrors.amount && <p className={styles.fieldError} id={`${fieldId("amount")}-error`}>{rowErrors.amount}</p>}
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={fieldId("categoryCode")}>Kiadási kategória</label>
                              <select
                                aria-describedby={rowErrors.categoryCode ? `${fieldId("categoryCode")}-error` : undefined}
                                aria-invalid={Boolean(rowErrors.categoryCode)}
                                id={fieldId("categoryCode")}
                                onChange={(event) => updateFixedCost(item.id, "categoryCode", event.currentTarget.value as DefaultExpenseCategoryCode | "")}
                                value={item.categoryCode}
                              >
                                <option value="">Válassz kategóriát</option>
                                {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
                                  <option key={category.code} value={category.code}>{category.name}</option>
                                ))}
                              </select>
                              {rowErrors.categoryCode && <p className={styles.fieldError} id={`${fieldId("categoryCode")}-error`}>{rowErrors.categoryCode}</p>}
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={fieldId("dayOfMonth")}>Havi nap</label>
                              <input
                                aria-describedby={`${fieldId("dayOfMonth")}-hint${rowErrors.dayOfMonth ? ` ${fieldId("dayOfMonth")}-error` : ""}`}
                                aria-invalid={Boolean(rowErrors.dayOfMonth)}
                                id={fieldId("dayOfMonth")}
                                inputMode="numeric"
                                max={31}
                                min={1}
                                onChange={(event) => updateFixedCost(item.id, "dayOfMonth", event.currentTarget.value)}
                                step={1}
                                type="number"
                                value={item.dayOfMonth}
                              />
                              <p className={styles.fieldHint} id={`${fieldId("dayOfMonth")}-hint`}>Rövid hónapban az utolsó nap számít.</p>
                              {rowErrors.dayOfMonth && <p className={styles.fieldError} id={`${fieldId("dayOfMonth")}-error`}>{rowErrors.dayOfMonth}</p>}
                            </div>
                            <div className={styles.field}>
                              <label htmlFor={fieldId("startMonth")}>Kezdő hónap</label>
                              <input
                                aria-describedby={rowErrors.startMonth ? `${fieldId("startMonth")}-error` : undefined}
                                aria-invalid={Boolean(rowErrors.startMonth)}
                                id={fieldId("startMonth")}
                                min={bucharestMonth()}
                                onChange={(event) => updateFixedCost(item.id, "startMonth", event.currentTarget.value)}
                                type="month"
                                value={item.startMonth}
                              />
                              {rowErrors.startMonth && <p className={styles.fieldError} id={`${fieldId("startMonth")}-error`}>{rowErrors.startMonth}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className={styles.addButton}
                      disabled={fixedCosts.length >= maxFixedCosts || pending}
                      onClick={addFixedCost}
                      ref={addFixedCostButton}
                      type="button"
                    >+ Fix költség hozzáadása</button>
                    {fixedCosts.length >= maxFixedCosts && <p className={styles.fieldHint}>Legfeljebb 20 fix költség adható meg.</p>}
                  </div>
                </section>
                {feedback && <p className="onboarding-feedback" role="alert">{feedback}</p>}
                <button className="onboarding-primary-action" disabled={pending} type="submit">
                  {pending ? "Létrehozás…" : "Háztartás létrehozása"}
                </button>
              </form>
            </>
          ) : (
            <>
              <button className="onboarding-back" onClick={() => { setStep("choose"); setFeedback(null); }} type="button">
                Vissza
              </button>
              <h1 className="onboarding-title">Csatlakozás meghívóval</h1>
              <p className="onboarding-description">Illeszd be a tulajdonostól kapott teljes meghívólinket.</p>
              <form className="onboarding-form" onSubmit={openInvitation}>
                <div className="onboarding-field">
                  <label htmlFor="invitation-link">Meghívólink</label>
                  <input
                    autoComplete="off"
                    id="invitation-link"
                    inputMode="url"
                    onChange={(event) => setInvitationLink(event.currentTarget.value)}
                    placeholder="https://…/invitations/accept#token=…"
                    required
                    type="url"
                    value={invitationLink}
                  />
                </div>
                {feedback && <p className="onboarding-feedback" role="alert">{feedback}</p>}
                <p className="onboarding-note">A link egyszer használható. Nem mentjük el a böngésző tárhelyére.</p>
                <button className="onboarding-primary-action" type="submit">
                  Meghívólink megnyitása
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}

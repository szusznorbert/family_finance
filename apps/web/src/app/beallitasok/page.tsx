import Link from "next/link";
import AppShell from "../app-shell";
import styles from "./settings.module.css";

const settingsGroups = [
  {
    id: "account",
    heading: "Fiók",
    links: [{ href: "/beallitasok/fiok", label: "Fiók és munkamenet" }],
  },
  {
    id: "household",
    heading: "Háztartás",
    links: [{ href: "/beallitasok/haztartas", label: "Háztartás kiválasztása és neve" }],
  },
  {
    id: "members",
    heading: "Tagok és meghívók",
    links: [{ href: "/beallitasok/tagok", label: "Tagok és meghívók kezelése" }],
  },
  {
    id: "finances",
    heading: "Pénzügyek",
    links: [
      { href: "/beallitasok/kategoriak", label: "Kiadási kategóriák" },
      { href: "/beallitasok/fix-koltsegek", label: "Havi fix költségek" },
    ],
  },
] as const;

export default function SettingsPage() {
  return (
    <AppShell>
      <main className={`app-main ${styles.index}`}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">‹</span> Vissza
        </Link>
        <header className="app-page-heading">
          <h1>Beállítások</h1>
          <p>A fiók és a közös háztartás kezelése.</p>
        </header>

        <div className={styles.groups}>
          {settingsGroups.map((group) => (
            <section aria-labelledby={`settings-${group.id}`} key={group.id}>
              <h2 className={styles.groupTitle} id={`settings-${group.id}`}>
                {group.heading}
              </h2>
              <ul className={styles.groupList}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link className={styles.settingsLink} href={link.href}>
                      <span>{link.label}</span>
                      <span aria-hidden="true" className={styles.disclosure}>›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </AppShell>
  );
}

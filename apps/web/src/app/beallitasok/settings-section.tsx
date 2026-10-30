import Link from "next/link";
import type { ReactNode } from "react";
import AppShell from "../app-shell";
import styles from "./settings.module.css";

export default function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <main className={`app-main ${styles.detail}`}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">‹</span> Vissza
        </Link>
        <header className="app-page-heading">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </main>
    </AppShell>
  );
}

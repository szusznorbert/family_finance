# Household Finance mobilos UI — termékkutatás és tervezési alap

**Dátum:** 2026-10-26
**Cél:** konkrét mobil-első képernyőfolyam az EPIC-03-hoz, a regisztráció utáni háztartás-onboardinghoz és az admin felületek Settings alá rendezéséhez. A Cupertino stílus irány, nem iOS-másolat.

## Kutatási alap és korlát

Az Apple HIG hivatalos komponens- és platformútmutatói adják a mobil mintákat. A YNAB hivatalos súgója dokumentálja a mobil Home/Plan felületet, a hárompontos Settings & Privacy menüt és a kategória-/tranzakciós folyamatot. A Monarch hivatalos termék- és súgóoldalai a mobil dashboard widgeteit, a Cash Flow nézetet és a Reports web-only korlátját írják le. Ezeket nyilvános, valós termékfolyamatok leírásaként használtuk; nem jelentkeztem be, és nem állítom, hogy minden képernyő aktuális vizuális kialakítását közvetlenül megvizsgáltam.

## Forrásokból dokumentált tények

| Forrás | Dokumentált minta |
|---|---|
| Apple HIG: [Navigation bars](https://developer.apple.com/design/human-interface-guidelines/navigation-bars), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | A navigációs sáv az aktuális hierarchia címét és odaillő műveleteit mutatja; a tab bar kevés, gyakran használt felső szintű nézet között navigál, címkékkel. A tab navigáció, nem gyorsművelet; kerüljük a „More” túlterhelést és a nem működő/letiltott füleket. |
| Apple HIG: [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) | A grouped listák címekkel és térközzel tagolják az adatot; rövid sorok könnyen átfuthatók; hierarchián belüli navigációhoz disclosure chevron való, nem info gomb. |
| Apple HIG: [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | Sheet egy szűk, a jelenlegi kontextushoz tartozó rövid feladatot végez; több lépéses vagy hosszú tartalom önálló nézetet igényelhet. |
| Apple HIG: [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data), [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) | Ha onboarding szükséges, legyen rövid és feladatra fókuszáló. A szövegmező kapjon külön, állandó címkét; a billentyűzet, validáció és tab-sorrend igazodjon a mezőhöz. |
| Apple HIG: [Layout and safe areas](https://developer.apple.com/design/human-interface-guidelines/layout), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) | A felület alkalmazkodjon a mérethez és szövegnagyításhoz; kezelje a safe area-t és a világos/sötét megjelenést; a kontrasztot és vezérlőméretet tesztelni kell. |
| YNAB: [Create a new plan](https://support.ynab.com/en_us/creating-a-new-plan-Hyl4uc5Cq), [plan settings](https://support.ynab.com/en_us/how-to-adjust-your-plan-settings-SyFt35cAq), [transactions](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi?mobile-help=true) | A mobil Home/Plan képernyőn megjelenhet beállítási checklist; a Plan név/beállítások a Home felső hárompontos menüjéből a Settings & Privacy alá vezetnek; a tranzakciórögzítéshez külön mobilfolyamat tartozik. |
| Monarch: [Customizable dashboard and mobile transactions](https://www.monarchmoney.com/customizable-dashboard-manual-transactions), [Reports](https://help.monarch.com/hc/en-us/articles/21846787088916-Reports) | A dashboard widgetei mobilon és weben is átrendezhetők; a mobil tranzakciókat és kategóriákat kezel. A Reports leírása Cash Flow/Spending/Income részeket, időszak- és kategóriabontást dokumentál, ugyanakkor jelenleg web-onlyként jelöli a Reports funkciót. |

Az Apple HIG egyes oldalak natív iOS viselkedést írnak le. Webes alkalmazásban a mintákat responsive CSS-sel, szemantikával, billentyűzetes működéssel és böngésző safe-area változókkal kell megvalósítani; natív blur/Liquid Glass vagy SF Symbols nem előfeltétel.

## Következtetés a Household Finance termékre

**Következtetések:** a főképernyő a háztartás pénzügyi áttekintése legyen. A háztartás átnevezése, tagok, meghívók és más adminisztráció külön, egyértelműen címkézett Beállítások/Menü alá kerüljön. A regisztráció után külön, rövid és kötelező első használati útvonal kérje a háztartás létrehozását vagy meghívólinkkel csatlakozást. Az induló kategóriákat a rendszer csendben hozza létre; onboardingon nem listázzuk őket.

Ne jelenítsünk meg tervezett, de még nem létező útvonalat. Mobil alsó navigációt csak akkor mutassunk, ha legalább két tényleges főnézet elérhető: az EPIC-03-ban az Áttekintés és a Napló, miután a Napló képernyő implementálva van. Beállítások ne legyen alsó tab; a felső háztartási kontextus/profil menüből nyíljon. Kategóriakezelés a Napló/Beállítások megfelelő helyéről érhető el, nem külön tabként alapértelmezetten.

### Képernyőfolyam

1. **Regisztráció → siker:** a fiók létrejötte után irány a `/kezdes` (vagy a csapat által választott, egyértelmű onboarding route), ne a pénzügyi áttekintés.
2. **Onboarding választás:** két egyenrangú, rövid opció: „Új háztartás létrehozása” és „Meghívólinkkel csatlakozom”. Nincs kategórialista és nincs felesleges bemutató carousel.
3. **Létrehozás:** háztartásnév mező, RON mint rögzített alap pénznem, egy megerősítő művelet. A kilenc alap kategória háttérben jön létre, a felület nem sorolja fel őket.
4. **Csatlakozás:** meghívólink beillesztése/megnyitása, meglévő meghívó elfogadási folyamat; kezeli a lejárt/felhasznált linket, és megőrzi a jelenlegi egyszer használatos token fragment, no-referrer és jogosultsági szabályokat.
5. **Kész → Áttekintés:** sikeres létrehozás/elfogadás után háztartási kontextussal megnyílik a pénzügyi áttekintés.
6. **Későbbi használat:** áttekintésből Napló (csak ha a route létezik); háztartásváltás és Beállítások a felső kontextusmenüből. Beállításokból külön listás ágak: Háztartás, Tagok és meghívók, Fiók.

### Mobil vázlat — 390 CSS px viewport

Az alábbiak specifikációs vázlatok, nem pixelpontos mockupok. Safe area figyelembevétele mellett a tartalom 16 px oldalsó behúzást használ; a lap nem zsugorított desktop-form panelekből áll.

**A. Első onboarding-választás**

```text
┌──────────────────────────────────┐ 390
│  safe area                       │
│  ‹ Vissza                         │
│                                  │
│  Kezdjük a közös pénzügyeket     │
│  Hozz létre háztartást, vagy     │
│  csatlakozz meghívóval.          │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Új háztartás létrehozása  ›│  │ grouped row
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Meghívólinkkel csatlakozom ›│  │ grouped row
│  └────────────────────────────┘  │
│                                  │
│                                  │
│                                  │
│  [           Tovább            ] │ safe bottom
└──────────────────────────────────┘
```

**B. Háztartás létrehozása**

```text
┌──────────────────────────────────┐
│  ‹ Vissza             1 / 1       │
│  Háztartás neve                  │
│  Később a Beállításokban         │
│  módosítható.                    │
│  ┌────────────────────────────┐  │
│  │ pl. Szabó család           │  │ label + input
│  └────────────────────────────┘  │
│  Pénznem       RON · rögzített   │
│                                  │
│  [ Háztartás létrehozása ]       │
└──────────────────────────────────┘
```

**C. Meghívólink megadása**

```text
┌──────────────────────────────────┐
│  ‹ Vissza                        │
│  Csatlakozás meghívóval          │
│  Illeszd be a háztartástag       │
│  meghívólinkjét.                 │
│  Meghívólink                     │  persistent label
│  ┌────────────────────────────┐  │
│  │ https://…                 │  │ pasteable text
│  └────────────────────────────┘  │
│  A link egyszer használható.     │
│                                  │
│  [ Meghívó ellenőrzése ]         │
└──────────────────────────────────┘
```

**D. Pénzügyi áttekintés**

```text
┌──────────────────────────────────┐
│  safe area                       │
│  [Család neve ▾]       [Profil]  │ household context/menu
│  Áttekintés        [Október ▾]   │ large title + period
│                                  │
│  Ebben a hónapban                │
│  Kiadás                  2 450 RON│ primary figure
│  Bevétel                  7 800 RON│ secondary figure
│                                  │
│  Legutóbbi tételek       Összes ›│
│  [icon] Élelmiszer  Carrefour    │
│         ma · kiadás       −84 RON│ compact grouped row
│  [icon] Rezsi                    │
│         tegnap · kiadás −320 RON │
│                                  │
│  [ + Új tétel ]                 │ actual ledger action
│                                  │
│   Áttekintés       Napló         │ bottom tabs only when both routes exist
└──────────────────────────────────┘
```

Az összegek csak szemléltető, szintetikus értékek. Ha nincs adat, az összeg helyén egyszerű üres állapot legyen és egy valóban megvalósított „Új tétel” művelet. Ne jelenjen meg keretösszeg vagy „hátralévő budget”, mert a jelenlegi EPIC-03 scope nem vezet be költségvetés-tervezést. Kategóriák csak tényleges kategória-/naplóadatokból látszanak, nem a onboardingban.

**E. Beállítások és adminisztráció**

```text
┌──────────────────────────────────┐
│  ‹ Áttekintés                    │
│  Beállítások                     │
│  FIÓK                            │ grouped section
│  [ Név és profil             › ] │
│  [ Kijelentkezés                ]│
│                                  │
│  HÁZTARTÁS                       │
│  [ Család neve              › ] │ owner-only edit route/action
│  [ Tagok és meghívók        › ] │ role-aware rows/actions
│                                  │
│  Súgó                            │
└──────────────────────────────────┘
```

### Navigáció és responsive adaptáció

| Terület | Mobil | Tablet/desktop |
|---|---|---|
| Áttekintés | Felső safe-area sáv: háztartásváltó/kontextus + profil/menü; nagy cím; hónapválasztó; egyszerű összegzés és tömör friss tételek. Alsó, címkézett tab csak az Áttekintés és Napló létezése után. | Bal oldali navigáció/shell vagy felső nav: Áttekintés, Napló; Beállítások külön menüből. Középső tartalom max. 1100–1200 px, fő összegzés 2 oszlopra bővíthető, táblázat csak ott, ahol segíti összehasonlítást. |
| Beállítások | Menü gomb → önálló listaoldal; grouped/inset listacellák, disclosure chevronok hierarchiához; admin művelet külön nézet. | Bal oldali sidebar/oldalmenü a Settings szekcióhoz; tartalom saját pane-ben, de nem admin formok a dashboardon. |
| Onboarding | Egy lépés/képernyő, egy fő döntés; 16 px perem, címke a mező felett; fő gomb a tartalom után, safe-area fölött. Rövid feladatnál sheet használható, de létrehozás/join flow önálló route, hogy a mobil billentyűzetnek és hibáknak legyen hely. | Keskeny, középre zárt 420–480 px űrlap; nincs széles desktop kártya vagy kétoszlopos regisztrációs panel. |
| Napló | Tömör sorok (kategória/kereskedő, dátum, összeg), szűrő és új tétel valódi vezérlő; tab csak implementált route-ra. | Listatáblázat több oszloppal és szélesebb szűrőkkel; a közös adatok és műveletek mobilon részletnézetre kerülnek, nem vízszintes scrollra. |

### Cupertino-ihletésű tokenjavaslat

Kezdőértékek a designer számára; véglegesítés előtt kontrasztméréssel és valós szövegméretekkel kell ellenőrizni. CSS szemantikus neveket használjon, ne komponensenkénti ad hoc színeket.

| Token | Világos | Sötét | Használat |
|---|---|---|---|
| `--app-bg` | `#F2F2F7` | `#000000` | grouped app háttér |
| `--surface` | `#FFFFFF` | `#1C1C1E` | grouped/inset listák, inputok |
| `--surface-elevated` | `#FFFFFF` | `#2C2C2E` | rövid modal/sheet, lebegő menü |
| `--text-primary` | `#1C1C1E` | `#F2F2F7` | címek, pénzösszegek |
| `--text-secondary` | `#636366` | `#AEAEB2` | leírások, másodlagos dátum |
| `--separator` | `#D1D1D6` | `#38383A` | finom csoportosító elválasztó |
| `--accent` | `#005FCC` | `#70AFFF` | elsődleges gomb/link/fókusz |
| `--positive` | `#176B37` | `#30D158` | bevétel/siker, ikon + felirat mellett |
| `--negative` | `#B42318` | `#FF6961` | kiadás/hiba, ikon + felirat mellett |

Alap térköz: 4/8/12/16/24/32 px; mobil oldalpadding 16 px; fő tartalom max-width 1120 px; mobil touch target legalább 44×44 CSS px; 12–16 px sarkítás visszafogottan, listaelemeket ne csomagoljuk sok egymásba ágyazott kártyába. Nagy címes topbar, 44 px célok, `env(safe-area-inset-*)`, `prefers-color-scheme` és nagyított szöveggel reflow kötelező. A chevron navigációt jelent; művelethez külön gomb. Form mező mindig saját persistent labelt kap. Sheet csak rövid, kontextuális feladathoz.

## EPIC-03 task függőségek és elfogadási irány

| Task | Frissített kimenet | Függőség |
|---|---|---|
| T05 — responsive UI foundation | Főképernyő pénzügyi áttekintésként; household-context top bar; 390 px és desktop shell; sematikus grouped UI/tokenek; csak megvalósított route-ok; Beállítások nem kerül a dashboardra. | EPIC-02 kész; T01–T04 ledger/dashboard adatok implementálják az overview modulokat. UI shell önmagában nem talál ki adatot. |
| T06 — auth & invitation UI | Sign-in/register design; sikeres regisztráció navigál az onboardingba; meglévő invite acceptance flow biztonságos marad. | T05 tokenek; EPIC-02 auth/invitation contract. |
| T07 — household management UI | Household átnevezés, tagok, meghívók kizárólag Beállítások → Háztartás ágban; role/privacy rules változatlanok. | T05 shell; EPIC-02 T03–T07. |
| T08 — first-household onboarding | Külön, rövid, post-registration create-or-join útvonal; RON fix; a seeded category lista rejtve marad. | T06 regisztráció; EPIC-02 household create/select, invitation acceptance/API flow. |

### Termékkritikus acceptance

- T05: pénzügyi főképernyő nem tartalmaz household rename/admin formot; kisebb 390 px és 320 px nézeten nincs vízszintes görgetés; desktop jól kihasználja a szélességet; alul csak működő Áttekintés/Napló tab szerepel, Settings a menüben.
- T06/T08: regisztráció után az app külön onboardingra visz; onboarding két lehetőséget mutat (háztartás létrehozása vagy meghívólink elfogadása), nem sorolja fel a kilenc alap kategóriát; siker után áttekintésre lép.
- T07: háztartásnév és admin funkciók Beállítások alatt; OWNER/MEMBER/VIEWER gombjai, e-mail redaction, egyszer használatos invite, token fragment és szerver-oldali jogosultság ellenőrzése változatlan.
- Minden task: magyar nyelv, RON, 44 px tappolható cél, külön mezőcímkék, light/dark, billentyűzet/fókusz, Dynamic Type-szerű browser zoom, safe-area, reduced motion, role/privacy manuális ellenőrzés synthetic adatokkal.

## Nyitott döntések és bizonyosság

- Pontos route/label (`/kezdes`, Áttekintés/Napló/Beállítások) a designer és fejlesztés közös véglegesítése; a flow tartalma elfogadott.
- A meghívólink feldolgozása maradjon a meglévő egyszer használatos, fragment-alapú acceptance flow-ra építve; a beillesztési UX ne másolja a titkos tokent querybe vagy logba.
- Az áttekintés adattartalma T04 havi aggregátumaira és T03 friss tételeire támaszkodhat; budget/keretadatot nem feltételez.
- Korlát: nem történt moderált felhasználói teszt és nem vizsgáltunk autentikált pénzügyi alkalmazás-felületeket. A flow/értékek javaslatok a dokumentált minták és a user által megadott termékirány alkalmazásából.

Forrás-hozzáférés dátuma: 2026-10-26. A termékdokumentáció változhat.

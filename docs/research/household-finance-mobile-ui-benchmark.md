# Household finance mobil UI benchmark

**Kutatás dátuma:** 2026-10-26

**Cél:** 4 releváns app tényleges iPhone képernyőinek és hivatalosan dokumentált mobil folyamainak összevetése, majd a Household Finance számára konkrét 390 px-es design brief készítése. Ez mintabenchmark, nem „legjobb app” rangsor.

## Módszer és bizonyítékcímkék

- **Képen látható:** az Apple App Store listing iPhone screenshot carouselét 2026-10-26-án megnyitottam és vizuálisan megvizsgáltam. A linkek a jelenlegi Apple listingre és screenshot galériára visznek; az elérhető store-képek aktuálisak a hozzáféréskor, de később frissülhetnek.
- **Hivatalos leírás:** a gyártó App Store leírása, súgója vagy release oldala magyarázza a látható képernyőt/folyamatot.
- **Termékkövetkeztetés:** az alábbi saját ajánlás a források és az elfogadott Household Finance irány összekapcsolása. Nem állítom, hogy a referenciaappok pontosan ezt a mi termékünkben is így oldanák meg.

## Négy mobilapp összehasonlítása

| App és iOS listing | Képen látható minta | Hivatalos, szövegesen dokumentált mobil viselkedés | Korlát / tanulság |
|---|---|---|---|
| [Monarch Money — App Store iPhone/iPad képernyők](https://apps.apple.com/us/app/monarch-budget-track-money/id1459319842) | Két látott promóképen világos, meleg tónusú háttér előtt mobilképernyő: egyik áttekintő pénzügyi panelt és listát, másik cash-flow riportot mutat. Az összegző kártyák és chartok látványosak, de a tényleges képernyő olvasható, visszafogott listás adatot használ. | [Listing](https://apps.apple.com/us/app/monarch-budget-track-money/id1459319842) szerint testre szabható dashboardon net worth, friss tranzakciók, budget-progress, befektetés, várható költség jelenhet meg; partner/háztartástag meghívható. A [manual transaction help](https://help.monarchmoney.com/hc/en-us/articles/360058441811-Manual-transactions) mobilon a fiók vagy Transactions nézet felső `…` menüjéből indul: debit/credit, összeg, merchant, dátum, account, category, opcionális note/tag. A [Reports help](https://help.monarchmoney.com/hc/en-us/articles/21846787088916-Reports) Cash Flow/Spending/Income bontást dokumentál; ezt jelenleg web-onlynek jelöli. | US App Store listing; 7 napos próba után fizetős tagság. Bankkapcsolat és egyes funkciók régiófüggők. Jó minta áttekintéshez és mobilos tranzakciórészletekhez; túl sok dashboard-widget nálunk elnyomná a háztartási kiadások fő kérdését. A [release notes](https://apps.apple.com/us/app/monarch-budget-track-money/id1459319842) külön említik, hogy no-data chart ne hagyja üresen a debt-paydown képernyőt. |
| [YNAB — App Store iPhone/iPad képernyők](https://apps.apple.com/us/app/ynab/id1010865877) | A látott listing-képen lila/kék promókeretben egy mobil Home képernyő jelenik meg: kategóriasorok, prioritások és rövid célok; az adatrész fehér felületű, zöld hangsúlyú, sűrű, de tagolt listát mutat. A gyártó [Features](https://www.ynab.com/features) oldala jelenlegi telefonképeket is mutat — kategorizált költés, account-egyenlegek, összesítő — és képernyőleírást ad a Together Group Managerhez. | A [transaction help](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi?mobile-help=true) leírja: plusz a Home/Spending/account alján → először összeg numerikus billentyűzettel → típus → payee/category/account → dátum/részletek → mentés; fotó/memo is hozzáadható. Az új Planhez mobilos setup checklist jelenhet meg ([guide](https://support.ynab.com/en_us/creating-a-new-plan-Hyl4uc5Cq)). Csoporttagok kezelése a Home → `…` → Settings & Privacy → YNAB Together útvonalon ([guide](https://support.ynab.com/en_us/ynab-together-B1nS78Cki)); a meghívottak külön accountot kapnak, plan-megosztás választható. | 30 napos próba, majd fizetős előfizetés; US App Store listing, angol UI/store oldal. Hasznos az összeg-first gyors rögzítés, kategória-sorok és kontextus szerinti Settings. A YNAB tudatos budget/plan szemlélete nem azonos a mi MVP havi áttekintésével. |
| [Honeydue — App Store iPhone képernyők](https://apps.apple.com/us/app/honeydue-couples-finance/id1157633945) | Két aktuális listing-képen vörös promópanelben telefon: „Balances” listában partnerek/accountok avatárral és egyenleggel; mellette budget-képernyő kategóriákkal és egy kördiagrammal. A mintában a közös/páros kontextus már a képernyő elrendezéséből látszik. | [Listing](https://apps.apple.com/us/app/honeydue-couples-finance/id1157633945) leírja: partnerrel megosztott account-balance nézet, havi kategóriakeretek, bills-emlékeztető, custom category, partnerrel kapcsolatos tranzakciókomment/emoji, és szabályozható megosztás. Ez főként App Store termékleírás, nyilvános részletes onboarding vagy member-management kézikönyvet nem találtam. | Ingyenes, in-app purchase; listing szerint iPhone-only, angol és további 3 nyelv, banktámogatás „most banks in the US”. A listing 2026-10-01-i 2.84 stabilitási frissítést mutat; korábbi App Store értékelés karbantartási gondokról szól, ezért csak felületminta, nem minőségi/üzemeltetési követendő példa. |
| [Splitwise — App Store iPhone/iPad képernyők](https://apps.apple.com/us/app/splitwise/id458023433) | A látott listing-képen zöldes/sötét teal fejlécek és fehér felület: első mobilképernyő személyek és tartozás-egyenlegek listája, második csoport neve alatt ikonozott kiadási feed, soronként összeggel. A csoport/kiadás kontextus egyértelműbb, mint a személyes pénzügyi összkép. | A [Help Center](https://kb.splitwise.com/getting-started/how-do-i-use-splitwise) szerint folyamatos kiadáshoz groupot hoznak létre és meghívják a tagokat; `Add expense` kér összeget, fizetőt, dátumot; split egyenlő alapértékkel indul, de lehet pontos összeg/százalék/rész. A [group guide](https://kb.splitwise.com/groups/how-do-i-create-a-group) mobilon Groups tab → plusz (alsó gomb vagy jobb felső sarok). A [hivatalos 2015-ös iOS 4 blog](https://blog.splitwise.com/2015/06/04/announcing-splitwise-for-ios-version-4/) dokumentálja a tab bar, középső plusz, Friends/Groups/Activity/Me szerkezetet; ez történeti leírás, nem bizonyítja a mostani tab sorrendet. | Ingyenes, opcionális Pro; az App Store listing szerint receipt OCR/itemization és kategória chart Pro funkció, fizetős fizetési módok országfüggők, több mint 100 devizát támogat. Jó csoportkontextus és gyors add minta, de „ki kinek tartozik” központi logikája nincs a mi MVP-ben. |

## Összehasonlító következtetések

**A képeken ténylegesen látható:** Monarch áttekintő/charts; YNAB kategóriasorok és prioritások; Honeydue partner/account-balance lista és kategória-budget donut; Splitwise csoport feed és tartozáslista. Mind a négy képernyő mobilra rendezett, rövid sorokat és egyértelmű pénzügyi értékeket használ. A listák és az összegző vizuálok aránya eltér: Monarch charts, YNAB listák és prioritások, Honeydue kategóriaösszegzés, Splitwise aktivitás és csoporttagok.

**A hivatalos szövegből ismert, de nem minden esetben screenshoton látott:** Monarch kézi tranzakciós mezősorrendje és report elérhetősége; YNAB add/settings/invite útvonal; Honeydue megosztás/bills/chat funkciók; Splitwise group/add/split folyamat és funkciókorlátok.

**A Household Finance-re tett következtetés:** a home ne legyen Monarch-szerű többwidgetes pénzügyi portfólió, mert nincs linkelt számla/net worth/budget MVP. A pénzügyi overview-ban a havi RON kiadások és bevételek, majd a friss kiadások legyenek elsődlegesek. A YNAB gyors adatbeviteli útvonalából az összeg-first manuális tétel tanulságos; a Splitwise/honeydue csoporttudatos megjelenése támogatja, hogy a háztartás neve végig látható legyen. A household management ne legyen a főoldal hosszú adminlistája: inkább felső kontextusmenü → Beállítások → Háztartás/Tagok és meghívók. Szerepkörök és e-mail-láthatóság maradjanak a szerver által meghatározott állapot szerint.

**Korlátok:** Store screenshotok promóciós minták, nem minden app teljes képernyőfolyamát fedik le; App Store leírás nem bizonyítja minden funkció régiós elérhetőségét. Monarch és YNAB itt US storefronton látszik; Honeydue bankkapcsolat kifejezetten US fókuszú; Splitwise fizetés és OCR fizetős/régiófüggő. Nem hasonlítottam össze tényleges román bankkapcsolatokat, termék árakat vagy felhasználói elégedettséget.

## Household Finance mobil design brief (390 CSS px)

Ez vázlat, nem pixelpontos mockup. 16 px oldalsó margó, iPhone safe-area, címkék mindig láthatók, fontos tappolható cél minimum 44×44 CSS px. A kezdő kategóriák automatikusan létrejönnek, de onboardingon nem listázzuk őket. Jelenlegi termékirány: a 99%-ban fotós bizonylatbevitel cél; a fotó/receipt flow csak akkor kerül navigációba, amikor EPIC-05 ténylegesen elkészült. EPIC-03 kézi kiadásrögzítés közben is lehetővé teszi a tételekre bontást.

### 1. Onboarding: háztartás létrehozása vagy meghívó

```text
┌──────────────────────────────────────┐ 390
│ safe area                            │
│                                      │
│ Kezdjük a közös pénzügyeket          │
│ Hozz létre háztartást, vagy           │
│ csatlakozz meghívóval.                │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Új háztartás létrehozása       › │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Meghívólinkkel csatlakozom     › │ │
│ └──────────────────────────────────┘ │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

Create folyam: háztartásnév + fix RON → létrehozás → Overview. Join: invite link paste/open → meglévő safe acceptance → Overview. Nincs kategória-választás, bankkapcsolat vagy kötelező budget-beállítás.

### 2. Home / pénzügyi áttekintés

```text
┌──────────────────────────────────────┐
│ [Szabó család ▾]             [⋯]     │ household context/menu
│ Áttekintés             [Október ▾]   │ large title + period
│                                      │
│ Havi összesítés                      │
│ Kiadás                    2 450 RON  │
│ Bevétel                    7 800 RON │ actual ledger total
│                                      │
│ Kategóriák szerinti kiadás     Mind ›│
│ Élelmiszer       ███████       860   │ only real categories/data
│ Lakhatás         █████         700   │
│                                      │
│ Legutóbbi tételek            Napló › │
│ [bag] Carrefour · ma        −84 RON │
│      3 tétel                          │
│ [home] Villany · okt. 12.  −320 RON │
│                                      │
│ [ + Új tétel ]   [Fotó] if EPIC-05   │
│                                      │
│      Áttekintés        Napló          │ bottom tabs, live routes only
└──────────────────────────────────────┘
```

A számok példaértékek, nem termékállítások. Nettó egyenleget/budget-maradékot ne mutassunk, amíg annak üzleti definíciója nincs elfogadva. Receipt capture gombot csak EPIC-05 implementálás után adjuk hozzá; egyetlen „+” gomb lehet valódi manuális rögzítésre.

### 3. Kiadás hozzáadása és receipt item review

```text
┌──────────────────────────────────────┐
│ ‹ Mégse                Új kiadás      │
│ Összeg                               │
│              84,50 RON               │ amount-first keypad/input
│                                      │
│ Kereskedő                            │
│ [Carrefour____________________]      │
│ Dátum       2026. okt. 26.           │
│ Kategória   Élelmiszer            ›  │
│ Megjegyzés (opcionális)              │
│                                      │
│ Tételek                     + Tétel  │ MVP itemization
│ [Tej 1L________________]     6,50    │
│ [Kenyér_______________]     4,00    │
│                                      │
│             Mentés                   │
└──────────────────────────────────────┘
```

Receipt flow később: `[Fotó készítése] / [Kép kiválasztása]` → receipt képe + felismert kereskedő/dátum/végösszeg → szerkeszthető terméksorok (név, mennyiség, egységár, sorösszeg) → egyetlen ledger-expense mentése. A terméksorok későbbi ártrendhez tartoznak, soha nem plusz ledger kiadások. OCR/jóváhagyás a T05–T08 UI task scope-on kívüli EPIC-05.

### 4. Napló / tranzakciótörténet

```text
┌──────────────────────────────────────┐
│ Napló                   [Keresés]    │
│ [Október ▾] [Kategória ▾]           │ filter chips
│                                      │
│ OKTÓBER                              │
│ ma · Carrefour             −84 RON  │
│      Élelmiszer · 3 tétel          › │
│ okt. 12. · Villany          −320 RON │
│          Rezsi                     › │
│ okt. 10. · Fizetés        +7 800 RON │
│          Bevétel                   › │
│                                      │
│ [ + Új tétel ]                      │
│                                      │
│      Áttekintés        Napló         │
└──────────────────────────────────────┘
```

Sor tap → tétel részletei; itemized purchase-nél ott látszanak a terméksorok. Csak valós szűrőket és befejezett route-okat mutassunk. Kevés adatnál informatív üres állapot legyen, ne üres táblázat.

### 5. Settings / tagok és meghívók

```text
┌──────────────────────────────────────┐
│ ‹ Áttekintés          Beállítások     │
│ FIÓK                                 │
│ [Profil és megjelenés             ›] │
│                                      │
│ HÁZTARTÁS                            │
│ [Háztartás adatai                 ›] │
│ [Tagok és meghívók               ›] │
│                                      │
│ Tagok és meghívók                    │
│ [Név, e-mail, OWNER             ⋯ ] │ role-aware/redacted
│ [Név, e-mail, MEMBER            ⋯ ] │ email policy preserved
│ Függő meghívó                         │
│ [link… · lejárat             Vissza] │ OWNER only
│ [ + Meghívó létrehozása ]            │ OWNER only
└──────────────────────────────────────┘
```

OWNER admin műveletek a külön háztartás/beállítás oldalra kerülnek, nem a home-ra; MEMBER/VIEWER csak a saját permission szerinti lehetőségeket látja. UI nem jogosultsági határ. E-mailt csak a jelenlegi szabály szerint fedünk fel; owner transfer/leave és remove nem kap új vagy általános szerepmódosító affordance-ot.

## Javasolt navigáció és tördelés

- **Mobil:** felső safe-area app bar: aktív háztartás picker + profil/menu; fő lapok címzett bottom tab: Áttekintés és Napló, csak mindkét route létrejötte után. Add művelet gomb, nem tab. Beállítások a top-right menu-ből nyílik, grouped listás hierarchiával; chevron csak drill-in navigációt jelez.
- **Desktop:** bal oldali, 220–240 px nav/context sidebar; max. 1120 px content; Overview két oszlopra bővülhet, napló táblázatszerű sorokat kaphat. Beállítások külön section/pane, az admin formok nem kerülnek a pénzügyi home-ra. Mobil komponenseket ne zsugorítsuk desktop panelbe.
- **Vizuális ritmus:** semleges grouped app háttér, fehér/sötét surface lista, 1 akció-accent, pénzösszeg kiemelt tipográfia, finom elválasztók és sok térköz. Nincs egymásba ágyazott kártya-stack; category chart csak akkor, ha van valós, értelmes adat.
- **Receipt később:** kép- és item-review külön teljes oldalas mobil nézet; ne modal/sheet, mert több sor és hibajavítás szükséges. Sheet csak rövid választóhoz (pl. hónap vagy filter) illik.

## Ajánlások EPIC-03 taskokra

T05 maradjon közös shell + pénzügyi áttekintés vizuális alap; a tényleges összeg a T04-ből és friss tételek a T03-ból származzanak. T06/T08 tartsák meg a regisztráció utáni create-or-join onboardingot kategóriák listázása nélkül. T07 legyen a Settings → Háztartás/Tagok és meghívók IA, megtartott role/privacy szabályokkal. T03/T04 mobil elrendezéshez használják a Napló és Overview vázlatát; T02/T03 item detail contract itemized receipt row-okat egy canonical Expense alá tehet, nem új ledger expense-ekké. T05–T08 acceptance-hez érdemes felvenni manuális 390px/320px ellenőrzést és üres állapotot synthetic adatokkal.

## Források

- [Monarch iOS App Store listing/screenshot gallery](https://apps.apple.com/us/app/monarch-budget-track-money/id1459319842); [Manual transactions help](https://help.monarchmoney.com/hc/en-us/articles/360058441811-Manual-transactions); [Reports help](https://help.monarchmoney.com/hc/en-us/articles/21846787088916-Reports)
- [YNAB iOS App Store listing/screenshot gallery](https://apps.apple.com/us/app/ynab/id1010865877); [YNAB Features and mobile screenshots](https://www.ynab.com/features); [Add transactions on mobile](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi?mobile-help=true); [YNAB Together/member flow](https://support.ynab.com/en_us/ynab-together-B1nS78Cki); [New Plan onboarding](https://support.ynab.com/en_us/creating-a-new-plan-Hyl4uc5Cq)
- [Honeydue iOS App Store listing/screenshot gallery](https://apps.apple.com/us/app/honeydue-couples-finance/id1157633945)
- [Splitwise iOS App Store listing/screenshot gallery](https://apps.apple.com/us/app/splitwise/id458023433); [group and add flow](https://kb.splitwise.com/getting-started/how-do-i-use-splitwise); [create group on mobile](https://kb.splitwise.com/groups/how-do-i-create-a-group); [historical iOS v4 UI article](https://blog.splitwise.com/2015/06/04/announcing-splitwise-for-ios-version-4/)

App Store listingeket 2026-10-26-án ellenőriztem US storefrontból. Árak, screenshotok, régiós elérhetőség és szolgáltatói integrációk változhatnak.

# Vespa Tracker

Mobilní aplikace pro sledování údržby Vespa Primavera 125 „la Lulu".

---

## O aplikaci

Vespa Tracker pomáhá majiteli skútru vědět, kdy je potřeba provést servis — podle najetých kilometrů nebo podle času. Veškerá data jsou uložena lokálně na zařízení, aplikace nevyžaduje žádný účet ani připojení k internetu.

- **Platforma:** iOS (React Native / Expo)
- **Jazyk UI:** čeština
- **Verze:** 1.0.0
- **Model skútru:** Vespa Primavera 125 (2014–2024, Piaggio & C. SpA)

---

## Funkce

- Přehled nadcházejícího servisu s odpočtem km a dnů
- Kompletní timeline všech servisních milníků
- Interaktivní checklist úkolů při každém servisu
- Označení servisu jako dokončeného
- Statistiky: celkové km, dny v provozu, průměrné km/rok
- Nastavení: aktualizace km a data uvedení do provozu
- Upozornění při překročení servisního termínu

---

## Obrazovky

| Obrazovka | Popis |
|---|---|
| **Onboarding** | První spuštění — zadání data uvedení do provozu a aktuálního stavu km |
| **Přehled** | Dashboard s aktuálním stavem, countdown do servisu a mini timeline |
| **Servis** | Kompletní timeline všech servisních milníků s progress barem |
| **Nastavení** | Editace km a data, informace o aplikaci, reset dat |
| **Detail servisu** | Checklist položek, info o milníku, označení jako hotovo |

---

## Servisní plán

Aplikace vychází z oficiálního servisního manuálu Vespa Primavera 125 (2014–2024):

| Milník | Typ | Počet položek |
|---|---|---|
| 1 000 km | KM | 13 |
| 5 000 km | KM | 8 |
| 10 000 km | KM | 24 |
| 15 000 km | KM | 8 |
| 20 000 km | KM | 25 |
| 25 000 km | KM | 8 |
| 30 000 km | KM | 24 |
| Každých 12 měsíců | Čas | 15 |
| Každých 24 měsíců | Čas | 15 |

---

## Technologie

| Technologie | Verze |
|---|---|
| Expo | ~55.0.6 |
| React Native | 0.79.2 |
| React | 19.0.0 |
| Expo Router | ~55.0.5 |
| TypeScript | ^5.8.0 |
| AsyncStorage | ~2.1.2 |
| expo-blur | ~55.0.9 |
| expo-linear-gradient | ~55.0.8 |
| react-native-web | ~0.20.0 |

---

## Architektura

```
VespaApp/
├── app/
│   ├── _layout.tsx          # Root layout, font loading, routing rozhodnutí
│   ├── onboarding.tsx       # První spuštění
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Dashboard (Přehled)
│   │   ├── servis.tsx       # Seznam servisů
│   │   └── nastaveni.tsx    # Nastavení
│   └── service/[id].tsx     # Detail servisu
├── components/
│   ├── GlassCard.tsx        # Glassmorphism karta (BlurView na iOS, fallback na Android)
│   └── ServiceItemRow.tsx   # Řádek servisní položky
├── data/
│   └── maintenanceSchedule.ts  # Servisní plán z manuálu
├── hooks/
│   └── useVespaData.ts      # Hlavní hook, AsyncStorage persistence
└── utils/
    └── serviceCalc.ts       # Výpočetní logika (timeline, countdown, predikce)
```

### Správa stavu

Žádný Redux ani Context API. Stav je řízen přes:
- **`useVespaData`** hook — single source of truth, persistence do AsyncStorage
- **`useState`** — lokální UI stav v jednotlivých obrazovkách
- **`useMemo`** — odvozené výpočty z dat (timeline, next service)

### Datový model

```typescript
interface VespaData {
  commissioningDate: string;  // ISO datum uvedení do provozu
  currentKm: number;          // Aktuální stav km
  completedServices: Record<string, ServiceCompletion>;
}

interface ServiceCompletion {
  completedAt: string;   // ISO datum dokončení
  completedKm: number;   // Km při dokončení
}
```

---

## Design systém

- **Barvy:** tmavě zelená `#112116` (pozadí), jasně zelená `#19e65e` (akcent), jantarová `#f59e0b` (upcoming), modrá `#60a5fa` (dny), červená `#ef4444` (chyby)
- **Písmo:** Inter (Regular, Medium, SemiBold, Bold)
- **Komponenty:** GlassCard s iOS BlurView / Android semi-transparent fallback
- **Gradienty:** expo-linear-gradient na pozadích, tlačítkách a progress barech

---

## Spuštění lokálně

```bash
# Instalace závislostí
npm install

# iOS simulátor
npm run ios

# Android emulátor
npm run android

# Web
npm run web
```

---

## PWA (Web)

Projekt podporuje export jako Progressive Web App:

```bash
# Produkční build pro web
npx expo export --platform web
```

Výstup je ve složce `dist/` — statické soubory připravené pro nasazení na Netlify, Vercel nebo GitHub Pages.

---

## Nasazení (Vercel)

Projekt je napojen na Vercel přes GitHub. Každý push na `main` spustí automatický deployment.

Konfigurace je v `vercel.json`:
- Build command: `npx expo export --platform web`
- Output directory: `dist/`
- Rewrites: veškerý provoz směrován na `index.html` (SPA routing)

---

## Changelog

### v1.1.0 — 2026-03-13
- Odstraněn spodní tab bar, navigace přepracována na jednostránkový layout
- Obsah záložky Servis (Celkový pokrok + full timeline) sloučen do hlavní stránky pod nadpis „Přehled prohlídek"
- Přidána ikona ozubeného kola vedle km badge pro přístup do Nastavení
- Nastavení přesunuto do stack screenu s tlačítkem „← Zpět" (stejný pattern jako detail servisu)
- Countdown box „Příští servis za" zobrazuje vždy dva nezávislé údaje: nejbližší km milník a nejbližší časový milník
- Opraveno: změna km v Nastavení se nyní správně projeví na hlavní stránce po návratu (useFocusEffect + reloadData)

### v1.0.1 — 2026-03-12
- Přidán `vercel.json` pro správné nasazení na Vercel
- Přidáno `"output": "static"` do `app.json` pro korektní statický export

### v1.0.0 — 2026-03-12
- Iniciální verze aplikace
- Servisní plán Vespa Primavera 125 (2014–2024)
- Dashboard s odpočtem do servisu
- Timeline servisních milníků
- Interaktivní checklist úkolů
- Onboarding pro první spuštění
- Nastavení a reset dat

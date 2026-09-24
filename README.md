# Forma HK Metrics Panel

A Forma Site Design extension that displays early/pre-design planning metrics for Hong Kong developments. The panel reads Forma `areaMetrics`, compares against hand-entered profile limits, and shows traffic-light status with deltas.


## Cap. 123 / Cap. 123F Integration

The panel supports **dual-limit comparison** for Plot Ratio and Site Coverage:

### Profile Limits (OZP / Lease / Brief)
Your existing profile limits from OZP zoning, lease conditions, or project briefs remain the **primary** reference. These are manually entered in the Profile Editor.

### B(P)R First Schedule Limits (Cap. 123F)
Cap. 123F Building (Planning) Regulations First Schedule defines **statutory intensity ceilings** based on:
- **Site Class** (per reg 18A — number of streets the site abuts):
  - **Class A**: 1 street (least permissive for domestic)
  - **Class B**: 2 streets
  - **Class C**: 3+ streets (most permissive)
- **Use Type** (domestic or non-domestic)
- **Building Height** in metres (NOT mPD)

When you set all three in the Profile Editor, the panel will:
1. Look up the corresponding First Schedule limits
2. Show both Profile (P) and B(P)R (B) limits for PR and SC
3. Highlight the **stricter** limit and compute status against it

### Building Height Derivation

The panel can derive building height for First Schedule lookup in two ways:

1. **From tower mPD inputs** (automatic):
   - Formula: `buildingHeightM = max(tower roof mPD) - gfMpd`
   - Uses the tallest tower as the governing height
   - Requires: towers defined in profile, tower mPD values entered, gfMpd > 0
   - Shows which tower is governing in the B(P)R status panel

2. **Manual override**:
   - Set "Building Height Override (m)" in Profile Editor
   - Takes precedence over auto-derived height
   - Use when actual building height differs from mPD calculation

### Composite Buildings (reg 21(2))

For composite buildings (mixed domestic/non-domestic use), **reg 21(2) constrains the domestic PR** based on how much non-domestic PR is actually used:

```
PR_dom_max = (PR_nd_permitted - PR_nd_actual) × (PR_dom_permitted / PR_nd_permitted)
```

This is **NOT** a simple weighted average. The actual permissible domestic PR depends on how much of the non-domestic allowance is consumed.

**For early design** (before final GFA split is known), the panel shows:
- Permitted domestic PR and non-domestic PR from the schedule
- An **indicative blended PR** using the entered domestic share %
- The stricter SC (min of domestic/non-domestic)

This indicative blend is clearly labeled as **not the reg 21(2) formula** — actual compliance depends on the specific GFA split at BA submission.

To use composite mode:
1. Set **Use Type** to "Composite (mixed)"
2. Enter **Domestic GFA Share %** (0-100) for indicative blend
3. Review both permitted PR values and the indicative total

Example: Class A >61m with 60% domestic:
- Permitted PR_dom = 8.0, PR_nd = 15
- Indicative blend = 0.6×8 + 0.4×15 = 10.8
- SC = min(33.33%, 60%) = 33.33%

### Important Notes

- **Building height** is in **metres of building**, not mPD (metres Principal Datum). Tower mPD limits in the profile are for height compliance; First Schedule uses building height.
- **Forma GFA ≠ BD GFA**: Forma's gross floor area is modelling area, not Buildings Department accountable GFA under B(P)R reg 23 / PNAP APP-2. GFA concessions, exclusions, and bonus provisions are not applied.
- Traffic lights indicate **indicative** compliance only — never interpret a green light as Cap. 123 statutory approval.
- **OZP mPD checks** remain separate from First Schedule — tower height compliance uses mPD, intensity caps use metres.

### Official Sources
- [Cap. 123F Building (Planning) Regulations](https://www.elegislation.gov.hk/hk/cap123F)
- [HKLII Cap. 123F First Schedule](https://hklii.hk/en/legis/reg/123F/sch1)

## Features

- **Profile Management**: Select from built-in profiles (Central Yard, Blank) or create custom profiles
- **Live Metrics**: Reads GFA, site area, and building coverage from Forma's area metrics API
- **Traffic-Light Status**:
  - 🟢 Green: ≤100% of limit
  - 🟡 Yellow: 100–105% (toggleable)
  - 🔴 Red: >105%
- **Manual Height Input**: Enter roof mPD for height compliance checking
- **localStorage Persistence**: Profiles and settings are saved locally

## Metrics Displayed

| Metric | Description |
|--------|-------------|
| Site Area | Total site limit area (m²) |
| GFA Total | Gross Floor Area from all buildings (m²) |
| Plot Ratio | GFA ÷ Site Area |
| Site Coverage | Building Coverage ÷ Site Area |
| Height | Manual roof mPD vs tower height limits |

## Built-in Profile: Central Yard

The Central Yard profile includes the following defaults:

- Site Area: ~47,967 m²
- Max GFA: ≤150,000 m²
- Max Plot Ratio: ~3.13
- Max Site Coverage: ≤0.65
- Ground Floor mPD: 3.45
- Tower Heights:
  - T1: 47 mPD
  - T2: 50 mPD
  - T3: 50 mPD
- Min POS: ~28,750 m² (optional)
- Office:Retail ratio: ~43:57 (note only; mix bar is P1)

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm
- Access to an Autodesk Forma project

### Local Development

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd forma-hk-metrics-panel
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   This starts Vite at `http://localhost:5173`

4. Build for production:

   ```bash
   npm run build
   ```

   Output is written to the `dist/` folder.

## Loading as a Forma Extension

### Option 1: Local Development (Recommended for Testing)

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. In Autodesk Forma:
   - Open your project
   - Navigate to **Extensions** in the left sidebar
   - Click **Add Extension** → **From URL**
   - Enter: `http://localhost:5173`
   - The extension will appear as a floating panel

### Option 2: Production Deployment

1. Build the project:

   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to a static hosting service (e.g., Vercel, Netlify, Azure Static Web Apps)

3. In Autodesk Forma:
   - Open **Extensions** → **Add Extension** → **From URL**
   - Enter your deployed URL

### Required Forma Permissions

This extension uses the following Forma SDK APIs:

- `Forma.geometry.getPathsByCategory()` - to find site limits
- `Forma.areaMetrics.calculate()` - to retrieve area metrics
- `Forma.getProjectId()` - to verify Forma environment

**No additional APS (Autodesk Platform Services) authentication is required** for these read-only SDK calls when running inside Forma. The SDK handles authentication automatically through the Forma iframe context.

### If Metrics Don't Load

If you see "Not running inside Forma" error:

1. **Ensure you're loading the extension inside Forma**, not in a standalone browser tab
2. **Check that your Forma project has**:
   - At least one site limit polygon defined
   - Buildings with area metrics enabled
3. **Verify the extension URL** is accessible from your browser

If you need APS API access for advanced features (future P1/P2):

1. Register an APS application at https://aps.autodesk.com
2. Request Forma API access
3. Configure OAuth scopes for data:read

## Project Structure

```
forma-hk-metrics-panel/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Main application component
│   ├── types.ts           # TypeScript type definitions
│   ├── profiles.ts        # Profile management & defaults
│   ├── forma-api.ts       # Forma SDK integration
│   ├── metrics.ts         # Metrics calculation utilities
│   ├── style.css          # Component styles
│   └── components/
│       ├── MetricsTable.tsx    # Metrics display table
│       ├── ProfileEditor.tsx   # Profile editing modal
│       └── Disclaimer.tsx      # Disclaimer component
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Profile JSON Schema

Custom profiles follow this structure:

```typescript
type SiteClass = 'A' | 'B' | 'C';
type UseType = 'domestic' | 'non-domestic' | 'composite';

interface Profile {
  id: string;              // Unique identifier
  projectName: string;     // Display name
  siteAreaM2: number | null;    // Site area limit (m²)
  maxGfaM2: number | null;      // Max GFA limit (m²)
  maxPr: number | null;         // Max plot ratio (OZP/lease)
  maxSc: number | null;         // Max site coverage 0-1 (OZP/lease)
  gfMpd: number;                // Ground floor mPD (for height derivation)
  towers: TowerLimit[];         // Tower height limits (mPD)
  mixTargets?: MixTargetEntry[]; // GFA mix targets
  minPosM2?: number | null;     // Min POS area (m²)
  minParking?: number | null;   // Min parking spots
  sourceNote?: string;          // Reference note

  // B(P)R First Schedule fields (optional)
  siteClass?: SiteClass | null;      // B(P)R reg 18A site class (A/B/C)
  useType?: UseType | null;          // Domestic / non-domestic / composite
  buildingHeightM?: number | null;   // Manual override: building height in metres
  domesticShare?: number | null;     // For composite: domestic GFA share (0-1)
}

interface TowerLimit {
  id: string;       // Tower identifier (e.g., "T1")
  maxBhMpd: number; // Max building height in mPD
}
```

## Roadmap

### P0 (This Release)
- ✅ Project skeleton with Vite + TypeScript
- ✅ Floating panel UI
- ✅ Profile dropdown with Central Yard + Blank
- ✅ Metrics table with traffic-light status
- ✅ Forma areaMetrics integration
- ✅ Manual height input
- ✅ localStorage persistence
- ✅ Always-visible disclaimer

### P1 (Future)
- Use-mix bar (Office:Retail ratio visualization)
- POS/parking metrics
- Export summary (PDF/CSV)

### P2 (Future)
- Multi-tower height from geometry
- Profile import/export
- Optional OZP zone GIS name lookup

## License

[Specify your license here]

## Contributing

[Contribution guidelines]

# Forma HK Metrics Panel

A Forma Site Design extension that displays early/pre-design planning metrics for Hong Kong developments. The panel reads Forma `areaMetrics`, compares against hand-entered profile limits, and shows traffic-light status with deltas.


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
interface Profile {
  id: string;              // Unique identifier
  projectName: string;     // Display name
  siteAreaM2: number | null;    // Site area limit (m²)
  maxGfaM2: number | null;      // Max GFA limit (m²)
  maxPr: number | null;         // Max plot ratio
  maxSc: number | null;         // Max site coverage (0-1)
  gfMpd: number;                // Ground floor mPD
  towers: TowerLimit[];         // Tower height limits
  useMix?: boolean;             // Use mix tracking (P1)
  minPosM2?: number | null;     // Min POS area (m²)
  minParking?: number | null;   // Min parking spots
  sourceNote?: string;          // Reference note
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

# AGENTS Guide

## Project Snapshot
- Angular 21 standalone app bootstrapped via `bootstrapApplication` in `src/main.ts`.
- Root wiring lives in `src/app/app.config.ts` (router + `provideHttpClient`).
- Primary feature is `DailyPriceComponent` (`src/app/daily-price/`) rendered through router.

## Architecture + Data Flow
- Route flow: `'' -> /daily-price` in `src/app/app.routes.ts`; feature is currently eagerly referenced.
- UI state is signal-first in `src/app/daily-price/daily-price.component.ts` (`signal`, `computed`, `set`).
- Network boundary is `DailyPriceService` (`src/app/services/daily-price.service.ts`), which maps API payloads to typed app models.
- Country list is fetched first, then prices are fetched for resolved country code (`loadCountries -> loadPrices`).
- Component maintains in-memory fallbacks (`cachedCountries`, `cachedPricesByCountry`) and uses them on request errors.
- Auto-refresh runs every 60s (`startAutoRefresh`) with a silent reload path (`load({ silent: true })`).

## Project-Specific Conventions
- Follow `.github/copilot-instructions.md` as the local coding baseline.
- Use standalone components without explicitly setting `standalone: true` (Angular v20+ default).
- Prefer signals and `computed` for local state; avoid `mutate`, use `set`/`update`.
- Templates use native control flow (`@if`, `@for`) as seen in `daily-price.component.html`.
- Use `NgOptimizedImage` for static images (`<img ngSrc="/logo.webp" ...>` in `daily-price.component.html`).
- Keep API interfaces snake_case at the boundary (`ApiGoldPrice`) and map to camelCase domain types (`GoldPrice`).

## Workflows You Will Actually Use
- Install deps: `npm install`.
- Dev server (with API proxy): `npm start` (proxy config from `proxy.conf.json`).
- Build: `npm run build`; watch build: `npm run watch`.
- Unit tests (Vitest via Angular builder): `npm test`.
- Deploy hosting: `npm run deploy` (build + `firebase deploy --only hosting`).

## Integrations + Environment Behavior
- API target in dev is proxied from `/api` to DigitalOcean app via `proxy.conf.json`.
- Service runtime switch: localhost hosts use `/api/countries`; non-local hosts use absolute production URL (`resolveApiBase`).
- Firebase hosting serves SPA from `dist/gold-website/browser` with rewrite to `/index.html` (`firebase.json`).

## Known Footguns
- `src/app/app.spec.ts` still asserts default CLI title text; it does not match current UI structure.
- `DailyPriceService` still uses constructor injection for `HttpClient`; maintain consistency if refactoring nearby code.
- Global page direction is RTL (`src/styles.scss`), but UI contains mixed Arabic/English text; preserve readability and semantics.

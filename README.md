# Sri Lakshmi Venkataramana Devamandira — Scroll Darshan

A cinematic, scroll-driven Next.js website for Sri Lakshmi Venkataramana
Devamandira, Shivamogga. Scrolling scrubs a continuous AI-generated camera
flight — from the street, under the festival arch, through the hall and into
the sanctum for darshan — rendered as a WebP frame sequence on a canvas,
driven by GSAP ScrollTrigger and Lenis smooth scroll.

The film plays inside a **small framed window** over a blurred devotional
backdrop, which keeps the 720p source sharp (no full-screen upscaling); at the
final darshan the window **expands to full-screen**. The backdrop is a live
blurred copy of the current frame plus a gold vignette/mandala.

## Prerequisites

- Node.js `>=22.13.0`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm run start
```

## Structure

- `app/`: Next.js app router entry, metadata, and global styles.
- `components/experience/TempleJourney.tsx`: Scroll-driven journey — pinned
  film stage, chapter captions, rail navigation, finale, reduced-motion
  fallback.
- `components/film/FilmScrubber.ts`: Canvas frame-sequence player with
  progressive loading and adjacent-frame blending.
- `data/journey.ts`: Temple info, chapter copy, and film frame manifest.
- `hooks/`: Lenis and GSAP scroll integration.
- `public/film/`: Film frames — `d/` (1600×900 landscape, desktop) and `m/`
  (630×1120 portrait 9:16 centre-crop, phones), plus `film.mp4` render and
  `poster.jpg`. The scrubber cover-fills, so each set matches its viewport.
- `public/temple/`: Real temple photographs (chapter fallbacks and finale).
- `public/mantra/mantra.mp3`: Mantra loop used by the audio toggle.
- `video/`: Source AI clips. The flight uses `vd_1`, `vd_2`, `vd_3`, and
  `new_vd.mp4` (regenerated from vd_3's end frame so it continues the same
  temple into the deity darshan — it replaces the old `vd_4` and `vd_5`, which
  were a different-looking temple and are no longer used).

## Film Pipeline

`scripts/build-film.sh` does everything — trims the clips, joins them (daylight
fade → fadeblack threshold → a short dissolve for the seamless vd_3→new_vd
hand-off), exports 10fps WebP frames at both sizes, and writes the mp4/poster:

```bash
bash scripts/build-film.sh
```

Edit the clip list / cut / sizes at the top of that script. If the frame count
changes, update `FILM_FRAME_COUNT` in `data/journey.ts` and re-check each
chapter's `at` value lands on lit content (not a transition).

**Sharpness:** the source clips are 720p. The small framed window keeps them
sharp without upscaling; only the full-screen darshan is slightly soft. For
crisp full-screen HD, regenerate the clips at 1080p and re-run the script.

## Admin & Backend

The site includes an admin dashboard at `/admin` for managing **members**
(temple/samaja directory) and **events**. Authentication and roles come from the
external [`rbac-db`](../rbac-db) Go service; members and events are stored in
this app's own Postgres database via Drizzle.

- `db/` — Drizzle schema (`members`, `events`) and client.
- `lib/rbac.ts` — client for the rbac-db auth API (login/refresh/logout/me).
- `lib/auth.ts` — cookie session + `resolveActor()` (auto-refreshes the access
  token) + `requireAdmin()`.
- `app/api/auth/*` — login / logout / me (sets httpOnly cookies).
- `app/api/admin/{members,events}/*` — CRUD, gated to `super_admin` /
  `trust_admin`.
- `app/admin/*` — login, dashboard, members, events (sidebar shell).

### Setup

```bash
# 1. env
cp .env.example .env.local            # set DATABASE_URL and RBAC_API_URL
# 2. create the temple DB and push the schema
createdb temple_dev
npm run db:push
# 3. start rbac-db (separate repo) on :8080 and seed an admin account
#    (see ../rbac-db/README.md — super_admin is created via its seed CLI)
# 4. run this app, open http://localhost:3000/admin, sign in
npm run dev
```

`.env.local`:

```
DATABASE_URL=postgres://<user>@localhost:5432/temple_dev
RBAC_API_URL=http://localhost:8080/api/v1
```

Only `super_admin` and `trust_admin` accounts can enter the dashboard; a plain
`user` is rejected. Access tokens (15 min) auto-refresh via the refresh token
(7 days) using httpOnly cookies.

## Useful Commands

- `npm run dev`: start the Next.js development server
- `npm run build`: create a production Next.js build
- `npm run start`: run the production Next.js server
- `npm run lint`: run ESLint
- `npm test`: build and run source-level checks

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [GSAP ScrollTrigger Documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)

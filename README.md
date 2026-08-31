# Tirumala Balaji Virtual Darshan

A premium, cinematic, scroll-driven Next.js website for Lord Sri Venkateshwara
using React, Tailwind CSS, GSAP ScrollTrigger, Framer Motion, Lenis, generated
WebP scene assets, a lightweight CSS particle layer, and a looping mantra MP3.

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
- `components/experience/`: Main scroll-driven pilgrimage orchestration.
- `components/scenes/`: Reusable narrative sections for doors, temple walk,
  history, festivals, and blessing.
- `components/three/`: Full-bleed CSS ambient particle layer.
- `data/`: Chapter, timeline, and festival content.
- `hooks/`: Lenis and GSAP scroll integration.
- `public/mantra/mantra.mp3`: User-supplied mantra loop used by the audio toggle.
- `public/og.png`: Generated social preview image.

## Useful Commands

- `npm run dev`: start the Next.js development server
- `npm run build`: create a production Next.js build
- `npm run start`: run the production Next.js server
- `npm run lint`: run ESLint
- `npm test`: build and run source-level checks

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [GSAP ScrollTrigger Documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)

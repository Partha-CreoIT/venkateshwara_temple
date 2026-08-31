import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the app as a standard Next.js project", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build --webpack");
  assert.equal(packageJson.scripts.start, "next start");
  assert.ok(packageJson.dependencies.next);
  assert.ok(!packageJson.dependencies.vinext);
  assert.ok(!packageJson.devDependencies.vite);
});

test("contains the requested virtual pilgrimage scenes", async () => {
  const [experience, doors, pilgrimageData, history, festivals, blessing] =
    await Promise.all([
    readFile(
      new URL("../components/experience/PilgrimageExperience.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../components/scenes/DoorScene.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../data/pilgrimage.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../components/scenes/HistoryScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/scenes/FestivalScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/scenes/BlessingScene.tsx", import.meta.url), "utf8"),
    ]);

  const combined = `${experience}\n${doors}\n${pilgrimageData}\n${history}\n${festivals}\n${blessing}`;

  assert.match(combined, /ScrollTrigger/);
  assert.match(combined, /Garuda Mandapam/);
  assert.match(combined, /Divine Darshan/);
  assert.match(combined, /Temple history/);
  assert.match(combined, /Festivals/);
  assert.match(combined, /Govinda Govinda/);
  assert.match(combined, /temple-entrance-wall\.webp/);
  assert.match(combined, /entrance-door-left\.webp/);
  assert.match(combined, /entrance-door-right\.webp/);
  assert.match(combined, /vd-hd\.mp4/);
});

test("keeps generated imagery as project-local webp assets", async () => {
  await Promise.all([
    access(new URL("../public/images/temple-entrance-wall.webp", import.meta.url)),
    access(new URL("../public/images/entrance-door-left.webp", import.meta.url)),
    access(new URL("../public/images/entrance-door-right.webp", import.meta.url)),
    access(new URL("../public/video/vd-hd.mp4", import.meta.url)),
    access(new URL("../public/mantra/mantra.mp3", import.meta.url)),
  ]);
});

test("does not bundle React Three Fiber ambience that triggers Clock warnings", async () => {
  const particles = await readFile(
    new URL("../components/three/DivineParticles.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(particles, /@react-three\/fiber/);
  assert.doesNotMatch(particles, /THREE\.Clock|Canvas|useFrame/);
});

test("uses the project mantra MP3 as a continuous loop", async () => {
  const soundscape = await readFile(
    new URL("../components/audio/MantraSoundscape.tsx", import.meta.url),
    "utf8",
  );

  assert.match(soundscape, /src="\/mantra\/mantra\.mp3"/);
  assert.match(soundscape, /\sloop\s/);
  assert.doesNotMatch(soundscape, /speechSynthesis|SpeechSynthesisUtterance|AudioContext/);
});

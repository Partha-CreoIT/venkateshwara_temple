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

test("drops heavy legacy dependencies", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.ok(!packageJson.dependencies.three);
  assert.ok(!packageJson.dependencies["framer-motion"]);
  assert.ok(!packageJson.devDependencies?.["@types/three"]);
});

test("scroll film journey is wired end to end", async () => {
  const [journey, scrubber, data] = await Promise.all([
    readFile(
      new URL("../components/experience/TempleJourney.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../components/film/FilmScrubber.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/journey.ts", import.meta.url), "utf8"),
  ]);

  assert.match(journey, /ScrollTrigger/);
  assert.match(journey, /FilmScrubber/);
  assert.match(journey, /prefers-reduced-motion/);
  assert.match(scrubber, /createObjectURL/);
  assert.match(scrubber, /currentTime/);
  assert.match(data, /filmVideoSrc/);
  assert.match(data, /deity-darshan-highres\.jpg/);
});

test("scrub-optimised film videos exist for desktop and mobile", async () => {
  const data = await readFile(new URL("../data/journey.ts", import.meta.url), "utf8");
  const match = data.match(/filmVideoSrc = \(set: "d" \| "m"\): string => `([^`]+)`/);
  assert.ok(match, "data/journey.ts should export filmVideoSrc");

  for (const set of ["d", "m"]) {
    const src = match[1].replace("${set}", set);
    const video = await readFile(new URL(`../public${src}`, import.meta.url));
    // An ISO BMFF file starts with a size-prefixed `ftyp` box.
    assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp", `${src} is not an mp4`);
  }

  await Promise.all([
    access(new URL("../public/mantra/mantra.mp3", import.meta.url)),
    access(new URL("../public/temple/deity-darshan-highres.jpg", import.meta.url)),
  ]);
});

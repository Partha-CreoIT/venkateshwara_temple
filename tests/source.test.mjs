import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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
  assert.match(scrubber, /requestAnimationFrame/);
  assert.match(data, /FILM_FRAME_COUNT/);
  assert.match(data, /deity-darshan-highres\.jpg/);
});

/**
 * Dimensions of a simple lossy WebP: 20 bytes of RIFF/VP8 header, a 3-byte
 * frame tag and the 3-byte sync code, then 14 bits each of width and height.
 */
function webpSize(buffer) {
  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff,
  };
}

test("proxy atlases cover every frame at the declared grid", async () => {
  const data = await readFile(new URL("../data/journey.ts", import.meta.url), "utf8");
  const frameCount = Number(data.match(/FILM_FRAME_COUNT = (\d+)/)[1]);
  const cols = Number(data.match(/cols: (\d+)/)[1]);
  const rows = Math.ceil(frameCount / cols);

  for (const set of ["d", "m"]) {
    const tile = data.match(
      new RegExp(`${set}: \\{ src: "[^"]+", tileWidth: (\\d+), tileHeight: (\\d+) \\}`),
    );
    const [tileWidth, tileHeight] = [Number(tile[1]), Number(tile[2])];
    const atlas = await readFile(
      new URL(`../public/film/${set}-atlas.webp`, import.meta.url),
    );
    // A stale atlas still decodes — it just addresses the wrong tiles — so the
    // grid, not merely the file's existence, is what has to be asserted.
    assert.deepEqual(
      webpSize(atlas),
      { width: cols * tileWidth, height: rows * tileHeight },
      `public/film/${set}-atlas.webp is stale — rerun scripts/build-proxy-atlas.sh`,
    );
  }
});

test("film frame sequences exist for desktop and mobile", async () => {
  const data = await readFile(new URL("../data/journey.ts", import.meta.url), "utf8");
  const frameCount = Number(data.match(/FILM_FRAME_COUNT = (\d+)/)[1]);
  assert.ok(frameCount > 0);

  for (const set of ["d", "m"]) {
    const frames = (
      await readdir(new URL(`../public/film/${set}`, import.meta.url))
    ).filter((name) => name.endsWith(".webp"));
    assert.equal(
      frames.length,
      frameCount,
      `public/film/${set} should hold ${frameCount} webp frames`,
    );
  }

  await Promise.all([
    access(new URL("../public/mantra/mantra.mp3", import.meta.url)),
    access(new URL("../public/temple/deity-darshan-highres.jpg", import.meta.url)),
  ]);
});

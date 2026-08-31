import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

export function DoorScene() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      data-scene="doors"
      className="door-section relative z-10 min-h-screen overflow-hidden"
      aria-labelledby="door-title"
    >
      <div className="door-pin relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pb-8 pt-28 md:pt-32">
        <div className="absolute inset-0 temple-horizon" />
        <div className="absolute inset-0 door-atmosphere" aria-hidden="true" />

        <div className="pilgrimage-caption-stack">
          <motion.div
            className="door-copy scene-caption"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.9, ease: "easeOut" }}
          >
            <p className="caption-kicker">Seven hills. One sacred ascent.</p>
            <h1 id="door-title" className="hero-title">
              Lord Sri Venkateshwara
            </h1>
            <p className="caption-sub mx-auto mt-5">
              A cinematic virtual pilgrimage — threshold, corridor, sanctum,
              darshan.
            </p>
          </motion.div>

          <div className="journey-copy approach-copy scene-caption">
            <p className="caption-kicker">The Threshold</p>
            <h2 className="caption-heading">
              The great doors part — the temple breathes you in.
            </h2>
          </div>

          <div className="journey-copy pillars-copy scene-caption">
            <p className="caption-kicker">The Pillared Corridor</p>
            <h2 className="caption-heading">
              A hundred flames keep watch along the stone path.
            </h2>
          </div>

          <div className="journey-copy mandapam-copy scene-caption">
            <p className="caption-kicker">Before the Sanctum</p>
            <h2 className="caption-heading">
              Stillness deepens. The inner door draws near.
            </h2>
          </div>

          <div className="darshan-copy scene-caption">
            <p className="caption-kicker">Divine Darshan</p>
            <h2 className="darshan-title">Govinda</h2>
            <p className="caption-sub mx-auto mt-4">
              The curtain parts. Grace looks back.
            </p>
          </div>
        </div>

        <div className="cinema-stage pilgrimage-stage">
          <div className="entrance-scene" aria-hidden="true">
            <div className="temple-wall-layer">
              <Image
                src="/images/temple-entrance-wall.webp"
                alt=""
                fill
                priority
                quality={90}
                sizes="100vw"
                className="temple-entrance-image"
              />
            </div>

            <div className="temple-door-set">
              <div className="door-panel door-left">
                <Image
                  src="/images/entrance-door-left.webp"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 768px) 18rem, 36vw"
                  className="door-panel-image"
                />
              </div>
              <div className="door-panel door-right">
                <Image
                  src="/images/entrance-door-right.webp"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 768px) 18rem, 36vw"
                  className="door-panel-image"
                />
              </div>
            </div>
          </div>

          <video
            className="corridor-video"
            src="/video/vd-hd.mp4"
            muted
            playsInline
            preload="auto"
            aria-label="Journey through the temple corridor to the sanctum darshan"
          />

          <div className="threshold-glow" aria-hidden="true" />
        </div>

      </div>
    </section>
  );
}

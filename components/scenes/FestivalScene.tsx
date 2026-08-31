"use client";

import { motion, useReducedMotion } from "framer-motion";
import { festivals } from "../../data/pilgrimage";
import { SectionHeading } from "../ui/SectionHeading";

export function FestivalScene() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      data-scene="festivals"
      className="relative z-10 overflow-hidden bg-vermilion-950 px-5 py-24 md:px-10 md:py-32"
      aria-labelledby="festival-title"
    >
      <div className="absolute inset-0 festival-texture" aria-hidden="true" />
      <div className="relative">
        <SectionHeading
          eyebrow="Festivals"
          title="The hill transforms into procession, music, and offering."
        >
          Each festival changes the temple pace: streets fill, lamps multiply,
          flowers brighten the sanctum, and the Govinda chant becomes a shared
          current.
        </SectionHeading>

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 lg:grid-cols-4">
          {festivals.map((festival, index) => {
            const Icon = festival.icon;

            return (
              <motion.article
                key={festival.title}
                className="fade-rise festival-card rounded-[8px] border border-gold-100/15 bg-black/24 p-6"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{
                  duration: reducedMotion ? 0 : 0.55,
                  delay: reducedMotion ? 0 : index * 0.06,
                  ease: "easeOut",
                }}
              >
                <Icon className="mb-8 h-8 w-8 text-gold-100" aria-hidden="true" />
                <p className="mb-3 text-xs uppercase text-teal-100/75">
                  {festival.season}
                </p>
                <h3 className="font-serif text-2xl text-white">
                  {festival.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/64">
                  {festival.body}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

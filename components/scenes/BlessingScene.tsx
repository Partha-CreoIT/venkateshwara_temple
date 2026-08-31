"use client";

import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function BlessingScene() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      data-scene="blessing"
      className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 py-24"
      aria-labelledby="blessing-title"
    >
      <div className="absolute inset-0 blessing-rays" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 blessing-steps" />

      <motion.div
        className="relative z-10 mx-auto max-w-5xl text-center"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeOut" }}
      >
        <Sparkles className="mx-auto mb-8 h-9 w-9 text-gold-100" />
        <p className="mb-4 text-xs uppercase text-gold-100/70">
          Final blessing
        </p>
        <h2
          id="blessing-title"
          className="font-serif text-6xl leading-none text-white md:text-8xl"
        >
          Govinda Govinda
        </h2>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
          May the path close in peace, gratitude, and the remembrance of Lord
          Sri Venkateshwara.
        </p>
      </motion.div>
    </section>
  );
}

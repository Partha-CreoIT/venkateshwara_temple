"use client";

import { motion, useReducedMotion } from "framer-motion";
import { historyTimeline } from "../../data/pilgrimage";
import { SectionHeading } from "../ui/SectionHeading";

export function HistoryScene() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      data-scene="history"
      className="relative z-10 bg-ink-950 px-5 py-24 md:px-10 md:py-32"
      aria-labelledby="history-title"
    >
      <SectionHeading
        eyebrow="Temple history"
        title="A shrine shaped by devotion across centuries."
      >
        Tirumala is experienced as both place and practice: a sacred hill,
        a temple, a daily ritual system, and a living memory carried by
        pilgrims.
      </SectionHeading>

      <div className="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-2">
        {historyTimeline.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.article
              key={item.title}
              className="fade-rise timeline-card rounded-[8px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-sm"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{
                duration: reducedMotion ? 0 : 0.5,
                delay: reducedMotion ? 0 : index * 0.05,
                ease: "easeOut",
              }}
            >
              <Icon className="mb-6 h-7 w-7 text-gold-200" aria-hidden="true" />
              <p className="mb-3 text-xs uppercase text-teal-100/70">
                {item.period}
              </p>
              <h3 className="font-serif text-2xl text-white">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/62">
                {item.body}
              </p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

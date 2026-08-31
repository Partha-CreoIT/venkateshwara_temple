import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  children,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`mx-auto max-w-3xl ${className}`}>
      <p className="mb-4 text-xs uppercase text-gold-200/70">{eyebrow}</p>
      <h2 className="font-serif text-4xl leading-tight text-white md:text-6xl">
        {title}
      </h2>
      {children ? (
        <p className="mt-5 text-base leading-8 text-white/65 md:text-lg">
          {children}
        </p>
      ) : null}
    </div>
  );
}

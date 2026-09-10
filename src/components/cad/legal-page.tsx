import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { heading: string; body: ReactNode }[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <Link to="/" className="inline-flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
          <Shield className="size-4" />
        </span>
        <span className="font-display text-sm font-bold">CodeBlueCAD</span>
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{intro}</p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="font-display text-lg font-semibold">{section.heading}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        CodeBlueCAD is a roleplay dispatch tool and is not affiliated with any real emergency
        service.
      </p>
    </div>
  );
}

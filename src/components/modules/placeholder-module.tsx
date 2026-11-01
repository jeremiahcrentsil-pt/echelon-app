import type { LucideIcon } from "lucide-react";

type PlaceholderModuleProps = {
  title: string;
  purpose: string;
  icon: LucideIcon;
};

export function PlaceholderModule({ title, purpose, icon: Icon }: PlaceholderModuleProps) {
  return (
    <section className="mx-auto max-w-2xl animate-rise">
      <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {purpose}
      </p>
      <p className="mt-8 border-l-2 border-signal/60 pl-4 text-sm text-muted-foreground">
        Coming next in the Echelon build — this module is wired into nav so the client shell
        stays complete while Workouts ships first.
      </p>
    </section>
  );
}

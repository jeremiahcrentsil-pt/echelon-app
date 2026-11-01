"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-transform duration-300",
                active ? "scale-110" : "group-hover:scale-105",
              )}
              aria-hidden
            />
            <span className="font-medium tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link href="/workouts" className={cn("group block", className)}>
      <p className="font-display text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl">
        Echelon
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Client coaching
      </p>
    </Link>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/40 px-4 py-6 backdrop-blur-md lg:flex xl:w-64">
      <BrandMark className="mb-8 px-2 animate-fade" />
      <NavLinks className="animate-rise stagger-1" />
      <div className="mt-auto px-2 pt-8 text-xs leading-relaxed text-muted-foreground">
        Log the work. Your coach sees the signal.
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/75 px-4 py-3 backdrop-blur-md lg:hidden">
      <BrandMark />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-[min(100%,20rem)] border-border/60 bg-sidebar p-0">
          <SheetHeader className="border-b border-border/50 px-5 py-5 text-left">
            <SheetTitle className="font-display text-2xl font-bold tracking-tight">
              Echelon
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 py-4">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

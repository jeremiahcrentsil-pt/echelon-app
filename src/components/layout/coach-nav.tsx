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
import { COACH_NAV_ITEMS } from "@/lib/nav-coach";
import { cn } from "@/lib/utils";

function CoachNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Coach">
      {COACH_NAV_ITEMS.map((item) => {
        const active =
          item.href === "/coach"
            ? pathname === "/coach"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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

function CoachBrand({ className }: { className?: string }) {
  return (
    <Link href="/coach" className={cn("group block", className)}>
      <p className="font-display text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl">
        Echelon
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-signal">
        Coach tools
      </p>
    </Link>
  );
}

export function CoachSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/40 px-4 py-6 backdrop-blur-md lg:flex xl:w-64">
      <CoachBrand className="mb-8 px-2 animate-fade" />
      <CoachNavLinks className="animate-rise stagger-1" />
      <div className="mt-auto space-y-3 px-2 pt-8 text-xs leading-relaxed text-muted-foreground">
        <p>Assign plans, post content, review the roster.</p>
        <Link href="/workouts" className="font-medium text-primary hover:text-primary/80">
          ← Back to client app
        </Link>
      </div>
    </aside>
  );
}

export function CoachMobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/75 px-4 py-3 backdrop-blur-md lg:hidden">
      <CoachBrand />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Open coach navigation">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-[min(100%,20rem)] border-border/60 bg-sidebar p-0">
          <SheetHeader className="border-b border-border/50 px-5 py-5 text-left">
            <SheetTitle className="font-display text-2xl font-bold tracking-tight">
              Coach
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 py-4">
            <CoachNavLinks onNavigate={() => setOpen(false)} />
            <Link
              href="/workouts"
              onClick={() => setOpen(false)}
              className="mt-6 block px-3 text-sm text-primary"
            >
              ← Client app
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

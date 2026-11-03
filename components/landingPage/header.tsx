"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "/#id" (not "#id") so the links also work from pages other than the home page
const menuItems = [
  { name: "How it works", href: "/#how-it-works" },
  { name: "FAQs", href: "/#faqs" },
];

function getInitials(name?: string | null, email?: string | null) {
  const parts = (name || email || "?").trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export const HeroHeader = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const navRef = React.useRef<HTMLElement>(null);

  const { data: session, isPending } = authClient.useSession();

  // Floating-pill effect once the page is scrolled
  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on outside click or Escape
  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const solid = isScrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 ">
      <nav
        ref={navRef}
        aria-label="Main"
        className={cn(
          "mx-auto max-w-7xl rounded-2xl border border-transparent px-4 transition-[max-width,background-color,border-color,box-shadow] duration-300 sm:px-6",
          solid &&
            "max-w-5xl border-border/60 bg-background/80 shadow-sm backdrop-blur-lg",
        )}
      >
        <div className="flex h-14 items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr]">
          {/* Brand */}
          <Link
            href="/"
            aria-label="TeachMyAi home"
            className="text-lg font-semibold tracking-tight"
          >
            TeachMyAi
          </Link>

          {/* Desktop links, centered */}
          <ul className="hidden items-center gap-1 lg:flex">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center justify-self-end">
            {/* Desktop auth */}
            <div className="hidden items-center gap-2 lg:flex">
              {isPending ? (
                <div
                  aria-hidden
                  className="h-8 w-32 animate-pulse rounded-md bg-muted"
                />
              ) : session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer rounded-full"
                      aria-label="Account menu"
                    >
                      <Avatar className="size-8">
                        <AvatarImage
                          src={session.user.image ?? undefined}
                          alt={session.user.name ?? "Account"}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(session.user.name, session.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="truncate text-sm font-medium">
                        {session.user.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/builder">
                        <LayoutDashboard />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => authClient.signOut()}
                    >
                      <LogOut />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/signin">Login</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/builder">Get Started</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile panel */}
        {menuOpen && (
          <div
            id="mobile-menu"
            className="animate-in fade-in-0 slide-in-from-top-2 border-t pb-4 pt-2 duration-200 lg:hidden"
          >
            <ul className="flex flex-col">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-2 py-3 text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {!isPending && (
              <div className="mt-2 flex flex-col gap-2">
                {session ? (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/builder" onClick={() => setMenuOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setMenuOpen(false);
                        authClient.signOut();
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/signin" onClick={() => setMenuOpen(false)}>
                        Login
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/builder" onClick={() => setMenuOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
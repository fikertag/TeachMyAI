"use client";
import Link from "next/link";
import { CircleUserRound, Menu, User, X } from "lucide-react";
import React from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadgeCheckIcon, LogOutIcon } from "lucide-react";

const menuItems = [
  { name: "How it works", href: "#how-it-works" },
  { name: "Features", href: "#features" },
  { name: "FAQs", href: "#faqs" },
  { name: "Pricing", href: "#pricing" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const navRef = React.useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const { data: session } = authClient.useSession();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    if (!menuState) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuState(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuState]);
  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className={cn(
          "fixed z-20 w-full transition-all duration-300",
          isScrolled &&
            "bg-background/75 border-b border-black/5 backdrop-blur-lg",
        )}
        ref={navRef}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-5 lg:gap-0">
            <div className="flex w-full justify-between gap-6 lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex items-center space-x-2 text-xl font-semibold "
              >
                TeachMyAi
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-12 ">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className="text-md hover:text-accent-foreground block duration-150"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-md border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden border-none">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground text-center hover:text-accent-foreground block duration-150"
                        onClick={() => setMenuState(false)}
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {session ? (
                <>
                  <div className="hidden lg:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full hidden"
                        >
                          <CircleUserRound className="size-6" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem className="cursor-pointer ">
                            <BadgeCheckIcon />
                            <Link href="/builder" className="w-full">
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => authClient.signOut()}
                        >
                          <LogOutIcon />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-col gap-2 lg:hidden">
                    <Link href="/builder">
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full"
                      >
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full"
                      onClick={() => authClient.signOut()}
                    >
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                  <Button
                    asChild
                    variant="ghost"
                    size="default"
                    className={cn(isScrolled && "lg:hidden")}
                  >
                    <Link href="/signin">
                      <span>Login</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="default"
                    className={cn(isScrolled ? "lg:inline-flex" : "hidden")}
                  >
                    <Link href="/builder">
                      <span className="text-amber-50">Get Started</span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

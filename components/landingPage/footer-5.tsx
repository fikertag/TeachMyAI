import Link from "next/link";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "FAQs", href: "#faqs" },
  { label: "Pricing", href: "#pricing" },
  { label: "Get started", href: "/builder" },
];

export default function Footer() {
  return (
    <footer className="bg-background border-t py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            href="/"
            aria-label="go home"
            className="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            TeachMyAi
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} TeachMyAi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Terminal,
  X,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { siteConfig } from "@/lib/config/site";
import { buttonClassName } from "@/components/ui/button";

interface AuthUserState {
  id: string;
  name: string;
  email: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUserState | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Check auth status
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (isMounted) {
          setUser(data.user ?? null);
          setLoadingAuth(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoadingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg py-1 focus-visible:outline-none"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-surface text-accent shadow-xs transition-transform duration-150 group-hover:scale-105">
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {siteConfig.name}
            </span>
            <span className="hidden text-[11px] leading-none text-muted sm:block">
              {siteConfig.tagline}
            </span>
          </div>
        </Link>

        {/* Desktop Single Clear Link & Actions */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/#how-it-works"
            className="text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            How it works
          </Link>

          {!loadingAuth && user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "gap-1.5 font-normal",
                })}
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
                <span className="max-w-[120px] truncate">{user.name || "Dashboard"}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out of account"
                className={buttonClassName({
                  variant: "ghost",
                  size: "sm",
                  className: "px-2 text-muted hover:text-error-text cursor-pointer",
                })}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : loadingAuth ? (
            <div className="h-8 w-16 rounded-md bg-subtle/50 animate-pulse" />
          ) : null}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-foreground cursor-pointer"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 sm:hidden animate-card-enter shadow-lg">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-2">
            <Link
              href="/#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-subtle hover:text-foreground transition-colors"
            >
              How it works
            </Link>

            {!loadingAuth && user ? (
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "md",
                    className: "w-full justify-start gap-2",
                  })}
                >
                  <LayoutDashboard className="h-4 w-4 text-accent" />
                  <span>Dashboard ({user.name})</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className={buttonClassName({
                    variant: "ghost",
                    size: "md",
                    className: "w-full justify-start gap-2 text-error-text",
                  })}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}

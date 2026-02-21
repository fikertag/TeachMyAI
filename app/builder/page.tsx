"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bot, Plus, Sparkles } from "lucide-react";
import { sileo } from "sileo";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt?: string;
};

const MAX_SERVICES = 3;

export default function BuilderPage() {
  const router = useRouter();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const hasServices = services.length > 0;
  const hasReachedMaxServices = services.length >= MAX_SERVICES;

  const loadServices = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/service", { method: "GET" });
      const data = (await res.json()) as {
        services?: Service[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to load services");
      }

      setServices(data.services ?? []);
      if ((data.services?.length ?? 0) > 0) {
        setShowCreateForm(false);
      }
      if ((data.services?.length ?? 0) >= MAX_SERVICES) {
        setShowCreateForm(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load services");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    if (!error) return;
    sileo.error({
      title: "Error",
      description: error,
      fill: "oklch(0.9779 0.0042 56.38)",
      styles: {
        title: "text-destructive!",
        description: "text-[oklch(0.4563_0.0061_48.59)]!",
      },
    });
  }, [error]);

  useEffect(() => {
    if (!success) return;
    sileo.success({
      title: "Success",
      description: success,
      fill: "#98785d",
      styles: {
        description: "text-[#e3e0d8]!",
      },
    });
  }, [success]);

  const createService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Service name is required");
      return;
    }

    if (hasReachedMaxServices) {
      setError(`Service limit reached (${MAX_SERVICES}/${MAX_SERVICES})`);
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
        }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to create service");
      }

      setName("");
      setSlug("");
      setDescription("");
      setShowCreateForm(false);
      setSuccess("Service created");
      await loadServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create service");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-muted">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.12),transparent_35%),radial-gradient(circle_at_80%_0%,hsl(var(--accent)/0.12),transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Card className="mb-6 border-primary/20 bg-linear-to-br from-background via-background to-primary/5">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                AI Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Builder</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create and manage your AI services.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground">
                <Bot className="size-4" />
                {services.length}/{MAX_SERVICES} services
              </div>

              {!isLoading && hasServices ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm((v) => !v)}
                >
                  <Plus className="size-4" />
                  {showCreateForm ? "Close" : "Create new service"}
                </Button>
              ) : null}

              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowSignOutDialog(true)}
              >
                Sign Out
              </Button>
              {/* Sign Out Confirmation Dialog */}
              <Dialog
                open={showSignOutDialog}
                onOpenChange={setShowSignOutDialog}
              >
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Confirm Sign Out</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to sign out?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-3 mt-4 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignOutDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowSignOutDialog(false);
                        authClient.signOut({
                          fetchOptions: {
                            onSuccess: () => {
                              router.push("/signin");
                            },
                          },
                        });
                      }}
                    >
                      Sign Out
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading services</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-30 animate-pulse rounded-lg border bg-background/70"
                />
              ))}
            </CardContent>
          </Card>
        ) : services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="space-y-5 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <Bot className="size-7" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Create your AI
              </h2>
              <p className="mx-auto max-w-lg text-sm text-muted-foreground">
                You don&apos;t have services yet. Start by creating your first
                one and make it ready for knowledge, API access, and embed.
              </p>
              <div>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  disabled={hasReachedMaxServices}
                  className="text-white"
                >
                  <Plus className="size-4" />
                  Create first service
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Bots</CardTitle>
              <CardDescription>
                Pick a bot to open details and actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {services.map((service) => (
                <Link key={service.id} href={`/builder/${service.id}`}>
                  <div className="group rounded-lg border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium tracking-tight">
                        {service.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{service.slug}
                      </p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {service.description || "No description"}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Open service
                      <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="border-primary/20 bg-linear-to-b from-background to-primary/5 sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create service</DialogTitle>
              <DialogDescription>
                Add a new AI service and configure it later. Limit:{" "}
                {MAX_SERVICES} services.
              </DialogDescription>
            </DialogHeader>

            {hasReachedMaxServices ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                You reached the maximum number of services ({MAX_SERVICES}).
                Delete one to create a new service.
              </p>
            ) : null}

            <form onSubmit={createService} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="service-name">Name</Label>
                <Input
                  id="service-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My tutoring bot"
                  disabled={isCreating || hasReachedMaxServices}
                  className="bg-background"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-slug">Slug (optional)</Label>
                <Input
                  id="service-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-tutoring-bot"
                  disabled={isCreating || hasReachedMaxServices}
                  className="bg-background"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this service helps with"
                  disabled={isCreating || hasReachedMaxServices}
                  className="bg-background"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isCreating || hasReachedMaxServices}
                  className="text-white"
                >
                  {isCreating ? "Creating..." : "Create service"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadServices()}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

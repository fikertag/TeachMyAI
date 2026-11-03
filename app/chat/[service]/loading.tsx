export default function ChatLoading() {
  return (
    <div className="h-svh">
      <div className="mx-auto flex h-svh w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6">
        <div className="flex h-full min-h-0 flex-1 flex-col border-0 bg-transparent -my-6">
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-0">
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-full flex-col gap-4 px-6 pb-6 pt-4">
                <div className="flex h-full flex-col justify-center my-auto pb-20 gap-6 animate-pulse">
                  {/* Service Title & Description Skeleton */}
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="h-10 w-64 rounded-xl bg-muted" />
                    <div className="h-4 w-96 max-w-full rounded-md bg-muted/70" />
                  </div>

                  {/* Quick Prompts Skeleton */}
                  <div className="grid gap-3 sm:grid-cols-3 mt-5">
                    <div className="h-24 rounded-xl border bg-muted/30 p-4 space-y-2.5">
                      <div className="h-4 w-28 rounded bg-muted" />
                      <div className="h-3 w-40 rounded bg-muted/60" />
                    </div>
                    <div className="h-24 rounded-xl border bg-muted/30 p-4 space-y-2.5">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-36 rounded bg-muted/60" />
                    </div>
                    <div className="h-24 rounded-xl border bg-muted/30 p-4 space-y-2.5">
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-3 w-44 rounded bg-muted/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Input Skeleton */}
            <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur">
              <div className="mx-auto w-full max-w-4xl px-4 py-4">
                <div className="h-12 w-full rounded-xl border border-muted bg-muted/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

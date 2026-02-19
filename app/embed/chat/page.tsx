import EmbedChatClient from "./widget-client";

export default async function EmbedChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.service;
  const serviceId = (Array.isArray(raw) ? raw[0] : (raw ?? "")).trim();

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-transparent ">
      <div className="h-[min(520px,100dvh)] w-[min(360px,100vw)] overflow-hidden ">
        <EmbedChatClient serviceId={serviceId} />
      </div>
    </div>
  );
}

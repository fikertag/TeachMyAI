import EmbedChatClient from "./widget-client";

export default async function EmbedChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.service;
  const serviceId = (Array.isArray(raw) ? raw[0] : (raw ?? "")).trim();

  return <EmbedChatClient serviceId={serviceId} />;
}

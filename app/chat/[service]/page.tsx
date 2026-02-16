import ChatClient from "./ChatClient";

export default async function Default({
  params,
}: {
  params: Promise<{ service: string }>;
}) {
  const { service } = await params;
  return <ChatClient slug={service} />;
}

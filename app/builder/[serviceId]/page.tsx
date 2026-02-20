import ServiceDetailsView from "./service-details-view-refactored";

export default async function BuilderServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;

  return <ServiceDetailsView serviceId={serviceId} />;
}

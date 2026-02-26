import { notFound } from "next/navigation";
import {
  getClientBySlug,
  getPendingAssetsForClient,
  getUpcomingEventsForClient,
  getOnboardingItemsForClient,
  getRevisionRequestedAssetsWithLastComment,
  getCreativesWithCommentsForClient,
  getApprovedCreativesCount,
  getApprovedAssetsGroupedByDemand,
  fetchAsaasFinancialData,
} from "./portal-data";
import { PortalView } from "./portal-view";

type Props = {
  params: Promise<{ client_slug: string }>;
};

export default async function PortalClientPage({ params }: Props) {
  const { client_slug: clientSlug } = await params;
  const client = await getClientBySlug(clientSlug);
  if (!client) notFound();

  let displayClient = client;
  if (client.asaas_customer_id) {
    try {
      const asaasData = await fetchAsaasFinancialData(client.asaas_customer_id);
      if (asaasData) {
        displayClient = {
          ...client,
          ad_budget_used: asaasData.budgetUsed,
          next_billing_date: asaasData.nextBillingDate,
        };
      }
    } catch {
      // Fallback: usa ad_budget_used e next_billing_date do banco
    }
  }

  const [
    pendingAssets,
    upcomingEvents,
    onboardingItems,
    revisionRequested,
    creativesWithComments,
    approvedCreatives,
    approvedAssetsGrouped,
  ] = await Promise.all([
    getPendingAssetsForClient(client.id),
    getUpcomingEventsForClient(client.id),
    getOnboardingItemsForClient(client.id),
    getRevisionRequestedAssetsWithLastComment(client.id),
    getCreativesWithCommentsForClient(client.id),
    getApprovedCreativesCount(client.id),
    getApprovedAssetsGroupedByDemand(client.id),
  ]);

  return (
    <PortalView
      client={displayClient}
      clientSlug={clientSlug}
      pendingAssets={pendingAssets}
      upcomingEvents={upcomingEvents}
      onboardingItems={onboardingItems}
      revisionRequested={revisionRequested}
      creativesWithComments={creativesWithComments}
      approvedCreatives={approvedCreatives}
      approvedAssetsGrouped={approvedAssetsGrouped}
    />
  );
}

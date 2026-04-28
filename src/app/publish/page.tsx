
import { PublishClient } from "../../components/publish-client";

interface PublishPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const params = (await searchParams) ?? {};
  return <PublishClient initialKind={parseSingle(params.kind)} initialTicketCategory={parseSingle(params.category)} />;
}

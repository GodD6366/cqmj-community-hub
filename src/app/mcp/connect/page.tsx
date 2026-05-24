import { redirect } from "next/navigation";

interface McpConnectPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function encodeSearchParams(params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, item);
    } else if (value !== undefined) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export default async function McpConnectPage({ searchParams }: McpConnectPageProps) {
  redirect(`/skill/connect${encodeSearchParams((await searchParams) ?? {})}`);
}

import { redirect } from "next/navigation";
import { McpConnectClient } from "@/components/mcp-connect-client";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { getAppOrigin } from "@/lib/app-origin";
import { ensureUserMcpAccess } from "@/lib/mcp-auth";

interface McpConnectPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function McpConnectPage({ searchParams }: McpConnectPageProps) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    redirect("/login?next=/mcp/connect");
  }

  const [{ token, user }, appOrigin, params] = await Promise.all([
    ensureUserMcpAccess(currentUser.id),
    getAppOrigin(),
    searchParams,
  ]);

  return (
    <McpConnectClient
      currentUser={user}
      endpoint={`${appOrigin}/mcp`}
      initialToken={token}
      welcome={parseSingle(params?.welcome) === "1"}
    />
  );
}

import { headers } from "next/headers";

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalLikeOrigin(value: string) {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

function extractOriginFromHeaders(headerList: Headers) {
  const forwardedProto = headerList.get("x-forwarded-proto");
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost ?? headerList.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function getAppOrigin() {
  const requestOrigin = normalizeOrigin(extractOriginFromHeaders(await headers()));
  const envOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (!envOrigin) {
    return requestOrigin;
  }

  const normalizedEnvOrigin = normalizeOrigin(envOrigin);
  if (isLocalLikeOrigin(normalizedEnvOrigin) && !isLocalLikeOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return normalizedEnvOrigin;
}

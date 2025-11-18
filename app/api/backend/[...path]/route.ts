import { NextRequest } from "next/server";

const TARGET_BASE =
  process.env.BACKEND_BASE_URL || "http://41.220.20.218:5000";

function buildTargetUrl(path: string[], req: NextRequest): string {
  const joinedPath = path?.length ? `/${path.join("/")}` : "";
  const search = req.nextUrl.search ? req.nextUrl.search : "";
  return `${TARGET_BASE}${joinedPath}${search}`;
}

async function forward(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    // @ts-expect-error: duplex is required by Node fetch for streaming bodies
    duplex: "half",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body as any;
  }

  // Primary request
  let targetUrl = buildTargetUrl(path, req);
  let res = await fetch(targetUrl, init);

  // Fallback: try with "/api" prefix if upstream returns 404 and base doesn't already include it
  const baseHasApi =
    /\/api\/?$/.test(TARGET_BASE) || /\/api\//.test(TARGET_BASE);
  if (
    res.status === 404 &&
    !baseHasApi &&
    (req.method === "GET" || req.method === "HEAD")
  ) {
    const joinedPath = path?.length ? `/${path.join("/")}` : "";
    const search = req.nextUrl.search ? req.nextUrl.search : "";
    const fallbackUrl = `${TARGET_BASE}/api${joinedPath}${search}`;
    const fallbackRes = await fetch(fallbackUrl, init);
    if (fallbackRes.ok || fallbackRes.status !== 404) {
      res = fallbackRes;
      targetUrl = fallbackUrl;
    }
  }

  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete("access-control-allow-origin");
  responseHeaders.delete("access-control-allow-credentials");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(req, context);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(req, context);
}

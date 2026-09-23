import { NextResponse } from "next/server";

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory
const mediaCache = new Map<string, CacheEntry>();

const EDGE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=86400",
  "Vercel-CDN-Cache-Control": "public, s-maxage=86400",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!fileId || typeof fileId !== "string" || !fileId.trim()) {
    return NextResponse.json({ error: "Missing or invalid file_id" }, { status: 400 });
  }

  const cleanFileId = fileId.trim();
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const wantsRedirect = searchParams.get("redirect") === "true";

  // 1. Check in-memory cache
  const cached = mediaCache.get(cleanFileId);
  if (cached && cached.expiresAt > now) {
    if (wantsRedirect) {
      return NextResponse.redirect(cached.url, { status: 302, headers: EDGE_CACHE_HEADERS });
    }
    return NextResponse.json({ url: cached.url }, { headers: EDGE_CACHE_HEADERS });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${cleanFileId}`);
    const data = await res.json();

    if (!data.ok || !data.result?.file_path) {
      return NextResponse.json(
        { error: data.description ?? "Failed to retrieve file from Telegram" },
        { status: 404 }
      );
    }

    const cdnUrl = `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;

    // Cache in-memory
    mediaCache.set(cleanFileId, {
      url: cdnUrl,
      expiresAt: now + CACHE_TTL_MS,
    });

    if (wantsRedirect) {
      return NextResponse.redirect(cdnUrl, { status: 302, headers: EDGE_CACHE_HEADERS });
    }

    return NextResponse.json({ url: cdnUrl }, { headers: EDGE_CACHE_HEADERS });
  } catch (err) {
    console.error(`Media resolution failed for file_id: ${cleanFileId}`, err);
    return NextResponse.json({ error: "Internal error resolving media" }, { status: 500 });
  }
}

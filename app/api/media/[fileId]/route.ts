import { NextResponse } from "next/server";

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
const mediaCache = new Map<string, CacheEntry>();

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

  // Check in-memory cache
  const cached = mediaCache.get(cleanFileId);
  if (cached && cached.expiresAt > now) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("redirect") === "true") {
      return NextResponse.redirect(cached.url, { status: 302 });
    }
    return NextResponse.json({ url: cached.url });
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

    // Cache the resolved URL
    mediaCache.set(cleanFileId, {
      url: cdnUrl,
      expiresAt: now + CACHE_TTL_MS,
    });

    const { searchParams } = new URL(request.url);
    if (searchParams.get("redirect") === "true") {
      return NextResponse.redirect(cdnUrl, { status: 302 });
    }

    return NextResponse.json({ url: cdnUrl });
  } catch (err) {
    console.error(`Media resolution failed for file_id: ${cleanFileId}`, err);
    return NextResponse.json({ error: "Internal error resolving media" }, { status: 500 });
  }
}
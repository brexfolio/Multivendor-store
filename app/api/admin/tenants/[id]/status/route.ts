import { NextResponse } from "next/server";
import { verifyTelegramInitData, extractInitData, isPlatformAdmin } from "@/lib/telegramAuth";
import { updateTenantStatus, getTenantById } from "@/lib/tenant";
import type { TenantStatus } from "@/types/tenant";

const VALID_STATUSES: TenantStatus[] = ["pending_approval", "active", "rejected", "suspended", "trial"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  let verified = verifyTelegramInitData(initData);

  if (!verified && process.env.NODE_ENV === "development") {
    verified = {
      user: { id: Number(process.env.ADMIN_TELEGRAM_ID || 1084144032), first_name: "Dev Admin" },
      authDate: Math.floor(Date.now() / 1000),
    };
  }

  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(verified.user.id);
  const isSuper = await isPlatformAdmin(userId);
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: Super-admin only" }, { status: 403 });
  }

  const status = body.status as TenantStatus;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const rejectionReason = typeof body.rejection_reason === "string" ? body.rejection_reason.trim() : null;

  try {
    const existing = await getTenantById(id);
    if (!existing) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const updated = await updateTenantStatus(id, status, {
      rejection_reason: rejectionReason,
      reviewed_by: userId,
    });

    return NextResponse.json({ tenant: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update tenant status" }, { status: 500 });
  }
}

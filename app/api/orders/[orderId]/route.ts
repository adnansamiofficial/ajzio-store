import { NextRequest, NextResponse } from "next/server";
import { storefrontFetch } from "@/lib/api";
export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const id = encodeURIComponent(params.orderId);
    return NextResponse.json(await storefrontFetch(`/orders/${id}`));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to find order" }, { status: 502 });
  }
}
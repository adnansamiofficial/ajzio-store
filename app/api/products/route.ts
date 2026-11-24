import { NextResponse } from "next/server";
import { storefrontFetch } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await storefrontFetch("/products")); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to load products" }, { status: 502 }); }
}
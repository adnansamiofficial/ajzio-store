import { NextRequest, NextResponse } from "next/server";
import { storefrontFetch } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ["productId","customerName","customerPhone","customerAddress","customerDivision","customerDistrict","customerArea","sellingPrice"];
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return NextResponse.json({ error: `Missing required field: ${key}` }, { status: 400 });
      }
    }
    if (typeof body.sellingPrice !== "number" || !Number.isFinite(body.sellingPrice)) {
      return NextResponse.json({ error: "Selling price must be a number." }, { status: 400 });
    }
    const result = await storefrontFetch("/orders", { method: "POST", body: JSON.stringify(body) });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Order could not be submitted" }, { status: 502 });
  }
}
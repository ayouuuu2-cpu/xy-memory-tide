import { NextResponse } from "next/server";
import { resolveGeocodeQuery } from "@/lib/geocode-resolve";

/**
 * GET /api/geocode?q=…
 * Multi-provider chain (Open-Meteo → Photon → Nominatim); no per-city hardcoded table.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().replace(/\s+/g, " ");
  if (!q || q.length > 220) {
    return NextResponse.json({ error: "Missing or invalid query." }, { status: 400 });
  }

  const email = process.env.NOMINATIM_CONTACT_EMAIL?.trim();
  const nominatimEmailSuffix = email ? `&email=${encodeURIComponent(email)}` : "";

  try {
    const hit = await resolveGeocodeQuery(q, nominatimEmailSuffix);

    if (!hit) {
      return NextResponse.json(
        {
          error:
            "No place matched after trying several geocoders. Check spelling or paste decimal coordinates (e.g. 35.68, 139.76).",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      lat: hit.lat,
      lng: hit.lng,
      displayName: hit.displayName,
      source: hit.provider,
    });
  } catch {
    return NextResponse.json({ error: "Geocoding failed unexpectedly." }, { status: 502 });
  }
}

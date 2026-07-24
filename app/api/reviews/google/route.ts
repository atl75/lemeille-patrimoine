import { NextResponse } from "next/server";
import { readJSON } from "@/lib/utils";

export async function GET() {
  const KEY = process.env.GOOGLE_PLACES_API_KEY;
  const PLACE_ID = process.env.GOOGLE_PLACE_ID;
  try {
    if (!KEY || !PLACE_ID) {
      // fallback JSON local (lu au runtime depuis data/, comme le reste du site)
      const data = await readJSON("reviews.json");
      return NextResponse.json({ source:"local", rating: data?.length? (data.reduce((s:any,r:any)=>s+(r.rating||0),0)/data.length).toFixed(1): null, total: data?.length||0, reviews: data||[] });
    }
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total,reviews&key=${KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    const res = j?.result || {};
    const reviews = (res.reviews||[])
      .filter((rv:any)=>rv.rating>=4)
      .slice(0,6)
      .map((rv:any)=>({
        author: rv.author_name,
        rating: rv.rating,
        text: rv.text,
        time: rv.relative_time_description,
      }));
    return NextResponse.json({
      source: "google",
      rating: res.rating || null,
      total: res.user_ratings_total || (reviews?.length||0),
      reviews
    });
  } catch (e:any) {
    return NextResponse.json({ source:"error", error: e?.message||"unknown", reviews: [] }, { status: 500 });
  }
}

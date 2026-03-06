// ZAUTH Vector Verification Endpoint
// Required by ZAUTH tech for domain ownership verification

export async function GET() {
  return Response.json({
    token: "a91ac15773b4bf46085363711772201475acf87e201793536d69f881d9c310b9"
  })
}

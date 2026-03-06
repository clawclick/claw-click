// ZAUTH Vector Verification Endpoint
// Required by ZAUTH tech for domain ownership verification
// Accessible at: /.well-known/vector-verify (via Next.js rewrite)

export async function GET() {
  return Response.json({
    token: "a91ac15773b4bf46085363711772201475acf87e201793536d69f881d9c310b9"
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}

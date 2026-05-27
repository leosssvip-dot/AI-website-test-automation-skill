export async function GET() {
  return Response.json([{ id: "p1", name: "Launch Plan" }]);
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ id: "p2", name: body.name }, { status: 201 });
}

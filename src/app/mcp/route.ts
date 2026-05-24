function gone() {
  return Response.json(
    {
      error: "MCP access has been replaced by the Community Hub Skill.",
      skillConnectUrl: "/skill/connect",
      skillApiBase: "/api/skill",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}

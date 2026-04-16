import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const session = await db.evaluationSession.findUnique({
    where: { id },
    include: {
      assets: true,
      proposalExtraction: true,
      codeExtraction: true,
      evaluationResult: {
        include: {
          scores: {
            include: { criterion: { include: { template: true } } },
          },
        },
      },
      createdBy: { select: { name: true, email: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!session) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: session });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const session = await db.evaluationSession.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update" },
      { status: 500 }
    );
  }
}

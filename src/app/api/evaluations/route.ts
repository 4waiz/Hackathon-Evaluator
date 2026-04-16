import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const sessions = await db.evaluationSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      evaluationResult: true,
      assets: true,
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ success: true, data: sessions });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();

    const teamName = formData.get("teamName") as string;
    const university = formData.get("university") as string || "";
    const members = formData.get("members") as string || "";
    const category = formData.get("category") as string || "AI Smart Worker Assistant";
    const demoUrl = formData.get("demoUrl") as string || "";
    const videoUrl = formData.get("videoUrl") as string || "";
    const notes = formData.get("notes") as string || "";
    const proposalFile = formData.get("proposalFile") as File | null;
    const codeFile = formData.get("codeFile") as File | null;
    const githubUrl = formData.get("githubUrl") as string || "";

    if (!teamName) {
      return NextResponse.json(
        { success: false, error: "Team name is required" },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "uploads", uuid());
    await mkdir(uploadDir, { recursive: true });

    // Create session
    const session = await db.evaluationSession.create({
      data: {
        teamName,
        university,
        members: members ? JSON.stringify(members.split(",").map((m: string) => m.trim())) : "[]",
        category,
        demoUrl,
        videoUrl,
        notes,
        status: "draft",
        createdById: user.id,
      },
    });

    // Handle proposal file
    if (proposalFile) {
      const bytes = await proposalFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = proposalFile.name.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `proposal.${ext}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);

      const assetType = ext === "pdf" ? "proposal_pdf" : "proposal_pptx";

      await db.submissionAsset.create({
        data: {
          sessionId: session.id,
          type: assetType,
          filename: proposalFile.name,
          filepath,
          filesize: buffer.length,
          mimeType: proposalFile.type,
        },
      });
    }

    // Handle code file
    if (codeFile) {
      const bytes = await codeFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = "code.zip";
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);

      await db.submissionAsset.create({
        data: {
          sessionId: session.id,
          type: "code_zip",
          filename: codeFile.name,
          filepath,
          filesize: buffer.length,
          mimeType: codeFile.type,
        },
      });
    }

    // Handle GitHub URL
    if (githubUrl) {
      await db.submissionAsset.create({
        data: {
          sessionId: session.id,
          type: "code_github",
          filename: githubUrl,
          githubUrl,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        action: "session_created",
        details: JSON.stringify({ teamName, hasProposal: !!proposalFile, hasCode: !!codeFile || !!githubUrl }),
      },
    });

    return NextResponse.json({ success: true, data: { id: session.id } });
  } catch (error) {
    console.error("Create evaluation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create evaluation" },
      { status: 500 }
    );
  }
}

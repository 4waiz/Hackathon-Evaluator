import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST() {
  try {
    // Check if already seeded
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@hackeval.dev" },
    });
    if (existingAdmin) {
      return NextResponse.json({ message: "Database already seeded" });
    }

    // Users
    const admin = await db.user.create({
      data: {
        email: "admin@hackeval.dev",
        name: "Admin User",
        passwordHash: hashPassword("admin123"),
        role: "admin",
      },
    });

    await db.user.create({
      data: {
        email: "evaluator@hackeval.dev",
        name: "Evaluator",
        passwordHash: hashPassword("eval123"),
        role: "evaluator",
      },
    });

    // Judge Evaluation Template
    const judgeTemplate = await db.rubricTemplate.create({
      data: {
        id: "judge-eval-default",
        name: "Judge Evaluation",
        category: "judge_evaluation",
        description: "Standard evaluation criteria for judge panel assessment (60% of final score)",
        isDefault: true,
      },
    });

    const judgeCriteria = [
      { name: "Applicability", description: "How well the project demonstrates potential to solve the problems related to the proposed challenge", weight: 1.0, sortOrder: 1 },
      { name: "Prototype Quality", description: "The quality of the prototype shown in the demonstration, particularly its functionalities", weight: 1.0, sortOrder: 2 },
      { name: "Technical Feasibility", description: "How technically viable the solution is for implementation and whether it can truly scale", weight: 1.0, sortOrder: 3 },
      { name: "Entrepreneurship and Originality", description: "The extent to which the solution shows boldness and takes risks, rather than merely replicating existing solutions", weight: 1.0, sortOrder: 4 },
      { name: "Teamwork and Collaboration", description: "How well the team acts as a true team while pitching their ideas", weight: 1.0, sortOrder: 5 },
    ];

    for (const c of judgeCriteria) {
      await db.rubricCriterion.create({
        data: {
          id: `judge-${c.sortOrder}`,
          templateId: judgeTemplate.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: c.sortOrder,
        },
      });
    }

    // Code Review Template
    const codeTemplate = await db.rubricTemplate.create({
      data: {
        id: "code-review-default",
        name: "Code Review",
        category: "code_review",
        description: "Technical code review criteria (40% of final score)",
        isDefault: true,
      },
    });

    const codeCriteria = [
      { name: "Code Quality", description: "Code style, consistency, error handling, and patterns", weight: 1.0, sortOrder: 1 },
      { name: "Architecture Quality", description: "Separation of concerns, modularity, scalability design", weight: 1.0, sortOrder: 2 },
      { name: "Documentation / Readability", description: "README, comments, API docs, setup instructions", weight: 1.0, sortOrder: 3 },
      { name: "Security and Robustness", description: "Authentication, input validation, error handling, secrets management", weight: 1.0, sortOrder: 4 },
      { name: "AI Implementation Relevance", description: "How central and well-implemented the AI component is", weight: 1.0, sortOrder: 5 },
      { name: "Maintainability / Testability", description: "Tests, CI/CD, configuration management, reproducibility", weight: 1.0, sortOrder: 6 },
    ];

    for (const c of codeCriteria) {
      await db.rubricCriterion.create({
        data: {
          id: `code-${c.sortOrder}`,
          templateId: codeTemplate.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: c.sortOrder,
        },
      });
    }

    // App Settings
    await db.appSetting.create({
      data: { key: "openai_model", value: "gpt-4o" },
    });

    // Sample session
    await db.evaluationSession.create({
      data: {
        teamName: "Team Alpha - IndustrialAI",
        teamId: "demo-team-alpha",
        university: "Khalifa University",
        members: JSON.stringify(["Ahmed Al Mansouri", "Sara Al Hashimi", "Omar Khan", "Fatima Al Zaabi"]),
        category: "AI Smart Worker Assistant",
        demoUrl: "https://demo.example.com/alpha",
        notes: "Strong proposal with working computer vision prototype",
        status: "draft",
        createdById: admin.id,
      },
    });

    return NextResponse.json({ message: "Database seeded successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

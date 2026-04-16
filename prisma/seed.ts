import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // ============================
  // Users
  // ============================
  const admin = await db.user.upsert({
    where: { email: "admin@hackeval.dev" },
    update: {},
    create: {
      email: "admin@hackeval.dev",
      name: "Admin User",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    },
  });

  const evaluator = await db.user.upsert({
    where: { email: "evaluator@hackeval.dev" },
    update: {},
    create: {
      email: "evaluator@hackeval.dev",
      name: "Evaluator",
      passwordHash: hashPassword("eval123"),
      role: "evaluator",
    },
  });

  console.log("  Users created");

  // ============================
  // Rubric Templates
  // ============================

  // Judge Evaluation Template
  const judgeTemplate = await db.rubricTemplate.upsert({
    where: { id: "judge-eval-default" },
    update: {},
    create: {
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
    await db.rubricCriterion.upsert({
      where: { id: `judge-${c.sortOrder}` },
      update: { name: c.name, description: c.description, weight: c.weight, sortOrder: c.sortOrder },
      create: {
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
  const codeTemplate = await db.rubricTemplate.upsert({
    where: { id: "code-review-default" },
    update: {},
    create: {
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
    await db.rubricCriterion.upsert({
      where: { id: `code-${c.sortOrder}` },
      update: { name: c.name, description: c.description, weight: c.weight, sortOrder: c.sortOrder },
      create: {
        id: `code-${c.sortOrder}`,
        templateId: codeTemplate.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        sortOrder: c.sortOrder,
      },
    });
  }

  console.log("  Rubric templates created");

  // ============================
  // Sample Evaluation Sessions
  // ============================

  // Session 1: Fully evaluated
  const session1 = await db.evaluationSession.upsert({
    where: { teamId: "demo-team-alpha" },
    update: {},
    create: {
      teamName: "Team Alpha - IndustrialAI",
      teamId: "demo-team-alpha",
      university: "Khalifa University",
      members: JSON.stringify(["Ahmed Al Mansouri", "Sara Al Hashimi", "Omar Khan", "Fatima Al Zaabi"]),
      category: "AI Smart Worker Assistant",
      demoUrl: "https://demo.example.com/alpha",
      notes: "Strong proposal with working computer vision prototype",
      status: "analyzed",
      createdById: admin.id,
    },
  });

  // Proposal extraction for session 1
  await db.proposalExtraction.upsert({
    where: { sessionId: session1.id },
    update: {},
    create: {
      sessionId: session1.id,
      rawText: "Team Alpha presents IndustrialAI, a comprehensive AI-powered Smart Worker Assistant designed for UAE manufacturing facilities. Our solution uses computer vision (YOLOv8) for real-time safety monitoring, NLP-based document retrieval for compliance guidance, and edge computing for low-latency decision support.\n\nProblem: Manufacturing workers face a 30% inefficiency rate due to lack of real-time guidance. Safety incidents cost the UAE industrial sector $2.3B annually.\n\nSolution: A multimodal AI assistant that provides workers with contextual, real-time guidance through smart glasses and mobile interfaces.\n\nTechnology Stack: YOLOv8 for object detection, LangChain for RAG-based retrieval, NVIDIA Jetson for edge inference, React Native for mobile interface, FastAPI backend.\n\nImpact: Projected 40% reduction in safety incidents, 25% improvement in task completion time, ROI within 8 months.",
      sections: JSON.stringify([
        {
          title: "Problem + Solution",
          content: "Manufacturing workers face a 30% inefficiency rate due to lack of real-time guidance. Safety incidents cost the UAE industrial sector $2.3B annually. Our solution is a multimodal AI assistant that provides workers with contextual, real-time guidance through smart glasses and mobile interfaces.",
          pageNumbers: [1, 2],
          confidence: 0.9,
        },
        {
          title: "AI + Technology",
          content: "Technology Stack: YOLOv8 for object detection, LangChain for RAG-based retrieval, NVIDIA Jetson for edge inference, React Native for mobile interface, FastAPI backend. System architecture uses edge-cloud hybrid approach.",
          pageNumbers: [3, 4],
          confidence: 0.85,
        },
        {
          title: "Value + Impact + Feasibility",
          content: "Projected 40% reduction in safety incidents, 25% improvement in task completion time, ROI within 8 months. Solution is scalable across multiple facilities and adaptable to different industrial contexts.",
          pageNumbers: [5, 6],
          confidence: 0.8,
        },
      ]),
      warnings: "[]",
      slideCount: 8,
      confidence: 0.85,
    },
  });

  // Code extraction for session 1
  await db.codeExtraction.upsert({
    where: { sessionId: session1.id },
    update: {},
    create: {
      sessionId: session1.id,
      fileTree: JSON.stringify([
        { name: "backend", path: "backend/", type: "directory", children: [
          { name: "main.py", path: "backend/main.py", type: "file", size: 4200 },
          { name: "models.py", path: "backend/models.py", type: "file", size: 2800 },
          { name: "services", path: "backend/services/", type: "directory", children: [
            { name: "ai_service.py", path: "backend/services/ai_service.py", type: "file", size: 6500 },
            { name: "vision_service.py", path: "backend/services/vision_service.py", type: "file", size: 5200 },
          ]},
        ]},
        { name: "frontend", path: "frontend/", type: "directory", children: [
          { name: "src", path: "frontend/src/", type: "directory", children: [
            { name: "App.tsx", path: "frontend/src/App.tsx", type: "file", size: 3400 },
          ]},
        ]},
        { name: "README.md", path: "README.md", type: "file", size: 2100 },
        { name: "Dockerfile", path: "Dockerfile", type: "file", size: 800 },
        { name: "requirements.txt", path: "requirements.txt", type: "file", size: 450 },
      ]),
      languages: JSON.stringify([
        { language: "Python", percentage: 55, fileCount: 12 },
        { language: "TypeScript (React)", percentage: 30, fileCount: 8 },
        { language: "CSS", percentage: 10, fileCount: 4 },
        { language: "SQL", percentage: 5, fileCount: 2 },
      ]),
      frameworks: JSON.stringify(["FastAPI", "React", "PyTorch", "YOLOv8", "Docker"]),
      hasReadme: true,
      hasTests: true,
      hasDocker: true,
      hasCi: false,
      hasPackageJson: true,
      hasRequirements: true,
      totalFiles: 32,
      totalSize: 245000,
      readmeContent: "# IndustrialAI - Smart Worker Assistant\n\nAI-powered worker assistance platform for UAE manufacturing.\n\n## Setup\n1. pip install -r requirements.txt\n2. docker-compose up\n3. cd frontend && npm install && npm run dev",
      repoSummary: "Repository contains 32 files (245 KB).\nPrimary languages: Python (55%), TypeScript (30%).\nFrameworks: FastAPI, React, PyTorch, YOLOv8, Docker.\nREADME: Present.\nTests: Present.\nDocker: Present.\nCI/CD: Not found.",
    },
  });

  // Evaluation result for session 1
  const evalResult1 = await db.evaluationResult.upsert({
    where: { sessionId: session1.id },
    update: {},
    create: {
      sessionId: session1.id,
      proposalSummary: "Team Alpha presents IndustrialAI, a comprehensive AI-powered Smart Worker Assistant using YOLOv8 for safety monitoring and LangChain for compliance guidance. The proposal clearly defines the industrial workforce problem and proposes a well-architected solution with edge computing deployment.",
      codeSummary: "The codebase demonstrates a functional prototype with a Python backend (FastAPI), React frontend, and AI integration using PyTorch and OpenCV. Architecture shows good separation of concerns with modular components. Docker support present.",
      strengths: JSON.stringify([
        "Clear problem identification with industry-specific metrics",
        "Strong AI/ML technology stack selection (YOLOv8, LangChain)",
        "Human-centric design approach aligns with Industry 5.0",
        "Working prototype with functional AI pipeline",
        "Docker containerization for deployment readiness",
      ]),
      weaknesses: JSON.stringify([
        "Limited detail on data privacy and security architecture",
        "No CI/CD pipeline configured",
        "Sparse inline documentation in codebase",
        "Testing coverage could be expanded",
      ]),
      risks: JSON.stringify([
        "Edge computing latency in real-time safety scenarios",
        "Model accuracy in diverse industrial environments",
        "Workforce adoption resistance",
      ]),
      missingInfo: JSON.stringify([
        "Detailed security architecture diagram",
        "Data handling and privacy compliance details",
        "Cost breakdown for deployment at scale",
      ]),
      recommendation: "shortlist",
      judgeScore: 7.5,
      codeScore: 7.0,
      finalScore: 7.3,
      aiConfidence: 0.82,
      reviewerNotes: "",
    },
  });

  // Criterion scores for session 1
  const criterionScoresData = [
    { criterionId: "judge-1", score: 8.0, aiScore: 8.0, rationale: "Excellent alignment with the industrial workforce challenge. Clearly identifies safety and productivity gaps.", evidence: '["30% inefficiency metric cited","Safety cost data referenced","Direct alignment with UAE Industry 5.0"]', confidence: 0.9 },
    { criterionId: "judge-2", score: 7.5, aiScore: 7.5, rationale: "Working prototype with functional computer vision and NLP pipelines demonstrated.", evidence: '["YOLOv8 integration working","LangChain RAG pipeline functional","Mobile interface prototype shown"]', confidence: 0.85 },
    { criterionId: "judge-3", score: 7.0, aiScore: 7.0, rationale: "Feasible with current technology. Edge deployment strategy is realistic but needs more detail.", evidence: '["Uses proven open-source frameworks","NVIDIA Jetson deployment planned","Integration complexity acknowledged"]', confidence: 0.8 },
    { criterionId: "judge-4", score: 7.5, aiScore: 7.5, rationale: "Novel combination of computer vision safety monitoring with NLP compliance guidance.", evidence: '["Unique multimodal approach","Smart glasses interface is innovative","Edge-cloud hybrid architecture"]', confidence: 0.8 },
    { criterionId: "judge-5", score: 7.5, aiScore: 7.5, rationale: "Team demonstrates strong collaboration with clear role division.", evidence: '["4-member team with defined roles","Balanced technical expertise"]', confidence: 0.75 },
    { criterionId: "code-1", score: 7.5, aiScore: 7.5, rationale: "Clean code structure with consistent patterns. Some areas need better error handling.", evidence: '["Consistent naming conventions","Modular file organization","Type hints used"]', confidence: 0.85 },
    { criterionId: "code-2", score: 7.0, aiScore: 7.0, rationale: "Good separation of concerns with API layer, services, and models.", evidence: '["Clear API/service/model separation","Docker configuration present","Database migrations included"]', confidence: 0.8 },
    { criterionId: "code-3", score: 6.5, aiScore: 6.5, rationale: "README present with setup instructions. Inline documentation is sparse.", evidence: '["README with installation steps","API docs partially complete","Limited inline comments"]', confidence: 0.85 },
    { criterionId: "code-4", score: 6.0, aiScore: 6.0, rationale: "Basic security measures in place but needs improvement for production.", evidence: '["Authentication implemented","Environment variables for secrets","No rate limiting"]', confidence: 0.75 },
    { criterionId: "code-5", score: 8.0, aiScore: 8.0, rationale: "Strong AI implementation with relevant models for the industrial use case.", evidence: '["YOLOv8 model integrated","LLM-based assistance pipeline","Real-time inference working"]', confidence: 0.85 },
    { criterionId: "code-6", score: 7.0, aiScore: 7.0, rationale: "Unit tests for core services present. No integration tests.", evidence: '["Unit tests for core services","Docker for reproducibility","Configuration externalized"]', confidence: 0.8 },
  ];

  for (const cs of criterionScoresData) {
    await db.criterionScore.create({
      data: {
        resultId: evalResult1.id,
        criterionId: cs.criterionId,
        score: cs.score,
        aiScore: cs.aiScore,
        rationale: cs.rationale,
        evidence: cs.evidence,
        confidence: cs.confidence,
      },
    });
  }

  console.log("  Session 1 (analyzed) created");

  // Session 2: Draft
  await db.evaluationSession.upsert({
    where: { teamId: "demo-team-beta" },
    update: {},
    create: {
      teamName: "Team Beta - SmartFactory",
      teamId: "demo-team-beta",
      university: "UAE University",
      members: JSON.stringify(["Mohammed Al Ali", "Noura Al Suwaidi", "Rashid Hassan", "Aisha Al Mazrouei", "Hamad Al Shamsi"]),
      category: "AI Smart Worker Assistant",
      notes: "Proposal uploaded, awaiting code submission",
      status: "draft",
      createdById: evaluator.id,
    },
  });

  console.log("  Session 2 (draft) created");

  // Session 3: Finalized
  const session3 = await db.evaluationSession.upsert({
    where: { teamId: "demo-team-gamma" },
    update: {},
    create: {
      teamName: "Team Gamma - SafetyFirst AI",
      teamId: "demo-team-gamma",
      university: "American University of Sharjah",
      members: JSON.stringify(["Zayed Al Nahyan", "Maryam Al Falasi", "Ali Hassan", "Dana Al Qassimi"]),
      category: "AI Smart Worker Assistant",
      demoUrl: "https://demo.example.com/gamma",
      notes: "Excellent safety-focused solution. Finalist recommendation.",
      status: "finalized",
      createdById: admin.id,
    },
  });

  await db.evaluationResult.upsert({
    where: { sessionId: session3.id },
    update: {},
    create: {
      sessionId: session3.id,
      proposalSummary: "Team Gamma presents SafetyFirst AI, a specialized safety monitoring platform using computer vision and IoT sensors. The focus on real-time hazard detection and compliance tracking is well-aligned with industrial safety requirements.",
      codeSummary: "Well-structured Python codebase with comprehensive test coverage. The AI pipeline is production-ready with proper error handling and fallback mechanisms.",
      strengths: JSON.stringify([
        "Laser-focused on safety - the highest priority in industrial settings",
        "Comprehensive real-time hazard detection pipeline",
        "Excellent test coverage (85%+)",
        "Production-ready code quality",
        "Strong compliance tracking features",
      ]),
      weaknesses: JSON.stringify([
        "Narrow focus on safety may limit broader applicability",
        "UI could be more intuitive for non-technical workers",
      ]),
      risks: JSON.stringify([
        "False positive rate in hazard detection needs monitoring",
        "Sensor dependency for full functionality",
      ]),
      missingInfo: JSON.stringify(["Scalability benchmarks"]),
      recommendation: "finalist",
      judgeScore: 8.2,
      codeScore: 8.5,
      finalScore: 8.32,
      aiConfidence: 0.88,
      reviewerNotes: "Strong submission with excellent safety focus. Recommended as finalist.",
      isFinalized: true,
      finalizedAt: new Date(),
    },
  });

  console.log("  Session 3 (finalized) created");

  // ============================
  // App Settings
  // ============================
  await db.appSetting.upsert({
    where: { key: "openai_model" },
    update: {},
    create: { key: "openai_model", value: "gpt-4o" },
  });

  console.log("  Settings created");
  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:     admin@hackeval.dev / admin123");
  console.log("  Evaluator: evaluator@hackeval.dev / eval123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

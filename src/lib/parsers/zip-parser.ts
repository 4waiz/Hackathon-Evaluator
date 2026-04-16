import type { FileTreeNode, CodeAnalysis, LanguageDetection } from "@/types";
import AdmZip from "adm-zip";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  py: "Python",
  js: "JavaScript",
  ts: "TypeScript",
  jsx: "JavaScript (React)",
  tsx: "TypeScript (React)",
  java: "Java",
  cpp: "C++",
  c: "C",
  cs: "C#",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  r: "R",
  m: "MATLAB",
  ipynb: "Jupyter Notebook",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  vue: "Vue",
  svelte: "Svelte",
};

const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  React: ["react", "react-dom", "next", "gatsby"],
  "Next.js": ["next"],
  Vue: ["vue", "nuxt"],
  Angular: ["@angular/core"],
  FastAPI: ["fastapi"],
  Flask: ["flask"],
  Django: ["django"],
  Express: ["express"],
  "Spring Boot": ["spring-boot"],
  PyTorch: ["torch", "pytorch"],
  TensorFlow: ["tensorflow", "tf"],
  OpenCV: ["opencv", "cv2"],
  LangChain: ["langchain"],
  "Hugging Face": ["transformers", "huggingface"],
  YOLO: ["ultralytics", "yolo"],
  Streamlit: ["streamlit"],
  Docker: ["Dockerfile"],
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "dist",
  "build",
  ".next",
  ".cache",
  "coverage",
  ".tox",
  ".mypy_cache",
  ".pytest_cache",
]);

const MAX_README_SIZE = 50000;

export async function parseZip(buffer: Buffer): Promise<CodeAnalysis> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const fileTree: FileTreeNode[] = [];
  const languageCounts: Record<string, number> = {};
  const detectedFrameworks = new Set<string>();
  let hasReadme = false;
  let hasTests = false;
  let hasDocker = false;
  let hasCi = false;
  let hasPackageJson = false;
  let hasRequirements = false;
  let totalFiles = 0;
  let totalSize = 0;
  let readmeContent = "";
  let packageJsonContent = "";
  let requirementsContent = "";

  const treeMap = new Map<string, FileTreeNode>();

  for (const entry of entries) {
    const path = entry.entryName.replace(/\\/g, "/");
    const parts = path.split("/").filter(Boolean);

    // Skip hidden and vendor directories
    if (parts.some((p) => SKIP_DIRS.has(p))) continue;

    if (entry.isDirectory) {
      const node: FileTreeNode = {
        name: parts[parts.length - 1],
        path,
        type: "directory",
        children: [],
      };
      treeMap.set(path, node);
    } else {
      const filename = parts[parts.length - 1];
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const size = entry.header.size;

      totalFiles++;
      totalSize += size;

      // Detect language
      if (LANGUAGE_EXTENSIONS[ext]) {
        const lang = LANGUAGE_EXTENSIONS[ext];
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }

      // Detect special files
      const lowerFilename = filename.toLowerCase();
      if (lowerFilename.startsWith("readme")) {
        hasReadme = true;
        if (size < MAX_README_SIZE) {
          try {
            readmeContent = entry.getData().toString("utf-8");
          } catch {
            readmeContent = "[Could not read README]";
          }
        }
      }

      if (
        lowerFilename.includes("test") ||
        lowerFilename.includes("spec") ||
        parts.some(
          (p) =>
            p.toLowerCase() === "tests" ||
            p.toLowerCase() === "test" ||
            p.toLowerCase() === "__tests__"
        )
      ) {
        hasTests = true;
      }

      if (
        lowerFilename === "dockerfile" ||
        lowerFilename === "docker-compose.yml" ||
        lowerFilename === "docker-compose.yaml"
      ) {
        hasDocker = true;
        detectedFrameworks.add("Docker");
      }

      if (
        parts.some(
          (p) =>
            p === ".github" || p === ".gitlab-ci.yml" || p === ".circleci"
        ) ||
        lowerFilename === ".gitlab-ci.yml" ||
        lowerFilename === "Jenkinsfile"
      ) {
        hasCi = true;
      }

      if (lowerFilename === "package.json") {
        hasPackageJson = true;
        if (size < MAX_README_SIZE) {
          try {
            packageJsonContent = entry.getData().toString("utf-8");
          } catch {
            /* ignore */
          }
        }
      }

      if (
        lowerFilename === "requirements.txt" ||
        lowerFilename === "pyproject.toml" ||
        lowerFilename === "setup.py" ||
        lowerFilename === "pipfile"
      ) {
        hasRequirements = true;
        if (size < MAX_README_SIZE) {
          try {
            requirementsContent = entry.getData().toString("utf-8");
          } catch {
            /* ignore */
          }
        }
      }

      const node: FileTreeNode = {
        name: filename,
        path,
        type: "file",
        size,
        extension: ext,
      };
      treeMap.set(path, node);
    }
  }

  // Build tree hierarchy
  for (const [path, node] of treeMap) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length <= 1) {
      fileTree.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/") + "/";
      const parent = treeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        fileTree.push(node);
      }
    }
  }

  // Detect frameworks from package.json
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      const deps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      for (const [framework, indicators] of Object.entries(
        FRAMEWORK_INDICATORS
      )) {
        for (const indicator of indicators) {
          if (deps[indicator]) {
            detectedFrameworks.add(framework);
          }
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }

  // Detect frameworks from requirements.txt
  if (requirementsContent) {
    const lower = requirementsContent.toLowerCase();
    for (const [framework, indicators] of Object.entries(
      FRAMEWORK_INDICATORS
    )) {
      for (const indicator of indicators) {
        if (lower.includes(indicator.toLowerCase())) {
          detectedFrameworks.add(framework);
        }
      }
    }
  }

  // Build language detection summary
  const totalLangFiles = Object.values(languageCounts).reduce(
    (a, b) => a + b,
    0
  );
  const languages: LanguageDetection[] = Object.entries(languageCounts)
    .map(([language, count]) => ({
      language,
      percentage: Math.round((count / totalLangFiles) * 100),
      fileCount: count,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  const repoSummary = buildRepoSummary(
    totalFiles,
    totalSize,
    languages,
    detectedFrameworks,
    hasReadme,
    hasTests,
    hasDocker,
    hasCi
  );

  return {
    fileTree,
    languages,
    frameworks: Array.from(detectedFrameworks),
    hasReadme,
    hasTests,
    hasDocker,
    hasCi,
    hasPackageJson,
    hasRequirements,
    totalFiles,
    totalSize,
    readmeContent,
    repoSummary,
  };
}

function buildRepoSummary(
  totalFiles: number,
  totalSize: number,
  languages: LanguageDetection[],
  frameworks: Set<string>,
  hasReadme: boolean,
  hasTests: boolean,
  hasDocker: boolean,
  hasCi: boolean
): string {
  const lines = [
    `Repository contains ${totalFiles} files (${formatBytes(totalSize)}).`,
    `Primary languages: ${languages.slice(0, 5).map((l) => `${l.language} (${l.percentage}%)`).join(", ") || "None detected"}.`,
    `Frameworks: ${Array.from(frameworks).join(", ") || "None detected"}.`,
    `README: ${hasReadme ? "Present" : "Not found"}.`,
    `Tests: ${hasTests ? "Present" : "Not found"}.`,
    `Docker: ${hasDocker ? "Present" : "Not found"}.`,
    `CI/CD: ${hasCi ? "Present" : "Not found"}.`,
  ];
  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

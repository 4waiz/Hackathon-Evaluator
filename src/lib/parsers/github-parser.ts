import type { CodeAnalysis, FileTreeNode, LanguageDetection } from "@/types";

interface GitHubRepoInfo {
  name: string;
  description: string;
  language: string;
  size: number;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
  hasReadme: boolean;
  license: string | null;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/\s#?]+)/,
    /^([^/]+)\/([^/\s#?]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
      };
    }
  }
  return null;
}

export async function analyzeGitHubRepo(url: string): Promise<CodeAnalysis> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error("Invalid GitHub URL");
  }

  const { owner, repo } = parsed;

  try {
    // Fetch repo info
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 300 },
      }
    );

    if (!repoResponse.ok) {
      throw new Error(`GitHub API returned ${repoResponse.status}`);
    }

    const repoData = await repoResponse.json();

    // Fetch language breakdown
    const langResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 300 },
      }
    );
    const langData = langResponse.ok ? await langResponse.json() : {};

    // Fetch top-level file tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 300 },
      }
    );
    const treeData = treeResponse.ok ? await treeResponse.json() : { tree: [] };

    // Fetch README
    let readmeContent = "";
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 300 },
        }
      );
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        readmeContent = Buffer.from(
          readmeData.content,
          "base64"
        ).toString("utf-8");
      }
    } catch {
      /* README not found */
    }

    // Process languages
    const totalBytes = Object.values(langData as Record<string, number>).reduce(
      (a: number, b: number) => a + b,
      0
    );
    const languages: LanguageDetection[] = Object.entries(
      langData as Record<string, number>
    )
      .map(([language, bytes]) => ({
        language,
        percentage: Math.round((bytes / totalBytes) * 100),
        fileCount: 0, // Not available from API
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Process file tree
    const fileTree: FileTreeNode[] = (
      treeData.tree as { path: string; type: string; size?: number }[]
    ).map(
      (item: { path: string; type: string; size?: number }) => ({
        name: item.path,
        path: item.path,
        type: item.type === "tree" ? "directory" : "file",
        size: item.size || 0,
        extension: item.type === "blob" ? item.path.split(".").pop() || "" : undefined,
      })
    );

    // Detect frameworks from topics and description
    const frameworks: string[] = [];
    const repoInfo: GitHubRepoInfo = {
      name: repoData.name,
      description: repoData.description || "",
      language: repoData.language || "",
      size: repoData.size,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      topics: repoData.topics || [],
      defaultBranch: repoData.default_branch,
      hasReadme: !!readmeContent,
      license: repoData.license?.spdx_id || null,
    };

    const allText = `${repoInfo.description} ${repoInfo.topics.join(" ")} ${repoInfo.language}`.toLowerCase();
    if (allText.includes("react") || allText.includes("next")) frameworks.push("React");
    if (allText.includes("python") || allText.includes("fastapi")) frameworks.push("FastAPI");
    if (allText.includes("pytorch") || allText.includes("torch")) frameworks.push("PyTorch");
    if (allText.includes("tensorflow")) frameworks.push("TensorFlow");
    if (allText.includes("docker")) frameworks.push("Docker");
    if (allText.includes("opencv")) frameworks.push("OpenCV");

    // Check for special files
    const fileNames = fileTree.map((f) => f.name.toLowerCase());
    const hasTests =
      fileNames.some((f) => f.includes("test")) ||
      fileTree.some((f) => f.name === "tests" && f.type === "directory");
    const hasDocker = fileNames.some(
      (f) => f === "dockerfile" || f.startsWith("docker-compose")
    );
    const hasCi = fileTree.some((f) => f.name === ".github" && f.type === "directory");
    const hasPackageJson = fileNames.includes("package.json");
    const hasRequirements =
      fileNames.includes("requirements.txt") ||
      fileNames.includes("pyproject.toml");

    const repoSummary = [
      `GitHub repository: ${owner}/${repo}`,
      `Description: ${repoInfo.description || "None"}`,
      `Primary language: ${repoInfo.language}`,
      `Size: ${repoInfo.size} KB`,
      `Stars: ${repoInfo.stars}, Forks: ${repoInfo.forks}`,
      `Topics: ${repoInfo.topics.join(", ") || "None"}`,
      `License: ${repoInfo.license || "None"}`,
      `README: ${readmeContent ? "Present" : "Not found"}`,
      `Tests: ${hasTests ? "Present" : "Not found"}`,
      `Docker: ${hasDocker ? "Present" : "Not found"}`,
      `CI/CD: ${hasCi ? "Present" : "Not found"}`,
    ].join("\n");

    return {
      fileTree,
      languages,
      frameworks,
      hasReadme: !!readmeContent,
      hasTests,
      hasDocker,
      hasCi,
      hasPackageJson,
      hasRequirements,
      totalFiles: fileTree.filter((f) => f.type === "file").length,
      totalSize: repoInfo.size * 1024,
      readmeContent,
      repoSummary,
    };
  } catch (error) {
    // Return minimal analysis on failure
    return {
      fileTree: [],
      languages: [],
      frameworks: [],
      hasReadme: false,
      hasTests: false,
      hasDocker: false,
      hasCi: false,
      hasPackageJson: false,
      hasRequirements: false,
      totalFiles: 0,
      totalSize: 0,
      readmeContent: "",
      repoSummary: `Failed to analyze GitHub repository: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

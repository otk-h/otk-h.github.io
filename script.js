const projectList = document.getElementById("projectList");
const blogList = document.getElementById("blogList");

function safeText(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inferGitHubRepo() {
  const { hostname, pathname } = window.location;
  if (!hostname.endsWith("github.io")) {
    return null;
  }

  const owner = hostname.split(".")[0];
  const firstPath = pathname.split("/").filter(Boolean)[0];
  const repo = firstPath || `${owner}.github.io`;
  return { owner, repo };
}

async function scanFromGitHubApi(directory) {
  const repoInfo = inferGitHubRepo();
  if (!repoInfo) {
    throw new Error("当前环境不是 GitHub Pages，跳过 GitHub API 扫描");
  }

  const { owner, repo } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${directory}`;
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub API 读取失败: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("GitHub API 返回格式异常");
  }

  return data
    .filter((item) => item.type === "file" && item.name?.toLowerCase().endsWith(".md"))
    .map((item) => item.path)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

async function scanFromDirectoryListing(directory) {
  const response = await fetch(`./${directory}/`);
  if (!response.ok) {
    throw new Error(`无法读取目录: ${directory}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const files = [...doc.querySelectorAll('a[href$=".md"]')]
    .map((a) => a.getAttribute("href"))
    .filter(Boolean)
    .map((href) => href.replace(/^\.\//, ""))
    .filter((href) => !href.includes("../"))
    .map((href) => `${directory}/${href}`);

  return [...new Set(files)].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

async function scanMarkdownFiles(directory) {
  try {
    return await scanFromGitHubApi(directory);
  } catch {
    return scanFromDirectoryListing(directory);
  }
}

async function extractTitle(filePath) {
  try {
    const response = await fetch(`./${filePath}`);
    if (!response.ok) {
      return filePath;
    }
    const text = await response.text();
    const firstHeading = text
      .split("\n")
      .find((line) => line.trim().startsWith("# "))
      ?.replace(/^#\s+/, "")
      .trim();
    return firstHeading || filePath.split("/").pop().replace(/\.md$/, "");
  } catch {
    return filePath.split("/").pop().replace(/\.md$/, "");
  }
}

async function renderEntryList(container, directory, typeLabel) {
  try {
    const files = await scanMarkdownFiles(directory);

    if (!files.length) {
      container.innerHTML = `<p class="empty">${typeLabel}目录当前没有 Markdown 文件。</p>`;
      return;
    }

    const titledFiles = await Promise.all(
      files.map(async (file) => ({ file, title: await extractTitle(file) }))
    );

    container.innerHTML = titledFiles
      .map(
        ({ file, title }) => `
        <a class="entry-card" href="viewer.html?file=${encodeURIComponent(file)}" target="_blank" rel="noopener">
          <h3>${safeText(title)}</h3>
          <p>${safeText(file)}</p>
        </a>
      `
      )
      .join("");
  } catch (error) {
    container.innerHTML = `<p class="empty">${typeLabel}加载失败：${safeText(error.message)}</p>`;
  }
}

renderEntryList(projectList, "project", "项目");
renderEntryList(blogList, "blog", "博客");

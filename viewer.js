const docTitle = document.getElementById("docTitle");
const docPath = document.getElementById("docPath");
const docBody = document.getElementById("docBody");

function safePath(file) {
  const clean = file.replace(/^\/+/, "");
  if (!clean.endsWith(".md")) {
    return null;
  }
  if (!(clean.startsWith("project/") || clean.startsWith("blog/"))) {
    return null;
  }
  if (clean.includes("..")) {
    return null;
  }
  return clean;
}

async function initViewer() {
  const params = new URLSearchParams(window.location.search);
  const fileParam = params.get("file") || "";
  const file = safePath(fileParam);

  if (!file) {
    docTitle.textContent = "无效文件路径";
    docPath.textContent = "仅允许访问 project/ 或 blog/ 下的 .md 文件";
    return;
  }

  docPath.textContent = file;

  try {
    const response = await fetch(`./${file}`);
    if (!response.ok) {
      throw new Error(`加载失败: ${response.status}`);
    }

    const markdown = await response.text();
    const heading = markdown
      .split("\n")
      .find((line) => line.trim().startsWith("# "))
      ?.replace(/^#\s+/, "")
      .trim();

    docTitle.textContent = heading || file.split("/").pop().replace(/\.md$/, "");
    docBody.innerHTML = marked.parse(markdown);
  } catch (error) {
    docTitle.textContent = "文档加载失败";
    docBody.innerHTML = `<p>${error.message}</p>`;
  }
}

initViewer();

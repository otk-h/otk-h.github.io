const projectList = document.getElementById("projectList");
const blogList = document.getElementById("blogList");

function safeText(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function scanMarkdownFiles(directory) {
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

  return [...new Set(files)];
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

const blogList = document.getElementById("blogList");
const blogTitle = document.getElementById("blogTitle");
const blogMeta = document.getElementById("blogMeta");
const blogBody = document.getElementById("blogBody");
const projectGrid = document.getElementById("projectGrid");

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`无法加载 ${path}`);
  }
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`无法加载 ${path}`);
  }
  return response.text();
}

function renderError(container, message) {
  container.innerHTML = `<p>${message}</p>`;
}

function renderProjects(projects) {
  if (!projects.length) {
    renderError(projectGrid, "暂无项目内容");
    return;
  }

  projectGrid.innerHTML = projects
    .map(
      (project) => `
      <article class="card project-card">
        <img class="project-image" src="${project.image}" alt="${project.title} 项目图片" loading="lazy" />
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <a href="${project.readme}" target="_blank" rel="noopener">README.md</a>
      </article>
    `
    )
    .join("");
}

async function showBlogPost(post) {
  const markdown = await fetchText(post.file);
  blogTitle.textContent = post.title;
  blogMeta.textContent = `${post.date} · ${post.category}`;
  blogBody.innerHTML = marked.parse(markdown);

  document.querySelectorAll(".blog-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.file === post.file);
  });
}

function renderBlogList(posts) {
  if (!posts.length) {
    renderError(blogList, "未发现博客 markdown 文件");
    return;
  }

  blogList.innerHTML = posts
    .map(
      (post) => `
      <button class="blog-item" data-file="${post.file}">
        <h4>${post.title}</h4>
        <p>${post.summary}</p>
      </button>
    `
    )
    .join("");

  blogList.addEventListener("click", async (event) => {
    const target = event.target.closest(".blog-item");
    if (!target) {
      return;
    }
    const post = posts.find((item) => item.file === target.dataset.file);
    if (post) {
      await showBlogPost(post);
    }
  });

  showBlogPost(posts[0]);
}

async function init() {
  try {
    const [blogIndex, projectIndex] = await Promise.all([
      fetchJson("content/blog/index.json"),
      fetchJson("content/projects/index.json"),
    ]);

    renderBlogList(blogIndex.posts || []);
    renderProjects(projectIndex.projects || []);
  } catch (error) {
    renderError(blogList, "博客内容加载失败，请检查 content/blog 目录。");
    renderError(projectGrid, "项目内容加载失败，请检查 content/projects 目录。");
    blogTitle.textContent = "加载失败";
    blogMeta.textContent = error.message;
  }
}

init();

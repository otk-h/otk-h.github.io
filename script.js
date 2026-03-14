const blogList = document.getElementById("blogList");
const addPostBtn = document.getElementById("addPostBtn");
const postDialog = document.getElementById("postDialog");
const cancelBtn = document.getElementById("cancelBtn");
const postForm = document.getElementById("postForm");
const postTitle = document.getElementById("postTitle");
const postDesc = document.getElementById("postDesc");
const dialogTitle = document.getElementById("dialogTitle");

let posts = [
  { id: 1, title: "前端性能优化笔记", desc: "记录关键渲染路径优化、图片懒加载与资源压缩实践。" },
  { id: 2, title: "设计系统搭建心得", desc: "从色彩、排版到组件规范，沉淀可复用设计语言。" },
];
let editingId = null;

function renderPosts() {
  if (!posts.length) {
    blogList.innerHTML = '<p>暂无博客文章，点击“添加文章”开始创作吧。</p>';
    return;
  }

  blogList.innerHTML = posts
    .map(
      (post) => `
      <article class="blog-card">
        <h3>${post.title}</h3>
        <p>${post.desc}</p>
        <div class="blog-actions">
          <button type="button" class="blog-action-btn" data-action="edit" data-id="${post.id}">编辑</button>
          <button type="button" class="blog-action-btn" data-action="delete" data-id="${post.id}">删除</button>
        </div>
      </article>
    `
    )
    .join("");
}

function openDialog(mode, post) {
  editingId = mode === "edit" ? post.id : null;
  dialogTitle.textContent = mode === "edit" ? "编辑文章" : "添加文章";
  postTitle.value = post?.title || "";
  postDesc.value = post?.desc || "";
  postDialog.showModal();
}

addPostBtn.addEventListener("click", () => openDialog("add"));
cancelBtn.addEventListener("click", () => {
  postForm.reset();
  postDialog.close();
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    title: postTitle.value.trim(),
    desc: postDesc.value.trim(),
  };

  if (!payload.title || !payload.desc) {
    return;
  }

  if (editingId) {
    posts = posts.map((post) => (post.id === editingId ? { ...post, ...payload } : post));
  } else {
    posts = [{ id: Date.now(), ...payload }, ...posts];
  }

  postForm.reset();
  postDialog.close();
  renderPosts();
});

blogList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const { action, id } = target.dataset;
  if (!action || !id) {
    return;
  }

  const postId = Number(id);
  if (action === "delete") {
    posts = posts.filter((post) => post.id !== postId);
    renderPosts();
  }

  if (action === "edit") {
    const post = posts.find((item) => item.id === postId);
    if (post) {
      openDialog("edit", post);
    }
  }
});

renderPosts();

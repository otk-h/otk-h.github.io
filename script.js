(() => {
  const canvas = document.querySelector("#signal");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const links = [...document.querySelectorAll("[data-signal]")];
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let activeSignal = "";
  let previousTime = performance.now();
  let simulationTime = 3.8;
  let slow = false;
  let timeScale = 1;
  const settings = { angle: 0.29, speed: 1, density: 1 };
  const isLab = document.body.classList.contains("lab");
  const observe = document.querySelector(".observe");

  const hash = (value) => {
    const x = Math.sin(value * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  function geometry() {
    const mobile = width < 760;
    const radius = Math.min(width, height) * (mobile ? 0.18 : 0.24);
    return {
      x: width * (mobile ? 0.61 : 0.66) + pointer.x * 0.018,
      y: height * (mobile ? 0.45 : 0.51) + pointer.y * 0.014,
      radius,
      outer: radius * 3.35,
      tilt: settings.angle * 0.55,
      rotation: -0.075 + pointer.x / Math.max(width, 1) * 0.045,
    };
  }

  function ellipsePoint(hole, radius, angle) {
    const localX = Math.cos(angle) * radius;
    const localY = Math.sin(angle) * radius * hole.tilt;
    const cos = Math.cos(hole.rotation);
    const sin = Math.sin(hole.rotation);
    return {
      x: hole.x + localX * cos - localY * sin,
      y: hole.y + localX * sin + localY * cos,
      depth: Math.sin(angle),
    };
  }

  function paintStars(time) {
    for (let i = 0; i < 95; i += 1) {
      const x = hash(i + 2) * width;
      const y = hash(i * 3.73 + 9) * height;
      const flicker = 0.18 + 0.28 * Math.sin(time * 0.7 + i * 2.1);
      ctx.fillStyle = `rgba(183,214,221,${Math.max(0.05, flicker)})`;
      ctx.fillRect(x, y, i % 13 === 0 ? 1.4 : 0.65, i % 13 === 0 ? 1.4 : 0.65);
    }
  }

  function paintDisk(hole, time, front) {
    const count = Math.round((width < 760 ? 720 : 1180) * settings.density);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    {
      ctx.translate(hole.x, hole.y);
      ctx.rotate(hole.rotation);
      const coreGlow = ctx.createLinearGradient(-hole.outer, 0, hole.outer, 0);
      coreGlow.addColorStop(0, "rgba(99,207,216,0)");
      coreGlow.addColorStop(0.2, "rgba(219,133,48,.18)");
      coreGlow.addColorStop(0.42, "rgba(241,245,220,.44)");
      coreGlow.addColorStop(0.5, "rgba(255,225,170,.72)");
      coreGlow.addColorStop(0.58, "rgba(241,245,220,.44)");
      coreGlow.addColorStop(0.8, "rgba(219,133,48,.18)");
      coreGlow.addColorStop(1, "rgba(99,207,216,0)");
      ctx.strokeStyle = coreGlow;
      ctx.globalAlpha = 0.23;
      ctx.lineWidth = hole.radius * 0.1;
      ctx.beginPath();
      ctx.ellipse(0, 0, hole.radius * 2.25, hole.radius * 2.25 * hole.tilt, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.rotate(-hole.rotation);
      ctx.translate(-hole.x, -hole.y);
    }

    for (let i = 0; i < count; i += 1) {
      const band = Math.pow(hash(i * 8.31 + 4), 1.42);
      const radius = hole.radius * (1.08 + band * 2.24 + 0.025 * Math.sin(time * 0.6 + i * 1.9));
      const speed = 0.42 / Math.pow(radius / hole.radius, 1.35);
      const angle = hash(i * 4.17 + 12) * Math.PI * 2 + time * speed;
      const point = ellipsePoint(hole, radius, angle);
      if ((point.depth >= 0) !== front) continue;

      const heat = 1 - band;
      const energy = activeSignal ? 1.35 : 1;
      const alpha = (0.1 + heat * 0.62) * energy * (0.7 + 0.3 * Math.cos(angle)) * (0.8 + 0.2 * Math.sin(i * 2.4 + time));
      const red = 255;
      const green = Math.round(128 + heat * 115);
      const blue = Math.round(45 + heat * 163);
      const length = (1.8 + heat * 12) * (width < 760 ? 0.7 : 1);
      const next = ellipsePoint(hole, radius, angle + 0.012 + heat * 0.012);

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + (next.x - point.x) * length, point.y + (next.y - point.y) * length);
      ctx.strokeStyle = `rgba(${red},${green},${blue},${Math.min(alpha, 0.86)})`;
      ctx.lineWidth = 0.45 + heat * 1.65;
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintLens(hole, time) {
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.rotate(hole.rotation);
    ctx.globalCompositeOperation = "lighter";

    const halo = ctx.createRadialGradient(0, 0, hole.radius * 0.72, 0, 0, hole.outer);
    halo.addColorStop(0, "rgba(0,0,0,0)");
    halo.addColorStop(0.22, "rgba(255,183,89,.15)");
    halo.addColorStop(0.48, "rgba(155,85,30,.055)");
    halo.addColorStop(1, "rgba(5,7,10,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-hole.outer, -hole.outer, hole.outer * 2, hole.outer * 2);

    // Distorted rear-disk images: broad upper arch and compressed lower echo.
    // Short curved strands create texture without a solid white tube.
    for (const side of [-1, 1]) {
      for (let band = 0; band < 38; band += 1) {
        const spread = band / 37;
        for (let segment = 0; segment < 28; segment += 1) {
          const angle = segment / 28 * Math.PI;
          const heat = 1 - spread;
          const shimmer = 0.65 + 0.35 * Math.sin(segment * 1.7 + band * 0.9 - time * 0.8);
          ctx.beginPath();
          for (let step = 0; step <= 4; step += 1) {
            const a = angle + step / 4 * Math.PI / 28 * 0.95;
            const x = Math.cos(a) * hole.radius * (1.24 + spread * 0.75);
            const y = side * Math.sin(a) * hole.radius * (side < 0 ? 1.23 + spread * 0.47 : 1.16 + spread * 0.2);
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(255,${Math.round(155 + heat * 90)},${Math.round(65 + heat * 145)},${(0.12 + heat * 0.36) * shimmer * (side < 0 ? 1 : 0.52)})`;
          ctx.lineWidth = Math.max(0.7, hole.radius * 0.011);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function paintHorizon(hole, time) {
    const corona = ctx.createRadialGradient(hole.x, hole.y, hole.radius * 0.72, hole.x, hole.y, hole.radius * 1.18);
    corona.addColorStop(0, "rgba(0,0,0,1)");
    corona.addColorStop(0.72, "rgba(0,0,0,1)");
    corona.addColorStop(0.9, "rgba(38,25,11,.98)");
    corona.addColorStop(0.965, "rgba(255,217,153,.72)");
    corona.addColorStop(1, "rgba(99,207,216,0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius * 0.86, 0, Math.PI * 2);
    ctx.fill();

    const angle = time * 0.24;
    const flareX = hole.x + Math.cos(angle) * hole.radius * 0.93;
    const flareY = hole.y + Math.sin(angle) * hole.radius * 0.93;
    ctx.fillStyle = activeSignal ? "#ef5c68" : "rgba(217,222,229,.8)";
    ctx.shadowColor = activeSignal ? "#ef5c68" : "#63cfd8";
    ctx.shadowBlur = activeSignal ? 24 : 12;
    ctx.beginPath();
    ctx.arc(flareX, flareY, activeSignal ? 2.8 : 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function draw(now, once = false) {
    const elapsed = Math.min(Math.max((now - previousTime) / 1000, 0), 0.05);
    previousTime = now;
    timeScale += ((slow ? 0.07 : 1) - timeScale) * 0.08;
    if (!reducedMotion.matches) simulationTime += elapsed * timeScale * settings.speed;
    const time = reducedMotion.matches ? 3.8 : simulationTime;
    pointer.x += (pointer.targetX - pointer.x) * 0.032;
    pointer.y += (pointer.targetY - pointer.y) * 0.032;
    const hole = geometry();

    ctx.clearRect(0, 0, width, height);
    paintStars(time);
    paintDisk(hole, time, false);
    paintLens(hole, time);
    paintHorizon(hole, time);
    paintDisk(hole, time, true);

    if (!once && !reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now(), true);
  }

  function startLoop() {
    cancelAnimationFrame(frame);
    previousTime = performance.now();
    if (document.hidden) return;
    reducedMotion.matches ? draw(performance.now(), true) : (frame = requestAnimationFrame(draw));
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.targetX = event.clientX - width / 2;
    pointer.targetY = event.clientY - height / 2;
  }, { passive: true });
  document.addEventListener("visibilitychange", startLoop);
  reducedMotion.addEventListener?.("change", startLoop);

  function setSlow(value) {
    slow = value;
    observe?.setAttribute("aria-pressed", String(value));
  }
  if (observe) {
    observe.hidden = reducedMotion.matches;
    observe.addEventListener("click", () => setSlow(!slow));
    reducedMotion.addEventListener("change", () => {
      observe.hidden = reducedMotion.matches;
      setSlow(false);
    });
  }
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.target.closest("input, button, a, textarea, select, [contenteditable]") || reducedMotion.matches) return;
    event.preventDefault();
    setSlow(true);
  });
  window.addEventListener("keyup", (event) => { if (event.code === "Space") setSlow(false); });
  window.addEventListener("blur", () => setSlow(false));

  const controls = document.querySelector(".lab-controls");
  if (isLab && controls) {
    controls.hidden = false;
    const sync = () => {
      for (const key of Object.keys(settings)) {
        const input = controls.elements.namedItem(key);
        settings[key] = Number(input.value);
        document.getElementById(`${key}-value`).value = settings[key].toFixed(2);
      }
      if (reducedMotion.matches) draw(performance.now(), true);
    };
    controls.addEventListener("input", sync);
    controls.addEventListener("reset", () => requestAnimationFrame(sync));
    controls.addEventListener("submit", (event) => event.preventDefault());
  }
  document.querySelector('[data-signal="lab"]')?.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
    event.preventDefault();
    document.body.classList.add("entering");
    window.setTimeout(() => window.location.assign(event.currentTarget?.href || "lab/"), 650);
  });
  window.addEventListener("pageshow", () => document.body.classList.remove("entering"));

  links.forEach((link) => {
    const activate = () => { activeSignal = link.dataset.signal || ""; link.dataset.active = "true"; };
    const deactivate = () => { activeSignal = ""; delete link.dataset.active; };
    link.addEventListener("mouseenter", activate);
    link.addEventListener("mouseleave", deactivate);
    link.addEventListener("focus", activate);
    link.addEventListener("blur", deactivate);
  });

  resize();
  startLoop();
})();

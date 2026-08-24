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
  let burst = 0;
  const startedAt = performance.now();

  const hash = (value) => {
    const x = Math.sin(value * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  function geometry() {
    const mobile = width < 760;
    const radius = Math.min(width, height) * (mobile ? 0.155 : 0.215);
    return {
      x: width * (mobile ? 0.61 : 0.66) + pointer.x * 0.018,
      y: height * (mobile ? 0.45 : 0.51) + pointer.y * 0.014,
      radius,
      outer: radius * 2.75,
      tilt: mobile ? 0.34 : 0.285,
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
    const count = width < 760 ? 440 : 760;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < count; i += 1) {
      const band = Math.pow(hash(i * 8.31 + 4), 1.65);
      const radius = hole.radius * (1.18 + band * 1.72);
      const speed = 0.42 / Math.pow(radius / hole.radius, 1.35);
      const angle = hash(i * 4.17 + 12) * Math.PI * 2 + time * speed;
      const point = ellipsePoint(hole, radius, angle);
      if ((point.depth >= 0) !== front) continue;

      const heat = 1 - band;
      const energy = activeSignal ? 1.35 : 1;
      const alpha = (0.08 + heat * 0.48) * energy;
      const red = Math.round(99 + heat * 140);
      const green = Math.round(180 + heat * 56);
      const blue = Math.round(190 + heat * 46);
      const length = (1.2 + heat * 7.5) * (width < 760 ? 0.65 : 1);
      const next = ellipsePoint(hole, radius, angle + 0.012 + heat * 0.012);

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + (next.x - point.x) * length, point.y + (next.y - point.y) * length);
      ctx.strokeStyle = `rgba(${red},${green},${blue},${Math.min(alpha, 0.86)})`;
      ctx.lineWidth = 0.35 + heat * 1.15;
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
    halo.addColorStop(0.22, "rgba(99,207,216,.12)");
    halo.addColorStop(0.48, "rgba(58,126,143,.045)");
    halo.addColorStop(1, "rgba(5,7,10,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-hole.outer, -hole.outer, hole.outer * 2, hole.outer * 2);

    for (let i = 0; i < 5; i += 1) {
      const pulse = Math.sin(time * 0.22 + i) * 0.012;
      ctx.beginPath();
      ctx.ellipse(0, 0, hole.radius * (1.02 + i * 0.045 + pulse), hole.radius * (1.01 + i * 0.02), 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.strokeStyle = `rgba(129,225,232,${0.22 - i * 0.03})`;
      ctx.lineWidth = i === 0 ? 1.3 : 0.55;
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintHorizon(hole, time) {
    const corona = ctx.createRadialGradient(hole.x, hole.y, hole.radius * 0.72, hole.x, hole.y, hole.radius * 1.18);
    corona.addColorStop(0, "rgba(0,0,0,1)");
    corona.addColorStop(0.72, "rgba(0,0,0,1)");
    corona.addColorStop(0.9, "rgba(11,32,38,.98)");
    corona.addColorStop(0.965, "rgba(120,224,230,.72)");
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

  function paintJets(hole) {
    const strength = 0.09 + burst * 0.13;
    const length = hole.outer * (1.5 + burst * 0.2);
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.rotate(hole.rotation);
    const gradient = ctx.createLinearGradient(0, -length, 0, length);
    gradient.addColorStop(0, "rgba(99,207,216,0)");
    gradient.addColorStop(0.44, `rgba(99,207,216,${strength})`);
    gradient.addColorStop(0.5, "rgba(217,222,229,.38)");
    gradient.addColorStop(0.56, `rgba(99,207,216,${strength})`);
    gradient.addColorStop(1, "rgba(99,207,216,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-2, -length);
    ctx.lineTo(hole.radius * 0.08, 0);
    ctx.lineTo(2, length);
    ctx.lineTo(-hole.radius * 0.08, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw(now, once = false) {
    const time = reducedMotion.matches ? 3.8 : (now - startedAt) / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.032;
    pointer.y += (pointer.targetY - pointer.y) * 0.032;
    burst += ((activeSignal ? 1 : 0) - burst) * 0.055;
    const hole = geometry();

    ctx.clearRect(0, 0, width, height);
    paintStars(time);
    paintJets(hole);
    paintDisk(hole, time, false);
    paintLens(hole, time);
    paintHorizon(hole, time);
    paintDisk(hole, time, true);

    if (!once && !reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now(), true);
  }

  function startLoop() {
    cancelAnimationFrame(frame);
    reducedMotion.matches ? draw(performance.now(), true) : (frame = requestAnimationFrame(draw));
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.targetX = event.clientX - width / 2;
    pointer.targetY = event.clientY - height / 2;
  }, { passive: true });
  document.addEventListener("visibilitychange", startLoop);
  reducedMotion.addEventListener?.("change", startLoop);

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

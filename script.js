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
  const settings = { angle: 0.29, speed: 1, density: 1 };
  const isLab = document.body.classList.contains("lab");

  const hash = (value) => {
    const x = Math.sin(value * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  function geometry() {
    const mobile = width < 760;
    const radius = Math.min(width, height) * (mobile ? 0.19 : 0.175);
    return {
      x: width * (mobile ? 0.5 : isLab ? 0.55 : 0.66) + pointer.x * 0.018,
      y: height * (mobile ? 0.45 : 0.51) + pointer.y * 0.014,
      radius,
      outer: radius * (mobile ? 2.6 : 3.25),
      tilt: Math.min(0.88, Math.max(0.012, 0.008 + 2 * Math.pow(settings.angle, 3) + (isLab ? 0 : -pointer.y / Math.max(height, 1) * 0.65))),
      rotation: -0.035 + pointer.x / Math.max(width, 1) * 0.025,
    };
  }

  // Render an art-directed rear-disk lens image, not a general-relativity simulation.
  const emission = document.createElement("canvas");
  const glowContext = emission.getContext("2d");
  const seeds = Array.from({ length: 1500 }, (_, i) => ({
    band: hash(i * 8.31 + 4),
    phase: hash(i * 3.7) * Math.PI * 2,
    weight: hash(i * 5.9 + 2),
  }));

  function paintStars(hole, time) {
    for (let i = 0; i < 160; i += 1) {
      let x = hash(i + 2) * width;
      let y = hash(i * 3.73 + 9) * height;
      const dx = x - hole.x, dy = y - hole.y;
      const distance = Math.hypot(dx, dy);
      if (distance < hole.radius * 1.04) continue;
      // Gentle radial deflection and tangential elongation near the photon ring.
      const bend = Math.exp(-Math.pow((distance / hole.radius - 1.2) / 0.65, 2));
      x += dx * bend * 0.06;
      y += dy * bend * 0.06;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
      ctx.fillStyle = `rgba(180,198,209,${0.08 + hash(i + 23) * 0.24 + Math.sin(time * 0.15 + i) * 0.025})`;
      ctx.fillRect(0, 0, 0.6 + bend * 3, 0.65);
      ctx.restore();
    }
  }

  function archHeight(x, radius) {
    const ax = Math.abs(x);
    const join = radius * 0.87;
    if (ax <= join) return Math.sqrt(radius * radius - x * x);
    const height = Math.sqrt(radius * radius - join * join);
    // Match the circle's slope into a smooth shoulder that lands in the disk.
    const falloff = height * height / join;
    return height * Math.exp(-(ax - join) / falloff);
  }

  function paintArch(hole, time, side) {
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.rotate(hole.rotation);
    ctx.globalCompositeOperation = "lighter";
    // Overlapping soft strands fill the band, with no segmented angular grid.
    const count = 210;
    for (let i = 0; i < count; i += 1) {
      const seed = seeds[i];
      const band = seed.band;
      const radius = hole.radius * (1.008 + band * (side < 0 ? 0.542 : 0.452));
      const diskRadius = hole.radius * (1.18 + band * (hole.outer / hole.radius - 1.18));
      const inclinationBlend = Math.min(1, hole.tilt / 0.7);
      const envelope = Math.pow(Math.sin(Math.PI * band), 0.45);
      const heat = 1 - band;
      const pointAt = (phase) => {
        const x = -Math.cos(phase) * diskRadius;
        const projectedHeight = Math.sin(phase) * diskRadius * hole.tilt;
        // Smoothly join the lensed image to the very same projected disk orbit.
        // The envelope and its derivative vanish at both ends: no detached shoulders.
        const envelopePosition = Math.pow(Math.sin(phase), 2);
        const lensWeight = envelopePosition * (1 - inclinationBlend * inclinationBlend);
        const orbitTime = time * 0.65 / Math.pow(diskRadius / hole.radius, 1.4);
        const flow = Math.sin(phase * 17 + seed.phase - orbitTime);
        const turbulence = flow * Math.sin(phase * 7 - seed.phase + time * 0.18);
        const height = projectedHeight + Math.max(0, archHeight(x, radius) - projectedHeight) * lensWeight;
        const y = side * height * (1 + turbulence * 0.0025 * lensWeight);
        return { x, y };
      };
      ctx.beginPath();
      for (let j = 0; j <= 144; j += 1) {
        const { x, y } = pointAt(j / 144 * Math.PI);
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const warmth = band * band;
      const alpha = (0.05 + envelope * 0.12) * (side < 0 ? 1 : 0.8) * Math.pow(1 - inclinationBlend, 1.4);
      const color = `255,${Math.round(243 - warmth * 57)},${Math.round(201 - warmth * 94)}`;
      const fade = ctx.createLinearGradient(-diskRadius, 0, diskRadius, 0);
      fade.addColorStop(0, `rgba(${color},0)`);
      fade.addColorStop(0.12, `rgba(${color},${alpha * 0.25})`);
      fade.addColorStop(0.38, `rgba(${color},${alpha})`);
      fade.addColorStop(0.62, `rgba(${color},${alpha})`);
      fade.addColorStop(0.88, `rgba(${color},${alpha * 0.25})`);
      fade.addColorStop(1, `rgba(${color},0)`);
      ctx.strokeStyle = fade;
      ctx.lineWidth = hole.radius * (0.014 + seed.weight * 0.008);
      ctx.stroke();
      // Advect luminous knots on the same curve as the steady emission.
      // Keep the base light intact; rotating streaks only add energy.
      const orbit = seed.phase + time * 0.65 / Math.pow(diskRadius / hole.radius, 1.4);
      for (let knot = 0; knot < 3; knot += 1) {
        const angle = orbit + knot * Math.PI * 2 / 3;
        ctx.beginPath();
        let drawing = false;
        for (let step = 0; step <= 10; step += 1) {
          const t = angle + step / 10 * (0.055 + seed.weight * 0.09);
          if ((Math.sin(t) >= 0 ? 1 : -1) !== side) { drawing = false; continue; }
          const phase = Math.acos(-Math.cos(t));
          const { x, y } = pointAt(phase);
          if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,248,220,${0.24 * Math.pow(1 - inclinationBlend, 1.4)})`;
        ctx.lineWidth = hole.radius * (0.003 + seed.weight * 0.003);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function paintDisk(hole, time, front) {
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.rotate(hole.rotation);
    ctx.globalCompositeOperation = "lighter";
    // A luminous annulus uses the same inclination and depth split as its particles.
    // Its central hole remains empty even when viewed from above.
    ctx.save();
    ctx.scale(1, hole.tilt);
    for (let band = 0; band < 72; band += 1) {
      const fraction = band / 71;
      const radius = hole.radius * (1.18 + fraction * (hole.outer / hole.radius - 1.18));
      const heat = Math.pow(1 - fraction, 2);
      ctx.beginPath();
      ctx.arc(0, 0, radius, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.lineWidth = hole.radius * 0.038;
      ctx.strokeStyle = `rgba(255,226,171,${(0.02 + heat * 0.15) * Math.min(2.6, 0.5 / Math.sqrt(hole.tilt))})`;
      ctx.stroke();
    }
    ctx.restore();
    const count = Math.round((width < 760 ? 550 : 780) * settings.density);
    for (let i = 0; i < count; i += 1) {
      const seed = seeds[i];
      const radius = hole.radius * (1.18 + seed.band * (hole.outer / hole.radius - 1.18));
      const angle = seed.phase + time * 0.65 / Math.pow(radius / hole.radius, 1.4);
      const heat = Math.pow(1 - seed.band, 1.1);
      // Curved short streaks follow the same disk projection at every point.
      ctx.beginPath();
      let drawing = false;
      for (let j = 0; j <= 12; j += 1) {
        const t = angle + j / 12 * (0.12 + seed.weight * 0.32);
        if ((Math.sin(t) >= 0) !== front) { drawing = false; continue; }
        const r = radius * (1 + 0.002 * Math.sin(t * 13 - time * 0.7 + seed.phase));
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r * hole.tilt + hole.radius * 0.003 * Math.sin(t * 9 + seed.phase);
        if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,${Math.round(152 + heat * 98)},${Math.round(67 + heat * 153)},${(0.12 + heat * 0.7) * (0.75 + 0.25 * Math.cos(angle))})`;
      ctx.lineWidth = hole.radius * (0.002 + heat * 0.004);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintHorizon(hole) {
    ctx.save();
    ctx.fillStyle = "#010305";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();
    // Two narrow, differently exposed images of the photon ring.
    for (let i = 0; i < 2; i += 1) {
      const rim = ctx.createLinearGradient(hole.x, hole.y - hole.radius, hole.x, hole.y + hole.radius);
      rim.addColorStop(0, i ? "rgba(255,226,171,.3)" : "rgba(255,246,216,.9)");
      rim.addColorStop(0.5, "rgba(255,222,155,.18)");
      rim.addColorStop(1, i ? "rgba(255,221,158,.23)" : "rgba(255,241,202,.65)");
      ctx.strokeStyle = rim;
      ctx.lineWidth = hole.radius * (i ? 0.003 : 0.009);
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.radius * (1.018 + i * 0.05), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintBlackHole(hole, time) {
    if (!glowContext) return;
    ctx.clearRect(0, 0, width, height);
    paintDisk(hole, time, false);
    paintArch(hole, time, -1);
    paintArch(hole, time, 1);
    paintHorizon(hole);
    paintDisk(hole, time, true);
    glowContext.clearRect(0, 0, emission.width, emission.height);
    glowContext.drawImage(canvas, 0, 0, emission.width, emission.height);
    ctx.clearRect(0, 0, width, height);
    paintStars(hole, time);
    ctx.drawImage(emission, 0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    // Broad optical scatter, followed by a tighter bloom around hot gas.
    for (const [blur, alpha] of [[hole.radius * 0.22, 0.55], [hole.radius * 0.065, 0.65], [2, 0.22]]) {
      ctx.filter = `blur(${blur}px)`;
      ctx.globalAlpha = alpha * (activeSignal ? 1.15 : 1);
      ctx.drawImage(emission, 0, 0, width, height);
    }
    ctx.restore();
  }

  function draw(now, once = false) {
    const elapsed = Math.min(Math.max((now - previousTime) / 1000, 0), 0.05);
    previousTime = now;
    if (!reducedMotion.matches) simulationTime += elapsed * settings.speed;
    const time = reducedMotion.matches ? 3.8 : simulationTime;
    pointer.x += (pointer.targetX - pointer.x) * 0.032;
    pointer.y += (pointer.targetY - pointer.y) * 0.032;
    const hole = geometry();

    ctx.clearRect(0, 0, width, height);
    paintBlackHole(hole, time);

    if (!once && !reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    emission.width = Math.round(width);
    emission.height = Math.round(height);
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

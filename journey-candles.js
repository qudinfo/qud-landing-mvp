(() => {
  const canvas = document.querySelector('.qud-candles');
  const card = canvas?.closest('.qud-journey-card');
  if (!canvas || !card) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const count = 22, duration = 2600;
  let seed = 42691;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let last = 100, candles = [], candleIndex = 0;
  function newCandle() { candleIndex++; return { open:last, high:last, low:last, close:last }; }
  function tick(candle) {
    const phase = candleIndex % 21;
    const bias = phase < 5 ? -0.025 : phase < 10 ? 0.005 : 0.035;
    candle.close += (random() - 0.5) * 0.65 + bias;
    candle.high = Math.max(candle.high, candle.close);
    candle.low = Math.min(candle.low, candle.close);
    last = candle.close;
  }
  for (let i = 0; i < count + 1; i++) {
    const candle = newCandle();
    candles.push(candle);
    for (let j = 0; j < 12; j++) tick(candle);
  }
  let active = false, frame = 0, lastTime = 0, elapsed = 0, tickElapsed = 0, rangeMin, rangeMax;
  function draw() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, canvas.clientWidth), height = width * 130 / 240;
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const visible = candles.slice(-count - 1);
    const low = Math.min(...visible.map(c => c.low)), high = Math.max(...visible.map(c => c.high));
    const pad = Math.max((high-low)*0.14, 0.8), targetMin = low-pad, targetMax = high+pad;
    rangeMin = rangeMin === undefined ? targetMin : rangeMin + (targetMin-rangeMin)*0.045;
    rangeMax = rangeMax === undefined ? targetMax : rangeMax + (targetMax-rangeMax)*0.045;
    const y = v => height - (v-rangeMin)/(rangeMax-rangeMin)*height;
    const spacing = width/count, shift = Math.min(elapsed/500, 1)*spacing;
    visible.forEach((c, i) => {
      const x = (i-0.5)*spacing-shift;
      if (x < -spacing || x > width+spacing) return;
      const up = c.close >= c.open;
      ctx.strokeStyle = up ? '#8aa2b5' : '#64798a';
      ctx.fillStyle = up ? '#819bad' : '#526777';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y(c.high)); ctx.lineTo(x, y(c.low)); ctx.stroke();
      const top = Math.min(y(c.open),y(c.close)), bodyHeight = Math.max(1.2, Math.abs(y(c.open)-y(c.close)));
      ctx.fillRect(x-spacing*0.25, top, spacing*0.5, bodyHeight);
    });
  }
  function animate(time) {
    if (!active) return;
    const delta = lastTime ? Math.min(time-lastTime, 100) : 0;
    lastTime = time; elapsed += delta; tickElapsed += delta;
    while (tickElapsed >= 75) { tick(candles[candles.length-1]); tickElapsed -= 75; }
    if (elapsed >= duration) { elapsed -= duration; candles.push(newCandle()); if (candles.length > 100) candles.shift(); }
    draw(); frame = requestAnimationFrame(animate);
  }
  function start() { if (active || reduced.matches) return; active = true; lastTime = 0; frame = requestAnimationFrame(animate); }
  function stop() { active = false; cancelAnimationFrame(frame); lastTime = 0; }
  card.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') start(); });
  card.addEventListener('pointerleave', stop);
  card.addEventListener('focusin', start);
  card.addEventListener('focusout', stop);
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); draw(); });
  window.addEventListener('resize', draw);
  draw();
})();

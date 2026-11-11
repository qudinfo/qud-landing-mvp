(() => {
  const visual = document.querySelector('.qud-journey-bars');
  const card = visual?.closest('.qud-journey-card');
  if (!card) return;
  const day = visual.querySelector('[data-observation-day]');
  const bars = [...visual.querySelectorAll('.qud-observation-row > i')];
  const hands = visual.querySelectorAll('.qud-observation-clock i');
  const line = visual.querySelector('.qud-observation-line');
  const defaults = bars.map(bar => bar.style.getPropertyValue('--level'));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cycle = 11000, fillTime = 8700;
  let running = false, frame = 0, startTime = 0;
  const targets = [.8, .65, .9, .67];
  const curves = [
    [[0,0],[.18,.23],[.31,.27],[.54,.64],[.72,.7],[1,1]],
    [[0,0],[.14,.06],[.37,.38],[.55,.41],[.76,.8],[1,1]],
    [[0,0],[.12,.16],[.35,.19],[.5,.54],[.83,.87],[1,1]],
    [[0,0],[.2,.08],[.4,.37],[.6,.55],[.7,.58],[1,1]]
  ];
  function interpolate(points, t) {
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i][0]) {
        const [x0,y0] = points[i-1], [x1,y1] = points[i];
        const u = (t-x0)/(x1-x0), smooth = u*u*(3-2*u);
        return y0+(y1-y0)*smooth;
      }
    }
    return 1;
  }
  function render(time) {
    if (!running) return;
    if (!startTime) startTime = time;
    const elapsed = (time-startTime)%cycle;
    const progress = Math.min(elapsed/fillTime, 1);
    day.textContent = String(Math.min(30, 1+Math.floor(progress*29))).padStart(2,'0');
    line.style.setProperty('--progress', (progress*100).toFixed(2)+'%');
    if (card.matches(':hover, :focus-within')) bars.forEach((bar,i) => bar.style.setProperty('--level', (targets[i]*interpolate(curves[i],progress)*100).toFixed(2)+'%'));
    else bars.forEach((bar,i) => bar.style.setProperty('--level',defaults[i]));
    hands[0].style.transform = `rotate(${elapsed*0.36}deg)`;
    hands[1].style.transform = `rotate(${elapsed*0.03}deg)`;
    frame = requestAnimationFrame(render);
  }
  function start() {
    if (running || motion.matches) return;
    running = true; startTime = 0;
    card.classList.add('is-observing');
    day.textContent = '01';
    frame = requestAnimationFrame(render);
  }
  function stop() {
    running = false; cancelAnimationFrame(frame);
    card.classList.remove('is-observing');
    bars.forEach((bar,i) => bar.style.setProperty('--level',defaults[i]));
    day.textContent = '01';
  }
  motion.addEventListener('change', () => { if (motion.matches) stop(); else start(); });
  start();
})();

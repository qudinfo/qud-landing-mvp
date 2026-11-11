(() => {
  const profile = document.querySelector('.qud-profile');
  const card = profile?.closest('.qud-journey-card');
  if (!card) return;
  const score = profile.querySelector('.qud-gauge-value');
  const arc = profile.querySelector('.qud-gauge-fill');
  const line = profile.querySelector('.qud-history-line');
  const dot = profile.querySelector('.qud-profile-history circle');
  const metrics = [...profile.querySelectorAll('.qud-profile-stats span')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const figures = metrics.map(metric => metric.querySelector('b'));
  const weeklyValues = [
    ['+8.4%', '0.7%', '6.4%'],
    ['+8.8%', '0.8%', '6.5%'],
    ['+8.5%', '0.7%', '6.4%'],
    ['+9.1%', '0.8%', '6.6%'],
    ['+8.9%', '0.7%', '6.5%']
  ];
  let week = 0, counterFrame, counterStart;
  let currentValues = weeklyValues[0].map(Number.parseFloat);
  function updateFigures(time) {
    if (counterStart === undefined) counterStart = time;
    const t = Math.min((time-counterStart)/1200, 1), ease = t*t*(3-2*t);
    figures.forEach((figure,i) => {
      const value = currentValues[i] + (Number.parseFloat(weeklyValues[week][i])-currentValues[i])*ease;
      figure.textContent = (i === 0 && value >= 0 ? '+' : '') + value.toFixed(1) + '%';
    });
    if (t < 1) counterFrame = requestAnimationFrame(updateFigures);
    else currentValues = weeklyValues[week].map(Number.parseFloat);
  }
  setInterval(() => {
    if (reduced.matches || document.hidden) return;
    cancelAnimationFrame(counterFrame);
    currentValues = figures.map(figure => Number.parseFloat(figure.textContent));
    week = (week + 1) % weeklyValues.length;
    counterStart = undefined;
    counterFrame = requestAnimationFrame(updateFigures);
  }, 1200);
  let frame, running = false, origin;
  const scoreEnd = 82, drawTime = 3500, cycle = 9000;
  function restore() {
    score.textContent = scoreEnd;
    arc.style.strokeDasharray = '82 100'; line.style.clipPath = 'none'; dot.style.opacity = '1';
  }
  function render(time) {
    if (!running) return;
    if (origin === undefined) origin = time;
    const elapsed = (time-origin)%cycle, t = Math.min(elapsed/drawTime,1), ease = t*t*(3-2*t);
    score.textContent = Math.round(scoreEnd*ease);
    arc.style.strokeDasharray = `${scoreEnd*ease} 100`;
    line.style.clipPath = `inset(0 ${100*(1-ease)}% 0 0)`;
    dot.style.opacity = t >= 1 ? '1' : '0';
    frame = requestAnimationFrame(render);
  }
  function start() { if (running || reduced.matches) return; running=true; origin=undefined; frame=requestAnimationFrame(render); }
  function stop() { running=false; cancelAnimationFrame(frame); restore(); }
  card.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') start(); });
  card.addEventListener('pointerleave', () => { if (!card.matches(':focus-within')) stop(); });
  card.addEventListener('focusin', start);
  card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget) && !card.matches(':hover')) stop(); });
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  restore();
})();

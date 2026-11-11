(() => {
  const demo = document.querySelector('.qud-strategy-demo');
  const card = demo?.closest('.qud-journey-card');
  if (!demo || !card) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const title=demo.querySelector('.qud-compare-title'), line=demo.querySelector('.qud-compare-line');
  const metrics=['return','drawdown','history'].map(key=>demo.querySelector(`[data-metric="${key}"]`));
  const examples = [
    {name:'Стратегия A',values:['+5.2%','4.8%','24 недели'],path:'M1 39 L10 34 L19 38 L28 29 L37 32 L46 22 L55 28 L64 35 L73 31 L82 23 L91 25 L100 16 L109 20 L118 27 L127 19 L136 21 L145 11 L159 14'},
    {name:'Стратегия B',values:['+8.4%','6.4%','16 недель'],path:'M1 38 L10 35 L19 31 L28 36 L37 41 L46 32 L55 27 L64 29 L73 24 L82 29 L91 35 L100 29 L109 20 L118 23 L127 15 L136 19 L145 12 L159 9'},
    {name:'Стратегия C',values:['+3.7%','7.2%','32 недели'],path:'M1 31 L10 26 L19 32 L28 36 L37 29 L46 25 L55 31 L64 39 L73 44 L82 40 L91 31 L100 28 L109 32 L118 25 L127 28 L136 20 L145 23 L159 17'},
    {name:'Стратегия D',values:['+6.1%','5.5%','20 недель'],path:'M1 40 L10 36 L19 38 L28 31 L37 34 L46 38 L55 33 L64 26 L73 30 L82 23 L91 19 L100 25 L109 32 L118 27 L127 22 L136 25 L145 16 L159 18'}
  ];
  let active = false, timer, touchPlaying = false, frame, origin;
  let index = 0;
  function animate(time, example) {
    if (!active) return;
    if (origin === undefined) origin=time;
    const points=[...example.path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m=>[+m[1],+m[2]]);
    const progress=Math.min((time-origin)/4200,1), position=progress*(points.length-1), i=Math.min(Math.floor(position),points.length-2), fraction=position-i;
    const x=points[i][0]+(points[i+1][0]-points[i][0])*fraction, y=points[i][1]+(points[i+1][1]-points[i][1])*fraction;
    const shown=points.slice(0,i+1).concat([[x,y]]);
    line.setAttribute('d',shown.map((point,n)=>(n?'L':'M')+point[0].toFixed(2)+' '+point[1].toFixed(2)).join(' '));
    const delta=points[0][1]-points[points.length-1][1];
    const finalReturn=parseFloat(example.values[0]), observedReturn=delta ? finalReturn*(points[0][1]-y)/delta : 0;
    let peak=points[0][1], maxDip=0, fullPeak=points[0][1], fullDip=0;
    shown.forEach(point=>{peak=Math.min(peak,point[1]); maxDip=Math.max(maxDip,point[1]-peak);});
    points.forEach(point=>{fullPeak=Math.min(fullPeak,point[1]); fullDip=Math.max(fullDip,point[1]-fullPeak);});
    metrics[0].textContent=(observedReturn>=0?'+':'')+observedReturn.toFixed(1)+'%';
    metrics[1].textContent=(parseFloat(example.values[1])*(fullDip ? maxDip/fullDip : 0)).toFixed(1)+'%';
    metrics[2].textContent=Math.max(1,Math.round(parseInt(example.values[2],10)*progress))+' нед.';
    if(progress<1) frame=requestAnimationFrame(t=>animate(t,example));
  }
  function next() {
    if (!active) return;
    demo.dataset.phase = 'switching';
    timer = setTimeout(() => {
      if (!active) return;
      const example=examples[index];
      title.textContent=example.name;
      metrics.forEach((metric,i)=>{metric.textContent=example.values[i];});
      line.setAttribute('d',example.path);
      demo.dataset.phase='active';
      origin=undefined; cancelAnimationFrame(frame); frame=requestAnimationFrame(t=>animate(t,example));
      index=(index+1)%examples.length;
      timer=setTimeout(next,5200);
    },450);
  }
  function start() {
    if (active || reduced.matches) return;
    active = true; index = 0; demo.setAttribute('aria-pressed','true'); next();
  }
  function stop() {
    active = false; touchPlaying = false; clearTimeout(timer); cancelAnimationFrame(frame);
    const example=examples[(index+examples.length-1)%examples.length];
    title.textContent=example.name; metrics.forEach((metric,i)=>{metric.textContent=example.values[i];}); line.setAttribute('d',example.path);
    demo.dataset.phase = 'static'; demo.setAttribute('aria-pressed','false');
  }
  card.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') start(); });
  card.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && !card.matches(':focus-within')) stop(); });
  card.addEventListener('focusin', start);
  card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget) && !card.matches(':hover') && !touchPlaying) stop(); });
  demo.addEventListener('click', () => { if (touchPlaying) stop(); else { touchPlaying = true; start(); } });
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
})();

(() => {
  const deck=document.querySelector('.trade-deck');
  if (!deck) return;
  const cards=[...deck.querySelectorAll('.trade-card')], controls=[...document.querySelectorAll('[data-deck-go]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let current=0, timer, hovered=false, focused=false, visible=false;
  const riskCard=cards[0], riskChart=riskCard.querySelector('.risk-chart');
  const riskLine=riskChart.querySelector('.risk-line'), riskDots=[...riskChart.querySelectorAll('.risk-dots circle')];
  const riskCv=riskCard.querySelector('.trade-risk-cv b');
  const samples=riskDots.map(dot=>Number(dot.getAttribute('cy')));
  const riskAxis=riskCard.querySelector('.trade-chart-axis');
  riskAxis.textContent='';
  const weekTicks=Array.from({length:14},()=>{const tick=document.createElement('span');riskAxis.appendChild(tick);return tick;});
  weekTicks.forEach((tick,i)=>{tick.textContent=`W${i+1}`;tick.style.left=`${i/11*100}%`;tick.style.visibility=i<=11?'visible':'hidden';});
  let firstSample=0;
  let randomSeed=918273;
  function randomSample() {
    randomSeed=(1664525*randomSeed+1013904223)>>>0;
    return randomSeed/4294967296;
  }
  let lastSample=samples[samples.length-1];
  function nextRiskSample() {
    const shock=randomSample();
    const pull=(102-lastSample)*.32;
    const variation=(randomSample()-.5)*46;
    const outlier=shock<.10 ? -38-randomSample()*15 : shock>.94 ? 38+randomSample()*15 : 0;
    lastSample=Math.max(35,Math.min(165,lastSample+pull+variation+outlier));
    return lastSample;
  }
  let following=nextRiskSample();
  let sampleIndex=0, previousTime=0, progress=0;
  riskChart.setAttribute('preserveAspectRatio','none');
  const lossCard=cards[1], lossChart=lossCard.querySelector('.loss-chart');
  const riskDrift=lossCard.querySelector('.trade-risk-drift b');
  const lossLine=lossChart.querySelector('.planned-line'), lossGroup=lossChart.querySelector('.loss-bars');
  const lossBars=[...lossGroup.querySelectorAll('rect')];
  const lossAxis=lossCard.querySelector('.trade-chart-axis');
  const plannedValues=[101,96,108,98,106,99,113,105,98,104,110,102];
  const lossValues=lossBars.map(bar=>Number(bar.getAttribute('y')));
  let lossProgress=0, firstLossWeek=0;
  let nextPlanned=100, nextLoss=120;
  lossChart.setAttribute('preserveAspectRatio','none');
  lossAxis.textContent='';
  const lossTicks=Array.from({length:14},()=>{const tick=document.createElement('span');lossAxis.appendChild(tick);return tick;});
  lossTicks.forEach((tick,i)=>{tick.textContent=`W${i+1}`;tick.style.left=`${i/11*100}%`;tick.style.visibility=i<=11?'visible':'hidden';});
  function updateRisk(time) {
    const frameElapsed=previousTime ? Math.min(time-previousTime,50) : 0;
    if (!reduced.matches && visible && !document.hidden && current===0) {
    const elapsed=previousTime ? Math.min(time-previousTime,50) : 0;
    progress+=elapsed/1350;
    if (progress>=1) { samples.shift(); samples.push(following); following=nextRiskSample(); firstSample++; progress-=1; }
    const step=418/(samples.length-1);
    const points=samples.map((y,i)=>({x:30+(i-progress)*step,y}));
    const edgeY=samples[0]+(samples[1]-samples[0])*progress;
    const newY=samples[samples.length-1]+(following-samples[samples.length-1])*progress;
    const visiblePoints=[{x:30,y:edgeY},...points.slice(1),{x:448,y:newY}];
    riskLine.setAttribute('d',visiblePoints.map((point,i)=>`${i?'L':'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' '));
    riskDots.forEach((dot,i)=>{const point=points[i];dot.setAttribute('cx',point.x.toFixed(2));dot.setAttribute('cy',point.y);dot.style.visibility=point.x<30?'hidden':'visible';dot.classList.toggle('is-outside-risk',point.y<54 || point.y>140);});
    const firstWeek=Math.ceil((firstSample+progress)/2);
    weekTicks.forEach((tick,i)=>{
      const week=firstWeek+i, position=(week*2-firstSample-progress)/(samples.length-1)*100;
      tick.textContent=`W${week+1}`;
      tick.style.left=`${position}%`;
      tick.style.visibility=position>=0 && position<=100?'visible':'hidden';
    });
    const risks=[...samples.slice(1),newY].map(y=>(200-y)/50), mean=risks.reduce((sum,n)=>sum+n,0)/risks.length;
    const variance=risks.reduce((sum,n)=>sum+(n-mean)**2,0)/risks.length;
    const cv=Math.sqrt(variance)/mean;
    riskCv.textContent=cv.toFixed(2);
    riskCv.classList.toggle('is-high-risk',cv>=1);
    }
    if (!reduced.matches && visible && !document.hidden && current===1) {
      lossProgress+=frameElapsed/1600;
      if (lossProgress>=1) {
        plannedValues.shift(); plannedValues.push(nextPlanned);
        lossValues.shift(); lossValues.push(nextLoss);
        nextPlanned=Math.round(88+randomSample()*30);
        nextLoss=Math.round(Math.max(45,Math.min(178,nextPlanned+8+(randomSample()-.5)*85)));
        firstLossWeek++; lossProgress-=1;
      }
      const step=385/11;
      const coords=plannedValues.map((y,i)=>({x:46+(i-lossProgress)*step,y}));
      const startY=plannedValues[0]+(plannedValues[1]-plannedValues[0])*lossProgress;
      const endY=plannedValues[11]+(nextPlanned-plannedValues[11])*lossProgress;
      const recentAverage=(plannedValues[8]+plannedValues[9]+plannedValues[10]+endY)/4;
      const priorAverage=(plannedValues[0]+plannedValues[1]+plannedValues[2]+plannedValues[3])/4;
      const drift=((200-recentAverage)-(200-priorAverage))/(200-priorAverage)*100;
      riskDrift.textContent=`${drift>0?'+':''}${drift.toFixed(1)}%`;
      riskDrift.classList.toggle('is-high-risk',drift>0);
      const linePoints=[{x:46,y:startY},...coords.slice(1),{x:431,y:endY}];
      lossLine.setAttribute('d',linePoints.map((point,i)=>`${i?'L':'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' '));
      lossBars.forEach((bar,i)=>{
        const x=40+(i-lossProgress)*step, y=lossValues[i];
        bar.setAttribute('x',x.toFixed(2)); bar.setAttribute('y',y); bar.setAttribute('height',180-y);
        bar.style.visibility=x<40?'hidden':'visible';
        bar.classList.toggle('loss-over',y<plannedValues[i]);
      });
      const firstWeek=Math.ceil(firstLossWeek+lossProgress);
      lossTicks.forEach((tick,i)=>{const week=firstWeek+i, position=(week-firstLossWeek-lossProgress)/11*100;tick.textContent=`W${week+1}`;tick.style.left=`${position}%`;tick.style.visibility=position>=0 && position<=100?'visible':'hidden';});
    }
    previousTime=time;
    requestAnimationFrame(updateRisk);
  }
  requestAnimationFrame(updateRisk);
  function show(index) {
    current=(index+cards.length)%cards.length;
    cards.forEach((card,i)=>{
      const position=(i-current+cards.length)%cards.length;
      card.dataset.position=['front','middle','back'][position];
      card.setAttribute('aria-hidden',i===current?'false':'true');
      card.classList.remove('is-animating');
    });
    controls.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));
    if (!reduced.matches) requestAnimationFrame(()=>requestAnimationFrame(()=>cards[current].classList.add('is-animating')));
  }
  function schedule() { clearTimeout(timer); if (!reduced.matches && !hovered && !focused && visible && !document.hidden) timer=setTimeout(()=>{ show(current+1); schedule(); },current===2?12000:5000); }
  controls.forEach((button,i)=>button.addEventListener('click',()=>{show(i);schedule();}));
  const area=deck.closest('.trade-deck-area');
  area.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hovered=true;schedule();}});
  area.addEventListener('pointerleave',()=>{hovered=false;schedule();});
  area.addEventListener('focusin',()=>{focused=true;schedule();});
  area.addEventListener('focusout',e=>{if(!area.contains(e.relatedTarget)){focused=false;schedule();}});
  deck.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1));schedule();}});
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{show(current);schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(deck);
  show(0);
})();

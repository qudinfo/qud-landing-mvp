/* Decorative QUD screen: synthetic data and one ordered interaction sequence. */
(() => {
  const app = document.querySelector('[data-monitor-app]');
  if (!app) return;

  const strategies = [
    {
      id: 'QST-AX47', score: 74, zone: 'QUD Room', weeks: 12,
      trades: 46, wins: 27, factor: 1.36, risk: .62, safe: 96.2, sessions: 38, coverage: 99.4,
      returns: [0,.3,.15,.6,.9,.7,1.2,1.1,1.5,1.1,.8,.2,-.4,-.9,-1.4,-1.2,-1.8,-1.5,-.7,-.9,-.2,.4,.1,.8,1.3,.9,1.6,2.1,1.8,2.3,2.1,1.7,1.9,1.8,2,1.9,2.1,1.6,1,.5,.9,.7,1.3,1.8,2,2.5,2.2,2.8,3.1,2.7,2.4,2.8,3.3,3.7,3.5,4.1,3.8,4.8,4.5,4.2]
    },
    {
      id: 'QST-NV12', score: 68, zone: 'QUD Room', weeks: 16,
      trades: 58, wins: 30, factor: 1.21, risk: .71, safe: 94.8, sessions: 51, coverage: 98.7,
      returns: [0,-.2,.3,.1,.7,.4,.9,.6,.2,-.5,-1.1,-.7,-1.6,-2.4,-1.9,-2.2,-3.1,-3.8,-3.3,-3.9,-4.2,-3.6,-2.7,-3.1,-2.2,-1.6,-2,-.8,-1.1,-.2,.5,.2,.8,1.1,.7,.4,.6,.5,.8,.7,.4,.9,1.3,.8,.1,-.6,-.3,-.8,-.2,.4,.9,.6,1.2,1,1.6,1.3,1.9,2.4,2,2.2]
    },
    {
      id: 'QST-RK31', score: 65, zone: 'QUD Core', weeks: 10,
      trades: 37, wins: 18, factor: .94, risk: .58, safe: 97.3, sessions: 29, coverage: 99.1,
      returns: [0,.4,.2,.8,.5,1.1,1.6,1.3,1.8,2.1,1.7,1.2,1.5,.6,.2,-.5,-.1,-.8,-1.6,-1.3,-2,-2.4,-1.7,-2.6,-3.1,-2.8,-3.5,-3.9,-3.2,-2.7,-3,-2.1,-1.8,-2.2,-1.3,-.8,-1.1,-.4,-.7,-1.4,-1,-1.8,-2.3,-1.7,-1.4,-.8,-1.1,-.6,-1,-1.6]
    },
    {
      id: 'QST-LM08', score: 71, zone: 'QUD Room', weeks: 14,
      trades: 42, wins: 24, factor: 1.29, risk: .54, safe: 96.8, sessions: 43, coverage: 99.6,
      returns: [0,-.3,.1,.5,.3,.9,1.2,.7,1.4,1.6,1.1,.6,.8,.2,-.4,-.1,-.8,-1.2,-.7,-1,.1,.5,.2,1,1.3,.9,1.5,2,1.7,2.2,1.8,1.9,1.8,2.1,2,2.2,2.1,1.6,1.3,.8,1.1,.7,1.6,2,1.8,2.5,2.2,2.8,3.4,3.1]
    }
  ];
  // One continuous account history. Periods use its trailing observations.
  const portfolio = [27500,27590,27535,27670,27720,27610,27835,27940,27820,28080,28210,28105,28360,28490,28310,28540,28610,28470,28590,28410,28360,28420,28310,28380,28270,28080,27930,28010,27810,27660,27790,27520,27480,27240,27380,27120,26960,27040,26820,26760,26910,27280,27380,27520,27410,27670,27860,27720,27640,27610,27680,27590,27630,27420,27210,27080,27240,27510,27680,28120,28210,28060,28084];
  const dollars = value => '$' + Math.round(value).toLocaleString('en-US');
  const pct = (value, digits = 1) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
  const last = values => values[values.length - 1];
  const drawdowns = values => {
    let peak = 100;
    return values.map(value => {
      const equity = 100 + value;
      peak = Math.max(peak, equity);
      return (equity / peak - 1) * 100;
    });
  };
  const portfolioReturn = portfolio.map(value => (value / portfolio[0] - 1) * 100);
  const maxPortfolioDrawdown = -Math.min(...drawdowns(portfolioReturn));

  app.innerHTML = `
    <div class="monitor-pane monitor-strategies">
      <div class="monitor-title"><span class="monitor-brand">QUD</span><span class="monitor-title-divider"></span><span>Strategies</span></div>
      <div class="monitor-columns"><span></span><span>Strategy ID</span><span>Trust Score</span><span>Trust Zone</span><span>Win Ratio</span><span>History</span></div>
      <div class="monitor-rows">${strategies.map((s, i) => `<div class="monitor-row" data-strategy="${i}"><span class="monitor-row-dot"></span><span>${s.id}</span><span>${s.score}</span><span>${s.zone}</span><span>${(s.wins / s.trades * 100).toFixed(1)}%</span><span class="monitor-row-history">${s.weeks} weeks<span class="monitor-row-arrow">›</span></span></div>`).join('')}</div>
      <div class="monitor-detail">
        <div class="monitor-detail-toggle"><span class="monitor-detail-caption"><span class="monitor-selected-dot"></span><span data-detail-id></span></span><span class="monitor-detail-age" data-detail-age></span><span class="monitor-chevron"></span></div>
        <div class="monitor-detail-body">
          <div class="monitor-stats">${['Closed trades','Return','Max drawdown','Profit factor','Average risk','SL Safe'].map((label,i)=>`<div class="monitor-stat"><span class="monitor-stat-label">${label}</span><span class="monitor-stat-value" data-stat="${i}"></span></div>`).join('')}</div>
          <div class="monitor-meta">${['Observed weeks','Monitored sessions','Data coverage'].map((label,i)=>`<div class="monitor-stat"><span class="monitor-stat-label">${label}</span><span class="monitor-stat-value" data-meta="${i}"></span></div>`).join('')}</div>
          <div class="monitor-detail-charts">
            <div><div class="monitor-chart-heading"><span>Cumulative return · 90D</span><span data-return-value></span></div><div class="monitor-plot" data-return-chart></div></div>
            <div><div class="monitor-chart-heading"><span>Drawdown</span><span data-drawdown-value></span></div><div class="monitor-plot" data-drawdown-chart></div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="monitor-pane monitor-portfolio">
      <div class="monitor-title"><span class="monitor-brand">QUD</span><span class="monitor-title-divider"></span><span>Virtual Portfolio</span></div>
      <div class="monitor-summary">${[
        ['Allocated', dollars(portfolio[0])], ['Current balance', dollars(last(portfolio))], ['Net result', '+' + dollars(last(portfolio)-portfolio[0])],
        ['Total return', pct(last(portfolioReturn),2)], ['Max drawdown', maxPortfolioDrawdown.toFixed(2)+'%'], ['Active strategies','3']
      ].map(([label,value])=>`<div class="monitor-summary-cell"><span class="monitor-stat-label">${label}</span><span class="monitor-stat-value">${value}</span></div>`).join('')}</div>
      <div class="monitor-portfolio-heading"><span>Portfolio balance</span><div class="monitor-period"><div class="monitor-period-trigger"><span data-period-label>Last 30 days</span><span class="monitor-chevron"></span></div><div class="monitor-period-menu">${[7,30,90].map(days=>`<div class="monitor-period-option" data-period="${days}"><span>${days} days</span><span class="monitor-period-check"></span></div>`).join('')}</div></div></div>
      <div class="monitor-portfolio-plot" data-portfolio-chart></div>
      <div class="monitor-allocation"><div class="monitor-allocation-title">Strategy allocation</div>${[['QST-AX47',45],['QST-NV12',35],['QST-RK31',20]].map(([id,weight])=>`<div class="monitor-allocation-row"><span>${id}</span><span class="monitor-allocation-weight"><span class="monitor-allocation-track"><i style="width:${weight}%"></i></span>${weight}%</span></div>`).join('')}</div>
    </div>
    <div class="monitor-cursor"><svg viewBox="0 0 10 13"><path d="M1 1v10l2.7-2.6 1.8 3.5 1.4-.8-1.7-3.3H9Z" fill="#bfcbd4" stroke="#0b1117" stroke-width=".9" /></svg></div>`;

  let chartId = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resample = (values, count = 64) => Array.from({ length: count }, (_, i) => {
    const at = i / (count - 1) * (values.length - 1);
    const lo = Math.floor(at);
    return values[lo] + (values[Math.min(lo + 1, values.length - 1)] - values[lo]) * (at - lo);
  });

  class ScreenChart {
    constructor(container, width, height, currency = false) {
      this.width = width; this.height = height; this.currency = currency;
      this.plot = { left: currency ? 35 : 22, top: 8, right: width - 6, bottom: height - 18 };
      const id = `monitor-chart-${++chartId}`;
      container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><clipPath id="${id}"><rect x="${this.plot.left}" y="${this.plot.top-2}" width="${this.plot.right-this.plot.left+2}" height="${this.plot.bottom-this.plot.top+4}" /></clipPath></defs><g data-grid></g><g clip-path="url(#${id})"><path data-area fill="#58738c" opacity=".065"/><path data-zero fill="none" stroke="#425463" stroke-width=".6" stroke-dasharray="2 3"/><path data-line fill="none" stroke="${currency?'#7797b2':'#6989a4'}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/><circle data-end r="1.8" fill="#7a9bb7"/></g><g data-dates></g><g class="monitor-tooltip" data-tooltip opacity="0"></g></svg>`;
      this.svg = container.firstElementChild;
      this.parts = Object.fromEntries(['grid','area','zero','line','end','dates','tooltip'].map(key=>[key,this.svg.querySelector(`[data-${key}]`)]));
    }
    format(value) { return this.currency ? dollars(value) : value.toFixed(1) + '%'; }
    coordinates(values, domain) {
      const p = this.plot;
      return values.map((v,i)=>[p.left + i/(values.length-1)*(p.right-p.left), p.bottom-(v-domain[0])/(domain[1]-domain[0])*(p.bottom-p.top)]);
    }
    paint(values, domain) {
      this.values = values; this.domain = domain;
      const p = this.plot, points = this.coordinates(values,domain);
      const d = points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
      this.parts.line.setAttribute('d', d);
      this.parts.area.setAttribute('d', `${d} L${p.right} ${p.bottom} L${p.left} ${p.bottom} Z`);
      this.parts.end.setAttribute('cx',last(points)[0]); this.parts.end.setAttribute('cy',last(points)[1]);
      const zeroY = p.bottom - (0-domain[0])/(domain[1]-domain[0])*(p.bottom-p.top);
      this.parts.zero.setAttribute('d', zeroY >= p.top && zeroY <= p.bottom ? `M${p.left} ${zeroY}H${p.right}` : '');
      this.parts.grid.innerHTML = Array.from({length:4},(_,i)=>{
        const y=p.top+i/3*(p.bottom-p.top), value=domain[1]-i/3*(domain[1]-domain[0]);
        const label=this.currency?'$'+(value/1000).toFixed(1)+'k':value.toFixed(1)+'%';
        return `<path d="M${p.left} ${y}H${p.right}" stroke="#26343f" stroke-width=".5"/><text x="${p.left-5}" y="${y+2}" text-anchor="end" font-family="Arial" font-size="6.2" fill="#697e8f">${label}</text>`;
      }).join('');
    }
    set(values, labels, animate = true) {
      const target = resample(values), lo = Math.min(...target), hi = Math.max(...target);
      const pad = Math.max((hi-lo)*.12, this.currency?30:.25);
      const domain=[lo-pad,hi+pad];
      if(!this.currency) { domain[0]=Math.min(domain[0],0); domain[1]=Math.max(domain[1],0); }
      const p=this.plot;
      this.parts.dates.innerHTML=labels.map((label,i)=>`<text x="${p.left+i/2*(p.right-p.left)}" y="${this.height-4}" text-anchor="${i===0?'start':i===2?'end':'middle'}" font-family="Arial" font-size="6.2" fill="#697e8f">${label}</text>`).join('');
      this.hidePoint();
      cancelAnimationFrame(this.frame);
      if(!this.values || !animate || reduceMotion.matches) { this.paint(target,domain); return; }
      const from=this.values.slice(), oldDomain=this.domain.slice(); let started;
      const tick=now=>{
        if(started===undefined) started=now;
        const t=Math.min(1,(now-started)/540), eased=t*t*(3-2*t);
        this.paint(target.map((v,i)=>from[i]+(v-from[i])*eased),domain.map((v,i)=>oldDomain[i]+(v-oldDomain[i])*eased));
        if(t<1)this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);
    }
    showPoint(fraction) {
      const i=Math.round((this.values.length-1)*fraction), point=this.coordinates(this.values,this.domain)[i];
      const [x,y]=point, w=this.currency?65:52, tx=Math.min(this.width-w-2,Math.max(this.plot.left,x-w/2)),ty=Math.max(1,y-29);
      this.parts.tooltip.innerHTML=`<path d="M${x} ${this.plot.top}V${this.plot.bottom}" stroke="#526d83" stroke-width=".65" stroke-dasharray="2 2"/><circle cx="${x}" cy="${y}" r="2" fill="#9cb2c4"/><rect x="${tx}" y="${ty}" width="${w}" height="21" rx="2" fill="#152431" stroke="#40576a" stroke-width=".6"/><text x="${tx+5}" y="${ty+9}" font-family="Arial" font-size="7" fill="#c0ced9">${this.format(this.values[i])}</text><text x="${tx+5}" y="${ty+17}" font-family="Arial" font-size="5.8" fill="#7e95a7">Account balance</text>`;
      this.parts.tooltip.setAttribute('opacity','1');
    }
    hidePoint() { this.parts.tooltip.setAttribute('opacity','0'); }
  }

  const returnChart = new ScreenChart(app.querySelector('[data-return-chart]'),246,89);
  const drawdownChart = new ScreenChart(app.querySelector('[data-drawdown-chart]'),150,89);
  const portfolioChart = new ScreenChart(app.querySelector('[data-portfolio-chart]'),326,133,true);
  const rows=[...app.querySelectorAll('[data-strategy]')], detail=app.querySelector('.monitor-detail');
  const period=app.querySelector('.monitor-period'), cursor=app.querySelector('.monitor-cursor');
  const options=[...app.querySelectorAll('[data-period]')];
  let selected=0, days=30;

  function renderStrategy(index, animate=true) {
    selected=index;
    const s=strategies[index], dd=drawdowns(s.returns), maxDD=-Math.min(...dd);
    rows.forEach((row,i)=>row.classList.toggle('is-selected',i===index));
    app.querySelector('[data-detail-id]').textContent=s.id;
    app.querySelector('[data-detail-age]').textContent=s.weeks+' weeks observed';
    [s.trades,pct(last(s.returns)),maxDD.toFixed(1)+'%',s.factor.toFixed(2),s.risk.toFixed(2)+'%',s.safe.toFixed(1)+'%'].forEach((v,i)=>{app.querySelector(`[data-stat="${i}"]`).textContent=v;});
    [s.weeks,s.sessions,s.coverage.toFixed(1)+'%'].forEach((v,i)=>{app.querySelector(`[data-meta="${i}"]`).textContent=v;});
    app.querySelector('[data-return-value]').textContent=pct(last(s.returns));
    app.querySelector('[data-drawdown-value]').textContent=last(dd).toFixed(1)+'%';
    returnChart.set(s.returns,['Jul 01','Aug 15','Sep 30'],animate);
    drawdownChart.set(dd,['Jul','Aug','Sep'],animate);
    app.dataset.selectedStrategy=s.id;
  }
  function renderPeriod(value, animate=true) {
    days=value;
    app.querySelector('[data-period-label]').textContent=`Last ${days} days`;
    options.forEach(option=>{
      const active=Number(option.dataset.period)===days;
      option.classList.toggle('is-selected',active);
      option.querySelector('.monitor-period-check').textContent=active?'✓':'';
    });
    const count=days===90?portfolio.length:days===30?22:6;
    const labels=days===90?['Jul 01','Aug 15','Sep 30']:days===30?['Sep 01','Sep 15','Sep 30']:['Sep 23','Sep 26','Sep 30'];
    portfolioChart.set(portfolio.slice(-count),labels,animate);
    app.dataset.period=String(days);
  }
  let hoverTimer;
  function pointAt(element, fx=.62, fy=.55, instant=false) {
    clearTimeout(hoverTimer);
    app.querySelectorAll('.is-hovered').forEach(el=>el.classList.remove('is-hovered'));
    const b=app.getBoundingClientRect(),r=element.getBoundingClientRect();
    const x=(r.left-b.left+r.width*fx)*797/b.width, y=(r.top-b.top+r.height*fy)*378/b.height;
    if(instant)cursor.style.transition='none';
    cursor.style.transform=`translate(${x}px,${y}px)`;
    if(instant)requestAnimationFrame(()=>{cursor.style.transition='';});
    hoverTimer=setTimeout(()=>element.classList.add('is-hovered'),instant?0:450);
  }
  function click() {
    cursor.classList.remove('is-clicking');
    void cursor.offsetWidth;
    cursor.classList.add('is-clicking');
  }
  function chooseStrategy(index) {
    click();
    rows.forEach((row,i)=>row.classList.toggle('is-selected',i===index));
    detail.classList.add('is-collapsed');
    setTimeout(()=>{
      renderStrategy(index);
      requestAnimationFrame(()=>detail.classList.remove('is-collapsed'));
    },240);
  }
  function menu(open) { period.classList.toggle('is-open',open); }
  function choosePeriod(value) { click(); menu(false); renderPeriod(value); }

  renderStrategy(0,false); renderPeriod(30,false);
  pointAt(rows[0],.75,.5,true);

  // Map the overlay to exactly the same crop as the photographic background.
  const scene=app.closest('.hero'), visual=app.closest('.hero-photo-visual');
  const overlay=app.closest('.hero-monitor-motion'), grid=scene.querySelector('.hero-grid');
  function alignScreen() {
    const mobile=window.matchMedia('(max-width: 980px)').matches;
    const host=mobile?visual:scene, parent=mobile?visual:grid;
    const r=host.getBoundingClientRect(),p=parent.getBoundingClientRect();
    const w=host.clientWidth,h=host.clientHeight,scale=Math.max(w/1672,h/941);
    const positionX=mobile?(window.matchMedia('(max-width: 640px)').matches ? .72 : .5):(window.matchMedia('(max-width: 1100px)').matches ? .54 : .5);
    Object.assign(overlay.style,{width:`${1672*scale}px`,height:`${941*scale}px`,left:`${r.left-p.left+(w-1672*scale)*positionX}px`,top:`${r.top-p.top+(h-941*scale)*.5}px`,transform:'none'});
  }
  new ResizeObserver(alignScreen).observe(scene);
  new ResizeObserver(alignScreen).observe(visual);
  alignScreen();

  let elapsed=0,nextAction=0,actions=[],frame,lastTime,visible=false;
  function planCycle() {
    const target=selected===0?1:0, nextDays=days===30?90:30;
    const trigger=app.querySelector('.monitor-period-trigger');
    const option=app.querySelector(`[data-period="${nextDays}"]`);
    const toggle=app.querySelector('.monitor-detail-toggle');
    actions=[
      [900,'row-hover',()=>pointAt(rows[target],.74,.5)],
      [1550,'row-scan',()=>pointAt(rows[2],.73,.5)],
      [2200,'row-target',()=>pointAt(rows[target],.73,.5)],
      [2800,'strategy-select',()=>chooseStrategy(target)],
      [6100,'period-target',()=>pointAt(trigger)],
      [6750,'period-open',()=>{click();menu(true);}],
      [7300,'period-option',()=>pointAt(option,.52,.5)],
      [7950,'period-select',()=>choosePeriod(nextDays)],
      [10100,'chart-target',()=>{
        const points=portfolioChart.coordinates(portfolioChart.values,portfolioChart.domain);
        const [x,y]=points[Math.round((points.length-1)*.54)];
        pointAt(portfolioChart.svg,x/portfolioChart.width,y/portfolioChart.height);
      }],
      [10700,'chart-inspect',()=>portfolioChart.showPoint(.54)],
      [12500,'detail-target',()=>{portfolioChart.hidePoint();pointAt(toggle,.96,.5);}],
      [13200,'detail-close',()=>{click();detail.classList.add('is-collapsed');}],
      [14500,'detail-open',()=>{click();detail.classList.remove('is-collapsed');}],
      [15900,'rest',()=>pointAt(rows[target],.75,.5)]
    ];
    nextAction=0;
  }
  planCycle();
  function tick(now) {
    if(lastTime!==undefined)elapsed+=Math.min(now-lastTime,100);
    lastTime=now;
    while(nextAction<actions.length&&elapsed>=actions[nextAction][0]) {
      const [,name,action]=actions[nextAction++]; app.dataset.scene=name; action();
    }
    if(elapsed>=18000) {elapsed-=18000;planCycle();}
    frame=requestAnimationFrame(tick);
  }
  function syncPlayback() {
    cancelAnimationFrame(frame);lastTime=undefined;
    if(visible&&!document.hidden&&!reduceMotion.matches)frame=requestAnimationFrame(tick);
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncPlayback();},{threshold:.05}).observe(scene);
  document.addEventListener('visibilitychange',syncPlayback);
  reduceMotion.addEventListener('change',()=>{
    menu(false);portfolioChart.hidePoint();
    if(reduceMotion.matches) {
      detail.classList.remove('is-collapsed');
      renderStrategy(selected,false);renderPeriod(days,false);
    }
    syncPlayback();
  });
})();

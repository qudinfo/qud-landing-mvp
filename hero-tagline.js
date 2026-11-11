(() => {
  const viewport = document.querySelector('[data-hero-tagline]');
  const track = viewport?.querySelector('[data-hero-tagline-track]');
  const slides = track ? Array.from(track.children) : [];
  if (!viewport || !track || slides.length < 3) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 5000;
  const duration = 520;
  let index = 0;
  let timer = 0;

  const sizeSlides = () => {
    slides.forEach((slide) => { slide.style.height = ''; });
    const height = Math.max(...slides.map((slide) => slide.getBoundingClientRect().height));
    slides.forEach((slide) => { slide.style.height = `${height}px`; });
    viewport.style.height = `${height}px`;
    track.style.transition = 'none';
    track.style.transform = `translateY(-${slides[index].offsetTop - slides[0].offsetTop}px)`;
  };

  const stop = () => {
    window.clearTimeout(timer);
    timer = 0;
  };

  const schedule = () => {
    stop();
    if (reducedMotion.matches || document.hidden) return;
    timer = window.setTimeout(advance, interval);
  };

  const advance = () => {
    const nextIndex = index + 1;
    track.style.transition = `transform ${duration}ms cubic-bezier(.22,.72,.24,1)`;
    track.style.transform = `translateY(-${slides[nextIndex].offsetTop - slides[0].offsetTop}px)`;
    index = nextIndex;

    if (index === slides.length - 1) {
      window.setTimeout(() => {
        track.style.transition = 'none';
        track.style.transform = 'translateY(0)';
        index = 0;
      }, duration);
    }
    schedule();
  };

  sizeSlides();
  window.addEventListener('resize', sizeSlides, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', schedule);
  schedule();
})();

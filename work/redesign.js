(() => {
  const slides = [...document.querySelectorAll('main > .slide')];
  const select = document.querySelector('#slide-select');
  const counter = document.querySelector('#slide-counter');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const progress = document.querySelector('.progress i');
  let current = 0;
  const mainSlides = slides.filter(s => !s.classList.contains('appendix'));
  slides.forEach((slide, i) => {
    const title = slide.querySelector('h1,h2').textContent.trim();
    const label = slide.classList.contains('appendix') ? `Appendix ${slide.id.slice(1).toUpperCase() === '1' ? 'A' : String.fromCharCode(65 + Number(slide.id.slice(1)) - 1)}` : `${i + 1} / ${mainSlides.length}`;
    const folio = document.createElement('span');
    folio.className = 'folio';
    folio.textContent = label;
    slide.querySelector('.meta-right').prepend(folio);
    const option = document.createElement('option');
    option.value = slide.id;
    const rubricTitle = slide.querySelector('.meta > span').textContent.trim();
    option.textContent = `${i < mainSlides.length ? i + 1 : label} · ${/^Deliverable|^Rubric map/.test(rubricTitle) ? rubricTitle : title}`;
    select.append(option);
    const note = document.createElement('aside');
    note.id = `notes-${slide.id}`;
    note.className = 'rationale';
    note.hidden = true;
    const heading = document.createElement('strong');
    heading.textContent = 'Decision rationale';
    const paragraph = document.createElement('p');
    paragraph.textContent = slide.dataset.note;
    note.append(heading, paragraph);
    slide.append(note);
    const button = slide.querySelector('.notes-btn');
    if (button) {
      button.setAttribute('aria-controls', note.id);
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => toggleNotes(i));
    }
  });
  function toggleNotes(i) {
    const slide = slides[i], note = slide.querySelector('.rationale');
    note.hidden = !note.hidden;
    const button = slide.querySelector('.notes-btn');
    button?.setAttribute('aria-expanded', String(!note.hidden));
    if (button) button.textContent = note.hidden ? 'Read rationale' : 'Close rationale';
  }
  function update() {
    current = slides.reduce((best, s, i) => Math.abs(s.getBoundingClientRect().top) < Math.abs(slides[best].getBoundingClientRect().top) ? i : best, 0);
    select.value = slides[current].id;
    counter.textContent = `${current + 1} / ${slides.length}`;
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    progress.style.width = `${(current + 1) / slides.length * 100}%`;
    slides.forEach((s, i) => s.toggleAttribute('data-current', i === current));
  }
  function go(index) {
    const slide = slides[Math.max(0, Math.min(slides.length - 1, index))];
    history.replaceState(null, '', `#${slide.id}`);
    slide.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  select.addEventListener('change', () => go(slides.findIndex(s => s.id === select.value)));
  document.querySelector('#print').addEventListener('click', () => window.print());
  document.addEventListener('keydown', e => {
    if (e.target.closest('button,a,input,select,textarea,summary') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)) {e.preventDefault();go(current + 1);}
    if (['ArrowUp','ArrowLeft','PageUp'].includes(e.key)) {e.preventDefault();go(current - 1);}
    if (e.key === 'Home') {e.preventDefault();go(0);}
    if (e.key === 'End') {e.preventDefault();go(slides.length - 1);}
    if (e.key.toLowerCase() === 'n') toggleNotes(current);
    if (e.key === 'Escape') slides.forEach((s,i) => {if (!s.querySelector('.rationale').hidden) toggleNotes(i);});
  });
  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) requestAnimationFrame(() => {update();ticking=false;});
    ticking=true;
  }, {passive:true});
  addEventListener('resize',update);
  document.fonts.ready.then(update);
  update();
})();

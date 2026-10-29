const interactive = 'a,button,select,summary,[role="button"],[role="link"]';
export function mountPortfolioInteractions(doc = document, view = window) {
  const finePointer = view.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const cursor = doc.createElement('div');
  cursor.className = 'aim-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.hidden = true;
  const triangle = doc.createElement('div');
  triangle.className = 'aim-triangle';
  for (let i = 0; i < 3; i++) {
    const dot = doc.createElement('span'); dot.className = 'aim-dot'; triangle.appendChild(dot);
  }
  cursor.appendChild(triangle); doc.body.appendChild(cursor);
  let angle = 0, hovered = null;
  function rotate(degrees) {
    if (reducedMotion.matches) return;
    angle += degrees; triangle.style.transform = `rotate(${angle}deg)`;
  }
  function hide() {
    cursor.hidden = true; hovered = null;
    cursor.classList.remove('aim-cursor--hover');
    doc.documentElement.classList.remove('custom-aim-active');
  }
  function move(event) {
    if (!finePointer.matches || event.pointerType === 'touch') { hide(); return; }
    const target = event.target;
    if (typeof target?.closest !== 'function') return;
    const section = target.closest('#about');
    if (section) {
      const bounds = section.getBoundingClientRect();
      section.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
      section.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
    }
    // Keep the native insertion cursor in editable fields.
    if (target.closest('input,textarea,[contenteditable="true"]')) { hide(); return; }
    doc.documentElement.classList.add('custom-aim-active'); cursor.hidden = false;
    cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
    const next = target.closest(interactive);
    if (next !== hovered) {
      hovered = next;
      cursor.classList.toggle('aim-cursor--hover', Boolean(next));
      if (next) rotate(120);
    }
  }
  const leave = event => { if (!event.relatedTarget) hide(); };
  const keyboard = event => { if (event.key === 'Tab') hide(); };
  const timer = view.setInterval(() => { if (!cursor.hidden && !doc.hidden) rotate(360); }, 5000);
  doc.addEventListener('pointermove', move, { passive: true });
  doc.addEventListener('pointerout', leave);
  doc.addEventListener('keydown', keyboard);
  doc.addEventListener('visibilitychange', hide);
  view.addEventListener('blur', hide);
  finePointer.addEventListener('change', hide);
  return () => {
    view.clearInterval(timer);
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerout', leave);
    doc.removeEventListener('keydown', keyboard);
    doc.removeEventListener('visibilitychange', hide);
    view.removeEventListener('blur', hide);
    finePointer.removeEventListener('change', hide);
    hide(); cursor.remove();
  };
}

(() => {
  'use strict';

  const intro = document.getElementById('inviteIntro');
  const opener = document.getElementById('openEnvelope');
  const replay = document.getElementById('replayIntro');
  const hero = document.getElementById('invitationHero');
  const number = document.getElementById('sceneNumber');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const trigger = window.ScrollTrigger;
  const openedKey = 'birthday-envelope-opened-v1';
  let introTimeline;
  let heroReveal;
  let floatTween;
  let story;
  let replaying = false;
  let observer;

  const title = hero.querySelector('.hero-words');
  const words = title.textContent.split(' ').map(word => {
    const group = document.createElement('span');
    group.className = 'hero-word';
    group.append(...Array.from(word, character => {
      const span = document.createElement('span');
      span.className = 'hero-char';
      span.textContent = character;
      return span;
    }));
    return group;
  });
  title.replaceChildren(words[0], ' ', words[1]);

  function setScene(scene) {
    const label = scene.padStart(2, '0') + ' / 07';
    if (number.textContent === label) return;
    number.textContent = label;
    if (!motion.matches) gsap?.fromTo(number, {y: 4, opacity: .2}, {
      y: 0, opacity: 1, duration: .22, overwrite: true, clearProps: 'transform,opacity'
    });
  }

  function startStory() {
    const scenes = Array.from(document.querySelectorAll('main [data-scene]'));
    if (gsap && trigger && !motion.matches) {
      gsap.registerPlugin(trigger);
      story = gsap.context(() => {
        gsap.to('.hero-photo', {
          yPercent: 12, ease: 'none',
          scrollTrigger: {trigger: hero, start: 'top top', end: 'bottom top', scrub: .55}
        });
        for (const scene of scenes) {
          const heading = scene.querySelector('.section-heading');
          if (heading) gsap.fromTo(heading, {y: 12}, {
            y: 0, duration: .5, clearProps: 'transform',
            scrollTrigger: {trigger: heading, start: 'top 88%', once: true}
          });
          for (const row of scene.querySelectorAll('.options-grid, .bottle-grid')) {
            gsap.fromTo(row, {y: 12}, {
              y: 0, duration: .52, clearProps: 'transform',
              scrollTrigger: {trigger: row, start: 'top 91%', once: true}
            });
          }
        }
      });
    }
    observer = new IntersectionObserver(entries => {
      const current = entries.find(entry => entry.isIntersecting);
      if (current) setScene(current.target.dataset.scene);
    }, {rootMargin: '-22% 0px -58% 0px'});
    scenes.forEach(scene => observer.observe(scene));
  }

  function stopStory() {
    story?.revert();
    heroReveal?.revert();
    observer?.disconnect();
    gsap?.killTweensOf(number);
    gsap?.set(number, {clearProps: 'transform,opacity'});
  }

  function showIntro() {
    opener.disabled = false;
    intro.showModal();
    if (gsap && !motion.matches) {
      floatTween = gsap.to('.envelope', {y: -6, duration: 1.45, yoyo: true, repeat: -1, ease: 'sine.inOut'});
    }
  }

  function finishIntro() {
    if (intro.open) intro.close();
  }

  opener.addEventListener('click', () => {
    if (!gsap || motion.matches) { finishIntro(); return; }
    opener.disabled = true;
    floatTween?.kill();
    gsap.set('.envelope', {y: 0});
    introTimeline = gsap.timeline({onComplete: finishIntro});
    introTimeline
      .to('.envelope-seal', {scale: .55, autoAlpha: 0, duration: .24})
      .to('.envelope-flap', {rotateX: -176, duration: .55, ease: 'power2.inOut'}, '-=.1')
      .to('.envelope-card', {yPercent: -55, duration: .58, ease: 'power2.out'}, '-=.13')
      .to('.envelope-card', {zIndex: 5, scale: 1.13, duration: .32}, '>')
      .to(intro, {opacity: 0, duration: .26}, '-=.1');
  });

  intro.addEventListener('close', () => {
    floatTween?.kill();
    introTimeline?.kill();
    gsap?.set([intro, '.envelope', '.envelope-seal', '.envelope-flap', '.envelope-card'], {clearProps: 'all'});
    try { sessionStorage.setItem(openedKey, '1'); } catch {}
    if (replaying) replay.focus({preventScroll: true});
    else hero.focus({preventScroll: true});
    if (gsap && !motion.matches && hero.getBoundingClientRect().bottom > 0) {
      heroReveal?.revert();
      heroReveal = gsap.timeline({defaults: {clearProps: 'transform,opacity'}})
        .fromTo('.hero-char', {y: 19, opacity: 0}, {y: 0, opacity: 1, duration: .5, stagger: .033})
        .fromTo('.hero-title em, .pill-badge, .hero-cta', {y: 9, opacity: 0}, {y: 0, opacity: 1, duration: .4, stagger: .09}, '-=.28');
    }
    trigger?.refresh();
  });

  replay.addEventListener('click', () => { replaying = true; showIntro(); });
  let opened = false;
  try { opened = sessionStorage.getItem(openedKey) === '1'; } catch {}
  if (!opened) showIntro();
  startStory();
  window.addEventListener('load', () => trigger?.refresh(), {once: true});
  document.fonts?.ready.then(() => trigger?.refresh());
  document.querySelector('.place-details').addEventListener('toggle', () => trigger?.refresh());
  motion.addEventListener('change', () => {
    if (motion.matches && intro.open) finishIntro();
    stopStory();
    startStory();
  });
  window.addEventListener('pagehide', () => {
    floatTween?.kill();
    introTimeline?.kill();
    stopStory();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (intro.open) finishIntro();
    startStory();
  });

  for (const button of document.querySelectorAll('[data-share]')) {
    button.addEventListener('click', async () => {
      const url = new URL('/invitation', location.origin).href;
      const status = document.getElementById('shareStatus');
      try {
        if (navigator.share) await navigator.share({title: 'The Hangover Part IV', url});
        else {
          await navigator.clipboard.writeText(url);
          button.textContent = 'Link copied';
          status.textContent = 'Invitation link copied.';
        }
      } catch (error) {
        if (error.name !== 'AbortError') window.prompt('Copy the invitation link', url);
      }
    });
  }
})();

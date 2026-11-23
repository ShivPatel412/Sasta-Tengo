const intro = document.getElementById('inviteIntro');
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.getElementById('invitationHero');

// The envelope and native RSVP controls work before this module starts and without WebGL.
async function start() {
  if (!gsap || !ScrollTrigger) return;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {
      alpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'low-power'
    });
    if (!context) return;
    const THREE = await import('../vendor/three-r167.module.min.js');
    createJourney(THREE, canvas, context);
  } catch (error) {
    console.info('3D invitation previews are unavailable on this device.', error.message);
  }
}

if (intro.open) intro.addEventListener('close', start, {once: true});
else start();

function createJourney(T, canvas, context) {
  const renderer = new T.WebGLRenderer({canvas, context, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .1, 30);
  camera.position.set(3.2, 2.2, 5.7);
  camera.lookAt(0, 0, 0);

  const world = new T.Group();
  scene.add(world, new T.HemisphereLight(0xffe9d4, 0x8b5861, 2.25));
  const key = new T.DirectionalLight(0xffd8a9, 3);
  key.position.set(4, 6, 5);
  const rim = new T.DirectionalLight(0xbac4ee, 1.6);
  rim.position.set(-4, 2, -4);
  scene.add(key, rim);

  const models = createModels(T);
  const stages = [...document.querySelectorAll('[data-scene]')].map(section => {
    const index = Number(section.dataset.scene);
    const stage = document.createElement('div');
    const art = document.createElement('div');
    const placeholder = document.createElement('span');
    stage.className = index === 1 ? 'hero-stage' : 'scene-stage';
    art.className = 'stage-art';
    art.setAttribute('aria-hidden', 'true');
    placeholder.className = 'stage-placeholder';
    placeholder.textContent = ['IV', '◇', '◈', '✦', '◉', 'IV', '✦'][index - 1];
    art.append(placeholder);
    stage.append(art);

    const choices = [...section.querySelectorAll('.option-card input, .bottle-card input')];
    const state = {index, stage, art, section, choices, selected: 0, progress: 0, angle: 0};
    if (index === 1) section.querySelector('.pill-badge').before(stage);
    else {
      const info = document.createElement('div');
      const kicker = document.createElement('span');
      const name = document.createElement('span');
      const label = document.createElement('label');
      const turn = document.createElement('input');
      info.className = 'stage-info';
      kicker.className = 'stage-kicker';
      name.className = 'stage-name';
      name.setAttribute('aria-live', 'polite');
      label.className = 'stage-turn';
      label.textContent = 'Rotate preview';
      turn.type = 'range';
      turn.min = '-180';
      turn.max = '180';
      turn.value = '0';
      label.append(turn);
      info.append(kicker, name, label);
      if (choices.length) {
        const actions = document.createElement('div');
        actions.className = 'stage-actions';
        const previous = action('←', 'Preview previous option');
        const next = action('→', 'Preview next option');
        const pick = action('Choose');
        actions.append(previous, pick, next);
        info.append(actions);
        state.pick = pick;
        state.previous = previous;
        state.next = next;
      }
      stage.append(info);
      state.kicker = kicker;
      state.name = name;
      state.turn = turn;
      const anchor = section.querySelector('.section-desc, .section-heading, #successTitle');
      anchor.after(stage);
    }
    return state;
  });

  function action(text, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    if (label) button.setAttribute('aria-label', label);
    return button;
  }

  let model;
  let active;
  let frame = 0;
  let stopped = false;
  let scrollEffects = [];
  const lifecycle = new AbortController();
  const {signal} = lifecycle;
  const visible = new Set();
  const pose = {turn: 0, reveal: 1};

  function resize() {
    if (!active) return;
    const {clientWidth, clientHeight} = active.art;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    draw();
  }

  function draw() {
    if (frame || !active || stopped || intro.open || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active || stopped || intro.open || document.hidden) return;
      const progress = motion.matches ? 0 : active.progress;
      if (!model) return;
      world.rotation.y = pose.turn + progress * (active.index === 1 ? 4.2 : .85);
      world.rotation.x = progress * .22;
      world.rotation.z = active.index === 1 ? -.14 + progress * .32 : progress * .07;
      world.scale.setScalar(pose.reveal * (active.index === 1 ? 1.28 - progress * .16 : 1));
      world.position.y = active.index === 1 ? progress * -.30 : (pose.reveal - 1) * .45;
      renderer.render(scene, camera);
    });
  }

  function releaseModel() {
    if (!model) return;
    const resources = new Set();
    model.traverse(mesh => {
      if (mesh.isMesh) {
        resources.add(mesh.material);
        resources.add(mesh.geometry);
      }
    });
    resources.forEach(resource => resource.dispose());
    world.remove(model);
    model = null;
  }

  function refreshCaption(state) {
    if (!state.name) return;
    const choice = state.choices[state.selected];
    const label = choice?.closest('label').querySelector('.card-title, .bottle-name').textContent;
    const selected = state.choices.filter(input => input.checked).length;
    state.name.textContent = label || (state.index === 6 ? 'Your weekend pass' : 'See you there');
    state.kicker.textContent = choice
      ? (choice.checked ? (selected > 1 ? selected + ' SELECTED' : 'SELECTED') : 'PREVIEW')
      : (state.index === 6 ? 'THE RSVP' : 'RSVP CONFIRMED');
    if (state.pick) {
      state.pick.disabled = choice.disabled || (choice.type === 'radio' && choice.checked);
      state.pick.textContent = choice.disabled ? 'View only' : choice.checked
        ? (choice.type === 'radio' ? 'Chosen' : 'Remove')
        : (choice.type === 'checkbox' ? 'Add' : 'Choose');
      state.pick.setAttribute('aria-label', state.pick.textContent + ' · ' + label);
    }
  }

  function replaceModel(animate) {
    releaseModel();
    model = models[active.index][active.selected]();
    world.add(model);
    gsap.killTweensOf(pose);
    pose.turn = active.angle;
    pose.reveal = 1;
    if (animate && !motion.matches) {
      gsap.fromTo(pose, {turn: active.angle - .45, reveal: .78}, {
        turn: active.angle, reveal: 1, duration: .48, ease: 'back.out(1.25)', onUpdate: draw
      });
    }
    draw();
  }

  const sizeObserver = new ResizeObserver(resize);
  function activate(state) {
    if (state === active) return;
    sizeObserver.disconnect();
    active = state;
    if (!active) {
      gsap.killTweensOf(pose);
      canvas.remove();
      return;
    }
    active.art.append(canvas);
    sizeObserver.observe(active.art);
    refreshCaption(active);
    replaceModel(true);
    resize();
  }

  function chooseStage() {
    if (stopped || intro.open) return;
    const candidates = [...visible].sort((a, b) => {
      if (a.index === 7 || b.index === 7) return b.index - a.index;
      const distance = state => {
        const {top, height} = state.art.getBoundingClientRect();
        return Math.abs(top + height / 2 - innerHeight / 2);
      };
      return distance(a) - distance(b);
    });
    activate(candidates[0]);
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = stages.find(candidate => candidate.art === entry.target);
      if (entry.isIntersecting) visible.add(state);
      else visible.delete(state);
    }
    chooseStage();
  }, {threshold: [.05, .5, .95]});

  const confirmationObserver = new MutationObserver(() => stages.forEach(refreshCaption));
  confirmationObserver.observe(document.getElementById('confirmedNotice'), {attributes: true, attributeFilter: ['hidden']});

  for (const state of stages) {
    const selected = state.choices.findIndex(input => input.checked);
    if (selected !== -1) state.selected = selected;
    refreshCaption(state);
    observer.observe(state.art);
    const preview = index => {
      state.selected = index;
      state.angle = 0;
      state.turn.value = '0';
      refreshCaption(state);
      if (state === active) replaceModel(true);
    };
    state.section.addEventListener('change', event => {
      const choice = event.target;
      if (state.choices.includes(choice)) preview(state.choices.indexOf(choice));
    }, {signal});
    state.previous?.addEventListener('click', () => preview((state.selected + state.choices.length - 1) % state.choices.length));
    state.next?.addEventListener('click', () => preview((state.selected + 1) % state.choices.length));
    state.pick?.addEventListener('click', () => {
      const choice = state.choices[state.selected];
      // Preserve the app's native change event, validation and draft persistence.
      choice.click();
    });
    if (!state.turn) continue;
    const rotate = degrees => {
      state.turn.value = String(Math.max(-180, Math.min(180, Math.round(degrees))));
      state.angle = Number(state.turn.value) * Math.PI / 180;
      if (state !== active) activate(state);
      if (motion.matches) {
        pose.turn = state.angle;
        draw();
      } else {
        gsap.to(pose, {turn: state.angle, duration: .22, overwrite: 'auto', ease: 'power2.out', onUpdate: draw});
      }
    };
    state.turn.addEventListener('input', () => rotate(Number(state.turn.value)));
    let drag;
    state.art.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = {x: event.clientX, angle: Number(state.turn.value), id: event.pointerId};
      state.art.setPointerCapture(event.pointerId);
    });
    state.art.addEventListener('pointermove', event => {
      if (drag?.id === event.pointerId) rotate(drag.angle + (event.clientX - drag.x) * 2);
    });
    state.art.addEventListener('lostpointercapture', () => { drag = null; });
  }

  function refreshMotion() {
    scrollEffects.forEach(effect => effect.kill());
    scrollEffects = [];
    if (motion.matches) {
      gsap.killTweensOf(pose);
      pose.reveal = 1;
      if (active) pose.turn = active.angle;
      draw();
      return;
    }
    scrollEffects = stages.filter(state => state.index !== 7).map(state =>
      ScrollTrigger.create({
        trigger: state.section,
        start: state.index === 1 ? 'top top' : 'top 85%',
        end: 'bottom top',
        onUpdate(effect) {
          state.progress = effect.progress;
          chooseStage();
          if (state === active) draw();
        }
      })
    );
  }
  refreshMotion();
  ScrollTrigger.refresh();

  motion.addEventListener('change', refreshMotion, {signal});
  intro.addEventListener('close', chooseStage, {signal});
  document.addEventListener('visibilitychange', draw, {signal});
  window.addEventListener('pageshow', () => { chooseStage(); resize(); }, {signal});
  window.addEventListener('pagehide', event => {
    if (!event.persisted) destroy();
  }, {signal});
  canvas.addEventListener('webglcontextlost', destroy, {once: true});

  function destroy() {
    if (stopped) return;
    stopped = true;
    lifecycle.abort();
    cancelAnimationFrame(frame);
    gsap.killTweensOf(pose);
    scrollEffects.forEach(effect => effect.kill());
    observer.disconnect();
    confirmationObserver.disconnect();
    sizeObserver.disconnect();
    releaseModel();
    renderer.dispose();
    canvas.remove();
    stages.forEach(state => state.stage.remove());
  }
}

function createModels(T) {
  const gold = 0xd7a25f;
  const cream = 0xffe1b4;
  const dark = 0x3a2529;
  const red = 0xaf3549;

  const group = () => new T.Group();
  function mesh(parent, geometry, color, position, metallic = .08) {
    const object = new T.Mesh(geometry, new T.MeshStandardMaterial({
      color, metalness: metallic, roughness: .43
    }));
    object.position.set(...position);
    parent.add(object);
    return object;
  }
  const box = (parent, color, position, size, metal) =>
    mesh(parent, new T.BoxGeometry(...size), color, position, metal);
  const ball = (parent, color, position, radius) =>
    mesh(parent, new T.SphereGeometry(radius, 16, 12), color, position);
  const cylinder = (parent, color, position, top, bottom, height, metal) =>
    mesh(parent, new T.CylinderGeometry(top, bottom, height, 24), color, position, metal);
  const ring = (parent, color, position, radius, tube, metal) =>
    mesh(parent, new T.TorusGeometry(radius, tube, 8, 32), color, position, metal);

  function stamp() {
    const g = group();
    cylinder(g, gold, [0, 0, 0], .95, .95, .17, .52).rotation.x = Math.PI / 2;
    cylinder(g, dark, [0, 0, .10], .79, .79, .05, .3).rotation.x = Math.PI / 2;
    ring(g, gold, [0, 0, .14], .84, .031, .55);
    ring(g, cream, [0, 0, .15], .72, .012, .45);
    box(g, gold, [-.28, 0, .16], [.075, .75, .045], .45);
    box(g, gold, [.02, 0, .16], [.075, .75, .045], .45).rotation.z = .35;
    box(g, gold, [.26, 0, .16], [.075, .75, .045], .45).rotation.z = -.35;
    return g;
  }

  function bowling() {
    const g = group();
    for (const x of [-.48, .07, .52]) {
      const z = x === .07 ? -.38 : -.06;
      cylinder(g, cream, [x, -.2, z], .16, .21, .56);
      cylinder(g, red, [x, .15, z], .10, .15, .13);
      ball(g, cream, [x, .36, z], .135);
    }
    ball(g, 0x662845, [-.19, -.26, .56], .33);
    return g;
  }
  function trampoline() {
    const g = group();
    cylinder(g, dark, [0, -.17, 0], .8, .8, .10);
    ring(g, 0x54a3a5, [0, -.11, 0], .8, .075).rotation.x = Math.PI / 2;
    for (const x of [-.49, .49]) {
      for (const z of [-.49, .49]) cylinder(g, gold, [x, -.4, z], .05, .05, .46, .4);
    }
    ball(g, cream, [.18, .41, .09], .21);
    return g;
  }
  function kart() {
    const g = group();
    box(g, red, [0, -.19, 0], [1.17, .22, .75]);
    box(g, dark, [-.23, .045, 0], [.43, .31, .43]);
    box(g, cream, [.37, .03, 0], [.46, .17, .56]);
    for (const x of [-.46, .48]) {
      for (const z of [-.43, .43]) cylinder(g, dark, [x, -.2, z], .18, .18, .18).rotation.x = Math.PI / 2;
    }
    ring(g, gold, [.10, .23, 0], .13, .03).rotation.y = Math.PI / 2;
    return g;
  }
  function golf() {
    const g = group();
    cylinder(g, 0x52724e, [0, -.5, 0], .81, .88, .23);
    cylinder(g, gold, [.43, .15, -.21], .026, .026, 1.22, .4);
    box(g, red, [.23, .61, -.21], [.4, .27, .035]);
    ball(g, cream, [-.22, -.22, .39], .16);
    return g;
  }
  function plate() {
    const g = group();
    cylinder(g, dark, [0, -.5, 0], .9, .78, .13);
    ring(g, gold, [0, -.42, 0], .84, .023, .22).rotation.x = Math.PI / 2;
    return g;
  }
  function skewers() {
    const g = plate();
    for (const z of [-.28, .24]) {
      box(g, cream, [0, -.26, z], [1.40, .047, .05]).rotation.z = .15;
      for (const x of [-.38, 0, .38]) box(g, x === 0 ? 0x64845c : 0xaf542d, [x, -.20 + x * .15, z], [.26, .29, .28]).rotation.x = .3;
    }
    return g;
  }
  function pizza() {
    const g = plate();
    cylinder(g, 0xb57737, [0, -.30, 0], .72, .72, .22);
    cylinder(g, 0xf1b756, [0, -.177, 0], .62, .62, .037);
    for (const [x, z] of [[0, .37], [.38, .08], [-.31, .16], [.03, -.24], [-.30, -.29]]) {
      cylinder(g, red, [x, -.148, z], .084, .084, .028);
    }
    return g;
  }
  function dumplings() {
    const g = plate();
    for (const [x, z] of [[.38, .22], [-.38, .23], [0, -.34]]) {
      const bun = ball(g, cream, [x, -.17, z], .29);
      bun.scale.set(1, .87, .72);
      for (const offset of [-.11, 0, .11]) ball(g, 0xeebc8f, [x + offset, .045, z], .073).scale.set(1, .44, 2.2);
    }
    return g;
  }
  function tacos() {
    const g = plate();
    for (const z of [-.31, .25]) {
      ball(g, gold, [0, -.16, z], .56).scale.set(1, .62, .27);
      for (const x of [-.31, -.12, .09, .3]) {
        const filling = ball(g, x === -.12 ? red : 0x658b50, [x, .03, z], .17);
        filling.scale.set(1.1, .75, .8);
      }
    }
    return g;
  }
  function brownie() {
    const g = plate();
    box(g, 0x583336, [0, -.23, 0], [1.14, .32, .9]);
    box(g, gold, [0, -.045, 0], [.92, .10, .76]).rotation.y = .26;
    ball(g, cream, [.14, .20, -.06], .26);
    return g;
  }
  function gelato() {
    const g = group();
    cylinder(g, 0xb97a48, [0, -.27, 0], .38, .024, .92);
    ball(g, 0xda7a91, [-.22, .25, .04], .35);
    ball(g, 0xcabd86, [.22, .27, -.04], .34);
    ball(g, cream, [0, .58, .0], .27);
    return g;
  }
  function cheesecake() {
    const g = plate();
    const layer = (color, y, height) => {
      const wedge = mesh(g, new T.CylinderGeometry(.7, .7, height, 3), color, [0, y, 0]);
      wedge.scale.z = .8;
    };
    layer(0xb77840, -.31, .17);
    layer(cream, -.075, .31);
    layer(0xc44859, .096, .035);
    ball(g, red, [.08, .23, .15], .12);
    return g;
  }
  function churros() {
    const g = plate();
    for (const z of [-.29, 0, .29]) {
      cylinder(g, gold, [0, -.20, z], .09, .09, 1.10).rotation.z = Math.PI / 2 + z * .4;
    }
    cylinder(g, cream, [.53, -.21, .40], .20, .16, .36);
    cylinder(g, 0x613738, [.53, -.02, .40], .175, .175, .024);
    return g;
  }
  function bottle(color, cap, width) {
    const g = group();
    const profile = [[0, -.8], [width * .77, -.8], [width, -.68], [width, .12],
      [width * .97, .25], [.15, .48], [.13, .75], [0, .75]].map(p => new T.Vector2(...p));
    mesh(g, new T.LatheGeometry(profile, 24), color, [0, 0, 0], .31);
    cylinder(g, cap, [0, .73, 0], .153, .153, .22, .43);
    cylinder(g, cream, [0, -.25, 0], width + .009, width + .009, .30, .04);
    return g;
  }
  function ticket() {
    const g = group();
    box(g, cream, [0, 0, 0], [1.72, 1.02, .09]);
    box(g, gold, [0, 0, .05], [1.55, .86, .025]);
    for (const y of [-.23, 0, .23]) box(g, dark, [-.16, y, .071], [.9, .042, .021]);
    ring(g, red, [.52, 0, .08], .19, .027);
    return g;
  }
  function spark() {
    const g = stamp();
    for (const [x, y] of [[-1.17, .45], [1.13, .66], [.9, -.65]]) {
      box(g, gold, [x, y, 0], [.09, .34, .075], .32);
      box(g, gold, [x, y, 0], [.32, .09, .075], .32);
    }
    g.scale.setScalar(.87);
    return g;
  }
  return {
    1: [stamp],
    2: [bowling, trampoline, kart, golf],
    3: [skewers, pizza, dumplings, tacos],
    4: [brownie, gelato, cheesecake, churros],
    5: [() => bottle(0xc48634, dark, .32), () => bottle(0x682755, gold, .39),
      () => bottle(0xa5acb7, 0x605f75, .38), () => bottle(0x748290, red, .29)],
    6: [ticket],
    7: [spark]
  };
}

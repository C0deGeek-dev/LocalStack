// Local friend: an optional three.js mascot that lives on the page. It stands on
// headings and panels, walks along them after the pointer, and hops to another
// perch as the visitor scrolls. Nothing on the page depends on it. The renderer is vendored under assets/vendor,
// so no request leaves this origin, and it is only fetched once the page is idle.
const THREE_URL = './assets/vendor/three/three.module.min.js';
const MODEL_URL = './mascot-model.js';
const STORE_KEY = 'localstack-friend';
const SLEEP_AFTER = 50000;

const LINES = {
  hello: 'Hi! I’m your local friend. I run right here in your browser.',
  sections: {
    workflow: 'Run, tune, code, remember. Take them one at a time.',
    projects: 'Each tool works on its own. Pick the job you have today.',
    privacy: 'No telemetry, only on cursor in this tab.',
    start: 'One command installs the stack. Copy it and I’ll cheer.',
    evidence: 'Same local model in every arm. The harness is the difference.',
    closing: 'Ready when you are. Start small with LocalBox.'
  },
  tools: {
    box: 'LocalBox: get a model running first.',
    bench: 'LocalBench: tune it to your hardware.',
    pilot: 'LocalPilot: my favourite. Just look at my face.',
    mind: 'LocalMind: keep the lessons you approve.'
  },
  copied: 'Copied! Paste it into your terminal.',
  selected: 'Selected. Press Ctrl+C or ⌘C to copy.',
  method: 'Reading the methodology? Respect.',
  wake: 'I’m up! I’m up.',
  tips: [
    'Tip: start with LocalBox. The rest can wait.',
    'Tip: run localx status to see what is installed.',
    'Click a tool in the map up top. I change colour.',
    'Hover a project card and I’ll hop onto it.',
    'Tip: localx update refreshes the whole stack.',
    'No account, no cloud. Just your machine.',
    'This page works without JavaScript. I’m the exception.'
  ]
};

const experience = document.querySelector('.stack-experience');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rootStyle = getComputedStyle(document.documentElement);
const toolColours = {
  box: rootStyle.getPropertyValue('--teal').trim(),
  bench: rootStyle.getPropertyValue('--amber').trim(),
  pilot: rootStyle.getPropertyValue('--blue').trim(),
  mind: rootStyle.getPropertyValue('--green').trim()
};

const make = (tag, className, attributes = {}) => {
  const element = document.createElement(tag);
  element.className = className;
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
};
const host = make('aside', 'local-friend', { 'aria-label': 'Local friend mascot' });
const bubble = make('p', 'friend-bubble', { 'aria-live': 'off' });
const stage = make('div', 'friend-stage');
const canvas = make('canvas', 'friend-canvas', { 'aria-hidden': 'true' });
const body = make('button', 'friend-body', { type: 'button', 'aria-label': 'Local friend mascot. Activate for a tip.' });
const dismiss = make('button', 'friend-dismiss', { type: 'button', 'aria-label': 'Hide the mascot' });
dismiss.textContent = '×';
const summon = make('button', 'friend-return', { type: 'button', 'aria-label': 'Show the local friend mascot' });
summon.textContent = '>_';
summon.hidden = true;
stage.append(canvas, body, dismiss);
host.append(bubble, stage);
host.hidden = true;
document.body.append(host, summon);

const readHidden = () => {
  try { return localStorage.getItem(STORE_KEY) === 'off'; } catch { return false; }
};
const writeHidden = off => {
  try {
    if (off) localStorage.setItem(STORE_KEY, 'off');
    else localStorage.removeItem(STORE_KEY);
  } catch { /* Storage can be blocked; the choice then lasts for this visit only. */ }
};

let bubbleTimer = 0;
let bubbleUntil = 0;
let bubbleRank = 0;
let bubbleStale = true;
// Lines the visitor caused (rank 2) replace each other and outrank the ones
// scrolling triggers. Only a line the visitor asked for is announced.
const say = (text, { rank = 0, hold = 5200, announce = false } = {}) => {
  const now = performance.now();
  if (rank < bubbleRank && now < bubbleUntil) return false;
  bubbleRank = rank;
  bubbleUntil = now + hold;
  bubble.setAttribute('aria-live', announce ? 'polite' : 'off');
  bubble.textContent = text;
  bubbleStale = true;
  bubble.classList.add('is-visible');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('is-visible'), hold);
  return true;
};
const talking = () => performance.now() < bubbleUntil;

let live = null;

function run(THREE, { buildFriend, POSES, FIGURE_HEIGHT, LEG_LENGTH }, gl) {
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  // Framed with room below the feet, so the legs can dangle when it sits on an edge.
  const camera = new THREE.PerspectiveCamera(27, 5 / 6, 0.1, 40);
  camera.position.set(0, 1.85, 10.2);
  camera.lookAt(0, 1.65, 0);
  const friend = buildFriend(THREE);
  scene.add(friend.root);

  const baseColour = new THREE.Color(getComputedStyle(host).getPropertyValue('--friend-base').trim() || '#2f9dff');
  const accent = baseColour.clone();
  const accentTarget = baseColour.clone();
  let accentHex = '';
  let tintUntil = 0;
  let heldTint = false;

  // Underdamped springs give the limbs and head a little overshoot.
  const springs = {};
  const spring = (name, value, stiffness = 150, damping = 17) => {
    springs[name] = { x: value, v: 0, t: value, k: stiffness, c: damping };
    return springs[name];
  };
  const rise = spring('rise', -5.2, 55, 9.5);
  const squash = spring('squash', 1, 260, 13);
  const yaw = spring('yaw', 0, 90, 15);
  const pitch = spring('pitch', 0, 90, 15);
  const roll = spring('roll', 0.05, 90, 15);
  const turn = spring('turn', 0, 60, 14);
  const facing = spring('facing', 0, 110, 17);
  const sit = spring('sit', 0, 70, 13);
  const air = spring('air', 0, 160, 18);
  const armSprings = { R: [], L: [] };
  for (const side of ['R', 'L']) {
    POSES.idle[side].forEach((value, index) => armSprings[side].push(spring(side + index, value, 170, 16)));
  }
  const WALK_ARM = [0, 0.22, -0.45, 0, 0];

  // Sizes in CSS pixels, derived from the camera so the feet land exactly on a perch.
  const metrics = { unit: 30, figure: 100, half: 40 };
  const probe = new THREE.Vector3();
  let sizeKey = '';

  // Perches are top edges the mascot can stand on. Headings use the bounds of
  // their text, so it walks along the words rather than the full-width box.
  const textRange = document.createRange();
  const ruler = document.createElement('canvas').getContext('2d');
  const spot = (element, text = false) => (element ? { element, text, sink: 0 } : null);
  const perches = [
    ['h1', true], ['.stack-experience'], ['.workflow'], ['#projects-title', true], ['.privacy'],
    ['.get-started'], ['#proof-title', true], ['.closing-cta'], ['footer']
  ].map(([selector, text]) => spot(document.querySelector(selector), text)).filter(Boolean);
  const heroPanel = perches.find(item => item.element === experience);
  const footer = document.querySelector('footer');
  const FLOOR = { element: null };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  const survey = place => {
    if (!place.element) {
      // The viewport's bottom edge, stopping at the footer so its links stay clear.
      const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
      const y = Math.min(window.innerHeight, Math.max(footerTop, metrics.figure + 16));
      return { left: 0, right: window.innerWidth, y, valid: true };
    }
    let rect;
    if (place.text) {
      textRange.selectNodeContents(place.element);
      rect = textRange.getBoundingClientRect();
    } else {
      rect = place.element.getBoundingClientRect();
    }
    const y = rect.top + place.sink;
    const visible = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const valid = visible > metrics.half && y > metrics.figure + 16 && y < window.innerHeight - 24;
    return { left: rect.left, right: rect.right, y, valid };
  };
  const span = edge => {
    const low = Math.max(edge.left, 0) + metrics.half;
    const high = Math.min(edge.right, window.innerWidth) - metrics.half;
    return low <= high ? [low, high] : [(low + high) / 2, (low + high) / 2];
  };

  let pose = 'idle';
  let poseUntil = 0;
  let expr = 'open';
  let exprUntil = 0;
  let hopAt = -1e9;
  let spinning = false;
  let landed = true;
  let asleep = false;
  let hovered = false;
  let blinkAt = performance.now() + 2600;
  let lastActivity = performance.now();
  let pointer = null;
  let pointerAt = 0;
  let scrollBias = 0;
  let lastScrollY = window.scrollY;
  let lastScrollAt = 0;
  let frameId = 0;
  let stillTimer = 0;
  let previous = 0;
  let tipIndex = 0;
  const headRest = friend.head.position.y;

  // Where it is: a perch, an offset along it, and a jump when it changes perch.
  let ground = FLOOR;
  let lastGround = FLOOR;
  let offset = 0;
  let speed = 0;
  let phase = 0;
  let gait = 0;
  let jump = null;
  let wish = null;
  let goal = null;
  let wanderTo = null;
  let wanderAt = 0;
  let roamAt = 0;
  let pickAt = 0;
  let settleAt = 0;
  let stoodAt = 0;
  let fixed = null;
  let bubbleW = 0;
  let bubbleH = 0;
  const here = { x: 0, y: 0 };

  const still = () => reducedMotion.matches || Boolean(experience?.classList.contains('motion-paused'));
  const invalidate = () => {
    if (!frameId && !host.hidden) frameId = requestAnimationFrame(frame);
  };
  const gesture = (name, seconds) => {
    pose = name;
    poseUntil = performance.now() + seconds * 1000;
    invalidate();
  };
  const feel = (name, seconds) => {
    expr = name;
    exprUntil = performance.now() + seconds * 1000;
    invalidate();
  };
  const hop = (spin = false) => {
    if (still()) return;
    hopAt = performance.now();
    spinning = spin;
    landed = false;
  };
  const tint = (colour, ms) => {
    accentTarget.set(colour);
    tintUntil = ms ? performance.now() + ms : 0;
    heldTint = !ms;
    invalidate();
  };
  const releaseTint = () => {
    heldTint = false;
    tintUntil = 0;
    accentTarget.copy(baseColour);
    invalidate();
  };
  const wake = (quiet = false) => {
    lastActivity = performance.now();
    if (!asleep) return;
    asleep = false;
    pose = 'idle';
    hop();
    feel('wow', 0.8);
    if (!quiet) say(LINES.wake, { hold: 2400 });
  };
  // Walk towards a point on the page for a few seconds, e.g. the control just used.
  const headFor = (element, seconds = 4) => {
    goal = {
      x: () => {
        const rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2;
      },
      until: performance.now() + seconds * 1000
    };
  };

  const measure = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    // Resizing clears the drawing buffer, so only do it when the size changed.
    if (!width || !height || sizeKey === `${width}x${height}`) return;
    sizeKey = `${width}x${height}`;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const feet = probe.set(0, 0, 0).project(camera).y;
    const up = probe.set(0, 1, 0).project(camera).y;
    metrics.unit = ((up - feet) / 2) * height;
    metrics.figure = FIGURE_HEIGHT * metrics.unit;
    metrics.half = width * 0.36;
    host.style.setProperty('--friend-ground', ((1 + feet) / 2).toFixed(4));
    // A text box starts at the font's ascent, well above the capitals; measure
    // the difference so the feet land on the letters themselves.
    perches.forEach(item => {
      if (!item.text) return;
      const style = getComputedStyle(item.element);
      ruler.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ink = ruler.measureText('H');
      item.sink = Math.max(0, (ink.fontBoundingBoxAscent ?? 0) - ink.actualBoundingBoxAscent);
    });
    invalidate();
  };

  const pick = () => {
    const fresh = pointer && performance.now() - pointerAt < 5000;
    const reference = fresh ? pointer.y : window.innerHeight * 0.55;
    let best = FLOOR;
    let bestScore = Infinity;
    for (const item of perches) {
      const edge = survey(item);
      if (!edge.valid) continue;
      // Prefer the edge nearest the visitor's attention, but not the one just left.
      const score = Math.abs(edge.y - reference) + (item === lastGround ? 220 : 0);
      if (score < bestScore) {
        best = item;
        bestScore = score;
      }
    }
    return best;
  };
  const leap = (next, aim) => {
    const now = performance.now();
    // Start from just outside the viewport if the old perch scrolled away.
    const fromY = clamp(here.y, -20, window.innerHeight + metrics.figure + 30);
    lastGround = ground;
    ground = next;
    const edge = survey(next);
    const [low, high] = span(edge);
    const toX = clamp(aim ?? here.x, low, high);
    const distance = Math.hypot(toX - here.x, edge.y - fromY);
    jump = {
      fromX: here.x + window.scrollX,
      fromY: fromY + window.scrollY,
      aim: toX,
      at: now,
      duration: clamp(380 + distance * 0.55, 420, 900),
      peak: clamp(40 + distance * 0.12, 40, 110)
    };
    speed = 0;
    sit.t = 0;
    wanderTo = null;
    wanderAt = now + 2500 + Math.random() * 4000;
    roamAt = now + 22000 + Math.random() * 16000;
    feel('wow', jump.duration / 1000);
  };

  function frame(time) {
    frameId = 0;
    // A small mascot gains nothing from 120 Hz; skip every other frame there.
    if (time - previous < 14) {
      invalidate();
      return;
    }
    const now = performance.now();
    const frozen = still();
    const dt = Math.min((time - previous) / 1000 || 0.016, 1 / 30);
    previous = time;
    const t = time / 1000;
    const viewW = window.innerWidth;

    if (!frozen && !asleep && now - lastActivity > SLEEP_AFTER && !talking()) {
      asleep = true;
      pose = 'sleep';
    }
    if (pose !== 'idle' && pose !== 'sleep' && now > poseUntil) pose = 'idle';
    if (expr !== 'open' && now > exprUntil) expr = 'open';
    if (tintUntil && now > tintUntil && !heldTint) releaseTint();

    const pointerFresh = pointer && now - pointerAt < 4000;
    let x;
    let y;
    if (frozen) {
      // No travelling with motion off: wait in the corner, as a still figure.
      ground = FLOOR;
      jump = null;
      x = viewW - metrics.half - 8;
      y = survey(FLOOR).y;
      offset = x;
      speed = 0;
      gait = 0;
      sit.t = 0;
      air.t = 0;
      facing.t = 0;
    } else {
      let edge = survey(ground);
      if (!jump && now > settleAt) {
        const scrolling = now - lastScrollAt < 260;
        const wanted = wish && now < wish.until && wish.place !== ground && survey(wish.place).valid ? wish : null;
        if (!edge.valid) {
          // Mid-scroll it drops to the viewport edge; it picks a perch once things settle.
          leap(scrolling ? FLOOR : pick());
        } else if (wanted) {
          leap(wanted.place, wanted.aim?.());
        } else if (ground === FLOOR && !scrolling && now > pickAt) {
          pickAt = now + 500;
          const best = pick();
          if (best !== FLOOR) leap(best);
        } else if (now > roamAt && !asleep && !talking()) {
          roamAt = now + 22000 + Math.random() * 16000;
          const others = perches.filter(item => item !== ground && survey(item).valid);
          if (others.length) leap(others[Math.floor(Math.random() * others.length)]);
        }
        edge = survey(ground);
      }
      const [low, high] = span(edge);
      if (jump) {
        const progress = Math.min((now - jump.at) / jump.duration, 1);
        const fromX = jump.fromX - window.scrollX;
        const fromY = jump.fromY - window.scrollY;
        const toX = clamp(jump.aim, low, high);
        const eased = progress * progress * (3 - 2 * progress);
        x = fromX + (toX - fromX) * eased;
        y = fromY + (edge.y - fromY) * progress - jump.peak * 4 * progress * (1 - progress);
        facing.t = clamp((toX - fromX) / 160, -0.7, 0.7);
        air.t = 1;
        gait = 0;
        if (progress >= 1) {
          jump = null;
          offset = toX - edge.left;
          squash.v = -2.6;
          stoodAt = now;
        }
      } else {
        x = clamp(edge.left + offset, low, high);
        y = edge.y;
        air.t = 0;
        // Follow the pointer along the edge, but stop beside it rather than
        // under it, so the mascot never covers what the visitor is aiming at.
        const near = pointerFresh && Math.abs(pointer.y - (y - metrics.figure * 0.5)) < 300;
        let target = x;
        if (goal && now < goal.until) {
          target = goal.x();
        } else if (near) {
          const gap = pointer.x - x;
          if (Math.abs(gap) > 72) target = pointer.x - Math.sign(gap) * 56;
          wanderTo = null;
          wanderAt = now + 3000 + Math.random() * 5000;
        } else if (!asleep) {
          if (now > wanderAt) {
            wanderTo = low + Math.random() * (high - low) - edge.left;
            wanderAt = now + 7000 + Math.random() * 9000;
          }
          if (wanderTo !== null) target = edge.left + wanderTo;
        }
        target = clamp(target, low, high);
        const gap = target - x;
        const wantsMove = Math.abs(gap) > 4 && !asleep;
        if (wantsMove) {
          sit.t = 0;
          stoodAt = now;
        } else {
          wanderTo = null;
          if (ground !== FLOOR && (asleep || now - stoodAt > 8000)) sit.t = 1;
        }
        // Stand up fully before setting off, then run if it is a long way.
        const pace = metrics.figure * (Math.abs(gap) > metrics.figure * 2.5 ? 2.3 : 1.15);
        const wanted = wantsMove && sit.x < 0.12 ? Math.sign(gap) * pace * Math.min(1, Math.abs(gap) / 30 + 0.25) : 0;
        speed += (wanted - speed) * (1 - Math.exp(-10 * dt));
        let step = speed * dt;
        if (!wantsMove || Math.abs(step) >= Math.abs(gap)) {
          step = wantsMove ? gap : 0;
          speed = 0;
        }
        x += step;
        offset = x - edge.left;
        // One full stride covers about 1.5 world units of ground.
        phase += (Math.abs(step) / (1.5 * metrics.unit)) * Math.PI * 2;
        const moving = Math.abs(speed) > 6;
        gait += ((moving ? 1 : 0) - gait) * (1 - Math.exp(-9 * dt));
        facing.t = moving ? Math.sign(speed) * 0.85 : 0;
      }
    }
    here.x = x;
    here.y = y;

    // Standing on the page it is positioned in document space, so it scrolls
    // with its perch; on the viewport edge it is fixed.
    const pin = ground === FLOOR;
    if (pin !== fixed) {
      fixed = pin;
      host.classList.toggle('is-fixed', pin);
    }
    host.style.transform = `translate(${(x + (pin ? 0 : window.scrollX)).toFixed(1)}px, ${(y + (pin ? 0 : window.scrollY)).toFixed(1)}px)`;

    if (bubble.classList.contains('is-visible')) {
      if (bubbleStale) {
        bubbleStale = false;
        bubbleW = bubble.offsetWidth;
        bubbleH = bubble.offsetHeight;
      }
      // Above the head when there is room, otherwise beside it; always on screen.
      let centre = x;
      let top = y - metrics.figure - 12 - bubbleH;
      if (top < 6) {
        centre = x + (x > viewW / 2 ? -1 : 1) * (metrics.half + bubbleW / 2 + 8);
        top = Math.max(6, y - metrics.figure * 0.75 - bubbleH / 2);
      }
      centre = clamp(centre, 8 + bubbleW / 2, viewW - 8 - bubbleW / 2);
      // The bubble hangs left of the anchor, so an unplaced one cannot widen the page.
      bubble.style.transform = `translate(${(centre + bubbleW / 2 - x).toFixed(1)}px, ${(top - y).toFixed(1)}px)`;
    }

    // Look at the pointer; without one, drift across the page content.
    let lookX = 0;
    let lookY = -0.06;
    if (!frozen) {
      if (pointerFresh) {
        lookX = Math.tanh((pointer.x - x) / 420);
        lookY = Math.tanh((pointer.y - (y - metrics.figure * 0.72)) / 380);
      } else {
        lookX = 0.3 * Math.sin(t * 0.43);
        lookY += 0.1 * Math.sin(t * 0.29 + 1);
      }
      scrollBias *= Math.exp(-4 * dt);
      lookY = clamp(lookY + scrollBias, -1, 1);
    } else {
      lookX = -0.32;
    }
    if (asleep) {
      lookX = 0;
      lookY = 0;
    }
    // While walking the head mostly follows the body.
    turn.t = lookX * 0.2 * (1 - gait);
    yaw.t = lookX * 0.42 * (1 - gait * 0.7);
    pitch.t = lookY * 0.3 + (asleep ? 0.3 : 0);
    roll.t = asleep ? 0.16 : 0.05 - lookX * 0.06;

    const stride = Math.sin(phase);
    const gesturing = pose !== 'idle' && pose !== 'sleep';
    let stance = POSES[pose];
    if (!gesturing) {
      if (jump) stance = POSES.cheer;
      else if (sit.t && !asleep) stance = POSES.sit;
    }
    for (const side of ['R', 'L']) {
      const swing = (side === 'R' ? 1 : -1) * stride * 0.7;
      stance[side].forEach((value, index) => {
        let target = value;
        if (!gesturing && gait > 0.02) target += ((index ? WALK_ARM[index] : swing) - target) * gait;
        armSprings[side][index].t = target;
      });
    }
    if (!frozen && pose === 'wave') armSprings.R[3].t += 0.4 * Math.sin(t * 11);
    if (!frozen && pose === 'cheer') {
      armSprings.R[3].t += 0.22 * Math.sin(t * 13);
      armSprings.L[3].t += 0.22 * Math.sin(t * 13 + 1.5);
    }
    rise.t = 0;

    for (const item of Object.values(springs)) {
      if (frozen) {
        item.x = item.t;
        item.v = 0;
      } else {
        item.v += (item.k * (item.t - item.x) - item.c * item.v) * dt;
        item.x += item.v * dt;
      }
    }

    let lift = 0;
    let twirl = 0;
    const hopPhase = (now - hopAt) / 560;
    if (!frozen && hopPhase < 1) {
      lift = 0.46 * 4 * hopPhase * (1 - hopPhase);
      if (spinning) twirl = Math.PI * 2 * (1 - (1 - hopPhase) ** 3);
    } else if (!landed) {
      landed = true;
      squash.v = -2.6;
    }
    // Legs: stride when walking, split in the air, dangle when seated.
    const legSwing = stride * 0.55 * gait;
    const seated = clamp(sit.x, 0, 1);
    const airborne = clamp(air.x, 0, 1);
    friend.setLeg(friend.legs.R, -legSwing - airborne * 0.6 - seated * (0.3 - 0.2 * Math.sin(t * 2.4)));
    friend.setLeg(friend.legs.L, legSwing + airborne * 0.42 - seated * (0.3 - 0.2 * Math.sin(t * 2.4 + 2)));
    // Both feet rise as the legs spread, so lower the body to keep them on the edge.
    const dip = LEG_LENGTH * (1 - Math.cos(legSwing)) + seated * 0.62;

    const breath = frozen ? 0 : Math.sin(t * (asleep ? 1.1 : 1.9));
    const stretch = squash.x + lift * 0.14;
    friend.root.position.y = rise.x + lift - dip;
    friend.pool.position.y = 0.004 - lift + dip;
    friend.rig.rotation.y = facing.x + twirl;
    friend.rig.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    friend.torso.rotation.set(gait * 0.07, turn.x, breath * 0.012);
    friend.torso.scale.y = 1 + breath * 0.012;
    friend.head.rotation.set(pitch.x, yaw.x, roll.x);
    friend.head.position.y = headRest + breath * 0.012;
    for (const side of ['R', 'L']) friend.setArm(friend.arms[side], armSprings[side].map(item => item.x));

    accent.lerp(accentTarget, frozen ? 1 : 1 - Math.exp(-7 * dt));
    const hex = accent.getHexString();
    if (hex !== accentHex) {
      accentHex = hex;
      friend.setAccent(accent);
      host.style.setProperty('--friend-accent', `#${hex}`);
    }

    let blink = 0;
    if (!frozen && now > blinkAt) {
      blink = 1;
      if (now > blinkAt + 130) blinkAt = now + 2400 + Math.random() * 3600;
    }
    const mood = asleep ? 'sleep' : expr !== 'open' ? expr : hovered ? 'happy' : 'open';
    friend.face.draw({
      expr: mood,
      blink,
      ox: Math.round(yaw.x * 34),
      oy: Math.round(pitch.x * 38),
      // The prompt cursor blinks only while a line is on screen.
      cursor: frozen || !talking() || Math.floor(t * 2.2) % 2 === 0,
      colour: `#${hex}`
    });

    renderer.render(scene, camera);
    if (!frozen) {
      invalidate();
      return;
    }
    // With motion off nothing redraws on its own, so wake once for the next
    // pose, expression, tint, or speech line that is due to end.
    const due = [poseUntil, exprUntil, tintUntil, bubbleUntil].filter(at => at > now);
    clearTimeout(stillTimer);
    if (due.length) stillTimer = setTimeout(invalidate, Math.min(...due) - now + 30);
  }

  window.addEventListener('pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY };
    pointerAt = performance.now();
    wake(true);
  }, { passive: true });
  window.addEventListener('keydown', () => wake(true), { passive: true });
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const rate = (window.scrollY - lastScrollY) / Math.max(now - lastScrollAt, 16);
    lastScrollY = window.scrollY;
    lastScrollAt = now;
    scrollBias = clamp(scrollBias + rate * 0.12, -0.7, 0.7);
    if (Math.abs(rate) > 4 && !asleep) feel('wow', 0.5);
    wake(true);
    invalidate();
  }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(canvas);
  reducedMotion.addEventListener('change', invalidate);

  body.addEventListener('pointerenter', () => { hovered = true; invalidate(); });
  body.addEventListener('pointerleave', () => { hovered = false; invalidate(); });
  body.addEventListener('click', () => {
    wake(true);
    const step = tipIndex % 3;
    if (step === 0) gesture('thumbs', 2.6);
    else if (step === 1) gesture('wave', 2.4);
    else gesture('cheer', 1.8);
    hop(step === 2);
    feel('happy', 1.8);
    say(LINES.tips[tipIndex % LINES.tips.length], { rank: 2, announce: true });
    tipIndex += 1;
  });

  // The tool explorer and "Pause motion" both live on the hero panel, so one
  // observer keeps the mascot in step without site.js knowing it exists.
  if (experience) {
    let activeTool = experience.dataset.active;
    new MutationObserver(() => {
      const tool = experience.dataset.active;
      if (tool !== activeTool && toolColours[tool]) {
        activeTool = tool;
        wake(true);
        tint(toolColours[tool], 9000);
        say(LINES.tools[tool], { rank: 2 });
        gesture(tool === 'pilot' ? 'cheer' : 'thumbs', 1.8);
        // Come and stand over the tool that was picked.
        const node = experience.querySelector(`[data-tool="${tool}"]`);
        if (node) headFor(node, 5);
        if (heroPanel) wish = { place: heroPanel, until: performance.now() + 5000, aim: goal?.x };
      }
      invalidate();
    }).observe(experience, { attributes: true, attributeFilter: ['class', 'data-active'] });
  }
  document.querySelectorAll('.project-card').forEach(card => {
    const tool = ['box', 'bench', 'pilot', 'mind'].find(name => card.classList.contains(`${name}-card`));
    const ledge = spot(card.querySelector('.project-visual'));
    if (!tool || !ledge) return;
    let intent = 0;
    card.addEventListener('pointerenter', () => {
      tint(toolColours[tool], 0);
      // A short pause filters out cards the pointer merely crosses.
      intent = setTimeout(() => {
        wish = { place: ledge, until: performance.now() + 1500 };
      }, 180);
    });
    card.addEventListener('pointerleave', () => {
      clearTimeout(intent);
      releaseTint();
    });
  });

  const feedback = document.querySelector('.install-feedback');
  const copyButton = document.querySelector('.copy-command');
  if (feedback) {
    new MutationObserver(() => {
      const text = feedback.textContent;
      if (!text) return;
      wake(true);
      if (copyButton) headFor(copyButton, 3);
      if (text.startsWith('Copied')) {
        gesture('thumbs', 3);
        hop();
        feel('happy', 2.6);
        say(LINES.copied, { rank: 2 });
      } else {
        say(LINES.selected, { rank: 2 });
      }
    }).observe(feedback, { childList: true, characterData: true, subtree: true });
  }
  document.querySelector('.method-details')?.addEventListener('toggle', event => {
    if (!event.target.open) return;
    wake(true);
    feel('happy', 1.6);
    say(LINES.method, { rank: 2 });
  });

  if ('IntersectionObserver' in window) {
    const sections = {
      workflow: '#workflow', projects: '#projects', privacy: '#privacy',
      start: '#start', evidence: '#evidence', closing: '.closing-cta'
    };
    const seen = new Set();
    const watcher = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const name = entry.target.dataset.friendSection;
        if (!entry.isIntersecting || seen.has(name) || host.hidden) return;
        if (!say(LINES.sections[name])) return;
        seen.add(name);
        if (name === 'closing') gesture('wave', 2.2);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Object.entries(sections).forEach(([name, selector]) => {
      const section = document.querySelector(selector);
      if (!section) return;
      section.dataset.friendSection = name;
      watcher.observe(section);
    });
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frameId);
    frameId = -1;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    frameId = 0;
    invalidate();
  });

  return {
    enter() {
      const now = performance.now();
      measure();
      // Pop up in the corner, say hello, then go and find somewhere to stand.
      ground = FLOOR;
      lastGround = FLOOR;
      jump = null;
      offset = window.innerWidth - metrics.half - 10;
      here.x = offset;
      here.y = window.innerHeight;
      rise.x = -5.2;
      rise.v = 0;
      settleAt = now + 2800;
      stoodAt = now;
      lastActivity = now;
      asleep = false;
      host.classList.add('is-ready');
      gesture('wave', 2.6);
      setTimeout(() => say(LINES.hello, { hold: 6500 }), still() ? 0 : 700);
    },
    stop() {
      cancelAnimationFrame(frameId);
      clearTimeout(stillTimer);
      frameId = 0;
    }
  };
}

let starting = false;
async function start() {
  if (starting) return;
  starting = true;
  host.hidden = false;
  // three.js needs WebGL 2; check before downloading anything.
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  try {
    if (!gl) throw new Error('WebGL 2 unavailable');
    const [THREE, model] = await Promise.all([import(THREE_URL), import(MODEL_URL)]);
    live = run(THREE, model, gl);
    live.enter();
  } catch {
    host.remove();
    summon.remove();
  }
}

dismiss.addEventListener('click', () => {
  live?.stop();
  host.hidden = true;
  bubble.classList.remove('is-visible');
  bubbleUntil = 0;
  summon.hidden = false;
  writeHidden(true);
  summon.focus();
});
summon.addEventListener('click', () => {
  summon.hidden = true;
  host.hidden = false;
  writeHidden(false);
  if (live) live.enter();
  else start();
  body.focus({ preventScroll: true });
});

const boot = () => {
  // Respect an earlier "hide" and data-saver: offer the mascot, do not load it.
  if (readHidden() || navigator.connection?.saveData) summon.hidden = false;
  else start();
};
const whenIdle = () => {
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 2500 });
  else setTimeout(boot, 600);
};
if (document.readyState === 'complete') whenIdle();
else window.addEventListener('load', whenIdle, { once: true });

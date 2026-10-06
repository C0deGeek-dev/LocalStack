// Local friend model: geometry, rig, and the canvas-drawn terminal face.
// A pure builder with no page wiring or animation loop; mascot.js drives it.
// Units are arbitrary; the origin is on the ground between the feet.

const HEAD_W = 2.2;
const HEAD_H = 1.6;
const HEAD_D = 0.96;
const BEVEL = 0.16;
const HIP_Y = 0.66;
const LEG_Y = 0.72;
const TORSO_R = 0.47;
const TORSO_Y = 1.17;
const NECK_Y = 1.8;
const SHOULDER_X = 0.46;
const SHOULDER_Y = 1.42;
const UPPER_ARM = 0.28;
const FOREARM = 0.26;
const SOLE_H = 0.07;
const FACE_W = 512;
const FACE_H = 332;

// Per arm: [shoulder swing, shoulder spread, elbow bend, elbow fold, thumb].
// R is the mascot's own right arm, which the visitor sees on the left.
const HIP = [0.12, 0.95, -0.15, -1.75, 0];
export const POSES = {
  idle: { R: [0.04, 0.3, -0.3, 0, 0], L: HIP },
  thumbs: { R: [-0.3, 0.62, -1.22, 0, 1], L: HIP },
  wave: { R: [-0.25, 1.2, 0, 0.9, 0], L: HIP },
  cheer: { R: [-0.3, 1.3, 0, 0.95, 1], L: [-0.3, 1.3, 0, 0.95, 1] },
  sleep: { R: [0.1, 0.16, -0.12, 0, 0], L: [0.1, 0.16, -0.12, 0, 0] },
  sit: { R: [0.18, 0.42, -0.1, 0, 0], L: [0.18, 0.42, -0.1, 0, 0] }
};
// World-space height of the standing figure and of the hip joint the legs swing from.
export const FIGURE_HEIGHT = 3.44;
export const LEG_LENGTH = LEG_Y;

function roundedRect(THREE, w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - r);
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + h);
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function createFace(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_W;
  canvas.height = FACE_H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const white = new THREE.Color(0xffffff);
  const core = new THREE.Color();
  let drawn = '';

  // Each glyph is painted twice: a wide blurred pass for the glow, then a
  // narrower, lighter pass so it reads as a lit tube rather than a flat fill.
  const paint = (state, colour, width, inset, blur) => {
    ctx.strokeStyle = ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = blur;
    ctx.lineWidth = width;
    ctx.beginPath();
    if (state.expr === 'sleep') {
      ctx.moveTo(88, 160);
      ctx.lineTo(168, 160);
    } else {
      ctx.moveTo(86, 106);
      ctx.lineTo(170, 154);
      ctx.lineTo(86, 202);
    }
    ctx.stroke();
    if (state.cursor) {
      ctx.beginPath();
      ctx.moveTo(152, 246);
      ctx.lineTo(240, 246);
      ctx.stroke();
    }
    ctx.beginPath();
    if (state.expr === 'sleep') {
      ctx.moveTo(334, 176);
      ctx.lineTo(414, 176);
      ctx.stroke();
      ctx.font = '700 50px "Cascadia Mono", Consolas, monospace';
      ctx.fillText('z', 424, 104);
      ctx.font = '700 34px "Cascadia Mono", Consolas, monospace';
      ctx.fillText('z', 458, 62);
    } else if (state.expr === 'happy') {
      ctx.arc(374, 190, 40, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    } else if (state.expr === 'wow') {
      ctx.lineWidth = width * 0.8;
      ctx.arc(374, 172, 38, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const r = 44 - inset;
      ctx.ellipse(374, 172, r, Math.max(5, r * (1 - state.blink)), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = state => {
    const key = `${state.expr}|${state.blink}|${state.ox}|${state.oy}|${state.cursor}|${state.colour}`;
    if (key === drawn) return;
    drawn = key;
    const bg = ctx.createLinearGradient(0, 0, FACE_W, FACE_H);
    bg.addColorStop(0, '#0b1424');
    bg.addColorStop(0.5, '#05080f');
    bg.addColorStop(1, '#070c17');
    ctx.shadowBlur = 0;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FACE_W, FACE_H);
    const gloss = ctx.createLinearGradient(0, 0, FACE_W * 0.55, FACE_H);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    gloss.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, FACE_W, FACE_H);

    ctx.save();
    ctx.translate(FACE_W / 2 + state.ox, FACE_H / 2 + state.oy);
    ctx.scale(1.14, 1.14);
    ctx.translate(-FACE_W / 2, -FACE_H / 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    paint(state, state.colour, 28, 0, 30);
    paint(state, core.set(state.colour).lerp(white, 0.14).getStyle(), 14, 9, 0);
    ctx.restore();
    texture.needsUpdate = true;
  };

  return { texture, draw };
}

export function buildFriend(THREE) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const skin = new THREE.MeshStandardMaterial({ color: 0x0c1933, roughness: 0.56, metalness: 0.05 });
  const neon = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  // A view-facing falloff turns an oversized shell into a soft halo, which
  // keeps the neon look without a post-processing bloom pass.
  const glow = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0xffffff) }, uStrength: { value: 0.5 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float falloff = pow(max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.6) * uStrength;
        gl_FragColor = vec4(uColor * falloff, falloff);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const mesh = (geometry, material, parent) => {
    const item = new THREE.Mesh(geometry, material);
    parent.add(item);
    return item;
  };
  // A lit band around a limb: a bright core plus its halo shell.
  const band = (radius, tube, parent, y) => {
    const group = new THREE.Group();
    mesh(new THREE.TorusGeometry(radius, tube, 10, 48), neon, group);
    mesh(new THREE.TorusGeometry(radius, tube * 2.9, 10, 48), glow, group);
    group.rotation.x = Math.PI / 2;
    group.position.y = y;
    parent.add(group);
    return group;
  };

  // Each leg hangs from its hip so it can swing for a walk or dangle when seated.
  const makeLeg = side => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.27, LEG_Y, 0);
    const shin = mesh(new THREE.CapsuleGeometry(0.17, 0.22, 8, 20), skin, hip);
    shin.position.y = 0.47 - LEG_Y;
    band(0.176, 0.026, shin, -0.1);

    const shoe = new THREE.Group();
    shoe.position.set(side * 0.07, -LEG_Y, 0.12);
    shoe.rotation.y = side * 0.14;
    shoe.scale.z = 1.42;
    mesh(new THREE.CylinderGeometry(0.27, 0.28, SOLE_H, 28), skin, shoe).position.y = SOLE_H / 2;
    const dome = mesh(new THREE.SphereGeometry(0.27, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin, shoe);
    dome.position.y = SOLE_H;
    dome.scale.y = 0.92;
    band(0.272, 0.02, shoe, SOLE_H);
    hip.add(shoe);
    rig.add(hip);
    return { hip, shoe };
  };
  const legs = { R: makeLeg(-1), L: makeLeg(1) };
  // The shoe counter-rotates so the sole stays closer to level through a stride.
  const setLeg = (leg, angle) => {
    leg.hip.rotation.x = angle;
    leg.shoe.rotation.x = -angle * 0.6;
  };

  const torso = new THREE.Group();
  torso.position.y = HIP_Y;
  rig.add(torso);
  const belly = mesh(new THREE.CapsuleGeometry(TORSO_R, 0.2, 12, 28), skin, torso);
  belly.position.y = TORSO_Y - HIP_Y;
  belly.scale.z = 0.9;
  mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.18, 20), skin, torso).position.y = NECK_Y - HIP_Y - 0.05;

  const makeArm = side => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * SHOULDER_X, SHOULDER_Y - HIP_Y, 0);
    mesh(new THREE.CapsuleGeometry(0.125, UPPER_ARM - 0.08, 8, 16), skin, shoulder).position.y = -UPPER_ARM / 2;
    const elbow = new THREE.Group();
    elbow.position.y = -UPPER_ARM;
    shoulder.add(elbow);
    mesh(new THREE.CapsuleGeometry(0.12, FOREARM - 0.08, 8, 16), skin, elbow).position.y = -FOREARM / 2;
    band(0.128, 0.026, elbow, -FOREARM + 0.03);
    const hand = mesh(new THREE.SphereGeometry(0.21, 20, 16), skin, elbow);
    hand.position.y = -FOREARM - 0.14;
    // The thumb points along the arm's front, so it stands upright once the
    // forearm is raised forward.
    const thumb = new THREE.Group();
    const tip = mesh(new THREE.CapsuleGeometry(0.076, 0.14, 6, 12), skin, thumb);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.23;
    hand.add(thumb);
    torso.add(shoulder);
    return { side, shoulder, elbow, thumb };
  };
  const arms = { R: makeArm(-1), L: makeArm(1) };
  const setArm = (arm, [swing, spread, bend, fold, thumb]) => {
    arm.shoulder.rotation.set(swing, 0, arm.side * spread);
    arm.elbow.rotation.set(bend, 0, arm.side * fold);
    arm.thumb.scale.setScalar(0.45 + 0.55 * thumb);
  };

  // The head pivots at the neck so a tilt swings the whole monitor.
  const head = new THREE.Group();
  head.position.y = NECK_Y - HIP_Y;
  torso.add(head);
  const monitor = new THREE.Group();
  monitor.position.set(0, HEAD_H / 2 + 0.04, 0.04);
  head.add(monitor);

  const flatW = HEAD_W - BEVEL * 2;
  const flatH = HEAD_H - BEVEL * 2;
  const shell = new THREE.ExtrudeGeometry(roundedRect(THREE, flatW, flatH, 0.3), {
    depth: HEAD_D - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 8,
    curveSegments: 16
  });
  shell.translate(0, 0, -(HEAD_D - BEVEL * 2) / 2);
  mesh(shell, skin, monitor);

  const frontZ = HEAD_D / 2;
  const outline = roundedRect(THREE, flatW - 0.04, flatH - 0.04, 0.29);
  const bezel = new THREE.Curve();
  bezel.getPoint = (t, target = new THREE.Vector3()) => {
    const point = outline.getPoint(t);
    return target.set(point.x, point.y, 0);
  };
  mesh(new THREE.TubeGeometry(bezel, 160, 0.062, 10, true), neon, monitor).position.z = frontZ;
  mesh(new THREE.TubeGeometry(bezel, 160, 0.19, 10, true), glow, monitor).position.z = frontZ;

  const screenW = flatW - 0.2;
  const screenH = flatH - 0.2;
  const screenGeometry = new THREE.ShapeGeometry(roundedRect(THREE, screenW, screenH, 0.22), 12);
  const uv = screenGeometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) / screenW + 0.5, uv.getY(i) / screenH + 0.5);
  }
  const face = createFace(THREE);
  const screen = mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: face.texture, toneMapped: false }), monitor);
  screen.position.z = frontZ + 0.012;

  // Soft pool of light under the feet, standing in for a floor reflection.
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = poolCanvas.height = 128;
  const poolCtx = poolCanvas.getContext('2d');
  const fade = poolCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  fade.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  fade.addColorStop(0.45, 'rgba(255, 255, 255, 0.22)');
  fade.addColorStop(1, 'rgba(255, 255, 255, 0)');
  poolCtx.fillStyle = fade;
  poolCtx.fillRect(0, 0, 128, 128);
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(poolCanvas),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const pool = mesh(new THREE.PlaneGeometry(2.8, 2.8), poolMaterial, root);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.004;

  // Dark body on a dark page: the accent rim lights are what make it readable.
  root.add(new THREE.HemisphereLight(0x8fb4ff, 0x05070c, 0.9));
  const key = new THREE.DirectionalLight(0xdcebff, 1.1);
  key.position.set(-2.5, 4.5, 5);
  root.add(key);
  const rims = [[-4, 2.6, -3.2], [4, 3.2, -3.2]].map(position => {
    const rim = new THREE.DirectionalLight(0xffffff, 5);
    rim.position.set(...position);
    root.add(rim);
    return rim;
  });
  const spill = new THREE.PointLight(0xffffff, 5, 3.4, 2);
  spill.position.set(0, HEAD_H * 0.3, frontZ + 0.9);
  monitor.add(spill);

  const lit = new THREE.Color();
  const white = new THREE.Color(0xffffff);
  const setAccent = colour => {
    neon.color.copy(lit.copy(colour).lerp(white, 0.1));
    glow.uniforms.uColor.value.copy(colour);
    poolMaterial.color.copy(colour);
    spill.color.copy(colour);
    rims.forEach(rim => rim.color.copy(colour));
  };

  return { root, rig, torso, head, arms, legs, pool, setArm, setLeg, setAccent, face };
}

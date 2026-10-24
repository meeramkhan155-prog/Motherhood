// Motherhood's picture guides in 3D, with Three.js: soft clay-like figures with light and depth.
// Every scene follows the same layout as the approved 2D drawings (a 240 x 240 frame), so positions
// that matter medically stay the same: nose level with the nipple before latching, mouth on the
// areola and nose resting above it once latched, chin first, and so on. The camera sways gently.
// Labels and captions come from the 2D steps. If Three.js or WebGL is missing, the 2D drawings run.
(function guides3d() {
  "use strict";
  if (!window.THREE) return;
  const THREE = window.THREE;

  const canvas = document.getElementById("guide-3d");
  if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch { return; }
  renderer.outputEncoding = THREE.sRGBEncoding;

  const darkMq = matchMedia("(prefers-color-scheme: dark)");
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  // ---------- palette (same names as the 2D guides) ----------
  function palette() {
    const dark = darkMq.matches;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || (dark ? "#231C18" : "#F5EDE3");
    return {
      bg, dark,
      m: dark ? "#EDC3A6" : "#E9B697",   // baby's skin
      c: dark ? "#8FA6BC" : "#7F95AB",   // baby's onesie
      l: dark ? "#9C806F" : "#E2CDB8",   // you, blanket, cot
      ar: dark ? "#B97F6C" : "#C98E78",  // areola
      nip: dark ? "#8F5747" : "#A86450", // nipple
      a: dark ? "#F0A2B2" : "#D9788C",   // the thing to notice
      d: dark ? "#3A2A24" : "#5A3E36",   // eyes, ears
      in: "#8E4A4A",                     // inside the mouth
      bl: dark ? "#F2B1AE" : "#F0A8A0",  // rosy cheek
      sk: dark ? "#C99476" : "#D9A887",  // your skin
      sk2: dark ? "#B58266" : "#C99474", // your hand
      top: dark ? "#6F7F69" : "#A9B79F", // your top
      hr: dark ? "#7A5644" : "#5E4034",  // hair
    };
  }
  let PAL = palette();

  // ---------- helpers: 2D layout coordinates (0..240, y down) to 3D (y up), 20 px per unit ----------
  const X = (px) => (px - 120) / 20, Y = (py) => (120 - py) / 20, U = (px) => px / 20;
  const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
  const matCache = new Map();
  function clay(key) {
    const color = PAL[key] || key;
    const id = color + (key === "in" ? "i" : "");
    if (!matCache.has(id)) matCache.set(id, new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.78, metalness: 0 }));
    return matCache.get(id);
  }
  // an ellipsoid at a 2D layout point; z is how far it comes toward you
  function ell(parent, key, px, py, rx, ry, rz, z = 0, rot = 0) {
    const m = new THREE.Mesh(sphereGeo, clay(key));
    m.scale.set(U(rx), U(ry), U(rz));
    m.position.set(X(px), Y(py), U(z));
    m.rotation.z = rot;
    parent.add(m);
    return m;
  }
  // a rounded tube along 2D layout points (arms, fingers, rails)
  function tube(parent, key, pts, r, z = 0, caps = true) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([px, py, pz = z]) => new THREE.Vector3(X(px), Y(py), U(pz))));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, U(r), 14, false), clay(key));
    parent.add(m);
    if (caps) for (const end of [pts[0], pts[pts.length - 1]]) ell(parent, key, end[0], end[1], r, r, r, end[2] ?? z);
    return m;
  }
  function box(parent, key, px, py, w, h, d, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(U(w), U(h), U(d)), clay(key));
    m.position.set(X(px + w / 2), Y(py + h / 2), U(z));
    parent.add(m);
    return m;
  }
  // a curved stroke on a surface (closed eyes, smiles, lips): a thin torus arc
  function arc(parent, key, px, py, r, from, to, thick, z) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(U(r), U(thick), 8, 24, to - from), clay(key));
    m.position.set(X(px), Y(py), U(z));
    m.rotation.z = -to; // 2D angles go clockwise (y down); 3D counter-clockwise
    parent.add(m);
    return m;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  const ease = (k) => k * k * (3 - 2 * k);

  // a soft round shadow under things, for depth
  const shadowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(0,0,0,0.35)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  function shadow(parent, px, py, rx, ry, z = -40) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: PAL.dark ? 0.55 : 0.35 }));
    m.scale.set(U(rx * 2), U(ry * 2), 1);
    m.position.set(X(px), Y(py), U(z));
    parent.add(m);
    return m;
  }

  // ---------- shared figures ----------
  // Baby's head in big close-up, facing right (the latch steps). x shifts the whole head.
  function closeBaby(root) {
    const g = new THREE.Group(); root.add(g);
    ell(g, "c", 70, 238, 120, 50, 60, -10);                          // shoulders in the onesie
    ell(g, "m", 70, 98, 64, 64, 58, 0);                               // head
    ell(g, "m", 118, 116, 30, 30, 28, 0);                             // full cheek: part of the profile
    ell(g, "bl", 104, 122, 10, 10, 3, 44);                            // rosy cheek, on the surface
    const nose = ell(g, "m", 140, 102, 9, 9, 9, 0);
    const chin = ell(g, "m", 118, 146, 24, 18, 22, 0);
    const mouth = ell(g, "in", 136, 122, 9, 6, 8, 6);
    const lipTop = ell(g, "a", 140, 113, 8, 3.2, 6, 8);
    const lipBot = ell(g, "a", 137, 129, 8, 3.2, 6, 8);
    const eye = ell(g, "d", 118, 80, 4.5, 4.5, 2.5, 36);
    const lid = arc(g, "d", 116, 80, 7, 0.3, Math.PI - 0.3, 1.2, 37);
    arc(g, "d", 102, 64, 12, 3.7, 5.2, 1.2, 40);                       // eyebrow
    arc(g, "d", 40, 108, 13, -1.4, 2.4, 2.2, 50);                      // ear
    arc(g, "d", 40, 108, 6, -1.0, 2.0, 1.6, 52);
    arc(g, "d", 66, 46, 9, 3.6, 5.8, 1.4, 34);                         // a little curl of hair
    return {
      g,
      // open: 0..1, latched: lips curled out around the breast, suck: small chin movement
      pose({ x = 0, open = 0, latched = false, eyesClosed = false, suck = 0 }) {
        g.position.x = U(x);
        const chinY = 146 + 16 * open + suck;
        chin.position.y = Y(chinY);
        nose.position.y = Y(latched ? 92 : 102);
        eye.visible = !eyesClosed; lid.visible = eyesClosed;
        if (latched) {
          mouth.visible = false;
          lipTop.position.set(X(150), Y(116), U(8)); lipTop.rotation.z = -0.6;
          lipBot.position.set(X(148), Y(138), U(8)); lipBot.rotation.z = 0.6;
        } else {
          mouth.visible = open > 0.05;
          mouth.scale.set(U(10), U(4 + 13 * open), U(8));
          mouth.position.set(X(136), Y(120 + 6 * open), U(6));
          lipTop.position.set(X(140), Y(113), U(9)); lipTop.rotation.z = 0;
          lipBot.position.set(X(137), Y(126 + 26 * open), U(9)); lipBot.rotation.z = 0;
        }
      },
    };
  }
  // The breast seen from the side, with the areola and nipple facing baby. dy moves it down.
  function closeBreast(root) {
    const g = new THREE.Group(); root.add(g);
    ell(g, "sk", 252, 104, 92, 92, 70, -20);
    ell(g, "ar", 163, 104, 6, 22, 18, 0);
    ell(g, "nip", 153, 104, 9, 9, 8, 0);
    return { g, pose(dy) { g.position.y = -U(dy); } };
  }
  // Your hand shaping the breast like a C: thumb on top, fingers underneath.
  function cHold(root) {
    const g = new THREE.Group(); root.add(g);
    const thumb = ell(g, "sk2", 214, 32, 34, 13, 12, 30, 0.35);
    for (let i = 0; i < 3; i++) tube(g, "sk2", [[186 + i * 22, 168 + i * 4], [186 + i * 22, 206 + i * 4]], 10, 30);
    ell(g, "sk2", 236, 226, 44, 32, 24, 26);
    return { g, pose(k, dy) { g.position.set(U(lerp(60, 0, k)), -U(dy), 0); g.visible = k > 0.001; } };
  }

  // ---------- swaddle helpers: flat blanket pieces, and flaps that fold along a crease ----------
  function swPiece(pts, key) {
    const shape = new THREE.Shape(pts.map(([px, py]) => new THREE.Vector2(X(px), Y(py))));
    return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: U(3), bevelEnabled: false }), clay(key));
  }
  function swBase(root, pts) { shadow(root, 120, 126, 110, 100, -6); root.add(swPiece(pts, "l")); }
  function swTop(root) { const m = swPiece([[70, 76], [170, 76], [120, 114]], "a"); m.position.z = U(3.2); root.add(m); }
  function swFlap(root, pts, a, b, key, z) {
    const pivot = new THREE.Group();
    const A = new THREE.Vector3(X(a[0]), Y(a[1]), U(z)), B = new THREE.Vector3(X(b[0]), Y(b[1]), U(z));
    pivot.position.copy(A);
    const axis = B.clone().sub(A).normalize();
    const mesh = swPiece(pts, key);
    mesh.position.set(-A.x, -A.y, 0);
    pivot.add(mesh);
    root.add(pivot);
    // fold toward the viewer: pick the turning direction that lifts the flap's middle toward us
    const mid = pts.reduce((m, [px, py]) => m.add(new THREE.Vector3(X(px) - A.x, Y(py) - A.y, 0)), new THREE.Vector3()).divideScalar(pts.length);
    const sign = mid.clone().applyAxisAngle(axis, Math.PI / 2).z >= 0 ? 1 : -1;
    return (k) => pivot.setRotationFromAxisAngle(axis, sign * k * Math.PI * 0.97);
  }
  function swBaby(root) {
    const g = new THREE.Group(); root.add(g);
    ell(g, "c", 120, 136, 34, 48, 22, 10);
    ell(g, "m", 120, 80, 28, 28, 24, 14);
    arc(g, "d", 110, 80, 5, 0.4, Math.PI - 0.4, 1.1, 36); arc(g, "d", 130, 80, 5, 0.4, Math.PI - 0.4, 1.1, 36);
    arc(g, "d", 120, 90, 5, 0.3, Math.PI - 0.3, 1.0, 36);
    return g;
  }

  // ---------- scenes: one per guide step ----------
  const SCENES = {
    latch: [
      // 1. The cradle hold: you facing us, baby across your body, tummy to tummy, nose to nipple.
      (root) => {
        shadow(root, 120, 232, 90, 18);
        ell(root, "top", 122, 170, 70, 96, 46, -20);                 // your body in your top
        ell(root, "sk", 120, 70, 9, 14, 9, -10);                      // neck
        ell(root, "hr", 126, 36, 30, 30, 26, -16);                    // hair
        ell(root, "hr", 148, 26, 12, 12, 10, -24);                    // hair tied back
        ell(root, "sk", 114, 46, 23, 24, 21, 0);                      // face, tilted toward baby
        ell(root, "sk", 94, 52, 6, 6, 6, 16);                         // nose
        arc(root, "d", 104, 46, 4.5, 0.5, Math.PI - 0.1, 1.2, 22);    // eye looking down at baby
        arc(root, "d", 102, 58, 5, 0.2, Math.PI - 0.8, 1.2, 20);      // smile
        ell(root, "sk", 98, 116, 22, 22, 18, 20);                     // breast
        ell(root, "ar", 94, 120, 8, 8, 3, 39);                        // areola
        ell(root, "nip", 94, 120, 3.4, 3.4, 3, 41);                   // nipple
        tube(root, "sk", [[64, 92, 0], [40, 156, 14], [62, 178, 30], [158, 184, 30]], 9.5); // the arm baby lies on
        const baby = new THREE.Group(); root.add(baby);
        ell(baby, "c", 116, 172, 46, 22, 22, 36, 0.08);               // baby's body across your tummy
        ell(baby, "m", 150, 196, 8, 8, 8, 40); ell(baby, "m", 136, 204, 7, 7, 7, 42); // little feet
        const head = new THREE.Group(); baby.add(head);
        ell(head, "m", 70, 150, 22, 22, 20, 40);                      // baby's head in the crook of your arm
        ell(head, "m", 80, 136, 10, 10, 9, 52);                       // cheek turned to the breast
        ell(head, "m", 86, 124, 5, 5, 5, 56);                         // nose, up toward the nipple
        arc(head, "d", 64, 152, 4, 0.4, Math.PI - 0.4, 1.1, 60);      // closed eye
        arc(head, "d", 56, 158, 5, -1.2, 2.2, 1.6, 58);               // ear
        tube(root, "sk", [[180, 94, -6], [198, 150, 20], [176, 168, 44], [146, 170, 46]], 9.5); // your other arm wraps the front
        const dots = [0, 1, 2].map(() => ell(root, "a", 0, 0, 2.2, 2.2, 2.2, 54));
        return (p) => {
          const k = ease(seg(p, 0, 0.5));
          baby.position.set(U(lerp(-10, 0, k)), U(lerp(-6, 0, k)), 0);
          dots.forEach((d, i) => {                                    // nose to nipple, dotted
            d.visible = p > 0.5;
            d.position.set(X(lerp(86, 94, (i + 1) / 4)), Y(lerp(124, 120, (i + 1) / 4)), U(52));
          });
        };
      },
      // 2. Up close: nose to nipple, then a wide open mouth.
      (root) => {
        const breast = closeBreast(root), baby = closeBaby(root);
        const dots = [0, 1, 2].map(() => ell(root, "a", 0, 0, 2, 2, 2, 30));
        return (p) => {
          breast.pose(0);
          baby.pose({ x: -8, open: ease(seg(p, 0.3, 0.7)) });
          dots.forEach((d, i) => { d.visible = p < 0.6; d.position.set(X(146 - i * 7), Y(lerp(104, 98, i / 2)), U(30)); });
        };
      },
      // 3. Shape your breast like a C.
      (root) => {
        const breast = closeBreast(root), hand = cHold(root), baby = closeBaby(root);
        return (p) => { breast.pose(0); hand.pose(ease(seg(p, 0, 0.5)), 0); baby.pose({ x: -8, open: 1 }); };
      },
      // 4. Bring baby to you, chin first: the breast lowers into the open mouth.
      (root) => {
        const breast = closeBreast(root), hand = cHold(root), baby = closeBaby(root);
        const arrow = new THREE.Group(); root.add(arrow);
        tube(arrow, "a", [[30, 196], [58, 196]], 3, 40);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(U(7), U(12), 16), clay("a"));
        tip.rotation.z = -Math.PI / 2; tip.position.set(X(66), Y(196), U(40)); arrow.add(tip);
        return (p) => {
          const k = ease(seg(p, 0.05, 0.6));
          breast.pose(25 * k); hand.pose(1, 25 * k); baby.pose({ x: lerp(-8, 12, k), open: 1 });
          arrow.visible = p < 0.65;
        };
      },
      // 5. Latched: lips curled out on the areola, chin pressed in, nose resting just above.
      (root) => {
        const breast = closeBreast(root), hand = cHold(root), baby = closeBaby(root);
        return () => { breast.pose(25); hand.pose(1, 25); baby.pose({ x: 24, latched: true }); };
      },
      // 6. Let go of your breast: slow, deep sucks.
      (root) => {
        const breast = closeBreast(root), hand = cHold(root), baby = closeBaby(root);
        return (p, t) => {
          breast.pose(25); hand.pose(1 - ease(seg(p, 0, 0.4)), 25);
          baby.pose({ x: 24, latched: true, eyesClosed: true, suck: Math.sin(t * 4) * 1.5 });
        };
      },
    ],

    burp: [
      // 1. Over your shoulder, with a hand patting.
      (root) => {
        ell(root, "hr", 176, 44, 32, 30, 26, -30);
        ell(root, "sk", 170, 54, 28, 28, 24, -16);                    // your head
        ell(root, "l", 191, 178, 78, 90, 50, -40);                    // your shoulders and chest
        ell(root, "c", 100, 148, 28, 46, 26, 14);                     // baby's body against you
        ell(root, "m", 124, 84, 22, 22, 20, 18);                      // baby's head on your shoulder
        arc(root, "d", 118, 80, 5, 0.4, Math.PI - 0.4, 1.1, 38);      // closed eye
        const hand = ell(root, "sk2", 62, 146, 14, 18, 10, 42);
        tube(root, "sk", [[230, 150, -10], [210, 210, 10], [120, 200, 34], [70, 160, 40]], 10); // your arm
        return (p, t) => { hand.position.x = X(62 + Math.abs(Math.sin(t * 5)) * 10); };
      },
      // 2. Sitting on your lap: hold chin and chest, pat the back.
      (root) => {
        shadow(root, 120, 214, 90, 16);
        box(root, "l", 30, 184, 180, 26, 70, -30);                    // your lap
        ell(root, "c", 120, 142, 32, 46, 30, 0);                      // baby sitting up
        ell(root, "m", 124, 80, 22, 22, 20, 4);                       // head
        arc(root, "d", 132, 76, 4, 0.4, Math.PI - 0.4, 1.1, 24);
        ell(root, "sk2", 160, 118, 12, 18, 10, 30);                   // your hand on chest and chin
        const pat = ell(root, "sk2", 76, 136, 12, 17, 10, 18);
        return (p, t) => { pat.position.x = X(76 - Math.abs(Math.sin(t * 5)) * 10); };
      },
      // 3. Small circles on the back.
      (root) => {
        ell(root, "c", 120, 150, 36, 52, 30, 0);                      // baby's back
        ell(root, "m", 120, 80, 26, 26, 24, 4);
        ell(root, "d", 120, 62, 10, 4, 8, 22);                        // a little hair
        const trail = [0, 1, 2].map(() => ell(root, "a", 0, 0, 3, 3, 3, 34));
        const hand = ell(root, "sk2", 0, 0, 13, 16, 10, 34);
        return (p, t) => {
          const a = t * 2.4;
          hand.position.set(X(120 + Math.cos(a) * 16), Y(152 + Math.sin(a) * 16), U(34));
          trail.forEach((d, i) => d.position.set(X(120 + Math.cos(a - (i + 1) * 0.45) * 16), Y(152 + Math.sin(a - (i + 1) * 0.45) * 16), U(34)));
        };
      },
    ],

    swaddle: [
      // The blanket lies flat; flaps fold over in 3D along their creases.
      (root) => {
        swBase(root, [[68, 72], [172, 72], [220, 120], [120, 220], [20, 120]]);
        const fold = swFlap(root, [[120, 20], [172, 72], [68, 72]], [68, 72], [172, 72], "a", 3.2);
        return (p) => fold(ease(seg(p, 0.15, 0.7)));
      },
      (root) => {
        swBase(root, [[68, 72], [172, 72], [220, 120], [120, 220], [20, 120]]);
        swTop(root);
        const baby = swBaby(root);
        return (p) => { const k = ease(seg(p, 0.05, 0.6)); baby.position.set(0, U(lerp(80, 0, k)), U(lerp(60, 4, k))); };
      },
      (root) => {
        // the left corner is a separate flap, so it can fold across the chest
        swBase(root, [[70, 78], [172, 72], [220, 120], [120, 220], [104, 204]]);
        swTop(root);
        const baby = swBaby(root); baby.position.z = U(4);
        const left = swFlap(root, [[70, 78], [20, 120], [104, 204]], [70, 78], [104, 204], "a", 30);
        return (p) => left(ease(seg(p, 0.1, 0.65)));
      },
      // Wrapped: snug at the chest, loose at the hips.
      (root) => {
        shadow(root, 120, 150, 70, 90, -6);
        ell(root, "l", 120, 146, 48, 72, 30, 0);
        ell(root, "l", 120, 64, 31, 31, 18, 2);
        ell(root, "m", 120, 66, 25, 25, 22, 14);
        arc(root, "d", 112, 64, 4, 0.4, Math.PI - 0.4, 1.0, 34); arc(root, "d", 128, 64, 4, 0.4, Math.PI - 0.4, 1.0, 34);
        const band = new THREE.Mesh(new THREE.TorusGeometry(U(44), U(5), 10, 40), clay("a"));
        band.scale.set(1, 0.32, 1); band.position.set(X(120), Y(116), U(8)); band.rotation.x = 0.2; root.add(band);
        const hips = ell(root, "a", 120, 186, 32, 24, 14, 26);
        return (p, t) => { hips.scale.x = U(32 + Math.sin(t * 3) * 5); };
      },
    ],

    sleep: [
      // 1. Alone, in their own cot.
      (root) => cotScene(root, false),
      // 2. On their back, every sleep.
      (root) => {
        shadow(root, 120, 186, 110, 14);
        box(root, "l", 20, 170, 200, 14, 80, -40);                    // mattress
        ell(root, "c", 132, 154, 70, 18, 30, -6);                     // baby on their back, side view
        ell(root, "m", 54, 146, 22, 22, 20, -6);
        ell(root, "m", 62, 126, 5, 5, 5, -4);                         // nose pointing up
        arc(root, "d", 52, 138, 4, 0.4, Math.PI - 0.4, 1.1, 14);
        const bubble = ell(root, "a", 0, 0, 6, 6, 6, 10);
        return (p, t) => {
          const z = (t * 0.5) % 1, r = 6 * (1 - z) + 1.5;
          bubble.scale.setScalar(U(r)); bubble.position.set(X(76 + z * 26), Y(106 - z * 50), U(10));
        };
      },
      // 3. A clear cot: the pillow and teddy leave.
      (root) => cotScene(root, true),
      // 4. Never asleep with baby on a sofa or armchair.
      (root) => {
        shadow(root, 120, 186, 110, 14);
        box(root, "l", 24, 112, 192, 50, 70, -20);
        box(root, "l", 24, 70, 192, 46, 26, -50);
        box(root, "l", 12, 96, 32, 72, 76, -20); box(root, "l", 196, 96, 32, 72, 76, -20);
        const a = tube(root, "a", [[52, 56, 50], [188, 196, 50]], 6, 0, false), b = tube(root, "a", [[188, 56, 52], [52, 196, 52]], 6, 0, false);
        const grow = (m, k) => { m.scale.set(1, 1, 1); m.visible = k > 0.02; m.material = clay("a"); m.geometry.setDrawRange(0, Math.floor(m.geometry.index.count * k / 3) * 3); };
        return (p) => { grow(a, ease(seg(p, 0.1, 0.45))); grow(b, ease(seg(p, 0.45, 0.8))); };
      },
    ],
  };

  function cotScene(root, clearing) {
    shadow(root, 120, 124, 76, 108, -30);
    box(root, "l", 64, 28, 112, 184, 10, -24);                         // mattress
    for (let x = 56; x <= 184; x += 16) tube(root, "l", [[x, 20, -10], [x, 220, -10]], 2.6);   // rails
    tube(root, "l", [[52, 20, 6], [188, 20, 6]], 5); tube(root, "l", [[52, 220, 6], [188, 220, 6]], 5);
    const g = new THREE.Group(); root.add(g);
    ell(g, "c", 120, 130, 30, 46, 18, -6);                             // sleeping bag
    ell(g, "m", 120, 76, 22, 22, 18, -6);
    arc(g, "d", 112, 76, 4, 0.4, Math.PI - 0.4, 1.0, 12); arc(g, "d", 128, 76, 4, 0.4, Math.PI - 0.4, 1.0, 12);
    const pillow = ell(root, "a", 90, 186, 22, 14, 10, -6);
    const teddy = new THREE.Group(); root.add(teddy);
    ell(teddy, "a", 152, 186, 14, 14, 12, -4); ell(teddy, "a", 142, 170, 6, 6, 6, -4); ell(teddy, "a", 162, 170, 6, 6, 6, -4);
    pillow.visible = teddy.visible = clearing;
    return (p, t) => {
      g.children[0].scale.y = U(46 + Math.sin(t * 2) * 1.2);           // gentle breathing
      if (!clearing) return;
      const k = ease(seg(p, 0.25, 0.75));
      pillow.position.x = X(lerp(90, -40, k)); teddy.position.x = U(lerp(0, 128, k));
      pillow.visible = teddy.visible = k < 1;
    };
  }

  // ---------- running ----------
  const lights = (scene) => {
    scene.add(new THREE.HemisphereLight(0xfff4e8, 0x6b5446, PAL.dark ? 0.75 : 0.8));
    const key = new THREE.DirectionalLight(0xfff8f0, PAL.dark ? 0.9 : 0.95);
    key.position.set(-5, 7, 10); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd9c4, 0.35);
    rim.position.set(7, -1, 3); scene.add(rim);
  };
  let built = { key: "", scene: null, update: null };
  function sceneFor(id, step) {
    const key = id + ":" + step + ":" + (PAL.dark ? "d" : "l");
    if (built.key === key) return built;
    if (built.scene) built.scene.traverse((o) => { if (o.geometry && o.geometry !== sphereGeo) o.geometry.dispose(); });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.bg); // backgrounds aren't colour-converted in this Three.js version
    lights(scene);
    const root = new THREE.Group(); scene.add(root);
    const update = SCENES[id][step](root) || (() => {});
    built = { key, scene, update };
    return built;
  }
  darkMq.addEventListener?.("change", () => { PAL = palette(); matCache.clear(); built.key = ""; });

  window.Guides3D = {
    has: (id, step) => !!(SCENES[id] && SCENES[id][step]),
    render(id, step, p, t, size, dpr, still) {
      const { scene, update } = sceneFor(id, step);
      const px = Math.round(size * dpr);
      if (canvas.width !== px) { renderer.setPixelRatio(1); renderer.setSize(px, px, false); }
      update(p, t);
      // gentle sway so the depth shows; a still, straight view if motion is reduced
      const closeUp = id === "latch" && step > 0;
      const sway = still ? 0 : Math.sin(t * 0.6) * (closeUp ? 0.16 : 0.3);
      const dist = 26;
      camera.position.set(Math.sin(sway) * dist, Math.sin(t * 0.4) * (still ? 0 : 0.8), Math.cos(sway) * dist);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    },
  };
})();

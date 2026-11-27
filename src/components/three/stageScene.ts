import * as THREE from "three";
import { addStudioLights, buildInstrument, createRenderer, disposeTree, makeMaterials, studioEnvironment, type Kind } from "./kit";

export type StageItem = {
  kind: Kind;
  /** position in a 10 × 6 frame centred on the origin */
  x: number; y: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  scale?: number;
};
export type StageState = { progress: number; px: number; py: number; reduced: boolean; /** set by mountStage: request frames after the inputs change */ kick?: () => void };

/**
 * A small composition of floating instruments. Rendering pauses while the
 * canvas is off-screen; scroll progress (0→1) turns and lifts the set.
 */
export function mountStage(canvas: HTMLCanvasElement, items: StageItem[], state: StageState, opts: { dark?: boolean; spin?: number } = {}) {
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const renderer = createRenderer(canvas, mobile ? 1.5 : 1.75);
  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  addStudioLights(scene, opts.dark);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  const group = new THREE.Group();
  scene.add(group);
  const mats = makeMaterials(opts.dark);
  const objs = items.map((it, i) => {
    const o = buildInstrument(it.kind, mats);
    o.scale.setScalar(it.scale ?? 1);
    group.add(o);
    return { it, o, phase: i * 1.7 };
  });

  let fit = 1;
  const resize = () => {
    const r = canvas.parentElement!.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    fit = Math.min(1.25, (visH * camera.aspect) / 10, visH / 6);
  };
  resize();

  // Render on demand: frames run only while the set eases toward the latest
  // scroll/pointer input, then the loop stops until the next kick.
  let raf = 0, visible = false, ps = state.progress, px = 0, py = 0;
  const spin = opts.spin ?? 1;
  const EPS = 0.0004;
  const frame = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    ps += (state.progress - ps) * 0.12;
    px += (state.px - px) * 0.08;
    py += (state.py - py) * 0.08;
    group.scale.setScalar(fit);
    group.rotation.y = (ps - 0.5) * 0.9 * spin + px * 0.2;
    group.rotation.x = -py * 0.12;
    for (const { it, o, phase } of objs) {
      const z = it.z ?? 0;
      o.position.set(it.x, it.y + Math.sin(phase) * 0.08 + (ps - 0.5) * (z + 1) * -0.6, z);
      o.rotation.set(
        (it.rx ?? 0) + Math.sin(phase) * 0.05,
        (it.ry ?? 0) + (ps - 0.5) * 1.2 * spin + phase * 0.1,
        (it.rz ?? 0) + Math.cos(phase) * 0.04,
      );
    }
    renderer.render(scene, camera);
    const moving = Math.abs(state.progress - ps) > EPS || Math.abs(state.px - px) > EPS || Math.abs(state.py - py) > EPS;
    if (moving && !state.reduced) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  state.kick = kick;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: "120px" });
  io.observe(canvas);
  const onResize = () => { resize(); kick(); };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas.parentElement!);

  return () => {
    cancelAnimationFrame(raf);
    state.kick = undefined;
    io.disconnect();
    ro.disconnect();
    disposeTree(scene);
    Object.values(mats).forEach((m) => m.dispose());
    env.dispose();
    renderer.dispose();
  };
}

import { useEffect, useRef } from 'react';
import { startBroadcastRuntimeMetrics } from '@/lib/broadcast-runtime-metrics';
import type { CSSProperties } from 'react';
import { resolveDesignBinding } from '@/lib/broadcast-design-bindings';
import { getPublishedDesign, subscribeDesign, evaluateLayerAtTime, evaluateDesignLayersAtTime, type BroadcastDesign, type DesignLayer, type DesignAnimationId } from '@/lib/broadcast-design';
import { useMatch } from '@/context/MatchContext';

const INSPECT_CHANNEL = 'wab-broadcast-design-inspector-v1';
const LIVE_EDIT_CHANNEL = 'wab-broadcast-design-live-edit-v1';
const dynamicBases = new Map<string, { x:number; y:number; width:number; height:number }>();
let adaptiveQualityFactor = 1;

function elementVisualType(node: HTMLElement): DesignLayer['type'] {
  const tag = node.tagName.toLowerCase();
  if (tag === 'img' || tag === 'svg' || tag === 'video' || getComputedStyle(node).backgroundImage !== 'none') return 'image';
  const text = node.children.length === 0 && (node.textContent || '').trim();
  if (text) return 'text';
  const cs = getComputedStyle(node);
  if (cs.borderStyle !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return 'frame';
  return 'shape';
}

function stableLayerId(animationId: DesignAnimationId, index: number) { return `dom:${animationId}:legacy:${index}`; }

function domPath(root: HTMLElement, node: HTMLElement): string {
  if (root === node) return 'root';
  const parts: number[] = [];
  let current: HTMLElement | null = node;
  while (current && current !== root) {
    const parent = current.parentElement;
    if (!parent) break;
    parts.unshift(Array.from(parent.children).indexOf(current));
    current = parent;
  }
  return parts.length ? parts.join('.') : 'root';
}

function stableDomLayerId(animationId: DesignAnimationId, node: HTMLElement, root: HTMLElement, rootIndex: number, fallbackIndex: number) {
  const existing = node.dataset.wabLayerId;
  if (existing) return existing;
  return `dom:${animationId}:root${rootIndex}:${domPath(root, node) || `legacy-${fallbackIndex}`}`;
}

function captureCurrentAnimation(animationId: DesignAnimationId) {
  const contexts = animationDocuments();
  const visible: any[] = [];
  contexts.forEach(({ doc, offsetX, offsetY }) => {
    Array.from(doc.querySelectorAll<HTMLElement>('body *')).forEach((node, index) => {
      const local = node.getBoundingClientRect();
      const r = {
        left: local.left + offsetX,
        top: local.top + offsetY,
        width: local.width,
        height: local.height,
        right: local.right + offsetX,
        bottom: local.bottom + offsetY,
      };
      const cs = getComputedStyle(node);
      const area = r.width * r.height;
      const visibleNow = r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      const pos = cs.position;
      const z = Number.isFinite(Number(cs.zIndex)) ? Number(cs.zIndex) : 0;
      const likely = pos === 'fixed' || pos === 'absolute' || z >= 80 || !!node.dataset.wabLayerId;
      visible.push({ node, index, r, cs, area, visibleNow, likely, z, doc, offsetX, offsetY });
    });
  });
  const viewportArea = window.innerWidth * window.innerHeight;
  const declaredRoots = contexts.flatMap(({ doc, offsetX, offsetY }) =>
    Array.from(doc.querySelectorAll<HTMLElement>(`[data-wab-layer-root="${CSS.escape(animationId)}"]`)).map(node => {
      const found = visible.find(x => x.node === node);
      return found || { node, r: (() => { const r=node.getBoundingClientRect(); return { left:r.left+offsetX, top:r.top+offsetY, width:r.width, height:r.height, right:r.right+offsetX, bottom:r.bottom+offsetY }; })(), area: node.getBoundingClientRect().width * node.getBoundingClientRect().height, visibleNow:true, likely:true, z:Number(getComputedStyle(node).zIndex)||0, cs:getComputedStyle(node), doc, offsetX, offsetY };
    })
  );
  const roots = declaredRoots.length
    ? declaredRoots.slice(0, 3)
    : visible.filter(x => x.area > viewportArea * .18).sort((a,b) => (b.z-a.z) || (b.area-a.area)).slice(0,2);
  const chosen: any[] = [];
  const unique = new Set<HTMLElement>();
  visible.forEach(x => {
    const root = roots.find((candidate: any) => candidate.node === x.node || candidate.node.contains(x.node));
    if (!root) return;
    const node = x.node as HTMLElement;
    if (node.closest('[data-wab-design-ignore]')) return;
    const tag = node.tagName.toLowerCase();
    const hasLayerMarker = !!node.dataset.wabLayerId;
    const visual = tag === 'img' || tag === 'svg' || tag === 'video' || node.children.length === 0 || x.cs.backgroundImage !== 'none' || x.cs.borderStyle !== 'none';
    const insideDeclaredRoot = roots.some((candidate:any) => candidate.node === node || candidate.node.contains(node));
    const captureEligible = () => { return insideDeclaredRoot ? (visual || hasLayerMarker) : (visual && x.likely); };
    // Deep inspection keeps explicitly marked layers even when the animation
    // currently has them hidden. Their last known geometry is retained, so
    // the Layer Tree can still show/edit them and the change takes effect when
    // the original animation reveals the element.
    if (captureEligible() && !unique.has(node)) { unique.add(node); chosen.push(x); }
  });
  const layers: DesignLayer[] = [];
  const nodeToLayer = new Map<HTMLElement, string>();
  chosen.forEach((x, i) => {
    const node = x.node as HTMLElement;
    const root = roots.findIndex((r: any) => r.node === node || r.node.contains(node));
    const rootNode = root >= 0 ? roots[root].node as HTMLElement : node;
    const id = stableDomLayerId(animationId, node, rootNode, Math.max(0, root), i);
    node.dataset.wabLayerId = id;
    nodeToLayer.set(node, id);
    dynamicBases.set(id, { x:x.r.left / window.innerWidth * 1920, y:x.r.top / window.innerHeight * 1080, width:x.r.width / window.innerWidth * 1920, height:x.r.height / window.innerHeight * 1080 });
  });
  chosen.forEach((x, i) => {
    const node=x.node as HTMLElement; const r=x.r; const cs=x.cs; const id=nodeToLayer.get(node)!;
    let parent: HTMLElement | null = node.parentElement; let parentId: string | null = null;
    while (parent) { const candidate=nodeToLayer.get(parent); if (candidate) { parentId=candidate; break; } parent=parent.parentElement; }
    const tag=node.tagName.toLowerCase(); const type=elementVisualType(node);
    const text=node.children.length===0 ? (node.textContent||'').trim().slice(0,500) : undefined;
    const img=tag==='img' ? (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src : undefined;
    const fallback = dynamicBases.get(id);
    const gx = r.width > 0 ? r.left / window.innerWidth * 1920 : (fallback?.x ?? 0);
    const gy = r.height > 0 ? r.top / window.innerHeight * 1080 : (fallback?.y ?? 0);
    const gw = r.width > 0 ? r.width / window.innerWidth * 1920 : (fallback?.width ?? 1);
    const gh = r.height > 0 ? r.height / window.innerHeight * 1080 : (fallback?.height ?? 1);
    layers.push({ id, name:text || node.getAttribute('aria-label') || node.getAttribute('title') || `${tag.toUpperCase()} ${i+1}`, type, visible:x.visibleNow, locked:false, parentId,
      x:gx, y:gy, width:gw, height:gh,
      rotation:0, scale:1, opacity:Number(cs.opacity||1), zIndex:Math.max(1,Number(cs.zIndex)||i+1), color:cs.color, background:cs.backgroundColor, borderColor:cs.borderColor,
      borderWidth:parseFloat(cs.borderTopWidth)||0, borderRadius:parseFloat(cs.borderTopLeftRadius)||0, fontFamily:cs.fontFamily, fontSize:parseFloat(cs.fontSize)||undefined,
      fontWeight:cs.fontWeight, textAlign:(cs.textAlign as any)||'left', direction:(cs.direction as any)||'auto', text, imageSrc:img, videoSrc:tag==='video' ? ((node as HTMLVideoElement).currentSrc || (node as HTMLVideoElement).src) : (node.querySelector('video')?.currentSrc || node.querySelector('video')?.src || undefined), effect:'none',
      borderStyle:(cs.borderStyle as any)||'solid', filter:cs.filter==='none'?undefined:cs.filter, letterSpacing:parseFloat(cs.letterSpacing)||0, lineHeight:parseFloat(cs.lineHeight)||1.2,
      blendMode:(cs.mixBlendMode as any)||'normal', keyframes:[], sourceKey:`dom:${animationId}:${id}` });
  });
  const byId = new Map(layers.map(l => [l.id,l]));
  layers.forEach(l => { if (l.parentId) { const parent=byId.get(l.parentId); if(parent) parent.children=[...(parent.children||[]),l.id]; } });
  return { animationId, capturedAt:Date.now(), layers };
}

function publishInspectorSnapshot(animationId: DesignAnimationId) {
  try { const ch=new BroadcastChannel(INSPECT_CHANNEL); ch.postMessage({type:'snapshot',...captureCurrentAnimation(animationId)}); ch.close(); } catch {}
}


const BASE: Record<string, { x: number; y: number; width: number; height: number }> = {
  'red-team-group': { x: 50, y: 190, width: 610, height: 760 },
  'blue-team-group': { x: 1260, y: 190, width: 610, height: 760 },
  center: { x: 690, y: 190, width: 540, height: 760 },
  'red-logo': { x: 220, y: 70, width: 170, height: 170 },
  'blue-logo': { x: 220, y: 70, width: 170, height: 170 },
  'red-name': { x: 70, y: 270, width: 470, height: 90 },
  'blue-name': { x: 70, y: 270, width: 470, height: 90 },
  'red-club': { x: 80, y: 370, width: 450, height: 50 },
  'blue-club': { x: 80, y: 370, width: 450, height: 50 },
  'red-roster': { x: 0, y: 0, width: 1, height: 1 },
  'blue-roster': { x: 0, y: 0, width: 1, height: 1 },
  'red-status': { x: 0, y: 0, width: 1, height: 1 },
  'blue-status': { x: 0, y: 0, width: 1, height: 1 },
  'red-glow': { x: 0, y: 0, width: 610, height: 760 },
  'blue-glow': { x: 0, y: 0, width: 610, height: 760 },
  'match-number': { x: 60, y: 70, width: 420, height: 100 },
  clock: { x: 0, y: 0, width: 540, height: 100 },
  'call-card': { x: 0, y: 0, width: 540, height: 240 },
  trophy: { x: 110, y: 220, width: 320, height: 360 },
};

type Snapshot = { transform: string; translate: string; rotate: string; scale: string; display: string; visibility: string; opacity: string; color: string; fontFamily: string; fontSize: string; fontWeight: string; textAlign: string; borderColor: string; borderWidth: string; borderRadius: string; background: string; backgroundImage: string; borderStyle: string; filter: string; boxShadow: string; letterSpacing: string; lineHeight: string; webkitTextStroke: string; clipPath: string; mixBlendMode: string; direction: string; maskImage: string; maskSize: string; webkitMaskImage: string; webkitMaskSize: string; imageSrc: string; textContent: string | null }; 
const snapshots = new Map<HTMLElement, Snapshot>();
const touched = new Set<HTMLElement>();

function animationDocuments() {
  const docs: Array<{ doc: Document; offsetX: number; offsetY: number }> = [{ doc: document, offsetX: 0, offsetY: 0 }];
  document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((frame) => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const r = frame.getBoundingClientRect();
      docs.push({ doc, offsetX: r.left, offsetY: r.top });
    } catch {}
  });
  return docs;
}

function layerNodes(id: string): HTMLElement[] {
  const selector = `[data-wab-layer-id="${CSS.escape(id)}"]`;
  const result: HTMLElement[] = [];
  animationDocuments().forEach(({ doc }) => {
    try { result.push(...Array.from(doc.querySelectorAll<HTMLElement>(selector))); } catch {}
  });
  return result;
}

const loadedFonts = new Set<string>();
async function ensureDesignFont(layer: DesignLayer) {
  if (!layer.fontSource || !layer.fontFamily || loadedFonts.has(layer.fontFamily)) return;
  try {
    const face = new FontFace(layer.fontFamily, `url(${layer.fontSource})`);
    await face.load();
    document.fonts.add(face);
    loadedFonts.add(layer.fontFamily);
  } catch {}
}

function effectStyles(kind: DesignLayer['effect'], color: string, intensity: number, radius: number, time: number): CSSProperties {
  const pulse = 0.82 + 0.18 * Math.sin(time * 8);
  const p = Math.max(0, intensity) * pulse;
  switch (kind) {
    case 'glow': return { boxShadow: `0 0 ${radius*p}px ${color}, 0 0 ${radius*2*p}px ${color}66` };
    case 'bloom': return { boxShadow: `0 0 ${radius*p}px ${color}99, 0 0 ${radius*3*p}px ${color}44`, filter: `brightness(${1 + .12*p}) saturate(${1 + .18*p})` };
    case 'shine': return { backgroundImage: `linear-gradient(115deg, transparent ${Math.max(0, (time*80)%120-18)}%, ${color}99 ${(time*80)%120}%, transparent ${Math.min(100, (time*80)%120+18)}%)` };
    case 'light': return { boxShadow: `0 0 ${radius*1.4*p}px ${color}aa, inset 0 0 ${Math.max(2,radius/3)}px ${color}44` };
    case 'energy': return { boxShadow: `0 0 ${radius*p}px ${color}88, 0 0 ${radius*2*p}px ${color}44`, filter: `brightness(${1+.1*p})` };
    case 'spark': return { boxShadow: `0 0 ${radius*p}px ${color}, ${Math.sin(time*15)*radius}px ${Math.cos(time*11)*radius/2}px ${Math.max(2,radius/5)}px ${color}99` };
    case 'particles': return { backgroundImage: `radial-gradient(circle at ${20+Math.sin(time*2)*12}% ${30+Math.cos(time*3)*15}%, ${color} 0 1px, transparent 2px), radial-gradient(circle at ${70+Math.cos(time*2.4)*15}% ${65+Math.sin(time*2.7)*18}%, #fff 0 1px, transparent 2px), radial-gradient(circle at ${45+Math.sin(time*1.8)*20}% ${80+Math.cos(time*2.2)*12}%, ${color} 0 1px, transparent 2px)` };
    case 'smoke': return { backgroundImage: `radial-gradient(circle at ${30+Math.sin(time)*8}% 60%, #fff2, transparent 40%), radial-gradient(circle at ${70+Math.cos(time*.8)*10}% 30%, ${color}22, transparent 45%)`, filter: `blur(${Math.max(1,radius/8)}px)` };
    case 'reflection': return { backgroundImage: `linear-gradient(135deg, transparent ${35+Math.sin(time*2)*8}%, ${color}66 50%, transparent ${65+Math.sin(time*2)*8}%)` };
    case 'scanline': return { backgroundImage: `repeating-linear-gradient(0deg, transparent 0 5px, ${color}22 6px 7px)`, opacity: Math.min(1, .65 + p*.2) };
    case 'gradient': return { backgroundImage: `linear-gradient(${135 + Math.sin(time)*20}deg, ${color}, transparent 75%)` };
    case 'bevel': return { boxShadow: `inset 2px 2px ${Math.max(2,radius/3)}px #fff6, inset -2px -2px ${Math.max(2,radius/3)}px #0008` };
    case 'inner-glow': return { boxShadow: `inset 0 0 ${radius*p}px ${color}` };
    case 'outer-glow': return { boxShadow: `0 0 ${radius*p}px ${color}, 0 0 ${radius*2*p}px ${color}66` };
    case 'shadow': return { boxShadow: `0 ${8*p}px ${Math.max(4,radius)}px ${color}88` };
    case 'blur': return { filter: `blur(${Math.max(1,radius/3)*Math.max(.5,p)}px)` };
    case 'motion-blur': return { filter: `blur(${Math.max(1,radius/6)*Math.max(.5,p)}px)` };
    default: return {};
  }
}

function activeDesignId(activeAnimation?: string, state?: any): DesignAnimationId {
  const a = String(activeAnimation || '').toUpperCase();
  if (a === 'TEAM_CALL') return 'team-call';
  if (a === 'SINGLE_PLAYER_CALL' || a === 'PLAYER_CALL') return 'player-call';
  if (a === 'PLAYER_CHANGE') return 'player-change';
  if (a === 'PLAYER_CHANGE') return 'player-change';
  if (a === 'KO') return 'ko';
  if (a === 'DOCTOR') return 'doctor';
  if (a === 'KYESHI') return 'kyeshi';
  if (a === 'WOO_SE_GIROK' || a === 'WOO-SE-GIROK') return 'woose-girok';
  if (a === 'MATCH_RESULT') return 'match-result';
  if (a === 'MATCHUP') return 'matchup';
  if (a === 'IVR' || a === 'VIDEO_REPLAY' || a === 'VIDEO_REPLAY_DECISION') return 'video-replay';
  if (a === 'GOLDEN_POINT') return 'golden-point';
  if (a === 'ROUND_CALL' || a === 'ROUND_CALL_PREVIEW') return 'round-call';
  if (a === 'PTG' || a === 'POINT_GAP') return 'point-gap';
  if (a === 'STANDINGS' || a === 'RANKINGS') return 'standings';
  if (a === 'HIT_STATS') return 'hit-stats';
  if (a === 'PLAYER_TEST' || a === 'EQUIPMENT_TEST') return 'player-test';
  if (state?.status === 'finished' && state?.showTeamResultCard) return 'team-match-mvp';
  if (state?.status === 'finished' && state?.result) return 'winner';
  return 'team-call';
}

function remember(node: HTMLElement) {
  if (snapshots.has(node)) return;
  snapshots.set(node, {
    transform: node.style.transform,
    translate: node.style.translate,
    rotate: node.style.rotate,
    scale: node.style.scale,
    display: node.style.display,
    visibility: node.style.visibility,
    opacity: node.style.opacity,
    color: node.style.color,
    fontFamily: node.style.fontFamily,
    fontSize: node.style.fontSize,
    fontWeight: node.style.fontWeight,
    textAlign: node.style.textAlign,
    borderColor: node.style.borderColor,
    borderWidth: node.style.borderWidth,
    borderRadius: node.style.borderRadius,
    background: node.style.background,
    backgroundImage: node.style.backgroundImage,
    borderStyle: node.style.borderStyle,
    filter: node.style.filter,
    boxShadow: node.style.boxShadow,
    letterSpacing: node.style.letterSpacing,
    lineHeight: node.style.lineHeight,
    webkitTextStroke: (node.style as any).webkitTextStroke || '',
    clipPath: node.style.clipPath,
    mixBlendMode: node.style.mixBlendMode,
    direction: node.style.direction,
    maskImage: node.style.maskImage,
    webkitMaskImage: (node.style as any).webkitMaskImage || '',
    maskSize: node.style.maskSize,
    webkitMaskSize: (node.style as any).webkitMaskSize || '',
    imageSrc: node instanceof HTMLImageElement ? node.src : (node.querySelector('img')?.src || ''),
    textContent: node.children.length === 0 ? node.textContent : null,
  });
}

function restoreTouched() {
  touched.forEach(node => {
    const original = snapshots.get(node);
    if (!original) return;
    node.style.transform = original.transform;
    node.style.translate = original.translate;
    node.style.rotate = original.rotate;
    node.style.scale = original.scale;
    node.style.display = original.display;
    node.style.visibility = original.visibility;
    node.style.opacity = original.opacity;
    node.style.color = original.color;
    node.style.fontFamily = original.fontFamily;
    node.style.fontSize = original.fontSize;
    node.style.fontWeight = original.fontWeight;
    node.style.textAlign = original.textAlign as any;
    node.style.borderColor = original.borderColor;
    node.style.borderWidth = original.borderWidth;
    node.style.borderRadius = original.borderRadius;
    node.style.background = original.background;
    node.style.backgroundImage = original.backgroundImage;
    node.style.borderStyle = original.borderStyle;
    node.style.filter = original.filter;
    node.style.boxShadow = original.boxShadow;
    node.style.letterSpacing = original.letterSpacing;
    node.style.lineHeight = original.lineHeight;
    (node.style as any).webkitTextStroke = original.webkitTextStroke;
    node.style.clipPath = original.clipPath;
    node.style.mixBlendMode = original.mixBlendMode;
    node.style.direction = original.direction;
    node.style.maskImage = original.maskImage;
    (node.style as any).webkitMaskImage = original.webkitMaskImage;
    node.style.maskSize = original.maskSize;
    (node.style as any).webkitMaskSize = original.webkitMaskSize;
    if (original.imageSrc) { const img = node instanceof HTMLImageElement ? node : node.querySelector('img'); if (img) img.src = original.imageSrc; }
    if (original.textContent !== null) node.textContent = original.textContent;
    snapshots.delete(node);
  });
  touched.clear();
}


function transitionEase(t: number, easing: any = 'ease-in-out') {
  const x = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear': return x;
    case 'ease-in': return x * x;
    case 'ease-out': return 1 - (1 - x) * (1 - x);
    case 'smooth': return x * x * (3 - 2 * x);
    case 'back-out': { const c = 1.70158; const q = x - 1; return 1 + (c + 1) * q * q * q + c * q * q; }
    case 'bounce': { const n=7.5625,d=2.75; let q=x; if(q<1/d)return n*q*q; if(q<2/d){q-=1.5/d;return n*q*q+.75;} if(q<2.5/d){q-=2.25/d;return n*q*q+.9375;} q-=2.625/d;return n*q*q+.984375; }
    default: return x < .5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2;
  }
}

function transitionStyle(kind: string, progress: number, intensity = 1, easing: any = 'ease-in-out', color = '#ffd866'): CSSProperties {
  const p = transitionEase(progress, easing);
  const i = Math.max(0, Math.min(1, intensity));
  switch (kind) {
    case 'fade': case 'crossfade': return { opacity: 1 - p * i };
    case 'wipe-left': return { clipPath: `inset(0 ${p * 100}% 0 0)` };
    case 'wipe-right': return { clipPath: `inset(0 0 0 ${p * 100}%)` };
    case 'wipe-up': return { clipPath: `inset(0 0 ${p * 100}% 0)` };
    case 'wipe-down': return { clipPath: `inset(${p * 100}% 0 0 0)` };
    case 'zoom-in': return { scale: `${1 + p * .12 * i}` };
    case 'zoom-out': return { scale: `${1.12 - p * .12 * i}` };
    case 'slide-left': return { translate: `${-p * 100 * i}% 0` };
    case 'slide-right': return { translate: `${p * 100 * i}% 0` };
    case 'slide-up': return { translate: `0 ${-p * 100 * i}%` };
    case 'slide-down': return { translate: `0 ${p * 100 * i}%` };
    case 'flash': return { opacity: 1 - Math.sin(p * Math.PI) * .85 * i, filter: `brightness(${1 + Math.sin(p * Math.PI) * 3 * i})` };
    case 'glitch': return { filter: `contrast(${1 + i}) saturate(${1 + i * 1.5})`, translate: `${Math.sin(p*80)*3*i}px ${Math.cos(p*63)*2*i}px` };
    case 'light-sweep': return { backgroundImage: `linear-gradient(110deg, transparent ${Math.max(0,p*100-12)}%, ${color}99 ${p*100}%, transparent ${Math.min(100,p*100+12)}%)` };
    default: return {};
  }
}

function applyAnimationTransitions(design: BroadcastDesign, runtimeTime: number) {
  const playback = design.playback;
  if (!playback) return;
  const roots = animationDocuments().flatMap(({ doc }) => { try { return Array.from(doc.querySelectorAll<HTMLElement>(`[data-wab-layer-root="${CSS.escape(design.animationId)}"]`)); } catch { return []; } });
  if (!roots.length) return;
  const inD = Math.max(0, playback.transitionIn?.duration || 0);
  const outD = Math.max(0, playback.transitionOut?.duration || 0);
  const outStart = Math.max(0, (playback.outPoint ?? design.duration) - outD);
  const activeIn = inD > 0 && runtimeTime < inD;
  const activeOut = outD > 0 && runtimeTime >= outStart;
  for (const node of roots) {
    remember(node); touched.add(node);
    const styles: CSSProperties[] = [];
    if (activeIn && playback.transitionIn?.kind && playback.transitionIn.kind !== 'none') {
      styles.push(transitionStyle(playback.transitionIn.kind, 1 - runtimeTime / inD, playback.transitionIn.intensity, playback.transitionIn.easing, playback.transitionIn.color));
    }
    if (activeOut && playback.transitionOut?.kind && playback.transitionOut.kind !== 'none') {
      styles.push(transitionStyle(playback.transitionOut.kind, (runtimeTime - outStart) / outD, playback.transitionOut.intensity, playback.transitionOut.easing, playback.transitionOut.color));
    }
    const merged = styles.reduce((acc, value) => ({ ...acc, ...value }), {} as CSSProperties);
    if (merged.opacity !== undefined) node.style.opacity = String(Number(node.style.opacity || 1) * Number(merged.opacity));
    if (merged.filter) node.style.filter = merged.filter;
    if (merged.clipPath) node.style.clipPath = merged.clipPath;
    if (merged.backgroundImage) node.style.backgroundImage = merged.backgroundImage;
    if ((merged as any).translate) node.style.translate = String((merged as any).translate);
    if ((merged as any).scale) node.style.scale = String((merged as any).scale);
  }
}

function frameClipPath(layer: DesignLayer): string | undefined {
  if (layer.clipPath) return layer.clipPath;
  if (layer.frameStyle === 'circle') return 'circle(50% at 50% 50%)';
  if (layer.frameStyle === 'hex') return 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)';
  if (layer.frameStyle === 'diamond') return 'polygon(50% 0,100% 50%,50% 100%,0 50%)';
  if (layer.frameStyle === 'cut-corner') return 'polygon(0 18px,18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px))';
  return undefined;
}

function resolveBoundLayer(layer: DesignLayer, state: any): DesignLayer {
  return resolveDesignBinding(layer, state);
}


function applyLayer(layer: DesignLayer, runtimeTime: number, allLayers: DesignLayer[], state?: any) {
  const evaluated = resolveBoundLayer(evaluateLayerAtTime(layer, runtimeTime), state);
  const selector = `[data-wab-layer-id="${CSS.escape(evaluated.id)}"]`;
  const nodes = layerNodes(evaluated.id);
  for (const node of nodes) {
    remember(node);
    void ensureDesignFont(evaluated);
    touched.add(node);
    if (!evaluated.visible) {
      node.style.display = 'none';
      node.style.visibility = 'hidden';
      continue;
    }
    node.style.display = '';
    node.style.visibility = '';
    touched.add(node);
    touched.add(node);
    const dynamic = dynamicBases.get(evaluated.id);
    const base = dynamic || BASE[evaluated.id] || { x: 0, y: 0, width: evaluated.width || 1, height: evaluated.height || 1 };
    const viewportScaleX = dynamic ? window.innerWidth / 1920 : 1;
    const viewportScaleY = dynamic ? window.innerHeight / 1080 : 1;
    const dx = (evaluated.x - base.x) * viewportScaleX;
    const dy = (evaluated.y - base.y) * viewportScaleY;
    const sx = (evaluated.width || base.width) / (base.width || 1) * evaluated.scale;
    const sy = (evaluated.height || base.height) / (base.height || 1) * evaluated.scale;
    // Use individual transform properties so the design edit is additive to
    // the animation's own CSS `transform` keyframes instead of replacing them.
    // This is critical: Design Studio edits the existing animation rather than
    // flattening/replacing its original motion.
    node.style.translate = `${dx}px ${dy}px`;
    node.style.rotate = `${evaluated.rotation}deg`;
    node.style.scale = `${sx} ${sy}`;
    node.style.opacity = String(evaluated.opacity);
    if (evaluated.color) node.style.color = evaluated.color;
    if (evaluated.fontFamily) node.style.fontFamily = evaluated.fontFamily;
    if (evaluated.fontSize) {
      const textLength = (evaluated.text || node.textContent || '').trim().length;
      const autoSize = evaluated.autoFit && evaluated.type === 'text' ? Math.max(8, Math.min(evaluated.fontSize, (evaluated.width || 200) / Math.max(1, textLength * .58))) : evaluated.fontSize;
      node.style.fontSize = `${autoSize}px`;
    }
    if (evaluated.fontWeight) node.style.fontWeight = String(evaluated.fontWeight);
    if (evaluated.textAlign) node.style.textAlign = evaluated.textAlign;
    if (evaluated.borderColor) node.style.borderColor = evaluated.borderColor;
    if (evaluated.borderWidth != null) node.style.borderWidth = `${evaluated.borderWidth}px`;
    if (evaluated.borderRadius != null) node.style.borderRadius = `${evaluated.borderRadius}px`;
    if (evaluated.background !== undefined) node.style.background = evaluated.gradient || evaluated.background || '';
    if (evaluated.gradient) node.style.backgroundImage = evaluated.gradient;
    if (evaluated.borderStyle) node.style.borderStyle = evaluated.borderStyle;
    if (evaluated.filter) node.style.filter = evaluated.filter;
    if (evaluated.clipPath) node.style.clipPath = evaluated.clipPath;
    if (evaluated.maskId) {
      const mask = allLayers.find(l => l.id === evaluated.maskId);
      const maskPath = mask ? frameClipPath(mask) : undefined;
      if (maskPath) {
        node.style.clipPath = maskPath;
        if (evaluated.maskMode === 'alpha') {
          node.style.maskImage = 'linear-gradient(#000 0 0)';
          (node.style as any).WebkitMaskImage = 'linear-gradient(#000 0 0)';
          node.style.maskSize = '100% 100%';
          (node.style as any).WebkitMaskSize = '100% 100%';
        }
        if ((evaluated.maskFeather ?? 0) > 0) {
          // CSS clip-path has no native feather control. A small compositor
          // blur keeps the edge soft while preserving the original artwork;
          // it is intentionally proportional so large broadcast masks stay
          // crisp and small masks receive a subtle feather.
          const featherPx = Math.min(18, Math.max(0, Number(evaluated.maskFeather) / 4));
          const existingFilter = node.style.filter && node.style.filter !== 'none' ? node.style.filter + ' ' : '';
          node.style.filter = `${existingFilter}blur(${featherPx}px)`;
        }
      }
    }
    if (evaluated.blendMode) node.style.mixBlendMode = evaluated.blendMode as any;
    if (evaluated.direction && evaluated.direction !== 'auto') node.style.direction = evaluated.direction;
    if (evaluated.imageSrc) {
      const img = node instanceof HTMLImageElement ? node : node.querySelector('img');
      if (img && img.src !== evaluated.imageSrc) img.src = evaluated.imageSrc;
    }
    if (evaluated.videoSrc) {
      const video = node instanceof HTMLVideoElement ? node : node.querySelector('video');
      if (video && video.src !== evaluated.videoSrc) {
        const wasPlaying = !video.paused;
        const at = video.currentTime;
        video.src = evaluated.videoSrc;
        video.load();
        try { video.currentTime = at; } catch {}
        if (wasPlaying) void video.play().catch(() => {});
      }
    }
    if (evaluated.frameStyle === 'circle') node.style.borderRadius = '50%';
    if (evaluated.frameStyle === 'hex') node.style.clipPath = 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)';
    if (evaluated.frameStyle === 'diamond') node.style.clipPath = 'polygon(50% 0,100% 50%,50% 100%,0 50%)';
    if (evaluated.frameStyle === 'cut-corner') node.style.clipPath = 'polygon(0 18px,18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px))';
    if (evaluated.letterSpacing != null) node.style.letterSpacing = `${evaluated.letterSpacing}px`;
    if (evaluated.lineHeight != null) node.style.lineHeight = String(evaluated.lineHeight);
    if (evaluated.textStrokeWidth) { node.style.webkitTextStroke = `${evaluated.textStrokeWidth}px ${evaluated.textStrokeColor || 'transparent'}`; }
    const ec = evaluated.effectColor || evaluated.borderColor || evaluated.color || '#ffd866';
    const power = (evaluated.effectIntensity ?? .75) * adaptiveQualityFactor;
    const radius = (evaluated.effectRadius ?? 28) * (0.8 + 0.2 * adaptiveQualityFactor);
    const fx = effectStyles(evaluated.effect, ec, power, radius, runtimeTime);
    const compositorHeavy = evaluated.keyframes.length > 0 || evaluated.effect !== 'none' || evaluated.motionPath?.length;
    node.style.willChange = compositorHeavy ? 'transform, opacity, filter' : '';
    if (fx.boxShadow) node.style.boxShadow = String(fx.boxShadow);
    if (fx.filter) node.style.filter = String(fx.filter);
    if (fx.backgroundImage) node.style.backgroundImage = String(fx.backgroundImage);
    if (fx.opacity !== undefined) node.style.opacity = String(Number(fx.opacity) * Number(evaluated.opacity));
    if (evaluated.type === 'text' && evaluated.text != null && node.children.length === 0) node.textContent = evaluated.text;
  }
}

export default function BroadcastDesignRuntime() {
  useEffect(() => startBroadcastRuntimeMetrics(), []);
  useEffect(() => { const onMetrics = (e: Event) => { const m = (e as CustomEvent<any>).detail; adaptiveQualityFactor = m?.fps < 45 ? .55 : m?.fps < 55 ? .78 : 1; }; window.addEventListener('wab-broadcast-runtime-metrics', onMetrics as EventListener); return () => window.removeEventListener('wab-broadcast-runtime-metrics', onMetrics as EventListener); }, []);

  const { state } = useMatch();
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    let current: BroadcastDesign | null = getPublishedDesign(activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current));
    let raf = 0;
    let clock = 0;
    let lastFrame = performance.now();
    let running = false;
    let activeInstanceId: string | undefined;
    let studioPreview: { animationId: DesignAnimationId; design: BroadcastDesign; runtimeTime: number; playing: boolean } | null = null;
    let liveEdit: { animationId: DesignAnimationId; design: BroadcastDesign; runtimeTime: number } | null = null;
    const render = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nowMs = performance.now();
        if (running) clock += Math.max(0, Math.min(0.1, (nowMs - lastFrame) / 1000)) * Math.max(0.05, Number(current?.playback?.speed ?? 1));
        lastFrame = nowMs;
        restoreTouched();
        // Design Studio native preview can drive the exact same live animation
        // DOM with a draft design. This is intentionally local to the Studio
        // preview channel and never changes the published design or match.
        if (studioPreview) {
          const preview = studioPreview;
          const previewTime = Math.max(0, Math.min(preview.design.duration, preview.runtimeTime));
          const evaluated = evaluateDesignLayersAtTime(preview.design, previewTime);
          evaluated.forEach(layer => applyLayer(layer, previewTime, evaluated, stateRef.current));
          applyAnimationTransitions(preview.design, previewTime);
          if (preview.playing) render();
          return;
        }
        if (!current?.livePreview) return;
        const st = stateRef.current;
        const controller = st?.animationController;
        const id = activeDesignId(controller?.activeAnimation, st);
        // A new lifecycle instance resets the runtime clock and any previous
        // animation state. This prevents late frames/timers from an older Team
        // Call/Player Call/Result from reappearing after a confirmed transition.
        if (activeInstanceId && controller?.instanceId && controller.instanceId !== activeInstanceId) {
          restoreTouched();
          clock = 0;
          current = getPublishedDesign(id);
        }
        activeInstanceId = controller?.instanceId;
        if (current.animationId !== id) { current = getPublishedDesign(id); clock = 0; }
        const startedAt = controller?.startedAt;
        const speed = Math.max(0.05, Number(current.playback?.speed ?? 1));
        const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : clock;
        const derived = startedAt ? Math.max(0, Math.min(current.duration, elapsed * speed)) : current.currentTime;
        const runtimeTime = startedAt ? derived : clock > 0 ? Math.min(current.duration, clock) : current.currentTime;
        // Optional LIVE EDIT layer: the designer can safely adjust the currently
        // running match without publishing. The override is merged by stable layer
        // id, so original animation CSS/timing remains intact. Turning LIVE EDIT off
        // immediately restores the published design.
        const effectiveDesign = liveEdit && liveEdit.animationId === id
          ? {
              ...current,
              layers: [
                ...current.layers.map(base => {
                  const override = liveEdit!.design.layers.find(x => x.id === base.id);
                  return override ? { ...base, ...override } : base;
                }),
                // New draft layers are included too when they already target a
                // real DOM node. This makes LIVE EDIT useful for adding a frame,
                // label or effect during a live match without rebuilding the
                // animation or replacing its original motion.
                ...liveEdit!.design.layers.filter(x => !current.layers.some(base => base.id === x.id)),
              ],
              currentTime: liveEdit.runtimeTime,
            }
          : current;
        const evaluatedLayers = evaluateDesignLayersAtTime(effectiveDesign, runtimeTime);
        evaluatedLayers.forEach(layer => applyLayer(layer, runtimeTime, evaluatedLayers, stateRef.current));
        applyAnimationTransitions(effectiveDesign, runtimeTime);
        if (running) render();
      });
    };
    const syncClock = (design: BroadcastDesign) => {
      const previousId = current?.animationId;
      current = design;
      const nextId = activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current);
      if (previousId !== nextId) clock = 0;
      running = !!design.livePreview && !!stateRef.current?.animationController?.startedAt;
      render();
    };
    render();
    // Give saved designs a stable target on every real animation run, even if
    // the operator does not press CAPTURE. This is what makes a saved edit
    // such as a moved decision arm reappear in the same place on the next run.
    const autoCaptureTimer = window.setTimeout(() => {
      const activeId = activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current);
      publishInspectorSnapshot(activeId);
    }, 450);
    const off = subscribeDesign((design) => {
      const activeId = activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current);
      if (design.animationId === activeId && design.status === 'published') syncClock(design);
    });
    const observer = new MutationObserver(render);
    observer.observe(document.body, { subtree: true, childList: true });
    let inspector: BroadcastChannel | null = null;
    let studioChannel: BroadcastChannel | null = null;
    let liveEditChannel: BroadcastChannel | null = null;
    try {
      inspector = new BroadcastChannel(INSPECT_CHANNEL);
      inspector.onmessage = (event) => {
        const msg = event.data;
        const activeId = activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current);
        if (msg?.type === 'capture' && msg.animationId === activeId) publishInspectorSnapshot(activeId);
      };
      studioChannel = new BroadcastChannel('wab-broadcast-design-studio-preview-v1');
      studioChannel.onmessage = (event) => {
        const msg = event.data;
        const activeId = activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current);
        if (msg?.animationId !== activeId) return;
        if (msg?.type === 'studio-preview' && msg.design) {
          studioPreview = { animationId: msg.animationId, design: msg.design as BroadcastDesign, runtimeTime: Number(msg.runtimeTime || 0), playing: !!msg.playing };
          render();
          return;
        }
        if (msg?.type === 'studio-preview-time' && studioPreview) {
          studioPreview.runtimeTime = Number(msg.runtimeTime || 0);
          studioPreview.playing = !!msg.playing;
          render();
        }
      };
      liveEditChannel = new BroadcastChannel(LIVE_EDIT_CHANNEL);
      liveEditChannel.onmessage = (event) => {
        const msg = event.data;
        const activeId = activeDesignId(stateRef.current?.animationController?.activeAnimation, stateRef.current);
        if (msg?.animationId !== activeId) return;
        if (msg?.type === 'live-edit' && msg.design) {
          liveEdit = { animationId: msg.animationId, design: msg.design as BroadcastDesign, runtimeTime: Number(msg.runtimeTime || 0) };
          render();
          return;
        }
        if (msg?.type === 'live-edit-clear') { liveEdit = null; render(); }
      };
    } catch {}
    const interval = window.setInterval(render, 33);
    return () => { off(); observer.disconnect(); inspector?.close(); studioChannel?.close(); liveEditChannel?.close(); studioPreview = null; liveEdit = null; window.clearTimeout(autoCaptureTimer); cancelAnimationFrame(raf); window.clearInterval(interval); restoreTouched(); };
  }, []);
  return null;
}

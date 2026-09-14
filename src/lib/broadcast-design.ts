import type React from 'react';
import { BROADCAST_DESIGN_HEIGHT, BROADCAST_DESIGN_WIDTH } from '@/lib/broadcast-viewport';

export type DesignAnimationId =
  | 'team-call'
  | 'player-call'
  | 'player-change'
  | 'winner'
  | 'ko'
  | 'doctor'
  | 'kyeshi'
  | 'woose-girok'
  | 'match-result'
  | 'matchup'
  | 'video-replay'
  | 'golden-point'
  | 'round-call'
  | 'point-gap'
  | 'standings'
  | 'hit-stats'
  | 'player-test'
  | 'best-player-match'
  | 'team-match-mvp'
  | 'tournament-mvp'
  | 'best-team'
  | 'best-club'
  | 'best-referee'
  | 'fair-play'
  | 'top-scorer'
  | 'top-hitter'
  | 'podium'
  | 'awards'
  | 'custom';

export type LayerType = 'group' | 'frame' | 'text' | 'image' | 'effect' | 'shape' | 'video' | 'data';
export type FrameStyle = 'square' | 'rounded' | 'double' | 'neon' | 'cut-corner' | 'hex' | 'circle' | 'diamond' | 'bracket' | 'tech' | 'gold';
export type EffectKind = 'none' | 'glow' | 'light' | 'particles' | 'shadow' | 'blur' | 'bloom' | 'shine' | 'scanline' | 'energy' | 'spark' | 'smoke' | 'gradient' | 'reflection' | 'motion-blur' | 'bevel' | 'inner-glow' | 'outer-glow';
export type EasingKind = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'smooth' | 'back-in' | 'back-out' | 'bounce' | 'step';
export type BindingKey =
  | 'static' | 'playerName' | 'playerPhoto' | 'playerNumber' | 'playerCountry' | 'playerAge' | 'playerGender'
  | 'teamName' | 'teamLogo' | 'clubName' | 'clubLogo' | 'country' | 'flag'
  | 'matchNumber' | 'score' | 'round' | 'weight' | 'tournament'
  | 'winner' | 'winnerName' | 'winnerPhoto' | 'winnerFlag' | 'winnerTeam' | 'winnerClub'
  | 'bestPlayer' | 'bestPlayerPhoto' | 'bestPlayerTeam' | 'bestPlayerClub' | 'bestPlayerFlag'
  | 'roundScoreRed' | 'roundScoreBlue' | 'roundWinsRed' | 'roundWinsBlue'
  | 'totalScoreRed' | 'totalScoreBlue' | 'warningsRed' | 'warningsBlue' | 'penaltiesRed' | 'penaltiesBlue'
  | 'date' | 'place' | 'age' | 'gender' | 'mat' | 'matchType' | 'timer' | 'matchStatus' | 'refereeName'
  | 'medal' | 'trophy' | 'medalImage' | 'trophyImage'
  | 'bestTeam' | 'bestClub' | 'bestReferee' | 'fairPlay' | 'topScorer' | 'topHitter';

export type BlendMode = 'normal' | 'screen' | 'overlay' | 'multiply' | 'soft-light' | 'hard-light' | 'difference' | 'plus-lighter';
export type TransitionKind = 'none' | 'fade' | 'crossfade' | 'wipe-left' | 'wipe-right' | 'wipe-up' | 'wipe-down' | 'zoom-in' | 'zoom-out' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'flash' | 'glitch' | 'light-sweep';
export interface AnimationTransition { kind: TransitionKind; duration: number; intensity: number; color?: string; easing?: EasingKind; }
export interface AnimationPlayback { duration: number; fps: 24 | 25 | 30 | 50 | 60; speed: number; loop: boolean; reverse?: boolean; inPoint: number; outPoint: number; transitionIn: AnimationTransition; transitionOut: AnimationTransition; autoNextAnimationId?: DesignAnimationId | null; }

export type AnimatableLayerProperty =
  | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'scale' | 'opacity'
  | 'color' | 'background' | 'borderColor' | 'borderWidth' | 'borderRadius'
  | 'fontFamily' | 'fontSize' | 'fontWeight' | 'textAlign' | 'direction'
  | 'text' | 'imageSrc' | 'binding' | 'effect' | 'frameStyle' | 'effectColor' | 'effectIntensity'
  | 'effectRadius' | 'shadowColor' | 'shadowBlur' | 'shadowX' | 'shadowY' | 'borderStyle' | 'gradient' | 'filter' | 'letterSpacing' | 'lineHeight' | 'textStrokeColor' | 'textStrokeWidth' | 'blendMode' | 'maskId' | 'maskFeather' | 'autoFit' | 'clipPath' | 'motionPath' | 'motionPathReverse' | 'motionPathLoop' | 'motionPathRotate';

export type KeyframeProps = Partial<Record<AnimatableLayerProperty, any>>;

export interface Keyframe {
  id: string;
  time: number;
  props?: KeyframeProps;
  easing?: EasingKind;
  // Legacy transform fields are kept for backward compatibility with v1 designs.
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  width?: number;
  height?: number;
}

export interface DesignLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontFamily?: string;
  fontSource?: string;
  fontSize?: number;
  fontWeight?: number | string;
  textAlign?: 'left' | 'center' | 'right';
  direction?: 'ltr' | 'rtl' | 'auto';
  text?: string;
  imageSrc?: string;
  /** Optional source for a real video/media layer. */
  videoSrc?: string;
  binding?: BindingKey;
  effect?: EffectKind;
  frameStyle?: FrameStyle;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
  gradient?: string;
  effectColor?: string;
  effectIntensity?: number;
  effectRadius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  filter?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  blendMode?: BlendMode;
  maskId?: string | null;
  maskFeather?: number;
  autoFit?: boolean;
  clipPath?: string;
  motionPath?: { x: number; y: number; time: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }[];
  motionPathReverse?: boolean;
  motionPathLoop?: boolean;
  motionPathRotate?: boolean;
  keyframes: Keyframe[];
  children?: string[];
  /** Optional semantic relationship used by the Broadcast Design Studio. */
  followParentTransform?: boolean;
  /** If set, this layer follows another layer's motion without becoming a child. */
  attachToId?: string | null;
  /** Marks a visual layer as an imported/original DOM layer. */
  sourceKey?: string;
  /** Optional mask/clipping composition reference. */
  maskMode?: 'none' | 'alpha' | 'clip';
  /** Conditional visual states evaluated against live match/broadcast state. */
  conditionalVisibility?: { when: string; visible: boolean }[];
  /** Named state variants for advanced animations (e.g. READY / PLAYING / WINNER). */
  stateVariants?: Record<string, Partial<DesignLayer>>;
}

export interface DesignHistoryEntry {
  id: string;
  label: string;
  at: string;
}

export interface BroadcastDesignDNA {
  purpose: string;
  trigger: string;
  previousAnimationId?: DesignAnimationId | null;
  nextAnimationId?: DesignAnimationId | null;
  matchTypes?: string[];
  audience: 'public' | 'operator' | 'both';
  controller: 'main-referee' | 'operator' | 'system';
  interruptRules: string[];
  dynamicVariables: string[];
  assets: string[];
  sound?: string;
}

export type RenderQuality = 'low' | 'medium' | 'high' | 'final';

export interface BroadcastDesign {
  id: string;
  animationId: DesignAnimationId;
  name: string;
  version: number;
  status: 'original' | 'draft' | 'published';
  canvas: { width: number; height: number; background: string };
  layers: DesignLayer[];
  selectedLayerId: string | null;
  currentTime: number;
  duration: number;
  frozen: boolean;
  livePreview: boolean;
  language: 'en' | 'ar' | 'fr';
  updatedAt: string;
  history: DesignHistoryEntry[];
  schemaVersion?: number;
  selectedLayerIds?: string[];
  presets?: DesignPreset[];
  /** Last published version number; Draft edits never mutate it. */
  publishedVersion?: number;
  /** Monotonic Studio draft revision; increments on every explicit save without touching Public Display. */
  draftVersion?: number;
  /** Explicit animation metadata used by operators and maintenance tools. */
  dna?: BroadcastDesignDNA;
  /** Preview/render quality; FINAL is intended for public-quality inspection. */
  renderQuality?: RenderQuality;
  /** Optional tournament scope. A design never crosses tournaments implicitly. */
  tournamentId?: string | null;
  /** Optional per-display scope for multi-screen broadcast layouts. */
  displayId?: string | null;
  /** Stable design family/template identity. */
  templateId?: string | null;
  /** Canvas/UI preferences are per design, never global to match state. */
  playback?: AnimationPlayback;
  /** User-created broadcast controls. They never mutate match state; they only request a visual design event. */
  controls?: BroadcastDesignControl[];
  /** Advanced visual-only Studio systems. Never contains match score/timer state. */
  advanced?: { globals?: Record<string, any>; stateMachine?: Record<string, any>; conditions?: any[]; queue?: any[]; macros?: any[]; scenes?: any[]; };
  editor?: {
    grid?: boolean;
    guides?: boolean;
    snap?: boolean;
    zoom?: number;
    background?: string;
  };
}

const STORAGE_KEY = 'wab-tkd-broadcast-designs-v1';
const PUBLISHED_STORAGE_KEY = 'wab-tkd-broadcast-designs-published-v1';
const PUBLISHED_HISTORY_KEY = 'wab-tkd-broadcast-designs-published-history-v1';
const ACTIVE_KEY = 'wab-tkd-broadcast-design-active-v1';
const CHANNEL_EVENT = 'wab-broadcast-design-changed';
const PRESETS_KEY = 'wab-tkd-broadcast-design-presets-v1';
const TEMPLATES_KEY = 'wab-tkd-broadcast-design-templates-v1';
const PROJECT_HISTORY_KEY = 'wab-tkd-broadcast-design-project-history-v1';


export interface BroadcastDesignControl {
  id: string;
  label: string;
  action: 'show' | 'hide' | 'replay' | 'set-time';
  startTime: number;
  endTime?: number;
  enabled: boolean;
  animationId?: DesignAnimationId;
  targetLayerIds?: string[];
  /** Optional condition evaluated against live MatchContext state. */
  condition?: string;
  /** Main Referee quick-control presentation. */
  icon?: string;
  color?: string;
  sortOrder?: number;
  previewOnly?: boolean;
}

export interface DesignPreset { id: string; name: string; sourceAnimationId: DesignAnimationId; layers: DesignLayer[]; createdAt: string; }

export type DesignTemplateScope = 'global' | 'tournament' | 'competition-mode' | 'gender' | 'age' | 'weight' | 'tournament-weight';
export interface DesignTemplate {
  id: string;
  name: string;
  scope: DesignTemplateScope;
  animationId: DesignAnimationId;
  tournamentId?: string | null;
  competitionMode?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  weightCategory?: string | null;
  design: BroadcastDesign;
  createdAt: string;
  updatedAt: string;
}


function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ANIMATABLE_PROPERTIES: AnimatableLayerProperty[] = [
  'x','y','width','height','rotation','scale','opacity',
  'color','background','borderColor','borderWidth','borderRadius',
  'fontFamily','fontSize','fontWeight','textAlign','direction',
  'text','imageSrc','videoSrc','binding','effect','motionPathReverse','motionPathLoop','motionPathRotate','frameStyle','effectColor','effectIntensity','effectRadius','shadowColor','shadowBlur','shadowX','shadowY','borderStyle','gradient','filter','letterSpacing','lineHeight','textStrokeColor','textStrokeWidth','blendMode','maskId','clipPath','motionPath',
];

export function getKeyframeProps(k: Keyframe): KeyframeProps {
  return {
    ...(k.props || {}),
    ...(k.x !== undefined ? { x: k.x } : {}),
    ...(k.y !== undefined ? { y: k.y } : {}),
    ...(k.scale !== undefined ? { scale: k.scale } : {}),
    ...(k.rotation !== undefined ? { rotation: k.rotation } : {}),
    ...(k.opacity !== undefined ? { opacity: k.opacity } : {}),
    ...(k.width !== undefined ? { width: k.width } : {}),
    ...(k.height !== undefined ? { height: k.height } : {}),
  };
}

function isNumber(v: any): v is number { return typeof v === 'number' && Number.isFinite(v); }

function ease(t: number, kind: EasingKind = 'linear'): number {
  if (kind === 'ease-in') return t*t;
  if (kind === 'ease-out') return 1-(1-t)*(1-t);
  if (kind === 'ease-in-out') return t < .5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  if (kind === 'smooth') return t*t*(3-2*t);
  if (kind === 'back-in') { const c=1.70158; return (c+1)*t*t*t-c*t*t; }
  if (kind === 'back-out') { const c=1.70158; const q=t-1; return 1+(c+1)*q*q*q+c*q*q; }
  if (kind === 'bounce') { const n=7.5625,d=2.75; let x=t; if(x<1/d)return n*x*x; if(x<2/d){x-=1.5/d;return n*x*x+.75;} if(x<2.5/d){x-=2.25/d;return n*x*x+.9375;} x-=2.625/d;return n*x*x+.984375; }
  if (kind === 'step') return t < 1 ? 0 : 1;
  return t;
}

function interpolateValue(a: any, b: any, t: number, easing: EasingKind = 'linear'): any {
  const et = ease(t, easing);
  if (isNumber(a) && isNumber(b)) return a + (b - a) * et;
  return et < 1 ? a : b;
}

/** Evaluate a layer at a precise animation time without mutating the saved/base layer. */
export function evaluateLayerAtTime(layerValue: DesignLayer, time: number): DesignLayer {
  if (!layerValue.keyframes?.length) return { ...layerValue };
  const frames = [...layerValue.keyframes].sort((a,b) => a.time - b.time);
  const base: Record<string, any> = { ...layerValue };
  const keys = new Set<string>();
  frames.forEach(f => Object.keys(getKeyframeProps(f)).forEach(k => keys.add(k)));
  keys.forEach(key => {
    const before = [...frames].reverse().find(f => f.time <= time);
    const after = frames.find(f => f.time >= time);
    const bp = before ? getKeyframeProps(before)[key] : undefined;
    const ap = after ? getKeyframeProps(after)[key] : undefined;
    const baseValue = base[key];
    if (!before && !after) return;
    if (!before) { base[key] = ap; return; }
    if (!after || before.time === after.time) { base[key] = bp; return; }
    const t = Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
    base[key] = interpolateValue(bp ?? baseValue, ap, t, before.easing || 'linear');
  });
  // A motion path is an animation property, not a separate animation. When a
  // path exists, evaluate its position at the exact timeline time and layer it
  // on top of the existing x/y animation. This makes mouse-edited paths work
  // in both Studio preview and Public Display/Runtime.
  const path = base.motionPath as DesignLayer['motionPath'];
  if (Array.isArray(path) && path.length >= 2) {
    const pts = [...path].sort((a,b)=>a.time-b.time);
    const first = pts[0]; const last = pts[pts.length - 1];
    const pathStart = first.time;
    const pathEnd = Math.max(pathStart + 0.0001, last.time);
    let pathTime = time;
    if (base.motionPathLoop && time > pathEnd) {
      const span = pathEnd - pathStart;
      pathTime = pathStart + (((time - pathStart) % span) + span) % span;
    }
    if (base.motionPathReverse) pathTime = pathEnd - Math.max(0, Math.min(pathEnd-pathStart, pathTime-pathStart));
    const a = [...pts].reverse().find(pt => pt.time <= pathTime);
    const b = pts.find(pt => pt.time >= pathTime);
    if (a && b) {
      const span = Math.max(0.0001, b.time - a.time);
      const t = Math.max(0, Math.min(1, (pathTime - a.time) / span));
      const et = ease(t, beforeEasingForPath(pts, pathTime));
      const c1x = a.cp2x ?? (a.x + (b.x-a.x)/3); const c1y = a.cp2y ?? (a.y + (b.y-a.y)/3);
      const c2x = b.cp1x ?? (a.x + 2*(b.x-a.x)/3); const c2y = b.cp1y ?? (a.y + 2*(b.y-a.y)/3);
      const mt = 1-et;
      base.x = mt**3*a.x + 3*mt**2*et*c1x + 3*mt*et**2*c2x + et**3*b.x;
      base.y = mt**3*a.y + 3*mt**2*et*c1y + 3*mt*et**2*c2y + et**3*b.y;
      if (base.motionPathRotate) {
        const tx = 3*mt*mt*(c1x-a.x) + 6*mt*et*(c2x-c1x) + 3*et*et*(b.x-c2x);
        const ty = 3*mt*mt*(c1y-a.y) + 6*mt*et*(c2y-c1y) + 3*et*et*(b.y-c2y);
        if (Math.abs(tx)+Math.abs(ty) > 0.001) base.rotation = Math.atan2(ty,tx)*180/Math.PI;
      }
    } else if (a) { base.x=a.x; base.y=a.y; } else if (b) { base.x=b.x; base.y=b.y; }
  }
  return base as DesignLayer;
}

/** Evaluate the whole design so semantic Parent/Attach relationships also work
 * in the renderer. Coordinates remain absolute, therefore attached layers inherit
 * only the parent's evaluated delta from its base pose; this avoids double-applying
 * the transform to legacy animation CSS while still making Attach/Detach useful. */
export function evaluateDesignLayersAtTime(design: BroadcastDesign, time: number): DesignLayer[] {
  const evaluated = new Map<string, DesignLayer>();
  const visiting = new Set<string>();
  const resolve = (id: string): DesignLayer | null => {
    if (evaluated.has(id)) return evaluated.get(id)!;
    const source = design.layers.find(l => l.id === id);
    if (!source) return null;
    if (visiting.has(id)) return evaluateLayerAtTime(source, time);
    visiting.add(id);
    let value = evaluateLayerAtTime(source, time);
    if (source.attachToId && source.followParentTransform && source.attachToId !== source.id) {
      const parent = resolve(source.attachToId);
      if (parent) {
        const baseParent = { x: parent.x, y: parent.y, rotation: parent.rotation, scale: parent.scale };
        const originalParent = design.layers.find(l => l.id === source.attachToId);
        if (originalParent) {
          const dx = baseParent.x - originalParent.x;
          const dy = baseParent.y - originalParent.y;
          value = { ...value, x: value.x + dx, y: value.y + dy, rotation: value.rotation + (baseParent.rotation - originalParent.rotation), scale: value.scale * (baseParent.scale / Math.max(0.0001, originalParent.scale)) };
        }
      }
    }
    visiting.delete(id);
    evaluated.set(id, value);
    return value;
  };
  return design.layers.map(l => resolve(l.id) || evaluateLayerAtTime(l, time));
}

function beforeEasingForPath(points: {x:number;y:number;time:number}[], time:number): EasingKind {
  // Motion-path points currently carry no extra easing field. Smooth is the
  // intentional default for visual paths so the path does not jump between
  // manually placed control points.
  void points; void time; return 'smooth';
}

export function upsertKeyframe(layerValue: DesignLayer, time: number, patch: KeyframeProps, easing: EasingKind = 'smooth'): DesignLayer {
  const safeTime = Math.max(0, Number(time.toFixed(3)));
  const existingIndex = layerValue.keyframes.findIndex(k => Math.abs(k.time - safeTime) < 0.001);
  const current = existingIndex >= 0 ? layerValue.keyframes[existingIndex] : { id: id('kf'), time: safeTime, props: {} };
  const merged: Keyframe = {
    ...current,
    time: safeTime,
    props: { ...getKeyframeProps(current), ...patch },
    easing: current.easing || easing,
  };
  // Keep legacy transform fields in sync so old consumers continue to work.
  for (const key of ['x','y','scale','rotation','opacity','width','height'] as const) {
    if (patch[key] !== undefined) (merged as any)[key] = patch[key];
  }
  const next = [...layerValue.keyframes];
  if (existingIndex >= 0) next[existingIndex] = merged; else next.push(merged);
  next.sort((a,b) => a.time - b.time);
  return { ...layerValue, keyframes: next };
}

export function removeKeyframeAt(layerValue: DesignLayer, time: number): DesignLayer {
  return { ...layerValue, keyframes: layerValue.keyframes.filter(k => Math.abs(k.time - time) >= 0.001) };
}

export function isAnimatableProperty(key: string): key is AnimatableLayerProperty {
  return ANIMATABLE_PROPERTIES.includes(key as AnimatableLayerProperty);
}



export const DESIGN_ANIMATIONS: { id: DesignAnimationId; label: string }[] = [
  { id: 'team-call', label: 'TEAM CALL' },
  { id: 'player-call', label: 'PLAYER CALL' },
  { id: 'player-change', label: 'PLAYER CHANGE' },
  { id: 'winner', label: 'WINNER' },
  { id: 'ko', label: 'KO' },
  { id: 'doctor', label: 'DOCTOR' },
  { id: 'kyeshi', label: 'KYESHI' },
  { id: 'woose-girok', label: 'WOO-SE-GIROK' },
  { id: 'match-result', label: 'MATCH RESULT' },
  { id: 'matchup', label: 'MATCHUP / VS' },
  { id: 'video-replay', label: 'VIDEO REPLAY / IVR' },
  { id: 'golden-point', label: 'GOLDEN POINT' },
  { id: 'round-call', label: 'NEXT ROUND CALL' },
  { id: 'point-gap', label: 'POINT GAP / PTG' },
  { id: 'standings', label: 'STANDINGS / RANKING' },
  { id: 'hit-stats', label: 'HIT STATISTICS' },
  { id: 'player-test', label: 'PLAYER / EQUIPMENT TEST' },
  { id: 'best-player-match', label: 'BEST PLAYER · MATCH' },
  { id: 'team-match-mvp', label: 'BEST PLAYER · PAR ÉQUIPE' },
  { id: 'tournament-mvp', label: 'TOURNAMENT MVP' },
  { id: 'best-team', label: 'BEST TEAM' },
  { id: 'best-club', label: 'BEST CLUB' },
  { id: 'best-referee', label: 'BEST REFEREE' },
  { id: 'fair-play', label: 'FAIR PLAY' },
  { id: 'top-scorer', label: 'TOP SCORER' },
  { id: 'top-hitter', label: 'TOP HITTER' },
  { id: 'podium', label: 'PODIUM / CHAMPION' },
  { id: 'awards', label: 'AWARDS / CEREMONY' },
  { id: 'custom', label: 'CUSTOM' },
];

function baseLayers(animationId: DesignAnimationId): DesignLayer[] {
  const common = [
    layer('background', 'Background', 'shape', { x: 0, y: 0, width: 1920, height: 1080, zIndex: 0, background: '#01040a' }),
    layer('title', 'Title', 'text', { x: 720, y: 70, width: 480, height: 100, zIndex: 20, text: animationId.toUpperCase(), fontSize: 64, fontWeight: 900, color: '#ffffff', textAlign: 'center' }),
  ];
  if (animationId === 'team-call') {
    return [
      ...common,
      layer('red-team-group', 'RED TEAM GROUP', 'group', { x: 50, y: 190, width: 610, height: 760, zIndex: 10, borderColor: '#ef3340', borderWidth: 3, borderRadius: 28 }),
      layer('red-team-frame', 'Red Big Frame', 'frame', { parentId: 'red-team-group', x: 20, y: 30, width: 570, height: 700, zIndex: 11, borderColor: '#ef3340', borderWidth: 4, borderRadius: 24 }),
      layer('red-logo', 'Team Logo', 'image', { parentId: 'red-team-group', x: 220, y: 70, width: 170, height: 170, zIndex: 12, binding: 'teamLogo' }),
      layer('red-name', 'Team Name', 'text', { parentId: 'red-team-group', x: 70, y: 270, width: 470, height: 90, zIndex: 13, text: 'RED TEAM', binding: 'teamName', fontSize: 54, fontWeight: 900, color: '#ffffff', textAlign: 'center' }),
      layer('red-club', 'Club', 'text', { parentId: 'red-team-group', x: 80, y: 370, width: 450, height: 50, zIndex: 13, text: 'CLUB', binding: 'clubName', fontSize: 26, fontWeight: 800, color: '#ef3340', textAlign: 'center' }),
      layer('red-flag', 'Flag', 'image', { parentId: 'red-team-group', x: 250, y: 440, width: 110, height: 70, zIndex: 13, binding: 'flag' }),
      layer('red-glow', 'Light / Glow', 'effect', { parentId: 'red-team-group', x: 0, y: 0, width: 610, height: 760, zIndex: 14, effect: 'glow', opacity: .65 }),
      layer('blue-team-group', 'BLUE TEAM GROUP', 'group', { x: 1260, y: 190, width: 610, height: 760, zIndex: 10, borderColor: '#2d7df6', borderWidth: 3, borderRadius: 28 }),
      layer('blue-team-frame', 'Blue Big Frame', 'frame', { parentId: 'blue-team-group', x: 20, y: 30, width: 570, height: 700, zIndex: 11, borderColor: '#2d7df6', borderWidth: 4, borderRadius: 24 }),
      layer('blue-logo', 'Team Logo', 'image', { parentId: 'blue-team-group', x: 220, y: 70, width: 170, height: 170, zIndex: 12, binding: 'teamLogo' }),
      layer('blue-name', 'Team Name', 'text', { parentId: 'blue-team-group', x: 70, y: 270, width: 470, height: 90, zIndex: 13, text: 'BLUE TEAM', binding: 'teamName', fontSize: 54, fontWeight: 900, color: '#ffffff', textAlign: 'center' }),
      layer('blue-club', 'Club', 'text', { parentId: 'blue-team-group', x: 80, y: 370, width: 450, height: 50, zIndex: 13, text: 'CLUB', binding: 'clubName', fontSize: 26, fontWeight: 800, color: '#2d7df6', textAlign: 'center' }),
      layer('blue-flag', 'Flag', 'image', { parentId: 'blue-team-group', x: 250, y: 440, width: 110, height: 70, zIndex: 13, binding: 'flag' }),
      layer('blue-glow', 'Light / Glow', 'effect', { parentId: 'blue-team-group', x: 0, y: 0, width: 610, height: 760, zIndex: 14, effect: 'glow', opacity: .65 }),
      layer('center', 'CENTER / MATCH', 'group', { x: 690, y: 190, width: 540, height: 760, zIndex: 15, borderColor: '#ffd866', borderWidth: 3, borderRadius: 28 }),
      layer('match-number', 'Match Number', 'text', { parentId: 'center', x: 60, y: 70, width: 420, height: 100, zIndex: 16, text: 'MATCH #—', binding: 'matchNumber', fontSize: 58, fontWeight: 900, color: '#ffd866', textAlign: 'center' }),
      layer('trophy', 'Trophy / Main Image', 'image', { parentId: 'center', x: 110, y: 220, width: 320, height: 360, zIndex: 16, binding: 'static' }),
      layer('center-glow', 'Center Glow', 'effect', { parentId: 'center', x: 0, y: 0, width: 540, height: 760, zIndex: 17, effect: 'light', opacity: .6 }),
    ];
  }
  if (animationId === 'doctor') {
    const a = '#ef3340';
    return [...common,
      layer('doctor-root','Doctor Animation','group',{x:0,y:0,width:1920,height:1080,zIndex:10}),
      layer('doctor-bg','Doctor Background','shape',{parentId:'doctor-root',x:0,y:0,width:1920,height:1080,zIndex:11,background:'#05070d'}),
      layer('doctor-grid','Doctor Grid','effect',{parentId:'doctor-root',x:0,y:0,width:1920,height:1080,zIndex:12,effect:'scanline',effectColor:a}),
      layer('doctor-entry-flash','Entry Flash','effect',{parentId:'doctor-root',x:0,y:0,width:1920,height:1080,zIndex:13,effect:'light',effectColor:a}),
      layer('doctor-red-aura','Red Aura','effect',{parentId:'doctor-root',x:0,y:0,width:1920,height:1080,zIndex:14,effect:'energy',effectColor:a}),
      layer('doctor-gold-aura','Gold Aura','effect',{parentId:'doctor-root',x:0,y:0,width:1920,height:1080,zIndex:15,effect:'bloom',effectColor:'#ffd866'}),
      layer('doctor-content','Doctor Content','group',{parentId:'doctor-root',x:300,y:120,width:1320,height:840,zIndex:20}),
      layer('doctor-kicker','Medical Kicker','text',{parentId:'doctor-content',x:360,y:0,width:600,height:60,zIndex:21,text:'MEDICAL ATTENTION',fontSize:28,fontWeight:900,color:'#ffffff'}),
      layer('doctor-art','Doctor Artwork Group','group',{parentId:'doctor-content',x:360,y:100,width:600,height:500,zIndex:22}),
      layer('doctor-art-image','Doctor Artwork','image',{parentId:'doctor-art',x:0,y:0,width:600,height:500,zIndex:23}),
      layer('doctor-title','Doctor Title Group','group',{parentId:'doctor-content',x:260,y:620,width:800,height:130,zIndex:24}),
      layer('doctor-title-text','Doctor Call','text',{parentId:'doctor-title',x:0,y:0,width:800,height:70,zIndex:25,text:'DOCTOR CALL',fontSize:64,fontWeight:900,color:'#ffffff'}),
      layer('doctor-subtitle','Doctor Subtitle','text',{parentId:'doctor-title',x:0,y:75,width:800,height:45,zIndex:26,text:'PLEASE STAND BY',fontSize:24,fontWeight:800,color:'#ffffff'}),
      layer('doctor-footer','Doctor Footer','text',{parentId:'doctor-root',x:520,y:980,width:880,height:50,zIndex:30,text:'WAB-TKD · MEDICAL REVIEW · OFFICIAL MATCH HOLD',fontSize:18,fontWeight:800,color:'#ffffff'}),
    ];
  }
  if (animationId === 'kyeshi') {
    const a = '#ffd866';
    return [...common,
      layer('kyeshi-root','Kyeshi Animation','group',{x:0,y:0,width:1920,height:1080,zIndex:10}),
      layer('kyeshi-bg','Kyeshi Background','shape',{parentId:'kyeshi-root',x:0,y:0,width:1920,height:1080,zIndex:11,background:'#05070d'}),
      layer('kyeshi-grid','Kyeshi Grid','effect',{parentId:'kyeshi-root',x:0,y:0,width:1920,height:1080,zIndex:12,effect:'scanline',effectColor:a}),
      layer('kyeshi-gold-aura','Gold Aura','effect',{parentId:'kyeshi-root',x:0,y:0,width:1920,height:1080,zIndex:13,effect:'bloom',effectColor:a}),
      layer('kyeshi-white-aura','White Aura','effect',{parentId:'kyeshi-root',x:0,y:0,width:1920,height:1080,zIndex:14,effect:'light',effectColor:'#ffffff'}),
      layer('kyeshi-blue-aura','Blue Aura','effect',{parentId:'kyeshi-root',x:0,y:0,width:1920,height:1080,zIndex:15,effect:'energy',effectColor:'#2d7df6'}),
      layer('kyeshi-content','Kyeshi Content','group',{parentId:'kyeshi-root',x:300,y:120,width:1320,height:840,zIndex:20}),
      layer('kyeshi-kicker','Injury Time Kicker','text',{parentId:'kyeshi-content',x:360,y:0,width:600,height:60,zIndex:21,text:'INJURY TIME',fontSize:28,fontWeight:900,color:'#ffffff'}),
      layer('kyeshi-art','Kyeshi Artwork Group','group',{parentId:'kyeshi-content',x:360,y:100,width:600,height:500,zIndex:22}),
      layer('kyeshi-art-image','Kyeshi Artwork','image',{parentId:'kyeshi-art',x:0,y:0,width:600,height:500,zIndex:23}),
      layer('kyeshi-title','Kyeshi Title Group','group',{parentId:'kyeshi-content',x:260,y:620,width:800,height:130,zIndex:24}),
      layer('kyeshi-title-text','Kyeshi Title','text',{parentId:'kyeshi-title',x:0,y:0,width:800,height:70,zIndex:25,text:'KYESHI',fontSize:64,fontWeight:900,color:'#ffffff'}),
      layer('kyeshi-subtitle','Kyeshi Subtitle','text',{parentId:'kyeshi-title',x:0,y:75,width:800,height:45,zIndex:26,text:'INJURY TIME • OFFICIAL HOLD',fontSize:24,fontWeight:800,color:'#ffffff'}),
      layer('kyeshi-timer','Timer Group','group',{parentId:'kyeshi-content',x:620,y:760,width:400,height:100,zIndex:27}),
      layer('kyeshi-timer-value','Time Remaining','text',{parentId:'kyeshi-timer',x:0,y:30,width:400,height:70,zIndex:28,text:'00:00',fontSize:56,fontWeight:900,color:'#ffd866',binding:'static'}),
      layer('kyeshi-footer','Kyeshi Footer','text',{parentId:'kyeshi-root',x:480,y:980,width:960,height:50,zIndex:30,text:'WAB-TKD · REFEREE HOLD · RETURN WHEN CLEARED',fontSize:18,fontWeight:800,color:'#ffffff'}),
    ];
  }
  if (['best-player-match','team-match-mvp','tournament-mvp','best-team','best-club','best-referee','fair-play','top-scorer','top-hitter','podium'].includes(animationId)) {
    return [...common,
      layer('award-root','AWARD ANIMATION','group',{x:0,y:0,width:1920,height:1080,zIndex:10}),
      layer('award-template','Award Original Template','image',{parentId:'award-root',x:0,y:0,width:1920,height:1080,zIndex:11}),
      layer('award-vignette','Award Vignette','effect',{parentId:'award-root',x:0,y:0,width:1920,height:1080,zIndex:12,effect:'gradient',effectColor:'#000000',effectIntensity:.35}),
      layer('award-photo','Winner Photo','image',{parentId:'award-root',x:672,y:216,width:576,height:454,zIndex:20,binding:'playerPhoto',borderColor:'#ffd866',borderWidth:3,borderRadius:20}),
      layer('award-name','Winner Name','text',{parentId:'award-root',x:460,y:756,width:1000,height:130,zIndex:25,text:'WINNER',binding:'winner',fontSize:72,fontWeight:900,color:'#ffffff',textAlign:'center'}),
      layer('award-subtitle','Winner Subtitle / Club / Team','text',{parentId:'award-root',x:520,y:895,width:880,height:60,zIndex:26,text:'CLUB • TEAM • TOURNAMENT',fontSize:24,fontWeight:800,color:'#ffffff',textAlign:'center'}),
      layer('award-stats','Award Statistics','group',{parentId:'award-root',x:1380,y:730,width:430,height:220,zIndex:27}),
      layer('award-particles','Award Particles','effect',{parentId:'award-root',x:0,y:0,width:1920,height:1080,zIndex:30,effect:'particles',effectColor:'#ffd866',effectIntensity:.75}),
    ];
  }
  if (animationId === 'player-call') {
    const a = '#ffd866';
    return [...common,
      layer('player-call-root','PLAYER CALL COMPOSITION','group',{x:0,y:0,width:1920,height:1080,zIndex:10}),
      layer('player-call-background','Broadcast Background','shape',{parentId:'player-call-root',x:0,y:0,width:1920,height:1080,zIndex:11}),
      layer('player-call-header','Championship Header','group',{parentId:'player-call-root',x:0,y:0,width:1920,height:126,zIndex:20}),
      layer('player-call-stage','Player Call Stage','group',{parentId:'player-call-root',x:40,y:126,width:1840,height:898,zIndex:25}),
      layer('red-player-card','RED PLAYER CARD','group',{parentId:'player-call-stage',x:40,y:0,width:560,height:898,zIndex:26,borderColor:'#ef3340',borderWidth:3}),
      layer('blue-player-card','BLUE PLAYER CARD','group',{parentId:'player-call-stage',x:1320,y:0,width:560,height:898,zIndex:26,borderColor:'#2d7df6',borderWidth:3}),
      layer('red-player-top','RED PLAYER TOP','group',{parentId:'red-player-card',x:0,y:0,width:560,height:360,zIndex:27}),
      layer('blue-player-top','BLUE PLAYER TOP','group',{parentId:'blue-player-card',x:0,y:0,width:560,height:360,zIndex:27}),
      layer('red-player-name','RED PLAYER NAME','text',{parentId:'red-player-card',x:40,y:360,width:480,height:80,zIndex:30,text:'PLAYER NAME',fontSize:42,fontWeight:900,color:'#ef3340',binding:'playerName'}),
      layer('blue-player-name','BLUE PLAYER NAME','text',{parentId:'blue-player-card',x:40,y:360,width:480,height:80,zIndex:30,text:'PLAYER NAME',fontSize:42,fontWeight:900,color:'#2d7df6',binding:'playerName'}),
      layer('red-player-info','RED PLAYER INFO','group',{parentId:'red-player-card',x:20,y:450,width:520,height:420,zIndex:31}),
      layer('blue-player-info','BLUE PLAYER INFO','group',{parentId:'blue-player-card',x:20,y:450,width:520,height:420,zIndex:31}),
      layer('player-call-timeline','Animation Timeline','group',{parentId:'player-call-root',x:0,y:1024,width:1920,height:56,zIndex:40}),
      layer('player-call-status','Status Bar','group',{parentId:'player-call-root',x:0,y:140,width:1920,height:120,zIndex:41}),
    ];
  }
  const accent = animationId === 'ko' ? '#ef3340' : animationId === 'player-change' ? '#2d7df6' : '#ffd866';
  const prefix = animationId.replace(/[^a-z0-9]/gi, '-');
  return [
    ...common,
    layer(`${prefix}-main-group`, `${animationId.toUpperCase()} MAIN GROUP`, 'group', { x: 220, y: 150, width: 1480, height: 800, zIndex: 10, borderColor: accent, borderWidth: 3, borderRadius: 32, frameStyle: 'tech' }),
    layer(`${prefix}-main-frame`, 'Main Frame', 'frame', { parentId: `${prefix}-main-group`, x: 20, y: 20, width: 1440, height: 760, zIndex: 11, borderColor: accent, borderWidth: 5, borderRadius: 28, frameStyle: animationId === 'winner' ? 'gold' : 'neon', effect: 'glow', effectColor: accent, effectIntensity: .8 }),
    layer(`${prefix}-inner-frame`, 'Inner Frame', 'frame', { parentId: `${prefix}-main-group`, x: 45, y: 45, width: 1390, height: 710, zIndex: 12, borderColor: '#ffffff', borderWidth: 1, borderRadius: 22, frameStyle: 'double', opacity: .65 }),
    layer(`${prefix}-photo-group`, 'PHOTO GROUP', 'group', { parentId: `${prefix}-main-group`, x: 80, y: 100, width: 500, height: 600, zIndex: 15 }),
    layer(`${prefix}-photo`, 'Player / Main Photo', 'image', { parentId: `${prefix}-photo-group`, x: 0, y: 0, width: 500, height: 600, zIndex: 16, binding: 'playerPhoto' }),
    layer(`${prefix}-photo-light`, 'Photo Light', 'effect', { parentId: `${prefix}-photo-group`, x: -40, y: -40, width: 580, height: 680, zIndex: 17, effect: 'light', effectColor: accent, effectIntensity: .65, effectRadius: 45 }),
    layer(`${prefix}-photo-glow`, 'Photo Glow', 'effect', { parentId: `${prefix}-photo-group`, x: -30, y: -30, width: 560, height: 660, zIndex: 18, effect: 'bloom', effectColor: accent, effectIntensity: .7, effectRadius: 32 }),
    layer(`${prefix}-info-group`, 'INFO GROUP', 'group', { parentId: `${prefix}-main-group`, x: 650, y: 180, width: 720, height: 500, zIndex: 20 }),
    layer(`${prefix}-name`, 'Player / Winner Name', 'text', { parentId: `${prefix}-info-group`, x: 20, y: 60, width: 680, height: 120, zIndex: 21, text: animationId === 'winner' ? 'WINNER' : 'PLAYER NAME', binding: animationId === 'winner' ? 'winner' : 'playerName', fontSize: 72, fontWeight: 900, color: '#ffffff', textAlign: 'center', textStrokeColor: accent, textStrokeWidth: 1 }),
    layer(`${prefix}-flag`, 'Country Flag', 'image', { parentId: `${prefix}-info-group`, x: 290, y: 210, width: 140, height: 85, zIndex: 22, binding: 'flag' }),
    layer(`${prefix}-meta`, 'Tournament / Weight', 'text', { parentId: `${prefix}-info-group`, x: 30, y: 330, width: 660, height: 70, zIndex: 23, text: '{{TOURNAMENT}} · {{WEIGHT}}', binding: 'tournament', fontSize: 30, fontWeight: 800, color: accent, textAlign: 'center', letterSpacing: 1 }),
    layer(`${prefix}-accent`, 'Accent Glow', 'effect', { parentId: `${prefix}-main-group`, x: 0, y: 0, width: 1480, height: 800, zIndex: 30, effect: 'energy', effectColor: accent, opacity: .6, effectRadius: 70 }),
    layer(`${prefix}-particles`, 'Particles', 'effect', { parentId: `${prefix}-main-group`, x: 0, y: 0, width: 1480, height: 800, zIndex: 31, effect: 'particles', effectColor: accent, effectIntensity: .8 }),
    layer(`${prefix}-shine`, 'Shine / Light Sweep', 'effect', { parentId: `${prefix}-main-group`, x: -100, y: 0, width: 300, height: 800, zIndex: 32, effect: 'shine', effectColor: '#ffffff', effectIntensity: .45 }),
    layer(`${prefix}-title`, 'Animation Title', 'text', { x: 710, y: 55, width: 500, height: 80, zIndex: 40, text: animationId.toUpperCase(), fontSize: 46, fontWeight: 900, color: accent, textAlign: 'center', effect: 'glow', effectColor: accent }),
  ];
}

function layer(idValue: string, name: string, type: LayerType, patch: Partial<DesignLayer> = {}): DesignLayer {
  return {
    id: idValue,
    name,
    type,
    visible: true,
    locked: false,
    parentId: null,
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    rotation: 0,
    scale: 1,
    opacity: 1,
    zIndex: 1,
    effect: 'none',
    frameStyle: type === 'frame' ? 'rounded' : undefined,
    borderStyle: 'solid',
    effectColor: '#ffd866',
    effectIntensity: 0.75,
    effectRadius: 28,
    shadowColor: '#000000',
    shadowBlur: 20,
    shadowX: 0,
    shadowY: 10,
    maskFeather: 0,
    autoFit: false,
    letterSpacing: 0,
    lineHeight: 1.2,
    textStrokeColor: 'transparent',
    textStrokeWidth: 0,
    keyframes: [],
    ...patch,
  };
}

export function createDesign(animationId: DesignAnimationId = 'team-call'): BroadcastDesign {
  return {
    id: `design-${animationId}`,
    animationId,
    name: `${animationId.toUpperCase()} DESIGN`,
    version: 1,
    status: 'draft',
    canvas: { width: BROADCAST_DESIGN_WIDTH, height: BROADCAST_DESIGN_HEIGHT, background: '#01040a' },
    layers: baseLayers(animationId),
    selectedLayerId: null,
    currentTime: 0,
    duration: 8,
    playback: { duration: 8, fps: 60, speed: 1, loop: false, reverse: false, inPoint: 0, outPoint: 8, transitionIn: { kind: 'fade', duration: .35, intensity: 1, color: '#000000', easing: 'smooth' }, transitionOut: { kind: 'fade', duration: .35, intensity: 1, color: '#000000', easing: 'smooth' }, autoNextAnimationId: null },
    // Design Studio is time-local: every visual edit at t>0 is stored as a keyframe.
    // This prevents later edits from leaking into earlier moments.
    schemaVersion: 6, selectedLayerIds: [], presets: [],
    controls: [],
    advanced: { globals: { brandName: 'WAB·TKD', primaryFont: 'Inter', secondaryFont: 'Cairo', gold: '#ffd866', red: '#ff3158', blue: '#39a9ff', background: '#01040a', defaultGlow: 1, animationSpeed: 1 }, stateMachine: { state: 'IDLE', enteredAt: 0 }, conditions: [], queue: [], macros: [], scenes: [] },
    frozen: false,
    livePreview: false,
    language: 'en',
    updatedAt: now(),
    history: [],
  };
}

function storage(): Record<string, BroadcastDesign> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; }
}

export function getPresets(): DesignPreset[] {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch { return []; }
}
export function savePreset(design: BroadcastDesign, name: string, layerIds?: string[]): DesignPreset {
  const ids = new Set(layerIds && layerIds.length ? layerIds : design.layers.filter(l => !l.parentId).map(l => l.id));
  const preset: DesignPreset = { id: id('preset'), name, sourceAnimationId: design.animationId, layers: cloneLayers(design.layers.filter(l => ids.has(l.id) || (l.parentId && ids.has(l.parentId)))), createdAt: now() };
  const next = [...getPresets(), preset]; localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); return preset;
}
export function applyPreset(design: BroadcastDesign, preset: DesignPreset, x = 0, y = 0): BroadcastDesign {
  const idMap = new Map<string,string>();
  const imported = preset.layers.map(l => { const nid=id('layer'); idMap.set(l.id,nid); return { ...cloneLayer(l), id:nid, parentId:l.parentId ? (idMap.get(l.parentId) || null) : null, x:l.x+x, y:l.y+y }; });
  return { ...design, layers:[...design.layers,...imported], selectedLayerId: imported[0]?.id || design.selectedLayerId, selectedLayerIds: imported.map(l=>l.id) };
}

export function getDesignTemplates(): DesignTemplate[] {
  try {
    const value = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
export function saveDesignTemplate(
  design: BroadcastDesign,
  meta: Omit<DesignTemplate, 'id'|'design'|'createdAt'|'updatedAt'|'animationId'> & { animationId?: DesignAnimationId },
): DesignTemplate {
  const nowIso = now();
  const template: DesignTemplate = {
    id: id('template'),
    name: meta.name,
    scope: meta.scope,
    animationId: meta.animationId || design.animationId,
    tournamentId: meta.tournamentId ?? null,
    competitionMode: meta.competitionMode ?? null,
    gender: meta.gender ?? null,
    ageGroup: meta.ageGroup ?? null,
    weightCategory: meta.weightCategory ?? null,
    design: normalizeDesign(clone(design)),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const next = [...getDesignTemplates(), template];
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next.slice(-100))); } catch {}
  return template;
}
export function deleteDesignTemplate(templateId: string): void {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(getDesignTemplates().filter(t => t.id !== templateId))); } catch {}
}
export function applyDesignTemplate(design: BroadcastDesign, template: DesignTemplate): BroadcastDesign {
  return normalizeDesign({
    ...clone(template.design),
    id: design.id,
    animationId: design.animationId,
    status: 'draft',
    version: design.version,
    publishedVersion: design.publishedVersion,
    draftVersion: design.draftVersion,
    tournamentId: design.tournamentId ?? null,
    displayId: design.displayId ?? null,
    templateId: template.id,
    updatedAt: now(),
    history: [...design.history, { id: id('history'), label: `Apply Template · ${template.name}`, at: now() }].slice(-80),
  });
}
export function recordProjectSnapshot(design: BroadcastDesign, label = 'Snapshot'): void {
  try {
    const all = JSON.parse(localStorage.getItem(PROJECT_HISTORY_KEY) || '{}') as Record<string, BroadcastDesign[]>;
    const previous = Array.isArray(all[design.animationId]) ? all[design.animationId] : [];
    all[design.animationId] = [...previous, normalizeDesign(clone(design))].slice(-50);
    localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(all));
  } catch {}
}
export function getProjectHistory(animationId: DesignAnimationId): BroadcastDesign[] {
  try {
    const all = JSON.parse(localStorage.getItem(PROJECT_HISTORY_KEY) || '{}') as Record<string, BroadcastDesign[]>;
    return Array.isArray(all[animationId]) ? all[animationId] : [];
  } catch { return []; }
}
export function restoreProjectSnapshot(animationId: DesignAnimationId, versionOrIndex: number): BroadcastDesign {
  const list = getProjectHistory(animationId);
  const found = list.find(v => Number(v.version) === Number(versionOrIndex)) || list[versionOrIndex];
  if (!found) throw new Error(`Project snapshot ${versionOrIndex} was not found for ${animationId}`);
  return saveDesign({ ...clone(found), status: 'draft', history: [...found.history, { id: id('history'), label: `Restore Snapshot ${versionOrIndex}`, at: now() }].slice(-80) }, 'Restore Snapshot');
}

function cloneLayer<T extends DesignLayer>(layer:T):T { return JSON.parse(JSON.stringify(layer)); }
function cloneLayers<T extends DesignLayer>(layers:T[]):T[] { return JSON.parse(JSON.stringify(layers)); }

export interface BroadcastDesignFile {
  format: 'wab-tkd-design';
  formatVersion: 2;
  exportedAt: string;
  animationId: DesignAnimationId;
  design: BroadcastDesign;
}

function validateImportedLayer(value: unknown, index: number): DesignLayer {
  if (!value || typeof value !== 'object') throw new Error(`Invalid design layer at index ${index}`);
  const layer = value as Partial<DesignLayer>;
  if (!layer.id || !layer.name || !layer.type) throw new Error(`Invalid design layer at index ${index}`);
  if (!Array.isArray(layer.keyframes)) throw new Error(`Invalid keyframes for layer ${String(layer.id)}`);
  const safeNumber = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    ...(layer as DesignLayer),
    x: safeNumber(layer.x, 0), y: safeNumber(layer.y, 0),
    width: Math.max(0, safeNumber(layer.width, 1)), height: Math.max(0, safeNumber(layer.height, 1)),
    rotation: safeNumber(layer.rotation, 0), scale: Math.max(0.001, safeNumber(layer.scale, 1)),
    opacity: Math.max(0, Math.min(1, safeNumber(layer.opacity, 1))),
    zIndex: safeNumber(layer.zIndex, index),
    parentId: layer.parentId ?? null,
    keyframes: layer.keyframes.filter(Boolean).map((k: any) => ({
      ...k, id: String(k.id || id('keyframe')), time: Math.max(0, safeNumber(k.time, 0)), props: k.props && typeof k.props === 'object' ? k.props : undefined,
    })),
  };
}

export function serializeDesignFile(design: BroadcastDesign): string {
  const payload: BroadcastDesignFile = {
    format: 'wab-tkd-design',
    formatVersion: 2,
    exportedAt: now(),
    animationId: design.animationId,
    design: normalizeDesign({ ...design, schemaVersion: 2, status: 'draft', livePreview: false }),
  };
  return JSON.stringify(payload, null, 2);
}

export function parseDesignFile(text: string, expectedAnimationId?: DesignAnimationId): BroadcastDesign {
  let parsed: Partial<BroadcastDesignFile> | BroadcastDesign;
  try { parsed = JSON.parse(text); } catch { throw new Error('Invalid WAB-TKD design file: malformed JSON'); }
  const envelope = parsed as Partial<BroadcastDesignFile>;
  const source = envelope.design ?? parsed as BroadcastDesign;
  if (!source || typeof source !== 'object' || !Array.isArray((source as BroadcastDesign).layers) || !(source as BroadcastDesign).animationId) {
    throw new Error('Invalid WAB-TKD design file');
  }
  const format = envelope.format;
  if (format && format !== 'wab-tkd-design') throw new Error('Unsupported WAB-TKD design format');
  const version = Number(envelope.formatVersion || 1);
  if (!Number.isFinite(version) || version < 1 || version > 2) throw new Error(`Unsupported WAB-TKD design version: ${version}`);
  if (expectedAnimationId && (source as BroadcastDesign).animationId !== expectedAnimationId) {
    throw new Error(`Design belongs to ${String((source as BroadcastDesign).animationId)}, not ${expectedAnimationId}`);
  }
  const safeLayers = (source as BroadcastDesign).layers.map(validateImportedLayer);
  const normalized = normalizeDesign({ ...(source as BroadcastDesign), schemaVersion: 2, layers: safeLayers, status: 'draft', livePreview: true });
  return { ...normalized, id: id('design-import'), version: Math.max(1, normalized.version), updatedAt: now(), history: [...normalized.history, { id: id('history'), label: 'Import Design', at: now() }].slice(-80) };
}

export function getDesign(animationId: DesignAnimationId): BroadcastDesign {
  const saved = storage()[animationId];
  return saved ? normalizeDesign(saved) : createDesign(animationId);
}

export function saveDesign(design: BroadcastDesign, label = 'Edit') {
  const draftVersion = Math.max(1, Number(design.draftVersion || 0) + 1);
  const normalized = normalizeDesign({ ...design, status: 'draft', draftVersion, updatedAt: now(), history: [...design.history, { id: id('history'), label: `${label} · Draft ${draftVersion}`, at: now() }].slice(-80) });
  const all = storage();
  all[design.animationId] = normalized;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); localStorage.setItem(ACTIVE_KEY, design.animationId); } catch {}
  recordProjectSnapshot(normalized, label);
  // Drafts are Studio-only. They are deliberately NOT broadcast to Public Display.
  window.dispatchEvent(new CustomEvent(CHANNEL_EVENT, { detail: normalized }));
  return normalized;
}

export function getPublishedDesign(animationId: DesignAnimationId): BroadcastDesign {
  try {
    const published = JSON.parse(localStorage.getItem(PUBLISHED_STORAGE_KEY) || '{}') as Record<string, BroadcastDesign>;
    const value = published[animationId];
    if (value) return normalizeDesign({ ...value, status: 'published', livePreview: true });
    // One-time migration for designs published before the separate Draft/Published stores.
    const legacy = storage()[animationId];
    if (legacy?.status === 'published') {
      published[animationId] = legacy;
      try { localStorage.setItem(PUBLISHED_STORAGE_KEY, JSON.stringify(published)); } catch {}
      return normalizeDesign({ ...legacy, status: 'published', livePreview: true });
    }
  } catch {}
  return { ...createDesign(animationId), status: 'original', livePreview: false };
}

export function getPublishedHistory(animationId: DesignAnimationId): BroadcastDesign[] {
  try {
    const all = JSON.parse(localStorage.getItem(PUBLISHED_HISTORY_KEY) || '{}') as Record<string, BroadcastDesign[]>;
    return Array.isArray(all[animationId]) ? all[animationId].map(v => normalizeDesign({ ...v, status: 'published', livePreview: true })) : [];
  } catch { return []; }
}

export function rollbackPublished(animationId: DesignAnimationId, version: number): BroadcastDesign {
  const candidate = getPublishedHistory(animationId).find(v => Number(v.publishedVersion || v.version) === Number(version));
  if (!candidate) throw new Error(`Published version ${version} was not found for ${animationId}`);
  const rolled = normalizeDesign({ ...candidate, status: 'published', version: Math.max(candidate.version, version), publishedVersion: version, updatedAt: now(), history: [...candidate.history, { id: id('history'), label: `Rollback to Published v${version}`, at: now() }].slice(-80) });
  const allPublished = (() => { try { return JSON.parse(localStorage.getItem(PUBLISHED_STORAGE_KEY) || '{}') || {}; } catch { return {}; } })();
  allPublished[animationId] = rolled;
  try { localStorage.setItem(PUBLISHED_STORAGE_KEY, JSON.stringify(allPublished)); } catch {}
  const all = storage(); all[animationId] = rolled;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); localStorage.setItem(ACTIVE_KEY, animationId); } catch {}
  window.dispatchEvent(new CustomEvent(CHANNEL_EVENT, { detail: rolled }));
  const api = window.electronAPI; if (api?.broadcastDesign) api.broadcastDesign(rolled);
  return rolled;
}

export function publishDesign(design: BroadcastDesign): BroadcastDesign {
  const version = Math.max(design.version + 1, (design.publishedVersion || 0) + 1);
  const published = normalizeDesign({ ...design, status: 'published', version, publishedVersion: version, draftVersion: design.draftVersion || 0, livePreview: true, updatedAt: now(), history: [...design.history, { id: id('history'), label: 'Publish', at: now() }].slice(-80) });
  const allPublished = (() => { try { return JSON.parse(localStorage.getItem(PUBLISHED_STORAGE_KEY) || '{}') || {}; } catch { return {}; } })();
  allPublished[design.animationId] = published;
  try {
    const history = JSON.parse(localStorage.getItem(PUBLISHED_HISTORY_KEY) || '{}') as Record<string, BroadcastDesign[]>;
    const previous = Array.isArray(history[design.animationId]) ? history[design.animationId] : [];
    history[design.animationId] = [...previous, published].slice(-20);
    localStorage.setItem(PUBLISHED_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(PUBLISHED_STORAGE_KEY, JSON.stringify(allPublished));
  } catch {}
  // Persist the published copy as the latest version in the Studio store too.
  const all = storage(); all[design.animationId] = published;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); localStorage.setItem(ACTIVE_KEY, design.animationId); } catch {}
  window.dispatchEvent(new CustomEvent(CHANNEL_EVENT, { detail: published }));
  const api = window.electronAPI; if (api?.broadcastDesign) api.broadcastDesign(published);
  return published;
}

export function restoreOriginal(animationId: DesignAnimationId): BroadcastDesign {
  const original = createDesign(animationId);
  return saveDesign({ ...original, status: 'draft', version: 1 }, 'Restore Original');
}

export function subscribeDesign(callback: (design: BroadcastDesign) => void, animationId?: DesignAnimationId) {
  const onCustom = (event: Event) => {
    const design = (event as CustomEvent).detail as BroadcastDesign;
    if (!design || (animationId && design.animationId !== animationId)) return;
    callback(normalizeDesign(design));
  };
  const onStorage = () => {
    if (!animationId) return;
    callback(getDesign(animationId));
  };
  window.addEventListener(CHANNEL_EVENT, onCustom as EventListener);
  window.addEventListener('storage', onStorage);
  const api = window.electronAPI;
  const off = api?.onBroadcastDesignSync?.((incoming) => {
    if (incoming && (!animationId || incoming.animationId === animationId)) callback(normalizeDesign(incoming));
  });
  return () => { window.removeEventListener(CHANNEL_EVENT, onCustom as EventListener); window.removeEventListener('storage', onStorage); off?.(); };
}

export async function getLiveElectronDesign(animationId: DesignAnimationId): Promise<BroadcastDesign | null> {
  try {
    const incoming = await window.electronAPI?.getBroadcastDesign?.();
    if (incoming && incoming.animationId === animationId && incoming.status === 'published') return normalizeDesign(incoming);
  } catch {}
  return null;
}

function normalizeDesign(input: BroadcastDesign): BroadcastDesign {
  return {
    ...createDesign(input.animationId),
    ...input,
    canvas: { width: BROADCAST_DESIGN_WIDTH, height: BROADCAST_DESIGN_HEIGHT, background: '#01040a', ...input.canvas },
    layers: Array.isArray(input.layers) ? input.layers.map((l) => ({ ...layer(l.id, l.name, l.type), ...l, keyframes: Array.isArray(l.keyframes) ? l.keyframes : [] })) : baseLayers(input.animationId),
    history: Array.isArray(input.history) ? input.history : [],
    selectedLayerIds: Array.isArray(input.selectedLayerIds) ? input.selectedLayerIds : (input.selectedLayerId ? [input.selectedLayerId] : []),
    presets: Array.isArray(input.presets) ? input.presets : [],
    publishedVersion: input.publishedVersion ?? (input.status === 'published' ? input.version : undefined),
    controls: Array.isArray(input.controls) ? input.controls : [],
    playback: { duration: input.duration || 8, fps: 60, speed: 1, loop: false, reverse: false, inPoint: 0, outPoint: input.duration || 8, transitionIn: { kind: 'fade', duration: .35, intensity: 1, color: '#000000', easing: 'smooth' }, transitionOut: { kind: 'fade', duration: .35, intensity: 1, color: '#000000', easing: 'smooth' }, autoNextAnimationId: null, ...(input.playback || {}) },
    editor: { grid: true, guides: true, snap: true, zoom: 1, ...(input.editor || {}) },
    tournamentId: input.tournamentId ?? null,
    displayId: input.displayId ?? null,
    templateId: input.templateId ?? null,
  };
}

export function applyDesignTransform(layerValue: DesignLayer): React.CSSProperties {
  return {
    position: 'absolute',
    left: layerValue.x,
    top: layerValue.y,
    width: layerValue.width,
    height: layerValue.height,
    transform: `rotate(${layerValue.rotation}deg) scale(${layerValue.scale})`,
    transformOrigin: 'center center',
    opacity: layerValue.opacity,
    zIndex: layerValue.zIndex,
    pointerEvents: 'none',
  } as React.CSSProperties;
}


import React, { useEffect, useMemo, useState } from 'react';
import { getPublishedDesign, getLiveElectronDesign, subscribeDesign, evaluateLayerAtTime, type BroadcastDesign, type DesignLayer, type DesignAnimationId } from '@/lib/broadcast-design';
import FlagImage from './FlagImage';
import { resolveDesignBinding } from '@/lib/broadcast-design-bindings';
import { useMatch, isPublicDisplayWindow } from '@/context/MatchContext';
import { controlIsActive } from '@/lib/broadcast-design-controls';

function runtimeAnimationId(state: any, detected: DesignAnimationId): DesignAnimationId {
  const a = String(state?.animationController?.activeAnimation || '').toUpperCase();
  if (a === 'TEAM_CALL') return 'team-call';
  if (a === 'SINGLE_PLAYER_CALL' || a === 'PLAYER_CALL') return 'player-call';
  if (a === 'PLAYER_CHANGE') return 'player-change';
  if (a === 'KO') return 'ko';
  if (a === 'DOCTOR') return 'doctor';
  if (a === 'KYESHI') return 'kyeshi';
  if (a === 'WOO_SE_GIROK' || a === 'WOO-SE-GIROK') return 'woose-girok';
  if (a === 'MATCH_RESULT') return 'match-result';
  return detected;
}

function resolveBinding(layer: DesignLayer, state: any): { text?: string; image?: string } {
  const resolved = resolveDesignBinding(layer, state);
  return { text: resolved.text, image: resolved.imageSrc };
}


function transitionStyle(kind: string, progress: number, intensity = 1, color = '#000000'): React.CSSProperties {
  const p = Math.max(0, Math.min(1, progress));
  const i = Math.max(0, Math.min(1, intensity));
  switch (kind) {
    case 'fade': case 'crossfade': return { opacity: 1 - p * i };
    case 'wipe-left': return { clipPath: `inset(0 ${p * 100}% 0 0)` };
    case 'wipe-right': return { clipPath: `inset(0 0 0 ${p * 100}%)` };
    case 'wipe-up': return { clipPath: `inset(0 0 ${p * 100}% 0)` };
    case 'wipe-down': return { clipPath: `inset(${p * 100}% 0 0 0)` };
    case 'zoom-in': return { transform: `scale(${1 + p * .12 * i})`, opacity: 1 - p * .25 * i };
    case 'zoom-out': return { transform: `scale(${1.12 - p * .12 * i})`, opacity: .75 + p * .25 };
    case 'slide-left': return { transform: `translateX(${-p * 100 * i}%)` };
    case 'slide-right': return { transform: `translateX(${p * 100 * i}%)` };
    case 'slide-up': return { transform: `translateY(${-p * 100 * i}%)` };
    case 'slide-down': return { transform: `translateY(${p * 100 * i}%)` };
    case 'flash': return { opacity: 1 - Math.sin(p * Math.PI) * .85 * i, filter: `brightness(${1 + Math.sin(p * Math.PI) * 3 * i})` };
    case 'glitch': return { filter: `contrast(${1 + i}) saturate(${1 + i * 1.5})`, transform: `translate(${Math.sin(p*80)*3*i}px,${Math.cos(p*63)*2*i}px)` };
    case 'light-sweep': return { backgroundImage: `linear-gradient(110deg, transparent ${Math.max(0,p*100-12)}%, ${color}88 ${p*100}%, transparent ${Math.min(100,p*100+12)}%)` };
    default: return {};
  }
}

const overlayLoadedFonts = new Set<string>();
async function ensureOverlayFont(layer: DesignLayer) {
  if (!layer.fontSource || !layer.fontFamily || overlayLoadedFonts.has(layer.fontFamily)) return;
  try { const face = new FontFace(layer.fontFamily, `url(${layer.fontSource})`); await face.load(); document.fonts.add(face); overlayLoadedFonts.add(layer.fontFamily); } catch {}
}

function Layer({ layer, state }: { layer: DesignLayer; state: any }) {
  if (!layer.visible) return null;
  void ensureOverlayFont(layer);
  // Existing broadcast elements are edited in-place by BroadcastDesignRuntime.
  // Do not paint a second copy over them. Layers that have no live DOM target
  // (new text/frame/image/effect layers) are rendered here as true additions.
  if (typeof document !== 'undefined' && document.querySelector(`[data-wab-layer-id=\"${CSS.escape(layer.id)}\"]`)) return null;
  const value = resolveBinding(layer, state);
  const c = layer.effectColor || layer.borderColor || layer.color || '#ffd866';
  const intensity = layer.effectIntensity ?? .75;
  const radius = layer.effectRadius ?? 28;
  const border = layer.borderWidth ? `${layer.borderWidth}px ${layer.borderStyle || 'solid'} ${layer.borderColor || '#ffffff'}` : undefined;
  const clipPath = layer.frameStyle === 'hex' ? 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)' : layer.frameStyle === 'diamond' ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : layer.frameStyle === 'cut-corner' ? 'polygon(0 18px,18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px))' : undefined;
  const glow = ['glow','bloom','shine','energy','spark','light'].includes(layer.effect || '') ? `0 0 ${radius}px ${c}, 0 0 ${radius*2}px ${c}66` : undefined;
  const style: React.CSSProperties = {
    position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height,
    transform: `rotate(${layer.rotation}deg) scale(${layer.scale})`, transformOrigin: 'center center',
    opacity: layer.opacity, zIndex: layer.zIndex, boxSizing: 'border-box', border,
    borderRadius: layer.frameStyle === 'circle' ? '50%' : clipPath ? 0 : layer.borderRadius,
    clipPath: layer.clipPath || clipPath, color: layer.color || '#fff', background: layer.gradient || layer.background,
    overflow: 'hidden', fontFamily: layer.fontFamily || 'Inter, Cairo, sans-serif',
    fontSize: layer.fontSize, fontWeight: layer.fontWeight, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing, textAlign: layer.textAlign,
    direction: layer.direction === 'auto' ? undefined : layer.direction,
    display: layer.type === 'text' ? 'flex' : undefined, alignItems: layer.type === 'text' ? 'center' : undefined,
    justifyContent: layer.type === 'text' ? (layer.textAlign === 'right' ? 'flex-end' : layer.textAlign === 'left' ? 'flex-start' : 'center') : undefined,
    textShadow: layer.textStrokeWidth ? `0 0 ${layer.textStrokeWidth}px ${layer.textStrokeColor || c}` : undefined,
    boxShadow: [layer.shadowBlur ? `${layer.shadowX || 0}px ${layer.shadowY || 10}px ${layer.shadowBlur}px ${layer.shadowColor || '#000'}88` : undefined, glow].filter(Boolean).join(', ') || undefined,
    filter: layer.effect === 'blur' ? `blur(${Math.max(1,radius/3)}px)` : layer.effect === 'motion-blur' ? `blur(${Math.max(1,radius/6)}px)` : layer.filter,
    mixBlendMode: layer.blendMode as any,
    pointerEvents: 'none',
  };

  if (layer.type === 'image') {
    if (layer.binding === 'flag') {
      const side = layer.id.startsWith('blue') ? 'chung' : 'hong';
      const code = state?.teamCountry?.[side] || state?.[side]?.player?.nationality || '';
      return <div style={style}><FlagImage code={code} size={96} className="w-full h-full object-contain" /></div>;
    }
    return <div style={style}>{value.image ? <img src={value.image} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full rounded-xl border border-white/10 bg-white/5" />}</div>;
  }
  if (layer.type === 'effect') {
    const t = (performance.now() / 1000);
    const pulse = 0.82 + 0.18 * Math.sin(t * 8);
    const p = Math.max(0, intensity) * pulse;
    let bg = 'transparent'; let extra: React.CSSProperties = {};
    if (layer.effect === 'reflection') bg = `linear-gradient(135deg, transparent ${35+Math.sin(t*2)*8}%, ${c}66 50%, transparent ${65+Math.sin(t*2)*8}%)`;
    else if (layer.effect === 'particles' || layer.effect === 'spark') bg = `radial-gradient(circle at ${20+Math.sin(t*2)*12}% ${30+Math.cos(t*3)*15}%, ${c} 0 1px, transparent 2px),radial-gradient(circle at ${70+Math.cos(t*2.4)*15}% ${65+Math.sin(t*2.7)*18}%, #fff 0 1px, transparent 2px),radial-gradient(circle at ${45+Math.sin(t*1.8)*20}% ${80+Math.cos(t*2.2)*12}%, ${c} 0 1px, transparent 2px)`;
    else if (layer.effect === 'shine') bg = `linear-gradient(115deg, transparent ${Math.max(0,(t*80)%140-18)}%, ${c}99 ${(t*80)%140}%, transparent ${Math.min(100,(t*80)%140+18)}%)`;
    else if (layer.effect === 'scanline') bg = `repeating-linear-gradient(0deg, transparent 0 5px, ${c}22 6px 7px)`;
    else if (layer.effect === 'energy') { bg = `radial-gradient(circle at center, ${c}66, transparent 65%)`; extra = { filter:`brightness(${1+.1*p})` }; }
    else if (layer.effect === 'light' || layer.effect === 'bloom') extra = { boxShadow:`0 0 ${radius*p}px ${c}99, 0 0 ${radius*2*p}px ${c}44` };
    else if (layer.effect === 'gradient') bg = `linear-gradient(${135+Math.sin(t)*20}deg, ${c}, transparent 75%)`;
    else if (layer.effect === 'bevel') extra = { boxShadow:`inset 2px 2px ${Math.max(2,radius/3)}px #fff6,inset -2px -2px ${Math.max(2,radius/3)}px #0008` };
    else if (layer.effect === 'inner-glow') extra = { boxShadow:`inset 0 0 ${radius*p}px ${c}` };
    else if (layer.effect === 'outer-glow' || layer.effect === 'glow') extra = { boxShadow:`0 0 ${radius*p}px ${c},0 0 ${radius*2*p}px ${c}66` };
    else if (layer.effect === 'shadow') extra = { boxShadow:`0 ${8*p}px ${Math.max(4,radius)}px ${c}88` };
    else if (layer.effect === 'blur') extra = { filter:`blur(${Math.max(1,radius/3)*Math.max(.5,p)}px)` };
    else if (layer.effect === 'motion-blur') extra = { filter:`blur(${Math.max(1,radius/6)*Math.max(.5,p)}px)` };
    else if (layer.effect === 'smoke') { bg=`radial-gradient(circle at ${30+Math.sin(t)*8}% 60%, #fff2, transparent 40%),radial-gradient(circle at ${70+Math.cos(t*.8)*10}% 30%, ${c}22, transparent 45%)`; extra={filter:`blur(${Math.max(1,radius/8)}px)`}; }
    return <div style={{...style, background:bg, ...extra}} />;
  }
  if (layer.type === 'frame' || layer.type === 'shape' || layer.type === 'group') return <div style={style} />;
  return <div style={style}>{value.text || ''}</div>;
}

export default function BroadcastDesignOverlay({ force = false }: { force?: boolean }) {
  const { state } = useMatch();
  const [design, setDesign] = useState<BroadcastDesign | null>(null);
  const [liveDraft, setLiveDraft] = useState<BroadcastDesign | null>(null);
  const [animationId, setAnimationId] = useState<BroadcastDesign['animationId']>('team-call');
  const [scale, setScale] = useState(1);
  const [, forceTick] = useState(0);
  const [triggered, setTriggered] = useState<{animationId: DesignAnimationId; until:number} | null>(null);
  useEffect(() => { const t = window.setInterval(() => forceTick(v => v + 1), 33); return () => window.clearInterval(t); }, []);

  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const detected = useMemo(() => {
    if (state.substitutionAnimation) return 'player-change' as const;
    if (state.status === 'doctor') return 'doctor' as const;
    if (state.status === 'kyeshi') return 'kyeshi' as const;
    if (state.koAnimation) return 'ko' as const;
    if (state.callAnimation?.phase === 'player' || state.singlePlayerCall) return 'player-call' as const;
    if (state.callAnimation?.phase === 'team' || state.callScreenActive || state.autoCallSequence?.active) return 'team-call' as const;
    if (state.status === 'finished' && state.result) return 'winner' as const;
    return 'team-call' as const;
  }, [state.substitutionAnimation, state.status, state.koAnimation, state.callAnimation?.phase, state.singlePlayerCall, state.callScreenActive, state.autoCallSequence?.active, state.result]);

  const runtimeTime = useMemo(() => {
    const startedAt = state?.animationController?.startedAt;
    if (startedAt && design) return Math.max(0, Math.min(design.duration, (Date.now() - startedAt) / 1000));
    return design?.currentTime || 0;
  }, [state?.animationController?.startedAt, state?.animationController?.activeAnimation, design]);

  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('wab-broadcast-design-live-edit-v1');
      ch.onmessage = (e) => {
        const m = e.data;
        if (m?.type === 'live-edit' && m.design && (!m.animationId || m.animationId === animationId)) setLiveDraft(m.design as BroadcastDesign);
        if (m?.type === 'live-edit-clear' && (!m.animationId || m.animationId === animationId)) setLiveDraft(null);
      };
    } catch {}
    return () => { try { ch?.close(); } catch {} };
  }, [animationId]);

  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try { ch = new BroadcastChannel('wab-broadcast-design-trigger-v1'); ch.onmessage = (e) => { const m=e.data; if(m?.type==='trigger-design' && (!m.animationId || m.animationId===animationId)){ setTriggered({animationId:m.animationId||animationId,until:Date.now()+Math.max(250,Number(m.durationMs)||2500)}); } }; } catch {}
    return () => { try { ch?.close(); } catch {} };
  }, [animationId]);

  useEffect(() => {
    if (!triggered) return;
    const t=window.setInterval(()=>{ if(Date.now()>=triggered.until) setTriggered(null); },100);
    return ()=>window.clearInterval(t);
  }, [triggered]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requested = query.get('designAnimation') as BroadcastDesign['animationId'] | null;
    const id = requested || detected;
    setAnimationId(id || 'team-call');
    const initial = getPublishedDesign(id || 'team-call');
    setDesign(initial);
    getLiveElectronDesign(id || 'team-call').then((live) => { if (live) setDesign(live); });
    // Public displays intentionally subscribe to ANY design animation. The
    // designer can preview Winner/KO/Player Call even if the live match is
    // currently on another state; this is the explicit live-design preview.
    return subscribeDesign((next) => {
      // Never let a design from another animation overwrite the active
      // broadcast. This is the stale-animation guard for Public Display.
      if (next.animationId === id && next.status === 'published') setDesign(next);
    }, id);
  }, [detected]);

  const effectiveDesign = liveDraft && liveDraft.animationId === animationId ? liveDraft : design;
  if (!effectiveDesign || (!force && !effectiveDesign.livePreview && !triggered && !liveDraft) || (!force && !isPublicDisplayWindow() && !effectiveDesign.livePreview && !triggered && !liveDraft)) return null;

  const previewLabel = effectiveDesign.livePreview ? 'DESIGN PREVIEW' : '';
  const playback = effectiveDesign.playback;
  const inDuration = playback?.transitionIn?.duration || 0;
  const outDuration = playback?.transitionOut?.duration || 0;
  const inProgress = inDuration > 0 ? Math.max(0, Math.min(1, runtimeTime / inDuration)) : 1;
  const outStart = Math.max(0, (playback?.outPoint ?? design.duration) - outDuration);
  const outProgress = outDuration > 0 && runtimeTime >= outStart ? Math.max(0, Math.min(1, (runtimeTime - outStart) / outDuration)) : 0;
  const entry = playback?.transitionIn?.kind && playback.transitionIn.kind !== 'none' ? transitionStyle(playback.transitionIn.kind, 1 - inProgress, playback.transitionIn.intensity, playback.transitionIn.color) : {};
  const exit = playback?.transitionOut?.kind && playback.transitionOut.kind !== 'none' ? transitionStyle(playback.transitionOut.kind, outProgress, playback.transitionOut.intensity, playback.transitionOut.color) : {};
  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden" aria-label={previewLabel}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: 'top left', transform: `scale(${scale})`, ...entry, ...exit } as React.CSSProperties}>
        <div className="absolute inset-0" style={{ background: effectiveDesign.canvas.background }} />
        {effectiveDesign.layers.slice().sort((a, b) => a.zIndex - b.zIndex).map((rawLayer) => {
          const control = (effectiveDesign.controls || []).find(c => c.enabled && c.targetLayerIds?.includes(rawLayer.id));
          const within = !control || controlIsActive(control, runtimeTime, effectiveDesign.duration, state);
          const layer = evaluateLayerAtTime(rawLayer, runtimeTime);
          return within ? <Layer key={layer.id} layer={layer} state={state} /> : null;
        })}
      </div>
      <div className="absolute top-3 left-3 rounded-lg border border-yellow-400/40 bg-black/65 px-3 py-1.5 text-[10px] font-black tracking-[.16em] text-yellow-200 backdrop-blur-md">{liveDraft ? '● LIVE DRAFT' : (previewLabel || animationId.toUpperCase())} · v{effectiveDesign.version}</div>
    </div>
  );
}

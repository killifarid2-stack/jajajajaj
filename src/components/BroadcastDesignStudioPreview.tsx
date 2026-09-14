import React, { useEffect, useMemo, useRef, useState } from 'react';
import PublicScoreboard from '@/components/PublicScoreboard';
import { MatchContext, useMatch } from '@/context/MatchContext';
import { createInitialMatchState } from '@/lib/match-engine';
import type { MatchState } from '@/types/tkd';
import { resolveDesignBinding } from '@/lib/broadcast-design-bindings';
import { evaluateLayerAtTime, type DesignAnimationId, type BroadcastDesign, type DesignLayer } from '@/lib/broadcast-design';
import BroadcastDesignStudioAwardPreview from './BroadcastDesignStudioAwardPreview';

/**
 * Native Design Studio preview.
 *
 * IMPORTANT: this is not a fake canvas. It mounts the same PublicScoreboard and
 * animation components used by the audience screen, then applies the current
 * draft Design Studio edits on top of those real DOM nodes. This means the
 * designer can SEE the actual animation while editing it.
 */
export default function BroadcastDesignStudioPreview({
  animationId,
  design,
  playing,
  previewStage = 'main',
}: {
  animationId: DesignAnimationId;
  design: BroadcastDesign;
  playing: boolean;
  previewStage?: string;
}) {
  const parent = useMatch();
  if (['best-player-match','team-match-mvp','tournament-mvp','best-team','best-club','best-referee','fair-play','top-scorer','top-hitter','podium'].includes(animationId)) {
    return <BroadcastDesignStudioAwardPreview animationId={animationId} design={design} />;
  }
  const previewState = useMemo(() => buildPreviewState(parent.state, animationId, previewStage), [parent.state, animationId, previewStage]);
  const previewValue = useMemo(() => ({ ...parent, state: previewState, dispatch: (() => {}) as typeof parent.dispatch }), [parent, previewState]);

  return (
    <MatchContext.Provider value={previewValue}>
      <NativeEditablePreview animationId={animationId} design={design} playing={playing} previewState={previewState} />
    </MatchContext.Provider>
  );
}

function NativeEditablePreview({ animationId, design, playing, previewState }: { animationId: DesignAnimationId; design: BroadcastDesign; playing: boolean; previewState: MatchState }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, { left:number; top:number; width:number; height:number }>>({});
  const selectedIds = design.selectedLayerIds?.length ? design.selectedLayerIds : (design.selectedLayerId ? [design.selectedLayerId] : []);
  const evaluated = useMemo(() => design.layers.map(l => resolvePreviewBinding(evaluateLayerAtTime(l, design.currentTime), previewState)), [design.layers, design.currentTime, previewState]);

  // Turn the complete native animation DOM into editable layers.  Older versions
  // only inspected elements that developers had manually tagged with
  // data-wab-layer-id, which is why whole animations could appear as a black
  // canvas or expose only a handful of layers.  The Studio now auto-tags every
  // visible visual DOM node (divs with visual styles, text, images, video, SVG,
  // canvas, etc.) while preserving existing semantic ids.
  const captureNativeLayers = () => {
    const root = rootRef.current;
    if (!root) return;
    const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
    const candidates = all.filter(node => {
      if (node.dataset.wabStudioUi === '1' || node.closest('[data-wab-studio-ui="1"]')) return false;
      const tag = node.tagName.toLowerCase();
      if (['script','style','link','meta','br','source'].includes(tag)) return false;
      const cs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const text = node.children.length === 0 ? (node.textContent || '').trim() : '';
      const visual = ['img','video','canvas','svg','path'].includes(tag) || !!text ||
        cs.backgroundImage !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        cs.borderTopWidth !== '0px' || cs.boxShadow !== 'none' || cs.filter !== 'none';
      return visual;
    });
    const used = new Set<string>();
    const layers: DesignLayer[] = candidates.map((node, index) => {
      const tag = node.tagName.toLowerCase();
      const wasDeclared = !!node.dataset.wabLayerId;
      let id = node.dataset.wabLayerId || node.dataset.wabStudioAutoId;
      if (!id) {
        const parent = node.parentElement;
        const parentId = parent?.dataset.wabLayerId || parent?.dataset.wabStudioAutoId || 'root';
        const semantic = (node.getAttribute('aria-label') || node.getAttribute('title') ||
          (node.textContent || '').trim().slice(0, 40) || tag).replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase();
        id = `auto:${animationId}:${semantic || tag}:${index}`;
        node.dataset.wabStudioAutoId = id;
      }
      while (used.has(id)) id = `${id}-${index}`;
      used.add(id);
      if (!node.dataset.wabLayerId) node.dataset.wabLayerId = id;
      const r = node.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const base = ensureBaseGeometry(node, root);
      const cs = getComputedStyle(node);
      const img = tag === 'img' ? (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src : node.querySelector('img')?.currentSrc || node.querySelector('img')?.src || undefined;
      const video = tag === 'video' ? ((node as HTMLVideoElement).currentSrc || (node as HTMLVideoElement).src) : node.querySelector('video')?.currentSrc || node.querySelector('video')?.src || undefined;
      const text = node.children.length === 0 ? (node.textContent || '').trim().slice(0, 1000) : undefined;
      let parent = node.parentElement, parentId: string | null = null;
      while (parent && parent !== root) { if (parent.dataset.wabLayerId || parent.dataset.wabStudioAutoId) { parentId = parent.dataset.wabLayerId || parent.dataset.wabStudioAutoId || null; break; } parent = parent.parentElement; }
      const type: any = img ? 'image' : video ? 'video' : text ? 'text' : (tag === 'svg' || tag === 'canvas' || cs.borderTopWidth !== '0px' || cs.borderLeftWidth !== '0px') ? 'frame' : 'shape';
      const numericZ = Number(cs.zIndex);
      return {
        id, name: node.dataset.wabLayerName || node.getAttribute('aria-label') || node.getAttribute('title') || text || `${tag.toUpperCase()} ${index + 1}`, type,
        visible: true, locked: false, parentId, x: base.x, y: base.y, width: base.width, height: base.height, rotation: 0, scale: 1, opacity: Number(cs.opacity || 1),
        zIndex: Number.isFinite(numericZ) ? numericZ : index + 1, color: cs.color, background: cs.backgroundColor, borderColor: cs.borderColor, borderWidth: parseFloat(cs.borderTopWidth) || 0, borderRadius: parseFloat(cs.borderTopLeftRadius) || 0,
        fontFamily: cs.fontFamily, fontSize: parseFloat(cs.fontSize) || undefined, fontWeight: cs.fontWeight, textAlign: cs.textAlign as any, direction: cs.direction as any, text, imageSrc: img, videoSrc: video,
        effect: 'none', borderStyle: cs.borderStyle as any, filter: cs.filter, letterSpacing: parseFloat(cs.letterSpacing) || 0, lineHeight: parseFloat(cs.lineHeight) || 1.2, blendMode: cs.mixBlendMode as any, keyframes: [], sourceKey: wasDeclared ? `native:${animationId}:${id}` : `dom-auto:${animationId}:${id}`,
      };
    });
    // Keep the root first so the Layer Tree has a clear hierarchy, then use
    // document order for predictable z-order and multi-selection.
    // Exact Player Call is rendered in an isolated same-origin iframe. Inspect
    // its DOM as well so the photo/flag/name/frames are real editable layers.
    root.querySelectorAll<HTMLIFrameElement>('iframe').forEach((frame, fi) => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        Array.from(doc.body.querySelectorAll<HTMLElement>('*')).forEach((node, ii) => {
          const cs = doc.defaultView?.getComputedStyle(node); if (!cs) return;
          const r = node.getBoundingClientRect();
          if (r.width < 2 || r.height < 2 || cs.display === 'none' || cs.visibility === 'hidden') return;
          const tag = node.tagName.toLowerCase();
          const text = node.children.length === 0 ? (node.textContent || '').trim().slice(0, 1000) : '';
          const visual = ['img','video','canvas','svg'].includes(tag) || !!text || cs.backgroundImage !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px' || cs.boxShadow !== 'none';
          if (!visual) return;
          const id = node.dataset.wabLayerId || `iframe:${animationId}:${fi}:${tag}:${ii}`;
          node.dataset.wabLayerId = id;
          if (layers.some(l => l.id === id)) return;
          const fw = frame.getBoundingClientRect();
          layers.push({ id, name: node.getAttribute('aria-label') || node.getAttribute('title') || text || `${tag.toUpperCase()} ${ii + 1}`, type: tag === 'img' ? 'image' : tag === 'video' ? 'video' : text ? 'text' : 'frame', visible: true, locked: false, parentId: null,
            x: (fw.left - root.getBoundingClientRect().left) / Math.max(1, root.clientWidth) * 1920 + (r.left / Math.max(1, frame.clientWidth)) * 1920,
            y: (fw.top - root.getBoundingClientRect().top) / Math.max(1, root.clientHeight) * 1080 + (r.top / Math.max(1, frame.clientHeight)) * 1080,
            width: r.width / Math.max(1, frame.clientWidth) * 1920, height: r.height / Math.max(1, frame.clientHeight) * 1080,
            rotation: 0, scale: 1, opacity: Number(cs.opacity || 1), zIndex: 10000 + ii, color: cs.color, background: cs.backgroundColor, borderColor: cs.borderColor, borderWidth: parseFloat(cs.borderTopWidth) || 0, borderRadius: parseFloat(cs.borderTopLeftRadius) || 0,
            fontFamily: cs.fontFamily, fontSize: parseFloat(cs.fontSize) || undefined, fontWeight: cs.fontWeight, textAlign: cs.textAlign as any, direction: cs.direction as any, text: text || undefined,
            imageSrc: tag === 'img' ? (node as HTMLImageElement).src : node.querySelector('img')?.src, videoSrc: tag === 'video' ? (node as HTMLVideoElement).src : node.querySelector('video')?.src,
            effect: 'none', filter: cs.filter, letterSpacing: parseFloat(cs.letterSpacing) || 0, lineHeight: parseFloat(cs.lineHeight) || 1.2, blendMode: cs.mixBlendMode as any, keyframes: [], sourceKey: `iframe:${animationId}:${id}` } as any);
          node.addEventListener('click', (ev) => { ev.stopPropagation(); window.dispatchEvent(new CustomEvent('wab-studio-select-layer', { detail: { id, additive: (ev as MouseEvent).ctrlKey || (ev as MouseEvent).metaKey } })); });
        });
      } catch { /* cross-origin iframe remains editable as one outer frame */ }
    });
    window.dispatchEvent(new CustomEvent('wab-studio-preview-snapshot', { detail: { animationId, layers } }));
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const timer = window.setTimeout(captureNativeLayers, 180);
    const observer = new MutationObserver(() => { window.clearTimeout((observer as any).__timer); (observer as any).__timer = window.setTimeout(captureNativeLayers, 80); });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','src'] });
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('wab-broadcast-design-inspector-v1');
      channel.onmessage = (event) => { if (event.data?.type === 'capture' && event.data.animationId === animationId) captureNativeLayers(); };
    } catch {}
    return () => { window.clearTimeout(timer); window.clearTimeout((observer as any).__timer); observer.disconnect(); channel?.close(); };
  }, [animationId, playing, previewState.status]);

  // Apply draft edits directly to the REAL animation DOM inside this preview.
  // Individual transform properties preserve the animation's own transform.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-wab-layer-id]'));
    const byId = new Map(evaluated.map(l => [l.id, l]));
    const originals = new Map<HTMLElement, { transform:string; translate:string; rotate:string; scale:string; opacity:string; display:string; visibility:string; color:string; background:string; borderColor:string; borderWidth:string; borderRadius:string; fontFamily:string; fontSize:string; fontWeight:string; textAlign:string; direction:string; filter:string; boxShadow:string; letterSpacing:string; lineHeight:string; mixBlendMode:string; clipPath:string; text:string|null; imageSrc:string; videoSrc:string }>();

    nodes.forEach(node => {
      originals.set(node, {
        transform: node.style.transform, translate: node.style.translate, rotate: node.style.rotate, scale: node.style.scale,
        opacity: node.style.opacity, display: node.style.display, visibility: node.style.visibility, color: node.style.color,
        background: node.style.background, borderColor: node.style.borderColor, borderWidth: node.style.borderWidth,
        borderRadius: node.style.borderRadius, fontFamily: node.style.fontFamily, fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight, textAlign: node.style.textAlign, direction: node.style.direction,
        filter: node.style.filter, boxShadow: node.style.boxShadow, letterSpacing: node.style.letterSpacing,
        lineHeight: node.style.lineHeight, mixBlendMode: node.style.mixBlendMode, clipPath: node.style.clipPath,
        text: node.children.length === 0 ? node.textContent : null,
        imageSrc: node instanceof HTMLImageElement ? node.src : (node.querySelector('img')?.src || ''),
        videoSrc: node instanceof HTMLVideoElement ? node.currentSrc || node.src : (node.querySelector('video')?.currentSrc || node.querySelector('video')?.src || ''),
      });
      const id = node.dataset.wabLayerId;
      if (!id) return;
      const layer = byId.get(id);
      if (!layer) return;
      const base = ensureBaseGeometry(node, root);
      if (!layer.visible) { node.style.display = 'none'; node.style.visibility = 'hidden'; return; }
      node.style.display = '';
      node.style.visibility = '';
      const rw = Math.max(1, root.clientWidth), rh = Math.max(1, root.clientHeight);
      const sx = rw / 1920, sy = rh / 1080;
      const dx = (layer.x - base.x) * sx;
      const dy = (layer.y - base.y) * sy;
      const scaleX = (layer.width || base.width) / Math.max(1, base.width) * (layer.scale || 1);
      const scaleY = (layer.height || base.height) / Math.max(1, base.height) * (layer.scale || 1);
      node.style.translate = `${dx}px ${dy}px`;
      node.style.rotate = `${layer.rotation || 0}deg`;
      node.style.scale = `${scaleX} ${scaleY}`;
      node.style.opacity = String(layer.opacity ?? 1);
      if (layer.color) node.style.color = layer.color;
      if (layer.background !== undefined) node.style.background = layer.gradient || layer.background || '';
      if (layer.borderColor) node.style.borderColor = layer.borderColor;
      if (layer.borderWidth != null) node.style.borderWidth = `${layer.borderWidth}px`;
      if (layer.borderRadius != null) node.style.borderRadius = `${layer.borderRadius}px`;
      if (layer.fontFamily) node.style.fontFamily = layer.fontFamily;
      if (layer.fontSize) node.style.fontSize = `${layer.fontSize}px`;
      if (layer.fontWeight) node.style.fontWeight = String(layer.fontWeight);
      if (layer.textAlign) node.style.textAlign = layer.textAlign;
      if (layer.direction && layer.direction !== 'auto') node.style.direction = layer.direction;
      if (layer.filter) node.style.filter = layer.filter;
      if (layer.clipPath) node.style.clipPath = layer.clipPath;
      if (layer.letterSpacing != null) node.style.letterSpacing = `${layer.letterSpacing}px`;
      if (layer.lineHeight != null) node.style.lineHeight = String(layer.lineHeight);
      if (layer.blendMode) node.style.mixBlendMode = layer.blendMode as any;
      if (layer.text != null && node.children.length === 0) node.textContent = layer.text;
      if (layer.imageSrc) {
        const img = node instanceof HTMLImageElement ? node : node.querySelector('img');
        if (img && img.src !== layer.imageSrc) img.src = layer.imageSrc;
      }
      const video = node instanceof HTMLVideoElement ? node : node.querySelector('video');
      const videoSrc = (layer as any).videoSrc as string | undefined;
      if (video && videoSrc && video.src !== videoSrc) { video.src = videoSrc; video.load(); if (playing) void video.play().catch(() => {}); }
      const ec = layer.effectColor || layer.borderColor || layer.color || '#ffd866';
      const p = Math.max(0, Number(layer.effectIntensity ?? 0.75));
      const r = Math.max(2, Number(layer.effectRadius ?? 28));
      if (layer.effect === 'glow' || layer.effect === 'outer-glow') node.style.boxShadow = `0 0 ${r*p}px ${ec}, 0 0 ${r*2*p}px ${ec}66`;
      else if (layer.effect === 'bloom') { node.style.boxShadow = `0 0 ${r*p}px ${ec}99, 0 0 ${r*3*p}px ${ec}44`; node.style.filter = `brightness(${1+.12*p}) saturate(${1+.18*p})`; }
      else if (layer.effect === 'light') node.style.boxShadow = `0 0 ${r*1.4*p}px ${ec}aa, inset 0 0 ${Math.max(2,r/3)}px ${ec}44`;
      else if (layer.effect === 'scanline') node.style.backgroundImage = `repeating-linear-gradient(0deg, transparent 0 5px, ${ec}22 6px 7px)`;
      else if (layer.effect === 'particles') node.style.backgroundImage = `radial-gradient(circle at 25% 35%, ${ec} 0 1px, transparent 2px), radial-gradient(circle at 70% 65%, #fff 0 1px, transparent 2px)`;
    });

    const updateRects = () => {
      const next: Record<string, {left:number;top:number;width:number;height:number}> = {};
      nodes.forEach(node => {
        const id = node.dataset.wabLayerId;
        if (!id || !selectedIds.includes(id)) return;
        const r = node.getBoundingClientRect(); const rr = root.getBoundingClientRect();
        next[id] = { left:r.left-rr.left, top:r.top-rr.top, width:r.width, height:r.height };
      });
      setRects(next);
    };
    updateRects();
    const raf = requestAnimationFrame(updateRects);
    const ro = new ResizeObserver(updateRects); ro.observe(root);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      originals.forEach((o,node) => {
        node.style.transform=o.transform; node.style.translate=o.translate; node.style.rotate=o.rotate; node.style.scale=o.scale;
        node.style.opacity=o.opacity; node.style.display=o.display; node.style.visibility=o.visibility; node.style.color=o.color;
        node.style.background=o.background; node.style.borderColor=o.borderColor; node.style.borderWidth=o.borderWidth;
        node.style.borderRadius=o.borderRadius; node.style.fontFamily=o.fontFamily; node.style.fontSize=o.fontSize;
        node.style.fontWeight=o.fontWeight; node.style.textAlign=o.textAlign as any; node.style.direction=o.direction;
        node.style.filter=o.filter; node.style.boxShadow=o.boxShadow; node.style.letterSpacing=o.letterSpacing; node.style.lineHeight=o.lineHeight;
        node.style.mixBlendMode=o.mixBlendMode as any; node.style.clipPath=o.clipPath;
        if (o.text !== null) node.textContent=o.text;
        const img=node instanceof HTMLImageElement ? node : node.querySelector('img'); if(img && o.imageSrc) img.src=o.imageSrc;
        const video=node instanceof HTMLVideoElement ? node : node.querySelector('video'); if(video && o.videoSrc) video.src=o.videoSrc;
      });
    };
  }, [evaluated, playing, selectedIds.join('|')]);

  // Apply basic draft edits inside the isolated Player Call iframe too.
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    const byId = new Map(evaluated.map(l => [l.id, l]));
    const restore: Array<() => void> = [];
    root.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
      try {
        const doc = frame.contentDocument; if (!doc) return;
        doc.querySelectorAll<HTMLElement>('[data-wab-layer-id]').forEach(node => {
          const id=node.dataset.wabLayerId; const layer=id ? byId.get(id) : undefined; if(!layer) return;
          const old={opacity:node.style.opacity,fontSize:node.style.fontSize,color:node.style.color,background:node.style.background,border:node.style.border,borderRadius:node.style.borderRadius,filter:node.style.filter,text:node.children.length===0?node.textContent:null};
          if(!layer.visible) node.style.display='none'; else node.style.display='';
          node.style.opacity=String(layer.opacity ?? 1);
          if(layer.fontSize) node.style.fontSize=`${layer.fontSize}px`;
          if(layer.color) node.style.color=layer.color;
          if(layer.background!==undefined) node.style.background=layer.gradient||layer.background||'';
          if(layer.borderWidth!=null) node.style.border=`${layer.borderWidth}px ${layer.borderStyle||'solid'} ${layer.borderColor||'#fff'}`;
          if(layer.borderRadius!=null) node.style.borderRadius=`${layer.borderRadius}px`;
          if(layer.filter) node.style.filter=layer.filter;
          if(layer.text!=null && node.children.length===0) node.textContent=layer.text;
          restore.push(()=>{node.style.display='';node.style.opacity=old.opacity;node.style.fontSize=old.fontSize;node.style.color=old.color;node.style.background=old.background;node.style.border=old.border;node.style.borderRadius=old.borderRadius;node.style.filter=old.filter;if(old.text!==null)node.textContent=old.text;});
        });
      } catch {}
    });
    return ()=>restore.forEach(fn=>fn());
  }, [evaluated, playing]);

  // The generic native capture above is the single source of truth.

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden" data-wab-studio-native-root="true"
      onClick={(e) => {
        e.stopPropagation();
        const target=(e.target as HTMLElement | null)?.closest?.('[data-wab-layer-id]') as HTMLElement | null;
        if (target?.dataset.wabLayerId) {
          window.dispatchEvent(new CustomEvent('wab-studio-select-layer',{detail:{id:target.dataset.wabLayerId,additive:e.ctrlKey||e.metaKey}}));
          return;
        }
        // Some original broadcast elements intentionally use pointer-events:none.
        // For those, resolve the clicked object geometrically instead of requiring
        // developers to add another wrapper or overlay. Smallest containing visual
        // object wins, which naturally selects a hand/image/text inside a frame.
        const x=e.clientX, y=e.clientY;
        const candidates=Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-wab-layer-id]')||[]).filter(n=>{
          const r=n.getBoundingClientRect();
          return r.width>2&&r.height>2&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
        }).sort((a,b)=>{
          const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
          return (ra.width*ra.height)-(rb.width*rb.height);
        });
        const picked=candidates[0];
        if(picked?.dataset.wabLayerId) window.dispatchEvent(new CustomEvent('wab-studio-select-layer',{detail:{id:picked.dataset.wabLayerId,additive:e.ctrlKey||e.metaKey}}));
      }}>
      <PublicScoreboard isMiniPreview />
      <div className="absolute inset-0 pointer-events-none z-[99999]" aria-hidden="true">
        {selectedIds.map(id => {
          const r=rects[id]; if(!r) return null;
          return <div key={id} className="absolute border-2 border-yellow-300 shadow-[0_0_0_1px_rgba(0,0,0,.8),0_0_18px_rgba(255,216,102,.35)]" style={{left:r.left,top:r.top,width:r.width,height:r.height}}><div className="absolute -top-5 left-0 rounded bg-yellow-300 text-black px-1.5 py-0.5 text-[7px] font-black">{id}</div></div>;
        })}
      </div>
    </div>
  );
}


function resolvePreviewBinding(layer: DesignLayer, state: MatchState): DesignLayer {
  return resolveDesignBinding(layer, state);
}


function ensureBaseGeometry(node: HTMLElement, root: HTMLElement) {
  const existing=node.dataset.wabStudioBase;
  if(existing){try{return JSON.parse(existing) as {x:number;y:number;width:number;height:number};}catch{}}
  const r=node.getBoundingClientRect(), rr=root.getBoundingClientRect();
  const value={x:Math.max(0,(r.left-rr.left)/Math.max(1,rr.width)*1920),y:Math.max(0,(r.top-rr.top)/Math.max(1,rr.height)*1080),width:Math.max(1,r.width/Math.max(1,rr.width)*1920),height:Math.max(1,r.height/Math.max(1,rr.height)*1080)};
  node.dataset.wabStudioBase=JSON.stringify(value);
  return value;
}

function buildPreviewState(source: MatchState, animationId: DesignAnimationId, previewStage = 'main'): MatchState {
  const base = createInitialMatchState({ ...source.config, competitionMode: animationId === 'team-call' || animationId === 'player-change' ? 'par_equipe' : 'individual' }, source.displayConfig, true);
  const state = structuredClone(source);
  state.id = `studio-preview-${animationId}`; state.status = 'waiting'; state.publicBroadcastLive = true; state.startedAt = undefined; state.finishedAt = undefined;
  state.currentRound = Math.max(1, source.currentRound || 1); state.timeRemaining = source.timeRemaining || 120;
  state.competitionName = source.competitionName || 'WAB-TKD CHAMPIONSHIP'; state.matchNumber = source.matchNumber || 21; state.weightCategory = source.weightCategory || '-68 KG'; state.ageGroup = source.ageGroup || 'SENIOR'; state.gender = source.gender || 'male'; state.matNumber = source.matNumber || 4; state.eventLocation = source.eventLocation || 'WAB-TKD ARENA'; state.eventDate = source.eventDate || '2026';
  state.teamNames = { chung: 'TEAM CHABAB SALE', hong: 'TEAM AL-SHOALA' }; state.clubNames = { chung: 'SALE CLUB', hong: 'AL-SHOALA CLUB' }; state.teamCountry = { chung: 'MAR', hong: 'MAR' };
  state.chung = { ...state.chung, player: { ...state.chung.player, name: state.chung.player?.name && state.chung.player.name !== 'CHUNG' ? state.chung.player.name : 'BLUE PLAYER', nationality: state.chung.player?.nationality || 'MAR' }, totalScore: 7, gamjeomCount: 1 };
  state.hong = { ...state.hong, player: { ...state.hong.player, name: state.hong.player?.name && state.hong.player.name !== 'HONG' ? state.hong.player.name : 'RED PLAYER', nationality: state.hong.player?.nationality || 'MAR' }, totalScore: 5, gamjeomCount: 0 };
  state.teamRoster = { chung:[1,2,3,4,5].map(i=>({name:`BLUE PLAYER ${i}`,nationality:'MAR',playerNumber:i,seedNumber:i})), hong:[1,2,3,4,5].map(i=>({name:`RED PLAYER ${i}`,nationality:'MAR',playerNumber:i,seedNumber:i})) } as any;
  state.callScreenActive=false; state.callAnimation=undefined; state.singlePlayerCall=undefined; state.playerCallPreviewState=undefined; state.substitutionAnimation=undefined; state.pendingSubstitution=undefined; state.koAnimation=undefined; state.roundTieReview=undefined; state.roundCallPreview=undefined; state.mvpReveal=undefined; state.poolMvpReveal=undefined; state.ivrAnimation=undefined; state.goldenPointAnimation=undefined; state.matchupAnimation=undefined; state.result=undefined; state.resultConfirmed=undefined;
  const now=Date.now();
  switch(animationId){
    case 'team-call': state.config={...state.config,competitionMode:'par_equipe'}; state.callScreenActive=true; state.teamCallStatus={chung:'called',hong:'called'}; state.callAnimation={phase:'team',side:'hong',teamName:state.teamNames.hong,clubName:state.clubNames.hong,teamCountry:'MAR',teamCategory:state.weightCategory,ageGroup:state.ageGroup,animationId:`studio-team-${animationId}`,roster:state.teamRoster.hong}; state.animationController={state:'CALLING_TEAM',activeAnimation:'TEAM_CALL',animationId:`studio-team-${animationId}`,instanceId:`studio-team-${animationId}`,startedAt:now}; state.autoCallSequence={active:true,mode:'teams',stage:'GREETING',startedAt:now,stageEndsAt:now+100000} as any; break;
    case 'player-call': state.config={...state.config,competitionMode:'knockout'}; state.callScreenActive=true; state.singlePlayerCall={side:'hong',animationId:`studio-player-${animationId}`,status:'calling',ts:now,playerName:'RED PLAYER',playerNumber:21,seedNumber:1,category:state.weightCategory,teamName:state.teamNames.hong,clubName:state.clubNames.hong,country:'MAR'}; state.callAnimation={phase:'player',side:'hong',animationId:`studio-player-${animationId}`,playerName:'RED PLAYER',playerNumber:21,seedNumber:1,category:state.weightCategory,gender:state.gender,tournamentName:state.competitionName,teamName:state.teamNames.hong,clubName:state.clubNames.hong,playerNationality:'MAR'}; state.animationController={state:'CALLING_PLAYER',activeAnimation:'SINGLE_PLAYER_CALL',animationId:`studio-player-${animationId}`,instanceId:`studio-player-${animationId}`,startedAt:now}; break;
    case 'player-change': state.config={...state.config,competitionMode:'par_equipe',playerChangeAnimation:true}; state.teamMode='substitution'; state.substitutionAnimation={side:'hong',oldPlayer:{name:'RED PLAYER 1',nationality:'MAR',playerNumber:1},newPlayer:{name:'RED PLAYER 2',nationality:'MAR',playerNumber:2},ts:now}; state.animationController={state:'CALLING_PLAYER',activeAnimation:'PLAYER_CHANGE' as any,animationId:`studio-change-${animationId}`,instanceId:`studio-change-${animationId}`,startedAt:now}; break;
    case 'matchup': state.config={...state.config,competitionMode:'knockout'}; state.matchupAnimation={animationId:`studio-matchup-${animationId}`,status:previewStage==='ready'?'ready':'showing',ts:now}; state.selectedCallPlayers={chung:state.chung.player,hong:state.hong.player}; state.animationController={state:'IDLE',activeAnimation:'MATCHUP' as any,animationId:`studio-matchup-${animationId}`,instanceId:`studio-matchup-${animationId}`,startedAt:now}; break;
    case 'winner': case 'match-result': state.config={...state.config,competitionMode:'knockout'}; state.status='finished'; state.result={winner:'chung',method:'PTF',finalScore:{chung:17,hong:13}}; state.roundWinners=[{round:1,winner:'chung',score:{chung:6,hong:4}},{round:2,winner:'hong',score:{chung:4,hong:5}},{round:3,winner:'chung',score:{chung:7,hong:4}}] as any; state.finishedAt=now; state.resultConfirmed=true; state.animationController={state:'IDLE',activeAnimation:(animationId==='winner'?undefined:'MATCH_RESULT') as any,animationId:`studio-result-${animationId}`,instanceId:`studio-result-${animationId}`,startedAt:now}; break;
    case 'ko': state.status='finished'; state.koAnimation={side:'chung',ts:now}; state.result={winner:'chung',method:'KO',finalScore:{chung:10,hong:2}}; state.animationController={state:'IDLE',activeAnimation:'KO' as any,animationId:`studio-ko-${animationId}`,instanceId:`studio-ko-${animationId}`,startedAt:now}; break;
    case 'doctor': state.status='doctor'; state.animationController={state:'CALLING_PLAYER',activeAnimation:'DOCTOR' as any,animationId:`studio-doctor-${animationId}`,instanceId:`studio-doctor-${animationId}`,startedAt:now}; break;
    case 'kyeshi': state.status='kyeshi'; state.timeRemaining=42; state.animationController={state:'CALLING_PLAYER',activeAnimation:'KYESHI' as any,animationId:`studio-kyeshi-${animationId}`,instanceId:`studio-kyeshi-${animationId}`,startedAt:now}; break;
    case 'woose-girok': state.status='rest'; state.roundTieReview={phase:(previewStageFrom(animationId,previewStage)) as any,ts:now,countdownStep:3,votes:{left:'chung',center:'chung',right:'hong'},judgeNames:{left:'JUDGE 1',center:'CENTER REFEREE',right:'JUDGE 3'},judgePhotos:{}}; state.animationController={state:'IDLE',activeAnimation:'WOO_SE_GIROK' as any,animationId:`studio-girok-${animationId}`,instanceId:`studio-girok-${animationId}`,startedAt:now}; break;
    case 'video-replay': state.status='rest'; state.ivrAnimation={decision:previewStage==='rejected'?'rejected':'accepted',side:previewStage==='red'?'hong':'chung',ts:now}; state.ivrRequestedBy=state.ivrAnimation.side; state.animationController={state:'IDLE',activeAnimation:'VIDEO_REPLAY' as any,animationId:`studio-ivr-${animationId}`,instanceId:`studio-ivr-${animationId}`,startedAt:now}; break;
    case 'golden-point': state.status='fighting'; state.isGoldenRound=true; state.goldenPointAnimation={ts:now}; state.animationController={state:'IDLE',activeAnimation:'GOLDEN_POINT' as any,animationId:`studio-golden-${animationId}`,instanceId:`studio-golden-${animationId}`,startedAt:now}; break;
    case 'round-call': state.status='rest'; state.teamMode='rotation'; state.roundCallPreview={round:2,chung:{name:'BLUE PLAYER 2',nationality:'MAR',playerNumber:2,seedNumber:2},hong:{name:'RED PLAYER 2',nationality:'MAR',playerNumber:2,seedNumber:2}}; state.animationController={state:'IDLE',activeAnimation:'ROUND_CALL' as any,animationId:`studio-round-call-${animationId}`,instanceId:`studio-round-call-${animationId}`,startedAt:now}; break;
    case 'point-gap': state.status='fighting'; state.ptgActive=true; state.ptgWinner=previewStage==='red'?'hong':'chung'; state.ptgValueAtTrigger=12; state.chung.totalScore=15; state.hong.totalScore=3; state.animationController={state:'IDLE',activeAnimation:'PTG' as any,animationId:`studio-ptg-${animationId}`,instanceId:`studio-ptg-${animationId}`,startedAt:now}; break;
    case 'standings': state.status='rest'; state.showStandings=true; state.leagueStandings=[{rank:1,playerId:'p1',playerName:'BLUE PLAYER',wins:4,losses:0,pointsFor:48,pointsAgainst:21},{rank:2,playerId:'p2',playerName:'RED PLAYER',wins:3,losses:1,pointsFor:42,pointsAgainst:28},{rank:3,playerId:'p3',playerName:'PLAYER THREE',wins:2,losses:2,pointsFor:31,pointsAgainst:34}] as any; state.animationController={state:'IDLE',activeAnimation:'STANDINGS' as any,animationId:`studio-standings-${animationId}`,instanceId:`studio-standings-${animationId}`,startedAt:now}; break;
    case 'hit-stats': state.status='fighting'; state.events=[{id:'h1',timestamp:now-2500,type:'score',side:'chung',points:2,reason:'BODY KICK'},{id:'h2',timestamp:now-1800,type:'score',side:'hong',points:1,reason:'PUNCH'},{id:'h3',timestamp:now-900,type:'score',side:'chung',points:3,reason:'HEAD KICK'}] as any; state.animationController={state:'IDLE',activeAnimation:'HIT_STATS' as any,animationId:`studio-hits-${animationId}`,instanceId:`studio-hits-${animationId}`,startedAt:now}; break;
    case 'player-test': state.status='fighting'; state.testMode=true; state.timeRemaining=30; state.animationController={state:'IDLE',activeAnimation:'PLAYER_TEST' as any,animationId:`studio-test-${animationId}`,instanceId:`studio-test-${animationId}`,startedAt:now}; break;
  }
  if(previewStage==='blue'&&animationId==='player-call') state.callAnimation={...(state.callAnimation||{}),side:'chung',phase:'player',playerName:'BLUE PLAYER',playerNumber:21,seedNumber:2,category:state.weightCategory,gender:state.gender,tournamentName:state.competitionName,teamName:state.teamNames.chung,clubName:state.clubNames.chung,playerNationality:'MAR'} as any;
  if(previewStage==='red'&&animationId==='player-call') state.callAnimation={...(state.callAnimation||{}),side:'hong',phase:'player',playerName:'RED PLAYER',playerNumber:21,seedNumber:1,category:state.weightCategory,gender:state.gender,tournamentName:state.competitionName,teamName:state.teamNames.hong,clubName:state.clubNames.hong,playerNationality:'MAR'} as any;
  return {...base,...state,config:{...base.config,...state.config}};
}
function previewStageFrom(_animationId:DesignAnimationId, stage:string){return stage==='ai'?'ai':stage==='voting'?'voting':'result';}

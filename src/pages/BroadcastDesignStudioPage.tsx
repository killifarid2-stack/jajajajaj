import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Eye, EyeOff, Lock, Unlock, Undo2, Redo2, Play, Pause, Square,
  Plus, Trash2, Copy, Layers3, Image as ImageIcon, Type, SquareDashed,
  Sparkles, Save, Upload, Download, RotateCcw, CheckCircle2, Monitor, Maximize2,
  Move, Group, Ungroup, ChevronDown, ChevronRight, Languages, Grid3X3, Settings, ZoomIn, ZoomOut, Crosshair, Clipboard, RotateCw, Link2, Unlink2, Wand2, Bug,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  DESIGN_ANIMATIONS, createDesign, getDesign, publishDesign, restoreOriginal, saveDesign,
  subscribeDesign, evaluateLayerAtTime, evaluateDesignLayersAtTime, upsertKeyframe, removeKeyframeAt, isAnimatableProperty, getPresets, savePreset, applyPreset, serializeDesignFile, parseDesignFile, getPublishedHistory, rollbackPublished, getDesignTemplates, saveDesignTemplate, applyDesignTemplate, deleteDesignTemplate, getProjectHistory, type BroadcastDesign, type DesignAnimationId, type DesignLayer, type LayerType, type EasingKind, type BlendMode, type TransitionKind, type RenderQuality,
} from '@/lib/broadcast-design';
import { BROADCAST_DESIGN_HEIGHT, BROADCAST_DESIGN_WIDTH } from '@/lib/broadcast-viewport';
import type { BroadcastRuntimeMetrics } from '@/lib/broadcast-runtime-metrics';
import BroadcastDesignStudioPreview from '@/components/BroadcastDesignStudioPreview';
import { askExternalDesignAI } from '@/lib/design-ai';
import { cloudLoadDesign, cloudSaveDesign } from '@/lib/broadcast-design-cloud';
import { applyDesignAIResult, parseLocalDesignCommand, duplicateLayerTree, copyStyle } from '@/lib/design-studio-advanced';
import { createAdvancedDesignState, buildDesignPackage, exportDesignPackage, importDesignPackage, saveDesignPackage, getDesignPackage, createMacro, enqueueAnimation, type DesignPackage, type GlobalBroadcastVariables, type ConditionalRule, type AnimationQueueItem } from '@/lib/broadcast-design-advanced';

const HISTORY_LIMIT = 50;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export default function BroadcastDesignStudioPage() {
  const { lang } = useI18n();
  const [studioLanguage, setStudioLanguage] = useState<'en'|'ar'|'fr'>(() => { try { return (localStorage.getItem('wab-tkd-design-studio-language-v1') as 'en'|'ar'|'fr') || 'ar'; } catch { return 'ar'; } });
  const uiLang = studioLanguage || lang;
  const T = (en: string, ar: string, fr = en) => uiLang === 'ar' ? ar : uiLang === 'fr' ? fr : en;
  const animationLabel = (id: DesignAnimationId, fallback: string) => ({
    'team-call': T('TEAM CALL','استدعاء الفريق','APPEL ÉQUIPE'),
    'player-call': T('PLAYER CALL','استدعاء اللاعب','APPEL JOUEUR'),
    'player-change': T('PLAYER CHANGE','تغيير اللاعب','CHANGEMENT JOUEUR'),
    'winner': T('WINNER','الفائز','VAINQUEUR'),
    'ko': T('KO','إقصاء بالضربة القاضية','K.O.'),
    'doctor': T('DOCTOR','الطبيب','MÉDECIN'),
    'kyeshi': T('KYESHI','كيشي / وقت الإصابة','KYESHI'),
    'woose-girok': T('WOO-SE-GIROK','قرار الحكام — 우세기록','WOO-SE-GIROK'),
    'match-result': T('MATCH RESULT','نتيجة المباراة','RÉSULTAT DU MATCH'),
    'custom': T('CUSTOM','مخصص','PERSONNALISÉ'),
  } as Record<DesignAnimationId,string>)[id] || fallback;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mirrorPublic = params.get('mirror') === 'public';
  const mirrorDisplayId = params.get('displayId') || '';
  const requested = (params.get('animationId') || 'team-call') as DesignAnimationId;
  const [animationId, setAnimationId] = useState<DesignAnimationId>(DESIGN_ANIMATIONS.some(a => a.id === requested) ? requested : 'team-call');
  const [design, setDesign] = useState<BroadcastDesign>(() => getDesign(DESIGN_ANIMATIONS.some(a => a.id === requested) ? requested : 'team-call'));
  const [history, setHistory] = useState<BroadcastDesign[]>([]);
  const [future, setFuture] = useState<BroadcastDesign[]>([]);
  const [presets, setPresets] = useState(() => getPresets());
  const [designTemplates, setDesignTemplates] = useState(() => getDesignTemplates());
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateScope, setTemplateScope] = useState<'global'|'tournament'|'competition-mode'|'gender'|'age'|'weight'|'tournament-weight'>('global');
  const [projectSnapshots, setProjectSnapshots] = useState<BroadcastDesign[]>(() => getProjectHistory(animationId));
  const [easing, setEasing] = useState<EasingKind>('smooth');
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [snap, setSnap] = useState(true);
  const [commandHelp, setCommandHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [designZoom, setDesignZoom] = useState(0.52);
  const [copiedLayer, setCopiedLayer] = useState<DesignLayer | null>(null);
  const [copiedKeyframes, setCopiedKeyframes] = useState<any[]>([]);
  const [graphProperty, setGraphProperty] = useState<'x'|'y'|'scale'|'rotation'|'opacity'|'effectIntensity'|'effectRadius'>('x');
  const [pathDrawMode, setPathDrawMode] = useState(false);
  const [safeArea, setSafeArea] = useState(true);
  const [swapTargetId, setSwapTargetId] = useState('');
  const [playing, setPlaying] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);
  const [previewStage, setPreviewStage] = useState('main');
  const [scanAllStages, setScanAllStages] = useState(false);
  const PREVIEW_STAGES = ['main','blue','red','ready','accepted','rejected','ai','voting'];
  const [screenSelectMode, setScreenSelectMode] = useState(true);
  const [liveEditMode, setLiveEditMode] = useState(false);
  const liveEditChannelRef = useRef<BroadcastChannel | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [assetSearch, setAssetSearch] = useState('');
  const [localAssets, setLocalAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [customFonts, setCustomFonts] = useState<Array<{ name: string; source: string }>>([]);
  const fontFamilies = useMemo(() => ['Inter','Arial','Helvetica','Roboto','Montserrat','Poppins','Oswald','Bebas Neue','Rajdhani','Orbitron','Teko','Cairo','Tajawal','Noto Sans Arabic','Amiri','Noto Kufi Arabic','Segoe UI'], []);
  const [inspectorStatus, setInspectorStatus] = useState<'idle'|'waiting'|'captured'>('idle');
  const [isolatedLayerId, setIsolatedLayerId] = useState<string | null>(null);
  const [beforeAfter, setBeforeAfter] = useState<'modified'|'original'>('modified');
  const [renderQuality, setRenderQuality] = useState<RenderQuality>(() => (getDesign(animationId).renderQuality || 'high') as RenderQuality);
  const [debugOpen, setDebugOpen] = useState(false);
  const [runtimeMetrics, setRuntimeMetrics] = useState<BroadcastRuntimeMetrics | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveReadyRef = useRef(false);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [finalSystemsOpen, setFinalSystemsOpen] = useState(false);
  const [advancedPkg, setAdvancedPkg] = useState<DesignPackage>(() => getDesignPackage(animationId) || buildDesignPackage(getDesign(animationId), createAdvancedDesignState()));
  const [externalAiBusy, setExternalAiBusy] = useState(false);
  const [studioFullscreen, setStudioFullscreen] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [assetFilter, setAssetFilter] = useState<'all'|'image'|'logo'|'flag'|'photo'|'effect'>('all');
  const tournamentId = params.get('tournamentId') || null;
  const scanIndexRef = useRef(0);
  useEffect(() => {
    if (!scanAllStages) return;
    scanIndexRef.current = 0;
    setPreviewStage(PREVIEW_STAGES[0]);
    const timer = window.setInterval(() => {
      scanIndexRef.current += 1;
      if (scanIndexRef.current >= PREVIEW_STAGES.length) {
        window.clearInterval(timer);
        setScanAllStages(false);
        setPreviewStage('main');
        return;
      }
      setPreviewStage(PREVIEW_STAGES[scanIndexRef.current]);
    }, 650);
    return () => window.clearInterval(timer);
  }, [scanAllStages]);
  const [assistantCommand, setAssistantCommand] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<Array<{role:'user'|'assistant';text:string}>>([]);
  useEffect(() => { setAdvancedPkg(getDesignPackage(animationId) || buildDesignPackage(design, createAdvancedDesignState())); }, [animationId]);
  const [publishedHistory, setPublishedHistory] = useState<BroadcastDesign[]>(() => getPublishedHistory(animationId));
  const lastPreviewDesignRef = useRef<BroadcastDesign | null>(null);
  useEffect(() => { const onMetrics = (e: Event) => setRuntimeMetrics((e as CustomEvent<BroadcastRuntimeMetrics>).detail); window.addEventListener('wab-broadcast-runtime-metrics', onMetrics as EventListener); return () => window.removeEventListener('wab-broadcast-runtime-metrics', onMetrics as EventListener); }, []);
  const latestDesignRef = useRef<BroadcastDesign | null>(null);

  // LIVE EDIT: optionally mirror the current Draft to the running broadcast window.
  // This is deliberately opt-in so ordinary Draft edits never leak to the audience.
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try { ch = new BroadcastChannel('wab-broadcast-design-live-edit-v1'); liveEditChannelRef.current = ch; } catch { ch = null; }
    return () => { try { ch?.postMessage({ type: 'live-edit-clear', animationId }); ch?.close(); } catch {} liveEditChannelRef.current = null; };
  }, [animationId]);

  useEffect(() => {
    const ch = liveEditChannelRef.current;
    if (!ch || !liveEditMode) return;
    try {
      ch.postMessage({ type: 'live-edit', animationId, design, runtimeTime: design.currentTime, enabled: true });
    } catch {}
  }, [design, animationId, liveEditMode]);
  const resizeState = useRef<any>(null);
  const rotateState = useRef<any>(null);
  const pathDragState = useRef<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'red-team-group': true, 'blue-team-group': true, center: true });
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLInputElement>(null);
  const designFileRef = useRef<HTMLInputElement>(null);
  const assetCatalog = useMemo(() => Object.entries(import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,webp,svg}', { eager: true, query: '?url', import: 'default' })) as Array<[string, string]>, []);
  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    const builtIn = assetCatalog.map(([path, url]) => ({ id: `builtin:${path}`, name: path.split('/').pop() || path, url }));
    const all = [...localAssets, ...builtIn];
    const categoryMatch=(a:any)=>{ if(assetFilter==='all')return true; const n=a.name.toLowerCase(); if(assetFilter==='flag')return n.includes('flag')||n.includes('/flags/'); if(assetFilter==='logo')return n.includes('logo')||n.includes('crest'); if(assetFilter==='photo')return n.includes('player')||n.includes('photo')||n.includes('portrait'); if(assetFilter==='effect')return n.includes('glow')||n.includes('smoke')||n.includes('particle')||n.includes('light'); return true; };
    const filtered=all.filter(categoryMatch); return q ? filtered.filter(a => a.name.toLowerCase().includes(q)) : filtered;
  }, [assetCatalog, localAssets, assetSearch]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wab-tkd-design-local-assets-v1') || '[]');
      if (Array.isArray(saved)) setLocalAssets(saved.filter(a => a?.id && a?.name && a?.url).slice(0, 40));
    } catch {}
  }, []);

  useEffect(() => {
    const fonts = design.layers.filter(l => l.type === 'text' && l.fontSource && l.fontFamily).map(l => ({ name: l.fontFamily as string, source: l.fontSource as string }));
    fonts.forEach(async ({ name, source }) => {
      try { if (document.fonts.check(`16px \"${name}\"`)) return; const face = new FontFace(name, `url(${source})`); await face.load(); document.fonts.add(face); } catch {}
    });
    setCustomFonts(current => { const merged=[...current,...fonts]; return merged.filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i); });
  }, [design.layers]);

  useEffect(() => {
    const initial = getDesign(animationId);
    const live = { ...initial, livePreview: true, status: 'draft' as const };
    setDesign(live);
    return subscribeDesign((next) => {
      if (next.animationId === animationId) setDesign(next);
    }, animationId);
  }, [animationId]);

  // Inspect the real animation running in the Operator window. The Studio is
  // the only place with editing/freeze controls; the Public Display remains
  // output-only. Captured DOM layers are merged into this animation draft and
  // only become persistent after SAVE/PUBLISH.
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('wab-broadcast-design-inspector-v1');
      channel.onmessage = (event) => {
        const msg = event.data;
        if (msg?.type !== 'snapshot' || msg.animationId !== animationId || !Array.isArray(msg.layers)) return;
        setDesign(current => {
          const byId = new Map(current.layers.map(l => [l.id, l]));
          const importedIds: string[] = [];
          const merged = msg.layers.map((captured: DesignLayer) => {
            const existing = byId.get(captured.id);
            if (!existing) {
              importedIds.push(captured.id);
              return captured;
            }
            // Capture refreshes the real source geometry/style without
            // destroying Studio-only state (keyframes, bindings, effects,
            // masks, parent relationships and user locks).
            return {
              ...captured,
              ...existing,
              x: captured.x, y: captured.y, width: captured.width, height: captured.height,
              rotation: captured.rotation, scale: captured.scale, opacity: captured.opacity,
              zIndex: captured.zIndex,
              color: captured.color ?? existing.color,
              background: captured.background ?? existing.background,
              borderColor: captured.borderColor ?? existing.borderColor,
              borderWidth: captured.borderWidth ?? existing.borderWidth,
              borderRadius: captured.borderRadius ?? existing.borderRadius,
              fontFamily: captured.fontFamily ?? existing.fontFamily,
              fontSize: captured.fontSize ?? existing.fontSize,
              fontWeight: captured.fontWeight ?? existing.fontWeight,
              textAlign: captured.textAlign ?? existing.textAlign,
              direction: captured.direction ?? existing.direction,
              text: captured.text ?? existing.text,
              imageSrc: captured.imageSrc ?? existing.imageSrc,
              filter: captured.filter ?? existing.filter,
              letterSpacing: captured.letterSpacing ?? existing.letterSpacing,
              lineHeight: captured.lineHeight ?? existing.lineHeight,
              blendMode: captured.blendMode ?? existing.blendMode,
              sourceKey: captured.sourceKey || existing.sourceKey,
              parentId: captured.parentId ?? existing.parentId,
              children: captured.children ?? existing.children,
              keyframes: existing.keyframes,
              binding: existing.binding ?? captured.binding,
              effect: existing.effect ?? captured.effect,
              effectColor: existing.effectColor ?? captured.effectColor,
              effectIntensity: existing.effectIntensity ?? captured.effectIntensity,
              effectRadius: existing.effectRadius ?? captured.effectRadius,
              maskId: existing.maskId ?? captured.maskId,
              maskFeather: existing.maskFeather ?? captured.maskFeather,
              clipPath: existing.clipPath ?? captured.clipPath,
              motionPath: existing.motionPath ?? captured.motionPath,
              motionPathReverse: existing.motionPathReverse ?? captured.motionPathReverse,
              motionPathLoop: existing.motionPathLoop ?? captured.motionPathLoop,
              motionPathRotate: existing.motionPathRotate ?? captured.motionPathRotate,
            };
          });
          const capturedSet = new Set(msg.layers.map((l: DesignLayer) => l.id));
          // The original scaffold in createDesign() is only a placeholder
          // for animations that have not yet been inspected. Once the real
          // DOM is captured, remove that scaffold so EDIT mode shows the
          // actual animation instead of a black/placeholder composition.
          // User-created Studio layers (layer-*) are preserved. Previously
          // captured DOM layers are replaced in-place by the fresh snapshot.
          const untouched = current.layers.filter(l =>
            !capturedSet.has(l.id) && (l.id.startsWith('layer-') || l.id.startsWith('image-') || !!l.sourceKey?.startsWith(`custom:${animationId}:`) || !!l.sourceKey?.startsWith('studio:addition:'))
          );
          const selected = importedIds.length ? [importedIds[0]] : [msg.layers[0]?.id].filter(Boolean) as string[];
          return {
            ...current,
            layers: [...untouched, ...merged],
            selectedLayerId: selected[selected.length - 1] || current.selectedLayerId,
            selectedLayerIds: selected,
          };
        });
        setInspectorStatus('captured');
      };
      channel.postMessage({ type: 'capture', animationId });
      setInspectorStatus('waiting');
    } catch { setInspectorStatus('idle'); }
    return () => channel?.close();
  }, [animationId]);

  // The Studio preview itself is also an inspector source. This means the
  // designer no longer needs to open Operator/another window just to populate
  // the Layer Tree. The same real PublicScoreboard DOM mounted in the preview
  // reports every declared visual layer (including images, text, frames,
  // videos and judge/decision artwork). Existing keyframes/bindings are kept.
  useEffect(() => {
    const onPreviewSnapshot = (event: Event) => {
      const msg = (event as CustomEvent<{animationId:string; layers:DesignLayer[]}>).detail;
      if (!msg || msg.animationId !== animationId || !Array.isArray(msg.layers) || !msg.layers.length) return;
      setDesign(current => {
        const byId = new Map(current.layers.map(l => [l.id, l]));
        const merged = msg.layers.map(captured => {
          const existing = byId.get(captured.id);
          if (!existing) return captured;
          return {
            ...captured, ...existing,
            x: captured.x, y: captured.y, width: captured.width, height: captured.height,
            zIndex: captured.zIndex, visible: captured.visible,
            color: captured.color ?? existing.color, background: captured.background ?? existing.background,
            borderColor: captured.borderColor ?? existing.borderColor, borderWidth: captured.borderWidth ?? existing.borderWidth,
            borderRadius: captured.borderRadius ?? existing.borderRadius, fontFamily: captured.fontFamily ?? existing.fontFamily,
            fontSize: captured.fontSize ?? existing.fontSize, fontWeight: captured.fontWeight ?? existing.fontWeight,
            textAlign: captured.textAlign ?? existing.textAlign, direction: captured.direction ?? existing.direction,
            text: captured.text ?? existing.text, imageSrc: captured.imageSrc ?? existing.imageSrc,
            sourceKey: captured.sourceKey || existing.sourceKey, parentId: captured.parentId ?? existing.parentId,
            children: captured.children ?? existing.children, keyframes: existing.keyframes,
            binding: existing.binding ?? captured.binding, effect: existing.effect ?? captured.effect,
            effectColor: existing.effectColor ?? captured.effectColor, effectIntensity: existing.effectIntensity ?? captured.effectIntensity,
            effectRadius: existing.effectRadius ?? captured.effectRadius, motionPath: existing.motionPath ?? captured.motionPath,
            maskId: existing.maskId ?? captured.maskId, clipPath: existing.clipPath ?? captured.clipPath,
            videoSrc: (existing as any).videoSrc ?? (captured as any).videoSrc,
          } as DesignLayer;
        });
        const capturedIds = new Set(msg.layers.map(l => l.id));
        const custom = current.layers.filter(l => !capturedIds.has(l.id) && (l.id.startsWith('layer-') || l.id.startsWith('image-') || !!l.sourceKey?.startsWith(`custom:${animationId}:`) || !!l.sourceKey?.startsWith('studio:addition:')));
        const selected = current.selectedLayerIds?.filter(id => capturedIds.has(id)) || [];
        return { ...current, layers: [...custom, ...merged], selectedLayerId: selected[0] || current.selectedLayerId || merged[0]?.id || null, selectedLayerIds: selected.length ? selected : (current.selectedLayerId && capturedIds.has(current.selectedLayerId) ? [current.selectedLayerId] : merged[0] ? [merged[0].id] : []) };
      });
      setInspectorStatus('captured');
    };
    window.addEventListener('wab-studio-preview-snapshot', onPreviewSnapshot as EventListener);
    return () => window.removeEventListener('wab-studio-preview-snapshot', onPreviewSnapshot as EventListener);
  }, [animationId]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setDesign(current => {
        if (!playing || current.frozen) return current;
        const out = Math.min(current.duration, current.playback?.outPoint ?? current.duration);
        const direction = current.playback?.reverse ? -1 : 1;
        const nextTime = current.currentTime + (0.016 * playbackSpeed * direction);
        const start = Math.max(0,current.playback?.inPoint ?? 0);
        if ((!current.playback?.reverse && nextTime >= out) || (current.playback?.reverse && nextTime <= start)) {
          if (current.playback?.loop) return { ...current, currentTime: current.playback?.reverse ? out : start };
          setPlaying(false); return { ...current, currentTime: current.playback?.reverse ? start : out };
        }
        return { ...current, currentTime: current.playback?.reverse ? Math.max(start,nextTime) : Math.min(out,nextTime) };
      });
    }, 16);
    return () => window.clearInterval(t);
  }, [playing, playbackSpeed]);

  // Photoshop-style command map. Inputs/content-editable keep their native typing behavior.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (typing && e.key !== 'Escape') return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && key === 's') { e.preventDefault(); save(); return; }
      if (mod && key === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (mod && key === 'g') { e.preventDefault(); e.shiftKey ? ungroup() : groupSelected(); return; }
      if (mod && key === 'c') { e.preventDefault(); if (selected) setCopiedLayer(clone(selected)); return; }
      if (mod && key === 'v') { e.preventDefault(); if (copiedLayer) pasteLayer(); return; }
      if (mod && key === 'a') { e.preventDefault(); setDesign(d => ({ ...d, selectedLayerId: null, selectedLayerIds: d.layers.filter(l => l.visible && !l.locked).map(l => l.id) })); return; }
      if (mod && e.shiftKey && key === 'a') { e.preventDefault(); setDesign(d => ({ ...d, selectedLayerIds: [], selectedLayerId: null })); return; }
      if (mod && e.key === ']') { e.preventDefault(); updateLayer(design.selectedLayerId || '', { zIndex: (selected?.zIndex || 0) + 1 }, 'Bring forward'); return; }
      if (mod && e.key === '[') { e.preventDefault(); updateLayer(design.selectedLayerId || '', { zIndex: Math.max(0,(selected?.zIndex || 0) - 1) }, 'Send backward'); return; }
      if (mod && e.shiftKey && e.key === ']') { e.preventDefault(); updateLayer(design.selectedLayerId || '', { zIndex: 9999 }, 'Bring to front'); return; }
      if (mod && e.shiftKey && e.key === '[') { e.preventDefault(); updateLayer(design.selectedLayerId || '', { zIndex: 0 }, 'Send to back'); return; }
      if (mod && key === 'j') { e.preventDefault(); duplicateSelected(); return; }
      if (!mod && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && selectedIds.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        selectedIds.forEach(id => updateLayer(id, { x: (design.layers.find(l=>l.id===id)?.x || 0)+dx, y: (design.layers.find(l=>l.id===id)?.y || 0)+dy }, 'Nudge selection'));
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
      if (e.key === 'Escape') { setCommandHelp(false); setDesign(d => ({...d, selectedLayerIds: [], selectedLayerId: null})); return; }
      if (e.key === ' ') { e.preventDefault(); setPlaying(v => !v); return; }
      if (e.key === 'Home') { e.preventDefault(); setDesign(d => ({...d,currentTime:0})); return; }
      if (e.key === 'End') { e.preventDefault(); setDesign(d => ({...d,currentTime:d.duration})); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setDesign(d => ({...d,currentTime:Math.max(0,d.currentTime-(e.shiftKey?.1:.016))})); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); setDesign(d => ({...d,currentTime:Math.min(d.duration,d.currentTime+(e.shiftKey?.1:.016))})); return; }
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); addKeyframe(); return; }
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); setDesign(d => ({...d,frozen:!d.frozen})); return; }
      if (e.key === 'F2' && selected) { e.preventDefault(); const name=window.prompt('Layer name',selected.name); if(name) updateLayer(selected.id,{name},'Rename layer'); return; }
      if (!mod && key === 'v') return;
      if (!mod && key === 't') { addLayer('text'); return; }
      if (!mod && key === 'r') { addLayer('frame'); return; }
      if (!mod && key === 'i') { fileRef.current?.click(); return; }
      if (!mod && key === 'e') { addLayer('effect'); return; }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); setCommandHelp(v=>!v); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  latestDesignRef.current = design;
  const createOriginalSnapshot = (id: DesignAnimationId) => createDesign(id);
  const descendantIdsLocal = (rootId: string, layers: DesignLayer[]) => { const out = new Set<string>(); const walk=(id:string)=>layers.filter(l=>l.parentId===id).forEach(c=>{out.add(c.id);walk(c.id)}); walk(rootId); return out; };
  const rawSelected = design.layers.find(l => l.id === design.selectedLayerId) || null;
  const evaluatedLayers = useMemo(() => evaluateDesignLayersAtTime(design, design.currentTime), [design, design.currentTime]);
  const originalDesign = useMemo(() => { const base = createOriginalSnapshot(animationId); return base; }, [animationId]);
  const visibleEditorLayers = useMemo(() => {
    const source = beforeAfter === 'original' ? evaluateDesignLayersAtTime(originalDesign, design.currentTime) : evaluatedLayers;
    const isolated = isolatedLayerId ? (() => { const ids = new Set([isolatedLayerId, ...descendantIdsLocal(isolatedLayerId, source)]); return source.filter(l => ids.has(l.id)); })() : source;
    const qualityFactor = renderQuality === 'low' ? .45 : renderQuality === 'medium' ? .7 : 1;
    return isolated.map(l => l.type === 'effect' ? { ...l, effectIntensity: (l.effectIntensity ?? .75) * qualityFactor, effectRadius: (l.effectRadius ?? 28) * qualityFactor } : l);
  }, [beforeAfter, originalDesign, design.currentTime, evaluatedLayers, isolatedLayerId, renderQuality]);
  const selected = rawSelected ? (evaluatedLayers.find(l => l.id === rawSelected.id) || evaluateLayerAtTime(rawSelected, design.currentTime)) : null;
  const roots = useMemo(() => design.layers.filter(l => !l.parentId).sort((a, b) => a.zIndex - b.zIndex), [design.layers]);
  const childrenOf = (id: string) => design.layers.filter(l => l.parentId === id).sort((a, b) => a.zIndex - b.zIndex);

  useEffect(() => {
    let cancelled=false;
    if (!tournamentId) return;
    void cloudLoadDesign(animationId,tournamentId,mirrorDisplayId||null).then(cloud=>{
      if(cancelled || !cloud) return;
      setDesign(prev=>({ ...cloud, selectedLayerId:prev.selectedLayerId, selectedLayerIds:prev.selectedLayerIds, currentTime:0, status:'draft' }));
    }).catch(()=>{});
    return()=>{cancelled=true};
  },[animationId,tournamentId,mirrorDisplayId]);

  useEffect(() => {
    if (!autosaveReadyRef.current) { autosaveReadyRef.current = true; return; }
    if (playing || design.status === 'published') return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      try {
        const snapshot = { ...design, currentTime: 0, selectedLayerId: null, selectedLayerIds: [] };
        saveDesign(snapshot, 'Autosave');
        setProjectSnapshots(getProjectHistory(animationId));
      } catch {}
    }, 1400);
    return () => { if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current); };
  }, [design.layers, design.controls, design.dna, design.canvas, design.playback, animationId, playing]);

  const commit = (next: BroadcastDesign, label: string) => {
    setHistory(h => [...h.slice(-HISTORY_LIMIT + 1), clone(design)]);
    setFuture([]);
    const prepared = { ...next, livePreview: true, updatedAt: new Date().toISOString(), history: [...design.history, { id: `${Date.now()}`, label, at: new Date().toISOString() }].slice(-80) };
    // Draft edits stay local to Design Studio until SAVE DRAFT/PUBLISH. This
    // prevents half-finished edits from leaking into the audience display.
    setDesign(prepared);
  };

  const descendantIds = (rootId: string, layers: DesignLayer[]) => {
    const found = new Set<string>();
    const walk = (id: string) => {
      layers.filter(l => l.parentId === id).forEach(child => { found.add(child.id); walk(child.id); });
    };
    walk(rootId);
    return found;
  };

  // Apply a group transform to every descendant around the group's visual center.
  // This keeps nested children visually attached when the user moves/scales/rotates
  // a parent, instead of only changing the parent's own rectangle.
  const transformDescendants = (layers: DesignLayer[], root: DesignLayer, ids: Set<string>,
    nextX: number, nextY: number, nextScale: number, nextRotation: number, atTime?: number) => {
    const ox = root.x, oy = root.y;
    const oldScale = root.scale || 1;
    const newScale = nextScale || 1;
    const scaleFactor = newScale / oldScale;
    const radians = ((nextRotation - root.rotation) * Math.PI) / 180;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    const cx = ox + root.width / 2, cy = oy + root.height / 2;
    const dx = nextX - ox, dy = nextY - oy;
    return layers.map(l => {
      if (!ids.has(l.id) || l.locked) return l;
      const cur = atTime !== undefined ? evaluateLayerAtTime(l, atTime) : l;
      const childCx = cur.x + cur.width / 2;
      const childCy = cur.y + cur.height / 2;
      const relX = (childCx - cx) * scaleFactor;
      const relY = (childCy - cy) * scaleFactor;
      const rx = relX * cos - relY * sin;
      const ry = relX * sin + relY * cos;
      const patch = {
        x: cx + rx + dx - (cur.width * scaleFactor) / 2,
        y: cy + ry + dy - (cur.height * scaleFactor) / 2,
        width: cur.width * scaleFactor,
        height: cur.height * scaleFactor,
        rotation: cur.rotation + (nextRotation - root.rotation),
      };
      return atTime !== undefined ? upsertKeyframe(l, atTime, patch) : { ...l, ...patch };
    });
  };

  const updateLayer = (id: string, patch: Partial<DesignLayer>, label = 'Edit layer') => {
    const target = design.layers.find(l => l.id === id);
    if (!target) return;
    if (target.locked && !('locked' in patch)) return;

    const time = Number(design.currentTime.toFixed(3));
    const temporalPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => isAnimatableProperty(key)));
    const hasExactKeyframe = target.keyframes.some(k => Math.abs(k.time - time) < 0.001);
    const useKeyframe = Object.keys(temporalPatch).length > 0 && (time > 0 || hasExactKeyframe);
    let layers = [...design.layers];

    if (useKeyframe) {
      // Edits made at a non-zero timeline position belong to THAT moment.
      // They do not mutate the base/original pose, so scrubbing backwards never
      // leaks a later edit into an earlier animation moment.
      layers = layers.map(l => l.id === id ? upsertKeyframe(l, time, temporalPatch) : l);

      if (target.type === 'group') {
        const ids = descendantIds(id, design.layers);
        const before = evaluateLayerAtTime(target, time);
        const after = { ...before, ...temporalPatch } as DesignLayer;
        const nextX = after.x ?? before.x;
        const nextY = after.y ?? before.y;
        const nextScale = after.scale ?? before.scale;
        const nextRotation = after.rotation ?? before.rotation;
        if (nextX !== before.x || nextY !== before.y || nextScale !== before.scale || nextRotation !== before.rotation) {
          layers = transformDescendants(layers, before, ids, nextX, nextY, nextScale, nextRotation, time);
        }
      }
    } else {
      layers = layers.map(l => l.id === id ? { ...l, ...patch } : l);
      if (target.type === 'group' && !target.locked) {
        const ids = descendantIds(id, design.layers);
        const nx = patch.x ?? target.x; const ny = patch.y ?? target.y;
        const ns = patch.scale ?? target.scale;
        const nr = patch.rotation ?? target.rotation;
        const moved = nx !== target.x || ny !== target.y || ns !== target.scale || nr !== target.rotation;
        if (moved) layers = transformDescendants(layers, target, ids, nx, ny, ns, nr);
      }
    }
    commit({ ...design, layers }, useKeyframe ? `${label} @ ${time.toFixed(2)}s` : label);
  };

  const addLayer = (type: LayerType) => {
    const n = design.layers.length + 1;
    const layer: DesignLayer = {
      id: `layer-${Date.now()}`,
      name: type === 'text' ? `Text ${n}` : type === 'image' ? `Image ${n}` : type === 'frame' ? `Frame ${n}` : `Layer ${n}`,
      type,
      visible: true,
      locked: false,
      parentId: null,
      x: 760,
      y: 440,
      width: type === 'text' ? 420 : 300,
      height: type === 'text' ? 100 : 220,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: Math.max(20, ...design.layers.map(l => l.zIndex + 1)),
      color: '#ffffff',
      background: type === 'frame' || type === 'shape' ? 'rgba(255,255,255,.03)' : undefined,
      borderColor: '#ffd866',
      borderWidth: type === 'frame' ? 3 : undefined,
      borderRadius: 18,
      fontFamily: 'Inter, Cairo, sans-serif',
      fontSize: 48,
      fontWeight: 800,
      textAlign: 'center',
      direction: 'auto',
      text: type === 'text' ? 'NEW TEXT' : undefined,
      binding: type === 'text' ? 'static' : undefined,
      effect: 'none',
      keyframes: [],
    };
    commit({ ...design, layers: [...design.layers, layer], selectedLayerId: layer.id }, `Add ${layer.name}`);
  };

  const deleteSelected = () => {
    if (!selected || selected.locked) return;
    const ids = new Set([selected.id, ...descendantIds(selected.id, design.layers)]);
    commit({ ...design, layers: design.layers.filter(l => !ids.has(l.id)), selectedLayerId: null }, 'Delete layer');
  };

  const duplicateSubtree = (rootId: string, dx = 30, dy = 30) => {
    const sourceIds = [rootId, ...descendantIds(rootId, design.layers)];
    const idMap = new Map<string, string>();
    sourceIds.forEach(oldId => idMap.set(oldId, `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`));
    const copies = design.layers.filter(l => sourceIds.includes(l.id)).map(l => ({
      ...clone(l),
      id: idMap.get(l.id)!,
      parentId: l.parentId ? (idMap.get(l.parentId) || null) : null,
      children: l.children?.map(child => idMap.get(child) || child),
      x: l.x + dx,
      y: l.y + dy,
      zIndex: l.zIndex + 1,
    }));
    const rootCopy = copies.find(l => l.id === idMap.get(rootId));
    if (!rootCopy) return;
    commit({ ...design, layers: [...design.layers, ...copies], selectedLayerId: rootCopy.id, selectedLayerIds: [rootCopy.id] }, `Duplicate ${rootId}`);
  };

  const pasteLayer = () => {
    if (!copiedLayer) return;
    // Paste a complete group/subtree when the copied item has children.
    if (copiedLayer.type === 'group') {
      const sourceIds = [copiedLayer.id, ...descendantIds(copiedLayer.id, design.layers)];
      const idMap = new Map<string, string>();
      sourceIds.forEach(oldId => idMap.set(oldId, `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`));
      const copies = [copiedLayer, ...design.layers.filter(l => sourceIds.includes(l.id) && l.id !== copiedLayer.id)].map(l => ({
        ...clone(l),
        id: idMap.get(l.id)!,
        parentId: l.parentId ? (idMap.get(l.parentId) || null) : null,
        children: l.children?.map(child => idMap.get(child) || child),
        x: l.x + 30,
        y: l.y + 30,
        zIndex: l.zIndex + 1,
      }));
      const rootCopy = copies[0];
      commit({ ...design, layers: [...design.layers, ...copies], selectedLayerId: rootCopy.id, selectedLayerIds: [rootCopy.id] }, T('Paste group','لصق المجموعة','COLLER LE GROUPE'));
      return;
    }
    const copy = clone(copiedLayer);
    const oldId = copy.id;
    copy.id = `layer-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    copy.name = `${copiedLayer.name} COPY`;
    copy.x += 30; copy.y += 30; copy.zIndex = Math.max(20, ...design.layers.map(l => l.zIndex + 1));
    copy.parentId = null;
    copy.children = undefined;
    commit({ ...design, layers: [...design.layers, copy], selectedLayerId: copy.id, selectedLayerIds: [copy.id] }, `Paste ${oldId}`);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    duplicateSubtree(selected.id);
  };

  const groupSelected = () => {
    const ids = selectedIds.length ? selectedIds : (design.selectedLayerId ? [design.selectedLayerId] : []);
    if (!ids.length) return;
    const chosen = design.layers.filter(l => ids.includes(l.id));
    if (!chosen.length) return;
    const minX = Math.min(...chosen.map(l => l.x)), minY = Math.min(...chosen.map(l => l.y));
    const maxX = Math.max(...chosen.map(l => l.x + l.width)), maxY = Math.max(...chosen.map(l => l.y + l.height));
    const groupId = `group-${Date.now()}`;
    const group: DesignLayer = {
      id: groupId, name: 'NEW GROUP', type: 'group', visible: true, locked: false, parentId: null,
      x: minX, y: minY, width: Math.max(1,maxX-minX), height: Math.max(1,maxY-minY), rotation: 0, scale: 1, opacity: 1, zIndex: Math.max(...chosen.map(l=>l.zIndex),100),
      borderColor: '#ffd866', borderWidth: 2, borderRadius: 20, keyframes: [], children: ids,
    };
    commit({ ...design, layers: [...design.layers.map(l => ids.includes(l.id) ? { ...l, parentId: groupId } : l), group], selectedLayerId: groupId, selectedLayerIds: [groupId] }, `Group ${ids.length} layers`);
  };

  const ungroup = () => {
    if (!selected || selected.type !== 'group') return;
    commit({ ...design, layers: design.layers.map(l => l.parentId === selected.id ? { ...l, parentId: null } : l).filter(l => l.id !== selected.id), selectedLayerId: null }, 'Ungroup');
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setFuture(f => [clone(design), ...f].slice(0, HISTORY_LIMIT));
    setHistory(h => h.slice(0, -1));
    const restored = { ...prev, livePreview: true };
    setDesign(restored);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory(h => [...h, clone(design)].slice(-HISTORY_LIMIT));
    setFuture(f => f.slice(1));
    const restored = { ...next, livePreview: true };
    setDesign(restored);
  };

  const save = () => { const next = saveDesign({ ...design, tournamentId, displayId: mirrorDisplayId || null, status: 'draft', livePreview: true, renderQuality, dna: dnaDefaults }, 'Save Draft'); setDesign(next); setPublishedHistory(getPublishedHistory(animationId)); setProjectSnapshots(getProjectHistory(animationId)); void cloudSaveDesign(next).catch(()=>{}); };
  const createTemplate = () => {
    const name = templateName.trim() || `${animationId.toUpperCase()} Template`;
    saveDesignTemplate(design, { name, scope: templateScope });
    setDesignTemplates(getDesignTemplates());
    setTemplateName('');
  };
  const useTemplate = (template: ReturnType<typeof getDesignTemplates>[number]) => {
    const next = applyDesignTemplate(design, template);
    commit(next, `Apply Template · ${template.name}`);
    setTemplateOpen(false);
  };
  const restoreSnapshot = (snapshot: BroadcastDesign) => {
    const next = { ...clone(snapshot), status: 'draft' as const, currentTime: 0, selectedLayerId: null, selectedLayerIds: [] };
    commit(next, `Restore Snapshot v${snapshot.version}`);
    setProjectSnapshots(getProjectHistory(animationId));
  };
  const publish = () => { const next = publishDesign({ ...design, tournamentId, displayId: mirrorDisplayId || null, renderQuality, dna: dnaDefaults }); setDesign(next); setPublishedHistory(getPublishedHistory(animationId)); void cloudSaveDesign(next).catch(()=>{}); };
  const reset = () => {
    const fresh = restoreOriginal(animationId);
    setDesign(fresh); setHistory([]); setFuture([]);
  };

  const changeAnimation = (id: DesignAnimationId) => {
    save();
    const next = getDesign(id);
    setAnimationId(id);
    setPreviewStage('main');
    setScreenSelectMode(true);
    setHistory([]); setFuture([]);
    setRenderQuality((next.renderQuality || 'high') as RenderQuality);
    setPublishedHistory(getPublishedHistory(id));
    setBeforeAfter('modified'); setIsolatedLayerId(null);
    setInspectorStatus('waiting');
    setPreviewMode(true);
    setDesign(next);
  };

  const exportCurrentDesign = () => {
    const blob = new Blob([serializeDesignFile(design)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.animationId}-v${design.version}.design`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDesignFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseDesignFile(String(reader.result), animationId);
        setHistory(h => [...h, clone(design)].slice(-HISTORY_LIMIT));
        setFuture([]);
        setDesign(imported);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Invalid WAB-TKD design file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const attachSelectedTo = (parentId: string | null) => {
    if (!rawSelected || rawSelected.locked || !parentId || parentId === rawSelected.id) return;
    if (descendantIds(rawSelected.id, design.layers).has(parentId)) return;
    updateLayer(rawSelected.id, { attachToId: parentId, followParentTransform: true }, T('Attach to parent','ربط بالأب','Attacher au parent'));
  };

  const detachSelected = () => {
    if (!rawSelected || rawSelected.locked) return;
    updateLayer(rawSelected.id, { attachToId: null, followParentTransform: false }, T('Detach layer','فصل الطبقة','Détacher le calque'));
  };

  const autoFitSelectedText = () => {
    if (!rawSelected || rawSelected.type !== 'text') return;
    updateLayer(rawSelected.id, { autoFit: true }, T('Auto-fit text','ملاءمة النص تلقائيًا','Ajuster automatiquement le texte'));
  };

  const addImageLayer = (url: string, name = 'Imported Image') => {
    const n = design.layers.length + 1;
    const layer: DesignLayer = {
      id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.replace(/\.[^.]+$/, '') || `Image ${n}`, type: 'image', visible: true, locked: false, parentId: null,
      x: 760, y: 380, width: 420, height: 300, rotation: 0, scale: 1, opacity: 1,
      zIndex: Math.max(20, ...design.layers.map(l => l.zIndex + 1)), imageSrc: url, binding: 'static',
      effect: 'none', keyframes: [], sourceKey: 'studio:addition:image',
    };
    commit({ ...design, layers: [...design.layers, layer], selectedLayerId: layer.id, selectedLayerIds: [layer.id] }, `Add image ${name}`);
  };

  const rememberLocalAsset = (name: string, url: string) => {
    const asset = { id: `local:${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, url };
    setLocalAssets(current => {
      const next = [asset, ...current].slice(0, 40);
      try { localStorage.setItem('wab-tkd-design-local-assets-v1', JSON.stringify(next)); } catch {}
      return next;
    });
    return asset;
  };

  const onDropImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (file.type.startsWith('video/')) {
        if (selected?.type === 'video') updateLayer(selected.id, { videoSrc: url, binding: 'static' }, `Import video ${file.name}`);
        else {
          const n = design.layers.length + 1;
          const videoLayer: DesignLayer = { id:`layer-${Date.now()}`, name:file.name || `Video ${n}`, type:'video', visible:true, locked:false, parentId:null, x:260, y:160, width:1400, height:760, rotation:0, scale:1, opacity:1, zIndex:Math.max(20,...design.layers.map(l=>l.zIndex+1)), videoSrc:url, binding:'static', keyframes:[] };
          commit({...design,layers:[...design.layers,videoLayer],selectedLayerId:videoLayer.id,selectedLayerIds:[videoLayer.id]}, `Add video ${file.name}`);
        }
      } else {
        rememberLocalAsset(file.name, url);
        if (selected?.type === 'image') updateLayer(selected.id, { imageSrc: url, binding: 'static' }, `Import ${file.name}`);
        else addImageLayer(url, file.name);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const onCanvasFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { const url = String(reader.result); rememberLocalAsset(file.name, url); addImageLayer(url, file.name); };
    reader.readAsDataURL(file);
  };

  const selectLayer = (id: string, additive = false) => setDesign(d => {
    const current = d.selectedLayerIds || (d.selectedLayerId ? [d.selectedLayerId] : []);
    const ids = additive ? (current.includes(id) ? current.filter(x => x !== id) : [...current, id]) : [id];
    return { ...d, selectedLayerId: ids[ids.length - 1] || null, selectedLayerIds: ids };
  });
  const selectedIds = design.selectedLayerIds?.length ? design.selectedLayerIds : (design.selectedLayerId ? [design.selectedLayerId] : []);
  const alignSelected = (kind: 'left'|'center'|'right'|'top'|'middle'|'bottom') => {
    if (selectedIds.length < 2) return;
    const chosen = design.layers.filter(l => selectedIds.includes(l.id));
    const minX=Math.min(...chosen.map(l=>l.x)), maxR=Math.max(...chosen.map(l=>l.x+l.width)), minY=Math.min(...chosen.map(l=>l.y)), maxB=Math.max(...chosen.map(l=>l.y+l.height));
    const cx=(minX+maxR)/2, cy=(minY+maxB)/2;
    const time=Number(design.currentTime.toFixed(3));
    const layers=design.layers.map(l=>{ if(!selectedIds.includes(l.id)||l.locked)return l; const patch:any=kind==='left'?{x:minX}:kind==='center'?{x:cx-l.width/2}:kind==='right'?{x:maxR-l.width}:kind==='top'?{y:minY}:kind==='middle'?{y:cy-l.height/2}:{y:maxB-l.height}; return (time>0||l.keyframes.length)?upsertKeyframe(l,time,patch,easing):{...l,...patch}; });
    commit({...design,layers},`Align ${kind}${time?` @ ${time.toFixed(2)}s`:''}`);
  };
  const distributeSelected = (axis: 'x'|'y') => {
    if (selectedIds.length < 3) return;
    const chosen = design.layers.filter(l => selectedIds.includes(l.id)).sort((a,b)=>axis==='x'?a.x-b.x:a.y-b.y);
    const first = chosen[0], last = chosen[chosen.length-1]; const span=axis==='x'?(last.x-first.x):(last.y-first.y); const step=span/(chosen.length-1); const time=Number(design.currentTime.toFixed(3));
    const layers=design.layers.map(l=>{const i=chosen.findIndex(c=>c.id===l.id);if(i<=0||i===chosen.length-1||l.locked)return l;const patch:any=axis==='x'?{x:first.x+step*i}:{y:first.y+step*i};return(time>0||l.keyframes.length)?upsertKeyframe(l,time,patch,easing):{...l,...patch};});
    commit({...design,layers}, T(axis==='x'?'Distribute horizontally':'Distribute vertically', axis==='x'?'توزيع أفقي':'توزيع عمودي', axis==='x'?'Distribuer horizontalement':'Distribuer verticalement'));
  };
  const copyDesignToAnimation = () => { const target=window.prompt('Copy current design to animation id', DESIGN_ANIMATIONS.find(a=>a.id!==animationId)?.id || 'winner'); if(!target || !DESIGN_ANIMATIONS.some(a=>a.id===target)) return; const copied=clone(design); const normalized={...copied,id:`design-${target}`,animationId:target as DesignAnimationId,name:`${target.toUpperCase()} DESIGN`,status:'draft' as const,publishedVersion:undefined,draftVersion:0,tournamentId,displayId:mirrorDisplayId||null,updatedAt:new Date().toISOString()}; saveDesign(normalized,'Copy Design To Animation'); setAssistantMessages(m=>[...m,{role:'assistant',text:`Copied the complete design, layers and keyframes to ${target}.`}]); };
  const createPreset = () => { const name=window.prompt('Preset name','WAB GOLD PRESET'); if(!name) return; const p=savePreset(design,name,selectedIds); setPresets(getPresets()); return p; };
  const syncAdvanced = (patch: Partial<DesignPackage>) => { const next={...advancedPkg,...patch,design:clone(design)}; setAdvancedPkg(next); saveDesignPackage(next); setDesign(d=>({...d,advanced:{globals:next.globals,stateMachine:next.stateMachine,conditions:next.conditions,queue:next.queue,macros:next.macros,scenes:next.scenes}})); };
  const exportPackage = () => { const blob=new Blob([exportDesignPackage({...advancedPkg,design})],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`WAB-TKD-${animationId}-design-package.json`;a.click();URL.revokeObjectURL(a.href); };
  const importPackageFile = (file:File) => { const r=new FileReader();r.onload=()=>{try{const p=importDesignPackage(String(r.result),animationId);setAdvancedPkg(p);saveDesignPackage(p);setDesign(p.design);}catch(e){setAssistantMessages(m=>[...m,{role:'assistant',text:`Import failed: ${e instanceof Error?e.message:'Invalid package'}`}]);}};r.readAsText(file); };
  const addMacro = () => { const macro=createMacro(`Broadcast Macro ${advancedPkg.macros.length+1}`,[{id:`step-${Date.now()}`,label:'PLAY CURRENT ANIMATION',kind:'animation',animationId}]); syncAdvanced({macros:[...advancedPkg.macros,macro]}); };
  const addQueueItem = () => { const item:AnimationQueueItem={id:`queue-${Date.now()}`,animationId,delay:0,auto:true};syncAdvanced({queue:enqueueAnimation(advancedPkg.queue,item)}); };
  const addCondition = () => { const target=selectedIds[0] || design.layers[0]?.id; if(!target)return; const rule:ConditionalRule={id:`condition-${Date.now()}`,when:'match.status == "WINNER"',action:'show',targetLayerIds:[target],enabled:true};syncAdvanced({conditions:[...advancedPkg.conditions,rule]}); };

  const usePreset = (presetId:string) => { const p=presets.find(x=>x.id===presetId); if(!p) return; commit(applyPreset(design,p,200,120),`Apply preset ${p.name}`); };
  const addKeyframe = () => {
    if (!rawSelected) return;
    const time = Number(design.currentTime.toFixed(3));
    const snapshot: any = {};
    const current = evaluateLayerAtTime(rawSelected, time);
    ['x','y','width','height','rotation','scale','opacity','color','background','borderColor','borderWidth','borderRadius','fontFamily','fontSize','fontWeight','textAlign','direction','text','imageSrc','videoSrc','binding','effect','frameStyle','effectColor','effectIntensity','effectRadius','shadowColor','shadowBlur','shadowX','shadowY','borderStyle','gradient','filter','letterSpacing','lineHeight','textStrokeColor','textStrokeWidth','blendMode','maskId','maskFeather','autoFit','clipPath','motionPath','motionPathReverse','motionPathLoop','motionPathRotate'].forEach((key) => {
      if ((current as any)[key] !== undefined) snapshot[key] = (current as any)[key];
    });
    const next = upsertKeyframe(rawSelected, time, snapshot, easing);
    commit({ ...design, layers: design.layers.map(l => l.id === rawSelected.id ? next : l) }, `Add keyframe @ ${time.toFixed(2)}s`);
  };

  const duplicateCurrentKeyframe = () => {
    if(!rawSelected) return; const time=Number(design.currentTime.toFixed(3)); const k=rawSelected.keyframes.find(x=>Math.abs(x.time-time)<.001); if(!k)return;
    const nt=Math.min(design.duration,Number((time+0.1).toFixed(3))); const copy={...clone(k),id:`kf-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,time:nt};
    commit({...design,layers:design.layers.map(l=>l.id===rawSelected.id?{...l,keyframes:[...l.keyframes.filter(x=>Math.abs(x.time-nt)>=.001),copy].sort((a,b)=>a.time-b.time)}:l)},T('Duplicate keyframe','تكرار الإطار المفتاحي','Dupliquer l’image clé'));
  };
  const moveKeyframe = (layerId:string, keyframeId:string, newTime:number) => {
    setDesign(current => {
      const t=Math.max(0,Math.min(current.duration,Number(newTime.toFixed(3))));
      const layers=current.layers.map(l=>l.id!==layerId?l:{...l,keyframes:l.keyframes.map(k=>k.id===keyframeId?{...k,time:t}:k).sort((a,b)=>a.time-b.time)});
      return {...current,layers};
    });
  };
  const commitKeyframeMove = (layerId:string, keyframeId:string) => {
    const current=latestDesignRef.current;
    if(!current) return;
    const layer=current.layers.find(l=>l.id===layerId);
    if(!layer || !layer.keyframes.some(x=>x.id===keyframeId)) return;
    commit({...current,layers:current.layers.map(l=>l.id===layerId?{...l,keyframes:[...l.keyframes].sort((a,b)=>a.time-b.time)}:l)}, T('Move keyframe','تحريك الإطار المفتاحي','Déplacer l’image clé'));
  };

  const removeCurrentKeyframe = () => {
    if (!rawSelected) return;
    const time = Number(design.currentTime.toFixed(3));
    const next = removeKeyframeAt(rawSelected, time);
    commit({ ...design, layers: design.layers.map(l => l.id === rawSelected.id ? next : l) }, `Remove keyframe @ ${time.toFixed(2)}s`);
  };

  const importFont = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected || selected.type !== 'text') return;
    const reader = new FileReader();
    reader.onload = async () => {
      const source = String(reader.result);
      const name = `WABFont-${file.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      try { const face = new FontFace(name, `url(${source})`); await face.load(); document.fonts.add(face); } catch {}
      setCustomFonts(current => [...current.filter(f => f.name !== name), { name, source }]);
      updateLayer(selected.id, { fontFamily: name, fontSource: source }, `Import font ${file.name}`);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const assignAsset = (url: string, name = 'Asset Image') => {
    if (selected?.type === 'image') updateLayer(selected.id, { imageSrc: url, binding: 'static', name: selected.name }, `Choose asset ${name}`);
    else addImageLayer(url, name);
  };
  const swapWithTarget = (targetId?: string) => {
    if (!selected || !['frame','group','shape'].includes(selected.type)) return;
    const target = design.layers.find(l => l.id === (targetId || swapTargetId));
    if (!target || target.id === selected.id || !['frame','group','shape'].includes(target.type)) return;
    const time = Number(design.currentTime.toFixed(3));
    const a = evaluateLayerAtTime(selected, time), b = evaluateLayerAtTime(target, time);
    const pa = { x:b.x,y:b.y,width:b.width,height:b.height,rotation:b.rotation,scale:b.scale };
    const pb = { x:a.x,y:a.y,width:a.width,height:a.height,rotation:a.rotation,scale:a.scale };
    const layers = design.layers.map(l => l.id === selected.id ? upsertKeyframe(l,time,pa) : l.id === target.id ? upsertKeyframe(l,time,pb) : l);
    commit({ ...design, layers }, `Swap ${selected.name} ↔ ${target.name} @ ${time.toFixed(2)}s`);
  };

  const swapWithNextFrame = () => {
    if (!selected || !['frame','group','shape'].includes(selected.type)) return;
    const candidates = design.layers.filter(l => l.id !== selected.id && ['frame','group','shape'].includes(l.type) && l.parentId === selected.parentId).sort((a,b) => a.zIndex - b.zIndex);
    const idx = candidates.findIndex(l => l.id === selected.id);
    const other = candidates[idx + 1] || candidates[0];
    if (!other) return;
    const time = Number(design.currentTime.toFixed(3));
    const a = evaluateLayerAtTime(selected, time), b = evaluateLayerAtTime(other, time);
    const propsA = { x:b.x,y:b.y,width:b.width,height:b.height,rotation:b.rotation,scale:b.scale };
    const propsB = { x:a.x,y:a.y,width:a.width,height:a.height,rotation:a.rotation,scale:a.scale };
    let layers = design.layers;
    if (time > 0 || selected.keyframes.length || other.keyframes.length) {
      layers = layers.map(l => l.id === selected.id ? upsertKeyframe(l, time, propsA) : l.id === other.id ? upsertKeyframe(l, time, propsB) : l);
    } else {
      layers = layers.map(l => l.id === selected.id ? { ...l, ...propsA } : l.id === other.id ? { ...l, ...propsB } : l);
    }
    commit({ ...design, layers }, `Swap ${selected.name} ↔ ${other.name} @ ${time.toFixed(2)}s`);
  };

  const renderTree = (layer: DesignLayer, depth = 0): React.ReactNode => {
    const kids = childrenOf(layer.id);
    const isOpen = expanded[layer.id] ?? true;
    return <React.Fragment key={layer.id}>
      <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg ${selected?.id === layer.id ? 'bg-yellow-400/15 border border-yellow-400/30' : 'hover:bg-white/5'}`} style={{ paddingLeft: 8 + depth * 15 }}>
        {kids.length ? <button onClick={() => setExpanded(e => ({ ...e, [layer.id]: !isOpen }))}>{isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</button> : <span className="w-3"/>}
        <button className="flex-1 flex items-center gap-2 min-w-0 text-left" onClick={() => selectLayer(layer.id)}>
          {layer.type === 'text' ? <Type size={12}/> : layer.type === 'image' ? <ImageIcon size={12}/> : layer.type === 'group' ? <Layers3 size={12}/> : layer.type === 'effect' ? <Sparkles size={12}/> : <SquareDashed size={12}/>}<span className="truncate text-[11px]">{layer.name}</span>
        </button>
        <button onClick={() => updateLayer(layer.id, { visible: !layer.visible }, `${layer.visible ? 'Hide' : 'Show'} ${layer.name}`)}>{layer.visible ? <Eye size={12}/> : <EyeOff size={12}/>}</button>
        <button onClick={() => updateLayer(layer.id, { locked: !layer.locked }, `${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`)}>{layer.locked ? <Lock size={11}/> : <Unlock size={11}/>}</button>
      </div>
      {isOpen && kids.map(k => renderTree(k, depth + 1))}
    </React.Fragment>;
  };

  const setPlayback = (patch: any, label = 'Animation playback') => {
    const next = { ...design.playback, ...patch };
    const duration = Number(next.duration || design.duration);
    commit({ ...design, duration, playback: { ...next, duration, outPoint: Math.min(Number(next.outPoint ?? duration), duration) } }, label);
  };

  const transitionKinds: Array<[TransitionKind, string, string, string]> = [
    ['none','None','بدون انتقال','Aucun'],['fade','Fade','تلاشي','Fondu'],['crossfade','Crossfade','تداخل','Fondu croisé'],['wipe-left','Wipe Left','مسح لليسار','Balayage gauche'],['wipe-right','Wipe Right','مسح لليمين','Balayage droite'],['wipe-up','Wipe Up','مسح للأعلى','Balayage haut'],['wipe-down','Wipe Down','مسح للأسفل','Balayage bas'],['zoom-in','Zoom In','تكبير','Zoom avant'],['zoom-out','Zoom Out','تصغير','Zoom arrière'],['slide-left','Slide Left','انزلاق لليسار','Glissement gauche'],['slide-right','Slide Right','انزلاق لليمين','Glissement droite'],['slide-up','Slide Up','انزلاق للأعلى','Glissement haut'],['slide-down','Slide Down','انزلاق للأسفل','Glissement bas'],['flash','Flash','وميض','Flash'],['glitch','Glitch','تشويش','Glitch'],['light-sweep','Light Sweep','مسح ضوئي','Balayage lumineux']
  ];
  const transitionLabel = (item: [TransitionKind,string,string,string]) => uiLang === 'ar' ? item[2] : uiLang === 'fr' ? item[3] : item[1];

  const canvasScale = designZoom;
  const graphFrames = useMemo(() => {
    if (!selected) return { min: 0, max: 1, points: [] as Array<{ id: string; time: number; value: number; x: number; y: number }> };
    const values = selected.keyframes.map(k => Number(k.props?.[graphProperty] ?? (k as any)[graphProperty] ?? (selected as any)[graphProperty] ?? 0));
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const span = Math.max(0.0001, max - min);
    return { min, max, points: selected.keyframes.map(k => {
      const value = Number(k.props?.[graphProperty] ?? (k as any)[graphProperty] ?? (selected as any)[graphProperty] ?? 0);
      return { id: k.id, time: k.time, value, x: (k.time / Math.max(.01, design.duration)) * 100, y: ((value - min) / span) * 100 };
    }) };
  }, [selected, graphProperty, design.duration]);

  const requestCapture = () => {
    try { const ch=new BroadcastChannel('wab-broadcast-design-inspector-v1'); ch.postMessage({type:'capture', animationId}); ch.close(); setInspectorStatus('waiting'); } catch {}
  };

  // Native preview is the source of truth for editing existing animations.
  // As soon as the selected animation mounts, capture its declared visual
  // layers automatically so the Layer Tree is never empty/black.
  useEffect(() => {
    if (!previewMode) return;
    const timer = window.setTimeout(() => requestCapture(), 900);
    return () => window.clearTimeout(timer);
  }, [animationId, previewMode]);

  // Direct on-screen selection: click the REAL animation, not a fake canvas.
  // Every captured visual node carries data-wab-layer-id; Ctrl/Cmd-click adds
  // to the selection, exactly like the Layer Tree multi-select.
  useEffect(() => {
    const onPick = (event: Event) => {
      if (!screenSelectMode) return;
      const detail = (event as CustomEvent<{id:string; additive?:boolean}>).detail;
      if (!detail?.id || !design.layers.some(l => l.id === detail.id)) return;
      const additive = !!detail.additive;
      setDesign(d => {
        const current = d.selectedLayerIds?.length ? d.selectedLayerIds : (d.selectedLayerId ? [d.selectedLayerId] : []);
        const ids = additive ? (current.includes(detail.id) ? current.filter(x => x !== detail.id) : [...current, detail.id]) : [detail.id];
        return { ...d, selectedLayerId: detail.id, selectedLayerIds: ids };
      });
    };
    window.addEventListener('wab-studio-select-layer', onPick as EventListener);
    return () => window.removeEventListener('wab-studio-select-layer', onPick as EventListener);
  }, [design.layers, screenSelectMode]);

  // Push every draft edit into the native animation preview. The real
  // BroadcastDesignRuntime receives this without touching Public Display or
  // the match database.
  useEffect(() => {
    if (!previewMode) return;
    try {
      const previous = lastPreviewDesignRef.current;
      const structuralChanged = !previous || previous.animationId !== design.animationId || previous.layers !== design.layers || previous.canvas !== design.canvas || previous.playback !== design.playback || previous.duration !== design.duration || previous.livePreview !== design.livePreview || previous.status !== design.status;
      const ch = new BroadcastChannel('wab-broadcast-design-studio-preview-v1');
      if (structuralChanged) {
        ch.postMessage({ type: 'studio-preview', animationId, design, runtimeTime: design.currentTime, playing });
        lastPreviewDesignRef.current = design;
      } else {
        ch.postMessage({ type: 'studio-preview-time', animationId, runtimeTime: design.currentTime, playing });
      }
      ch.close();
    } catch {}
  }, [animationId, design, playing, previewMode]);

  const dragState = useRef<{ id: string; ids: string[]; startX: number; startY: number; positions: Record<string,{x:number;y:number}>; startDesign: BroadcastDesign } | null>(null);
  const onCanvasPointerDown = (e: React.PointerEvent, layer: DesignLayer) => {
    if (pathDrawMode && selected && selected.id === layer.id) { e.stopPropagation(); return; }
    if (layer.locked) return;
    e.stopPropagation();
    const additive = e.ctrlKey || e.metaKey;
    const currentIds = design.selectedLayerIds?.length ? design.selectedLayerIds : (design.selectedLayerId ? [design.selectedLayerId] : []);
    const ids = additive ? (currentIds.includes(layer.id) ? currentIds.filter(x=>x!==layer.id) : [...currentIds,layer.id]) : [layer.id];
    setDesign(d=>({...d,selectedLayerId:layer.id,selectedLayerIds:ids}));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { id: layer.id, ids, startX: e.clientX, startY: e.clientY, positions: Object.fromEntries(ids.map(id=>{const l=design.layers.find(x=>x.id===id)!;return [id,{x:l.x,y:l.y}]})), startDesign: clone(design) };
  };
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    const rs = resizeState.current;
    const rot = rotateState.current;
    const pd = pathDragState.current;
    if (pd) {
      const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
      const x = clamp((e.clientX - rect.left) / canvasScale, 0, BROADCAST_DESIGN_WIDTH);
      const y = clamp((e.clientY - rect.top) / canvasScale, 0, BROADCAST_DESIGN_HEIGHT);
      setDesign(current => ({ ...current, layers: current.layers.map(l => l.id !== pd.id ? l : { ...l, motionPath: (l.motionPath || []).map((pt:any,i:number) => { if(i!==pd.index)return pt; if(pd.kind==='cp1')return {...pt,cp1x:x,cp1y:y}; if(pd.kind==='cp2')return {...pt,cp2x:x,cp2y:y}; return {...pt,x,y}; }) }) }));
      return;
    }
    if (rs) {
      const dx = (e.clientX-rs.startX)/canvasScale, dy=(e.clientY-rs.startY)/canvasScale;
      const nx0=rs.startXLayer, ny0=rs.startYLayer, w0=rs.startW, h0=rs.startH;
      let x=nx0,y=ny0,w=w0,h=h0;
      if (rs.handle.includes('e')) w=Math.max(20,w0+dx);
      if (rs.handle.includes('s')) h=Math.max(20,h0+dy);
      if (rs.handle.includes('w')) { w=Math.max(20,w0-dx); x=nx0+(w0-w); }
      if (rs.handle.includes('n')) { h=Math.max(20,h0-dy); y=ny0+(h0-h); }
      setDesign(current=>({...current,layers:current.layers.map(l=>l.id===rs.id?{...l,x,y,width:w,height:h}:l)}));
      return;
    }
    if (rot) {
      const rect=canvasRef.current?.getBoundingClientRect(); if(!rect) return;
      const cx=rect.left+(rot.layerX+rot.layerW/2)*canvasScale;
      const cy=rect.top+(rot.layerY+rot.layerH/2)*canvasScale;
      const angle=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;
      setDesign(current=>({...current,layers:current.layers.map(l=>l.id===rot.id?{...l,rotation:angle}:l)}));
      return;
    }
    const d = dragState.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / canvasScale;
    const dy = (e.clientY - d.startY) / canvasScale;
    setDesign(current => ({ ...current, layers: current.layers.map(l => {
      if (!d.ids.includes(l.id) || l.locked) return l;
      const pos=d.positions[l.id]; if(!pos) return l;
      let nx=pos.x+dx, ny=pos.y+dy;
      if(current.editor?.snap!==false){nx=Math.round(nx/8)*8;ny=Math.round(ny/8)*8;}
      return {...l,x:nx,y:ny};
    })}));
  };
  const finishPointerEdit = () => {
    const mode = resizeState.current || rotateState.current || dragState.current;
    if (pathDragState.current) {
      const pd = pathDragState.current;
      pathDragState.current = null;
      const live = design;
      const target = live.layers.find(l=>l.id===pd.id);
      if (target) commit({ ...live }, T('Move motion path point','تحريك نقطة مسار الحركة','Déplacer un point de trajectoire'));
      return;
    }
    if (!mode) return;
    resizeState.current=null; rotateState.current=null;
    const moved = mode;
    const live=design; const target=live.layers.find(l=>l.id===moved.id); if(!target) { dragState.current=null; return; }
    const time=Number(live.currentTime.toFixed(3));
    const baseDesign=moved.startDesign || design;
    const final=evaluateLayerAtTime(target,time);
    const patch:any = moved.kind==='resize' ? {x:final.x,y:final.y,width:final.width,height:final.height} : moved.kind==='rotate' ? {rotation:final.rotation} : {x:final.x,y:final.y};
    let layers=baseDesign.layers.map(l=>l.id===moved.id ? ((time>0||l.keyframes.length)?upsertKeyframe(l,time,patch):{...l,...patch}) : l);
    commit({...baseDesign,currentTime:live.currentTime,selectedLayerId:live.selectedLayerId,layers}, `${moved.kind==='resize'?T('Resize','تغيير الحجم'):moved.kind==='rotate'?T('Rotate','تدوير'):T('Move','تحريك')} ${target.name} @ ${time.toFixed(2)}s`);
    dragState.current=null;
  };
  const onCanvasPointerUp = () => finishPointerEdit();

  const startResize = (e: React.PointerEvent, layer: DesignLayer, handle: string) => {
    if(layer.locked) return; e.stopPropagation(); selectLayer(layer.id);
    resizeState.current={kind:'resize',id:layer.id,handle,startX:e.clientX,startY:e.clientY,startXLayer:layer.x,startYLayer:layer.y,startW:layer.width,startH:layer.height,startDesign:clone(design)};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const startRotate = (e: React.PointerEvent, layer: DesignLayer) => {
    if(layer.locked) return; e.stopPropagation(); selectLayer(layer.id);
    rotateState.current={kind:'rotate',id:layer.id,layerX:layer.x,layerY:layer.y,layerW:layer.width,layerH:layer.height,startDesign:clone(design)};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const updateKeyframeProperty = (time:number, property:string, value:any) => {
    if(!rawSelected) return;
    const next = design.layers.map(l => l.id===rawSelected.id ? upsertKeyframe(l,time,{[property]:value} as any,easing) : l);
    commit({...design,layers:next}, T('Edit graph keyframe','تعديل نقطة في المحنى','Modifier un point du graphe'));
  };
  const copySelectedKeyframes = () => { if(rawSelected) setCopiedKeyframes(clone(rawSelected.keyframes)); };
  const pasteSelectedKeyframes = () => {
    if(!rawSelected || !copiedKeyframes.length) return;
    const offset=Number(design.currentTime.toFixed(3))-(copiedKeyframes[0]?.time||0);
    const shifted=copiedKeyframes.map(k=>({...clone(k),id:`kf-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,time:Math.max(0,Math.min(design.duration,Number((k.time+offset).toFixed(3))))}));
    const next=design.layers.map(l=>l.id===rawSelected.id?{...l,keyframes:[...l.keyframes,...shifted].sort((a,b)=>a.time-b.time)}:l);
    commit({...design,layers:next},T('Paste keyframes','لصق الإطارات المفتاحية','Coller les images clés'));
  };

  const addMotionPoint = (atX?:number, atY?:number) => {
    if(!selected || selected.locked) return;
    const t=Number(design.currentTime.toFixed(3));
    const path=[...(selected.motionPath||[])];
    const x=atX ?? selected.x, y=atY ?? selected.y;
    const next=path.filter(p=>Math.abs(p.time-t)>=.001);
    const prev=next.filter(p=>p.time<t).at(-1);
    const nextPoint=next.find(p=>p.time>t);
    const dx=(nextPoint?.x ?? x)-(prev?.x ?? x);
    const dy=(nextPoint?.y ?? y)-(prev?.y ?? y);
    const len=Math.max(1,Math.hypot(dx,dy));
    const ux=dx/len, uy=dy/len;
    next.push({x,y,time:t,cp1x:x-ux*60,cp1y:y-uy*60,cp2x:x+ux*60,cp2y:y+uy*60});
    next.sort((a,b)=>a.time-b.time);
    updateLayer(selected.id,{motionPath:next},T('Add motion path point','إضافة نقطة لمسار الحركة'));
  };
  const removeMotionPoint = (index:number) => {
    if(!selected || selected.locked) return;
    const next=(selected.motionPath||[]).filter((_,i)=>i!==index);
    updateLayer(selected.id,{motionPath:next},T('Delete motion path point','حذف نقطة مسار الحركة','Supprimer le point'));
  };
  const updateMotionPointTime = (index:number, time:number) => {
    if(!selected || selected.locked) return;
    const next=(selected.motionPath||[]).map((pt,i)=>i===index?{...pt,time:clamp(Number(time)||0,0,design.duration)}:pt).sort((a,b)=>a.time-b.time);
    updateLayer(selected.id,{motionPath:next},T('Change path timing','تغيير توقيت المسار','Modifier le timing'));
  };
  const clearMotionPath = () => { if(selected) updateLayer(selected.id,{motionPath:[]},T('Clear motion path','مسح مسار الحركة')); };
  const updatePathEasing = (time:number, value:EasingKind) => {
    if(!selected) return;
    const layers=design.layers.map(l=>l.id!==selected.id?l:{...l,keyframes:l.keyframes.map(k=>Math.abs(k.time-time)<.001?{...k,easing:value}:k)});
    commit({...design,layers},T('Change keyframe easing','تغيير تسارع الإطار المفتاحي'));
  };

  const enhanceSelected = () => {
    if (!selected || selected.locked) return;
    const baseEffect = selected.effect && selected.effect !== 'none' ? selected.effect : selected.type === 'text' ? 'glow' : selected.type === 'image' ? 'bloom' : 'light';
    const patch: Partial<DesignLayer> = {
      effect: baseEffect,
      effectIntensity: Math.min(1.8, Math.max(selected.effectIntensity ?? .75, .95) + .15),
      effectRadius: Math.min(120, Math.max(selected.effectRadius ?? 28, 24) + 8),
      shadowBlur: Math.max(selected.shadowBlur ?? 0, 18),
      shadowColor: selected.shadowColor || '#000000',
    };
    if (selected.type === 'text') {
      patch.textStrokeColor = selected.textStrokeColor || '#ffd866';
      patch.textStrokeWidth = Math.max(selected.textStrokeWidth ?? 0, 1.5);
    }
    if (selected.type === 'frame' || selected.type === 'shape' || selected.type === 'group') {
      patch.borderWidth = Math.max(selected.borderWidth ?? 0, 2.5);
      patch.borderColor = selected.borderColor || '#ffd866';
    }
    updateLayer(selected.id, patch, T('Enhance existing element','تقوية العنصر الموجود','Renforcer l’élément existant'));
  };

  const smoothSelectedMotion = () => {
    if (!selected || selected.locked || !selected.keyframes.length) return;
    const nextLayers = design.layers.map(l => l.id === selected.id ? { ...l, keyframes: l.keyframes.map(k => ({ ...k, easing: 'smooth' as EasingKind })) } : l);
    commit({ ...design, layers: nextLayers }, T('Smooth existing motion','تنعيم حركة العنصر الموجود','Fluidifier le mouvement existant'));
  };

  // Add a restrained cinematic polish pulse to the EXISTING element. This does
  // not create a new animation; it adds time-local keyframes to the selected
  // original layer, so the change stays inside the current animation/version.
  const polishExisting = () => {
    if (!selected || selected.locked) return;
    const t = Number(design.currentTime.toFixed(3));
    const peak = Math.min(1.8, Math.max(selected.effectIntensity ?? .75, .85) + .22);
    const base = selected.effectIntensity ?? .75;
    const effect = selected.effect && selected.effect !== 'none' ? selected.effect : selected.type === 'text' ? 'glow' : selected.type === 'image' ? 'bloom' : 'light';
    let next = { ...selected, effect: effect as any } as DesignLayer;
    next = upsertKeyframe(next, t, { effect, effectIntensity: base }, 'smooth');
    next = upsertKeyframe(next, Math.min(design.duration, t + .14), { effect, effectIntensity: peak }, 'ease-out');
    next = upsertKeyframe(next, Math.min(design.duration, t + .38), { effect, effectIntensity: base }, 'smooth');
    commit({ ...design, layers: design.layers.map(l => l.id === selected.id ? next : l) }, T('Polish existing element','تحسين احترافي للعنصر الموجود','Polir l’élément existant'));
  };


  const addAssistantCard = (binding:any,title:string,type:'text'|'image'='text') => { const anchor=selected?{x:clamp(selected.x+selected.width+24,40,1360),y:clamp(selected.y,80,820)}:{x:720,y:420}; const id=`ai-${Date.now()}`; const z=Math.max(20,...design.layers.map(l=>l.zIndex+1)); const frame:DesignLayer={id:`${id}-frame`,name:`${title} · FRAME`,type:'frame',visible:true,locked:false,parentId:null,x:anchor.x,y:anchor.y,width:520,height:150,rotation:0,scale:1,opacity:1,zIndex:z,borderColor:'#ffd866',borderWidth:4,borderRadius:20,frameStyle:'neon',effect:'glow',effectColor:'#ffd866',effectIntensity:.9,effectRadius:28,keyframes:[]}; const content:DesignLayer={id:`${id}-content`,name:title,type,visible:true,locked:false,parentId:frame.id,x:25,y:25,width:type==='image'?120:470,height:type==='image'?100:90,rotation:0,scale:1,opacity:1,zIndex:z+1,color:'#fff',fontFamily:'Teko, Rajdhani, Inter, Cairo, sans-serif',fontSize:48,fontWeight:900,textAlign:'center',direction:'auto',text:title,binding:binding as any,effect:type==='image'?'bloom':'glow',effectColor:'#ffd866',effectIntensity:.85,effectRadius:24,keyframes:[]}; commit({...design,layers:[...design.layers,frame,content],selectedLayerId:content.id,selectedLayerIds:[frame.id,content.id]},`AI: ${title}`); };
  const addAssistantDataCard = (binding:any,title:string) => { const anchor=selected?{x:clamp(selected.x+selected.width+24,40,1360),y:clamp(selected.y,80,820)}:{x:700,y:760}; const id=`ai-card-${Date.now()}`; const z=Math.max(20,...design.layers.map(l=>l.zIndex+1)); const frame:DesignLayer={id:`${id}-frame`,name:`${title} · FRAME`,type:'frame',visible:true,locked:false,parentId:null,x:anchor.x,y:anchor.y,width:520,height:220,rotation:0,scale:1,opacity:1,zIndex:z,borderColor:'#ffd866',borderWidth:4,borderRadius:22,frameStyle:'tech',effect:'glow',effectColor:'#ffd866',effectIntensity:.9,effectRadius:28,keyframes:[]}; const photo:DesignLayer={id:`${id}-photo`,name:`${title} · PHOTO`,type:'image',visible:true,locked:false,parentId:frame.id,x:22,y:22,width:150,height:176,rotation:0,scale:1,opacity:1,zIndex:z+1,borderColor:'#ffd866',borderWidth:2,borderRadius:14,binding:(binding==='bestPlayer'?'bestPlayerPhoto':'winnerPhoto') as any,effect:'bloom',effectColor:'#ffd866',effectIntensity:.8,effectRadius:24,keyframes:[]}; const name:DesignLayer={id:`${id}-name`,name:`${title} · NAME`,type:'text',visible:true,locked:false,parentId:frame.id,x:195,y:30,width:295,height:65,rotation:0,scale:1,opacity:1,zIndex:z+2,color:'#fff',fontFamily:'Teko, Rajdhani, Inter, Cairo, sans-serif',fontSize:52,fontWeight:900,textAlign:'center',direction:'auto',text:title,binding:(binding==='bestPlayer'?'bestPlayer':'winnerName') as any,keyframes:[]}; const meta:DesignLayer={id:`${id}-meta`,name:`${title} · TEAM`,type:'text',visible:true,locked:false,parentId:frame.id,x:190,y:105,width:300,height:80,rotation:0,scale:1,opacity:1,zIndex:z+2,color:'#ffd866',fontFamily:'Inter, Cairo, sans-serif',fontSize:24,fontWeight:800,textAlign:'center',direction:'auto',text:'TEAM',binding:(binding==='bestPlayer'?'bestPlayerTeam':'winnerTeam') as any,keyframes:[]}; commit({...design,layers:[...design.layers,frame,photo,name,meta],selectedLayerId:name.id,selectedLayerIds:[frame.id,photo.id,name.id,meta.id]},`AI: ${title} card`); };
  const createAssistantControl = (label:string,startTime:number,endTime:number) => { const control={id:`ctrl-${Date.now()}`,label,action:'show' as const,startTime:clamp(startTime,0,design.duration),endTime:clamp(endTime,startTime,design.duration),enabled:true,animationId,targetLayerIds:selectedIds.length?selectedIds:(selected?[selected.id]:undefined)}; commit({...design,controls:[...(design.controls||[]),control]},`AI: ${label}`); };
  const runExternalAI = async () => {
    const raw=assistantCommand.trim(); if(!raw || externalAiBusy) return;
    setExternalAiBusy(true); setAssistantMessages(m=>[...m,{role:'user',text:`AI CLOUD: ${raw}`}]);
    try {
      const result=await askExternalDesignAI(raw);
      const localResult={actions:(result.actions||[]).map((a:any)=>({type:a.type,target:a.target,targets:a.targets,value:a.value})),message:result.message||'Applied by WAB-TKD Design AI'} as any;
      const next=applyDesignAIResult(design,localResult);
      commit(next,'External Design AI');
      setAssistantMessages(m=>[...m,{role:'assistant',text:result.message||'Applied safely to the Draft.'}]);
    } catch {
      const local=parseLocalDesignCommand(raw,design);
      if(local.actions.length){commit(applyDesignAIResult(design,local),'Local Design AI fallback');setAssistantMessages(m=>[...m,{role:'assistant',text:'Cloud AI unavailable; safe local design parser applied the request.'}]);}
      else setAssistantMessages(m=>[...m,{role:'assistant',text:'AI could not apply a safe design-only command.'}]);
    } finally { setExternalAiBusy(false); }
  };

  const applyAssistant = () => { const raw=assistantCommand.trim(); if(!raw)return; const q=raw.toLowerCase(); setAssistantMessages(m=>[...m,{role:'user',text:raw}]); let reply=T('Done. The request was applied to the Draft.','تم تطبيق الطلب على المسودة.','Demande appliquée au brouillon.'); const range=q.match(/(?:from|من|de)\s*(\d+(?:\.\d+)?)\s*(?:to|إلى|a|à)\s*(\d+(?:\.\d+)?)/i); const at=q.match(/(?:at|عند|à)\s*(\d+(?:\.\d+)?)\s*s?/i);
    if(q.includes('best player')||q.includes('أفضل لاعب')||q.includes('mvp')){addAssistantDataCard('bestPlayer',T('BEST PLAYER · MATCH','أفضل لاعب في المباراة','MEILLEUR JOUEUR · MATCH'));reply=T('Created a Best Player card linked to live match/team statistics.','أنشأت بطاقة أفضل لاعب مرتبطة بإحصائيات المباراة والفريق الحية.','Carte Meilleur Joueur liée aux statistiques du match/équipe créée.');}
    else if(q.includes('winner')||q.includes('الفائز')){addAssistantDataCard('winnerName',T('WINNER','الفائز','VAINQUEUR'));reply=T('Created a dynamic Winner card with name, photo and team.','أنشأت بطاقة فائز ديناميكية بالاسم والصورة والفريق.','Carte Vainqueur dynamique créée.');}
    else if(q.includes('flag')||q.includes('علم')){addAssistantCard('flag',T('COUNTRY FLAG','علم الدولة','DRAPEAU'),'image');reply=T('Added a live country flag layer.','أضفت طبقة علم الدولة مرتبطة بالبيانات الحية.','Drapeau dynamique ajouté.');}
    else if(q.includes('player name')||q.includes('اسم اللاعب')){addAssistantCard('playerName',T('PLAYER NAME','اسم اللاعب','NOM DU JOUEUR'));reply=T('Added a dynamic player-name layer.','أضفت طبقة اسم اللاعب الديناميكية.','Nom du joueur dynamique ajouté.');}
    else if(q.includes('team name')||q.includes('اسم الفريق')){addAssistantCard('teamName',T('TEAM NAME','اسم الفريق','NOM ÉQUIPE'));reply=T('Added a dynamic team-name layer.','أضفت طبقة اسم الفريق الديناميكية.','Nom d’équipe dynamique ajouté.');}
    else if(q.includes('club')||q.includes('النادي')){addAssistantCard('clubName',T('CLUB NAME','اسم النادي','NOM CLUB'));reply=T('Added a dynamic club layer.','أضفت طبقة اسم النادي الديناميكية.','Nom du club dynamique ajouté.');}
    else if(q.includes('player number')||q.includes('رقم اللاعب')||q.includes('رقم لاعب')){addAssistantCard('playerNumber',T('PLAYER NUMBER','رقم اللاعب','NUMÉRO JOUEUR'));reply=T('Added the live player number.','أضفت رقم اللاعب المرتبط بالبيانات الحية.','Numéro du joueur dynamique ajouté.');}
    else if(q.includes('country')||q.includes('الدولة')||q.includes('علم')){addAssistantCard(q.includes('flag')||q.includes('علم')?'flag':'playerCountry',T('COUNTRY','الدولة','PAYS'),'text');reply=T('Added live country data.','أضفت بيانات الدولة الحية.','Données pays dynamiques ajoutées.');}
    else if(q.includes('warning')||q.includes('إنذار')||q.includes('تحذير')){addAssistantCard(q.includes('blue')||q.includes('أزرق')?'warningsBlue':'warningsRed',T('WARNINGS','الإنذارات','AVERTISSEMENTS'));reply=T('Added the live warning count.','أضفت عدد الإنذارات الحي.','Nombre d’avertissements dynamique ajouté.');}
    else if(q.includes('penalt')||q.includes('عقوبة')||q.includes('جزاء')){addAssistantCard(q.includes('blue')||q.includes('أزرق')?'penaltiesBlue':'penaltiesRed',T('PENALTIES','العقوبات','PÉNALITÉS'));reply=T('Added the live penalty count.','أضفت عدد العقوبات الحي.','Nombre de pénalités dynamique ajouté.');}
    else if(q.includes('round wins')||q.includes('جولات فاز')||q.includes('الجولات')){addAssistantCard(q.includes('blue')||q.includes('أزرق')?'roundWinsBlue':'roundWinsRed',T('ROUND WINS','الجولات الفائزة','ROUNDS GAGNÉS'));reply=T('Added the live round-win count.','أضفت عدد الجولات الفائزة المرتبط بالنتيجة.','Nombre de rounds gagnés ajouté.');}
    else if(q.includes('total score')||q.includes('المجموع')||q.includes('مجموع النقاط')){addAssistantCard(q.includes('blue')||q.includes('أزرق')?'totalScoreBlue':'totalScoreRed',T('TOTAL SCORE','مجموع النقاط','SCORE TOTAL'));reply=T('Added the live total score.','أضفت مجموع النقاط الحي.','Score total dynamique ajouté.');}
    else if(q.includes('referee')||q.includes('الحكم')){addAssistantCard('refereeName',T('REFEREE','الحكم','ARBITRE'));reply=T('Added the live referee name.','أضفت اسم الحكم المرتبط بالمباراة.','Nom de l’arbitre dynamique ajouté.');}
    else if(q.includes('date')||q.includes('التاريخ')){addAssistantCard('date',T('DATE','التاريخ','DATE'));reply=T('Added the live event date.','أضفت تاريخ الحدث.','Date de l’événement ajoutée.');}
    else if(q.includes('place')||q.includes('venue')||q.includes('المكان')){addAssistantCard('place',T('VENUE','المكان','LIEU'));reply=T('Added the live venue.','أضفت مكان الحدث.','Lieu de l’événement ajouté.');}
    else if(q.includes('weight')||q.includes('الوزن')){addAssistantCard('weight',T('WEIGHT','الوزن','POIDS'));reply=T('Added the live weight category.','أضفت فئة الوزن الحية.','Catégorie de poids dynamique ajoutée.');}
    else if(q.includes('age')||q.includes('العمر')||q.includes('الفئة العمرية')){addAssistantCard('age',T('AGE CATEGORY','الفئة العمرية','CATÉGORIE ÂGE'));reply=T('Added the live age category.','أضفت الفئة العمرية.','Catégorie d’âge ajoutée.');}
    else if(q.includes('gender')||q.includes('الجنس')){addAssistantCard('gender',T('GENDER','الجنس','GENRE'));reply=T('Added the live gender.','أضفت الجنس المرتبط بالمباراة.','Genre dynamique ajouté.');}
    else if(q.includes('mat')||q.includes('بساط')){addAssistantCard('mat',T('MAT','البساط','TAPIS'));reply=T('Added the live mat number.','أضفت رقم البساط.','Numéro de tapis ajouté.');}
    else if(q.includes('match type')||q.includes('نوع المباراة')){addAssistantCard('matchType',T('MATCH TYPE','نوع المباراة','TYPE DE MATCH'));reply=T('Added the live match type.','أضفت نوع المباراة.','Type de match ajouté.');}
    else if(q.includes('timer')||q.includes('الوقت')||q.includes('المؤقت')){addAssistantCard('timer',T('MATCH TIMER','وقت المباراة','CHRONO'));reply=T('Added the live match timer.','أضفت مؤقت المباراة الحي.','Chronomètre dynamique ajouté.');}
    else if(q.includes('status')||q.includes('حالة المباراة')){addAssistantCard('matchStatus',T('MATCH STATUS','حالة المباراة','ÉTAT DU MATCH'));reply=T('Added the live match status.','أضفت حالة المباراة الحية.','État du match ajouté.');}
    else if(q.includes('round score')||q.includes('نتيجة الجولة')){addAssistantCard(q.includes('red')||q.includes('أحمر')?'roundScoreRed':'roundScoreBlue',T('ROUND SCORE','نتيجة الجولة','SCORE ROUND'));reply=T('Added a live round-score layer.','أضفت نتيجة الجولة مرتبطة بإحصائيات الجولة.','Score de round dynamique ajouté.');}
    else if(q.includes('medal')||q.includes('ميدالية')){addAssistantCard('medalImage',T('MEDAL','الميدالية','MÉDAILLE'),'image');reply=T('Added the real local WAB-TKD medal asset as a dynamic design layer.','أضفت صورة الميدالية المحلية الحقيقية إلى التصميم.','Médaille locale WAB-TKD ajoutée.');}
    else if(q.includes('trophy')||q.includes('cup')||q.includes('كأس')){addAssistantCard('trophyImage',T('TROPHY','الكأس','COUPE'),'image');reply=T('Added the real local WAB-TKD trophy asset as a dynamic design layer.','أضفت صورة الكأس المحلية الحقيقية إلى التصميم.','Coupe locale WAB-TKD ajoutée.');}
    else if(q.includes('frame')||q.includes('إطار')||q.includes('cadre')){addLayer('frame');reply=T('Added an editable frame ready for live data binding.','أضفت إطارًا قابلًا للتعديل وجاهزًا لربط البيانات الحية.','Cadre éditable prêt pour les données dynamiques.');}
    else if(q.includes('button')||q.includes('زر')||q.includes('bouton')){const a=range?Number(range[1]):(at?Number(at[1]):design.currentTime);const b=range?Number(range[2]):Math.min(design.duration,a+2);createAssistantControl(raw.slice(0,48),a,b);reply=T(`Created a timed control from ${a.toFixed(2)}s to ${b.toFixed(2)}s.`,`أنشأت زر تحكم زمني من ${a.toFixed(2)} إلى ${b.toFixed(2)} ثانية.`,`Contrôle créé de ${a.toFixed(2)}s à ${b.toFixed(2)}s.`);}
    else if(q.includes('bigger')||q.includes('larger')||q.includes('كبر')||q.includes('كبّر')){if(selected){const v=selected.type==='text'?Math.max(12,(selected.fontSize||48)*1.25):selected.scale*1.2;updateLayer(selected.id,selected.type==='text'?{fontSize:v}:{scale:v},T('AI resize','تكبير بواسطة الذكاء','Redimensionnement IA'));reply=T('Made the selected element larger.','كبّرت العنصر المحدد.','Élément agrandi.');}}
    else if(q.includes('align')||q.includes('محاذ')){const ids=selectedIds.length?selectedIds:(selected?[selected.id]:[]);if(ids.length){const left=Math.min(...design.layers.filter(l=>ids.includes(l.id)).map(l=>l.x));commit({...design,layers:design.layers.map(l=>ids.includes(l.id)?{...l,x:left}:l)},T('AI align','محاذاة بالذكاء','Alignement IA'));}}
    else if(q.includes('center')||q.includes('وسط')){const ids=selectedIds.length?selectedIds:(selected?[selected.id]:[]);if(ids.length)commit({...design,layers:design.layers.map(l=>ids.includes(l.id)?{...l,x:(BROADCAST_DESIGN_WIDTH-l.width*l.scale)/2,y:(BROADCAST_DESIGN_HEIGHT-l.height*l.scale)/2}:l)},T('AI center','توسيط بالذكاء','Centrage IA'));}
    else if(q.includes('fit')||q.includes('ملاءمة')){const ids=selectedIds.length?selectedIds:(selected?[selected.id]:[]);commit({...design,layers:design.layers.map(l=>ids.includes(l.id)&&l.type==='text'?{...l,autoFit:true}:l)},T('AI auto-fit','ملاءمة النص','Ajustement auto'));}
    else if(q.includes('professional')||q.includes('احتراف')){if(selected)enhanceSelected();reply=T('Applied professional polish to the selected existing layer.','طبقت تحسينًا احترافيًا على الطبقة الموجودة المحددة.','Polissage professionnel appliqué.');}
    else {reply=T('I can create frames, bind player/team/club/flag/MVP/winner data, resize layers, and create timed controls.','أستطيع إنشاء إطارات وربط اللاعب والفريق والنادي والعلم وMVP والفائز، وتغيير الحجم وإنشاء أزرار بتوقيت.','Je peux créer des cadres, lier les données et créer des contrôles temporisés.');}
    if(reply===T('Done. The request was applied to the Draft.','تم تطبيق الطلب على المسودة.','Demande appliquée au brouillon.')) { const advanced=parseLocalDesignCommand(raw,design); if(advanced.actions.length){commit(applyDesignAIResult(design,advanced),'Advanced local Design AI'); reply=advanced.message;} }
    setAssistantMessages(m=>[...m,{role:'assistant',text:reply}]);setAssistantCommand(''); };


  const dnaDefaults = design.dna || {
    purpose: `${animationId.toUpperCase()} broadcast scene`, trigger: 'Animation controller', previousAnimationId: null, nextAnimationId: null,
    matchTypes: ['INDIVIDUAL','TEAM','HYBRID'], audience: 'both' as const, controller: 'main-referee' as const,
    interruptRules: ['Cancel on stale instance','Respect referee confirmation'], dynamicVariables: design.layers.filter(l=>l.binding&&l.binding!=='static').map(l=>String(l.binding)),
    assets: design.layers.filter(l=>l.imageSrc).map(l=>l.name), sound: 'Existing project audio / optional'
  };



  return <div dir={uiLang === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 overflow-hidden bg-[#05070d] text-white font-sans">
    {mirrorPublic && (
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] rounded-full px-4 py-1.5 border border-emerald-400/35 bg-emerald-400/10 text-emerald-200 text-[9px] font-black tracking-[.14em] shadow-lg pointer-events-none">
        ● PUBLIC DISPLAY MIRROR {mirrorDisplayId ? `· DISPLAY ${mirrorDisplayId}` : ''} · SAME NATIVE RENDERER
      </div>
    )}
    <header className="h-14 border-b border-white/10 bg-[#090c14] flex items-center gap-2 px-3 shrink-0">
      <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5"><ArrowLeft size={16}/></button>
      <div className="font-black tracking-wider text-[13px] text-yellow-200">{T('WAB-TKD BROADCAST DESIGN STUDIO','استوديو تصميم بث WAB-TKD','WAB-TKD STUDIO DE DESIGN DIFFUSION')}</div>
      <div className="h-6 w-px bg-white/10 mx-1"/>
      <select value={animationId} onChange={e => changeAnimation(e.target.value as DesignAnimationId)} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-black">
        {DESIGN_ANIMATIONS.filter(a => a.id !== 'custom').map(a => <option key={a.id} value={a.id}>{animationLabel(a.id, a.label)}</option>)}
      </select>
      <div className="flex items-center gap-1">
        <Languages size={13} className="text-white/40"/>
        <select value={studioLanguage} onChange={e=>{ const v=e.target.value as 'en'|'ar'|'fr'; setStudioLanguage(v); try{localStorage.setItem('wab-tkd-design-studio-language-v1',v)}catch{}; setDesign(d=>({...d,language:v})) }} className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[9px] font-black">
          <option value="en">EN · LTR</option><option value="ar">AR · RTL</option><option value="fr">FR · LTR</option>
        </select>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[8px] font-black text-white/50">{T('DRAFT','مسودة','BROUILLON')} {design.draftVersion || 0}</span>
        <span className="rounded border border-emerald-400/20 bg-emerald-400/5 px-2 py-1 text-[8px] font-black text-emerald-300/70">{T('PUBLISHED','منشور','PUBLIÉ')} {design.publishedVersion || 0}</span>
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={undo} disabled={!history.length} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-25" title={T('Undo','تراجع','Annuler')}><Undo2 size={15}/></button>
        <button onClick={redo} disabled={!future.length} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-25" title={T('Redo','إعادة','Rétablir')}><Redo2 size={15}/></button>
        <button onClick={() => setDesign(d => ({ ...d, frozen: !d.frozen }))} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border ${design.frozen ? 'border-red-400/50 text-red-300 bg-red-400/10' : 'border-white/10 text-white/70'}`}><Square size={11} className="inline mr-1"/>{design.frozen ? T('FROZEN','مجمّد','FIGÉ') : T('FREEZE','تجميد','GELER')}</button>
        <button onClick={() => setDesign(d => ({ ...d, currentTime: 0 }))} className="px-2 py-1.5 rounded-lg text-[10px] font-black border border-white/10" title={T('First frame','الإطار الأول')}>|◀</button>
        <button onClick={() => setDesign(d => ({ ...d, currentTime: Math.max(0, Number((d.currentTime - 0.1).toFixed(2))) }))} className="px-2 py-1.5 rounded-lg text-[10px] font-black border border-white/10" title={T('Step back','خطوة للخلف')}>◀</button>
        <button onClick={() => setShowGrid(v=>!v)} title="Toggle grid (G)" className={`rounded border px-2 py-1 text-[9px] ${showGrid?'border-yellow-400/40 bg-yellow-400/10':''}`}>{T('GRID','الشبكة','GRILLE')}</button>
        <button onClick={() => setShowGuides(v=>!v)} title="Toggle guides" className={`rounded border px-2 py-1 text-[9px] ${showGuides?'border-yellow-400/40 bg-yellow-400/10':''}`}>{T('GUIDES','الأدلة','GUIDES')}</button>
        <button onClick={() => setSnap(v=>!v)} title="Toggle snap / تفعيل الالتقاط" className={`rounded border px-2 py-1 text-[9px] ${snap?'border-yellow-400/40 bg-yellow-400/10':''}`}>{T('SNAP','التقاط ومحاذاة','ACCROCHAGE')}</button>
        <button onClick={()=>setAdvancedOpen(v=>!v)} title="Advanced production controls" className={`rounded border px-2 py-1 text-[9px] font-black ${advancedOpen?'border-violet-400/40 bg-violet-400/10 text-violet-200':'border-white/10'}`}>⚙ PRO</button>
        <button onClick={()=>{setStudioFullscreen(true);document.documentElement.requestFullscreen?.().catch(()=>{})}} className="rounded border border-white/10 px-2 py-1 text-[9px]" title="Fullscreen Studio">⛶</button>
        <button onClick={() => setSettingsOpen(v=>!v)} title="Professional design settings / إعدادات التصميم الاحترافية" className={`rounded border px-2 py-1 text-[9px] font-black ${settingsOpen?'border-yellow-400/40 bg-yellow-400/10 text-yellow-200':'border-white/10'}`}><Settings size={11} className="inline mr-1"/>{T('DESIGN','التصميم','DESIGN')}</button>
        <button onClick={requestCapture} title="Capture real animation layers / التقاط طبقات الأنيميشن الحقيقي" className={`rounded border px-2 py-1 text-[9px] font-black ${inspectorStatus==='captured'?'border-emerald-400/40 bg-emerald-400/10 text-emerald-300':'border-blue-400/25 bg-blue-400/5 text-blue-200'}`}><Layers3 size={11} className="inline mr-1"/>{T('CAPTURE','فحص الأنيميشن','CAPTURE')}</button>
        <button onClick={() => setPreviewMode(v => !v)} title={T('Toggle native animation preview / تحرير الطبقات','إظهار الأنيميشن الحقيقي أو محرر الطبقات','Afficher l’animation réelle ou l’éditeur')} className={`rounded border px-2 py-1 text-[9px] font-black ${previewMode?'border-cyan-400/40 bg-cyan-400/10 text-cyan-200':'border-white/10 text-white/60'}`}><Eye size={11} className="inline mr-1"/>{previewMode ? T('ANIMATION','الأنيميشن','ANIMATION') : T('LAYERS','الطبقات','CALQUES')}</button>
        <button onClick={() => { const next=!liveEditMode; setLiveEditMode(next); try { liveEditChannelRef.current?.postMessage(next ? {type:'live-edit',animationId,design,runtimeTime:design.currentTime,enabled:true} : {type:'live-edit-clear',animationId}); } catch {} }} title={T('Edit the currently running match live — draft only until you turn this off','تعديل المباراة الحية مباشرة — يبقى كتعديل مؤقت ولا يحفظ إلا عند SAVE/PUBLISH','Modifier le match en direct — brouillon uniquement')} className={`rounded border px-2 py-1 text-[9px] font-black ${liveEditMode?'border-red-400/50 bg-red-400/15 text-red-200 animate-pulse':'border-emerald-400/25 bg-emerald-400/5 text-emerald-200'}`}>{liveEditMode?'● LIVE EDIT':'LIVE EDIT'}</button>
        <button onClick={() => setCommandHelp(v=>!v)} title="Keyboard shortcuts / اختصارات لوحة المفاتيح" className="rounded border border-white/10 px-2 py-1 text-[9px]">{T('SHORTCUTS','الاختصارات','RACCOURCIS')}</button>
        <button onClick={() => setPlaying(v => !v)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-black border border-white/10 hover:bg-white/5">{playing ? <Pause size={11} className="inline mr-1"/> : <Play size={11} className="inline mr-1"/>}{playing ? T('PAUSE','إيقاف مؤقت','PAUSE') : T('PLAY','تشغيل','LECTURE')}</button>
        <button onClick={() => setDesign(d => ({ ...d, currentTime: Math.min(d.duration, Number((d.currentTime + 0.1).toFixed(2))) }))} className="px-2 py-1.5 rounded-lg text-[10px] font-black border border-white/10" title={T('Step forward','خطوة للأمام')}>▶</button>
        <button onClick={async()=>{try{await window.electronAPI?.openPublicDisplay?.();}catch{}}} className="px-2.5 py-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 text-blue-200 text-[10px] font-black"><Monitor size={11} className="inline mr-1"/>{T('AUDIENCE','شاشة الجمهور','PUBLIC')}</button>
        <button onClick={save} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black"><Save size={11} className="inline mr-1"/>{T('SAVE DRAFT','حفظ المسودة','ENREGISTRER LE BROUILLON')}</button>
        <button onClick={exportCurrentDesign} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black"><Download size={11} className="inline mr-1"/>{T('EXPORT .DESIGN','تصدير .DESIGN','EXPORTER .DESIGN')}</button>
        <button onClick={()=>designFileRef.current?.click()} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black"><Upload size={11} className="inline mr-1"/>{T('IMPORT .DESIGN','استيراد .DESIGN','IMPORTER .DESIGN')}</button>
        <button onClick={publish} className="px-2.5 py-1.5 rounded-lg bg-yellow-400/15 border border-yellow-400/35 text-yellow-200 text-[10px] font-black"><CheckCircle2 size={11} className="inline mr-1"/>{T('PUBLISH','نشر','PUBLIER')}</button>
      </div>
    </header>

    <div className="h-[calc(100%-56px)] grid grid-cols-[260px_minmax(0,1fr)_300px] grid-rows-[minmax(0,1fr)_175px]">
      <aside className="row-span-2 border-r border-white/10 bg-[#080b12] overflow-y-auto p-2">
        <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/[.03] p-2 mb-2">
          <div className="text-[9px] font-black tracking-[.16em] text-yellow-200">ALL ANIMATIONS · {DESIGN_ANIMATIONS.filter(a=>a.id!=='custom').length}</div>
          <div className="mt-1 text-[8px] leading-4 text-white/45">{T('Choose any animation above. The preview is the real WAB-TKD composition. Click an object directly to select it; Ctrl/Cmd-click selects multiple elements.','اختر أي أنيميشن من الأعلى. المعاينة هي تركيب WAB-TKD الحقيقي. اضغط على أي عنصر مباشرة لتحديده، وCtrl/Cmd لتحديد عدة عناصر.','Choisissez une animation ci-dessus. L’aperçu utilise la vraie composition WAB-TKD. Cliquez un objet pour le sélectionner ; Ctrl/Cmd pour en sélectionner plusieurs.')}</div>
        </div>
        <div className="text-[9px] font-black tracking-[.18em] text-white/40 px-2 py-2">{T('LAYERS','الطبقات','CALQUES')}</div>
        {roots.map(layer => renderTree(layer))}
        <div className="grid grid-cols-2 gap-1 mt-3">
          <button onClick={() => addLayer('text')} className="rounded-lg border border-white/10 p-2 text-[9px] font-bold"><Type size={12} className="mx-auto mb-1"/>{T('TEXT','نص','TEXTE')}</button>
          <button onClick={() => addLayer('frame')} className="rounded-lg border border-white/10 p-2 text-[9px] font-bold"><SquareDashed size={12} className="mx-auto mb-1"/>{T('FRAME','إطار','CADRE')}</button>
          <button onClick={() => { addLayer('image'); setTimeout(() => fileRef.current?.click(), 20); }} className="rounded-lg border border-white/10 p-2 text-[9px] font-bold"><ImageIcon size={12} className="mx-auto mb-1"/>{T('IMAGE','صورة','IMAGE')}</button>
          <button onClick={() => addLayer('effect')} className="rounded-lg border border-white/10 p-2 text-[9px] font-bold"><Sparkles size={12} className="mx-auto mb-1"/>{T('EFFECT','تأثير','EFFET')}</button>
          <button onClick={groupSelected} className="rounded-lg border border-white/10 p-2 text-[9px] font-bold"><Group size={12} className="mx-auto mb-1"/>{T('GROUP','تجميع','GROUPE')}</button>
          <button onClick={ungroup} className="rounded-lg border border-white/10 p-2 text-[9px] font-bold"><Ungroup size={12} className="mx-auto mb-1"/>{T('UNGROUP','فك التجميع','DÉGROUPE')}</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onDropImage}/>
        <input ref={fontRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={importFont}/>
        <input ref={designFileRef} type="file" accept=".design,.json,application/json" className="hidden" onChange={importDesignFile}/>
        <div className="mt-3 flex items-center justify-between px-2"><div className="text-[9px] font-black tracking-[.18em] text-white/40">{T('ASSET LIBRARY','مكتبة الأصول','BIBLIOTHÈQUE DES ASSETS')}</div><button onClick={()=>fileRef.current?.click()} className="rounded border border-yellow-400/20 px-2 py-1 text-[8px] text-yellow-200"><Upload size={10} className="inline mr-1"/>{T('IMPORT','استيراد','IMPORTER')}</button></div>
        <input value={assetSearch} onChange={e=>setAssetSearch(e.target.value)} placeholder={T('Search assets','ابحث في الأصول','Rechercher un asset')} className="mt-2 w-full rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-[9px] outline-none focus:border-yellow-400/30"/>
        <div className="grid grid-cols-3 gap-1 mt-1">{(['all','image','logo','flag','photo','effect'] as const).map(f=><button key={f} onClick={()=>setAssetFilter(f)} className={`rounded border px-1 py-1 text-[7px] ${assetFilter===f?'border-yellow-400/40 text-yellow-200':'border-white/10 text-white/40'}`}>{f.toUpperCase()}</button>)}</div>
        <div className="mt-1 text-[8px] text-white/30 px-1">{T('Click = add to animation · Select an image layer to replace it · Drag files directly onto the canvas.','اضغط لإضافة الأصل إلى الأنيميشن · اختر طبقة صورة لاستبدالها · أو اسحب الملفات مباشرة إلى اللوحة.','Cliquez pour ajouter à l’animation · sélectionnez une image pour la remplacer · ou glissez un fichier sur la zone de travail.')}</div>
        <div className="grid grid-cols-4 gap-1 mt-2 max-h-56 overflow-y-auto">
          {filteredAssets.slice(0, 120).map(asset => <button key={asset.id} onClick={() => assignAsset(asset.url, asset.name)} className="aspect-square rounded border border-white/10 bg-black/30 overflow-hidden hover:border-yellow-400/40 relative group" title={asset.name}><img src={asset.url} alt={asset.name} className="w-full h-full object-contain"/><span className="absolute bottom-0 inset-x-0 bg-black/70 text-[6px] truncate px-1 opacity-0 group-hover:opacity-100">{asset.name}</span></button>)}
        </div>
        <div className="mt-2 rounded-xl border border-blue-400/15 bg-blue-400/[.03] p-3 text-[9px] leading-4 text-white/55">
          <b className="text-blue-200">{T('REAL ANIMATION INSPECTOR','فاحص الأنيميشن الحقيقي','INSPECTEUR D’ANIMATION RÉELLE')}</b><br/>
          {inspectorStatus === 'captured' ? T('Real visual layers captured. Edit them here; SAVE/PUBLISH applies only to this animation.','تم التقاط الطبقات المرئية الحقيقية. عدّلها هنا؛ الحفظ والنشر يطبّقان على هذا الأنيميشن فقط.','Les calques visuels réels sont capturés. Modifiez-les ici ; enregistrer/publier s’applique uniquement à cette animation.') : T('Open Studio from Operator while the animation is visible, then press CAPTURE.','افتح الاستوديو من المشغّل أثناء ظهور الأنيميشن، ثم اضغط فحص الأنيميشن.','Ouvrez le Studio depuis l’Opérateur pendant l’animation, puis appuyez sur Capture.')}
        </div>
        <div className="mt-3 rounded-xl border border-yellow-400/15 bg-yellow-400/[.03] p-3 text-[9px] leading-4 text-white/50">
          <b className="text-yellow-200">{T('LIVE OUTPUT','الإخراج المباشر','SORTIE EN DIRECT')}</b><br/>
          {T('Studio preview only. Public Display uses the last published version.','المعاينة داخل الاستوديو فقط. شاشة الجمهور تستخدم آخر نسخة منشورة.','Aperçu Studio uniquement. L’écran public utilise la dernière version publiée.')}
        </div>
        <button onClick={() => setDesign(d => ({ ...d, livePreview: !d.livePreview }))} className={`w-full mt-2 rounded-lg border px-2 py-2 text-[10px] font-black ${design.livePreview ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/50'}`}><Monitor size={12} className="inline mr-1"/>{design.livePreview ? T('LIVE PREVIEW ON','المعاينة المباشرة مفعلة','APERÇU EN DIRECT ACTIVÉ') : T('LIVE PREVIEW OFF','المعاينة المباشرة متوقفة','APERÇU EN DIRECT DÉSACTIVÉ')}</button>
        <button onClick={reset} className="w-full mt-2 rounded-lg border border-red-400/20 text-red-300/80 px-2 py-2 text-[10px] font-black"><RotateCcw size={12} className="inline mr-1"/>{T('RESTORE ORIGINAL','استعادة الأصل','RESTAURER L’ORIGINAL')}</button>
      </aside>

      <main className="relative overflow-hidden bg-[#0b0e16] flex items-center justify-center">
        {previewMode ? (
          <div className="absolute inset-3 flex items-center justify-center rounded-xl border border-cyan-400/15 bg-black/30 overflow-hidden">
            <div className="relative w-full max-w-[calc(100%-12px)] aspect-video overflow-hidden rounded-lg border-2 border-yellow-400/25 shadow-[0_25px_90px_rgba(0,0,0,.75)] bg-black">
              <div className="absolute top-2 right-2 z-[100001] flex items-center gap-1">
                <button onClick={()=>setScreenSelectMode(v=>!v)} className={`rounded border px-2 py-1 text-[8px] font-black ${screenSelectMode?'border-emerald-400/40 bg-emerald-400/10 text-emerald-200':'border-white/10 text-white/45'}`}>{screenSelectMode?'CLICK SELECT ON':'SCREEN SELECT OFF'}</button>
                <select value={previewStage} onChange={e=>{setScanAllStages(false);setPreviewStage(e.target.value)}} className="rounded border border-white/10 bg-black/80 px-2 py-1 text-[8px] font-black text-white">
                  <option value="main">MAIN STAGE</option><option value="blue">BLUE</option><option value="red">RED</option><option value="ready">READY</option><option value="accepted">ACCEPTED</option><option value="rejected">REJECTED</option><option value="ai">AI REVIEW</option><option value="voting">VOTING</option>
                </select>
                <button onClick={()=>setScanAllStages(v=>!v)} className={`rounded border px-2 py-1 text-[8px] font-black ${scanAllStages?'border-emerald-400/40 bg-emerald-400/10 text-emerald-200':'border-yellow-400/20 text-yellow-200'}`}>{scanAllStages?'SCANNING…':'SCAN ALL STAGES'}</button>
              </div>
              <BroadcastDesignStudioPreview animationId={animationId} design={design} playing={playing} previewStage={previewStage} />
              <div className="absolute top-2 left-2 z-[100000] rounded bg-black/70 border border-cyan-400/25 px-2 py-1 text-[8px] font-black text-cyan-200 pointer-events-none">{T('NATIVE ANIMATION PREVIEW · REAL PUBLIC DISPLAY COMPOSITION','معاينة الأنيميشن الحقيقية · نفس تركيب شاشة الجمهور','APERÇU NATIF · MÊME COMPOSITION QUE LE PUBLIC')}</div>
              <div className="absolute bottom-2 right-2 z-[100000] rounded bg-black/75 border border-white/10 px-2 py-1 text-[8px] font-black text-white/60 pointer-events-none">{inspectorStatus === 'captured' ? T('LAYERS CAPTURED · EDIT MODE READY','تم التقاط الطبقات · محرر جاهز','CALQUES CAPTURÉS · ÉDITION PRÊTE') : T('CAPTURING REAL ANIMATION…','جارٍ التقاط الأنيميشن الحقيقي…','CAPTURE DE L’ANIMATION RÉELLE…')}</div>
            </div>
          </div>
        ) : (
          <>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '32px 32px' }}/>
        <div ref={canvasRef} onDragOver={e=>e.preventDefault()} onDrop={onCanvasFileDrop} className="relative shadow-[0_30px_90px_rgba(0,0,0,.65)] border-2 border-yellow-400/30 overflow-hidden" style={{ width: BROADCAST_DESIGN_WIDTH * canvasScale, height: BROADCAST_DESIGN_HEIGHT * canvasScale, background: design.canvas.background }} onPointerDown={e=>{ if(pathDrawMode && selected){ const r=canvasRef.current?.getBoundingClientRect(); if(r){ addMotionPoint(clamp((e.clientX-r.left)/canvasScale,0,BROADCAST_DESIGN_WIDTH),clamp((e.clientY-r.top)/canvasScale,0,BROADCAST_DESIGN_HEIGHT)); } } }} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp}>
          <div className="absolute inset-0" style={{ transform: `scale(${canvasScale})`, transformOrigin: 'top left', width: BROADCAST_DESIGN_WIDTH, height: BROADCAST_DESIGN_HEIGHT }}>
            {safeArea && <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 1920 1080"><rect x={96} y={54} width={1728} height={972} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="12 10" opacity=".32"/><rect x={192} y={108} width={1536} height={864} fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="8 10" opacity=".25"/><line x1="960" y1="0" x2="960" y2="1080" stroke="#fff" strokeWidth="1" opacity=".12"/><line x1="0" y1="540" x2="1920" y2="540" stroke="#fff" strokeWidth="1" opacity=".12"/></svg>}
            {visibleEditorLayers.filter(l => l.visible).sort((a,b) => a.zIndex-b.zIndex).map(layer => {
              const isSelected = selected?.id === layer.id;
              const c = layer.effectColor || layer.borderColor || layer.color || '#ffd866';
              const intensity = Math.max(0, layer.effectIntensity ?? .75);
              const radius = layer.effectRadius ?? 28;
              const shadow = layer.shadowBlur ? `${layer.shadowX || 0}px ${layer.shadowY || 10}px ${layer.shadowBlur}px ${layer.shadowColor || '#000000'}88` : undefined;
              const glow = ['glow','bloom','shine','energy','spark','light'].includes(layer.effect || '') ? `0 0 ${radius}px ${c}${Math.min(99,Math.round(intensity*99)).toString(16).padStart(2,'0')}, 0 0 ${radius*2}px ${c}44` : undefined;
              const clip = layer.frameStyle === 'hex' ? 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)' : layer.frameStyle === 'diamond' ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : layer.frameStyle === 'cut-corner' ? 'polygon(0 18px,18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px))' : layer.frameStyle === 'bracket' ? 'polygon(0 0,28% 0,28% 3%,3% 3%,3% 97%,28% 97%,28% 100%,0 100%,0 72%,3% 72%,3% 28%,0 28%,72% 0,100% 0,100% 28%,97% 28%,97% 72%,100% 72%,100% 100%,72% 100%)' : undefined;
              const gradient = layer.gradient || (layer.effect === 'gradient' ? `linear-gradient(135deg, ${c}, transparent 70%)` : layer.background);
              return <div key={layer.id} onPointerDown={e => onCanvasPointerDown(e, layer)} className={`absolute select-none ${isSelected ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-transparent' : ''}`} style={{ left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation}deg) scale(${layer.scale})`, opacity: layer.opacity, zIndex: layer.zIndex, transformOrigin: 'center center', background: gradient, border: layer.borderWidth ? `${layer.borderWidth}px ${layer.borderStyle || 'solid'} ${layer.borderColor || '#fff'}` : undefined, borderRadius: layer.frameStyle === 'circle' ? '50%' : layer.frameStyle === 'diamond' || layer.frameStyle === 'hex' || layer.frameStyle === 'cut-corner' || layer.frameStyle === 'bracket' ? 0 : layer.borderRadius, clipPath: clip, boxSizing: 'border-box', color: layer.color || '#fff', display: layer.type === 'text' ? 'flex' : 'block', alignItems: 'center', justifyContent: layer.textAlign === 'right' ? 'flex-end' : layer.textAlign === 'left' ? 'flex-start' : 'center', textAlign: layer.textAlign, fontFamily: layer.fontFamily, fontSize: layer.autoFit && layer.type === 'text' ? Math.max(8, Math.min(layer.fontSize || 48, (layer.width || 200) / Math.max(1, (layer.text || layer.name || '').length * .58))) : layer.fontSize, fontWeight: layer.fontWeight, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing, direction: layer.direction === 'auto' ? undefined : layer.direction, textShadow: layer.textStrokeWidth ? `-${layer.textStrokeWidth}px 0 ${layer.textStrokeColor}, ${layer.textStrokeWidth}px 0 ${layer.textStrokeColor}, 0 -${layer.textStrokeWidth}px ${layer.textStrokeColor}, 0 ${layer.textStrokeWidth}px ${layer.textStrokeColor}` : undefined, boxShadow: [shadow, glow].filter(Boolean).join(', ') || undefined, filter: layer.filter, pointerEvents: 'auto' }}>
                {layer.frameStyle === 'double' && <div className="absolute inset-2 pointer-events-none" style={{border:`${Math.max(1,layer.borderWidth||2)}px solid ${layer.borderColor||c}`,borderRadius:layer.borderRadius}}/>}
                {layer.frameStyle === 'neon' && <div className="absolute inset-0 pointer-events-none" style={{boxShadow:`inset 0 0 ${radius}px ${c}, inset 0 0 ${radius*2}px ${c}66`}}/>}
                {layer.type === 'image' && layer.imageSrc ? <img src={layer.imageSrc} alt="" className="w-full h-full object-contain pointer-events-none"/> : null}{layer.type === 'video' && (layer as any).videoSrc ? <video src={(layer as any).videoSrc} className="w-full h-full object-contain pointer-events-none" muted playsInline autoPlay loop/> : null}
                {layer.type === 'text' ? (layer.text || layer.name) : null}
                {layer.type === 'effect' && <div className="w-full h-full" style={{ background: layer.effect === 'particles' || layer.effect === 'spark' ? `radial-gradient(circle at 20% 30%, ${c} 0 1px, transparent 2px),radial-gradient(circle at 70% 65%, #fff 0 1px, transparent 2px),radial-gradient(circle at 45% 80%, ${c} 0 1px, transparent 2px)` : layer.effect === 'shine' ? `linear-gradient(120deg, transparent 35%, ${c}99 50%, transparent 65%)` : layer.effect === 'scanline' ? `repeating-linear-gradient(0deg, transparent 0 5px, ${c}22 6px 7px)` : layer.effect === 'energy' ? `radial-gradient(circle at center, ${c}66, transparent 65%)` : layer.effect === 'smoke' ? `radial-gradient(circle at 30% 60%, #fff2, transparent 40%), radial-gradient(circle at 70% 30%, ${c}22, transparent 45%)` : 'transparent', filter: layer.effect === 'blur' ? `blur(${radius/3}px)` : undefined }}/>} 
              </div>;
            })}
            {selected && <>
              <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${BROADCAST_DESIGN_WIDTH} ${BROADCAST_DESIGN_HEIGHT}`} preserveAspectRatio="none">
                {(selected.motionPath||[]).length>1 && <path d={(selected.motionPath||[]).slice(0,-1).map((p:any,i:number)=>{const n:any=(selected.motionPath||[])[i+1];const c1x=p.cp2x??(p.x+(n.x-p.x)/3),c1y=p.cp2y??(p.y+(n.y-p.y)/3),c2x=n.cp1x??(p.x+2*(n.x-p.x)/3),c2y=n.cp1y??(p.y+2*(n.y-p.y)/3);return `${i===0?`M ${p.x} ${p.y}`:''} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${n.x} ${n.y}`}).join(' ')} fill="none" stroke="#ffd866" strokeWidth="3" strokeDasharray="10 8" opacity=".9" />}
                {(selected.motionPath||[]).map((p:any,i:number)=><React.Fragment key={`${selected.id}-path-${i}`}><circle cx={p.x} cy={p.y} r="9" fill="#0b0e16" stroke="#ffd866" strokeWidth="3" className="pointer-events-auto cursor-move" onDoubleClick={e=>{e.stopPropagation(); removeMotionPoint(i);}} onPointerDown={e=>{e.stopPropagation(); pathDragState.current={id:selected.id,index:i,kind:'point'}; (e.currentTarget as any).setPointerCapture?.(e.pointerId);}} />{p.cp1x!==undefined&&p.cp1y!==undefined&&<><line x1={p.x} y1={p.y} x2={p.cp1x} y2={p.cp1y} stroke="#60a5fa" strokeWidth="2" opacity=".7"/><circle cx={p.cp1x} cy={p.cp1y} r="6" fill="#60a5fa" stroke="#08111f" strokeWidth="2" className="pointer-events-auto cursor-crosshair" onPointerDown={e=>{e.stopPropagation();pathDragState.current={id:selected.id,index:i,kind:'cp1'};}}/></>}{p.cp2x!==undefined&&p.cp2y!==undefined&&<><line x1={p.x} y1={p.y} x2={p.cp2x} y2={p.cp2y} stroke="#a78bfa" strokeWidth="2" opacity=".7"/><circle cx={p.cp2x} cy={p.cp2y} r="6" fill="#a78bfa" stroke="#08111f" strokeWidth="2" className="pointer-events-auto cursor-crosshair" onPointerDown={e=>{e.stopPropagation();pathDragState.current={id:selected.id,index:i,kind:'cp2'};}}/></>}</React.Fragment>)}
              </svg>
              <div className="absolute pointer-events-none" style={{left:selected.x-8,top:selected.y-8,width:selected.width+16,height:selected.height+16,transform:`rotate(${selected.rotation}deg)`,transformOrigin:'center center'}}>
                {['nw','n','ne','e','se','s','sw','w'].map(h=><div key={h} className="absolute w-3 h-3 bg-yellow-300 border border-black rounded-sm pointer-events-auto cursor-crosshair" style={{left:h.includes('w')?'-6px':h.includes('e')?`calc(100% - 6px)`:'calc(50% - 6px)',top:h.includes('n')?'-6px':h.includes('s')?`calc(100% - 6px)`:'calc(50% - 6px)'}} onPointerDown={e=>startResize(e,selected,h)} />)}
                <div className="absolute left-1/2 -translate-x-1/2 -top-9 w-3 h-3 rounded-full bg-blue-300 border border-black pointer-events-auto cursor-grab" onPointerDown={e=>startRotate(e,selected)} title={T('Rotate','تدوير','Rotation')} />
              </div>
            </>}
          </div>
          <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-[8px] font-black tracking-wider text-yellow-200">{T('1920×1080 · DESIGN','1920×1080 · التصميم','1920×1080 · DESIGN')} · {design.name} · v{design.version}</div>
        </div>
          </>
        )}
      </main>

      <aside className="border-l border-white/10 bg-[#080b12] overflow-y-auto p-3">
        <div className="text-[9px] font-black tracking-[.18em] text-white/40 mb-2">{T('PROPERTIES','الخصائص','PROPRIÉTÉS')}</div>
        {!selected ? <div className="rounded-xl border border-white/10 p-4 text-[10px] text-white/40">{T('Select any layer. Every visible element is independently editable.','اختر أي طبقة. كل عنصر مرئي قابل للتحرير بشكل مستقل.','Sélectionnez un calque. Chaque élément visible est modifiable indépendamment.')}</div> : <div className="space-y-3">
          <input value={selected.name} onChange={e => updateLayer(selected.id, { name: e.target.value }, 'Rename layer')} className="w-full rounded-lg bg-black/30 border border-white/10 px-2 py-2 text-[11px] font-bold"/>
          <div className="grid grid-cols-2 gap-2 mb-2"><button onClick={()=>setIsolatedLayerId(isolatedLayerId===selected.id?null:selected.id)} className="rounded border border-cyan-400/20 text-cyan-200 py-1.5 text-[8px]">{isolatedLayerId===selected.id?T('EXIT ISOLATION','الخروج من العزل','QUITTER ISOLATION'):T('ISOLATE','عزل الطبقة','ISOLER')}</button><button onClick={()=>setBeforeAfter(v=>v==='modified'?'original':'modified')} className="rounded border border-purple-400/20 text-purple-200 py-1.5 text-[8px]">{beforeAfter==='modified'?T('BEFORE / ORIGINAL','قبل / الأصل','AVANT / ORIGINAL'):T('AFTER / MODIFIED','بعد / المعدل','APRÈS / MODIFIÉ')}</button></div>
          <div className="grid grid-cols-3 gap-2"><button onClick={enhanceSelected} className="rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-200 px-2 py-2 text-[9px] font-black"><Sparkles size={11} className="inline mr-1"/>{T('ENHANCE EXISTING','تقوية الموجود','RENFORCER')}</button><button onClick={polishExisting} className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 px-2 py-2 text-[9px] font-black">{T('POLISH','تحسين احترافي','POLIR')}</button><button onClick={smoothSelectedMotion} disabled={!selected.keyframes.length} className="rounded-lg border border-blue-400/20 bg-blue-400/10 text-blue-200 px-2 py-2 text-[9px] font-black disabled:opacity-30">{T('SMOOTH MOTION','تنعيم الحركة','MOUVEMENT FLUIDE')}</button></div>
          <div className="grid grid-cols-2 gap-2">
            {(['x','y','width','height','rotation','scale','opacity'] as const).map(key => <label key={key} className="text-[8px] text-white/40 uppercase">{key}<input type="number" step={key === 'scale' || key === 'opacity' ? .05 : 1} value={(selected as any)[key]} onChange={e => updateLayer(selected.id, { [key]: Number(e.target.value) } as any, `Change ${key}`)} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px] text-white"/></label>)}
          </div>
          {(selected.type === 'video') && <>
            <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/[.03] p-2 space-y-2">
              <div className="text-[8px] font-black tracking-widest text-cyan-200">VIDEO / REPLAY MEDIA</div>
              <button onClick={()=>fileRef.current?.click()} className="w-full rounded border border-cyan-400/25 bg-cyan-400/10 text-cyan-200 py-2 text-[9px] font-black">{T('REPLACE VIDEO','استبدال الفيديو','REMPLACER LA VIDÉO')}</button>
              <div className="text-[7px] text-white/35">{T('The selected video stays inside this animation and can be positioned, scaled, masked and animated with keyframes.','الفيديو المحدد يبقى داخل هذا الأنيميشن ويمكن تحريكه وتكبيره وقصّه وربطه بالإطارات المفتاحية.','La vidéo reste dans cette animation et peut être déplacée, redimensionnée, masquée et animée.')}</div>
            </div>
          </>}
          {(selected.type === 'text') && <>
            <textarea value={selected.text || ''} onChange={e => updateLayer(selected.id, { text: e.target.value }, 'Edit text')} className="w-full h-20 rounded-lg bg-black/30 border border-white/10 p-2 text-[11px]"/>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[8px] text-white/40">{T('FONT','الخط','POLICE')}<input value={selected.fontFamily || ''} onChange={e => updateLayer(selected.id, { fontFamily: e.target.value }, 'Change font')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label>
              <label className="text-[8px] text-white/40">{T('SIZE','الحجم','TAILLE')}<input type="number" value={selected.fontSize || 48} onChange={e => updateLayer(selected.id, { fontSize: Number(e.target.value) }, 'Change font size')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[8px] text-white/40">{T('FONT FAMILY','عائلة الخط','FAMILLE DE POLICE')}<select value={selected.fontFamily || 'Inter'} onChange={e=>updateLayer(selected.id,{fontFamily:e.target.value},'Change font family')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]">{[...fontFamilies,...customFonts.map(f=>f.name)].filter((v,i,a)=>a.indexOf(v)===i).map(f=><option key={f} value={f}>{f}</option>)}</select></label>
              <label className="text-[8px] text-white/40">{T('WEIGHT','السماكة','ÉPAISSEUR')}<select value={String(selected.fontWeight || 800)} onChange={e=>updateLayer(selected.id,{fontWeight:Number(e.target.value)},'Change font weight')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]">{[300,400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[8px] text-white/40">{T('ALIGN','المحاذاة','ALIGNEMENT')}<select value={selected.textAlign || 'center'} onChange={e=>updateLayer(selected.id,{textAlign:e.target.value as any},'Change text alignment')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"><option value="left">{T('Left','يسار','Gauche')}</option><option value="center">{T('Center','وسط','Centre')}</option><option value="right">{T('Right','يمين','Droite')}</option></select></label>
              <label className="text-[8px] text-white/40">{T('LETTER SPACING','تباعد الحروف','ESPACEMENT')}<input type="number" step="0.5" value={selected.letterSpacing || 0} onChange={e=>updateLayer(selected.id,{letterSpacing:Number(e.target.value)},'Change letter spacing')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label>
              <label className="text-[8px] text-white/40">{T('LINE HEIGHT','ارتفاع السطر','HAUTEUR DE LIGNE')}<input type="number" step="0.05" value={selected.lineHeight || 1.2} onChange={e=>updateLayer(selected.id,{lineHeight:Number(e.target.value)},'Change line height')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[8px] text-white/40">{T('COLOR','اللون','COULEUR')}<input type="color" value={selected.color || '#ffffff'} onChange={e => updateLayer(selected.id, { color: e.target.value }, 'Change text color')} className="mt-1 w-full h-8 rounded bg-black/30 border border-white/10"/></label>
              <label className="text-[8px] text-white/40">{T('DIRECTION','الاتجاه','DIRECTION')}<select value={selected.direction || 'auto'} onChange={e => updateLayer(selected.id, { direction: e.target.value as any }, 'Change direction')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"><option value="auto">{T('AUTO','تلقائي','AUTO')}</option><option value="ltr">LTR</option><option value="rtl">RTL</option></select></label>
            </div>
            <button onClick={() => fontRef.current?.click()} className="w-full rounded-lg border border-white/10 px-2 py-2 text-[10px] font-black mb-2">{T('IMPORT FONT','استيراد خط','IMPORTER UNE POLICE')}</button>
            <select value={selected.binding || 'static'} onChange={e => updateLayer(selected.id, { binding: e.target.value as any }, 'Change data binding')} className="w-full rounded bg-black/30 border border-white/10 px-2 py-2 text-[10px]"><option value="static">{T('Static text','نص ثابت','Texte statique')}</option><option value="playerName">{T('Player Name','اسم اللاعب','Nom du joueur')}</option><option value="teamName">{T('Team Name','اسم الفريق','Nom équipe')}</option><option value="clubName">{T('Club Name','اسم النادي','Nom du club')}</option><option value="matchNumber">{T('Match Number','رقم المباراة','N° match')}</option><option value="score">{T('Score','النتيجة','Score')}</option><option value="round">{T('Round','الجولة','Round')}</option><option value="weight">{T('Weight','الوزن','Poids')}</option><option value="tournament">{T('Tournament','البطولة','Tournoi')}</option><option value="winner">{T('Winner','الفائز','Vainqueur')}</option><option value="winnerName">Winner Name / اسم الفائز</option><option value="winnerTeam">Winner Team / فريق الفائز</option><option value="winnerClub">Winner Club / نادي الفائز</option><option value="bestPlayer">Best Player / أفضل لاعب</option><option value="bestPlayerTeam">Best Player Team / فريق أفضل لاعب</option><option value="bestPlayerClub">Best Player Club / نادي أفضل لاعب</option><option value="roundScoreRed">Red Round Score / نتيجة الجولة أحمر</option><option value="roundScoreBlue">Blue Round Score / نتيجة الجولة أزرق</option><option value="roundWinsRed">Red Round Wins / جولات أحمر</option><option value="roundWinsBlue">Blue Round Wins / جولات أزرق</option><option value="totalScoreRed">Red Total / مجموع أحمر</option><option value="totalScoreBlue">Blue Total / مجموع أزرق</option><option value="date">Date / التاريخ</option><option value="place">Place / المكان</option><option value="age">Age / العمر</option><option value="gender">Gender / الجنس</option><option value="mat">Mat / البساط</option><option value="matchType">Match Type / نوع المباراة</option><option value="timer">Timer / الوقت</option><option value="matchStatus">Status / الحالة</option><option value="refereeName">Referee / الحكم</option><option value="medalImage">Medal Image / صورة الميدالية</option><option value="trophyImage">Trophy Image / صورة الكأس</option></select>
          </>}
          {selected.type === 'image' && <>
            <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg border border-white/10 px-2 py-2 text-[10px] font-black"><Upload size={12} className="inline mr-1"/>{T('IMPORT / REPLACE IMAGE','استيراد / استبدال الصورة','IMPORTER / REMPLACER IMAGE')}</button>
            <select value={selected.binding || 'static'} onChange={e => updateLayer(selected.id, { binding: e.target.value as any }, 'Change image binding')} className="w-full rounded bg-black/30 border border-white/10 px-2 py-2 text-[10px]"><option value="static">{T('Custom Image','صورة مخصصة','Image personnalisée')}</option><option value="playerPhoto">{T('Player Photo','صورة اللاعب','Photo joueur')}</option><option value="teamLogo">{T('Team Logo','شعار الفريق','Logo équipe')}</option><option value="clubLogo">{T('Club Logo','شعار النادي','Logo club')}</option><option value="flag">{T('Country Flag','علم الدولة','Drapeau')}</option><option value="winnerPhoto">Winner Photo / صورة الفائز</option><option value="winnerFlag">Winner Flag / علم الفائز</option><option value="bestPlayerPhoto">Best Player Photo / صورة أفضل لاعب</option><option value="bestPlayerFlag">Best Player Flag / علم أفضل لاعب</option></select>
          </>}
          {(selected.type === 'frame' || selected.type === 'shape' || selected.type === 'group' || selected.type === 'effect') && <div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-white/40">{T('BORDER','الحد','BORDURE')}<input type="color" value={selected.borderColor || '#ffd866'} onChange={e => updateLayer(selected.id, { borderColor: e.target.value }, 'Change border color')} className="mt-1 w-full h-8 rounded bg-black/30 border border-white/10"/></label><label className="text-[8px] text-white/40">{T('FILL','التعبئة','REMPLISSAGE')}<input type="text" value={selected.background || ''} onChange={e => updateLayer(selected.id, { background: e.target.value }, 'Change background')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]" placeholder="rgba(...)"/></label></div>}
          {(selected.type === 'frame' || selected.type === 'shape' || selected.type === 'group') && <>
            <div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-white/40">{T('FRAME STYLE','نمط الإطار','STYLE DU CADRE')}<select value={selected.frameStyle || 'rounded'} onChange={e => updateLayer(selected.id, { frameStyle: e.target.value as any }, 'Change frame style')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"><option value="square">{T('SQUARE','مربع')}</option><option value="rounded">{T('ROUNDED','مستدير')}</option><option value="double">{T('DOUBLE','مزدوج')}</option><option value="neon">{T('NEON','نيون')}</option><option value="cut-corner">{T('CUT CORNER','زوايا مقصوصة')}</option><option value="hex">{T('HEX','سداسي')}</option><option value="circle">{T('CIRCLE','دائري')}</option><option value="diamond">{T('DIAMOND','معين')}</option><option value="bracket">{T('BRACKET','قوس')}</option><option value="tech">{T('TECH','تقني')}</option><option value="gold">{T('GOLD','ذهبي')}</option></select></label><label className="text-[8px] text-white/40">{T('BORDER STYLE','نمط الحد','STYLE DE BORDURE')}<select value={selected.borderStyle || 'solid'} onChange={e => updateLayer(selected.id, { borderStyle: e.target.value as any }, 'Change border style')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"><option value="solid">{T('SOLID','متصل','CONTINU')}</option><option value="double">{T('DOUBLE','مزدوج')}</option><option value="dashed">{T('DASHED','متقطع','TIRETS')}</option><option value="dotted">{T('DOTTED','منقط','POINTILLÉ')}</option></select></label></div>
            <label className="text-[8px] text-white/40">{T('CLIP PATH','مسار القص','MASQUE / CLIP')}<input value={selected.clipPath || ''} onChange={e => updateLayer(selected.id, { clipPath: e.target.value }, 'Change clip path')} placeholder="polygon(...)" className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label><label className="text-[8px] text-white/40">{T('GRADIENT / FILL','التدرج / التعبئة','DÉGRADÉ / REMPLISSAGE')}<input value={selected.gradient || ''} onChange={e => updateLayer(selected.id, { gradient: e.target.value }, 'Change gradient')} placeholder="linear-gradient(135deg,#ffd866,#8a5b00)" className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label>
          </>}
          <div className="rounded-xl border border-white/10 p-2 space-y-2"><div className="text-[8px] font-black tracking-widest text-yellow-200">{T('LIGHT / EFFECTS','الإضاءة / المؤثرات','LUMIÈRE / EFFETS')}</div><select value={selected.effect || 'none'} onChange={e => updateLayer(selected.id, { effect: e.target.value as any }, 'Change effect')} className="w-full rounded bg-black/30 border border-white/10 px-2 py-2 text-[10px]"><option value="none">{T('NONE','بدون')}</option><option value="glow">{T('GLOW','توهج')}</option><option value="light">{T('LIGHT BURST','انفجار ضوئي','ÉCLAT LUMINEUX')}</option><option value="bloom">{T('BLOOM','انتشار ضوئي')}</option><option value="shine">{T('SHINE','لمعان')}</option><option value="energy">{T('ENERGY','طاقة')}</option><option value="particles">{T('PARTICLES','جزيئات')}</option><option value="spark">{T('SPARKS','شرارات','ÉTINCELLES')}</option><option value="smoke">{T('SMOKE','دخان')}</option><option value="scanline">{T('SCANLINES','خطوط المسح','LIGNES DE BALAYAGE')}</option><option value="shadow">{T('SHADOW','ظل')}</option><option value="blur">{T('BLUR','ضبابية')}</option><option value="gradient">{T('GRADIENT','تدرج')}</option><option value="reflection">{T('REFLECTION','انعكاس')}</option><option value="motion-blur">{T('MOTION BLUR','ضبابية الحركة')}</option><option value="bevel">{T('BEVEL','حافة ثلاثية الأبعاد')}</option><option value="inner-glow">{T('INNER GLOW','توهج داخلي')}</option><option value="outer-glow">{T('OUTER GLOW','توهج خارجي')}</option></select><div className="grid grid-cols-3 gap-1"><label className="text-[7px] text-white/40">{T('COLOR','اللون','COULEUR')}<input type="color" value={selected.effectColor || '#ffd866'} onChange={e => updateLayer(selected.id,{effectColor:e.target.value},'Change effect color')} className="mt-1 w-full h-7 rounded"/></label><label className="text-[7px] text-white/40">{T('POWER','القوة','PUISSANCE')}<input type="number" min="0" max="2" step="0.05" value={selected.effectIntensity ?? .75} onChange={e=>updateLayer(selected.id,{effectIntensity:Number(e.target.value)},'Change effect intensity')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1"/></label><label className="text-[7px] text-white/40">{T('RADIUS','نصف القطر','RAYON')}<input type="number" min="0" max="200" value={selected.effectRadius ?? 28} onChange={e=>updateLayer(selected.id,{effectRadius:Number(e.target.value)},'Change effect radius')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1"/></label></div></div>
          <div className="rounded-lg border border-purple-400/20 bg-purple-400/[.03] p-2 space-y-2"><div className="text-[8px] font-black tracking-widest text-purple-200">{T('ANIMATION','الأنيميشن','ANIMATION')}</div><div className="grid grid-cols-3 gap-1"><label className="text-[7px] text-white/40">{T('DURATION','المدة','DURÉE')}<input type="number" min="0.1" max="120" step="0.01" value={design.playback?.duration ?? design.duration} onChange={e=>setPlayback({duration:Math.max(.1,Number(e.target.value)||.1),outPoint:Math.max(.1,Number(e.target.value)||.1)},'Set duration / ضبط المدة')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"/></label><label className="text-[7px] text-white/40">{T('SPEED','السرعة','VITESSE')}<select value={design.playback?.speed ?? playbackSpeed} onChange={e=>{ const v=Number(e.target.value); setPlaybackSpeed(v); setPlayback({speed:v},'Set playback speed / ضبط سرعة التشغيل'); }} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"><option value="0.25">25%</option><option value="0.5">50%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label><label className="text-[7px] text-white/40">{T('FPS','الإطارات في الثانية','FPS')}<select value={design.playback?.fps ?? 60} onChange={e=>setPlayback({fps:Number(e.target.value)},'Set FPS / ضبط الإطارات')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"><option>24</option><option>25</option><option>30</option><option>50</option><option>60</option></select></label></div><div className="grid grid-cols-2 gap-1"><label className="text-[7px] text-white/40">{T('IN','البداية','DÉBUT')}<input type="number" min="0" max={design.duration} step=".01" value={design.playback?.inPoint ?? 0} onChange={e=>setPlayback({inPoint:clamp(Number(e.target.value)||0,0,design.duration)},'Set in point / ضبط البداية')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"/></label><label className="text-[7px] text-white/40">{T('OUT','النهاية','FIN')}<input type="number" min="0" max={design.duration} step=".01" value={design.playback?.outPoint ?? design.duration} onChange={e=>setPlayback({outPoint:clamp(Number(e.target.value)||design.duration,0,design.duration)},'Set out point / ضبط النهاية')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"/></label></div><div className="grid grid-cols-2 gap-1"><label className="text-[7px] text-white/40">{T('IN TRANSITION','انتقال الدخول','TRANSITION D’ENTRÉE')}<select value={design.playback?.transitionIn?.kind || 'fade'} onChange={e=>setPlayback({transitionIn:{...(design.playback?.transitionIn||{}),kind:e.target.value}},'Set entry transition / انتقال الدخول')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[8px]">{transitionKinds.map(item=><option key={item[0]} value={item[0]}>{transitionLabel(item)}</option>)}</select></label><label className="text-[7px] text-white/40">{T('OUT TRANSITION','انتقال الخروج','TRANSITION DE SORTIE')}<select value={design.playback?.transitionOut?.kind || 'fade'} onChange={e=>setPlayback({transitionOut:{...(design.playback?.transitionOut||{}),kind:e.target.value}},'Set exit transition / انتقال الخروج')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[8px]">{transitionKinds.map(item=><option key={item[0]} value={item[0]}>{transitionLabel(item)}</option>)}</select></label></div><div className="grid grid-cols-3 gap-1"><label className="text-[7px] text-white/40">{T('IN SEC','مدة الدخول','SEC ENTRÉE')}<input type="number" min="0" max="5" step=".05" value={design.playback?.transitionIn?.duration ?? .35} onChange={e=>setPlayback({transitionIn:{...(design.playback?.transitionIn||{}),duration:Number(e.target.value)||0}},'Set entry duration')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"/></label><label className="text-[7px] text-white/40">{T('OUT SEC','مدة الخروج','SEC SORTIE')}<input type="number" min="0" max="5" step=".05" value={design.playback?.transitionOut?.duration ?? .35} onChange={e=>setPlayback({transitionOut:{...(design.playback?.transitionOut||{}),duration:Number(e.target.value)||0}},'Set exit duration')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"/></label><button onClick={()=>setPlayback({loop:!design.playback?.loop},'Toggle loop / تكرار')} className={`mt-4 rounded border py-1 text-[8px] ${design.playback?.loop?'border-yellow-400/40 text-yellow-200':'border-white/10 text-white/50'}`}>{T('LOOP','تكرار','BOUCLE')}</button></div><button onClick={()=>setPlayback({reverse:!design.playback?.reverse},'Toggle reverse / عكس الحركة')} className={`w-full mt-1 rounded border py-1.5 text-[8px] ${design.playback?.reverse?'border-violet-400/40 text-violet-200':'border-white/10 text-white/50'}`}>{T('REVERSE ANIMATION','عكس الأنيميشن','ANIMATION INVERSÉE')}</button><div className="grid grid-cols-2 gap-1"><label className="text-[7px] text-white/40">{T('IN INTENSITY','شدة الدخول','INTENSITÉ ENTRÉE')}<input type="range" min="0" max="1" step=".01" value={design.playback?.transitionIn?.intensity ?? 1} onChange={e=>setPlayback({transitionIn:{...(design.playback?.transitionIn||{}),intensity:Number(e.target.value)}},'Set entry intensity')} className="mt-1 w-full"/></label><label className="text-[7px] text-white/40">{T('OUT INTENSITY','شدة الخروج','INTENSITÉ SORTIE')}<input type="range" min="0" max="1" step=".01" value={design.playback?.transitionOut?.intensity ?? 1} onChange={e=>setPlayback({transitionOut:{...(design.playback?.transitionOut||{}),intensity:Number(e.target.value)}},'Set exit intensity')} className="mt-1 w-full"/></label><label className="text-[7px] text-white/40">{T('IN EASING','تدرج الدخول','ACCÉLÉRATION ENTRÉE')}<select value={design.playback?.transitionIn?.easing || 'ease-in-out'} onChange={e=>setPlayback({transitionIn:{...(design.playback?.transitionIn||{}),easing:e.target.value}},'Set entry easing')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[8px]"><option value="linear">Linear</option><option value="ease-in">Ease In</option><option value="ease-out">Ease Out</option><option value="ease-in-out">Ease In Out</option><option value="smooth">Smooth</option><option value="back-out">Back Out</option><option value="bounce">Bounce</option></select></label><label className="text-[7px] text-white/40">{T('OUT EASING','تدرج الخروج','ACCÉLÉRATION SORTIE')}<select value={design.playback?.transitionOut?.easing || 'ease-in-out'} onChange={e=>setPlayback({transitionOut:{...(design.playback?.transitionOut||{}),easing:e.target.value}},'Set exit easing')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[8px]"><option value="linear">Linear</option><option value="ease-in">Ease In</option><option value="ease-out">Ease Out</option><option value="ease-in-out">Ease In Out</option><option value="smooth">Smooth</option><option value="back-out">Back Out</option><option value="bounce">Bounce</option></select></label><label className="text-[7px] text-white/40">{T('IN COLOR','لون الدخول','COULEUR ENTRÉE')}<input type="color" value={design.playback?.transitionIn?.color || '#ffd866'} onChange={e=>setPlayback({transitionIn:{...(design.playback?.transitionIn||{}),color:e.target.value}},'Set entry color')} className="mt-1 h-7 w-full rounded bg-black/30 border border-white/10"/></label><label className="text-[7px] text-white/40">{T('OUT COLOR','لون الخروج','COULEUR SORTIE')}<input type="color" value={design.playback?.transitionOut?.color || '#ffd866'} onChange={e=>setPlayback({transitionOut:{...(design.playback?.transitionOut||{}),color:e.target.value}},'Set exit color')} className="mt-1 h-7 w-full rounded bg-black/30 border border-white/10"/></label></div><label className="text-[7px] text-white/40">{T('AUTO NEXT','الانتقال التلقائي','SUIVANT AUTO')}<select value={design.playback?.autoNextAnimationId || ''} onChange={e=>setPlayback({autoNextAnimationId:e.target.value||null},'Set next animation / ضبط الأنيميشن التالي')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[9px]"><option value="">{T('NONE','لا يوجد','AUCUN')}</option>{DESIGN_ANIMATIONS.filter(a=>a.id!==animationId && a.id!=='custom').map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label><div className="text-[7px] text-white/35">{T('Transitions are stored per animation and do not modify other animations.','الانتقالات محفوظة لكل أنيميشن بشكل مستقل ولا تغيّر الأنيميشنات الأخرى.','Les transitions sont enregistrées par animation et ne modifient pas les autres animations.')}</div></div><div className="rounded-lg border border-white/10 p-2 space-y-2"><div className="text-[8px] font-black tracking-widest text-yellow-200">{T('MOTION / KEYFRAME','الحركة / الإطار المفتاحي','MOUVEMENT / IMAGE CLÉ')}</div><div className="grid grid-cols-2 gap-1"><label className="text-[7px] text-white/40">{T('EASING','تدرج الحركة','ACCÉLÉRATION')}<select value={easing} onChange={e=>setEasing(e.target.value as EasingKind)} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"><option value="linear">{T('LINEAR','خطي')}</option><option value="ease-in">{T('EASE IN','تسارع دخول')}</option><option value="ease-out">{T('EASE OUT','تسارع خروج')}</option><option value="ease-in-out">{T('EASE IN OUT','تسارع دخول وخروج')}</option><option value="smooth">{T('SMOOTH','سلس')}</option><option value="back-in">{T('BACK IN','رجوع دخول')}</option><option value="back-out">{T('BACK OUT','رجوع خروج')}</option><option value="bounce">{T('BOUNCE','ارتداد')}</option><option value="step">{T('STEP','خطوة')}</option></select></label><label className="text-[7px] text-white/40">{T('BLEND','المزج','FUSION')}<select value={(selected.blendMode||'normal') as string} onChange={e=>updateLayer(selected.id,{blendMode:e.target.value as BlendMode},'Change blend mode')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[9px]"><option>normal</option><option>screen</option><option>overlay</option><option>multiply</option><option>soft-light</option><option>hard-light</option><option>difference</option><option>plus-lighter</option></select></label></div><div><div className="grid grid-cols-3 gap-1"><button onClick={()=>alignSelected('left')} className="rounded border border-white/10 py-1 text-[8px]" title={T('Align left','محاذاة لليسار')}>L</button><button onClick={()=>alignSelected('center')} className="rounded border border-white/10 py-1 text-[8px]" title={T('Align center','محاذاة للوسط')}>C</button><button onClick={()=>alignSelected('right')} className="rounded border border-white/10 py-1 text-[8px]" title={T('Align right','محاذاة لليمين')}>R</button><button onClick={()=>alignSelected('top')} className="rounded border border-white/10 py-1 text-[8px]" title={T('Align top','محاذاة للأعلى')}>T</button><button onClick={()=>alignSelected('middle')} className="rounded border border-white/10 py-1 text-[8px]" title={T('Align middle','محاذاة للوسط العمودي')}>M</button><button onClick={()=>alignSelected('bottom')} className="rounded border border-white/10 py-1 text-[8px]" title={T('Align bottom','محاذاة للأسفل')}>B</button></div><div className="grid grid-cols-2 gap-1 mt-1"><button onClick={()=>distributeSelected('x')} className="rounded border border-white/10 py-1 text-[8px]">↔ {T('DISTRIBUTE X','توزيع أفقي','DISTRIBUER X')}</button><button onClick={()=>distributeSelected('y')} className="rounded border border-white/10 py-1 text-[8px]">↕ {T('DISTRIBUTE Y','توزيع عمودي','DISTRIBUER Y')}</button></div></div></div>
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[.03] p-2 space-y-2">
            <div className="text-[8px] font-black tracking-widest text-cyan-200">{T('MOTION PATH / GRAPH','مسار الحركة / محرر المنحنى','TRAJECTOIRE / COURBE')}</div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={()=>setPathDrawMode(v=>!v)} className={`rounded border py-1.5 text-[8px] ${pathDrawMode?'border-emerald-400/40 text-emerald-200 bg-emerald-400/10':'border-cyan-400/20 text-cyan-200'}`}>✎ {T('DRAW PATH','رسم المسار','DESSINER')}</button>
              <button onClick={()=>addMotionPoint()} className="rounded border border-cyan-400/20 text-cyan-200 py-1.5 text-[8px]">＋ {T('ADD POINT','إضافة نقطة','AJOUTER')}</button>
              <button onClick={clearMotionPath} disabled={!selected.motionPath?.length} className="rounded border border-red-400/15 text-red-300 py-1.5 text-[8px] disabled:opacity-30">{T('CLEAR','مسح','EFFACER')}</button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={()=>updateLayer(selected.id,{motionPathReverse:!selected.motionPathReverse},T('Reverse path','عكس المسار','Inverser'))} className="rounded border border-white/10 py-1.5 text-[8px]">↔ {T('REVERSE','عكس','INVERSER')}</button>
              <button onClick={()=>updateLayer(selected.id,{motionPathLoop:!selected.motionPathLoop},T('Loop path','تكرار المسار','Boucle'))} className="rounded border border-white/10 py-1.5 text-[8px]">⟳ {T('LOOP','تكرار','BOUCLE')}</button>
              <button onClick={()=>updateLayer(selected.id,{motionPathRotate:!selected.motionPathRotate},T('Rotate with path','دوران مع المسار','Rotation'))} className="rounded border border-white/10 py-1.5 text-[8px]">⤴ {T('ROTATE','دوران','ROTATION')}</button>
            </div>
            {(selected.motionPath||[]).length > 0 && <div className="rounded border border-white/10 bg-black/20 p-1.5 space-y-1 max-h-24 overflow-y-auto">
              <div className="text-[7px] text-white/35">{T('PATH POINTS — double-click a point to delete','نقاط المسار — انقر مرتين على النقطة لحذفها','POINTS DE TRAJECTOIRE — double-cliquez pour supprimer')}</div>
              {(selected.motionPath||[]).map((pt:any,i:number)=><div key={`${selected.id}-pt-${i}`} className="flex items-center gap-1">
                <span className="w-6 text-[7px] text-cyan-200">P{i+1}</span>
                <input aria-label={`Path point ${i+1} time`} type="number" min="0" max={design.duration} step="0.01" value={Number(pt.time||0).toFixed(2)} onChange={e=>updateMotionPointTime(i,Number(e.target.value))} className="w-16 rounded bg-black/30 border border-white/10 px-1 py-1 text-[8px]"/>
                <span className="text-[7px] text-white/30">s</span>
                <button onClick={()=>removeMotionPoint(i)} className="ml-auto rounded border border-red-400/15 px-1.5 py-1 text-[7px] text-red-300">×</button>
              </div>)}
            </div>}
            <div className="grid grid-cols-2 gap-1">
              <select value={graphProperty} onChange={e=>setGraphProperty(e.target.value as any)} className="rounded bg-black/30 border border-white/10 px-1 py-1 text-[8px]">
                {['x','y','scale','rotation','opacity','effectIntensity','effectRadius'].map(k=><option key={k} value={k}>{k}</option>)}
              </select>
              <span className="text-[7px] text-white/35 flex items-center">{T('Drag graph points vertically to edit the selected property.','اسحب نقاط المنحنى عموديًا لتعديل الخاصية المحددة.','Glissez verticalement les points pour modifier la propriété.')}</span>
            </div>
            <div className="relative h-28 rounded border border-white/10 bg-black/30 overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,transparent_24%,white_25%,transparent_26%,transparent_49%,white_50%,transparent_51%,transparent_74%,white_75%,transparent_76%)]"/>
              {graphFrames.points.map(point => <button key={point.id} type="button" title={`${point.value} @ ${point.time.toFixed(2)}s`} onPointerDown={e=>{
                e.preventDefault();
                const rect=e.currentTarget.parentElement?.getBoundingClientRect();
                if(!rect) return;
                const move=(ev:PointerEvent)=>{
                  const ratio=1-Math.max(0,Math.min(1,(ev.clientY-rect.top)/rect.height));
                  updateKeyframeProperty(point.time,graphProperty,graphFrames.min+ratio*(graphFrames.max-graphFrames.min));
                };
                const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
                window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
              }} className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-cyan-300 border border-black shadow-[0_0_8px_rgba(34,211,238,.8)] cursor-ns-resize" style={{left:`${point.x}%`,top:`${100-point.y}%`}} />)}
              {graphFrames.points.length>1 && <div className="absolute inset-x-0 bottom-1 text-center text-[7px] text-white/25 pointer-events-none">{graphFrames.min.toFixed(2)} → {graphFrames.max.toFixed(2)}</div>}
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {selected.keyframes.map(k=><div key={k.id} className="flex items-center gap-1 text-[7px]">
                <span className="text-yellow-200 w-10">{k.time.toFixed(2)}s</span>
                <select value={k.easing||'linear'} onChange={e=>updatePathEasing(k.time,e.target.value as EasingKind)} className="flex-1 rounded bg-black/30 border border-white/10 px-1 py-1 text-[8px]">
                  <option value="linear">{T('Linear','خطي','Linéaire')}</option><option value="ease-in">{T('Ease In','تسارع دخول','Accélération')}</option><option value="ease-out">{T('Ease Out','تسارع خروج','Décélération')}</option><option value="ease-in-out">{T('Ease In/Out','دخول وخروج','Entrée/Sortie')}</option><option value="smooth">{T('Smooth','سلس','Fluide')}</option><option value="back-out">{T('Back Out','رجوع','Retour')}</option><option value="bounce">{T('Bounce','ارتداد','Rebond')}</option><option value="step">{T('Step','خطوة','Pas')}</option>
                </select>
              </div>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1"><button onClick={addKeyframe} className="rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-200 py-2 text-[9px] font-black">◆ KEYFRAME {design.currentTime.toFixed(2)}s</button><button onClick={removeCurrentKeyframe} className="rounded-lg border border-red-400/20 text-red-300 py-2 text-[9px] font-black">{T('REMOVE KF','حذف الإطار المفتاحي','SUPPRIMER IK')}</button></div><button onClick={duplicateCurrentKeyframe} className="w-full mt-1 rounded border border-white/10 py-1.5 text-[8px]">＋ {T('DUPLICATE CURRENT KEYFRAME','تكرار الإطار الحالي','DUPLIQUER')}</button><div className="grid grid-cols-2 gap-1 mt-1"><button onClick={copySelectedKeyframes} disabled={!selected.keyframes.length} className="rounded border border-white/10 py-1.5 text-[8px]">⧉ {T('COPY KEYFRAMES','نسخ الإطارات','COPIER')}</button><button onClick={pasteSelectedKeyframes} disabled={!copiedKeyframes.length} className="rounded border border-white/10 py-1.5 text-[8px]">📋 {T('PASTE KEYFRAMES','لصق الإطارات','COLLER')}</button></div>
          <div className="rounded-lg border border-blue-400/15 bg-blue-400/[.03] p-2 space-y-1">
            <div className="text-[7px] font-black tracking-widest text-blue-200/70">{T('SWAP / MOVE GROUP','تبديل / نقل المجموعة','ÉCHANGER / DÉPLACER LE GROUPE')}</div>
            <select value={swapTargetId} onChange={e=>setSwapTargetId(e.target.value)} className="w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[9px]">
              <option value="">{T('SELECT TARGET FRAME / GROUP','اختر الإطار / المجموعة الهدف','SÉLECTIONNER LE CADRE / GROUPE CIBLE')}</option>
              {design.layers.filter(l=>l.id!==selected?.id && ['frame','group','shape'].includes(l.type)).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={()=>swapWithTarget()} disabled={!swapTargetId || !selected || !['frame','group','shape'].includes(selected.type)} className="rounded-lg border border-blue-400/20 text-blue-200 py-2 text-[9px] font-black disabled:opacity-30">↔ {T('SWAP TARGET','تبديل الهدف','ÉCHANGER LA CIBLE')}</button>
              <button onClick={()=>swapWithNextFrame()} disabled={!selected || !['frame','group','shape'].includes(selected.type)} className="rounded-lg border border-white/10 text-white/70 py-2 text-[9px] font-black disabled:opacity-30">{T('NEXT FRAME','الإطار التالي','CADRE SUIVANT')}</button>
            </div>
          </div>
          <div className="rounded-lg border border-purple-400/20 bg-purple-400/[.03] p-2 space-y-2">
            <div className="text-[8px] font-black tracking-widest text-purple-200">{T('EFFECTS','المؤثرات','EFFETS')}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[8px] text-white/40">{T('EFFECT','التأثير','EFFET')}<select value={selected.effect || 'none'} onChange={e=>updateLayer(selected.id,{effect:e.target.value as any},'Change effect')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[9px]">{[['none','بدون'],['glow','توهج'],['light','ضوء'],['bloom','انتشار'],['shine','لمعان'],['particles','جزيئات'],['spark','شرارات'],['energy','طاقة'],['smoke','دخان'],['shadow','ظل'],['blur','ضبابية'],['motion-blur','ضبابية الحركة'],['bevel','حافة ثلاثية'],['inner-glow','توهج داخلي'],['outer-glow','توهج خارجي'],['reflection','انعكاس'],['scanline','خطوط المسح'],['gradient','تدرج']].map(([v,a])=><option key={v} value={v}>{uiLang==='ar'?a:v}</option>)}</select></label>
              <label className="text-[8px] text-white/40">{T('EFFECT COLOR','لون التأثير','COULEUR DE L’EFFET')}<input type="color" value={selected.effectColor || '#ffd866'} onChange={e=>updateLayer(selected.id,{effectColor:e.target.value},'Change effect color')} className="mt-1 w-full h-8 rounded bg-black/30 border border-white/10"/></label>
            </div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[8px] text-white/40">{T('INTENSITY','القوة','INTENSITÉ')}<input type="range" min="0" max="2" step="0.05" value={selected.effectIntensity ?? .75} onChange={e=>updateLayer(selected.id,{effectIntensity:Number(e.target.value)},'Change effect intensity')} className="w-full"/></label><label className="text-[8px] text-white/40">{T('RADIUS','نطاق التأثير','RAYON')}<input type="range" min="0" max="160" step="1" value={selected.effectRadius ?? 28} onChange={e=>updateLayer(selected.id,{effectRadius:Number(e.target.value)},'Change effect radius')} className="w-full"/></label></div>
            <div className="grid grid-cols-2 gap-2 mb-2"><button onClick={()=>setIsolatedLayerId(isolatedLayerId===selected.id?null:selected.id)} className="rounded border border-cyan-400/20 text-cyan-200 py-1.5 text-[8px]">{isolatedLayerId===selected.id?T('EXIT ISOLATION','الخروج من العزل','QUITTER ISOLATION'):T('ISOLATE','عزل الطبقة','ISOLER')}</button><button onClick={()=>setBeforeAfter(v=>v==='modified'?'original':'modified')} className="rounded border border-purple-400/20 text-purple-200 py-1.5 text-[8px]">{beforeAfter==='modified'?T('BEFORE / ORIGINAL','قبل / الأصل','AVANT / ORIGINAL'):T('AFTER / MODIFIED','بعد / المعدل','APRÈS / MODIFIÉ')}</button></div>
          <div className="grid grid-cols-3 gap-2"><button onClick={enhanceSelected} className="rounded border border-yellow-400/20 text-yellow-200 py-1.5 text-[8px]">{T('ENHANCE','تقوية','RENFORCER')}</button><button onClick={polishExisting} className="rounded border border-emerald-400/20 text-emerald-200 py-1.5 text-[8px]">{T('POLISH','تحسين','POLIR')}</button><button onClick={()=>updateLayer(selected.id,{effect:'none',effectIntensity:0},'Disable effect')} className="rounded border border-red-400/15 text-red-300 py-1.5 text-[8px]">{T('CLEAR','مسح','EFFACER')}</button></div>
          </div>
          <div className="rounded-lg border border-violet-400/20 bg-violet-400/[.03] p-2 space-y-2">
            <div className="text-[8px] font-black tracking-widest text-violet-200">{T('MASK / CLIPPING','القناع / القص','MASQUE / DÉCOUPAGE')}</div>
            <div className="grid grid-cols-2 gap-1">
              <label className="text-[7px] text-white/40">{T('MASK MODE','وضع القناع')}<select value={selected.maskMode||'none'} onChange={e=>updateLayer(selected.id,{maskMode:e.target.value as any},T('Change mask mode','تغيير وضع القناع'))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[8px]"><option value="none">{T('None','بدون')}</option><option value="clip">{T('Clip','قص')}</option><option value="alpha">{T('Alpha','ألفا')}</option></select></label>
              <label className="text-[7px] text-white/40">{T('MASK LAYER','طبقة القناع')}<select value={selected.maskId||''} onChange={e=>updateLayer(selected.id,{maskId:e.target.value||null},T('Change mask layer','تغيير طبقة القناع'))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-1 py-1.5 text-[8px]"><option value="">{T('None','بدون')}</option>{design.layers.filter(l=>l.id!==selected.id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            </div>
            <label className="text-[7px] text-white/40">{T('FEATHER','تنعيم الحافة','ADOUCIR')}<input type="number" min="0" max="80" step="1" value={selected.maskFeather||0} onChange={e=>updateLayer(selected.id,{maskFeather:Number(e.target.value)||0},T('Change mask feather','تغيير تنعيم القناع','Modifier adoucissement'))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"/></label>
            <label className="text-[7px] text-white/40">{T('CLIP PATH (CSS)','مسار القص (CSS)')}<input value={selected.clipPath||''} onChange={e=>updateLayer(selected.id,{clipPath:e.target.value},T('Change clip path','تغيير مسار القص'))} placeholder="inset(0 0 0 0)" className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"/></label>
          </div>
          <div className="rounded-lg border border-sky-400/20 bg-sky-400/[.03] p-2 space-y-2">
            <div className="text-[8px] font-black tracking-widest text-sky-200">{T('PARENT / CHILD / ATTACH','الأب / الابن / الربط','PARENT / ENFANT / ATTACHER')}</div>
            <select value={selected.attachToId || ''} onChange={e=>e.target.value ? attachSelectedTo(e.target.value) : detachSelected()} className="w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]">
              <option value="">{T('No attachment','بدون ربط','Sans liaison')}</option>
              {design.layers.filter(l=>l.id!==selected.id && !descendantIds(selected.id,design.layers).has(l.id)).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={()=>selected.attachToId ? detachSelected() : undefined} disabled={!selected.attachToId} className="rounded border border-white/10 py-1.5 text-[8px] disabled:opacity-30"><Unlink2 size={10} className="inline mr-1"/>{T('DETACH','فصل','DÉTACHER')}</button>
              {selected.type==='text' && <button onClick={autoFitSelectedText} className="rounded border border-sky-400/20 text-sky-200 py-1.5 text-[8px]"><Wand2 size={10} className="inline mr-1"/>{T('AUTO-FIT','ملاءمة تلقائية','AJUSTEMENT AUTO')}</button>}
            </div>
          </div>
          <div className="rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/[.03] p-2 space-y-2">
            <div className="text-[8px] font-black tracking-widest text-fuchsia-200">{T('CONDITIONAL STATES','الحالات الشرطية','ÉTATS CONDITIONNELS')}</div>
            <div className="text-[7px] text-white/35">READY / PLAYING / WINNER / TEAM / INDIVIDUAL can control visibility without changing match state.</div>
            <div className="grid grid-cols-2 gap-1">
              <input placeholder="status = ready" className="rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]" onKeyDown={e=>{if(e.key==='Enter'){const value=(e.currentTarget as HTMLInputElement).value.trim();if(value){updateLayer(selected.id,{conditionalVisibility:[...(selected.conditionalVisibility||[]),{when:value,visible:true}]},'Add conditional state');e.currentTarget.value='';}}}}/>
              <button onClick={()=>updateLayer(selected.id,{conditionalVisibility:[]},'Clear conditional states')} className="rounded border border-white/10 py-1.5 text-[8px]">CLEAR STATES</button>
            </div>
            <div className="space-y-1">{(selected.conditionalVisibility||[]).map((r,i)=><div key={i} className="flex items-center gap-1"><span className="flex-1 text-[7px] text-white/55 truncate">{r.when}</span><button onClick={()=>updateLayer(selected.id,{conditionalVisibility:(selected.conditionalVisibility||[]).filter((_,x)=>x!==i)},'Remove conditional state')} className="text-red-300 text-[8px]">×</button></div>)}</div>
          </div>
          <div className="flex gap-1"><button onClick={duplicateSelected} className="flex-1 rounded-lg border border-white/10 py-2 text-[9px] font-black"><Copy size={11} className="inline mr-1"/>{T('DUPLICATE','تكرار','DUPLIQUER')}</button><button onClick={deleteSelected} className="flex-1 rounded-lg border border-red-400/20 text-red-300 py-2 text-[9px] font-black"><Trash2 size={11} className="inline mr-1"/>{T('DELETE','حذف','SUPPRIMER')}</button></div>
          <div className="rounded-lg border border-white/10 p-2 text-[8px] text-white/40">{T('Parent','الأب','Parent')}: {selected.parentId || 'ROOT'} · Z {selected.zIndex} · {T('Keyframes','الإطارات المفتاحية','Images clés')} {selected.keyframes.length}</div>
        </div>}
      </aside>

      <section className="col-span-2 border-t border-white/10 bg-[#070a10] p-2 overflow-hidden">
        <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-white/40"><Move size={12}/>{T('TIMELINE','الخط الزمني','CHRONOLOGIE')} · {design.currentTime.toFixed(2)}s / {design.duration.toFixed(2)}s</div><div className="flex items-center gap-1"><button onClick={() => setDesign(d => ({ ...d, currentTime: 0 }))} className="px-2 py-1 rounded border border-white/10 text-[8px]">0</button><button onClick={() => setDesign(d => ({ ...d, currentTime: d.duration }))} className="px-2 py-1 rounded border border-white/10 text-[8px]">{T('END','النهاية','FIN')}</button></div></div>
        <div className="relative h-24 rounded-lg border border-white/10 bg-black/30 overflow-hidden" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const t = clamp(((e.clientX-r.left)/r.width)*design.duration,0,design.duration); setDesign(d => ({ ...d, currentTime: t })); }}>
          <div className="absolute inset-x-0 top-0 h-5 border-b border-white/10 flex justify-between px-2 text-[7px] text-white/30">{Array.from({length:9},(_,i)=><span key={i}>{((design.duration/8)*i).toFixed(1)}s</span>)}</div>
          {design.layers.slice().sort((a,b)=>a.zIndex-b.zIndex).map((l,i) => <div key={l.id} className="absolute left-2 right-2 h-2 rounded bg-yellow-400/30" style={{ top: 27 + i*8 }}><div className="absolute inset-0"/>{l.keyframes.map(k => <span key={k.id} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-yellow-300 shadow-[0_0_8px_rgba(255,216,102,.8)] cursor-ew-resize" style={{ left: `${(k.time/design.duration)*100}%` }} title={`${l.name} ${k.time}s`} onPointerDown={e=>{e.stopPropagation();const rect=e.currentTarget.parentElement?.getBoundingClientRect();if(!rect)return;const move=(ev:PointerEvent)=>moveKeyframe(l.id,k.id,((ev.clientX-rect.left)/rect.width)*design.duration);const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);commitKeyframeMove(l.id,k.id);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);}} />)}</div>)}
          <div className="absolute top-0 bottom-0 w-px bg-yellow-300" style={{ left: `${(design.currentTime/design.duration)*100}%` }} />
        </div>
      </section>
    </div>
      {templateOpen && <div className="fixed inset-0 z-[74] bg-black/75 flex items-center justify-center p-6" onMouseDown={()=>setTemplateOpen(false)}>
        <div className="w-[980px] max-w-full max-h-[88vh] overflow-y-auto rounded-2xl border border-purple-400/25 bg-[#080b12] p-5 shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><div><div className="text-lg font-black text-purple-200">{T('TEMPLATES & VERSION HISTORY','القوالب وسجل الإصدارات','MODÈLES & HISTORIQUE')}</div><div className="text-[9px] text-white/40">{T('Reusable designs are isolated from match state and can be restored safely.','التصاميم قابلة لإعادة الاستخدام ومعزولة عن نتيجة المباراة والمؤقت.','Les designs sont réutilisables et isolés de l’état du match.')}</div></div><button onClick={()=>setTemplateOpen(false)} className="rounded border border-white/10 px-3 py-1 text-[9px]">ESC</button></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-[8px] font-black tracking-widest text-purple-200 mb-2">{T('SAVE CURRENT AS TEMPLATE','حفظ التصميم كقالب','ENREGISTRER COMME MODÈLE')}</div>
              <input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder={T('Template name','اسم القالب','Nom du modèle')} className="w-full rounded bg-black/30 border border-white/10 px-2 py-2 text-[9px]"/>
              <div className="grid grid-cols-2 gap-2 mt-2"><select value={templateScope} onChange={e=>setTemplateScope(e.target.value as any)} className="rounded bg-black/30 border border-white/10 px-2 py-2 text-[8px]">
                <option value="global">GLOBAL</option><option value="tournament">TOURNAMENT</option><option value="competition-mode">COMPETITION MODE</option><option value="gender">GENDER</option><option value="age">AGE</option><option value="weight">WEIGHT</option><option value="tournament-weight">TOURNAMENT + WEIGHT</option>
              </select><button onClick={createTemplate} className="rounded bg-purple-400/15 border border-purple-400/30 text-purple-200 text-[8px] font-black">{T('SAVE TEMPLATE','حفظ القالب','ENREGISTRER')}</button></div>
              <div className="mt-3 space-y-1">{designTemplates.filter(t=>t.animationId===animationId).map(t=><div key={t.id} className="flex items-center gap-1 rounded border border-white/10 p-1.5"><div className="min-w-0 flex-1"><div className="text-[8px] font-bold truncate">{t.name}</div><div className="text-[6px] text-white/35">{t.scope} · {new Date(t.updatedAt).toLocaleString()}</div></div><button onClick={()=>useTemplate(t)} className="rounded border border-emerald-400/20 px-2 py-1 text-[7px] text-emerald-200">APPLY</button><button onClick={()=>{deleteDesignTemplate(t.id);setDesignTemplates(getDesignTemplates())}} className="text-red-300 px-1">×</button></div>)}</div>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-[8px] font-black tracking-widest text-cyan-200 mb-2">{T('PROJECT SNAPSHOTS','نسخ المشروع المحفوظة','INSTANTANÉS DU PROJET')}</div>
              <div className="space-y-1 max-h-[330px] overflow-y-auto">{projectSnapshots.slice().reverse().map((snap,i)=><div key={`${snap.updatedAt}-${i}`} className="flex items-center gap-2 rounded border border-white/10 p-1.5"><div className="min-w-0 flex-1"><div className="text-[8px] font-bold">v{snap.version} · {snap.status.toUpperCase()}</div><div className="text-[6px] text-white/35">{new Date(snap.updatedAt).toLocaleString()} · {snap.layers.length} layers</div></div><button onClick={()=>restoreSnapshot(snap)} className="rounded border border-cyan-400/20 px-2 py-1 text-[7px] text-cyan-200">RESTORE</button></div>)}{projectSnapshots.length===0&&<div className="text-[8px] text-white/35">{T('Autosave snapshots appear here after edits.','ستظهر النسخ المحفوظة تلقائيًا هنا بعد التعديلات.','Les instantanés automatiques apparaîtront ici après les modifications.')}</div>}</div>
              <div className="mt-3 text-[7px] text-white/35">{T('Published history is retained separately so Restore never edits the live match state.','يتم الاحتفاظ بسجل المنشور منفصلًا حتى لا تؤثر الاستعادة على حالة المباراة الحية.','L’historique publié est séparé pour protéger le match en direct.')}</div>
              {publishedHistory.length>0&&<div className="mt-2 space-y-1">{publishedHistory.slice().reverse().map(v=><div key={`${v.publishedVersion}-${v.updatedAt}`} className="flex items-center justify-between rounded border border-emerald-400/10 p-1.5"><span className="text-[7px] text-emerald-200">PUBLISHED v{v.publishedVersion||v.version}</span><button onClick={()=>{const restored=rollbackPublished(animationId,Number(v.publishedVersion||v.version));setDesign(restored);setPublishedHistory(getPublishedHistory(animationId));}} className="rounded border border-emerald-400/20 px-2 py-1 text-[7px] text-emerald-200">RESTORE LIVE</button></div>)}</div>}
            </div>
          </div>
        </div>
      </div>}
      {settingsOpen && <div className="fixed inset-0 z-[75] bg-black/75 flex items-center justify-center p-6" onMouseDown={()=>setSettingsOpen(false)}>
        <div className="w-[860px] max-w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-yellow-400/25 bg-[#080b12] p-5 shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><div><div className="text-lg font-black text-yellow-200">{T('PROFESSIONAL DESIGN CONTROL','التحكم الاحترافي في التصميم','CONTRÔLE DE DESIGN PROFESSIONNEL')}</div><div className="text-[9px] text-white/40">{T('Full control is applied to the current animation only.','كل التعديلات تطبّق على الأنيميشن الحالي فقط.','Tous les réglages s’appliquent uniquement à l’animation actuelle.')}</div></div><button onClick={()=>setSettingsOpen(false)} className="rounded-lg border border-white/10 px-3 py-1 text-[9px]">ESC</button></div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 p-3 space-y-2"><div className="text-[8px] font-black tracking-widest text-yellow-200">{T('CANVAS','لوحة الرسم','CANVAS')}</div>
              <label className="text-[8px] text-white/40">{T('BACKGROUND','الخلفية','ARRIÈRE-PLAN')}<input type="text" value={design.canvas.background} onChange={e=>commit({...design,canvas:{...design.canvas,background:e.target.value}},'Canvas background')} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[10px]"/></label>
              <div className="grid grid-cols-3 gap-1">{[.35,.52,.7,1,1.25,1.5].map(z=><button key={z} onClick={()=>setDesignZoom(z)} className={`rounded border px-2 py-1 text-[8px] ${designZoom===z?'border-yellow-400/40 text-yellow-200':'border-white/10'}`}>{Math.round(z*100)}%</button>)}</div>
              <button onClick={()=>setDesign(d=>({...d,editor:{...d.editor,grid:!d.editor?.grid}}))} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('GRID','الشبكة','GRILLE')} {design.editor?.grid===false?T('OFF','إيقاف','OFF'):T('ON','تشغيل','ON')}</button>
              <button onClick={()=>setDesign(d=>({...d,editor:{...d.editor,guides:!d.editor?.guides}}))} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('GUIDES','الأدلة','GUIDES')} {design.editor?.guides===false?T('OFF','إيقاف','OFF'):T('ON','تشغيل','ON')}</button>
              <button onClick={()=>setDesign(d=>({...d,editor:{...d.editor,snap:!d.editor?.snap}}))} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('SNAP','التقاط ومحاذاة','ACCROCHAGE')} {design.editor?.snap===false?T('OFF','إيقاف','OFF'):T('ON','تشغيل','ON')}</button>
            </div>
            <button onClick={()=>setSafeArea(v=>!v)} className="w-full mb-2 rounded border border-white/10 py-2 text-[9px]">{T('SAFE AREA','منطقة الأمان','ZONE DE SÉCURITÉ')} {safeArea?T('ON','تشغيل','ON'):T('OFF','إيقاف','OFF')}</button><div className="rounded-xl border border-white/10 p-3 space-y-2"><div className="text-[8px] font-black tracking-widest text-yellow-200">{T('LAYER COMMANDS','أوامر الطبقات','COMMANDES DES CALQUES')}</div>
              <button onClick={()=>setDesign(d=>({...d,selectedLayerIds:d.layers.filter(l=>l.visible&&!l.locked).map(l=>l.id),selectedLayerId:d.layers.find(l=>l.visible&&!l.locked)?.id||null}))} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('SELECT ALL VISIBLE','تحديد كل المرئي','SÉLECTIONNER TOUT LE VISIBLE')}</button>
              <button onClick={()=>setDesign(d=>({...d,selectedLayerIds:[],selectedLayerId:null}))} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('DESELECT ALL','إلغاء تحديد الكل','TOUT DÉSÉLECTIONNER')}</button>
              <button onClick={groupSelected} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('GROUP SELECTION','تجميع التحديد','REGROUPER LA SÉLECTION')}</button>
              <button onClick={ungroup} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('UNGROUP','فك التجميع','DÉGROUPE')}</button>
              <button onClick={duplicateSelected} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('DUPLICATE','تكرار','DUPLIQUER')}</button>
              <button onClick={deleteSelected} className="w-full rounded border border-red-400/20 text-red-300 py-2 text-[9px]">{T('DELETE','حذف','SUPPRIMER')}</button>
            </div>
            <div className="rounded-xl border border-white/10 p-3 space-y-2"><div className="text-[8px] font-black tracking-widest text-yellow-200">{T('VERSION / SAFETY','الإصدار / الأمان','VERSION / SÉCURITÉ')}</div>
              <div className="text-[9px] text-white/45">{T('Animation','الأنيميشن','Animation')}: <b className="text-white/80">{animationId}</b><br/>{T('Version','الإصدار','Version')}: <b className="text-yellow-200">v{design.version}</b><br/>{T('Status','الحالة','Statut')}: <b>{design.status}</b></div>
              <button onClick={save} className="w-full rounded border border-white/10 py-2 text-[9px]">{T('SAVE DRAFT','حفظ المسودة','ENREGISTRER LE BROUILLON')}</button>
              <button onClick={publish} className="w-full rounded border border-yellow-400/30 bg-yellow-400/10 text-yellow-200 py-2 text-[9px]">{T('PUBLISH THIS ANIMATION ONLY','نشر هذا الأنيميشن فقط','PUBLIER CETTE ANIMATION UNIQUEMENT')}</button>
              <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[.02] p-2 mt-2 space-y-2"><div className="flex items-center justify-between"><div className="text-[8px] font-black tracking-widest text-emerald-200">{T('TIMED CONTROLS','أزرار وتحكم بالتوقيت','CONTRÔLES TEMPORISÉS')}</div><button onClick={()=>createAssistantControl('SHOW SELECTED',design.currentTime,Math.min(design.duration,design.currentTime+2))} className="rounded border border-emerald-400/25 px-2 py-1 text-[7px] text-emerald-200">+ CONTROL</button></div>{(design.controls||[]).length===0&&<div className="text-[7px] text-white/35">{T('No controls. Use AI or + CONTROL to create timed show buttons.','لا توجد أزرار. استخدم الذكاء أو + CONTROL لإنشاء زر عرض بتوقيت.','Aucun contrôle. Utilisez IA ou + CONTROL.')}</div>}{(design.controls||[]).map(c=><div key={c.id} className="rounded border border-white/10 p-1.5"><div className="flex items-center gap-1"><input value={c.label} onChange={e=>setDesign(d=>({...d,controls:(d.controls||[]).map(x=>x.id===c.id?{...x,label:e.target.value}:x)}))} className="min-w-0 flex-1 rounded bg-black/30 px-1 py-1 text-[8px]"/><button onClick={()=>setDesign(d=>({...d,controls:(d.controls||[]).filter(x=>x.id!==c.id)}))} className="text-red-300 text-[8px]">×</button></div><div className="grid grid-cols-5 gap-1 mt-1"><label className="text-[6px] text-white/35">ICON<input value={c.icon||'▶'} maxLength={2} onChange={e=>setDesign(d=>({...d,controls:(d.controls||[]).map(x=>x.id===c.id?{...x,icon:e.target.value}:x)}))} className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-[7px]"/></label><label className="text-[6px] text-white/35">ORDER<input type="number" value={c.sortOrder??0} onChange={e=>setDesign(d=>({...d,controls:(d.controls||[]).map(x=>x.id===c.id?{...x,sortOrder:Number(e.target.value)||0}:x)}))} className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-[7px]"/></label><label className="text-[6px] text-white/35">COLOR<input type="color" value={c.color||'#22d3ee'} onChange={e=>setDesign(d=>({...d,controls:(d.controls||[]).map(x=>x.id===c.id?{...x,color:e.target.value}:x)}))} className="w-full h-6 bg-black/30 border border-white/10 rounded"/></label><label className="text-[6px] text-white/35">START<input type="number" min="0" max={design.duration} step=".05" value={c.startTime} onChange={e=>setDesign(d=>({...d,controls:(d.controls||[]).map(x=>x.id===c.id?{...x,startTime:Number(e.target.value)||0}:x)}))} className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-[7px]"/></label><label className="text-[6px] text-white/35">END<input type="number" min="0" max={design.duration} step=".05" value={c.endTime ?? design.duration} onChange={e=>setDesign(d=>({...d,controls:(d.controls||[]).map(x=>x.id===c.id?{...x,endTime:Number(e.target.value)||0}:x)}))} className="w-full bg-black/30 border border-white/10 rounded px-1 py-1 text-[7px]"/></label><button onClick={()=>{try{const ch=new BroadcastChannel('wab-broadcast-design-trigger-v1');ch.postMessage({type:'trigger-design',animationId,durationMs:Math.max(250,((c.endTime??design.duration)-c.startTime)*1000)});ch.close();}catch{}}} className="mt-3 rounded border border-emerald-400/25 text-emerald-200 text-[7px]">TEST</button></div></div>)}</div>
              <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/[.02] p-2 mt-2 space-y-2"><div className="text-[8px] font-black tracking-widest text-cyan-200">{T('DESIGN DNA','هوية الأنيميشن','ADN DU DESIGN')}</div><div className="text-[7px] text-white/35">{dnaDefaults.dynamicVariables.join(' · ') || T('No dynamic bindings','لا توجد روابط ديناميكية','Aucun binding dynamique')}</div><div className="grid grid-cols-2 gap-1"><label className="text-[7px] text-white/40">{T('PURPOSE','الهدف','OBJECTIF')}<input value={dnaDefaults.purpose} onChange={e=>setDesign(d=>({...d,dna:{...(d.dna||dnaDefaults),purpose:e.target.value}}))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"/></label><label className="text-[7px] text-white/40">{T('TRIGGER','المشغل','DÉCLENCHEUR')}<input value={dnaDefaults.trigger} onChange={e=>setDesign(d=>({...d,dna:{...(d.dna||dnaDefaults),trigger:e.target.value}}))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"/></label><label className="text-[7px] text-white/40">{T('NEXT','التالي','SUIVANT')}<select value={dnaDefaults.nextAnimationId||''} onChange={e=>setDesign(d=>({...d,dna:{...(d.dna||dnaDefaults),nextAnimationId:(e.target.value||null) as any}}))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"><option value="">NONE</option>{DESIGN_ANIMATIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label className="text-[7px] text-white/40">{T('CONTROLLER','التحكم','CONTRÔLEUR')}<select value={dnaDefaults.controller} onChange={e=>setDesign(d=>({...d,dna:{...(d.dna||dnaDefaults),controller:e.target.value as any}}))} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"><option value="main-referee">MAIN REFEREE</option><option value="operator">OPERATOR</option><option value="system">SYSTEM</option></select></label></div><button onClick={save} className="w-full rounded border border-cyan-400/20 text-cyan-200 py-1.5 text-[8px]">{T('SAVE DNA','حفظ الهوية','ENREGISTRER ADN')}</button></div>
              <button onClick={reset} className="w-full rounded border border-red-400/20 text-red-300 py-2 text-[9px]">{T('RESTORE ORIGINAL','استعادة الأصل','RESTAURER L’ORIGINAL')}</button>
            </div>
          </div>
        </div>
      </div>}
      {advancedOpen && <div className="fixed inset-0 z-[84] bg-black/75 flex items-center justify-center p-6" onMouseDown={()=>setAdvancedOpen(false)}><div className="w-[980px] max-w-full max-h-[88vh] overflow-y-auto rounded-2xl border border-violet-400/25 bg-[#080b12] p-5 shadow-2xl" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-4"><div><div className="text-lg font-black text-violet-200">WAB-TKD PRODUCTION DESIGN SUITE</div><div className="text-[9px] text-white/40">Native renderer · keyframes · assets · safe publish · device sync · AI</div></div><button onClick={()=>setAdvancedOpen(false)} className="rounded border border-white/10 px-3 py-1 text-[9px]">ESC</button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2"><button onClick={()=>setShowRulers(v=>!v)} className="rounded border border-white/10 p-2 text-[8px]">RULERS {showRulers?'ON':'OFF'}</button><button onClick={()=>setSafeArea(v=>!v)} className="rounded border border-white/10 p-2 text-[8px]">SAFE AREA {safeArea?'ON':'OFF'}</button><button onClick={()=>setSnap(v=>!v)} className="rounded border border-white/10 p-2 text-[8px]">SNAP {snap?'ON':'OFF'}</button><button onClick={()=>setPreviewMode(true)} className="rounded border border-cyan-400/20 text-cyan-200 p-2 text-[8px]">NATIVE RENDERER</button><button onClick={()=>setFinalSystemsOpen(true)} className="rounded border border-yellow-400/30 text-yellow-200 p-2 text-[8px]">FINAL SYSTEMS</button></div><div className="grid grid-cols-2 gap-2 mt-3"><button onClick={()=>{if(selectedIds.length)commit({...duplicateLayerTree(design,selectedIds[0]),selectedLayerIds:duplicateLayerTree(design,selectedIds[0]).selectedLayerIds},'Duplicate layer tree with keyframes')}} className="rounded border border-white/10 p-2 text-[8px]">DUPLICATE TREE + KEYFRAMES</button><button onClick={copyDesignToAnimation} className="rounded border border-white/10 p-2 text-[8px]">COPY COMPLETE DESIGN → ANIMATION</button><button onClick={()=>{if(selectedIds.length>1){const src=design.layers.find(l=>l.id===selectedIds[0]);if(src)commit({...design,layers:design.layers.map(l=>selectedIds.includes(l.id)&&l.id!==src.id?copyStyle(src,l):l)},'Copy style to selection')}} className="rounded border border-white/10 p-2 text-[8px]">COPY STYLE → SELECTION</button></div><div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.03] p-3 text-[9px] text-white/55"><b className="text-emerald-200">SAFE PUBLISH</b><div className="mt-1">Draft edits stay isolated. Publish sends only the selected animation/design to the public renderer. Match score, timer, winner and database are never part of Design Studio mutations.</div></div><div className="mt-3 rounded-xl border border-blue-400/15 bg-blue-400/[.03] p-3 text-[9px] text-white/55"><b className="text-blue-200">SUPABASE SCOPE</b><div className="mt-1">Tournament: {tournamentId||'GLOBAL'} · Display: {mirrorDisplayId||'DEFAULT'} · Cloud sync: {tournamentId?'ENABLED':'LOCAL-FIRST'}</div></div><div className="mt-3 rounded-xl border border-yellow-400/15 bg-yellow-400/[.03] p-3"><div className="text-[8px] font-black text-yellow-200 mb-2">AI DESIGN COMMANDS</div><div className="grid grid-cols-2 gap-1 text-[8px] text-white/60"><span>• Move red left / blue right</span><span>• Scale any layer 30%</span><span>• Gold frame + glow</span><span>• Show from 2 → 5 seconds</span><span>• Duplicate animation + keyframes</span><span>• Bind player/photo/logo/medal/trophy</span><span>• Align / distribute / snap</span><span>• Fit 1920×1080 broadcast safe area</span></div></div></div></div>}
      {finalSystemsOpen && <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-6" onMouseDown={()=>setFinalSystemsOpen(false)}><div className="w-[1100px] max-w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-yellow-400/25 bg-[#080b12] p-5 shadow-2xl" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-4"><div><div className="text-xl font-black text-yellow-200">WAB·TKD FINAL BROADCAST SYSTEMS</div><div className="text-[9px] text-white/40">State machine · conditions · scenes · queue · macros · global theme · design package</div></div><button onClick={()=>setFinalSystemsOpen(false)} className="rounded border border-white/10 px-3 py-1 text-[9px]">ESC</button></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2"><div className="rounded-xl border border-white/10 p-3"><div className="text-[8px] text-white/40">ANIMATION STATE</div><div className="text-sm font-black text-cyan-200 mt-1">{advancedPkg.stateMachine.state}</div><div className="text-[7px] text-white/35 mt-1">IDLE → ENTER → ACTIVE → EXIT → COMPLETE</div></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[8px] text-white/40">SCENES</div><div className="text-sm font-black">{advancedPkg.scenes.length}</div></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[8px] text-white/40">QUEUE</div><div className="text-sm font-black">{advancedPkg.queue.length}</div><button onClick={addQueueItem} className="mt-2 rounded border border-cyan-400/20 px-2 py-1 text-[7px] text-cyan-200">+ QUEUE CURRENT</button></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[8px] text-white/40">MACROS</div><div className="text-sm font-black">{advancedPkg.macros.length}</div><button onClick={addMacro} className="mt-2 rounded border border-violet-400/20 px-2 py-1 text-[7px] text-violet-200">+ CREATE MACRO</button></div></div>
      <div className="grid lg:grid-cols-2 gap-3 mt-3"><div className="rounded-xl border border-white/10 p-3"><div className="text-[8px] font-black text-yellow-200 mb-2">GLOBAL BROADCAST VARIABLES</div><div className="grid grid-cols-2 gap-2">{(['brandName','primaryFont','secondaryFont','gold','red','blue','background','defaultGlow','animationSpeed'] as const).map(k=><label key={k} className="text-[7px] text-white/40">{k}<input value={String((advancedPkg.globals as any)[k]??'')} onChange={e=>syncAdvanced({globals:{...advancedPkg.globals,[k]:['defaultGlow','animationSpeed'].includes(k)?Number(e.target.value):e.target.value} as GlobalBroadcastVariables})} className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-[8px]"/></label>)}</div></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[8px] font-black text-cyan-200 mb-2">CONDITIONAL RULES</div><button onClick={addCondition} className="rounded border border-cyan-400/20 px-2 py-1 text-[7px] text-cyan-200">+ ADD WINNER CONDITION TO SELECTED LAYER</button><div className="mt-2 space-y-1">{advancedPkg.conditions.map((r:any)=><div key={r.id} className="rounded border border-white/10 p-2 text-[7px]">{r.action.toUpperCase()} · {r.when} · {r.enabled?'ON':'OFF'}</div>)}</div></div></div>
      <div className="rounded-xl border border-white/10 p-3 mt-3"><div className="text-[8px] font-black text-emerald-200 mb-2">BROADCAST SCENES</div><div className="grid grid-cols-2 md:grid-cols-4 gap-1">{advancedPkg.scenes.map(s=><button key={s.id} onClick={()=>syncAdvanced({scenes:advancedPkg.scenes.map(x=>x.id===s.id?{...x,enabled:!x.enabled}:x)})} className={`rounded border p-2 text-[7px] ${s.enabled?'border-emerald-400/20 text-emerald-200':'border-white/10 text-white/30'}`}>{s.name}<br/><span className="text-[6px]">{s.animationId}</span></button>)}</div></div>
      <div className="rounded-xl border border-white/10 p-3 mt-3"><div className="text-[8px] font-black text-violet-200">MACROS & QUEUE</div><div className="grid lg:grid-cols-2 gap-2 mt-2"><div className="space-y-1">{advancedPkg.macros.map((m:any)=><div key={m.id} className="flex items-center justify-between rounded border border-white/10 p-2 text-[7px]"><span>{m.name} · {m.steps.length} steps</span><button onClick={()=>syncAdvanced({macros:advancedPkg.macros.map(x=>x.id===m.id?{...x,enabled:!x.enabled}:x)})} className="text-cyan-200">{m.enabled?'ENABLED':'DISABLED'}</button></div>)}</div><div className="space-y-1">{advancedPkg.queue.map((q:any,i:number)=><div key={q.id} className="flex items-center justify-between rounded border border-white/10 p-2 text-[7px]"><span>#{i+1} {q.animationId} · {q.delay}ms</span><button onClick={()=>syncAdvanced({queue:advancedPkg.queue.filter(x=>x.id!==q.id)})} className="text-red-300">REMOVE</button></div>)}</div></div></div>
      <div className="flex flex-wrap gap-2 mt-3"><button onClick={exportPackage} className="rounded border border-cyan-400/20 px-3 py-2 text-[8px] text-cyan-200">EXPORT DESIGN PACKAGE</button><label className="rounded border border-violet-400/20 px-3 py-2 text-[8px] text-violet-200 cursor-pointer">IMPORT DESIGN PACKAGE<input type="file" accept="application/json,.json" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)importPackageFile(f);e.currentTarget.value='';}}/></label><button onClick={()=>syncAdvanced({design})} className="rounded border border-emerald-400/20 px-3 py-2 text-[8px] text-emerald-200">SAVE FINAL SYSTEMS</button></div><div className="mt-3 rounded-lg border border-emerald-400/10 bg-emerald-400/[.02] p-3 text-[7px] text-white/40">SAFE BOUNDARY: visual design and broadcast commands only. Match score, timer, winner, player and tournament state remain outside Design Studio.</div></div></div>}
      {assistantOpen && <div className="fixed inset-0 z-[85] bg-black/75 flex items-center justify-center p-6" onMouseDown={()=>setAssistantOpen(false)}><div className="w-[820px] max-w-full max-h-[88vh] rounded-2xl border border-yellow-400/25 bg-[#080b12] p-5 shadow-2xl flex flex-col" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-3"><div><div className="text-lg font-black text-yellow-200">{T('WAB-TKD DESIGN AI','ذكاء WAB-TKD للتصميم','IA DESIGN WAB-TKD')}</div><div className="text-[9px] text-white/40">{T('Describe what you want. AI creates editable layers, live bindings and timed controls.','اكتب ما تريد. الذكاء ينشئ طبقات قابلة للتعديل وروابط حية وأزرارًا بتوقيت.','Décrivez ce que vous voulez. IA crée calques, données et contrôles temporisés.')}</div></div><button onClick={()=>setAssistantOpen(false)} className="rounded-lg border border-white/10 px-3 py-1 text-[9px]">ESC</button></div><div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-3">{assistantMessages.length===0&&<div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[.03] p-4 text-[10px] text-white/55 leading-5">{T('Examples: “Show the best player in this Bar Équipe match here”, “put the winner flag here”, “add a frame”, “create a button from 2 to 5 seconds”.','أمثلة: «أظهر أفضل لاعب في مباراة بار إيكيب هنا»، «ضع علم الفائز هنا»، «أضف إطارًا»، «أنشئ زرًا من 2 إلى 5 ثوانٍ».','Exemples : « afficher le meilleur joueur… », « mettre le drapeau du vainqueur… », « ajouter un cadre », « créer un bouton de 2 à 5 secondes ».')}</div>}{assistantMessages.map((m,i)=><div key={i} className={`rounded-xl p-2 text-[9px] ${m.role==='user'?'bg-white/5 border border-white/10 ml-8':'bg-yellow-400/[.05] border border-yellow-400/10 mr-8 text-yellow-100/80'}`}><b className="text-[8px] uppercase">{m.role==='user'?'YOU':'WAB AI'}</b><div className="mt-1">{m.text}</div></div>)}</div><div className="flex gap-2"><input autoFocus value={assistantCommand} onChange={e=>setAssistantCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applyAssistant()}} placeholder={T('Tell AI what to add, bind, resize or show…','قل للذكاء ماذا يضيف أو يربط أو يكبر أو يظهر…','Dites à l’IA quoi ajouter, lier, agrandir ou afficher…')} className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-3 text-xs"/><button onClick={runExternalAI} disabled={externalAiBusy} className="rounded-lg border border-cyan-400/30 bg-cyan-400/15 text-cyan-100 px-4 text-[10px] font-black disabled:opacity-40">{externalAiBusy?'AI…':'AI CLOUD'}</button><button onClick={applyAssistant} className="rounded-lg bg-yellow-400 text-black px-5 text-[10px] font-black">{T('CREATE','أنشئ','CRÉER')}</button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">{['Show best player here','Add winner flag','Add editable frame','Create button from 2 to 5 seconds','Make player name bigger','Show round score','Add team name','Add club name'].map(c=><button key={c} onClick={()=>{setAssistantCommand(c);setTimeout(applyAssistant,0)}} className="rounded-lg border border-white/10 px-2 py-2 text-[8px] text-left hover:border-yellow-400/30">{c}</button>)}</div></div></div>}
      {debugOpen && <div className="fixed inset-0 z-[86] bg-black/80 flex items-center justify-center p-6" onMouseDown={()=>setDebugOpen(false)}><div className="w-[900px] max-w-full rounded-2xl border border-cyan-400/20 bg-[#070a10] p-5 shadow-2xl" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="text-lg font-black text-cyan-200">{T('BROADCAST DEBUG CONSOLE','وحدة تشخيص البث','CONSOLE DE DIAGNOSTIC')}</div><div className="text-[9px] text-white/40">{T('Operator/developer diagnostics only','للمشرف/المطور فقط','Diagnostic opérateur/développeur uniquement')}</div></div><button onClick={()=>setDebugOpen(false)}>ESC</button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">{[['Animation',animationId],['Version',`v${design.version}`],['State',playing?'PLAYING':'PAUSED'],['Time',`${design.currentTime.toFixed(2)}s`],['FPS',runtimeMetrics?`${runtimeMetrics.fps} / ${design.playback?.fps||60}`:String(design.playback?.fps||60)],['Layers',String(design.layers.length)],['Keyframes',String(design.layers.reduce((n,l)=>n+l.keyframes.length,0))],['Public Sync',design.status==='published'?'READY':'DRAFT ONLY']].map(([k,v])=><div key={k} className="rounded-lg border border-white/10 p-3"><div className="text-[8px] text-white/40">{k}</div><div className="text-sm font-black mt-1">{v}</div></div>)}</div><div className="mt-3 rounded-lg border border-white/10 p-3 text-[9px] text-white/50">{isolatedLayerId?`ISOLATION ACTIVE · ${isolatedLayerId}`:'NO ISOLATION'} · {beforeAfter.toUpperCase()} · QUALITY {renderQuality.toUpperCase()} · INSTANCE PROTECTION VIA MATCH CONTROLLER</div></div></div>}
      {commandHelp && <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6" onMouseDown={()=>setCommandHelp(false)}><div className="w-[720px] max-w-full rounded-2xl border border-yellow-400/30 bg-[#090b10] p-5 shadow-2xl" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-4"><div><div className="text-lg font-black text-yellow-200">{T('KEYBOARD SHORTCUTS','اختصارات لوحة المفاتيح','RACCOURCIS CLAVIER')}</div><div className="text-[10px] text-white/40">{T('WAB-TKD Broadcast Design Studio — Control Guide','WAB-TKD — دليل التحكم','WAB-TKD — GUIDE DE CONTRÔLE')}</div></div><button onClick={()=>setCommandHelp(false)} className="text-white/60">ESC</button></div><div className="grid grid-cols-2 gap-2 text-[10px]">{[['Ctrl/Cmd+Z','Undo / تراجع'],['Ctrl/Cmd+Shift+Z','Redo / إعادة'],['Ctrl/Cmd+S','Save / حفظ'],['Ctrl/Cmd+D','Duplicate / تكرار'],['Ctrl/Cmd+G','Group / تجميع'],['Ctrl/Cmd+Shift+G','Ungroup / فك التجميع'],['Ctrl/Cmd+[ / ]','Layer order / ترتيب الطبقة'],['Ctrl/Cmd+Shift+[ / ]','Front/Back / للأمام أو الخلف'],['Ctrl/Cmd+A','Select all / تحديد الكل'],['Ctrl/Cmd+Shift+A','Deselect all / إلغاء تحديد الكل'],['Ctrl/Cmd+C / V','Copy / Paste / نسخ / لصق'],['Delete / Backspace','Delete layer / حذف الطبقة'],['Space','Play / Pause / تشغيل / إيقاف مؤقت'],['Home / End','First / Last frame / أول وآخر إطار'],['← / →','Step frame / خطوة إطار'],['Shift+← / →','Step 0.1s / خطوة 0.1 ثانية'],['K','Add keyframe / إضافة مفتاح حركة'],['F','Freeze / تجميد'],['F2','Rename layer / إعادة تسمية'],['V','Move / تحريك'],['T','Text / نص'],['R','Frame / إطار'],['I','Image / صورة'],['E','Effect / تأثير'],['Esc','Deselect / إلغاء التحديد'],['? / Shift+/','Shortcut help / دليل الاختصارات']].map(([a,b])=><div key={a} className="flex justify-between gap-4 rounded-lg border border-white/10 px-3 py-2"><kbd className="text-yellow-200">{a}</kbd><span className="text-white/60">{b}</span></div>)}</div></div></div>}
  </div>;
}

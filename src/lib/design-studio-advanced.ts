import type { BroadcastDesign, DesignLayer, DesignAnimationId, EasingKind, Keyframe, BindingKey } from './broadcast-design';
import { DESIGN_ANIMATIONS, evaluateLayerAtTime, upsertKeyframe } from './broadcast-design';

/** Production-safe list of design-only fields. Match state is intentionally absent. */
export const DESIGN_ONLY_FIELDS = new Set([
  'x','y','width','height','rotation','scale','opacity','color','background','borderColor','borderWidth','borderRadius',
  'fontFamily','fontSource','fontSize','fontWeight','textAlign','direction','text','imageSrc','videoSrc','binding','effect',
  'frameStyle','borderStyle','gradient','effectColor','effectIntensity','effectRadius','shadowColor','shadowBlur','shadowX','shadowY',
  'filter','letterSpacing','lineHeight','textStrokeColor','textStrokeWidth','blendMode','maskId','maskFeather','autoFit','clipPath',
  'motionPath','motionPathReverse','motionPathLoop','motionPathRotate','keyframes','visible','locked','parentId','zIndex','name'
]);

export const REQUIRED_BINDINGS: Record<string, BindingKey[]> = {
  'team-call': ['teamName','teamLogo','clubName','clubLogo','flag','playerName','playerPhoto','playerNumber'],
  'player-call': ['playerName','playerPhoto','playerNumber','country','flag','clubName','clubLogo','matchNumber','weight','round','mat','tournament'],
  'player-change': ['playerName','playerPhoto','playerNumber','teamName','teamLogo','clubName','clubLogo'],
  'winner': ['winnerName','winnerPhoto','winnerFlag','winnerTeam','winnerClub','score','roundWinsRed','roundWinsBlue','medalImage'],
  'match-result': ['winnerName','winnerPhoto','winnerFlag','winnerTeam','winnerClub','totalScoreRed','totalScoreBlue','roundWinsRed','roundWinsBlue'],
  'best-player-match': ['bestPlayer','bestPlayerPhoto','bestPlayerFlag','bestPlayerTeam','bestPlayerClub'],
  'team-match-mvp': ['bestPlayer','bestPlayerPhoto','bestPlayerTeam','bestPlayerClub'],
  'tournament-mvp': ['bestPlayer','bestPlayerPhoto','bestPlayerTeam','bestPlayerClub','tournament'],
  'best-team': ['bestTeam'], 'best-club': ['bestClub'], 'best-referee': ['bestReferee','refereeName'],
  'fair-play': ['fairPlay'], 'top-scorer': ['topScorer'], 'top-hitter': ['topHitter'],
  'podium': ['winnerName','winnerPhoto','medalImage','trophyImage'],
};

export interface AnimationAudit { animationId: DesignAnimationId; layerCount: number; visualLayerCount: number; missingBindings: BindingKey[]; hasKeyframes: boolean; nativeRenderer: boolean; }
export function auditAnimation(design: BroadcastDesign, nativeRenderer = true): AnimationAudit {
  const bindings = new Set(design.layers.map(l => l.binding).filter(Boolean) as BindingKey[]);
  const required = REQUIRED_BINDINGS[design.animationId] || [];
  return { animationId: design.animationId, layerCount: design.layers.length, visualLayerCount: design.layers.filter(l => l.visible && l.type !== 'group').length, missingBindings: required.filter(b => !bindings.has(b)), hasKeyframes: design.layers.some(l => l.keyframes.length > 0 || (l.motionPath?.length || 0) > 1), nativeRenderer };
}
export function auditAllDesigns(designs: Record<string, BroadcastDesign>): AnimationAudit[] {
  return DESIGN_ANIMATIONS.filter(a => a.id !== 'custom').map(a => auditAnimation(designs[a.id] || ({ animationId:a.id, layers:[] } as any)));
}

export function duplicateLayerWithKeyframes(layer: DesignLayer, offset = 24, id = `layer-copy-${Date.now()}`): DesignLayer {
  return { ...JSON.parse(JSON.stringify(layer)), id, name: `${layer.name} COPY`, x: layer.x + offset, y: layer.y + offset, keyframes: layer.keyframes.map(k => ({ ...k, id: `kf-copy-${Date.now()}-${Math.random().toString(36).slice(2,7)}` })) };
}
export function duplicateLayerTree(design: BroadcastDesign, rootId: string): BroadcastDesign {
  const ids = new Set<string>();
  const collect = (id:string) => { if(ids.has(id)) return; ids.add(id); design.layers.filter(l=>l.parentId===id).forEach(c=>collect(c.id)); };
  collect(rootId);
  const map = new Map<string,string>();
  [...ids].forEach(old => map.set(old, `copy:${old}:${Date.now()}:${Math.random().toString(36).slice(2,5)}`));
  const clones = design.layers.filter(l=>ids.has(l.id)).map(l => { const c=duplicateLayerWithKeyframes(l,24,map.get(l.id)!); c.parentId=l.parentId&&map.has(l.parentId)?map.get(l.parentId)!:l.parentId; c.attachToId=l.attachToId&&map.has(l.attachToId)?map.get(l.attachToId)!:l.attachToId; c.children=(l.children||[]).map(x=>map.get(x)||x); return c; });
  return { ...design, layers:[...design.layers,...clones], selectedLayerId:map.get(rootId)||rootId, selectedLayerIds:[...(ids)].map(x=>map.get(x)!).filter(Boolean) };
}

export function copyKeyframes(layer: DesignLayer): Keyframe[] { return JSON.parse(JSON.stringify(layer.keyframes || [])); }
export function pasteKeyframes(layer: DesignLayer, frames: Keyframe[], atTime: number, duration: number): DesignLayer {
  if (!frames.length) return layer;
  const offset=atTime-frames[0].time;
  const shifted=frames.map(k=>({ ...JSON.parse(JSON.stringify(k)), id:`kf-paste-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, time:Math.max(0,Math.min(duration,Number((k.time+offset).toFixed(3)))) }));
  return { ...layer, keyframes:[...layer.keyframes,...shifted].sort((a,b)=>a.time-b.time) };
}
export function copyStyle(source: DesignLayer, target: DesignLayer): DesignLayer {
  const next={...target}; DESIGN_ONLY_FIELDS.forEach(k=>{ if(['x','y','width','height','rotation','scale','opacity','text','imageSrc','videoSrc','binding','keyframes','name','parentId','zIndex','visible','locked'].includes(k)) return; const value=(source as any)[k]; if(value!==undefined)(next as any)[k]=JSON.parse(JSON.stringify(value)); }); return next;
}

export interface DesignAIAction { type:'move'|'scale'|'style'|'bind'|'show'|'hide'|'duplicate'|'align'|'group'|'keyframe'|'easing'; target?:string; targets?:string[]; value?:Record<string,unknown>; }
export interface ParsedDesignCommand { actions: DesignAIAction[]; message:string; }
const findTarget=(design:BroadcastDesign, token:string)=>design.layers.find(l=>l.id.toLowerCase()===token.toLowerCase()||l.name.toLowerCase().includes(token.toLowerCase()));
function resolveTarget(design:BroadcastDesign, q:string){
  if(/red|hong|أحمر|حمراء/.test(q)) return design.layers.find(l=>/red|hong|أحمر/i.test(l.id+' '+l.name));
  if(/blue|chung|أزرق|زرقاء/.test(q)) return design.layers.find(l=>/blue|chung|أزرق/i.test(l.id+' '+l.name));
  return design.layers.find(l=>/winner|الفائز|best player|أفضل لاعب|photo|صورة|name|اسم/.test(q) && l.type!=='group');
}
export function parseLocalDesignCommand(prompt:string, design:BroadcastDesign): ParsedDesignCommand {
  const q=prompt.toLowerCase(); const actions:DesignAIAction[]=[];
  const explicit=q.match(/(?:layer|طبقة)\s+["']?([^"']+)["']?/i); const target=explicit?findTarget(design,explicit[1]):resolveTarget(design,q);
  if(/1920\s*[×x]\s*1080|1920x1080/.test(q)) actions.push({type:'style',targets:design.layers.map(l=>l.id),value:{canvasWidth:1920,canvasHeight:1080}});
  if(/red.*left|أحمر.*يسار/.test(q)) actions.push({type:'align',targets:design.layers.filter(l=>/red|hong/i.test(l.id+' '+l.name)).map(l=>l.id),value:{side:'left'}});
  if(/blue.*right|أزرق.*يمين/.test(q)) actions.push({type:'align',targets:design.layers.filter(l=>/blue|chung/i.test(l.id+' '+l.name)).map(l=>l.id),value:{side:'right'}});
  const scale=q.match(/(?:scale|كبّر|كبر|يصير أكبر|حجم).*?(\d+)\s*%/i); if(scale&&target) actions.push({type:'scale',target:target.id,value:{percent:Number(scale[1])}});
  if(/gold|ذهبي|ذهبيًا|ذهبية/.test(q)&&target) actions.push({type:'style',target:target.id,value:{borderColor:'#ffd866',effectColor:'#ffd866',effect:'glow'}});
  const range=q.match(/(?:from|من|de)\s*(\d+(?:\.\d+)?)\s*(?:to|إلى|a|à)\s*(\d+(?:\.\d+)?)/i); if(range&&target) actions.push({type:'keyframe',target:target.id,value:{from:Number(range[1]),to:Number(range[2]),visible:true}});
  if(/duplicate|نسخ.*طبقة|تكرار/.test(q)&&target) actions.push({type:'duplicate',target:target.id,value:{offset:24}});
  if(/same font|same.*font|نفس الخط|جميع النصوص.*الخط/.test(q)) { const texts=design.layers.filter(l=>l.type==='text'); actions.push({type:'style',targets:texts.map(l=>l.id),value:{fontFamily:target?.fontFamily||'Inter'}}); }
  if(/winner.*right|الفائز.*يمين/.test(q)&&target) actions.push({type:'move',target:target.id,value:{side:'right'}});
  if(/mvp|أفضل لاعب|best player/.test(q)&&actions.length===0) actions.push({type:'bind',value:{binding:'bestPlayer'}});
  if(!actions.length) return {actions:[],message:'No safe design command was recognized. Try move/scale/style/bind/show/hide/keyframe.'};
  return {actions,message:'Design-only command parsed. Match score, timer, winner and database are protected.'};
}

export function applyDesignAIResult(design:BroadcastDesign, result:ParsedDesignCommand):BroadcastDesign {
  let next=JSON.parse(JSON.stringify(design)) as BroadcastDesign;
  for(const action of result.actions){
    const targets=(action.targets||[]).map(id=>next.layers.find(l=>l.id===id)).filter(Boolean) as DesignLayer[];
    if(action.target){const t=next.layers.find(l=>l.id===action.target); if(t)targets.push(t);}
    if(action.type==='duplicate' && action.target){ next=duplicateLayerTree(next,action.target); continue; }
    if(action.type==='bind' && action.value?.binding){ next.layers=next.layers.map(l=>targets.includes(l)||(!action.target&&l.id===next.selectedLayerId)?{...l,binding:action.value!.binding as BindingKey}:l); continue; }
    next.layers=next.layers.map(l=>{
      if(!targets.some(t=>t.id===l.id)) return l; const v=action.value||{};
      if(action.type==='scale'&&v.percent!==undefined){const f=Number(v.percent)/100;return {...l,scale:l.scale*f};}
      if(action.type==='move'&&v.side){return {...l,x:v.side==='left'?Math.max(24,l.x-360):Math.min(1920-l.width,l.x+360)};}
      if(action.type==='align'&&v.side){return {...l,x:v.side==='left'?24:Math.max(24,1920-l.width-24)};}
      if(action.type==='style'){const out={...l}; for(const k of ['borderColor','effectColor','effect','fontFamily','color'] as const) if(v[k]!==undefined)(out as any)[k]=v[k]; return out;}
      if(action.type==='show'||action.type==='hide') return {...l,visible:action.type==='show'};
      if(action.type==='keyframe'&&v.from!==undefined&&v.to!==undefined) return upsertKeyframe(upsertKeyframe(l,Number(v.from),{opacity:1}),Number(v.to),{opacity:1});
      return l;
    });
  }
  return next;
}

export function designTimelineFrameTimes(design:BroadcastDesign, fps = design.playback?.fps || 60): number[] {
  const step=1/Number(fps||60); const out:number[]=[]; for(let t=0;t<=design.duration+1e-6;t+=step)out.push(Number(Math.min(design.duration,t).toFixed(4))); return out;
}
export function evaluateFrameByFrame(design:BroadcastDesign, fps=60){ return designTimelineFrameTimes(design,fps).map(time=>({time,layers:design.layers.map(l=>evaluateLayerAtTime(l,time))})); }

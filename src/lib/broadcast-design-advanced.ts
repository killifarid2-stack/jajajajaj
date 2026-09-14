import type { BroadcastDesign, DesignAnimationId, DesignLayer, EasingKind, BindingKey } from './broadcast-design';

/** Final-stage Design Studio systems. These are deliberately visual-only and never mutate Match State. */
export type AnimationState = 'IDLE'|'ENTER'|'ACTIVE'|'EXIT'|'COMPLETE'|'LOOP'|'CANCELLED'|'REPLAY';
export type BroadcastSceneId = 'waiting'|'match-intro'|'live-match'|'round-end'|'replay'|'winner'|'awards'|'upcoming'|'standings'|'custom';
export interface ConditionalRule { id:string; when:string; action:'show'|'hide'|'set-opacity'|'set-variant'; value?:number|string; targetLayerIds:string[]; enabled:boolean; }
export interface GlobalBroadcastVariables { brandName:string; logo?:string; primaryFont:string; secondaryFont:string; gold:string; red:string; blue:string; background:string; defaultGlow:number; animationSpeed:number; }
export interface AnimationStateMachine { state:AnimationState; enteredAt:number; allowReplay:boolean; transitions:Partial<Record<AnimationState, AnimationState[]>>; }
export interface AnimationQueueItem { id:string; animationId:DesignAnimationId; delay:number; auto:boolean; cancelOnMatchState?:string; }
export interface BroadcastMacroStep { id:string; label:string; kind:'control'|'animation'|'delay'|'scene'; animationId?:DesignAnimationId; controlId?:string; sceneId?:BroadcastSceneId; delayMs?:number; }
export interface BroadcastMacro { id:string; name:string; enabled:boolean; steps:BroadcastMacroStep[]; }
export interface BroadcastScene { id:BroadcastSceneId; name:string; animationId:DesignAnimationId; enabled:boolean; displayIds:string[]; }
export interface DesignPackage { schema:'wab-tkd-design-package'; version:1; exportedAt:string; animationId:DesignAnimationId; design:BroadcastDesign; globals:GlobalBroadcastVariables; stateMachine:AnimationStateMachine; conditions:ConditionalRule[]; queue:AnimationQueueItem[]; macros:BroadcastMacro[]; scenes:BroadcastScene[]; }

export const DEFAULT_BROADCAST_VARIABLES:GlobalBroadcastVariables = { brandName:'WAB·TKD', primaryFont:'Inter', secondaryFont:'Cairo', gold:'#ffd866', red:'#ff3158', blue:'#39a9ff', background:'#01040a', defaultGlow:1, animationSpeed:1 };
export const DEFAULT_SCENES:BroadcastScene[] = [
  ['waiting','WAITING','upcoming'],['match-intro','MATCH INTRO','matchup'],['live-match','LIVE MATCH','match-result'],['round-end','ROUND END','round-call'],['replay','VIDEO REPLAY','video-replay'],['winner','WINNER','winner'],['awards','AWARDS','awards' as DesignAnimationId],['upcoming','UPCOMING','standings'],['standings','STANDINGS','standings']
].map(([id,name,animationId])=>({id:id as BroadcastSceneId,name:name as string,animationId:animationId as DesignAnimationId,enabled:true,displayIds:[]}));

export function createAdvancedDesignState(): Pick<DesignPackage,'globals'|'stateMachine'|'conditions'|'queue'|'macros'|'scenes'> {
  return { globals:{...DEFAULT_BROADCAST_VARIABLES}, stateMachine:{state:'IDLE',enteredAt:0,allowReplay:true,transitions:{IDLE:['ENTER'],ENTER:['ACTIVE','CANCELLED'],ACTIVE:['EXIT','LOOP','REPLAY','CANCELLED'],LOOP:['ACTIVE','EXIT','CANCELLED'],REPLAY:['ACTIVE','CANCELLED'],EXIT:['COMPLETE'],COMPLETE:['ENTER'],CANCELLED:['IDLE']}}, conditions:[],queue:[],macros:[],scenes:DEFAULT_SCENES.map(s=>({...s,displayIds:[ ]})) };
}

const now=()=>new Date().toISOString();
const uid=(p:string)=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));

export function canTransition(machine:AnimationStateMachine,to:AnimationState){ return (machine.transitions[machine.state]||[]).includes(to); }
export function transitionState(machine:AnimationStateMachine,to:AnimationState,time:number):AnimationStateMachine { if(!canTransition(machine,to)) throw new Error(`Invalid animation transition ${machine.state} → ${to}`); return {...machine,state:to,enteredAt:time}; }

function valueAtPath(state:any,path:string):any { return path.split('.').reduce((v,k)=>v==null?undefined:v[k],state); }
export function evaluateCondition(expression:string|undefined,state:any):boolean {
  if(!expression?.trim()) return true;
  const exp=expression.trim().replace(/\s+/g,' ');
  const m=exp.match(/^([\w.]+)\s*(===|!==|==|!=|>=|<=|>|<|contains)\s*(.+)$/i);
  if(!m) return Boolean(valueAtPath(state,exp));
  const left=valueAtPath(state,m[1]); let right=m[3].trim();
  if((right.startsWith('"')&&right.endsWith('"'))||(right.startsWith("'")&&right.endsWith("'"))) right=right.slice(1,-1);
  else if(right==='true'||right==='false') right=right==='true'; else if(right==='null') right=null; else if(!Number.isNaN(Number(right))) right=Number(right);
  switch(m[2].toLowerCase()){case '===':case '==':return left==right;case '!==':case '!=':return left!=right;case '>':return left>right;case '<':return left<right;case '>=':return left>=right;case '<=':return left<=right;case 'contains':return String(left??'').toLowerCase().includes(String(right).toLowerCase());default:return false;}
}

export function applyConditionalRules(layers:DesignLayer[],rules:ConditionalRule[],state:any):DesignLayer[]{
  return layers.map(layer=>{let next=clone(layer); for(const r of rules.filter(x=>x.enabled&&x.targetLayerIds.includes(layer.id))){const match=evaluateCondition(r.when,state);if(r.action==='show')next.visible=match;if(r.action==='hide')next.visible=!match;if(r.action==='set-opacity')next.opacity=match?Number(r.value??1):0;if(r.action==='set-variant'&&match&&typeof r.value==='string'){const variant=next.stateVariants?.[r.value];if(variant)next={...next,...clone(variant),id:layer.id,keyframes:layer.keyframes};}} return next;});
}

export function enqueueAnimation(queue:AnimationQueueItem[],item:Omit<AnimationQueueItem,'id'>):AnimationQueueItem[]{ return [...queue,{...item,id:uid('queue')}]; }
export function dequeueAnimation(queue:AnimationQueueItem[]):{item:AnimationQueueItem|null;queue:AnimationQueueItem[]}{ return queue.length?{item:queue[0],queue:queue.slice(1)}:{item:null,queue:[]}; }
export function reorderQueue(queue:AnimationQueueItem[],from:number,to:number){const a=[...queue];const [x]=a.splice(from,1);if(!x)return queue;a.splice(Math.max(0,Math.min(to,a.length)),0,x);return a;}

export function runMacro(macro:BroadcastMacro):BroadcastMacroStep[]{ return macro.enabled?macro.steps.map(clone):[]; }
export function createMacro(name:string,steps:BroadcastMacroStep[]):BroadcastMacro{return{id:uid('macro'),name,enabled:true,steps:clone(steps)};}

export function setSceneDisplay(scene:BroadcastScene,displayId:string,enabled=true):BroadcastScene { const ids=new Set(scene.displayIds); enabled?ids.add(displayId):ids.delete(displayId);return {...scene,displayIds:[...ids]}; }
export function resolveScene(scenes:BroadcastScene[],id:BroadcastSceneId,displayId?:string){return scenes.find(s=>s.id===id&&s.enabled&&(!displayId||s.displayIds.length===0||s.displayIds.includes(displayId)))||null;}

export function copyLayerAnimation(layer:DesignLayer,offset=0):DesignLayer { return {...clone(layer),keyframes:layer.keyframes.map(k=>({...clone(k),id:uid('kf'),time:Math.max(0,k.time+offset)}))}; }
export function copyStyle(source:DesignLayer,target:DesignLayer):DesignLayer { const keys=['color','background','borderColor','borderWidth','borderRadius','fontFamily','fontSize','fontWeight','textAlign','direction','gradient','effect','effectColor','effectIntensity','effectRadius','shadowColor','shadowBlur','shadowX','shadowY','filter','letterSpacing','lineHeight','textStrokeColor','textStrokeWidth','blendMode','frameStyle'] as const; const patch:any={};keys.forEach(k=>{if(source[k]!==undefined)patch[k]=clone(source[k]);});return {...target,...patch}; }
export function resetLayer(layer:DesignLayer,base:DesignLayer):DesignLayer { return {...clone(base),id:layer.id,name:layer.name,parentId:layer.parentId,zIndex:layer.zIndex,keyframes:[]}; }

export function exportDesignPackage(pkg:DesignPackage):string{return JSON.stringify(pkg,null,2);}
export function importDesignPackage(text:string,expectedAnimationId?:DesignAnimationId):DesignPackage { const p=JSON.parse(text) as DesignPackage;if(p.schema!=='wab-tkd-design-package'||p.version!==1||!p.design?.layers)throw new Error('Invalid WAB-TKD design package');if(expectedAnimationId&&p.animationId!==expectedAnimationId)throw new Error(`Package belongs to ${p.animationId}`);return p; }

const PACKAGE_KEY='wab-tkd-design-packages-v1';
export function saveDesignPackage(pkg:DesignPackage){const all:Record<string,DesignPackage>=JSON.parse(localStorage.getItem(PACKAGE_KEY)||'{}');all[pkg.animationId]=clone(pkg);localStorage.setItem(PACKAGE_KEY,JSON.stringify(all));}
export function getDesignPackage(animationId:DesignAnimationId):DesignPackage|null{try{return JSON.parse(localStorage.getItem(PACKAGE_KEY)||'{}')[animationId]||null}catch{return null}}
export function buildDesignPackage(design:BroadcastDesign,overrides:Partial<Omit<DesignPackage,'schema'|'version'|'exportedAt'|'animationId'|'design'>>={}):DesignPackage{const base=createAdvancedDesignState();return{schema:'wab-tkd-design-package',version:1,exportedAt:now(),animationId:design.animationId,design:clone(design),globals:overrides.globals||base.globals,stateMachine:overrides.stateMachine||base.stateMachine,conditions:overrides.conditions||base.conditions,queue:overrides.queue||base.queue,macros:overrides.macros||base.macros,scenes:overrides.scenes||base.scenes};}

export function bindingCatalog():Array<{key:BindingKey,label:string;kind:'text'|'image'|'data'}>{return [
 ['playerName','Player','text'],['playerPhoto','Player Photo','image'],['playerNumber','Player Number','text'],['country','Country','text'],['flag','Flag','image'],['teamName','Team','text'],['teamLogo','Team Logo','image'],['clubName','Club','text'],['clubLogo','Club Logo','image'],['tournament','Tournament','text'],['date','Date','text'],['place','Place','text'],['gender','Gender','text'],['age','Age','text'],['weight','Weight','text'],['mat','Mat','text'],['matchNumber','Match Number','text'],['round','Round','text'],['timer','Timer','text'],['score','Score','text'],['roundScoreRed','Red Round Score','text'],['roundScoreBlue','Blue Round Score','text'],['roundWinsRed','Red Round Wins','text'],['roundWinsBlue','Blue Round Wins','text'],['warningsRed','Red Warnings','text'],['warningsBlue','Blue Warnings','text'],['penaltiesRed','Red Penalties','text'],['penaltiesBlue','Blue Penalties','text'],['winnerName','Winner','text'],['winnerPhoto','Winner Photo','image'],['winnerTeam','Winner Team','text'],['bestPlayer','Best Player','text'],['bestPlayerPhoto','Best Player Photo','image'],['bestTeam','Best Team','text'],['bestClub','Best Club','text'],['bestReferee','Best Referee','text'],['fairPlay','Fair Play','text'],['topScorer','Top Scorer','text'],['topHitter','Top Hitter','text'],['medalImage','Medal','image'],['trophyImage','Trophy','image']
].map(([key,label,kind])=>({key:key as BindingKey,label:String(label),kind:kind as 'text'|'image'|'data'}));}

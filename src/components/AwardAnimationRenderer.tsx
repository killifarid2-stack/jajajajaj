import React from 'react';
import { getAwardSnapshot, type AwardKey } from '@/lib/award-graphics';
import { evaluateDesignLayersAtTime, type BroadcastDesign } from '@/lib/broadcast-design';
import { resolveDesignBinding } from '@/lib/broadcast-design-bindings';
import medalAsset from '@/assets/medal-transparent.png';
import trophyAsset from '@/assets/trophy-wab-tkd-transparent.png';

export const AWARD_RENDER_KEYS: AwardKey[] = ['best_player','best_referee','best_team','best_club','team_match_mvp','fair_play','top_scorer','top_hitter','champion'];
export const AWARD_ANIMATION_KEY_MAP: Record<string,AwardKey> = {
  'best-player-match':'best_player','team-match-mvp':'team_match_mvp','tournament-mvp':'best_player','best-team':'best_team','best-club':'best_club','best-referee':'best_referee','fair-play':'fair_play','top-scorer':'top_scorer','top-hitter':'top_hitter','podium':'champion'
};

export default function AwardAnimationRenderer({ awardKey, design, selectedIds=[], studio=false, controls=false, playing=false, onSelect }: { awardKey: AwardKey; design?: BroadcastDesign; selectedIds?: string[]; studio?: boolean; controls?: boolean; playing?: boolean; onSelect?: (id:string, additive:boolean)=>void }) {
  const snapshot=getAwardSnapshot(awardKey); if(!snapshot) return <div className="absolute inset-0 grid place-items-center bg-black text-white/60 font-black">NO AWARD DATA</div>;
  const layers=design ? evaluateDesignLayersAtTime(design,design.currentTime).map(l=>resolveDesignBinding(l,{ awardAssets:{medal:medalAsset,trophy:trophyAsset}, result:{winner:'chung'}, chung:{player:{name:snapshot.winner.name,photo:snapshot.winner.photo}}, tournamentName:snapshot.tournamentName })) : [];
  const get=(id:string)=>layers.find(l=>l.id===id);
  const css=(id:string,fallback:React.CSSProperties):React.CSSProperties=>{const l=get(id);if(!l)return fallback;return {...fallback,left:`${l.x/1920*100}%`,top:`${l.y/1080*100}%`,width:`${l.width/1920*100}%`,height:`${l.height/1080*100}%`,transform:`rotate(${l.rotation}deg) scale(${l.scale})`,opacity:l.opacity,zIndex:l.zIndex};};
  const pick=(e:React.MouseEvent,id:string)=>{ if(!studio||!onSelect)return; e.stopPropagation(); onSelect(id,e.ctrlKey||e.metaKey); };
  const photo=snapshot.winner.photo;
  const stats=Object.entries(snapshot.winner.stats||{}).slice(0,6);
  const medal=get('award-medal')?.imageSrc || get('medal')?.imageSrc || medalAsset;
  const trophy=get('award-trophy')?.imageSrc || get('trophy')?.imageSrc || trophyAsset;
  const titleLayer=get('award-title');
  return <div className={`absolute inset-0 overflow-hidden bg-black text-white ${playing?'award-render-playing':''}`} data-wab-award-renderer="native">
    <img data-wab-layer-id="award-template" src={snapshot.template} alt="" className="absolute inset-0 w-full h-full object-contain" style={css('award-template',{objectFit:'contain',zIndex:1})} onClick={e=>pick(e,'award-template')}/>
    <div data-wab-layer-id="award-vignette" className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(circle at 50% 45%,transparent 35%,rgba(0,0,0,.58) 100%),linear-gradient(180deg,rgba(0,0,0,.1),transparent 30%,rgba(0,0,0,.35))',zIndex:2}}/>
    {photo && <div data-wab-layer-id="award-photo" onClick={e=>pick(e,'award-photo')} style={css('award-photo',{position:'absolute',left:'35%',top:'20%',width:'30%',height:'42%',border:'2px solid rgba(255,205,80,.9)',borderRadius:18,overflow:'hidden',background:'#050505',boxShadow:'0 0 35px rgba(255,193,45,.22)',zIndex:5})}><img src={photo} alt="" className="w-full h-full object-cover object-top"/></div>}
    <div data-wab-layer-id="award-name" onClick={e=>pick(e,'award-name')} style={css('award-name',{position:'absolute',left:'24%',top:'70%',width:'52%',height:'13%',border:'1px solid rgba(255,205,80,.5)',borderRadius:16,background:'linear-gradient(180deg,rgba(4,4,5,.9),rgba(4,4,5,.76))',zIndex:6,textAlign:'center',padding:'12px 24px',boxShadow:'0 12px 35px rgba(0,0,0,.45)'})}>
      <div data-wab-layer-id="award-title" className="text-[9px] tracking-[.28em] font-black text-[#f3c94d]">{titleLayer?.text || snapshot.title}</div>
      <div data-wab-layer-id="award-winner-name" className="font-black leading-none mt-2" style={{fontSize:'clamp(24px,4vw,58px)'}}>{snapshot.winner.name}</div>
      <div data-wab-layer-id="award-subtitle" className="text-[clamp(10px,1vw,15px)] mt-2 text-white/75 font-extrabold">{snapshot.winner.subtitle||snapshot.winner.club||snapshot.winner.team||snapshot.tournamentName}</div>
    </div>
    {stats.length>0 && <div data-wab-layer-id="award-stats" onClick={e=>pick(e,'award-stats')} style={css('award-stats',{position:'absolute',right:'5%',bottom:'10%',width:'24%',height:'20%',zIndex:7,display:'grid',gridTemplateColumns:'1fr 1fr',gap:6})}>{stats.map(([k,v],i)=><div key={k} data-wab-layer-id={`award-stat-${i}`} className="rounded-lg border border-[#f3c94d]/25 bg-black/70 p-2 flex items-center justify-between gap-2"><span className="text-[7px] text-white/55 font-black">{k}</span><b className="text-[10px] text-[#f3c94d]">{String(v)}</b></div>)}</div>}
    <img data-wab-layer-id="award-medal" src={medal} alt="Medal" onClick={e=>pick(e,'award-medal')} style={css('award-medal',{position:'absolute',right:'6%',top:'12%',width:'12%',height:'18%',objectFit:'contain',zIndex:8,filter:'drop-shadow(0 0 24px rgba(255,200,70,.55))'})}/>
    <img data-wab-layer-id="award-trophy" src={trophy} alt="Trophy" onClick={e=>pick(e,'award-trophy')} style={css('award-trophy',{position:'absolute',left:'6%',top:'12%',width:'12%',height:'18%',objectFit:'contain',zIndex:8,filter:'drop-shadow(0 0 24px rgba(255,200,70,.4))',display:awardKey==='champion'?'block':'none'})}/>
    {studio && selectedIds.map(id=>{const el=document?.querySelector?.(`[data-wab-layer-id="${CSS.escape(id)}"]`) as HTMLElement|null; return el ? <div key={id} className="absolute border-2 border-yellow-300 pointer-events-none" style={{left:el.offsetLeft,top:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight,zIndex:9999}}/> : null;})}
    {controls && <div data-wab-studio-ui="1" className="absolute top-3 left-3 z-20 rounded-xl border border-white/10 bg-black/55 backdrop-blur px-3 py-2 text-[10px] font-black tracking-wider text-[hsl(var(--gold))]">WAB-TKD · AWARD ANIMATION · {snapshot.title}</div>}
    <style>{`.award-render-playing [data-wab-layer-id="award-template"]{animation:awardKenBurns 7s ease-in-out both}.award-render-playing [data-wab-layer-id="award-name"]{animation:awardIn .65s cubic-bezier(.2,.8,.2,1) both}.award-render-playing [data-wab-layer-id="award-medal"]{animation:awardMedalIn .9s cubic-bezier(.2,.8,.2,1) .18s both}@keyframes awardIn{from{opacity:0;transform:scale(.985) translateY(10px);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}@keyframes awardKenBurns{0%{transform:scale(1)}50%{transform:scale(1.018)}100%{transform:scale(1)}}@keyframes awardMedalIn{from{opacity:0;transform:translateX(30px) scale(.7) rotate(-8deg)}to{opacity:1;transform:none}}`}</style>
  </div>;
}

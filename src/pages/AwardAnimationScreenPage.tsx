import React from 'react';
import { Award, ChevronLeft, ChevronRight, Maximize2, Play, Pause, X } from 'lucide-react';
import { getAwardSnapshot, type AwardKey } from '@/lib/award-graphics';
import AwardAnimationRenderer, { AWARD_RENDER_KEYS } from '@/components/AwardAnimationRenderer';
const ORDER: AwardKey[] = AWARD_RENDER_KEYS;
export default function AwardAnimationScreenPage(){
 const [key,setKey]=React.useState<AwardKey>('best_player'); const [playing,setPlaying]=React.useState(false); const [tick,setTick]=React.useState(0); const snapshot=React.useMemo(()=>getAwardSnapshot(key),[key,tick]);
 React.useEffect(()=>{const id=setInterval(()=>setTick(x=>x+1),2500);return()=>clearInterval(id)},[]);
 React.useEffect(()=>{if(!playing)return;const id=setInterval(()=>setKey(k=>ORDER[(ORDER.indexOf(k)+1)%ORDER.length]),6500);return()=>clearInterval(id)},[playing]);
 if(!snapshot)return <div className="min-h-screen bg-black text-white grid place-items-center">NO AWARD DATA</div>;
 return <div className="fixed inset-0 bg-black text-white overflow-hidden">
   <AwardAnimationRenderer awardKey={key} playing={playing} controls />
   <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none"><div className="pointer-events-auto rounded-xl border border-white/10 bg-black/55 backdrop-blur px-3 py-2 text-[10px] font-black tracking-wider text-[hsl(var(--gold))]"><Award size={13} className="inline mr-1"/> WAB-TKD · AWARD ANIMATION</div><div className="pointer-events-auto flex gap-1.5"><button onClick={()=>setPlaying(v=>!v)} className="rounded-xl border border-white/10 bg-black/60 p-2">{playing?<Pause size={15}/>:<Play size={15}/>}</button><button onClick={()=>document.documentElement.requestFullscreen?.().catch(()=>{})} className="rounded-xl border border-white/10 bg-black/60 p-2"><Maximize2 size={15}/></button><button onClick={()=>window.close()} className="rounded-xl border border-white/10 bg-black/60 p-2"><X size={15}/></button></div></div>
   <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/65 backdrop-blur p-2"><button onClick={()=>setKey(k=>ORDER[(ORDER.indexOf(k)-1+ORDER.length)%ORDER.length])} className="p-2 rounded-xl hover:bg-white/10"><ChevronLeft size={16}/></button><div className="px-3 text-[9px] font-black tracking-[.18em]">{ORDER.indexOf(key)+1} / {ORDER.length} · {snapshot.title}</div><button onClick={()=>setKey(k=>ORDER[(ORDER.indexOf(k)+1)%ORDER.length])} className="p-2 rounded-xl hover:bg-white/10"><ChevronRight size={16}/></button></div>
 </div>
}

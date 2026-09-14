export type SponsorSlot = 'break' | 'match-intro' | 'result' | 'mvp' | 'ranking' | 'awards';
export interface BroadcastSponsor { id:string; name:string; logo?:string; website?:string; priority:number; duration:number; slots:SponsorSlot[]; active:boolean; animationId?:string; }
export interface BroadcastAnnouncement { id:string; title:string; message:string; duration:number; priority:number; severity:'info'|'warning'|'critical'; slots:string[]; active:boolean; createdAt:string; }

const SPONSOR_KEY='wab-tkd-broadcast-sponsors-v1';
const ANNOUNCEMENT_KEY='wab-tkd-broadcast-announcements-v1';
const QUEUE_KEY='wab-tkd-broadcast-announcement-queue-v1';
const emit=()=>window.dispatchEvent(new CustomEvent('wab-broadcast-ops-changed'));
const read=<T,>(key:string,fallback:T):T=>{try{const v=JSON.parse(localStorage.getItem(key)||'');return v ?? fallback}catch{return fallback}};
const write=(key:string,v:unknown)=>{try{localStorage.setItem(key,JSON.stringify(v));emit()}catch{}}

export function getSponsors():BroadcastSponsor[]{return read<BroadcastSponsor[]>(SPONSOR_KEY,[])}
export function saveSponsors(items:BroadcastSponsor[]){write(SPONSOR_KEY,items);return items}
export function upsertSponsor(item:BroadcastSponsor){return saveSponsors([...getSponsors().filter(x=>x.id!==item.id),item].sort((a,b)=>b.priority-a.priority))}
export function deleteSponsor(id:string){return saveSponsors(getSponsors().filter(x=>x.id!==id))}
export function getActiveSponsors(slot:SponsorSlot){return getSponsors().filter(s=>s.active&&s.slots.includes(slot)).sort((a,b)=>b.priority-a.priority)}

export function getAnnouncements():BroadcastAnnouncement[]{return read<BroadcastAnnouncement[]>(ANNOUNCEMENT_KEY,[])}
export function saveAnnouncements(items:BroadcastAnnouncement[]){write(ANNOUNCEMENT_KEY,items);return items}
export function enqueueAnnouncement(item:BroadcastAnnouncement){const all=getAnnouncements();saveAnnouncements([...all.filter(x=>x.id!==item.id),item]);const q=read<string[]>(QUEUE_KEY,[]);if(!q.includes(item.id))write(QUEUE_KEY,[...q,item.id]);return item}
export function removeAnnouncement(id:string){saveAnnouncements(getAnnouncements().filter(x=>x.id!==id));write(QUEUE_KEY,read<string[]>(QUEUE_KEY,[]).filter(x=>x!==id))}
export function dequeueAnnouncement(id:string){write(QUEUE_KEY,read<string[]>(QUEUE_KEY,[]).filter(x=>x!==id))}
export function getAnnouncementQueue():BroadcastAnnouncement[]{const map=new Map(getAnnouncements().map(x=>[x.id,x]));return read<string[]>(QUEUE_KEY,[]).map(id=>map.get(id)).filter(Boolean) as BroadcastAnnouncement[]}
export function nextAnnouncement():BroadcastAnnouncement|null{return getAnnouncementQueue()[0]||null}
export function rotateSponsor(slot:SponsorSlot,index=0):BroadcastSponsor|null{const items=getActiveSponsors(slot);return items.length?items[index%items.length]:null}

export function subscribeBroadcastOps(cb:()=>void){window.addEventListener('wab-broadcast-ops-changed',cb);return()=>window.removeEventListener('wab-broadcast-ops-changed',cb)}

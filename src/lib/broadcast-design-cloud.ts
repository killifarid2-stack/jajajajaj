import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { BroadcastDesign, DesignAnimationId } from './broadcast-design';

export type DesignCloudRecord = { id:string; animation_id:DesignAnimationId; tournament_id:string|null; display_id:string|null; status:'draft'|'published'; version:number; design:BroadcastDesign; updated_at:string; updated_by:string|null };

async function sessionRole(){
  if(!isSupabaseConfigured) return { userId:null, role:null as string|null };
  const {data}=await supabase.auth.getSession();
  const user=data.session?.user; return {userId:user?.id||null,role:String(user?.app_metadata?.role||'').toUpperCase()||null};
}

export async function cloudSaveDesign(design:BroadcastDesign):Promise<void>{
  if(!isSupabaseConfigured) return;
  const {userId}=await sessionRole(); if(!userId) return;
  const row={id:`${design.tournamentId||'global'}:${design.animationId}:${design.displayId||'default'}`,animation_id:design.animationId,tournament_id:design.tournamentId||null,display_id:design.displayId||null,status:design.status==='published'?'published':'draft',version:design.version,design,updated_by:userId,updated_at:new Date().toISOString()};
  const {error}=await (supabase as any).from('broadcast_designs').upsert(row,{onConflict:'id'}); if(error) throw error;
}
export async function cloudLoadDesign(animationId:DesignAnimationId,tournamentId?:string|null,displayId?:string|null):Promise<BroadcastDesign|null>{
  if(!isSupabaseConfigured) return null;
  const id=`${tournamentId||'global'}:${animationId}:${displayId||'default'}`;
  const {data,error}=await (supabase as any).from('broadcast_designs').select('design,status,version').eq('id',id).maybeSingle(); if(error) throw error; return data?.design ? ({...data.design,status:data.status,version:data.version} as BroadcastDesign) : null;
}
export async function cloudListPublished(tournamentId?:string|null){
  if(!isSupabaseConfigured)return [];
  const q=(supabase as any).from('broadcast_designs').select('id,animation_id,tournament_id,display_id,status,version,updated_at,updated_by').eq('status','published');
  const {data,error}=tournamentId?q.eq('tournament_id',tournamentId):q.is('tournament_id',null); if(error)throw error; return (data||[]) as DesignCloudRecord[];
}

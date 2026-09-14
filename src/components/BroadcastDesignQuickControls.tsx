import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Play, Palette, Sparkles } from 'lucide-react';
import { getPublishedDesign, subscribeDesign, type BroadcastDesign, type DesignAnimationId, type BroadcastDesignControl } from '@/lib/broadcast-design';
import type { MatchState } from '@/types/tkd';

const MAP: Record<string, DesignAnimationId> = {
  TEAM_CALL: 'team-call', SINGLE_PLAYER_CALL: 'player-call', PLAYER_CALL: 'player-call', PLAYER_CHANGE: 'player-change',
  KO: 'ko', DOCTOR: 'doctor', KYESHI: 'kyeshi', WOO_SE_GIROK: 'woose-girok', MATCH_RESULT: 'match-result',
  MATCHUP: 'matchup', VIDEO_REPLAY: 'video-replay', IVR: 'video-replay', GOLDEN_POINT: 'golden-point',
  ROUND_CALL: 'round-call', PTG: 'point-gap', STANDINGS: 'standings', HIT_STATS: 'hit-stats', PLAYER_TEST: 'player-test',
  FINISHED: 'winner', WINNER: 'winner', BEST_PLAYER: 'best-player-match', TEAM_MVP: 'team-match-mvp', TOURNAMENT_MVP: 'tournament-mvp', BEST_TEAM: 'best-team', BEST_CLUB: 'best-club', BEST_REFEREE: 'best-referee', FAIR_PLAY: 'fair-play', TOP_SCORER: 'top-scorer', TOP_HITTER: 'top-hitter', PODIUM: 'podium', AWARDS: 'podium',
};

function animationId(state: MatchState): DesignAnimationId {
  return MAP[String(state.animationController?.activeAnimation || '').toUpperCase()] || 'team-call';
}

function send(control: BroadcastDesignControl, id: DesignAnimationId) {
  try {
    const ch = new BroadcastChannel('wab-broadcast-design-trigger-v1');
    ch.postMessage({ type: 'trigger-design', animationId: id, controlId: control.id, action: control.action, durationMs: Math.max(250, ((control.endTime ?? control.startTime + 2) - control.startTime) * 1000) });
    ch.close();
  } catch {}
}

export default function BroadcastDesignQuickControls({ state, compact = false }: { state: MatchState; compact?: boolean }) {
  const id = animationId(state);
  const [design, setDesign] = useState<BroadcastDesign>(() => getPublishedDesign(id));
  useEffect(() => setDesign(getPublishedDesign(id)), [id]);
  useEffect(() => subscribeDesign(next => { if (next.animationId === id && next.status === 'published') setDesign(next); }, id), [id]);
  const controls = useMemo(() => (design.controls || []).filter(c => c.enabled).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)), [design.controls]);
  const open = () => window.open(`/broadcast-design?animationId=${id}&mirror=public`, '_blank', 'noopener,noreferrer');
  return (
    <div className={`rounded-xl border border-cyan-400/20 bg-cyan-400/[.035] ${compact ? 'p-2' : 'p-3'} space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] font-black tracking-[.16em] text-cyan-200"><Sparkles size={11}/> BROADCAST DESIGN CONTROLS</div>
          <div className="text-[7px] text-white/35 mt-0.5 truncate">LIVE · {id.toUpperCase()} · PUBLISHED</div>
        </div>
        <button onClick={open} className="shrink-0 rounded border border-cyan-400/25 px-2 py-1 text-[7px] text-cyan-100 hover:bg-cyan-400/10"><Palette size={10} className="inline mr-1"/>DESIGN</button>
      </div>
      {controls.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[8px] text-white/35">No published visual controls for this animation. Create them in Design Studio.</div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {controls.map(control => <button key={control.id} onClick={() => send(control, id)} style={{borderColor:control.color||undefined}} className="flex items-center gap-1.5 rounded-lg border bg-black/25 px-2 py-2 text-left text-[8px] font-black text-white hover:bg-cyan-400/10"><span className="text-cyan-200">{control.icon || '▶'}</span><span className="truncate">{control.label}</span></button>)}
        </div>
      )}
      <div className="text-[7px] text-white/25"><ExternalLink size={9} className="inline mr-1"/>Controls affect broadcast visuals only; match score, timer and database state are untouched.</div>
    </div>
  );
}

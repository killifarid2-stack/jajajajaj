import medalAsset from '@/assets/medal-transparent.png';
import trophyAsset from '@/assets/trophy-wab-tkd-transparent.png';
import type { DesignLayer, BindingKey } from './broadcast-design';

function sideFromLayer(layer: DesignLayer): 'hong'|'chung' {
  if (/^(blue|chung)/i.test(layer.id)) return 'chung';
  return 'hong';
}
function winnerSide(state: any): 'hong'|'chung'|undefined {
  const w = state?.result?.winner;
  return w === 'hong' || w === 'chung' ? w : undefined;
}
function playerFor(state: any, side: 'hong'|'chung') { return state?.[side]?.player || {}; }
function firstObject(...values: any[]) { return values.find(v => v && typeof v === 'object') || {}; }
function bestPlayer(state: any) {
  const candidates = [
    state?.mvpReveal?.player, state?.poolMvpReveal?.player, state?.matchMvp?.player,
    state?.bestPlayer, state?.bestPlayerMatch, state?.bestPlayerOfMatch,
    state?.result?.bestPlayer, state?.result?.mvp, state?.teamMatchMvp,
  ];
  const direct = firstObject(...candidates);
  if (direct?.name || direct?.photo || direct?.photoUrl) return direct;
  const side = winnerSide(state);
  return side ? playerFor(state, side) : playerFor(state, 'chung');
}
function bestSide(state: any): 'hong'|'chung'|undefined {
  const bp = bestPlayer(state);
  if (state?.mvpReveal?.side === 'hong' || state?.mvpReveal?.side === 'chung') return state.mvpReveal.side;
  if (state?.poolMvpReveal?.side === 'hong' || state?.poolMvpReveal?.side === 'chung') return state.poolMvpReveal.side;
  const name = String(bp?.name || '').toLowerCase();
  if (name && String(state?.hong?.player?.name || '').toLowerCase() === name) return 'hong';
  if (name && String(state?.chung?.player?.name || '').toLowerCase() === name) return 'chung';
  return winnerSide(state);
}
function roundScore(state: any, side: 'hong'|'chung', round?: number) {
  const r = Math.max(1, round || state?.currentRound || 1);
  const item = Array.isArray(state?.roundWinners) ? state.roundWinners.find((x:any) => Number(x?.round) === r) : undefined;
  return item?.score?.[side] ?? state?.roundScores?.[side]?.[r-1] ?? state?.[side]?.roundScores?.[r-1] ?? state?.[side]?.totalScore ?? 0;
}
function roundWins(state: any, side: 'hong'|'chung') {
  if (Array.isArray(state?.roundWinners)) return state.roundWinners.filter((r:any) => r?.winner === side).length;
  return state?.[side]?.roundWins ?? 0;
}
function conditionMatches(expression:string,state:any):boolean {
  const q=String(expression||'').trim().toLowerCase(); if(!q)return true;
  if(q==='always'||q==='true')return true; if(q==='never'||q==='false')return false;
  if(q.includes('winner'))return Boolean(state?.result?.winner||state?.winner);
  if(q.includes('round draw')||q.includes('draw'))return Boolean(state?.roundDraw||state?.isDraw);
  if(q.includes('team'))return String(state?.competitionMode||state?.config?.competitionMode||'').toLowerCase().includes('team');
  if(q.includes('individual'))return !String(state?.competitionMode||state?.config?.competitionMode||'').toLowerCase().includes('team');
  const m=q.match(/(?:status|state)\s*(?:=|is)\s*(.+)$/); if(m)return String(state?.status||state?.matchStatus||'').toLowerCase()===m[1].trim();
  return false;
}
function applyConditionalState(layer:DesignLayer,state:any):DesignLayer {
  let out={...layer}; const rules=Array.isArray(layer.conditionalVisibility)?layer.conditionalVisibility:[]; if(rules.length){const match=rules.find(r=>conditionMatches(r.when,state)); if(match)out.visible=match.visible;}
  const stateName=String(state?.animationState||state?.status||state?.matchStatus||'').toLowerCase(); const variants=layer.stateVariants||{}; const variantKey=Object.keys(variants).find(k=>k.toLowerCase()===stateName); if(variantKey)out={...out,...variants[variantKey]};
  return out;
}

function textValue(binding: BindingKey, state: any, layer: DesignLayer): string {
  const side = sideFromLayer(layer); const p = playerFor(state, side); const w = winnerSide(state); const wp = w ? playerFor(state, w) : {};
  const bp = bestPlayer(state); const bs = bestSide(state); const bpSidePlayer = bs ? playerFor(state, bs) : bp;
  const formatDate = state?.eventDate || state?.date || state?.tournamentDate || '';
  switch (binding) {
    case 'playerName': return p.name || layer.text || 'PLAYER NAME';
    case 'playerNumber': return String(p.number ?? p.playerNumber ?? p.competitorNumber ?? '');
    case 'playerCountry': return String(p.nationality || p.country || state?.teamCountry?.[side] || '');
    case 'playerAge': return String(p.age ?? p.ageGroup ?? state?.ageGroup ?? '');
    case 'playerGender': return String(p.gender || state?.gender || '');
    case 'teamName': return state?.teamNames?.[side] || p.teamName || 'TEAM';
    case 'clubName': return state?.clubNames?.[side] || p.clubName || p.club || 'CLUB';
    case 'country': return state?.teamCountry?.[side] || p.nationality || '';
    case 'matchNumber': return state?.matchNumber != null ? `MATCH #${state.matchNumber}` : 'MATCH #—';
    case 'score': return String(state?.[side]?.totalScore ?? 0);
    case 'round': return `ROUND ${state?.currentRound || 1}`;
    case 'weight': return state?.weightCategory || '';
    case 'tournament': return state?.competitionName || 'WAB-TKD';
    case 'winner': case 'winnerName': return wp?.name || state?.winnerName || 'WINNER';
    case 'winnerTeam': return (w && state?.teamNames?.[w]) || wp?.teamName || 'WINNER TEAM';
    case 'winnerClub': return (w && state?.clubNames?.[w]) || wp?.clubName || wp?.club || 'WINNER CLUB';
    case 'bestPlayer': return bp?.name || 'BEST PLAYER';
    case 'bestPlayerTeam': return (bs && state?.teamNames?.[bs]) || bpSidePlayer?.teamName || 'TEAM';
    case 'bestPlayerClub': return (bs && state?.clubNames?.[bs]) || bpSidePlayer?.clubName || bpSidePlayer?.club || 'CLUB';
    case 'roundScoreRed': return String(roundScore(state, 'hong'));
    case 'roundScoreBlue': return String(roundScore(state, 'chung'));
    case 'roundWinsRed': return String(roundWins(state, 'hong'));
    case 'roundWinsBlue': return String(roundWins(state, 'chung'));
    case 'warningsRed': return String(state?.hong?.warnings ?? state?.hong?.warningCount ?? state?.warnings?.hong ?? 0);
    case 'warningsBlue': return String(state?.chung?.warnings ?? state?.chung?.warningCount ?? state?.warnings?.chung ?? 0);
    case 'penaltiesRed': return String(state?.hong?.penalties ?? state?.hong?.penaltyCount ?? state?.penalties?.hong ?? 0);
    case 'penaltiesBlue': return String(state?.chung?.penalties ?? state?.chung?.penaltyCount ?? state?.penalties?.chung ?? 0);
    case 'totalScoreRed': return String(state?.hong?.totalScore ?? 0);
    case 'totalScoreBlue': return String(state?.chung?.totalScore ?? 0);
    case 'date': return String(formatDate || '');
    case 'place': return String(state?.eventLocation || state?.place || state?.venue || '');
    case 'age': return String(state?.ageGroup || state?.age || '');
    case 'gender': return String(state?.gender || '');
    case 'mat': return state?.matNumber != null ? `MAT ${state.matNumber}` : '';
    case 'matchType': return String(state?.config?.competitionMode || state?.competitionMode || state?.matchType || '');
    case 'timer': return String(state?.timeRemaining ?? state?.timer ?? '00:00');
    case 'matchStatus': return String(state?.status || state?.matchStatus || '').toUpperCase();
    case 'refereeName': return String(state?.mainReferee?.name || state?.headReferee?.name || state?.referee?.name || state?.officials?.mainReferee || '');
    case 'medal': return 'MEDAL';
    case 'trophy': return 'TROPHY';
    case 'bestTeam': return String(state?.bestTeam?.name || state?.bestTeamName || state?.teamNames?.[winnerSide(state) || 'chung'] || 'BEST TEAM');
    case 'bestClub': return String(state?.bestClub?.name || state?.bestClubName || state?.clubNames?.[winnerSide(state) || 'chung'] || 'BEST CLUB');
    case 'bestReferee': return String(state?.bestReferee?.name || state?.bestRefereeName || state?.officials?.bestReferee || 'BEST REFEREE');
    case 'fairPlay': return String(state?.fairPlay?.label || state?.fairPlay || 'FAIR PLAY');
    case 'topScorer': return String(state?.topScorer?.name || state?.topScorerName || 'TOP SCORER');
    case 'topHitter': return String(state?.topHitter?.name || state?.topHitterName || 'TOP HITTER');
    case 'medalImage': return String(state?.awardAssets?.medal || state?.medalImage || state?.medal?.image || medalAsset);
    case 'trophyImage': return String(state?.awardAssets?.trophy || state?.trophyImage || state?.trophy?.image || trophyAsset);
    default: return layer.text || '';
  }
}
function imageValue(binding: BindingKey, state: any, layer: DesignLayer): string {
  const side = sideFromLayer(layer); const p = playerFor(state, side); const w = winnerSide(state); const wp = w ? playerFor(state, w) : {};
  const bp = bestPlayer(state); const bs = bestSide(state); const bpPlayer = bs ? playerFor(state, bs) : bp;
  switch (binding) {
    case 'playerPhoto': return p.photoUrl || p.photo || '';
    case 'teamLogo': return state?.teamLogos?.[side] || p.teamLogo || '';
    case 'clubLogo': return state?.clubLogos?.[side] || p.clubLogo || '';
    case 'flag': return p.nationality || state?.teamCountry?.[side] || '';
    case 'winnerPhoto': return wp.photoUrl || wp.photo || '';
    case 'winnerFlag': return wp.nationality || (w && state?.teamCountry?.[w]) || '';
    case 'bestPlayerPhoto': return bpPlayer.photoUrl || bpPlayer.photo || '';
    case 'bestPlayerFlag': return bpPlayer.nationality || (bs && state?.teamCountry?.[bs]) || '';
    case 'medalImage': return String(state?.awardAssets?.medal || state?.medalImage || state?.medal?.image || medalAsset);
    case 'trophyImage': return String(state?.awardAssets?.trophy || state?.trophyImage || state?.trophy?.image || trophyAsset);
    default: return layer.imageSrc || '';
  }
}
export function resolveDesignBinding(layer: DesignLayer, state: any): DesignLayer {
  if (!state) return layer;
  const conditional=applyConditionalState(layer,state);
  if (!layer.binding || layer.binding === 'static') return conditional;
  if (layer.type === 'text' || layer.type === 'data') return { ...conditional, text: textValue(layer.binding, state, layer) };
  if (layer.type === 'image') return { ...conditional, imageSrc: imageValue(layer.binding, state, layer) };
  return conditional;
}
export function bindingLabel(binding: BindingKey): string {
  return binding.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

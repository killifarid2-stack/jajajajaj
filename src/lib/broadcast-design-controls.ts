import type { BroadcastDesignControl } from './broadcast-design';

/** Small, deterministic condition evaluator for visual controls. It never mutates match state. */
export function evaluateDesignControlCondition(condition: string | undefined, state: any): boolean {
  if (!condition?.trim()) return true;
  const q = condition.trim().toLowerCase();
  const normalized = q.replace(/\s+/g, ' ');
  const winner = String(state?.result?.winner || state?.winner || '').toLowerCase();
  const status = String(state?.status || state?.matchStatus || '').toLowerCase();
  const mode = String(state?.config?.competitionMode || state?.competitionMode || state?.matchType || '').toLowerCase();
  const round = Number(state?.currentRound || 1);
  if (normalized === 'has mvp' || normalized === 'mvp') return !!(state?.mvpReveal?.best || state?.mvpReveal?.player || state?.matchMvp || state?.bestPlayer);
  const tests = normalized.split(/\s*(?:&&| and | و )\s*/i).filter(Boolean);
  return tests.every(test => {
    let m = test.match(/^(?:winner|الفائز)\s*(?:=|is|هو)\s*(red|blue|hong|chung|أحمر|أزرق)$/i);
    if (m) return ['red','hong','أحمر'].includes(m[1].toLowerCase()) ? ['hong','red','أحمر'].includes(winner) : ['chung','blue','أزرق'].includes(winner);
    m = test.match(/^(?:status|حالة)\s*(?:=|is|هو)\s*(.+)$/i); if (m) return status === m[1].trim().toLowerCase();
    m = test.match(/^(?:mode|competition|نوع المباراة)\s*(?:=|is|هو)\s*(.+)$/i); if (m) return mode.includes(m[1].trim().toLowerCase());
    m = test.match(/^(?:round|الجولة)\s*(>=|<=|=|>|<)\s*(\d+)$/i); if (m) { const n=Number(m[2]); return m[1]==='>='?round>=n:m[1]==='<='?round<=n:m[1]==='>'?round>n:m[1]==='<'?round<n:round===n; }
    return false;
  });
}

export function controlIsActive(control: BroadcastDesignControl, runtimeTime: number, duration: number, state: any): boolean {
  if (!control.enabled || !evaluateDesignControlCondition(control.condition, state)) return false;
  const start = Math.max(0, control.startTime);
  const end = Math.min(duration, control.endTime ?? duration);
  if (control.action === 'hide') return false;
  if (control.action === 'set-time') return Math.abs(runtimeTime - start) < 0.12;
  return runtimeTime >= start && runtimeTime <= end;
}

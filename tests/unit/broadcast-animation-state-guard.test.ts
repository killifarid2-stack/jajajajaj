import { describe, expect, it } from 'vitest';
import { createInitialMatchState } from '@/lib/match-engine';
import { matchReducer } from '@/context/MatchContext';

describe('broadcast animation instance protection', () => {
  it('ignores a stale team-call completion after a newer instance starts', () => {
    let state = createInitialMatchState();
    state = matchReducer(state, { type: 'CALL_TEAM', side: 'chung' });
    const firstId = state.animationController?.animationId;
    expect(firstId).toBeTruthy();
    state = matchReducer(state, { type: 'CANCEL_TEAM_CALL' });
    state = matchReducer(state, { type: 'CALL_TEAM', side: 'chung' });
    const secondId = state.animationController?.animationId;
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);

    const stale = matchReducer(state, { type: 'COMPLETE_TEAM_CALL', side: 'chung', animationId: firstId });
    expect(stale.animationController?.animationId).toBe(secondId);
    expect(stale.callAnimation?.phase).toBe('team');
    expect(stale.teamCallStatus?.chung).toBe('calling');
  });

  it('ignores a stale delayed matchup callback after the active instance changes', () => {
    let state = createInitialMatchState();
    state = {
      ...state,
      autoCallSequence: { active: true, stage: 'MATCHUP_DELAY', mode: 'full', startedAt: Date.now() },
      animationController: { state: 'PLAYER_CALLED', activeAnimation: 'SINGLE_PLAYER_CALL', animationId: 'new-instance' },
    };
    const next = matchReducer(state, { type: 'AUTO_SHOW_MATCHUP_AFTER_DELAY', animationId: 'old-instance' });
    expect(next.matchupAnimation).toBeUndefined();
    expect(next.animationController?.animationId).toBe('new-instance');
  });
});

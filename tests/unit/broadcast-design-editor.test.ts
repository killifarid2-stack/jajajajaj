import { describe, expect, it, beforeEach } from 'vitest';
import { createDesign, evaluateLayerAtTime, getPublishedDesign, saveDesign, upsertKeyframe } from '@/lib/broadcast-design';
import { resolveDesignBinding } from '@/lib/broadcast-design-bindings';

describe('Broadcast Design Studio temporal editing', () => {
  beforeEach(() => localStorage.clear());

  it('does not leak a later keyframe edit into the start frame', () => {
    const design = createDesign('team-call');
    const layer = design.layers[0];
    const edited = upsertKeyframe(layer, 3, { x: 1200, y: 500 });
    expect(evaluateLayerAtTime(edited, 0).x).toBe(layer.x);
    expect(evaluateLayerAtTime(edited, 3).x).toBe(1200);
  });

  it('publishes independently from the draft store', () => {
    const design = createDesign('woose-girok');
    const draft = saveDesign({ ...design, name: 'DRAFT EDIT' }, 'Save Draft');
    expect(draft.status).toBe('draft');
    expect(getPublishedDesign('woose-girok').status).toBe('original');
  });

  it('resolves real local medal and trophy assets without external URLs', () => {
    const design = createDesign('podium');
    const medal = resolveDesignBinding({ ...design.layers[0], type: 'image', binding: 'medalImage' }, {} as any);
    const trophy = resolveDesignBinding({ ...design.layers[0], type: 'image', binding: 'trophyImage' }, {} as any);
    expect(medal.imageSrc).toMatch(/^\/src|^data:|^blob:/);
    expect(trophy.imageSrc).toMatch(/^\/src|^data:|^blob:/);
  });

  it('supports motion-path flags as temporal properties', () => {
    const design = createDesign('player-call');
    const layer = design.layers[0];
    const edited = upsertKeyframe(layer, 2, { motionPathLoop: true, motionPathReverse: true, motionPathRotate: true });
    expect(evaluateLayerAtTime(edited, 2).motionPathLoop).toBe(true);
    expect(evaluateLayerAtTime(edited, 2).motionPathReverse).toBe(true);
    expect(evaluateLayerAtTime(edited, 2).motionPathRotate).toBe(true);
  });
});

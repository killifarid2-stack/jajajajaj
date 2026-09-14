import { describe, expect, it, beforeEach } from 'vitest';
import {
  createDesign,
  evaluateLayerAtTime,
  evaluateDesignLayersAtTime,
  upsertKeyframe,
  serializeDesignFile,
  parseDesignFile,
  publishDesign,
  getPublishedDesign,
} from './broadcast-design';

function layerAt(design: ReturnType<typeof createDesign>, id: string) {
  const layer = design.layers.find(l => l.id === id);
  if (!layer) throw new Error(`missing ${id}`);
  return layer;
}

describe('Broadcast Design Studio editor invariants', () => {
  beforeEach(() => localStorage.clear());

  it('keeps time-local edits isolated from the base pose', () => {
    let design = createDesign('team-call');
    const layer = layerAt(design, 'title');
    design = { ...design, layers: design.layers.map(l => l.id === layer.id ? upsertKeyframe(l, 3, { x: 1400 }) : l) };
    expect(evaluateLayerAtTime(layerAt(design, 'title'), 0).x).toBe(720);
    expect(evaluateLayerAtTime(layerAt(design, 'title'), 3).x).toBe(1400);
  });

  it('evaluates attached layers from the same design model', () => {
    let design = createDesign('team-call');
    const parent = layerAt(design, 'red-team-group');
    const child = layerAt(design, 'red-name');
    design = {
      ...design,
      layers: design.layers.map(l => l.id === child.id
        ? { ...l, attachToId: parent.id, followParentTransform: true }
        : l.id === parent.id
          ? upsertKeyframe(l, 2, { x: parent.x + 100 })
          : l),
    };
    const at2 = evaluateDesignLayersAtTime(design, 2);
    const childAt2 = at2.find(l => l.id === child.id)!;
    expect(childAt2.x).toBe(child.x + 100);
  });

  it('round-trips a .design file without publishing it', () => {
    const design = createDesign('woose-girok');
    const imported = parseDesignFile(serializeDesignFile(design), 'woose-girok');
    expect(imported.animationId).toBe('woose-girok');
    expect(imported.status).toBe('draft');
    expect(imported.layers.length).toBe(design.layers.length);
    expect(localStorage.getItem('wab-tkd-broadcast-designs-published-v1')).toBeNull();
  });

  it('publishes only the selected animation', () => {
    const team = createDesign('team-call');
    const published = publishDesign(team);
    expect(published.status).toBe('published');
    expect(getPublishedDesign('team-call').status).toBe('published');
    expect(getPublishedDesign('player-call').status).toBe('original');
  });
});

import { describe, expect, it, beforeEach } from 'vitest';
import { createDesign, getDesignTemplates, saveDesignTemplate, applyDesignTemplate } from '@/lib/broadcast-design';

describe('WAB-TKD final Design Studio additions', () => {
  beforeEach(() => localStorage.clear());

  it('stores reusable templates without changing the source design identity', () => {
    const design = createDesign('winner');
    const template = saveDesignTemplate(design, { name: 'Winner Gold', scope: 'global' });
    expect(getDesignTemplates()).toHaveLength(1);
    expect(template.animationId).toBe('winner');
    const applied = applyDesignTemplate(design, template);
    expect(applied.animationId).toBe('winner');
    expect(applied.status).toBe('draft');
  });
});

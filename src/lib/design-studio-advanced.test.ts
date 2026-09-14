import { describe, expect, it } from 'vitest';
import { createDesign } from './broadcast-design';
import { auditAnimation, duplicateLayerTree, parseLocalDesignCommand, applyDesignAIResult, copyStyle, pasteKeyframes } from './design-studio-advanced';

describe('Design Studio production suite',()=>{
 it('audits required animation bindings',()=>{ const d=createDesign('winner'); const a=auditAnimation(d); expect(a.animationId).toBe('winner'); expect(a.layerCount).toBeGreaterThan(0); });
 it('duplicates a complete layer tree and keyframes',()=>{ let d=createDesign('team-call'); const root=d.layers.find(l=>l.id==='red-team-group')!; const child=d.layers.find(l=>l.id==='red-name')!; d={...d,layers:d.layers.map(l=>l.id===child.id?{...l,keyframes:[{id:'k',time:1,props:{x:200}}]}:l)}; const n=duplicateLayerTree(d,root.id); expect(n.layers.length).toBeGreaterThan(d.layers.length); expect(n.layers.some(l=>l.name.includes('Red Big Frame COPY'))).toBe(true); });
 it('parses safe natural-language design commands',()=>{ const d=createDesign('winner'); const r=parseLocalDesignCommand('make the winner bigger 30% and gold from 2 to 5 seconds',d); expect(r.actions.length).toBeGreaterThan(0); });
 it('applies design AI without touching runtime state',()=>{ const d=createDesign('winner'); const result=parseLocalDesignCommand('make the winner bigger 30%',d); const n=applyDesignAIResult(d,result); expect(n.animationId).toBe(d.animationId); expect((n as any).timer).toBeUndefined(); expect((n as any).score).toBeUndefined(); });
 it('copies style and pastes keyframes safely',()=>{ const d=createDesign('team-call'); const a=d.layers[1], b=d.layers[2]; const styled=copyStyle(a,b); expect(styled.effect).toBe(a.effect); const pasted=pasteKeyframes({...a,keyframes:[{id:'a',time:1,props:{x:100}}]},[{id:'a',time:1,props:{x:100}}],3,8); expect(pasted.keyframes.length).toBe(2); });
});

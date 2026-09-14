import { describe, expect, it } from 'vitest';
import { applyConditionalRules, evaluateCondition, enqueueAnimation, dequeueAnimation, transitionState, createAdvancedDesignState, buildDesignPackage, exportDesignPackage, importDesignPackage } from './broadcast-design-advanced';
import { createDesign } from './broadcast-design';

describe('WAB-TKD advanced visual design systems',()=>{
 it('evaluates safe conditional rules',()=>{expect(evaluateCondition('match.round >= 2',{match:{round:2}})).toBe(true);expect(evaluateCondition('winner == "RED"',{winner:'RED'})).toBe(true);});
 it('changes only visual layer state',()=>{const d=createDesign('winner');const l=d.layers[0];const out=applyConditionalRules([l],[{id:'r',when:'match.status == "WINNER"',action:'show',targetLayerIds:[l.id],enabled:true}],{match:{status:'WINNER'}});expect(out[0].visible).toBe(true);});
 it('queues and dequeues animation events',()=>{const q=enqueueAnimation([],{animationId:'winner',delay:100,auto:true});const x=dequeueAnimation(q);expect(x.item?.animationId).toBe('winner');expect(x.queue).toHaveLength(0);});
 it('enforces animation state transitions',()=>{const m=createAdvancedDesignState().stateMachine;expect(transitionState(m,'ENTER',0).state).toBe('ENTER');});
 it('round trips a design package',()=>{const d=createDesign('winner');const p=buildDesignPackage(d);expect(importDesignPackage(exportDesignPackage(p),'winner').animationId).toBe('winner');});
});

import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const design=read('src/lib/broadcast-design.ts');
const studio=read('src/pages/BroadcastDesignStudioPage.tsx');
const runtime=read('src/components/BroadcastDesignRuntime.tsx');
const guard=read('src/lib/broadcast-animation-guard.ts');
const ids=['team-call','player-call','player-change','winner','ko','doctor','kyeshi','woose-girok','match-result'];
const checks=[
 ['all-core-animation-ids',ids.every(id=>design.includes(`'${id}'`))],
 ['time-local-keyframes',design.includes('evaluateLayerAtTime')&&design.includes('upsertKeyframe')&&studio.includes('time > 0')],
 ['motion-path-bezier',design.includes('cp1x')&&design.includes('cp2x')&&design.includes('motionPathRotate')],
 ['graph-editor',studio.includes('MOTION PATH / GRAPH')&&studio.includes('graphFrames')],
 ['canvas-transform-controls',studio.includes('startResize')&&studio.includes('startRotate')&&studio.includes('onCanvasPointerMove')],
 ['group-parent-child',studio.includes('groupSelected')&&studio.includes('ungroup')&&studio.includes('attachSelectedTo')],
 ['design-file-import-export',studio.includes('serializeDesignFile')&&studio.includes('parseDesignFile')],
 ['draft-publish-isolation',design.includes('PUBLISHED_STORAGE_KEY')&&design.includes("status: 'draft'")&&design.includes("status: 'published'")],
 ['runtime-shared-evaluator',runtime.includes('evaluateDesignLayersAtTime')],
 ['runtime-cleanup',runtime.includes('restoreTouched')&&runtime.includes('cancelAnimationFrame')&&runtime.includes('clearTimeout')],
 ['state-guard-contract',guard.includes('active')&&guard.includes('timers')&&guard.includes('stop')],
 ['safe-area',studio.includes('SAFE AREA')&&studio.includes('1920×1080')],
 ['font-import',studio.includes('.ttf,.otf,.woff,.woff2')],
 ['effect-engine',runtime.includes('effectStyles')&&/particles|smoke|bloom|motion-blur/.test(runtime)],
 ['dom-capture-full-tree',runtime.includes('data-wab-layer-id')&&runtime.includes('insideDeclaredRoot')&&runtime.includes('return insideDeclaredRoot ? (visual || hasLayerMarker) : (visual && x.likely);')],
 ['studio-capture-merge',studio.includes('Capture refreshes the real source geometry/style')&&studio.includes('const capturedSet = new Set')],
 ['dynamic-binding-model',design.includes('playerName')&&design.includes('playerPhoto')&&design.includes('teamLogo')&&design.includes('clubLogo')&&design.includes('flag')&&design.includes('score')],
 ['no-demo-animation-replacement',!(/DEMO ATHLETE|MOCK ATHLETE|FIRST SCORE WINS/i.test(design))],
 ['live-draft-overlay',runtime.includes('wab-broadcast-design-live-edit-v1')&&read('src/components/BroadcastDesignOverlay.tsx').includes('liveDraft')],
 ['iframe-player-call-editor',read('src/components/BroadcastDesignStudioPreview.tsx').includes('contentDocument')&&read('src/components/BroadcastDesignStudioPreview.tsx').includes('iframe:')],
 ['all-stage-scan',studio.includes('SCAN ALL STAGES')&&studio.includes('PREVIEW_STAGES')],
 ['mvp-bindings',read('src/lib/broadcast-design-bindings.ts').includes('bestPlayerPhoto')&&read('src/lib/broadcast-design-bindings.ts').includes('bestPlayerTeam')],
 ['timed-controls-runtime',read('src/components/BroadcastDesignOverlay.tsx').includes('wab-broadcast-design-trigger-v1')&&studio.includes('TIMED CONTROLS')],
];
const failed=checks.filter(([,ok])=>!ok);
const report={generatedAt:new Date().toISOString(),status:failed.length?'FAIL':'PASS',checks:Object.fromEntries(checks)};
fs.mkdirSync(path.join(root,'docs/production'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/production/DESIGN_STUDIO_FINAL_AUDIT.json'),JSON.stringify(report,null,2));
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
process.exit(failed.length?1:0);

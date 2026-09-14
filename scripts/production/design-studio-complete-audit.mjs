import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const design=read('src/lib/broadcast-design.ts'), studio=read('src/pages/BroadcastDesignStudioPage.tsx'), preview=read('src/components/BroadcastDesignStudioPreview.tsx'), award=read('src/components/AwardAnimationRenderer.tsx'), runtime=read('src/components/BroadcastDesignRuntime.tsx'), bind=read('src/lib/broadcast-design-bindings.ts'), ai=read('src/lib/design-studio-advanced.ts'), migration=read('supabase/migrations/20260914160000_broadcast_designs_production_rls.sql');
const animations=['team-call','player-call','player-change','winner','ko','doctor','kyeshi','woose-girok','match-result','matchup','video-replay','golden-point','round-call','point-gap','standings','hit-stats','player-test','best-player-match','team-match-mvp','tournament-mvp','best-team','best-club','best-referee','fair-play','top-scorer','top-hitter','podium'];
const checks=[
 ['all-animation-catalog',animations.every(id=>design.includes(`'${id}'`))],
 ['native-preview',preview.includes('NativeEditablePreview')&&preview.includes('captureNativeLayers')],
 ['award-shared-renderer',preview.includes('BroadcastDesignStudioAwardPreview')&&award.includes('data-wab-award-renderer')],
 ['dynamic-medal-trophy',bind.includes('medalImage')&&bind.includes('trophyImage')&&award.includes('medalAsset')],
 ['advanced-keyframes',design.includes('AnimatableLayerProperty')&&design.includes('evaluateLayerAtTime')&&ai.includes('pasteKeyframes')],
 ['bezier-motion',design.includes('cp1x')&&design.includes('cp2x')&&design.includes('motionPathRotate')],
 ['conditional-states',design.includes('conditionalVisibility')&&bind.includes('conditionMatches')],
 ['layer-management',studio.includes('groupSelected')&&studio.includes('duplicateSelected')&&studio.includes('updateLayer(layer.id, { visible')],
 ['rulers-guides-safe-area',studio.includes('RULERS')&&studio.includes('SAFE AREA')&&studio.includes('1920×1080')],
 ['templates-version-history',design.includes('getDesignTemplates')&&design.includes('getPublishedHistory')&&design.includes('recordProjectSnapshot')],
 ['safe-publish',design.includes('PUBLISHED_STORAGE_KEY')&&design.includes("status: 'draft'")&&runtime.includes('getPublishedDesign')],
 ['external-ai-server-side',read('src/lib/design-ai.ts').includes("functions.invoke('design-ai'")&&read('supabase/functions/design-ai/index.ts').includes('OPENAI_API_KEY')&&!read('src/lib/design-ai.ts').includes('OPENAI_API_KEY')],
 ['ai-advanced-actions',ai.includes('parseLocalDesignCommand')&&ai.includes('applyDesignAIResult')],
 ['tournament-design-scope',design.includes('tournamentId')&&read('src/lib/broadcast-design-cloud.ts').includes('tournament_id')],
 ['supabase-design-rls',migration.includes('enable row level security')&&migration.includes('OPERATOR')&&migration.includes('updated_by=auth.uid()')],
 ['multi-display-sync',read('electron/main.cjs').includes('publicWins')&&read('electron/main.cjs').includes('broadcast-design-sync')],
 ['quick-control-customization',design.includes('sortOrder')&&design.includes('icon?: string')&&read('src/components/BroadcastDesignQuickControls.tsx').includes('control.icon')],
 ['asset-library',studio.includes('assetFilter')&&studio.includes('filteredAssets')],
];
const failed=checks.filter(([,ok])=>!ok); const report={generatedAt:new Date().toISOString(),status:failed.length?'FAIL':'PASS',checks:Object.fromEntries(checks)};
fs.mkdirSync(path.join(root,'docs/production'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/production/DESIGN_STUDIO_COMPLETE_AUDIT.json'),JSON.stringify(report,null,2));
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`); process.exit(failed.length?1:0);

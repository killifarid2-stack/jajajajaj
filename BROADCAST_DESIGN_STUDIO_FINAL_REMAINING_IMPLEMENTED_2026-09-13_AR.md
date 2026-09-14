# WAB-TKD — Final Remaining Implementation — 2026-09-13

تم تنفيذ العناصر المتبقية المطلوبة بدون تشغيل اختبارات الإنتاج بناءً على طلب المستخدم.

## Localization
- دعم اللغة العالمية الآن: AR / EN / FR.
- حفظ اللغة واستعادتها من Local Storage.
- مزامنة اللغة بين نوافذ Electron/Chromium عبر BroadcastChannel وstorage.
- RTL حقيقي للعربية وLTR للإنجليزية والفرنسية.
- إضافة حزمة ترجمة فرنسية أساسية تغطي حالات التشغيل والتحكم والبث والتصنيف والحفظ والجوائز والنتائج.
- Top Navigation وHome يدعمان AR / EN / FR مباشرة.
- Public Scoreboard أضيفت له حالات فرنسية للـrest/result/decision/round labels.
- إعلان Next Match الصوتي يدعم الفرنسية.

## Animation lifecycle
- إضافة `instanceId` إلى BroadcastAnimationController لتمييز كل دورة تشغيل مستقلة.
- الحفاظ على `animationId` و`commandId` لمنع stale/duplicate commands.
- لا يتم إنشاء نسخة Animation جديدة عند تعديل Animation موجود.

## Draft / Publish
- إضافة `draftVersion` مستقل لكل Animation.
- كل SAVE DRAFT يزيد رقم المسودة بدون تغيير النسخة المنشورة.
- Publish يحفظ النسخة المنشورة بشكل مستقل ويحتفظ برقم المسودة.
- Studio يعرض Draft N / Published N.

## Mask / Rendering
- تفعيل mask feather فعليًا في الـRuntime بشكل compositor-friendly.
- إضافة `will-change` للعناصر الثقيلة المتحركة والمؤثرات لتحسين السلاسة.
- الحفاظ على renderer الموجود وعدم استبداله.

## Existing features preserved
- Layer Tree / Parent-Child / Group / Ungroup.
- Canvas transforms / keyframes / motion path / transitions.
- Dynamic bindings.
- Asset and Font import.
- Draft/Publish per animation.
- Public Display uses published design only.
- Existing match and animation logic preserved.

## Intentionally not executed
لم يتم تشغيل `npm test`, `npm run build`, `lint`, E2E أو Electron production run في هذه الدفعة، حسب طلب المستخدم تنفيذ التعديلات دون الاختبار.

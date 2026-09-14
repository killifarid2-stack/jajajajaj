# WAB-TKD — Broadcast Design Studio Native Editor — 2026-09-14

## ما تم استكماله في هذه المرحلة

تم تحويل وضع ANIMATION في Design Studio من مجرد عرض Native غير مرتبط بالمسودة إلى معاينة Native قابلة للتحرير:

1. يتم تركيب نفس `PublicScoreboard`/مكونات البث داخل Studio، وليس Canvas أسود أو صورة ثابتة.
2. كل عنصر معلّم بـ `data-wab-layer-id` داخل الأنيميشن الحقيقي يتم اكتشافه تلقائياً من Preview نفسه.
3. يتم إرسال Snapshot من Preview إلى Layer Tree بدون الحاجة إلى فتح Operator في نافذة أخرى أولاً.
4. عند اختيار عنصر من شاشة المعاينة، يتم تحديد نفس الـLayer في Layer Tree ويمكن تعديل خصائصه من Inspector.
5. التعديلات على x/y/width/height/rotation/scale/opacity/text/image/effects/keyframes تظهر على المعاينة Native نفسها.
6. تمت إضافة دعم `videoSrc` للـDesign Layer، مع إمكانية استبدال فيديو حقيقي لطبقة video من Studio.
7. تم دعم تطبيق `videoSrc` في Runtime المنشور.
8. تم إضافة ربط Binding فعلي في Runtime لاسم اللاعب، الفريق، النادي، رقم المباراة، النتيجة، الجولة، الوزن، البطولة، الفائز، صورة اللاعب، شعار الفريق، شعار النادي والعلم حسب جهة الطبقة.
9. تم توسيع Award Preview ليعرض عناصر داخلية قابلة للاختيار (عنوان الجائزة، اسم الفائز، بطاقات الإحصائيات وقيمها) وليس فقط خمسة عناصر عامة.
10. يتم الحفاظ على keyframes/bindings/effects الموجودة عند إعادة التقاط الطبقات.
11. Public Display الحقيقي لا يستقبل Draft؛ النشر فقط هو الذي يجعل التصميم المنشور فعالاً في Runtime.

## الأنيميشنات الموجودة في Design Studio

TEAM CALL, PLAYER CALL, PLAYER CHANGE, WINNER, KO, DOCTOR, KYESHI, WOO-SE-GIROK, MATCH RESULT, MATCHUP / VS, VIDEO REPLAY / IVR, GOLDEN POINT, NEXT ROUND CALL, POINT GAP / PTG, STANDINGS / RANKING, HIT STATISTICS, PLAYER / EQUIPMENT TEST, BEST PLAYER · MATCH, BEST PLAYER · PAR ÉQUIPE, TOURNAMENT MVP, BEST TEAM, BEST CLUB, BEST REFEREE, FAIR PLAY, TOP SCORER, TOP HITTER, PODIUM / CHAMPION.

## ملاحظة QA

تم اختبار سلامة أرشيف ZIP (`unzip -t`) ونجح بدون أخطاء.

لم يتم تشغيل `vite build` في بيئة التنفيذ لأن المشروع المرسل لا يحتوي على `node_modules`/lockfile، ومحاولة تثبيت الحزم انتهت بمهلة. لذلك لا يتم الادعاء بأن Build كامل تم تنفيذه هنا.

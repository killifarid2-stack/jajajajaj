# WAB-TKD Broadcast Design Studio — Continued 2026-09-12

تمت متابعة نفس المشروع الأصلي، بدون إنشاء مشروع منفصل.

## ما تم تنفيذه في هذه المرحلة

- فصل تصميم كل Animation عن الأخرى عبر `animationId` وملف التصميم المحفوظ لكل Animation.
- Draft لا يتم بثه إلى شاشة الجمهور أثناء كل تعديل؛ `SAVE DRAFT` هو نقطة المزامنة إلى Public Display، و`PUBLISH` ينشئ نسخة منشورة مستقلة.
- حماية شاشة الجمهور من Stale/Old Animation: لا تقبل شاشة العرض تصميم Animation مختلفًا عن الـAnimation النشطة.
- إصلاح انتقال `TEAM_CALL -> PLAYER_CALL` داخل `MatchContext`: يتم تحديث `animationController.activeAnimation` إلى `SINGLE_PLAYER_CALL` عند الانتقال، لمنع رجوع Team Call القديم عند ضغط أزرار لاحقة.
- إضافة Professional Design Settings داخل Design Studio، وليس Settings Page منفصل.
- إضافة تحكم Canvas/Background/Zoom/Grid/Guides/Snap/Select All/Deselect/Group/Ungroup/Duplicate/Delete/Save/Publish/Restore.
- إضافة لغة التصميم `EN / AR / FR` مع RTL كخيار مستقل للتصميم.
- إضافة اختصارات أقرب لسلوك Photoshop: Undo/Redo/Save/Duplicate/Copy/Paste/Select All/Deselect/Group/Ungroup/Layer order/Delete/Play/Home/End/Frame stepping/Nudge/Keyframe/Freeze/Rename/Add Text/Frame/Image/Effect.
- إضافة Copy/Paste داخلي للـLayers.
- دعم تحريك الطبقات بأسهم لوحة المفاتيح: 1px، و10px مع Shift.
- إضافة اختيار Target صريح لـ`SWAP TARGET` مع الحفاظ على `NEXT FRAME`.
- إظهار جميع Tracks في Timeline بدل الاقتصار على عدد محدود من الطبقات.
- إضافة Layer bridge لعناصر Player Call الرئيسية، وDoctor، وKyeshi حتى يمكن للمحرك ربطها بالـDOM الحقيقي.
- إضافة طبقات تصميم مخصصة لـPlayer Call / Doctor / Kyeshi.
- الحفاظ على Keyframes والتعديل الزمني: التعديل عند لحظة زمنية لا يغيّر الـBase قبلها.
- الحفاظ على Freeze/Resume وUndo/Redo وDynamic Data وPresets وAssets.
- رفع مساحة Player Call تحت Championship Header إلى `top: 230px` لمنع شريط معلومات البطولة من تغطية منطقة اللاعبين/الشعارات.
- إزالة صندوق `ROUND SCORE` المركزي من شاشة Individual Match Result واستبداله بعرض واضح منفصل لـBlue Rounds Won وRed Rounds Won.
- تكبير إبراز R3 وTOTAL في Results Wall.
- تحديث Schema إلى v5 وإضافة حقول العلاقات والـeditor preferences.

## قاعدة المزامنة

`Design Studio -> Draft -> SAVE/PUBLISH -> نفس Design Model -> نفس Renderer -> Audience Preview/Public Display`

ولا يُسمح لتصميم Animation أخرى بأن يحل محل التصميم النشط بسبب اشتراك عام في أحداث المزامنة.

## التحقق

تم تشغيل:

`tsc --noEmit --pretty false`

والنتيجة بدون أخطاء TypeScript في نسخة المشروع الحالية.

لم يتم تشغيل Vitest الكامل لأن بيئة النسخة لا تحتوي `node_modules`، ومحاولة تثبيت الحزم انتهت بمهلة البيئة.

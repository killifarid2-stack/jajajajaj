# WAB-TKD Broadcast Design Studio — All Animations / جميع الأنيميشنات

## ما تم تنفيذه / Implemented
- زر **DESIGN STUDIO / استوديو التصميم** يظهر في واجهة Operator/Audience العادية، وليس داخل نافذة Public Display الحقيقية.
- الزر يفتح الاستوديو للـAnimation الحالي: Team Call, Player Call, Player Change, Winner, KO, Doctor, Kyeshi, WOO-SE-GIROK, Match Result.
- زر **FREEZE / تجميد** يبقى داخل Design Studio فقط؛ شاشة الجمهور لا تحصل على أدوات التحرير.
- زر **CAPTURE / التقاط** يطلب من نافذة التشغيل الحالية فحص الأنيميشن الحقيقي والتقاط العناصر المرئية كطبقات.
- الالتقاط لا يحذف ملفات الأنيميشن الأصلية ولا يستبدلها بصورة Mockup.

## مثال عملي / Practical example
1. شغّل WOO-SE-GIROK.
2. من Operator/Audience العادية اضغط DESIGN STUDIO.
3. اضغط CAPTURE.
4. تظهر العناصر التي تم التقاطها في LAYERS.
5. اختر ذراع القرار، الصورة، النص أو الإطار.
6. اضغط FREEZE عند اللحظة المطلوبة، مثل 02.73s.
7. حرّك الذراع أو غيّر مكان النص أو كبّر الصورة.
8. أضف Glow/Light/Particles أو أي Effect.
9. احفظ Draft ثم PUBLISH إذا كان جاهزًا.
10. عند تشغيل نفس WOO-SE-GIROK مرة أخرى، الـRuntime يعيد ربط الطبقة المحفوظة بالعنصر الحقيقي تلقائيًا.

## عزل الأنيميشن / Animation isolation
التصميم محفوظ حسب `animationId`. تعديل WOO-SE-GIROK لا يغيّر Player Call أو Team Call أو Doctor أو Kyeshi أو KO أو Winner أو Player Change.

## التحكم في الحركة / Motion control
- X/Y — تحريك أفقي وعمودي
- Width/Height — تغيير الحجم
- Rotation — تدوير
- Scale — تكبير/تصغير
- Opacity — شفافية
- Keyframe — تغيير خاص بلحظة زمنية
- Easing — نوع الانتقال بين مفتاحين
- Motion Path — مسار الحركة عند استخدامه

## Transitions / التحولات بين الأنيميشنات
Fade, Crossfade, Wipe, Zoom, Slide, Flash, Glitch, Light Sweep.
لكل Animation إعدادات دخول وخروج مستقلة، مع مدة وقوة ولون وEasing.

## Effects / المؤثرات
Glow, Bloom, Shine, Light, Energy, Particles, Sparks, Smoke, Shadow, Blur, Motion Blur, Bevel, Reflection, Scanlines, Gradient, Inner Glow, Outer Glow وBlend Modes.

## Assets / الأصول
- Assets من المشروع
- Import من ملفات Windows
- Drag & Drop إلى الـCanvas
- استبدال Image Layer بصورة أخرى
- تحريك الصورة وتغيير حجمها ودورانها وشفافيتها

## Public Display / شاشة الجمهور
Public Display **output-only / للإخراج فقط**. لا يظهر فيها FREEZE أو CAPTURE أو DELETE أو LAYERS أو أدوات التصميم.

## قاعدة مهمة / Important rule
أي تعديل نهائي يجب أن يتم عبر SAVE DRAFT أو PUBLISH. الـPublic Display يتلقى التصميم المنشور/المتزامن فقط، بينما النسخة غير المكتملة تبقى في الاستوديو.

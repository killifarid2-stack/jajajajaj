# WAB-TKD Broadcast Design Studio — Remaining Features / الميزات المتبقية

## 1. Parent / Group Transform — تحريك المجموعة مع جميع العناصر

تم تعزيز تحريك Group بحيث:
- Move / تحريك: يتحرك الأب وكل العناصر التابعة معه.
- Scale / تكبير وتصغير: تتغير أحجام ومواقع العناصر التابعة حول مركز المجموعة.
- Rotate / تدوير: تدور العناصر التابعة حول مركز المجموعة، مع الحفاظ على علاقتها بالأب.
- يعمل التعديل أيضًا على Timeline Keyframes، وليس فقط على Base Pose.
- Nested Groups / المجموعات المتداخلة تبقى مرتبطة عبر parentId.

## 2. Effects / المؤثرات

المؤثرات المتاحة داخل Design Studio:

- Glow — توهج
- Light Burst — انفجار ضوئي
- Bloom — انتشار ضوئي
- Shine — لمعان
- Energy — طاقة
- Particles — جزيئات
- Sparks — شرارات
- Smoke — دخان
- Scanlines — خطوط مسح
- Shadow — ظل
- Blur — ضبابية
- Motion Blur — ضبابية الحركة
- Gradient — تدرج لوني
- Reflection — انعكاس
- Bevel — حافة ثلاثية الأبعاد
- Inner Glow — توهج داخلي
- Outer Glow — توهج خارجي

كل Effect Layer يمكن أن يملك Color / اللون، Intensity / القوة، Radius / نصف القطر، Opacity / الشفافية، Keyframes / مفاتيح الحركة، Blend Mode / وضع المزج.

## 3. Timeline / الخط الزمني

التعديل عند `00.00` يعدل الوضع الأساسي، والتعديل بعد ذلك الوقت ينشئ Keyframe لذلك الوقت.

مثال:
- `00.00` — Original / الأصلي
- `01.00` — X = 500 / تغيير الموضع
- `02.73` — FREEZE / تجميد
- `03.00` — Glow Power = 1.2 / زيادة قوة التوهج

الرجوع إلى `01.00` لا يُظهر تعديلات `03.00` قبل وقتها.

## 4. Bilingual UI / الواجهة الثنائية

قاعدة المشروع: أي أداة تصميم جديدة يجب أن تعرض English + العربية عندما يكون ذلك مناسبًا، مع الحفاظ على أسماء الاختصارات التقنية التي يحتاجها المستخدم في ملفات المشروع.

## 5. Shortcut safety / أمان الاختصارات

اختصارات Design Studio تعمل عندما لا يكون المستخدم يكتب داخل Input/Textarea/Select.

لذلك لا يجب أن يقطع `T`, `R`, `I`, `E`, `K`, `F` الكتابة داخل حقول البيانات.

## 6. Public Display synchronization / مزامنة شاشة الجمهور

Draft changes remain local until SAVE DRAFT/PUBLISH. بعد الحفظ تستخدم شاشة الجمهور نفس Design Model ونفس تقييم Keyframes، مع حماية animationId من تصميم Animation أخرى.

## 7. Remaining production item / العنصر الإنتاجي المتبقي

`npm run electron:build` يحتاج تحققًا نهائيًا على جهاز Windows فعلي، لأن بيئة العمل الحالية لا توفر Windows GUI/Electron packaging verification.

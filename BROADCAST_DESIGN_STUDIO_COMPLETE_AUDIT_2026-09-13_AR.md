# WAB-TKD — Design Studio — Complete Audit / التدقيق الكامل

## الهدف
هذه النسخة تكمل محرر الأنيميشن الموجود نفسه. لا يتم إنشاء نسخة بديلة من WOO-SE-GIROK أو Player Call أو Team Call أو Doctor أو Kyeshi أو KO أو Winner أو Match Result.

## أدوات التحرير
- Canvas handles — مقابض مباشرة على اللوحة: تحريك، تغيير الحجم، تدوير.
- Snap — التقاط ومحاذاة اختيارية على شبكة 8px.
- Motion Path — مسار حركة بنقاط زمنية قابلة للسحب بالماوس.
- Graph / Easing — اختيار Linear, Ease In, Ease Out, Ease In/Out, Smooth, Back Out, Bounce, Step لكل Keyframe.
- Freeze — تجميد المعاينة داخل Studio فقط.
- Keyframes — حفظ التغيير في الزمن الحالي دون تلويث الحالة الأساسية قبل ذلك الزمن.
- Group / Parent — تحريك المجموعة مع أبنائها مع بقاء الأبناء قابلين للتحرير.
- Mask / Clipping — وضع القناع، اختيار طبقة القناع، ومسار CSS للقص.

## الصور والأصول
- Asset Library — مكتبة أصول المشروع.
- Import Image — استيراد صورة من ملفات الجهاز.
- Drag & Drop — سحب صورة إلى Canvas.
- الصور المضافة تصبح Image Layers ويمكن تحريكها وتكبيرها وتدويرها وربطها بالـKeyframes.

## الخطوط
- تغيير خط أي Text Layer موجودة.
- الخطوط الجاهزة تشمل خطوط لاتينية وعربية.
- Import Font — استيراد TTF/OTF/WOFF/WOFF2.
- الخط المستورد يسجل كمصدر للطبقة حتى يتم تحميله عند العرض.
- RTL/LTR وFont Size وWeight وLetter Spacing وLine Height وStroke وGlow قابلة للتحرير.

## المؤثرات
المؤثرات الموجودة في الـDesign Model والـRuntime تشمل: Glow, Light, Bloom, Shine, Particles, Sparks, Energy, Smoke, Shadow, Blur, Motion Blur, Gradient, Reflection, Scanline, Bevel, Inner Glow, Outer Glow.

يتم تطبيق المؤثر على العنصر المحدد داخل الأنيميشن الحالي. المؤثرات الزمنية تستخدم وقت التشغيل/المعاينة عندما يكون ذلك ممكنًا، ولا يتم استبدال الأنيميشن الأصلي.

## التحولات
Fade, Crossfade, Wipe, Zoom, Slide, Flash, Glitch, Light Sweep محفوظة في Playback لكل Animation بشكل مستقل.

## الأمان والاستقلال
- Draft edits تبقى داخل Studio حتى Save/Publish.
- Publish مرتبط بـanimationId الحالي.
- Runtime لديه حماية من stale animation updates.
- Public Display لا يعرض أدوات التحرير أو Freeze أو Layer Tree.

## التحقق
- TypeScript: `npx --no-install tsc --noEmit --pretty false` — ناجح.
- Production/Electron build لم يتم ادعاء نجاحه في هذه البيئة إذا لم تكن dependencies موجودة.

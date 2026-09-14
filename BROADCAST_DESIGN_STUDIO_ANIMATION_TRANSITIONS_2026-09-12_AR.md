# WAB-TKD Broadcast Design Studio — Animation / Timing / Transitions

## التحكم في الأنيميشن
- DURATION / المدة: مدة الأنيميشن الكاملة.
- SPEED / السرعة: سرعة المعاينة داخل Design Studio.
- FPS / الإطارات: 24/25/30/50/60.
- IN / نقطة البداية: بداية منطقة التشغيل.
- OUT / نقطة النهاية: نهاية منطقة التشغيل.
- LOOP / تكرار: إعادة تشغيل المعاينة من IN عند الوصول إلى OUT.
- AUTO NEXT / الانتقال التلقائي: تحديد Animation تالي كإعداد محفوظ لكل تصميم. لا يغيّر تصميم Animation آخر.

## Transitions / التحولات
- Fade — تلاشي
- Crossfade — تداخل ناعم
- Wipe Left/Right/Up/Down — مسح اتجاهي
- Zoom In/Out — تكبير/تصغير
- Slide Left/Right/Up/Down — انزلاق
- Flash — وميض
- Glitch — تشويش بصري
- Light Sweep — مسح ضوئي

كل Transition له Duration وIntensity وColor ويمكن أن يستخدم Easing. التحولات محفوظة داخل Animation نفسه.

## التحكم الزمني
التعديلات عند 00.00s أو 01.00s أو 02.73s تبقى مرتبطة بالوقت عبر Keyframes. Freeze لا يغيّر النسخة المنشورة؛ Save Draft وPublish هما نقاط المزامنة.

## الصور والأصول
يمكن إضافة PNG/JPG/JPEG/WEBP/SVG من Asset Library أو Import من ملفات Windows أو بالسحب والإفلات. الصورة تصبح Image Layer ويمكن تحريكها وتكبيرها وتدويرها وتطبيق المؤثرات والـKeyframes عليها.

## ملاحظة إنتاجية
Design Studio وPublic Display يستخدمان نفس نموذج التصميم عند تطبيق طبقات Design Studio على العناصر الموجودة. يجب اختبار Electron/Windows قبل اعتبار الحزمة Production-ready نهائيًا.

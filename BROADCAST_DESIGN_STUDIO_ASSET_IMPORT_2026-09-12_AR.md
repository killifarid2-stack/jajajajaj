# WAB-TKD Broadcast Design Studio — Asset Import & Image Layers

## الإضافة الجديدة / New capability

أصبح بإمكان المصمم إضافة صورة إلى الـAnimation من مصدرين:

1. **ASSET LIBRARY / مكتبة الأصول** — الأصول الموجودة داخل `src/assets`.
2. **IMPORT / استيراد** — صورة من ملفات الكمبيوتر بصيغ الصور المدعومة من المتصفح.

كما يمكن سحب صورة من Windows Explorer وإفلاتها مباشرة داخل الـCanvas.

## السلوك / Behavior

- إذا لم تكن هناك طبقة صورة محددة: يتم إنشاء **Image Layer / طبقة صورة** جديدة.
- إذا كانت طبقة صورة محددة: اختيار Asset أو Import يستبدل الصورة داخل الطبقة الحالية.
- الصورة المستوردة تُحفظ محليًا في مكتبة الأصول الخاصة بـDesign Studio لتسهيل إعادة استخدامها في جلسات لاحقة على نفس الجهاز/المتصفح.
- الأصول المضافة تبقى مرتبطة بالـAnimation Design فقط؛ لا يتم تعديل بيانات المباراة أو اللاعبين.
- بعد إضافة الصورة يمكن استعمال أدوات الـDesign Studio الموجودة: Move, Resize, Rotate, Opacity, Effects, Blend Mode, Group, Keyframes, Freeze, Copy/Paste, Z-order.
- التعديل في `01.00s` أو `02.73s` يمكن أن يبقى Keyframe زمنيًا ولا يغير الـOriginal قبل تلك اللحظة.

## الاختصارات المرتبطة

- `I` — Import Image / استيراد صورة من ملفات الكمبيوتر.
- `Ctrl/Cmd + D` — Duplicate / تكرار طبقة.
- `Ctrl/Cmd + C` — Copy / نسخ.
- `Ctrl/Cmd + V` — Paste / لصق.
- Arrow Keys — Nudge 1px / تحريك 1 بكسل.
- `Shift + Arrow` — Nudge 10px / تحريك 10 بكسل.
- `K` — Add Keyframe / إضافة مفتاح حركة.
- `F` — Freeze / تجميد المعاينة.
- `F2` — Rename Layer / إعادة تسمية الطبقة.
- `Delete` — Delete Layer / حذف الطبقة.

## ملاحظة تقنية

الأصول المضمنة في المشروع تُكتشف تلقائيًا من `src/assets/**/*.{png,jpg,jpeg,webp,svg}` عبر Vite. الصور المحلية المستوردة تُخزن كـData URL في التخزين المحلي للمكتبة. إذا رفض المتصفح التخزين بسبب الحجم، تبقى الصورة في الـDesign الحالي، لكن قد لا تُضاف إلى المكتبة المحلية.

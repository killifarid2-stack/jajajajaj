# WAB-TKD — Broadcast Design Studio implementation

تم دمج Broadcast Design Studio داخل المشروع الحالي دون حذف أنظمة البطولة أو Match Engine.

## ما تمت إضافته

- زر **DESIGN / تصميم** داخل منطقة الشاشات الخارجية في Public Display Control.
- Route مستقل: `/broadcast-design`.
- محرر طبقات 1920×1080 داخل التطبيق.
- Layers / Groups / Nested Groups / Hide / Lock / Duplicate / Delete.
- Transform: X/Y/Width/Height/Rotation/Scale/Opacity.
- Text: font / size / color / RTL/LTR / dynamic binding.
- Image import + Player Photo / Team Logo / Club Logo / Flag bindings.
- Freeze / Play / Pause / Timeline preview.
- Undo / Redo / Restore Original / Draft / Publish.
- Live Preview عبر Electron IPC إلى جميع Public Displays المفتوحة.
- Design payload محفوظ محليًا لكل Animation بشكل مستقل.
- Design Runtime hooks لبعض عناصر Team Call الحالية عبر `data-wab-layer-id`، مع عدم تغيير الـOriginal Animation عندما يكون Live Preview مغلقًا.
- Broadcast Design sync محفوظ في Electron main process بحيث تحصل الشاشة التي تفتح لاحقًا على آخر Design payload.

## الحماية

- Original animation code/assets لا يتم استبدالها.
- Match / Scoring / Tournament logic لا يتم تعديلها بواسطة Design Studio.
- Public Display لا يحتوي على أدوات تحرير؛ هو output/preview فقط.
- التصميمات مستقلة حسب animationId.

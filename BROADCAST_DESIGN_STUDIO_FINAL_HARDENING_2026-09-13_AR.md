# WAB-TKD — Design Studio Final Hardening Delivery — 2026-09-13

## ما تم تعديله فعلياً في المشروع المرفق

### 1. Layer Tree / Capture
- تم تقوية التقاط الأنيميشن الحقيقي من الـDOM.
- عندما يكون للأنيميشن `data-wab-layer-root` معلن، يصبح هذا الـroot هو المصدر المرجعي.
- لا يتم إسقاط العناصر فقط لأنها شفافة مؤقتاً أو أقل من حد مساحة سابق.
- يتم الاحتفاظ بالعناصر المرئية/الموسومة داخل الـroot مع Parent/Child الحقيقي.
- تم إزالة حد `500` طبقة من مسار الـdeclared root حتى لا يختفي جزء من الأنيميشن الكبير.

### 2. تحرير الأنيميشن الأصلي
- عند الضغط على CAPTURE مرة أخرى، لا تتم إضافة نسخة مكررة من الطبقة الأصلية.
- إذا كانت الطبقة موجودة بنفس `data-wab-layer-id`، يتم تحديث Geometry/Style من المصدر الحقيقي مع الحفاظ على:
  - Keyframes
  - Bindings
  - Effects
  - Masks
  - Motion Path
  - Lock
  - Studio-only editor state
- بذلك يمكن العمل على نفس Animation الأصلي ثم حفظه/نشره.

### 3. حماية التعديل الزمني
- بقي نظام Time-local Keyframes كما هو.
- التعديل بعد `0.00s` لا يغير Base Pose.
- Studio وPublic Runtime يستخدمان evaluator مشتركاً.

### 4. الاختبارات
- Design Studio static audit: PASS.
- TypeScript `tsc --noEmit --pretty false`: PASS.
- `vitest` لم يتم تشغيله لأن dependencies ليست موجودة في الحزمة، ومحاولة `npm install --ignore-scripts --no-audit --no-fund` تجاوزت مهلة التنفيذ.
- لم يتم الادعاء بنجاح Vite/Electron production build بدون dependencies.

## قيود يجب التحقق منها على Windows الفعلي
- GUI/Electron visual verification.
- Frame-drop measurement مع Particle/Blur/Glow/Smoke/Motion Blur.
- اختبار كل Animation من START حتى PUBLIC DISPLAY.
- اختبار Team Call → Player Call → Player Change → Doctor → Kyeshi → KO → Result.
- اختبار AR / FR / EN على كل شاشة ومسار، خصوصاً النصوص الثابتة الموجودة خارج Design Studio.

## قاعدة الحفاظ
لم يتم استبدال Animation أصلي بMockup جديد، ولم يتم تعديل database/match logic ضمن هذه الدفعة.

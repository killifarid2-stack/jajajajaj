# WAB-TKD — Broadcast Design Studio — Complete Native Animation Inspector

## ما تم تنفيذه

Design Studio لا يعتمد الآن على Layer Tree تجريبي فقط. المعاينة تستخدم نفس `PublicScoreboard` ومكونات البث الأصلية، ثم يقوم Inspector تلقائياً بتحويل العناصر المرئية الموجودة فعلياً في DOM إلى Layers قابلة للتحرير.

### 1. جميع العناصر المرئية
- `div` والعناصر ذات الخلفية/الإطار/الظل/المؤثرات.
- النصوص.
- الصور وSVG وCanvas.
- الفيديو وVideo Layers.
- عناصر داخل Frames وGroups.
- عناصر الحكم واليدين والصور والشعارات والميداليات والأصول.
- العناصر التي لم تكن تحمل `data-wab-layer-id` يتم إعطاؤها معرفاً تلقائياً مستقراً داخل الجلسة.

### 2. الاختيار المباشر
- Click على العنصر.
- Ctrl/Cmd + Click لتحديد عدة عناصر.
- إذا كان العنصر الأصلي يستخدم `pointer-events:none` يتم اختيار العنصر الأقرب هندسياً تحت موضع النقر.
- Layer Tree وSelection Overlay يبقيان متزامنين.

### 3. Capture الحقيقي
زر `CAPTURE` لم يعد يتطلب فتح Operator في نافذة ثانية. Studio نفسه يستقبل أمر Capture ويعيد Snapshot من الأنيميشن الموجود في المعاينة.

### 4. إزالة الـ Placeholder Scaffold
عند وصول Snapshot حقيقي، يتم استبدال طبقات القالب الوهمية بطبقات الأنيميشن الأصلية المرئية، مع الحفاظ على الطبقات التي أنشأها المستخدم بنفسه.

### 5. الأنيميشنات
تشمل مكتبة Design Studio جميع IDs الحالية، ومنها:
- TEAM CALL
- PLAYER CALL
- PLAYER CHANGE
- MATCHUP / VS
- WINNER
- KO
- DOCTOR
- KYESHI
- WOO-SE-GIROK
- MATCH RESULT
- VIDEO REPLAY / IVR
- GOLDEN POINT
- NEXT ROUND CALL
- POINT GAP / PTG
- STANDINGS / RANKING
- HIT STATISTICS
- PLAYER / EQUIPMENT TEST
- BEST PLAYER · MATCH
- BEST PLAYER · PAR ÉQUIPE
- TOURNAMENT MVP
- BEST TEAM
- BEST CLUB
- BEST REFEREE
- FAIR PLAY
- TOP SCORER
- TOP HITTER
- PODIUM / CHAMPION

### 6. Dynamic data
الـ Preview يواصل استخدام MatchState حقيقي/معزول للمعاينة. روابط اللاعب/الفريق/النادي/النتيجة/الجولة/الوزن/البطولة موجودة، كما أن طبقات الفوز يمكنها استخدام بيانات الفائز عند تسمية layer باسم winner/champion/mvp/award.

### 7. الأمان
التعديل داخل Studio يبقى Draft حتى `SAVE DRAFT` أو `PUBLISH`. لا يتم تعديل MatchState الحقيقي أو قاعدة البيانات من زر Capture أو التحديد المباشر.

## ملاحظة التحقق
تم إجراء فحص Syntax/TSX للملفات المعدلة باستخدام TypeScript transpilation، ونجح بدون أخطاء syntax. لم يتم تنفيذ `vite build` الكامل لأن الحزم (`node_modules`) غير متوفرة في بيئة التنفيذ، ومحاولة تثبيتها انتهت بمهلة.

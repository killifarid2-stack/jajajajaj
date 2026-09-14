# WAB-TKD — ALL ANIMATIONS DESIGN STUDIO / EDITOR

## الهدف
أصبح Design Studio مبنياً على فكرة: **المعاينة الحقيقية أولاً، والطبقات الحقيقية ثانياً**. لا توجد شاشة سوداء فارغة كطريقة تحرير أساسية.

## ما تمت إضافته
- قائمة موسعة لكل مشاهد البث والأنيميشن الموجودة في النظام:
  - TEAM CALL
  - PLAYER CALL
  - PLAYER CHANGE
  - MATCHUP / VS
  - WINNER
  - MATCH RESULT
  - KO
  - DOCTOR
  - KYESHI / INJURY TIME
  - WOO-SE-GIROK / JUDGES DECISION
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

- المعاينة تستخدم نفس PublicScoreboard/مكونات الأنيميشن الحقيقية للمشاهد التي تعمل على شاشة الجمهور.
- المعاينة المعزولة تعتبر LIVE داخلياً حتى لا يعيد standby gate شاشة الأنيميشن إلى splash/black.
- اختيار مباشر من شاشة الأنيميشن: اضغط على العنصر نفسه لتحديده.
- Ctrl/Cmd + Click يسمح بتحديد عدة عناصر.
- يمكن استعمال Layer Tree بعد التحديد للتحكم الكامل.
- تم تحسين الالتقاط ليحتفظ أيضاً بالطبقات الموسومة التي تكون مخفية في اللحظة الحالية، مع الاحتفاظ بآخر هندسة معروفة لها.
- تمت إضافة مراحل Preview مثل BLUE / RED / READY / ACCEPTED / REJECTED / AI REVIEW / VOTING.
- تمت إضافة معاينة حقيقية قابلة للتحرير لمشاهد Awards باستخدام بيانات نظام الجوائز الحالية.

## التحكم بالعنصر
بعد اختيار أي Layer يمكن تعديل:
- X / Y / Width / Height
- Rotation / Scale / Opacity
- النص والخط والحجم والوزن والمحاذاة
- الصورة / الشعار / العلم
- اللون والخلفية والإطار
- Glow / Bloom / Shine / Particles / Energy / Smoke وغيرها
- Border / Radius / Shadow / Filter / Blend
- Keyframes و Easing
- Motion Path
- Attach / Parent / Group
- ترتيب Z
- عزل العنصر ومقارنة قبل/بعد

## البيانات الديناميكية
الـ bindings الموجودة في Design Studio تستمر بالاعتماد على بيانات المباراة، اللاعب، الفريق، النادي، العلم، الرقم، الجولة، الوزن، البطولة والفائز. التعديل على التصميم لا يحول البيانات الديناميكية إلى نص ثابت.

## العزل عن المباراة
Studio Preview يستعمل MatchContext مؤقتاً. لا يتم إرسال ضغطات التحرير إلى نتيجة المباراة أو قاعدة البيانات. SAVE DRAFT و PUBLISH هما مساران للتصميم فقط، مع بقاء Public Display معتمداً على النسخة المنشورة.

## ملاحظة
لم يتم حذف ملفات Assets الموجودة ولم يتم استبدال الأنيميشن الأصلي بأنيميشن Demo. تمت إضافة طبقة تحرير ومعاينة حول المكونات الحالية.

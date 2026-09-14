# WAB-TKD Broadcast Design Studio — Final Design Expansion

تم توسيع محرر التصميم ليعمل على أساس Layer/Group/Timeline مستقل لكل Animation.

## ما تم إضافته
- Layer Tree وNested Groups لكل Animation.
- تعديل زمني Time-Local: التعديل عند 02.00s يبقى عند 02.00s ولا يتسرب إلى 00.00s.
- Keyframes للـtransform والنصوص والألوان والإطارات والتأثيرات.
- Frames متعددة: square, rounded, double, neon, cut-corner, hex, circle, diamond, bracket, tech, gold.
- Border styles: solid, double, dashed, dotted.
- Gradients.
- Glow/Bloom/Light/Shine/Energy/Sparks/Particles/Smoke/Scanlines/Shadow/Blur/Gradient effects.
- Effect color/intensity/radius.
- Shadow controls.
- Typography: letter spacing, line height, text stroke.
- Swap Position للمجموعات والإطارات مع احترام الزمن الحالي.
- Group movement يحفظ keyframes بدل تغيير الـOriginal عند وجود زمن فعلي.
- Live renderer support للتأثيرات الجديدة على Public Display.
- دعم العربية RTL والخطوط المخصصة مستمر.
- Original/Draft/Published محفوظة لكل Animation.

## قاعدة مهمة
الـOriginal Animation لا يتم استبدالها. تعديلات Design Studio تحفظ كـDesign data/overrides، والـPublic Display يستعمل نفس بيانات التصميم والـrenderer.

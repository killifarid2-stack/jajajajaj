# WAB-TKD Broadcast Design Studio — Effects & Fonts Verification

## العربية
- تم تفعيل مؤثرات العنصر الموجود مباشرة على الـDOM الأصلي عند النشر.
- المؤثرات تشمل: Glow, Bloom, Shine, Light, Energy, Sparks, Particles, Smoke, Reflection, Scanlines, Gradient, Bevel, Inner/Outer Glow, Shadow, Blur, Motion Blur.
- بعض المؤثرات تعتمد على الزمن الحالي للأنيميشن حتى تتحرك أثناء التشغيل بدل أن تكون صورة ثابتة.
- يمكن تغيير خط أي طبقة نص موجودة، تغيير السماكة والحجم والمحاذاة وتباعد الحروف وارتفاع السطر.
- يمكن استيراد TTF/OTF/WOFF/WOFF2، تحميله في المتصفح وحفظ مصدر الخط مع التصميم حتى يمكن إعادة تحميله في الإخراج.
- اللغة الافتراضية للاستوديو أصبحت العربية، ويمكن التحويل إلى English أو Français.
- الانتقالات تعرض اسمها باللغة المختارة بدل ترك القائمة بالإنجليزية.

## English
- Effects are applied to the existing DOM target when published.
- Supported effects include Glow, Bloom, Shine, Light, Energy, Sparks, Particles, Smoke, Reflection, Scanlines, Gradient, Bevel, Inner/Outer Glow, Shadow, Blur and Motion Blur.
- Time-dependent effects use the current animation clock during playback.
- Existing text layers support font family, weight, size, alignment, letter spacing and line height.
- Custom TTF/OTF/WOFF/WOFF2 fonts can be imported and their source is stored with the design.
- The Studio defaults to Arabic but can be switched to English or French.

# WAB-TKD — أوامر الإطلاق النهائي

> هذه الأوامر مخصصة للنسخة النهائية بعد فك الضغط على جهاز التطوير/التشغيل.

## 1) تثبيت Node.js

استخدم Node.js 22 LTS أو إصدارًا أحدث متوافقًا مع المشروع.

## 2) تثبيت الاعتماديات

```powershell
npm install --no-audit --no-fund
```

إذا كان الاتصال ضعيفًا، أعد الأمر بعد اكتمال الشبكة. لا تستخدم `npm ci` في هذه النسخة لأن المستودع يحتفظ بـ `bun.lock` ولا يحتوي حاليًا على `package-lock.json`.

## 3) إعداد البيئة

انسخ:

```powershell
Copy-Item .env.example .env
```

ثم ضع القيم الحقيقية:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_ALLOW_ANONYMOUS=false
```

لا تضع `service_role` أو أي secret داخل `.env` الذي يدخل إلى Vite/browser.

## 4) فحوصات التصميم والبنية

```powershell
npm run design-studio:final-audit
npm run production:asset-audit
npm run production:security-audit
npm run production:final-audit
npm run production:preflight
```

## 5) فحص TypeScript / lint

```powershell
npx tsc --noEmit
npm run lint
```

## 6) اختبارات الوحدة

```powershell
npm test
```

## 7) Build الإنتاج

```powershell
npm run build
```

## 8) اختبار المتصفح

```powershell
npx playwright install chromium
npm run test:e2e
```

وللتشغيل مع تقرير HTML:

```powershell
npx playwright test tests/e2e --reporter=html
```

## 9) فحص الإطلاق الكامل

```powershell
npm run release:verify
npm run production:final-check
npm run go-live:check
```

## 10) Supabase

بعد التأكد من تسجيل الدخول إلى مشروع Supabase الصحيح:

```powershell
npx supabase login
npx supabase link --project-ref xdgvsnewkenyutbjyksm
npx supabase db push
```

ثم نفّذ فحص البيئة:

```powershell
npm run production:env-check
```

## 11) Vercel / Web

إذا كان المشروع مربوطًا بـ Vercel:

```powershell
npx vercel login
npx vercel link
npx vercel --prod
```

أو ارفع Git إلى `main` واترك CI/CD ينفذ الـbuild والاختبارات.

## 12) تطبيق Windows / Electron

```powershell
npm run electron:build
```

الملفات النهائية ستظهر داخل:

```text
release/
```

## 13) تشغيل التطبيق محليًا

Web:

```powershell
npm run dev
```

Electron:

```powershell
npm run electron
```

## 14) اختبار الشاشة الثانية

شغّل التطبيق، افتح Public Display على الشاشة الثانية، ثم من الشاشة نفسها اضغط:

`DESIGN / EDIT DISPLAY`

وتأكد من ظهور:

`PUBLIC DISPLAY MIRROR`

ثم فعّل `LIVE EDIT`.

## 15) اختبار Live Edit قبل البطولة

1. أنشئ Frame.
2. اربطه بـ Best Player.
3. أضف Photo + Name + Team + Flag.
4. حدد Start / End.
5. Publish.
6. افتح Main Referee controls.
7. اضغط زر التصميم الجديد.
8. تأكد أن التعديل يظهر على Public Display.
9. تأكد أن Score / Timer / Match State لم تتغير.
10. أوقف Live Edit وتأكد من عودة العرض المنشور.

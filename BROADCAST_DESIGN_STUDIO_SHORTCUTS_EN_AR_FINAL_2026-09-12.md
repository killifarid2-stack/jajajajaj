# WAB-TKD Broadcast Design Studio — Final Keyboard Shortcuts / دليل الاختصارات النهائي

هذا الدليل هو المرجع الرسمي لاختصارات Design Studio. كل اسم إنجليزي يقابله شرح عربي داخل التطبيق.

## File / ملف
| Shortcut | English | العربية |
|---|---|---|
| Ctrl/Cmd + S | Save | حفظ التصميم الحالي |
| Ctrl/Cmd + Z | Undo | تراجع عن آخر تعديل |
| Ctrl/Cmd + Shift + Z | Redo | إعادة التعديل المتراجع عنه |

## Layers / الطبقات
| Shortcut | English | العربية |
|---|---|---|
| Ctrl/Cmd + A | Select all | تحديد كل الطبقات القابلة للتحديد |
| Ctrl/Cmd + Shift + A | Deselect all | إلغاء تحديد كل الطبقات |
| Ctrl/Cmd + C | Copy | نسخ الطبقة المحددة |
| Ctrl/Cmd + V | Paste | لصق الطبقة المنسوخة |
| Ctrl/Cmd + D | Duplicate | تكرار الطبقة/العنصر |
| Ctrl/Cmd + G | Group | تجميع العناصر المحددة في مجموعة |
| Ctrl/Cmd + Shift + G | Ungroup | فك المجموعة مع الحفاظ على العناصر |
| Ctrl/Cmd + [ / ] | Send backward / Bring forward | إرسال للخلف / تقديم للأمام |
| Ctrl/Cmd + Shift + [ / ] | Send to back / Bring to front | إرسال إلى الخلف تمامًا / تقديم إلى الأمام تمامًا |
| Delete / Backspace | Delete | حذف الطبقة المحددة |
| F2 | Rename layer | إعادة تسمية الطبقة |

## Canvas / اللوحة
| Shortcut | English | العربية |
|---|---|---|
| V | Move tool | أداة التحريك |
| Arrow keys | Nudge 1px | تحريك بمقدار 1 بكسل |
| Shift + Arrow | Nudge 10px | تحريك بمقدار 10 بكسل |
| T | Text tool | إضافة طبقة نص |
| R | Frame tool | إضافة إطار |
| I | Image tool | استيراد/إضافة صورة |
| E | Effect tool | إضافة تأثير |

## Timeline / الخط الزمني
| Shortcut | English | العربية |
|---|---|---|
| Space | Play / Pause | تشغيل / إيقاف مؤقت |
| Home | Go to first frame | الذهاب إلى بداية الحركة |
| End | Go to last frame | الذهاب إلى نهاية الحركة |
| Left / Right | Step frame | الانتقال إطارًا واحدًا |
| Shift + Left / Right | Step 0.1s | الانتقال 0.1 ثانية |
| K | Add keyframe | إضافة Keyframe في الزمن الحالي |
| F | Freeze / Resume | تجميد أو استئناف المعاينة |

## Help / المساعدة
| Shortcut | English | العربية |
|---|---|---|
| Esc | Deselect / close help | إلغاء التحديد / إغلاق دليل الاختصارات |
| ? أو Shift + / | Shortcut help | فتح/إغلاق دليل الاختصارات |

## Important behavior / السلوك المهم

- التحريك بالأسهم يطبّق على الطبقة/المجموعة المحددة فقط.
- عند وجود Parent/Group، يمكن تحريك المجموعة مع عناصرها، ثم فتحها وتعديل أي عنصر منفرد.
- الـKeyframe مرتبط بالزمن الحالي؛ لا يجب أن ينتقل تعديل الثانية 03.00s إلى الثانية 00.00s.
- Freeze خاص بالمعاينة والتصميم، ولا يغيّر Match Timer أو Match State.
- Ctrl/Cmd + S يحفظ التصميم الحالي، بينما النشر إلى Public Display يبقى ضمن دورة Draft/Published.
- اختصارات التصميم لا ينبغي أن تغيّر Match/Scoring/Tournament logic.

## UI language / لغة الواجهة

كل أدوات Design Studio الجديدة يجب أن تعرض الاسم الإنجليزي والعربي عند الحاجة، بينما تبقى لغة الـBroadcast مستقلة عن لغة التطبيق. دعم التصميم يجب أن يشمل EN / AR / FR وRTL/LTR دون قلب مواقع العناصر الرياضية الثابتة تلقائيًا.

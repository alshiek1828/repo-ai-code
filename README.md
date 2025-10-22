# Relosity AI Platform - نظام الذكاء الاصطناعي المتكامل

منصة ذكاء اصطناعي متطورة ومتكاملة مع واجهة حديثة ونظام API متكامل.

## 🌟 المميزات الرئيسية

### 🤖 الذكاء الاصطناعي المتقدم
- محادثة تفاعلية مع AI باستخدام OpenAI GPT
- دعم متعدد اللغات (العربية والإنجليزية)
- توليد الصور باستخدام DALL-E
- تحليل المشاعر والمراجعة التلقائية للمحتوى
- نظام تعلم ذاتي يحسن من الإجابات

### 🔑 نظام API متكامل
- مفاتيح API آمنة ومتطورة
- إدارة شاملة للمفاتيح من لوحة التحكم
- تتبع الاستخدام والحدود
- دعم خطط مختلفة (مجاني، متقدم، مؤسسي)
- وثائق API شاملة مع أمثلة

### 🎨 واجهة مستخدم متطورة
- تصميم عصري ومتجاوب مع جميع الأجهزة
- وضع داكن وفتح
- تأثيرات وحركات سلسة
- PWA (تطبيق ويب تقدّمي)
- دعم الإشعارات الفورية

### 🔐 أمان متقدم
- تشفير متقدم للمفاتيح والبيانات
- نظام حماية من الاختراق
- التحقق من المستخدم قبل كل طلب
- حماية من الاستخدام المفرط
- تسجيل شامل للأنشطة

### 📊 لوحة تحكم شاملة
- إحصائيات مفصلة للاستخدام
- إدارة المحادثات السابقة
- تحليلات متقدمة
- إعدادات قابلة للتخصيص
- لوحة تحكم للمسؤولين

## 🚀 التقنيات المستخدمة

### Frontend
- **HTML5** - هيكل الصفحات
- **CSS3** - التصميم والتنسيق
- **JavaScript (ES6+)** - التفاعل والوظائف
- **Firebase SDK** - المصادقة وقاعدة البيانات
- **Chart.js** - الرسوم البيانية
- **PWA** - تطبيق ويب تقدّمي

### Backend
- **Node.js** - بيئة التشغيل
- **Express.js** - إطار العمل
- **Firebase Admin SDK** - إدارة قاعدة البيانات
- **OpenAI API** - الذكاء الاصطناعي
- **JWT** - المصادقة
- **Multer** - رفع الملفات

### قاعدة البيانات والتخزين
- **Firebase Realtime Database** - قاعدة البيانات
- **Firebase Storage** - تخزين الملفات
- **Firebase Authentication** - المصادقة
- **Firebase Cloud Messaging** - الإشعارات

## 📁 بنية المشروع

```
Relosity-AI/
├── frontend/                 # الواجهة الأمامية
│   ├── index.html           # الصفحة الرئيسية
│   ├── dashboard.html       # لوحة التحكم
│   ├── style.css            # ملف التنسيق الرئيسي
│   ├── dashboard.css        # تنسيق لوحة التحكم
│   ├── app.js               # JavaScript الرئيسي
│   └── dashboard.js         # JavaScript لوحة التحكم
├── backend/                 # الخادم الخلفي
│   ├── server.js            # الخادم الرئيسي
│   └── routes/              # مسارات API
│       ├── auth.js          # مسارات المصادقة
│       ├── ai.js            # مسارات الذكاء الاصطناعي
│       └── keys.js          # مسارات مفاتيح API
├── firebaseConfig.js        # إعدادات Firebase
├── manifest.json            # ملف PWA
├── sw.js                    # Service Worker
├── package.json             # تبعيات المشروع
├── .env.example             # مثال متغيرات البيئة
└── README.md               # هذا الملف
```

## 🛠️ التثبيت والإعداد

### 1. استنساخ المشروع
```bash
git clone https://github.com/your-username/relosity-ai-platform.git
cd relosity-ai-platform
```

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. إعداد متغيرات البيئة
```bash
cp .env.example .env
```

قم بتعديل ملف `.env` وأضف القيم الصحيحة:
- مفاتيح Firebase
- مفتاح OpenAI API
- إعدادات البريد الإلكتروني
- مفاتيح JWT

### 4. إعداد Firebase
1. أنشئ مشروع جديد في [Firebase Console](https://console.firebase.google.com)
2. فعّل Authentication و Realtime Database و Storage
3. احصل على مفاتيح الخدمة
4. أضف المفاتيح إلى ملف `.env`

### 5. تشغيل المشروع

#### تطوير
```bash
npm run dev
```

#### إنتاج
```bash
npm start
```

## 📖 استخدام API

### المصادقة
```javascript
// تسجيل الدخول
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password'
    })
});
```

### استخدام مفتاح API
```javascript
// محادثة مع AI
const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
        message: 'مرحباً، كيف حالك؟',
        model: 'gpt-3.5-turbo'
    })
});
```

### توليد الصور
```javascript
// توليد صورة
const response = await fetch('/api/ai/generate-image', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key'
    },
    body: JSON.stringify({
        prompt: 'قطة لطيفة تجلس في الحديقة',
        size: '1024x1024'
    })
});
```

## 🔧 التخصيص

### إضافة نماذج AI جديدة
```javascript
// في backend/routes/ai.js
const completion = await openai.chat.completions.create({
    model: "gpt-4", // تغيير النموذج
    messages: [...],
    temperature: 0.8, // تغيير الإبداع
    max_tokens: 2000  // تغيير الطول
});
```

### تخصيص التصميم
```css
/* في frontend/style.css */
:root {
    --primary-color: #your-color;
    --secondary-color: #your-color;
    /* المزيد من المتغيرات */
}
```

## 📊 الإحصائيات والمراقبة

### إحصائيات API
- عدد الطلبات اليومية/الشهرية
- الاستخدام حسب المفتاح
- الأخطاء والأداء
- المستخدمين النشطين

### لوحة تحكم المسؤول
- إدارة المستخدمين
- مراقبة النظام
- إحصائيات شاملة
- إدارة المحتوى

## 🔒 الأمان

### حماية البيانات
- تشفير جميع المفاتيح
- حماية من SQL Injection
- Rate Limiting
- CORS Configuration

### المصادقة والتفويض
- JWT Tokens
- Firebase Authentication
- Role-based Access Control
- API Key Management

## 🚀 النشر

### Netlify (Frontend)
1. اربط المستودع مع Netlify
2. اضبط Build Command: `npm run build`
3. اضبط Publish Directory: `frontend/`

### Vercel/Railway (Backend)
1. اربط المستودع
2. اضبط Environment Variables
3. اضبط Build Command: `npm install`
4. اضبط Start Command: `npm start`

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. أنشئ فرع للميزة الجديدة (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push إلى الفرع (`git push origin feature/AmazingFeature`)
5. افتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

- البريد الإلكتروني: support@relosity-ai.com
- الموقع: https://relosity-ai.com
- التوثيق: https://docs.relosity-ai.com

## 🙏 شكر وتقدير

- [OpenAI](https://openai.com) - للذكاء الاصطناعي
- [Firebase](https://firebase.google.com) - للبنية التحتية
- [Font Awesome](https://fontawesome.com) - للأيقونات
- [Chart.js](https://chartjs.org) - للرسوم البيانية

---

**تم تطوير هذا المشروع بحب ❤️ لخدمة المجتمع العربي في مجال الذكاء الاصطناعي**
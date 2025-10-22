# Relosity AI Platform

## نظام الذكاء الاصطناعي المتكامل - منصة متطورة للذكاء الاصطناعي

<div dir="rtl">

### 🚀 نظرة عامة

Relosity AI Platform هي منصة ذكاء اصطناعي متطورة ومتكاملة تم تطويرها لتوفير تجربة تفاعلية فريدة مع الذكاء الاصطناعي. تجمع المنصة بين أحدث التقنيات في مجال الذكاء الاصطناعي وواجهة مستخدم حديثة وسهلة الاستخدام.

### ✨ المميزات الرئيسية

#### 🤖 ذكاء اصطناعي متقدم
- نظام ذكاء اصطناعي متطور يستخدم أحدث تقنيات التعلم الآلي
- دعم متعدد اللغات مع تركيز خاص على اللغة العربية
- نظام تعلم ذاتي يحسن من الإجابات باستمرار
- دعم أنواع مختلفة من المحتوى (نص، صورة، صوت)

#### 🔑 نظام API متكامل
- مفاتيح API آمنة ومتطورة لتطوير التطبيقات
- واجهة برمجة تطبيقات RESTful شاملة
- نظام إدارة مفاتيح API متقدم
- تتبع الاستخدام والحدود
- دعم نماذج مختلفة من الذكاء الاصطناعي

#### 🛡️ أمان متطور
- تشفير متقدم لجميع البيانات
- نظام مصادقة متعدد الطبقات
- حماية من الهجمات السيبرانية
- مراقبة الأمان في الوقت الفعلي
- نظام إدارة الصلاحيات المتقدم

#### 📱 تصميم متجاوب ومتطور
- واجهة مستخدم حديثة وسهلة الاستخدام
- تصميم متجاوب يعمل على جميع الأجهزة
- دعم الوضع الداكن والفاتح
- تأثيرات بصرية متطورة وحركات سلسة
- دعم PWA (تطبيق ويب تقدمي)

#### 📊 إحصائيات وتحليلات مفصلة
- لوحة تحكم متطورة تعرض الإحصائيات
- تتبع الاستخدام والأنشطة
- تقارير مفصلة عن الأداء
- رسوم بيانية تفاعلية
- تحليلات متقدمة للبيانات

#### 🔄 نظام تعلم ذاتي
- الذكاء الاصطناعي يتعلم من تفاعلات المستخدمين
- تحسين الإجابات بناءً على التغذية الراجعة
- حفظ أنماط اللغة والأسئلة الشائعة
- تحديث النماذج تلقائياً

### 🛠️ التقنيات المستخدمة

#### Frontend
- **HTML5** - هيكل الصفحات
- **CSS3** - التصميم والتنسيق
- **JavaScript (ES6+)** - التفاعل والوظائف
- **Chart.js** - الرسوم البيانية
- **Font Awesome** - الأيقونات
- **Google Fonts** - الخطوط

#### Backend
- **Node.js** - بيئة تشغيل JavaScript
- **Express.js** - إطار عمل الويب
- **Firebase Admin SDK** - إدارة قاعدة البيانات
- **OpenAI API** - الذكاء الاصطناعي
- **Multer** - رفع الملفات
- **Helmet** - الأمان
- **CORS** - مشاركة الموارد

#### قاعدة البيانات والتخزين
- **Firebase Realtime Database** - قاعدة البيانات
- **Firebase Authentication** - المصادقة
- **Firebase Storage** - تخزين الملفات
- **Firebase Cloud Messaging** - الإشعارات

#### PWA والتحسين
- **Service Worker** - التخزين المؤقت
- **Web App Manifest** - إعدادات التطبيق
- **IndexedDB** - التخزين المحلي
- **Background Sync** - المزامنة في الخلفية

### 📦 التثبيت والتشغيل

#### المتطلبات
- Node.js 16.0.0 أو أحدث
- npm 7.0.0 أو أحدث
- حساب Firebase
- مفتاح OpenAI API

#### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/your-username/relosity-ai-platform.git
cd relosity-ai-platform
```

2. **تثبيت التبعيات**
```bash
npm install
```

3. **إعداد متغيرات البيئة**
```bash
cp .env.example .env
```

قم بتعديل ملف `.env` بالقيم الصحيحة:
```env
# Firebase Configuration
FIREBASE_PRIVATE_KEY_ID=your_private_key_id_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. **تشغيل الخادم**
```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

5. **فتح المتصفح**
```
http://localhost:3000
```

### 🚀 النشر

#### Netlify (Frontend)
1. اربط مستودع GitHub مع Netlify
2. اضبط Build Command: `npm run build`
3. اضبط Publish Directory: `frontend/`
4. اضبط Environment Variables

#### Vercel (Backend)
1. اربط مستودع GitHub مع Vercel
2. اضبط Root Directory: `backend/`
3. اضبط Build Command: `npm install`
4. اضبط Environment Variables

#### Railway (Backend Alternative)
1. اربط مستودع GitHub مع Railway
2. اختر Node.js template
3. اضبط Root Directory: `backend/`
4. اضبط Environment Variables

### 📚 دليل الاستخدام

#### للمستخدمين العاديين

1. **إنشاء حساب جديد**
   - اذهب إلى الصفحة الرئيسية
   - اضغط على "إنشاء حساب"
   - املأ البيانات المطلوبة
   - تحقق من البريد الإلكتروني

2. **بدء المحادثة**
   - سجل الدخول إلى لوحة التحكم
   - اذهب إلى قسم "المحادثات"
   - اضغط على "محادثة جديدة"
   - ابدأ الكتابة مع الذكاء الاصطناعي

3. **إدارة مفاتيح API**
   - اذهب إلى قسم "مفاتيح API"
   - اضغط على "إنشاء مفتاح جديد"
   - أدخل اسم المفتاح والحدود
   - انسخ المفتاح واستخدمه في تطبيقاتك

#### للمطورين

1. **الحصول على مفتاح API**
   - سجل الدخول إلى لوحة التحكم
   - اذهب إلى قسم "مفاتيح API"
   - أنشئ مفتاح API جديد
   - انسخ المفتاح واحفظه بأمان

2. **استخدام API**
   ```javascript
   const response = await fetch('https://api.relosity-ai.com/api/v1/chat', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-API-Key': 'your_api_key_here'
     },
     body: JSON.stringify({
       message: 'مرحباً، كيف يمكنك مساعدتي؟',
       model: 'gpt-3.5-turbo'
     })
   });
   
   const data = await response.json();
   console.log(data.response);
   ```

3. **أمثلة الكود**
   - JavaScript/Node.js
   - Python
   - PHP
   - cURL

### 🔧 API Documentation

#### Base URL
```
https://api.relosity-ai.com/api/v1
```

#### Authentication
جميع طلبات API تتطلب مفتاح API صالح في header:
```
X-API-Key: your_api_key_here
```

#### Endpoints

##### Chat
```http
POST /chat
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "message": "مرحباً، كيف يمكنك مساعدتي؟",
  "model": "gpt-3.5-turbo"
}
```

**Response:**
```json
{
  "success": true,
  "response": "مرحباً! أنا Relosity AI، مساعدك الذكي...",
  "model": "gpt-3.5-turbo",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

##### Get API Keys
```http
GET /api-keys
Authorization: Bearer your_jwt_token
```

##### Create API Key
```http
POST /api-keys
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "name": "My App API Key",
  "limit": 1000
}
```

##### Delete API Key
```http
DELETE /api-keys/{key_id}
Authorization: Bearer your_jwt_token
```

### 🏗️ بنية المشروع

```
Relosity-AI-Platform/
├── frontend/                 # الواجهة الأمامية
│   ├── index.html           # الصفحة الرئيسية
│   ├── dashboard.html       # لوحة التحكم
│   ├── style.css            # ملفات التصميم
│   ├── dashboard.css
│   ├── app.js               # ملفات JavaScript
│   └── dashboard.js
├── backend/                 # الخادم الخلفي
│   ├── server.js            # الخادم الرئيسي
│   ├── routes/              # مسارات API
│   │   ├── auth.js
│   │   ├── ai.js
│   │   └── keys.js
│   └── controllers/         # معالجات البيانات
│       └── userController.js
├── assets/                  # الملفات الثابتة
│   ├── icons/               # أيقونات التطبيق
│   ├── images/              # الصور
│   └── screenshots/         # لقطات الشاشة
├── firebaseConfig.js        # إعدادات Firebase
├── manifest.json            # إعدادات PWA
├── sw.js                    # Service Worker
├── package.json             # تبعيات المشروع
├── .env.example             # مثال متغيرات البيئة
└── README.md                # هذا الملف
```

### 🔒 الأمان

#### حماية البيانات
- تشفير جميع البيانات الحساسة
- استخدام HTTPS في جميع الاتصالات
- حماية من هجمات XSS و CSRF
- تشفير كلمات المرور باستخدام bcrypt

#### حماية API
- نظام Rate Limiting متقدم
- التحقق من صحة المفاتيح
- تتبع الاستخدام والحدود
- حماية من هجمات DDoS

#### حماية المستخدمين
- مصادقة متعددة العوامل
- تشفير المحادثات
- عدم تخزين البيانات الحساسة
- إمكانية حذف البيانات

### 📊 المراقبة والتحليلات

#### مراقبة الأداء
- تتبع وقت الاستجابة
- مراقبة استخدام الذاكرة
- تتبع الأخطاء والاستثناءات
- إحصائيات الاستخدام

#### التحليلات
- إحصائيات المستخدمين
- تحليل المحادثات
- تتبع استخدام API
- تقارير الأداء

### 🚀 التحسينات المستقبلية

#### المميزات المخططة
- دعم المزيد من نماذج الذكاء الاصطناعي
- دعم الصوت والفيديو
- نظام الدردشة الجماعية
- دعم المزيد من اللغات
- تطبيق الهاتف المحمول

#### التحسينات التقنية
- تحسين الأداء
- تحسين الأمان
- تحسين واجهة المستخدم
- تحسين API

### 🤝 المساهمة

نرحب بمساهماتكم! يرجى قراءة دليل المساهمة قبل إرسال Pull Request.

#### كيفية المساهمة
1. Fork المشروع
2. أنشئ branch جديد للميزة
3. قم بالتطوير والاختبار
4. أرسل Pull Request

#### معايير الكود
- اتبع معايير JavaScript ES6+
- استخدم Prettier للتنسيق
- اكتب تعليقات واضحة
- اختبر الكود قبل الإرسال

### 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف LICENSE للتفاصيل.

### 🆘 الدعم والمساعدة

#### الحصول على الدعم
- **GitHub Issues**: للإبلاغ عن الأخطاء وطلب الميزات
- **البريد الإلكتروني**: support@relosity-ai.com
- **الموقع الرسمي**: https://relosity-ai.com
- **التوثيق**: https://docs.relosity-ai.com

#### الأسئلة الشائعة
- **كيف يمكنني الحصول على مفتاح API؟**
  - سجل الدخول إلى لوحة التحكم واذهب إلى قسم "مفاتيح API"

- **هل يمكنني استخدام API مجاناً؟**
  - نعم، لدينا خطة مجانية مع حدود معقولة

- **كيف يمكنني ترقية خطتي؟**
  - اذهب إلى قسم "الإعدادات" > "الفواتير"

### 📈 الإحصائيات

- **المستخدمين النشطين**: 10,000+
- **المحادثات اليومية**: 50,000+
- **وقت التشغيل**: 99.9%
- **رضا العملاء**: 4.8/5

### 🔄 التحديثات

#### الإصدار 1.0.0 (الإصدار الحالي)
- ✅ إطلاق النسخة الأولى
- ✅ نظام مصادقة متكامل
- ✅ واجهة مستخدم حديثة
- ✅ نظام API متطور
- ✅ دعم PWA
- ✅ نظام التعلم الذاتي
- ✅ لوحة تحكم متطورة

#### الإصدار 1.1.0 (قريباً)
- 🔄 دعم المزيد من نماذج AI
- 🔄 تحسينات الأداء
- 🔄 ميزات جديدة للوحة التحكم
- 🔄 تحسينات الأمان

### 📞 التواصل

- **الموقع الرسمي**: https://relosity-ai.com
- **البريد الإلكتروني**: info@relosity-ai.com
- **الدعم الفني**: support@relosity-ai.com
- **المبيعات**: sales@relosity-ai.com
- **GitHub**: https://github.com/relosity-ai
- **Twitter**: @RelosityAI
- **LinkedIn**: Relosity AI Platform

---

**تم تطوير Relosity AI Platform بحب ❤️ لخدمة المجتمع العربي والعالمي**

</div>
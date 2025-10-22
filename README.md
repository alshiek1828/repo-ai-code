# Replit AI Platform

منصة برمجة متكاملة تشبه Replit مع ذكاء اصطناعي - Replit AI Platform

## 🌟 المميزات

### 🎯 محرر أكواد متطور
- **Monaco Editor** مع دعم لغات متعددة (JavaScript, Python, HTML, CSS, TypeScript, JSON, Markdown)
- تلوين الأكواد والإكمال التلقائي
- واجهة داكنة حديثة تشبه VS Code
- دعم الملفات المتعددة مع نظام تبويب

### 🤖 ذكاء اصطناعي مدمج
- تكامل مع **Gemini API** من Google
- مساعد ذكي للبرمجة والشرح
- إصلاح الأخطاء تلقائياً
- اقتراحات كود ذكية
- دردشة تفاعلية مع الذكاء الاصطناعي

### ⚡ تشغيل الأكواد الفوري
- تشغيل أكواد JavaScript مباشرة في المتصفح
- وحدة تحكم (Console) لعرض النتائج
- بيئة آمنة لتشغيل الأكواد
- دعم تشغيل أكواد متعددة اللغات (قريباً)

### 📁 نظام إدارة الملفات
- شجرة ملفات تفاعلية
- إنشاء/تعديل/حذف الملفات والمجلدات
- رفع وتنزيل الملفات
- تصدير المشاريع كملف ZIP

### 👥 التعاون الفوري
- تعاون في الوقت الفعلي باستخدام **Yjs + WebSocket**
- مؤشرات المستخدمين المباشرة
- مزامنة التغييرات فورياً
- دعم عدة مستخدمين في نفس الوقت

### 🎨 واجهة مستخدم حديثة
- تصميم داكن أنيق يشبه Replit
- واجهة متجاوبة تعمل على جميع الأجهزة
- لوحة تحكم جانبية للملفات
- منطقة تحرير في المنتصف
- لوحة دردشة ووحدة تحكم في الجانب الأيمن

## 🚀 التثبيت والتشغيل

### المتطلبات
- Node.js 16+ 
- npm أو yarn
- مفتاح Gemini API (اختياري)

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd replit-ai-platform
```

### 2. تثبيت التبعيات
```bash
# تثبيت تبعيات المشروع الرئيسي
npm install

# تثبيت تبعيات Frontend
cd frontend
npm install
cd ..
```

### 3. إعداد متغيرات البيئة
```bash
# نسخ ملف البيئة
cp .env.example .env

# تعديل ملف .env وإضافة مفاتيح API
nano .env
```

### 4. تشغيل المشروع

#### وضع التطوير (Development)
```bash
# تشغيل Backend و Frontend معاً
npm run dev

# أو تشغيل كل منهما منفصلاً
npm run dev:backend    # Backend على المنفذ 3000
npm run dev:frontend   # Frontend على المنفذ 5173
```

#### وضع الإنتاج (Production)
```bash
# بناء Frontend
npm run build

# تشغيل المشروع
npm start
```

## 🔧 الإعدادات

### متغيرات البيئة المطلوبة

```env
# إعدادات الخادم
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# مفتاح Gemini API (مطلوب للذكاء الاصطناعي)
GEMINI_API_KEY=your-gemini-api-key-here

# إعدادات JWT
JWT_SECRET=your-super-secret-jwt-key-here

# إعدادات رفع الملفات
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# إعدادات تشغيل الأكواد
CODE_TIMEOUT=30000
MAX_MEMORY=128
```

### الحصول على مفتاح Gemini API

1. اذهب إلى [Google AI Studio](https://makersuite.google.com/app/apikey)
2. سجل الدخول بحساب Google
3. اضغط على "Create API Key"
4. انسخ المفتاح وأضفه إلى ملف `.env`

## 🐳 النشر على Railway

### 1. إعداد Railway
```bash
# تثبيت Railway CLI
npm install -g @railway/cli

# تسجيل الدخول
railway login

# إنشاء مشروع جديد
railway init
```

### 2. إعداد متغيرات البيئة
```bash
# إضافة متغيرات البيئة
railway variables set GEMINI_API_KEY=your-api-key
railway variables set JWT_SECRET=your-jwt-secret
railway variables set NODE_ENV=production
```

### 3. النشر
```bash
# رفع المشروع
railway up

# أو استخدام Git
git push origin main
```

### 4. إعدادات إضافية
- تأكد من إعداد `PORT` متغير البيئة في Railway
- قم بتفعيل WebSocket support في إعدادات المشروع
- أضف متغير `FRONTEND_URL` مع رابط المشروع المنشور

## 🏗️ البنية التقنية

### Backend
- **Node.js + Express** - خادم الويب
- **Socket.IO** - WebSocket للتعاون الفوري
- **Yjs** - مكتبة التعاون الفوري
- **Gemini API** - الذكاء الاصطناعي
- **VM2** - تشغيل الأكواد الآمن
- **JSZip** - تصدير المشاريع

### Frontend
- **React 18 + TypeScript** - واجهة المستخدم
- **Vite** - أداة البناء السريع
- **Monaco Editor** - محرر الأكواد
- **Yjs + y-monaco** - التعاون الفوري
- **Socket.IO Client** - اتصال WebSocket
- **Lucide React** - الأيقونات

## 📁 هيكل المشروع

```
replit-ai-platform/
├── backend/
│   ├── routes/           # مسارات API
│   └── server.js         # خادم Express الرئيسي
├── frontend/
│   ├── src/
│   │   ├── components/   # مكونات React
│   │   ├── App.tsx       # التطبيق الرئيسي
│   │   └── main.tsx      # نقطة البداية
│   ├── package.json
│   └── vite.config.ts
├── uploads/              # ملفات المستخدمين
├── package.json
├── Dockerfile
├── railway.json
└── README.md
```

## 🔌 API Endpoints

### Chat & AI
- `POST /api/chat` - محادثة مع الذكاء الاصطناعي
- `POST /api/execute` - تشغيل الأكواد

### File Management
- `GET /api/files/:projectId` - جلب ملفات المشروع
- `POST /api/files/:projectId` - إنشاء ملف جديد
- `PUT /api/files/:projectId` - تحديث ملف
- `DELETE /api/files/:projectId` - حذف ملف

### Export
- `GET /api/export/:projectId` - تصدير المشروع كـ ZIP

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى الفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 🆘 الدعم

إذا واجهت أي مشاكل أو لديك أسئلة:

1. تحقق من [Issues](https://github.com/your-repo/issues) الموجودة
2. أنشئ issue جديد مع وصف مفصل للمشكلة
3. تواصل معنا عبر البريد الإلكتروني

## 🎯 الميزات القادمة

- [ ] دعم لغات برمجة إضافية (Python, Java, C++)
- [ ] نظام إدارة المستخدمين
- [ ] قوالب مشاريع جاهزة
- [ ] تكامل مع GitHub
- [ ] دعم قواعد البيانات
- [ ] نظام الإشعارات
- [ ] تحليلات الاستخدام

---

**تم تطوير هذا المشروع بحب ❤️ لخدمة مجتمع المطورين العرب**

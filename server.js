require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// بيانات مخزنة مؤقتاً في الذاكرة (ممكن تستبدل بقاعدة بيانات)
const usersData = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // لو شغال على https خليها true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware للتحقق من تسجيل دخول الادمن
function checkAuth(req, res, next) {
  if (req.session && req.session.isLoggedIn) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// استقبال بيانات المستخدم من نموذج الموقع العادي
app.post('/api/submit', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  usersData.push({ name, email, phone, receivedAt: new Date() });
  res.json({ message: 'تم استلام البيانات بنجاح' });
});

// تسجيل دخول الادمن
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isLoggedIn = true;
    res.json({ message: 'تم تسجيل الدخول بنجاح' });
  } else {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

// تسجيل خروج الادمن
app.post('/api/admin/logout', checkAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الخروج' });
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  });
});

// جلب بيانات المستخدمين (محمي)
app.get('/api/admin/users', checkAuth, (req, res) => {
  res.json(usersData);
});

// حذف مستخدم معين بناءً على البريد (محمي)
app.delete('/api/admin/user/:email', checkAuth, (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const index = usersData.findIndex(user => user.email === email);
  if (index === -1) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }
  usersData.splice(index, 1);
  res.json({ message: `تم حذف المستخدم ${email} بنجاح` });
});

// صفحة الادمن
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// صفحة الادمن - حماية الوصول لصفحات الادمن
app.get('/admin-dashboard.html', (req, res, next) => {
  if (req.session && req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/admin-login.html');
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

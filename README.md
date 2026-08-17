# Cynet Diagnostika + Online Ustaxona — Web App

Telegram bot ichida ochiladigan **to'liq funksional** web-ilova. Endi
faqat diagnostika emas — botning butun asosiy oqimi:

**📜 Oferta → 🏠 Asosiy menyu → (🔧 Texnikalar / 🔍 Ustaxona topish /
📋 Buyurtma qilish / ℹ️ Biz haqimizda / 📞 Bog'lanish)**

- **🔧 Texnikalar** — 14 texnika turi, 137+ diagnostika holati, matn +
  vizual (elektron sxema iziga o'xshash animatsion qadamlar)
- **🔍 Ustaxona topish** — hudud/tuman/xizmat bo'yicha **haqiqiy**
  ustalarni qidiradi (jonli ma'lumotlar bazasidan), qo'ng'iroq/Telegram
  havolalari bilan
- **📋 Buyurtma qoldirish** — to'liq forma, **haqiqiy** buyurtma
  yaratadi va ustalarga yuboradi (botdagi bilan bir xil broadcast
  mexanizmi orqali)
- UZ/RU til almashtirish, Telegram Web App SDK integratsiyasi
  (orqaga tugmasi, mavzu rangi, haptic feedback)

## Arxitektura

Bu endi **statik sayt emas** — `last.py`dagi mavjud HTTP serverga (Admin
API bilan bir joyda) yangi **ochiq (public) endpointlar** qo'shildi:

```
GET  /api/public/meta
GET  /api/public/topish/viloyatlar
GET  /api/public/topish/tumanlar?viloyat=...
GET  /api/public/order/viloyatlar
GET  /api/public/order/status?init_data=...
POST /api/public/topish/search
POST /api/public/order/create
```

Bu endpointlar `ADMIN_API_TOKEN` talab qilmaydi — o'rniga har bir
so'rovda Telegram Web App yuborgan **`initData`** tekshiriladi
(Telegram'ning rasmiy HMAC-SHA256 algoritmi bilan, bot tokeningiz bilan
imzolangan). Shu tarzda faqat botni Telegram ichidan ochgan haqiqiy
foydalanuvchilar so'rov yubora oladi — tashqi odam browser orqali
to'g'ridan-to'g'ri chaqira olmaydi.

## 1-qadam: `last.py`ni Railway'ga joylashtirish

Yangilangan `last.py`ni odatdagidek Railway'ga push qiling (admin
paneldagi **🚀 GitHub'ga yuklash** bo'limi orqali). Yangi kod avtomatik
ravishda mavjud Admin API server ichida ishga tushadi — alohida
sozlash shart emas.

⚠️ **Muhim:** `BOT_TOKEN` muhit o'zgaruvchisi Railway'da albatta
o'rnatilgan bo'lishi kerak (u allaqachon bor, chunki bot shu orqali
ishlaydi) — initData tekshiruvi shu tokendan foydalanadi.

## 2-qadam: Web-ilova fayllarini joylashtirish (hosting)

Telegram Web App faqat **HTTPS** manzilda ishlaydi.

**GitHub Pages (bepul, eng oddiy)** — bot repo'sidan **alohida, public**
repo yarating (bot kodini oshkor qilmaslik uchun):
1. Yangi public repo yarating (masalan `cynet-diagnostika`)
2. `docs/` papka ichiga `index.html` va `app.js`ni yuklang
3. Repo **Settings → Pages → Source**: `main` branch, `/docs` — saqlang
4. Bir necha daqiqadan so'ng: `https://<username>.github.io/<repo>/`

Bu jarayonni **admin paneldagi 🌐 Diagnostika web-ilova bo'limi**
avtomatlashtiradi (pastga qarang).

## 3-qadam: Web-ilovani generatsiya qilish va push qilish

Admin paneldagi **🌐 Diagnostika web-ilova** bo'limida:

1. **⚙️ Sozlamalar**da to'ldiring:
   - **API URL** — Railway manzilingiz (masalan
     `https://sizning-loyiha.up.railway.app`) — bu maydon Admin API
     uchun ishlatilayotgan bo'lsa, xuddi o'shani web-ilova ham ishlatadi
   - **Webapp papkasi** — kompyuteringizda `index.html`, `app.js`,
     `index_template.html` uchta fayl turgan papka
   - **GitHub repo** — masalan `username/cynet-diagnostika`
   - **GitHub Personal Access Token** — `repo` ruxsati bilan
2. **🔄 last.py'dan yangilash** — `index.html`ni yangi diagnostika
   ma'lumotlari **va** API manzili bilan qayta yaratadi
3. **🌐 Web-ilovani push qilish** — GitHub Pages'ga yuboradi
4. **🔗 Saytni ochish** — tayyor manzilni brauzerda tekshirish uchun

## 4-qadam: Botga ulash

Railway **Variables**'ga qo'shing:
```
WEBAPP_URL=https://<username>.github.io/<repo>/
```

Ixtiyoriy — BotFather orqali doimiy Menu Button sifatida ham
o'rnatish mumkin: `/mybots → botingiz → Bot Settings → Menu Button →
Configure menu button` — shu manzilni kiriting.

## CORS haqida

Web-ilova GitHub Pages'da (boshqa domenda), Railway API esa boshqa
domenda joylashgani uchun barcha `/api/public/*` javoblariga
`Access-Control-Allow-Origin: *` headeri avtomatik qo'shiladi — bu
`last.py`da allaqachon sozlangan, qo'shimcha ish talab qilinmaydi.

## Xavfsizlik eslatmasi

- Ustalarni qidirish va buyurtma yaratish endpointlari faqat haqiqiy,
  Telegram tomonidan imzolangan so'rovlarni qabul qiladi.
- `initData`ning yaroqlilik muddati 24 soat (standart) — undan eski
  so'rovlar avtomatik rad etiladi.
- Ustaxona topish natijalarida telefon raqami ochiq ko'rinadi — bu
  yangi xavfsizlik kamchiligi emas, botning mavjud xatti-harakati bilan
  bir xil (bot chatida ham shunday ko'rsatiladi).

## Ma'lumotni yangilash

Kelajakda `last.py`da diagnostika matnlariga yangi holat qo'shsangiz
yoki xizmatlar/hududlar ro'yxati o'zgarsa: **🔄 last.py'dan yangilash →
🌐 Push qilish** — ikki tugma bosish kifoya, hech narsa qo'lda
tahrirlanmaydi.


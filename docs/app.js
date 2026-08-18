/* ============================================================
   CYNET DIAGNOSTIKA — app logic
   Vanilla JS, no build step. Data comes from #APP_DATA script tag.
============================================================ */
(function(){
  "use strict";

  // ---------- Telegram WebApp bootstrap ----------
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor && tg.setHeaderColor('#0E1116');
      tg.setBackgroundColor && tg.setBackgroundColor('#0E1116');
    } catch(e){}
  }
  function haptic(kind){
    if (!tg || !tg.HapticFeedback) return;
    try{
      if (kind === 'select') tg.HapticFeedback.selectionChanged();
      else if (kind === 'ok') tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.impactOccurred('light');
    }catch(e){}
  }

  // ---------- Data ----------
  var DATA = JSON.parse(document.getElementById('APP_DATA').textContent);
  var CATS = DATA.categories;
  function catById(id){ return CATS.find(function(c){ return c.id === id; }); }

  var API_BASE = (function(){
    var el = document.getElementById('API_BASE');
    try { return JSON.parse(el.textContent) || ''; } catch(e){ return ''; }
  })();

  function getInitData(){
    return (tg && tg.initData) ? tg.initData : '';
  }

  function apiGet(path){
    if (!API_BASE) return Promise.reject(new Error('NO_API_BASE'));
    return fetch(API_BASE + path).then(function(r){ return r.json(); });
  }
  function apiPost(path, body){
    if (!API_BASE) return Promise.reject(new Error('NO_API_BASE'));
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(data){ return { status: r.status, data: data }; });
    });
  }

  function requestLocation(){
    return new Promise(function(resolve){
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        function(pos){ resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
        function(){ resolve(null); },
        { timeout: 8000 }
      );
    });
  }

  // ---------- I18N strings ----------
  var STR = {
    uz: {
      subtitle: "SERVICE CENTER · TOSHKENT",
      heroTitle: "Nosozlikni tanlang, <em>yechimini</em> ko'ring",
      heroDesc: "14 texnika turi bo'yicha diagnostika va batafsil ta'mirlash yo'riqnomasi — Cynet Service Center texniklari tayyorlagan.",
      searchPh: "Texnika turini qidirish...",
      itemsCount: function(n){ return n + " ta holat"; },
      chooseIssue: "Nosozlikni tanlang",
      chooseBrand: "Brendni tanlang",
      choosePrinterType: "Printer turini tanlang",
      errorCodes: "🔢 Xatolik kodlari",
      backHome: "Bosh sahifa",
      diagnosing: "TASHXIS",
      description: "Tavsif",
      solution: "Yechim",
      codesTitle: "Xatolik kodlari",
      home: "Cynet Diagnostika",
      contactMaster: "Ustaga yozish",
      note: "Aniq diagnostika uchun qurilmani ko'zdan kechirish tavsiya etiladi. Murakkab holatlarda Cynet Service Center ustaxonasiga murojaat qiling.",
      notFound: "Hech narsa topilmadi",
      all: "Barchasi",

      // ── Oferta ──
      ofertaTitle: "📜 Ommaviy oferta",
      ofertaAgree: "✅ Qabul qilaman — Davom etish",
      ofertaDecline: "❌ Qabul qilmayman",
      ofertaDeclinedMsg: "Botdan foydalanish uchun shartlarni qabul qilishingiz kerak.",
      ofertaReview: "📜 Shartlarni qayta ko'rish",
      ofertaText:
        "🏢 Online Ustaxona — Cynet kompaniyasi platformasi\n\n" +
        "Botdan foydalanish uchun quyidagi shartlarni o'qing:\n\n" +
        "1️⃣ Ma'lumotlar to'g'riligi\n" +
        "Ustalar o'z ma'lumotlarini to'liq va to'g'ri taqdim etishi shart. Noto'g'ri ma'lumot uchun usta shaxsan javob beradi.\n\n" +
        "2️⃣ Javobgarlik\n" +
        "Online Ustaxona foydalanuvchi va ustalar o'rtasidagi munosabatlar, bajarilgan ishlar sifati hamda oqibatlari uchun javobgarlik olmaydi.\n\n" +
        "3️⃣ Intellektual mulk\n" +
        "Online Ustaxona boti Cynet kompaniyasining mulki. Nusxalash, o'xshash platforma yaratish va tijoriy foydalanish qonunan taqiqlanadi.\n\n" +
        "4️⃣ Elektr xavfsizligi\n" +
        "Texnikani ta'mirlash yoki tekshirishdan oldin albatta elektr tarmog'idan uzing. Elektr toki hayot uchun xavfli!\n\n" +
        "5️⃣ Texnika xavfsizligi\n" +
        "Barcha ta'mirlash ishlarida xavfsizlik qoidalariga qat'iy amal qiling. Xavfli holatlarda faqat mutaxassisga murojaat qiling.\n\n" +
        "6️⃣ Shartlar o'zgarishi\n" +
        "Cynet kompaniyasi platforma shartlarini oldindan xabardor etgan holda o'zgartirish huquqini saqlab qoladi.",

      // ── Asosiy menyu ──
      menuTechs: "🔧 Texnikalar",
      menuTechsSub: "Nosozlikni o'zingiz toping",
      menuTopish: "🔍 Ustaxona topish",
      menuTopishSub: "Hududingizdagi ustalarni ko'ring",
      menuOrder: "📋 Buyurtma qilish",
      menuOrderSub: "Usta chaqiring — bir bosishda",
      menuAbout: "ℹ️ Biz haqimizda",
      menuAboutSub: "Xizmatlar va afzalliklar",
      menuContact: "📞 Bog'lanish",
      menuContactSub: "To'g'ridan murojaat",
      menuProfile: "👤 Mening profilim",
      menuProfileSub: "Buyurtmalar, tahrirlash, to'lov",

      // ── Mening profilim ──
      profileLoading: "Yuklanmoqda...",
      profileMasterTitle: "👤 Mening profilim",
      profileEditBtn: "✏️ Ma'lumotlarni tahrirlash",
      profileJobsBtn: "📋 Bajarilgan ishlarim",
      profileRegion: "Hudud",
      profileServices: "Xizmatlar",
      profileRegisteredAt: "Ro'yxatdan o'tgan",
      profileRating: "Reyting",
      profileNoRating: "Hali baho yo'q",
      profileSubTitle: "📅 Oylik obuna",
      profilePremiumTitle: "🌟 TOP/Reklama",
      profileNotPaid: "⛔ hali to'lanmagan",
      profileNotEnabled: "⛔ yoqilmagan",
      profileActiveUntil: function(d){ return "✅ " + d + " gacha faol"; },

      profileJobsTitle: "📋 Bajarilgan ishlarim",
      profileJobsEmpty: "Sizda hali bajarilgan ish yo'q.",
      profileJobFinishBtn: "✅ Yakunlash",
      prevPage: "⬅️ Oldingi",
      nextPage: "Keyingi ➡️",

      profileEditTitle: "✏️ Ma'lumotlarni tahrirlash",
      profileEditSaveBtn: "💾 Saqlash",
      profileEditSaving: "Saqlanmoqda...",
      profileEditSuccess: "✅ Ma'lumotlar yangilandi",
      profileEditChooseServices: "Xizmatlaringizni tanlang",
      fViloyat: "Hudud", fTuman: "Tuman",

      profileUserTitle: "👤 Mening profilim",
      profileUserOrdersBtn: "📋 Mening buyurtmalarim",
      profileUserName: "Ism",
      profileUserJoined: "Ro'yxatdan o'tgan",
      profileUserRegion: "Hudud",
      profileUserNoRegion: "Hali belgilanmagan",

      profileOrdersTitle: "📋 Mening buyurtmalarim",
      profileOrdersEmpty: "Sizda hali buyurtmalar yo'q.",
      profileOrderMaster: "🧑‍🔧 Usta",
      profileOrderNoMaster: "Hali usta tayinlanmagan",
      profileOrderConfirmAsk: "Hammasi joyidami?",
      profileOrderConfirmYes: "✅ Ha, hammasi joyida",
      profileOrderConfirmNo: "❌ Yo'q, muammo bor",
      profileOrderRateAsk: "Ustani qanday baholaysiz?",
      profileOrderRateSubmit: "Yuborish",
      profileOrderRated: function(n){ return "Siz baho berdingiz: " + '⭐'.repeat(n); },
      profileOrderCommentPh: "Izoh (ixtiyoriy)",
      profileSending: "Yuborilmoqda...",

      // ── Ustaxona topish ──
      topishChooseViloyat: "Hududni tanlang",
      topishChooseTuman: "Tumanni tanlang (ixtiyoriy)",
      topishSkipTuman: "— Butun viloyat —",
      topishChooseXizmat: "Qanday xizmat kerak?",
      topishSearching: "Qidirilmoqda...",
      topishLocBtn: "📍 Joylashuvni yuborish (masofani ko'rish uchun)",
      topishLocGot: "📍 Joylashuv olindi",
      topishNoResults: "usta topilmadi. Boshqa hudud yoki xizmat tanlab ko'ring.",
      topishFound: function(n){ return n + " ta usta topildi"; },
      topishWrite: "Yozish",
      topishNoInitData: "Bu bo'lim faqat Telegram ilovasi ichida ochilganda ishlaydi.",
      topishApiMissing: "Server ulanmagan. Admin bilan bog'laning.",

      // ── Buyurtma qoldirish ──
      orderChecking: "Tekshirilmoqda...",
      orderActiveTitle: "⚠️ Sizda hali yakunlanmagan buyurtma bor",
      orderActiveHint: "Yangi buyurtma berishdan oldin shu buyurtma bo'yicha natijani kuting.",
      orderStatusNew: "🆕 Ustalarga yuborilgan, javob kutilmoqda",
      orderStatusTaken: "🧑‍🔧 Usta qabul qildi, ish jarayonida",
      orderStatusDone: "✅ Usta yakunladi, tasdiqingiz kutilmoqda",
      orderChooseViloyat: "Hududni tanlang",
      orderChooseXizmat: "Qanday texnika/soha bo'yicha usta kerak?",
      orderFormTitle: "Ma'lumotlaringizni kiriting",
      fIsm: "Ism", fFamilya: "Familya", fTel: "Telefon raqam", fMuammo: "Muammo tavsifi", fManzil: "Manzil",
      fIsmPh: "Masalan: Aziz", fFamilyaPh: "Masalan: Karimov", fTelPh: "+998 90 123 45 67",
      fMuammoPh: "Texnikangizga nima bo'lgani haqida qisqacha yozing",
      fManzilPh: "Ko'cha, uy, mo'ljal",
      continueBtn: "Davom etish →",
      orderConfirmTitle: "📝 Buyurtmangizni tekshiring",
      orderConfirmHint: "Hammasi to'g'rimi?",
      orderSubmit: "✅ Tasdiqlash va yuborish",
      orderSubmitting: "Yuborilmoqda...",
      orderSuccessTitle: "✅ Buyurtma qabul qilindi!",
      orderSuccessHint: "Arizangiz mos ustalarga yuborildi. Birinchi javob bergan usta siz bilan bog'lanadi.",
      orderErrGeneric: "Xatolik yuz berdi, keyinroq urinib ko'ring.",
      orderErrPhone: "Telefon raqam noto'g'ri",
      orderErrRequired: "Barcha maydonlarni to'ldiring",
      backToMenu: "🏠 Bosh menyu",
      viloyat: "Hudud", xizmat: "Xizmat", fio: "F.I.",

      // ── Biz haqimizda / Bog'lanish ──
      aboutTitle: "ℹ️ Online Ustaxona",
      aboutText:
        "🏆 Biz kimmiz?\n" +
        "Professional uy texnikalarini ta'mirlash xizmati\n\n" +
        "✅ Xizmatlarimiz:\n" +
        "• Televizor ta'miri\n• Konditsioner xizmati\n• Xolodilnik ta'miri\n" +
        "• Kir yuvish mashinasi\n• Printer ta'miri\n• Kompyuter va noutbuk\n• Va boshqa uy texnikalari\n\n" +
        "⚡ Afzalliklarimiz:\n" +
        "• Tez va sifatli xizmat\n• Kafolat beriladi\n• Uyingizga kelamiz\n• Tajribali ustalar",
      contactTitle: "📞 Bog'lanish",
      contactPhone: "+998 99 009 90 37",
      contactHours: "⏰ Ish vaqti:\nDushanba — Shanba: 9:00 — 20:00\nYakshanba: 10:00 — 18:00",
      contactAddress: "📍 Toshkent shahri",
    },
    ru: {
      subtitle: "СЕРВИС-ЦЕНТР · ТАШКЕНТ",
      heroTitle: "Выберите неисправность — <em>получите</em> решение",
      heroDesc: "Диагностика и подробная инструкция по ремонту для 14 видов техники — подготовлено мастерами Cynet Service Center.",
      searchPh: "Поиск по типу техники...",
      itemsCount: function(n){ return n + " случаев"; },
      chooseIssue: "Выберите неисправность",
      chooseBrand: "Выберите бренд",
      choosePrinterType: "Выберите тип принтера",
      errorCodes: "🔢 Коды ошибок",
      backHome: "На главную",
      diagnosing: "ДИАГНОЗ",
      description: "Описание",
      solution: "Решение",
      codesTitle: "Коды ошибок",
      home: "Cynet Диагностика",
      contactMaster: "Написать мастеру",
      note: "Для точной диагностики рекомендуется осмотр устройства. В сложных случаях обратитесь в сервис-центр Cynet.",
      notFound: "Ничего не найдено",
      all: "Все",

      // ── Оферта ──
      ofertaTitle: "📜 Публичная оферта",
      ofertaAgree: "✅ Принимаю — Продолжить",
      ofertaDecline: "❌ Не принимаю",
      ofertaDeclinedMsg: "Для использования бота необходимо принять условия.",
      ofertaReview: "📜 Пересмотреть условия",
      ofertaText:
        "🏢 Online Ustaxona — платформа компании Cynet\n\n" +
        "Для использования бота прочитайте условия:\n\n" +
        "1️⃣ Достоверность данных\n" +
        "Мастера обязаны предоставлять полные и достоверные данные. За недостоверные данные мастер несёт личную ответственность.\n\n" +
        "2️⃣ Ответственность\n" +
        "Online Ustaxona не несёт ответственности за отношения между пользователями и мастерами, качество и последствия работ.\n\n" +
        "3️⃣ Интеллектуальная собственность\n" +
        "Бот Online Ustaxona является собственностью Cynet. Копирование, создание аналогов и коммерческое использование запрещены законом.\n\n" +
        "4️⃣ Электробезопасность\n" +
        "Перед ремонтом или проверкой техники обязательно отключите её от электросети. Электрический ток опасен для жизни!\n\n" +
        "5️⃣ Техника безопасности\n" +
        "При любых ремонтных работах строго соблюдайте правила безопасности. В опасных ситуациях обращайтесь к специалисту.\n\n" +
        "6️⃣ Изменения условий\n" +
        "Компания Cynet оставляет за собой право изменять условия с предварительным уведомлением пользователей.",

      // ── Главное меню ──
      menuTechs: "🔧 Техника",
      menuTechsSub: "Найдите неисправность сами",
      menuTopish: "🔍 Найти мастерскую",
      menuTopishSub: "Мастера в вашем регионе",
      menuOrder: "📋 Оставить заявку",
      menuOrderSub: "Вызов мастера — в один клик",
      menuAbout: "ℹ️ О нас",
      menuAboutSub: "Услуги и преимущества",
      menuContact: "📞 Связаться",
      menuContactSub: "Прямой контакт",
      menuProfile: "👤 Мой профиль",
      menuProfileSub: "Заявки, редактирование, оплата",

      // ── Мой профиль ──
      profileLoading: "Загрузка...",
      profileMasterTitle: "👤 Мой профиль",
      profileEditBtn: "✏️ Изменить данные",
      profileJobsBtn: "📋 Мои выполненные заказы",
      profileRegion: "Регион",
      profileServices: "Услуги",
      profileRegisteredAt: "Дата регистрации",
      profileRating: "Рейтинг",
      profileNoRating: "Пока нет оценок",
      profileSubTitle: "📅 Ежемесячная подписка",
      profilePremiumTitle: "🌟 TOP/Реклама",
      profileNotPaid: "⛔ не оплачена",
      profileNotEnabled: "⛔ не включена",
      profileActiveUntil: function(d){ return "✅ активна до " + d; },

      profileJobsTitle: "📋 Мои выполненные заказы",
      profileJobsEmpty: "У вас пока нет выполненных заказов.",
      profileJobFinishBtn: "✅ Завершить",
      prevPage: "⬅️ Назад",
      nextPage: "Далее ➡️",

      profileEditTitle: "✏️ Изменить данные",
      profileEditSaveBtn: "💾 Сохранить",
      profileEditSaving: "Сохранение...",
      profileEditSuccess: "✅ Данные обновлены",
      profileEditChooseServices: "Выберите ваши услуги",
      fViloyat: "Регион", fTuman: "Район",

      profileUserTitle: "👤 Мой профиль",
      profileUserOrdersBtn: "📋 Мои заявки",
      profileUserName: "Имя",
      profileUserJoined: "Дата регистрации",
      profileUserRegion: "Регион",
      profileUserNoRegion: "Пока не указан",

      profileOrdersTitle: "📋 Мои заявки",
      profileOrdersEmpty: "У вас пока нет заявок.",
      profileOrderMaster: "🧑‍🔧 Мастер",
      profileOrderNoMaster: "Мастер ещё не назначен",
      profileOrderConfirmAsk: "Всё в порядке?",
      profileOrderConfirmYes: "✅ Да, всё сделано",
      profileOrderConfirmNo: "❌ Нет, проблема осталась",
      profileOrderRateAsk: "Как вы оцените мастера?",
      profileOrderRateSubmit: "Отправить",
      profileOrderRated: function(n){ return "Вы поставили оценку: " + '⭐'.repeat(n); },
      profileOrderCommentPh: "Комментарий (необязательно)",
      profileSending: "Отправка...",

      // ── Найти мастерскую ──
      topishChooseViloyat: "Выберите регион",
      topishChooseTuman: "Выберите район (необязательно)",
      topishSkipTuman: "— Вся область —",
      topishChooseXizmat: "Какая услуга нужна?",
      topishSearching: "Поиск...",
      topishLocBtn: "📍 Отправить геолокацию (чтобы видеть расстояние)",
      topishLocGot: "📍 Геолокация получена",
      topishNoResults: "мастер не найден. Попробуйте другой регион или услугу.",
      topishFound: function(n){ return "Найдено мастеров: " + n; },
      topishWrite: "Написать",
      topishNoInitData: "Этот раздел работает только внутри приложения Telegram.",
      topishApiMissing: "Сервер не подключён. Свяжитесь с администратором.",

      // ── Оставить заявку ──
      orderChecking: "Проверка...",
      orderActiveTitle: "⚠️ У вас есть незавершённая заявка",
      orderActiveHint: "Прежде чем оставить новую заявку, дождитесь результата по этой.",
      orderStatusNew: "🆕 Отправлена мастерам, ожидаем ответ",
      orderStatusTaken: "🧑‍🔧 Мастер принял, работа выполняется",
      orderStatusDone: "✅ Мастер завершил, ожидаем ваше подтверждение",
      orderChooseViloyat: "Выберите регион",
      orderChooseXizmat: "По какой технике/сфере нужен мастер?",
      orderFormTitle: "Введите ваши данные",
      fIsm: "Имя", fFamilya: "Фамилия", fTel: "Номер телефона", fMuammo: "Описание проблемы", fManzil: "Адрес",
      fIsmPh: "Например: Азиз", fFamilyaPh: "Например: Каримов", fTelPh: "+998 90 123 45 67",
      fMuammoPh: "Кратко опишите, что случилось с техникой",
      fManzilPh: "Улица, дом, ориентир",
      continueBtn: "Продолжить →",
      orderConfirmTitle: "📝 Проверьте вашу заявку",
      orderConfirmHint: "Всё верно?",
      orderSubmit: "✅ Подтвердить и отправить",
      orderSubmitting: "Отправка...",
      orderSuccessTitle: "✅ Заявка принята!",
      orderSuccessHint: "Ваша заявка отправлена подходящим мастерам. Первый ответивший свяжется с вами.",
      orderErrGeneric: "Произошла ошибка, попробуйте позже.",
      orderErrPhone: "Неверный номер телефона",
      orderErrRequired: "Заполните все поля",
      backToMenu: "🏠 Главное меню",
      viloyat: "Регион", xizmat: "Услуга", fio: "Ф.И.",

      // ── О нас / Связаться ──
      aboutTitle: "ℹ️ Online Ustaxona",
      aboutText:
        "🏆 Кто мы?\n" +
        "Профессиональный сервис ремонта бытовой техники\n\n" +
        "✅ Наши услуги:\n" +
        "• Ремонт телевизоров\n• Обслуживание кондиционеров\n• Ремонт холодильников\n" +
        "• Стиральные машины\n• Ремонт принтеров\n• Компьютеры и ноутбуки\n• И другая бытовая техника\n\n" +
        "⚡ Наши преимущества:\n" +
        "• Быстро и качественно\n• Гарантия\n• Выезд на дом\n• Опытные мастера",
      contactTitle: "📞 Контакты",
      contactPhone: "+998 99 009 90 37",
      contactHours: "⏰ Режим работы:\nПн — Сб: 9:00 — 20:00\nВс: 10:00 — 18:00",
      contactAddress: "📍 г. Ташкент",
    }
  };

  var OFERTA_KEY = 'cynet_oferta_accepted';

  var state = {
    lang: localStorage.getItem('cynet_lang') || 'uz',
    stack: [{ view: (localStorage.getItem(OFERTA_KEY) === '1') ? 'mainMenu' : 'oferta' }],
    orderForm: {}
  };

  function t(){ return STR[state.lang]; }
  function L(uzKey, ruKey){ return state.lang === 'uz' ? uzKey : ruKey; }
  function pick(obj, base){ return obj[base + '_' + state.lang] || obj[base]; }

  // ---------- Text parser ----------
  // Converts the bot's markdown-lite diagnostic text into structured blocks
  // so we can render description / stepper / bullet-codes / subsections.
  var NUM_EMOJI = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

  function stripBold(s){
    return s.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  }
  function esc(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function inline(s){
    return stripBold(esc(s));
  }

  function parseDiagText(raw){
    var blocks = raw.split(/\n\n+/);
    var out = [];
    blocks.forEach(function(block, i){
      var firstLine = block.split('\n')[0];
      if (i === 0) {
        // title block — skip (we already show label as header)
        return;
      }
      if (firstLine.indexOf('🔍') === 0) {
        var lines = block.split('\n');
        var body = lines.slice(1).join(' ').trim();
        out.push({ type:'desc', text: body });
      } else if (firstLine.indexOf('✅') === 0) {
        var lines2 = block.split('\n');
        var rest = lines2.slice(1).join('\n');
        var parts = rest.split(new RegExp('(?=' + NUM_EMOJI.map(function(e){return e.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('|') + ')'));
        var steps = parts.map(function(p){ return p.trim(); }).filter(Boolean);
        if (steps.length === 0) steps = [rest.trim()];
        out.push({ type:'steps', items: steps });
      } else if (block.indexOf('🔹') === 0 || block.indexOf('🔹') > -1 && firstLine.indexOf('🔹') === 0) {
        var codeLines = block.split('\n').filter(function(l){ return l.trim(); });
        out.push({ type:'codes', items: codeLines });
      } else if (firstLine.indexOf('🔸') === 0) {
        var sublines = block.split('\n');
        var title = sublines[0];
        var bullets = sublines.slice(1).filter(function(l){ return l.trim(); });
        out.push({ type:'subsection', title: title, items: bullets });
      } else {
        out.push({ type:'para', text: block });
      }
    });
    return out;
  }

  function renderStepText(stepRaw){
    // strip leading numeral emoji, return {num, text}
    var num = '';
    var text = stepRaw;
    for (var i=0;i<NUM_EMOJI.length;i++){
      if (stepRaw.indexOf(NUM_EMOJI[i]) === 0){
        num = String(i+1);
        text = stepRaw.slice(NUM_EMOJI[i].length).trim();
        break;
      }
    }
    return { num: num || '•', text: text };
  }

  function blocksToHTML(blocks){
    var html = '';
    blocks.forEach(function(b){
      if (b.type === 'desc') {
        html += '<div class="panel dashed"><div class="ph">🔍 ' + t().description + '</div><p>' + inline(b.text) + '</p></div>';
      } else if (b.type === 'steps') {
        var stepsHtml = b.items.map(function(s, idx){
          var parsed = renderStepText(s);
          return '<div class="tstep" style="animation-delay:' + (idx*90) + 'ms"><div class="node">' + parsed.num + '</div><p>' + inline(parsed.text) + '</p></div>';
        }).join('');
        html += '<div class="panel"><div class="ph warn">✅ ' + t().solution + '</div><div class="trace-steps">' + stepsHtml + '</div></div>';
      } else if (b.type === 'codes') {
        var codesHtml = b.items.map(function(line){
          var m = line.match(/^🔹\s*\*(.+?)\*\s*[—-]\s*(.+)$/);
          if (m) {
            return '<div class="code-item"><span class="chip">' + esc(m[1]) + '</span><p>' + inline(m[2]) + '</p></div>';
          }
          return '<div class="code-item"><p>' + inline(line.replace(/^🔹\s*/, '')) + '</p></div>';
        }).join('');
        html += '<div class="panel"><div class="ph">🔢 ' + t().codesTitle + '</div><div class="code-list">' + codesHtml + '</div></div>';
      } else if (b.type === 'subsection') {
        var bulletsHtml = b.items.map(function(line){
          var clean = line.replace(/^→\s*/, '');
          return '<div class="arrow-item"><span class="ar">→</span><span>' + inline(clean) + '</span></div>';
        }).join('');
        html += '<div class="subsection"><h4>' + inline(b.title.replace(/^🔸\s*/, '')) + '</h4>' + bulletsHtml + '</div>';
      } else if (b.type === 'para') {
        html += '<p class="ptext">' + inline(b.text) + '</p>';
      }
    });
    return html;
  }

  // ---------- Navigation ----------
  var mainView = document.getElementById('mainView');
  var backBtn = document.getElementById('backBtn');
  var crumbrail = document.getElementById('crumbrail');

  function push(entry){
    state.stack.push(entry);
    render();
    if (tg && tg.BackButton) { tg.BackButton.show(); }
  }
  function pop(){
    if (state.stack.length > 1) {
      state.stack.pop();
      render();
      if (tg && tg.BackButton && state.stack.length === 1) { tg.BackButton.hide(); }
    }
  }
  function resetHome(){
    state.stack = [{ view:'mainMenu' }];
    render();
    if (tg && tg.BackButton) tg.BackButton.hide();
  }

  backBtn.addEventListener('click', function(){ haptic('tap'); pop(); });
  if (tg && tg.BackButton) {
    tg.BackButton.onClick(function(){ pop(); });
  }

  document.querySelectorAll('.lang-toggle button').forEach(function(btn){
    btn.addEventListener('click', function(){
      state.lang = btn.getAttribute('data-lang');
      localStorage.setItem('cynet_lang', state.lang);
      document.querySelectorAll('.lang-toggle button').forEach(function(b){ b.classList.toggle('active', b===btn); });
      document.getElementById('brandSub').textContent = t().subtitle;
      haptic('select');
      render();
    });
  });

  // ---------- Renderers per view ----------
  function svgTrace(){
    return '<svg viewBox="0 0 300 34" preserveAspectRatio="none">' +
      '<path class="trace" d="M0 26 L40 26 L52 10 L90 10 L102 26 L160 26 L172 6 L210 6 L222 26 L300 26" />' +
      '</svg>';
  }

  function renderCrumb(){
    var stack = state.stack;
    var segs = [];
    stack.forEach(function(entry, i){
      var label = crumbLabel(entry);
      if (!label) return;
      segs.push('<span class="seg">' + (i>0 ? '<span class="sep">/</span>' : '') + (i===stack.length-1 ? '<b>'+label+'</b>' : label) + '</span>');
    });
    crumbrail.innerHTML = segs.join('');
  }

  function crumbLabel(entry){
    if (entry.view === 'oferta') return t().ofertaTitle;
    if (entry.view === 'mainMenu') return t().home;
    if (entry.view === 'home') return t().menuTechs;
    if (entry.view === 'category') {
      var c = catById(entry.catId);
      return c ? pick(c, 'name') : '';
    }
    if (entry.view === 'printerType') {
      var c2 = catById('printer');
      var st = c2.subtypes.find(function(s){ return s.id === entry.subId; });
      return st ? pick(st, 'name') : '';
    }
    if (entry.view === 'brand') return entry.brandName;
    if (entry.view === 'codesBrand') return entry.brandName;
    if (entry.view === 'issue') return null; // shown as page title, keep crumb short
    if (entry.view === 'topishViloyat' || entry.view === 'orderViloyat') return t().menuTopish;
    if (entry.view === 'topishTuman' || entry.view === 'topishXizmat' || entry.view === 'topishResults') return entry.viloyat;
    if (entry.view === 'orderXizmat' || entry.view === 'orderForm' || entry.view === 'orderConfirm') return entry.viloyat;
    if (entry.view === 'orderGate' || entry.view === 'orderSuccess') return t().menuOrder;
    if (entry.view === 'about') return t().menuAbout;
    if (entry.view === 'contact') return t().menuContact;
    if (entry.view === 'profileGate' || entry.view === 'profileMaster' || entry.view === 'profileUser') return t().menuProfile;
    if (entry.view === 'profileMasterJobs') return t().profileJobsTitle;
    if (entry.view === 'profileEditMaster') return t().profileEditTitle;
    if (entry.view === 'profileUserOrders') return t().profileOrdersTitle;
    return null;
  }

  function renderOferta(){
    mainView.innerHTML =
      '<div class="view"><div class="hero" style="padding-bottom:14px">' +
      '<h1>' + t().ofertaTitle + '</h1></div>' +
      '<div class="oferta-box">' + esc(t().ofertaText) + '</div>' +
      '</div>';
    var bar = document.createElement('div');
    bar.className = 'action-bar';
    bar.style.position = 'static';
    bar.style.background = 'none';
    bar.style.backdropFilter = 'none';
    bar.innerHTML =
      '<button class="btn-ghost" id="ofertaDecline">' + t().ofertaDecline + '</button>' +
      '<button class="btn-primary" id="ofertaAgree">' + t().ofertaAgree + '</button>';
    mainView.querySelector('.view').appendChild(bar);

    mainView.querySelector('#ofertaAgree').addEventListener('click', function(){
      haptic('ok');
      localStorage.setItem(OFERTA_KEY, '1');
      state.stack = [{ view: 'mainMenu' }];
      render();
    });
    mainView.querySelector('#ofertaDecline').addEventListener('click', function(){
      haptic('tap');
      mainView.innerHTML =
        '<div class="view"><div class="empty">' + t().ofertaDeclinedMsg + '</div>' +
        '<button class="btn-ghost" style="width:100%;padding:13px;border-radius:11px" id="ofertaReviewBtn">' +
        t().ofertaReview + '</button></div>';
      mainView.querySelector('#ofertaReviewBtn').addEventListener('click', function(){ render(); });
    });
  }

  function renderMainMenu(){
    var items = [
      { icon:'🔧', title:t().menuTechs, sub:t().menuTechsSub, action:function(){ push({ view:'home' }); } },
      { icon:'🔍', title:t().menuTopish, sub:t().menuTopishSub, accent:true, action:function(){ push({ view:'topishViloyat' }); } },
      { icon:'📋', title:t().menuOrder, sub:t().menuOrderSub, accent:true, action:function(){ push({ view:'orderGate' }); } },
      { icon:'👤', title:t().menuProfile, sub:t().menuProfileSub, accent:true, action:function(){ push({ view:'profileGate' }); } },
      { icon:'ℹ️', title:t().menuAbout, sub:t().menuAboutSub, action:function(){ push({ view:'about' }); } },
      { icon:'📞', title:t().menuContact, sub:t().menuContactSub, action:function(){ push({ view:'contact' }); } },
    ];
    var cardsHtml = items.map(function(it, i){
      var titleClean = it.title.replace(/^\S+\s?/, '');
      return '<button class="menu-card' + (it.accent ? ' accent' : '') + '" data-mi="' + i + '" ' +
        'style="animation:view-in .25s ' + (i*0.04) + 's both">' +
        '<span class="mc-icn">' + it.icon + '</span>' +
        '<span class="mc-body"><span class="mc-title">' + titleClean + '</span>' +
        '<span class="mc-sub">' + it.sub + '</span></span>' +
        '<span class="mc-chev">→</span></button>';
    }).join('');
    mainView.innerHTML =
      '<div class="view"><div class="hero">' +
      '<h1>' + t().home + '</h1>' +
      '<div class="scope-line">' + svgTrace() + '</div>' +
      '</div><div class="menu-grid">' + cardsHtml + '</div></div>';
    mainView.querySelectorAll('[data-mi]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        items[parseInt(btn.getAttribute('data-mi'), 10)].action();
      });
    });
  }

  // ================= USTAXONA TOPISH =================

  function renderTopishViloyat(){
    mainView.innerHTML = '<div class="view"><div class="list-title">🔍 ' + t().menuTopish +
      '<span class="tag">' + t().topishChooseViloyat + '</span></div>' +
      '<div class="list" id="tvList"><div class="empty">' + t().topishSearching + '</div></div></div>';
    if (!API_BASE) {
      mainView.querySelector('#tvList').innerHTML = '<div class="empty">' + t().topishApiMissing + '</div>';
      return;
    }
    apiGet('/api/public/topish/viloyatlar').then(function(res){
      var list = (res && res.viloyatlar) || [];
      var html = list.map(function(v, i){
        return '<button class="row" data-v="' + esc(v) + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
          '<span class="idx">📍</span><span class="lbl">' + esc(v) + '</span><span class="chev">→</span></button>';
      }).join('');
      var listEl = mainView.querySelector('#tvList');
      listEl.innerHTML = html || '<div class="empty">' + t().notFound + '</div>';
      listEl.querySelectorAll('[data-v]').forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic('select');
          push({ view:'topishTuman', viloyat: btn.getAttribute('data-v') });
        });
      });
    }).catch(function(){
      mainView.querySelector('#tvList').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
    });
  }

  function renderTopishTuman(entry){
    mainView.innerHTML = '<div class="view"><div class="list-title">📍 ' + esc(entry.viloyat) +
      '<span class="tag">' + t().topishChooseTuman + '</span></div>' +
      '<div class="list" id="ttList"><div class="empty">' + t().topishSearching + '</div></div></div>';
    apiGet('/api/public/topish/tumanlar?viloyat=' + encodeURIComponent(entry.viloyat)).then(function(res){
      var list = (res && res.tumanlar) || [];
      var skipRow = '<button class="row" data-t="" style="border-color:var(--cyan-dim)">' +
        '<span class="idx">✦</span><span class="lbl"><strong>' + t().topishSkipTuman + '</strong></span><span class="chev">→</span></button>';
      var html = list.map(function(tm, i){
        return '<button class="row" data-t="' + esc(tm) + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
          '<span class="idx">' + String(i+1).padStart(2,'0') + '</span><span class="lbl">' + esc(tm) + '</span><span class="chev">→</span></button>';
      }).join('');
      var listEl = mainView.querySelector('#ttList');
      listEl.innerHTML = skipRow + html;
      listEl.querySelectorAll('[data-t]').forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic('select');
          push({ view:'topishXizmat', viloyat: entry.viloyat, tuman: btn.getAttribute('data-t') || null });
        });
      });
    }).catch(function(){
      mainView.querySelector('#ttList').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
    });
  }

  function renderTopishXizmat(entry){
    var xizmatlar = DATA.xizmatlar || [];
    var rows = xizmatlar.map(function(x, i){
      return '<button class="row" data-x="' + esc(x) + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
        '<span class="idx">' + String(i+1).padStart(2,'0') + '</span><span class="lbl">' + esc(x) + '</span><span class="chev">→</span></button>';
    }).join('');
    mainView.innerHTML = '<div class="view"><div class="list-title">🔧 ' + esc(entry.viloyat) +
      '<span class="tag">' + t().topishChooseXizmat + '</span></div><div class="list">' + rows + '</div></div>';
    mainView.querySelectorAll('[data-x]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        push({ view:'topishResults', viloyat: entry.viloyat, tuman: entry.tuman, xizmat: btn.getAttribute('data-x') });
      });
    });
  }

  function renderTopishResults(entry){
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + esc(entry.xizmat) + '</div>' +
      '<h2>' + esc(entry.viloyat) + (entry.tuman ? ' · ' + esc(entry.tuman) : '') + '</h2>' +
      '</div>' +
      '<button class="loc-btn" id="locBtn">' + t().topishLocBtn + '</button>' +
      '<div id="resultsBox"><div class="empty">' + t().topishSearching + '</div></div>' +
      '</div>';

    var coords = { lat: null, lon: null };

    function doSearch(){
      if (!getInitData()) {
        mainView.querySelector('#resultsBox').innerHTML = '<div class="empty">' + t().topishNoInitData + '</div>';
        return;
      }
      if (!API_BASE) {
        mainView.querySelector('#resultsBox').innerHTML = '<div class="empty">' + t().topishApiMissing + '</div>';
        return;
      }
      apiPost('/api/public/topish/search', {
        init_data: getInitData(), viloyat: entry.viloyat, xizmat: entry.xizmat,
        lat: coords.lat, lon: coords.lon
      }).then(function(res){
        var body = res.data;
        var box = mainView.querySelector('#resultsBox');
        if (!body || !body.ok) {
          box.innerHTML = '<div class="empty">' + (body && body.error ? esc(body.error) : t().orderErrGeneric) + '</div>';
          return;
        }
        var items = body.items || [];
        if (items.length === 0) {
          box.innerHTML = '<div class="empty">😔 ' + t().topishNoResults + '</div>';
          return;
        }
        var header = '<div class="status-badge" style="margin-bottom:12px">' + t().topishFound(items.length) + '</div>';
        var cards = items.map(function(m, i){
          var link = m.username ? ('https://t.me/' + m.username) : ('tg://user?id=' + m.tg_id);
          var ratingHtml = m.rating ? (m.rating + ' <span class="mc-rc">(' + m.rating_count + ')</span>') : '—';
          var initials = esc((m.ism || '?').trim().split(/\s+/).slice(0,2).map(function(w){ return w[0]||''; }).join('').toUpperCase());
          var avatarHtml = m.has_photo && API_BASE
            ? '<img class="mc-avatar-img" src="' + API_BASE + '/api/public/master/photo?tg_id=' + encodeURIComponent(m.tg_id) +
              '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'mc-avatar-fallback\',textContent:\'' + initials + '\'}))">'
            : '<div class="mc-avatar-fallback">' + initials + '</div>';
          var chipsHtml = esc(m.xizmatlar).split(',').map(function(s){ return s.trim(); }).filter(Boolean)
            .map(function(s){ return '<span class="mc-chip">' + s + '</span>'; }).join('');
          return '<div class="master-card' + (m.is_premium ? ' premium' : '') + '" style="animation:view-in .22s ' + (Math.min(i,8)*0.04) + 's both">' +
            (m.is_premium ? '<div class="mc-premium-tag">⭐ PREMIUM</div>' : '') +
            '<div class="mc-top">' +
            '<div class="mc-avatar">' + avatarHtml + '</div>' +
            '<div class="mc-id">' +
            '<div class="mc-name">' + esc(m.ism) + '</div>' +
            '<div class="mc-stats">' +
            '<span class="mc-stat mc-rating">⭐ ' + ratingHtml + '</span>' +
            (m.masofa_km != null ? '<span class="mc-stat">📏 ' + m.masofa_km + ' km</span>' : '') +
            '</div></div></div>' +
            (chipsHtml ? '<div class="mc-chips">' + chipsHtml + '</div>' : '') +
            '<div class="mc-actions">' +
            '<a class="tel" href="tel:' + esc(m.telefon) + '">📞 ' + esc(m.telefon) + '</a>' +
            '<a class="tg" href="' + link + '" target="_blank">✈️ ' + t().topishWrite + '</a>' +
            '</div></div>';
        }).join('');
        box.innerHTML = header + '<div class="master-list">' + cards + '</div>';
      }).catch(function(){
        mainView.querySelector('#resultsBox').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
      });
    }

    mainView.querySelector('#locBtn').addEventListener('click', function(){
      var btn = mainView.querySelector('#locBtn');
      requestLocation().then(function(loc){
        if (loc) {
          coords = loc;
          btn.classList.add('got');
          btn.textContent = t().topishLocGot;
          doSearch();
        }
      });
    });

    doSearch();
  }

  // ================= BUYURTMA QOLDIRISH =================

  function renderOrderGate(){
    mainView.innerHTML = '<div class="view"><div class="empty">' + t().orderChecking + '</div></div>';
    if (!getInitData()) {
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().topishNoInitData + '</div></div>';
      return;
    }
    if (!API_BASE) {
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().topishApiMissing + '</div></div>';
      return;
    }
    apiGet('/api/public/order/status?init_data=' + encodeURIComponent(getInitData())).then(function(res){
      if (res && res.ok && res.order) {
        renderOrderActiveBlock(res.order);
      } else {
        state.stack[state.stack.length - 1] = { view: 'orderViloyat' };
        render();
      }
    }).catch(function(){
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().orderErrGeneric + '</div></div>';
    });
  }

  function renderOrderActiveBlock(order){
    var statusMap = { yangi: t().orderStatusNew, olindi: t().orderStatusTaken, bajarildi: t().orderStatusDone };
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuOrder + '</div>' +
      '<h2>' + t().orderActiveTitle + '</h2></div>' +
      '<div class="panel dashed">' +
      '<div class="summary-row"><span class="k">' + t().viloyat + '</span><span class="v">' + esc(order.viloyat || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().xizmat + '</span><span class="v">' + esc(order.xizmat || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">Status</span><span class="v">' + (statusMap[order.status] || order.status) + '</span></div>' +
      '</div><p class="note">' + t().orderActiveHint + '</p></div>';
  }

  function renderOrderViloyat(){
    mainView.innerHTML = '<div class="view"><div class="list-title">📋 ' + t().menuOrder +
      '<span class="tag">' + t().orderChooseViloyat + '</span></div>' +
      '<div class="list" id="ovList"><div class="empty">' + t().topishSearching + '</div></div></div>';
    apiGet('/api/public/order/viloyatlar').then(function(res){
      var list = (res && res.viloyatlar) || [];
      var html = list.map(function(v, i){
        return '<button class="row" data-v="' + esc(v) + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
          '<span class="idx">📍</span><span class="lbl">' + esc(v) + '</span><span class="chev">→</span></button>';
      }).join('');
      var listEl = mainView.querySelector('#ovList');
      listEl.innerHTML = html || '<div class="empty">' + t().notFound + '</div>';
      listEl.querySelectorAll('[data-v]').forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic('select');
          push({ view:'orderXizmat', viloyat: btn.getAttribute('data-v') });
        });
      });
    }).catch(function(){
      mainView.querySelector('#ovList').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
    });
  }

  function renderOrderXizmat(entry){
    var xizmatlar = DATA.xizmatlar || [];
    var rows = xizmatlar.map(function(x, i){
      return '<button class="row" data-x="' + esc(x) + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
        '<span class="idx">' + String(i+1).padStart(2,'0') + '</span><span class="lbl">' + esc(x) + '</span><span class="chev">→</span></button>';
    }).join('');
    mainView.innerHTML = '<div class="view"><div class="list-title">🔧 ' + esc(entry.viloyat) +
      '<span class="tag">' + t().orderChooseXizmat + '</span></div><div class="list">' + rows + '</div></div>';
    mainView.querySelectorAll('[data-x]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        push({ view:'orderForm', viloyat: entry.viloyat, xizmat: btn.getAttribute('data-x') });
      });
    });
  }

  function renderOrderForm(entry){
    var f = state.orderForm || {};
    mainView.innerHTML =
      '<div class="view"><div class="list-title">📝 ' + t().orderFormTitle + '</div>' +
      '<div class="form-card">' +
      '<div class="field"><label>👤 ' + t().fIsm + '</label><input id="fIsm" value="' + esc(f.ism||'') + '" placeholder="' + t().fIsmPh + '"></div>' +
      '<div class="field"><label>👤 ' + t().fFamilya + '</label><input id="fFamilya" value="' + esc(f.familya||'') + '" placeholder="' + t().fFamilyaPh + '"></div>' +
      '<div class="field"><label>📱 ' + t().fTel + '</label><input id="fTel" type="tel" value="' + esc(f.telefon||'') + '" placeholder="' + t().fTelPh + '"></div>' +
      '<div class="field"><label>🛠️ ' + t().fMuammo + '</label><textarea id="fMuammo" placeholder="' + t().fMuammoPh + '">' + esc(f.muammo||'') + '</textarea></div>' +
      '<div class="field"><label>📍 ' + t().fManzil + '</label><input id="fManzil" value="' + esc(f.manzil||'') + '" placeholder="' + t().fManzilPh + '"></div>' +
      '</div>' +
      '<button class="loc-btn" id="locBtn2">' + (f.lat ? t().topishLocGot : t().topishLocBtn) + '</button>' +
      '</div>';

    if (f.lat) mainView.querySelector('#locBtn2').classList.add('got');
    mainView.querySelector('#locBtn2').addEventListener('click', function(){
      requestLocation().then(function(loc){
        if (loc) {
          state.orderForm.lat = loc.lat; state.orderForm.lon = loc.lon;
          var btn = mainView.querySelector('#locBtn2');
          btn.classList.add('got'); btn.textContent = t().topishLocGot;
        }
      });
    });

    var bar = document.createElement('div');
    bar.className = 'action-bar'; bar.style.position = 'static'; bar.style.background = 'none'; bar.style.backdropFilter = 'none';
    bar.innerHTML = '<button class="btn-primary" id="formNext" style="width:100%">' + t().continueBtn + '</button>';
    mainView.querySelector('.view').appendChild(bar);

    mainView.querySelector('#formNext').addEventListener('click', function(){
      var ism = mainView.querySelector('#fIsm').value.trim();
      var familya = mainView.querySelector('#fFamilya').value.trim();
      var telefon = mainView.querySelector('#fTel').value.trim();
      var muammo = mainView.querySelector('#fMuammo').value.trim();
      var manzil = mainView.querySelector('#fManzil').value.trim();
      var raqam = telefon.replace(/\D/g, '');

      if (!ism || !familya || !muammo || !manzil) {
        alert(t().orderErrRequired);
        return;
      }
      if (raqam.length < 9) {
        alert(t().orderErrPhone);
        return;
      }
      state.orderForm = { ism:ism, familya:familya, telefon:telefon, muammo:muammo, manzil:manzil,
        lat: state.orderForm.lat, lon: state.orderForm.lon };
      haptic('select');
      push({ view:'orderConfirm', viloyat: entry.viloyat, xizmat: entry.xizmat });
    });
  }

  function renderOrderConfirm(entry){
    var f = state.orderForm;
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuOrder + '</div>' +
      '<h2>' + t().orderConfirmTitle + '</h2></div>' +
      '<div class="panel dashed">' +
      '<div class="summary-row"><span class="k">' + t().viloyat + '</span><span class="v">' + esc(entry.viloyat) + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().xizmat + '</span><span class="v">' + esc(entry.xizmat) + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().fio + '</span><span class="v">' + esc(f.familya + ' ' + f.ism) + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().fTel + '</span><span class="v">' + esc(f.telefon) + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().fMuammo + '</span><span class="v">' + esc(f.muammo) + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().fManzil + '</span><span class="v">' + esc(f.manzil) + '</span></div>' +
      '<div class="summary-row"><span class="k">GPS</span><span class="v">' + (f.lat ? '✅' : '⛔') + '</span></div>' +
      '</div><p class="note">' + t().orderConfirmHint + '</p>' +
      '<div id="submitErr"></div>' +
      '</div>';

    var bar = document.createElement('div');
    bar.className = 'action-bar'; bar.style.position = 'static'; bar.style.background = 'none'; bar.style.backdropFilter = 'none';
    bar.innerHTML = '<button class="btn-primary" id="submitOrder" style="width:100%">' + t().orderSubmit + '</button>';
    mainView.querySelector('.view').appendChild(bar);

    mainView.querySelector('#submitOrder').addEventListener('click', function(){
      var btn = mainView.querySelector('#submitOrder');
      btn.disabled = true;
      btn.textContent = t().orderSubmitting;
      apiPost('/api/public/order/create', {
        init_data: getInitData(), lang: state.lang,
        viloyat: entry.viloyat, xizmat: entry.xizmat,
        ism: f.ism, familya: f.familya, telefon: f.telefon, muammo: f.muammo, manzil: f.manzil,
        lat: f.lat, lon: f.lon
      }).then(function(res){
        if (res.data && res.data.ok) {
          haptic('ok');
          state.orderForm = {};
          push({ view:'orderSuccess' });
        } else if (res.data && res.data.error === 'active_order') {
          renderOrderActiveBlock(res.data.order);
        } else {
          btn.disabled = false; btn.textContent = t().orderSubmit;
          mainView.querySelector('#submitErr').innerHTML =
            '<p class="note" style="color:var(--red)">⚠️ ' + (res.data && res.data.error ? esc(res.data.error) : t().orderErrGeneric) + '</p>';
        }
      }).catch(function(){
        btn.disabled = false; btn.textContent = t().orderSubmit;
        mainView.querySelector('#submitErr').innerHTML =
          '<p class="note" style="color:var(--red)">⚠️ ' + t().orderErrGeneric + '</p>';
      });
    });
  }

  function renderOrderSuccess(){
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping" style="background:var(--green)"></span>OK</div>' +
      '<h2>' + t().orderSuccessTitle + '</h2></div>' +
      '<p class="note">' + t().orderSuccessHint + '</p>' +
      '<button class="btn-primary" id="backHomeBtn" style="width:100%;padding:13px;border-radius:11px;margin-top:14px">' +
      t().backToMenu + '</button></div>';
    mainView.querySelector('#backHomeBtn').addEventListener('click', function(){ resetHome(); });
  }

  // ================= BIZ HAQIMIZDA / BOG'LANISH =================

  function renderAbout(){
    mainView.innerHTML =
      '<div class="view"><div class="detail-head"><h2>' + t().aboutTitle + '</h2></div>' +
      '<div class="panel"><p class="ptext" style="white-space:pre-line">' + esc(t().aboutText) + '</p></div>' +
      '<div class="panel dashed"><p class="ptext">' + esc(t().contactAddress) + '<br>📞 ' + esc(t().contactPhone) + '<br>✈️ @online_ustaxona</p></div>' +
      '</div>';
  }

  function renderContact(){
    mainView.innerHTML =
      '<div class="view"><div class="detail-head"><h2>' + t().contactTitle + '</h2></div>' +
      '<div class="panel">' +
      '<p class="ptext" style="font-size:16px;color:var(--text-1);font-weight:600;margin-bottom:10px">' +
      '<a href="tel:' + esc(t().contactPhone.replace(/\s/g,'')) + '" style="color:var(--cyan);text-decoration:none">📞 ' + esc(t().contactPhone) + '</a></p>' +
      '<p class="ptext"><a href="https://t.me/online_ustaxona" target="_blank" style="color:var(--cyan);text-decoration:none">✈️ @online_ustaxona</a></p>' +
      '</div>' +
      '<div class="panel dashed"><p class="ptext" style="white-space:pre-line">' + esc(t().contactHours) + '</p></div>' +
      '</div>';
  }

  // ================= MENING PROFILIM =================

  function jobStatusLabel(status){
    var uz = {
      'yangi': "🆕 Yangi", 'olindi': "🧑‍🔧 Jarayonda",
      'bajarildi': "✅ Yakunlandi (mijoz tasdig'i kutilmoqda)",
      'tasdiqlandi': "✅ Yakunlandi va tasdiqlandi",
      'muammo': "⚠️ Muammo bo'lgan", 'bekor qilindi': "❌ Bekor qilingan",
    };
    var ru = {
      'yangi': "🆕 Новый", 'olindi': "🧑‍🔧 В процессе",
      'bajarildi': "✅ Завершено (ожидает подтверждения)",
      'tasdiqlandi': "✅ Завершено и подтверждено",
      'muammo': "⚠️ Была проблема", 'bekor qilindi': "❌ Отменено",
    };
    var m = (state.lang === 'uz') ? uz : ru;
    return m[status] || status || '—';
  }

  function renderProfileGate(){
    mainView.innerHTML = '<div class="view"><div class="empty">' + t().profileLoading + '</div></div>';
    if (!getInitData()) {
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().topishNoInitData + '</div></div>';
      return;
    }
    if (!API_BASE) {
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().topishApiMissing + '</div></div>';
      return;
    }
    apiGet('/api/public/profile/me?init_data=' + encodeURIComponent(getInitData())).then(function(res){
      if (!res || !res.ok) {
        mainView.innerHTML = '<div class="view"><div class="empty">' + t().orderErrGeneric + '</div></div>';
        return;
      }
      var nextEntry = (res.role === 'master')
        ? { view:'profileMaster', master: res.master }
        : { view:'profileUser', user: res.user };
      state.stack[state.stack.length - 1] = nextEntry;
      render();
    }).catch(function(){
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().orderErrGeneric + '</div></div>';
    });
  }

  function renderProfileMaster(entry){
    var m = entry.master;
    var reyting = m.rating ? ('⭐ ' + m.rating + ' (' + m.rating_count + ')') : ('⭐ ' + t().profileNoRating);
    var subHolat = m.sub_ok ? t().profileActiveUntil(m.sub_until) : t().profileNotPaid;
    var premHolat = m.premium_ok ? t().profileActiveUntil(m.premium_until) : t().profileNotEnabled;
    var manzil = m.viloyat ? (m.viloyat + (m.tuman ? ' — ' + m.tuman : '')) : '—';

    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuProfile + '</div>' +
      '<h2>' + esc(m.ism || '—') + '</h2></div>' +
      '<div class="panel dashed">' +
      '<div class="summary-row"><span class="k">📱</span><span class="v">' + esc(m.telefon || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">🌍 ' + t().profileRegion + '</span><span class="v">' + esc(manzil) + '</span></div>' +
      '<div class="summary-row"><span class="k">🔧 ' + t().profileServices + '</span><span class="v">' + esc(m.xizmatlar || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">🕐 ' + t().profileRegisteredAt + '</span><span class="v">' + esc(m.created_at || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().profileRating + '</span><span class="v">' + reyting + '</span></div>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="summary-row"><span class="k">' + t().profileSubTitle + '</span><span class="v">' + subHolat + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().profilePremiumTitle + '</span><span class="v">' + premHolat + '</span></div>' +
      '</div>' +
      '<div class="profile-actions">' +
      '<button class="row" id="btnEditMaster"><span class="idx">✏️</span><span class="lbl">' + t().profileEditBtn + '</span><span class="chev">→</span></button>' +
      '<button class="row" id="btnMasterJobs"><span class="idx">📋</span><span class="lbl">' + t().profileJobsBtn + '</span><span class="chev">→</span></button>' +
      '</div>' +
      '</div>';

    mainView.querySelector('#btnEditMaster').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileEditMaster', master: m });
    });
    mainView.querySelector('#btnMasterJobs').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileMasterJobs', offset: 0 });
    });
  }

  function renderProfileMasterJobs(entry){
    var offset = entry.offset || 0;
    mainView.innerHTML =
      '<div class="view"><div class="list-title">📋 ' + t().profileJobsTitle + '</div>' +
      '<div id="jobsBox"><div class="empty">' + t().profileLoading + '</div></div></div>';

    apiGet('/api/public/profile/master/jobs?init_data=' + encodeURIComponent(getInitData()) + '&offset=' + offset)
      .then(function(res){
        var box = mainView.querySelector('#jobsBox');
        if (!res || !res.ok) { box.innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>'; return; }
        var items = res.items || [];
        if (items.length === 0 && offset === 0) {
          box.innerHTML = '<div class="empty">📋 ' + t().profileJobsEmpty + '</div>';
          return;
        }
        var cards = items.map(function(j, i){
          var hudud = [j.viloyat, j.tuman].filter(Boolean).join(' / ') || '—';
          var bahoTxt = j.baho ? (' · ⭐ ' + j.baho) : '';
          var finishBtn = (j.status === 'olindi')
            ? '<button class="loc-btn job-finish-btn" data-jid="' + j.id + '" style="margin:10px 0 0">' + t().profileJobFinishBtn + '</button>'
            : '';
          return '<div class="job-card" style="animation:view-in .2s ' + (Math.min(i,8)*0.03) + 's both">' +
            '<div class="job-top"><span class="job-hash">#' + j.id + '</span><span class="job-name">' + esc(j.ism || '') + '</span></div>' +
            '<div class="job-meta"><span>🔧 ' + esc(j.xizmat || '—') + '</span><span>📍 ' + esc(hudud) + '</span></div>' +
            '<div class="job-status">' + jobStatusLabel(j.status) + bahoTxt + '</div>' +
            '<div class="job-time">🕐 ' + esc(j.claimed_at || '—') + '</div>' +
            finishBtn +
            '</div>';
        }).join('');
        var nav = '';
        var hasPrev = offset > 0;
        var hasNext = (offset + (res.limit || 8)) < (res.total || 0);
        if (hasPrev || hasNext) {
          nav = '<div class="page-nav">' +
            (hasPrev ? '<button class="btn-ghost" id="jobsPrev">' + t().prevPage + '</button>' : '<span></span>') +
            (hasNext ? '<button class="btn-ghost" id="jobsNext">' + t().nextPage + '</button>' : '<span></span>') +
            '</div>';
        }
        box.innerHTML = '<div class="job-list">' + cards + '</div>' + nav;

        box.querySelectorAll('.job-finish-btn').forEach(function(btn){
          btn.addEventListener('click', function(){
            var jid = btn.getAttribute('data-jid');
            btn.disabled = true; btn.textContent = t().profileSending;
            apiPost('/api/public/profile/master/job/finish', { init_data: getInitData(), order_id: parseInt(jid,10) })
              .then(function(r2){
                if (r2.data && r2.data.ok) {
                  haptic('ok');
                  state.stack[state.stack.length - 1] = { view:'profileMasterJobs', offset: offset };
                  render();
                } else {
                  alert((r2.data && r2.data.error) || t().orderErrGeneric);
                  btn.disabled = false; btn.textContent = t().profileJobFinishBtn;
                }
              }).catch(function(){
                alert(t().orderErrGeneric);
                btn.disabled = false; btn.textContent = t().profileJobFinishBtn;
              });
          });
        });
        var prevBtn = box.querySelector('#jobsPrev');
        if (prevBtn) prevBtn.addEventListener('click', function(){
          haptic('select');
          state.stack[state.stack.length - 1] = { view:'profileMasterJobs', offset: Math.max(0, offset - (res.limit||8)) };
          render();
        });
        var nextBtn = box.querySelector('#jobsNext');
        if (nextBtn) nextBtn.addEventListener('click', function(){
          haptic('select');
          state.stack[state.stack.length - 1] = { view:'profileMasterJobs', offset: offset + (res.limit||8) };
          render();
        });
      }).catch(function(){
        mainView.querySelector('#jobsBox').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
      });
  }

  function renderProfileEditMaster(entry){
    var m = entry.master;
    mainView.innerHTML =
      '<div class="view"><div class="list-title">✏️ ' + t().profileEditTitle + '</div>' +
      '<div class="form-card">' +
      '<div class="field"><label>👤 ' + t().fIsm + '</label><input id="peIsm" value="' + esc(m.ism||'') + '"></div>' +
      '<div class="field"><label>📱 ' + t().fTel + '</label><input id="peTel" type="tel" value="' + esc(m.telefon||'') + '"></div>' +
      '<div class="field"><label>🌍 ' + t().fViloyat + '</label><select id="peViloyat" class="select-field"></select></div>' +
      '<div class="field"><label>📍 ' + t().fTuman + '</label><select id="peTuman" class="select-field"></select></div>' +
      '<div class="field"><label>🔧 ' + t().profileEditChooseServices + '</label><div class="chip-toggle-list" id="peXizmatlar"></div></div>' +
      '</div>' +
      '<div id="peMsg"></div>' +
      '</div>';

    var bar = document.createElement('div');
    bar.className = 'action-bar'; bar.style.position = 'static'; bar.style.background = 'none'; bar.style.backdropFilter = 'none';
    bar.innerHTML = '<button class="btn-primary" id="peSave" style="width:100%">' + t().profileEditSaveBtn + '</button>';
    mainView.querySelector('.view').appendChild(bar);

    var currentXizmatlar = (m.xizmatlar || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var selectedX = {};
    currentXizmatlar.forEach(function(x){ selectedX[x] = true; });

    apiGet('/api/public/profile/meta').then(function(meta){
      var viloyatSel = mainView.querySelector('#peViloyat');
      viloyatSel.innerHTML = (meta.viloyatlar || []).map(function(v){
        return '<option value="' + esc(v) + '"' + (v === m.viloyat ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('');

      function fillTuman(viloyat, selected){
        var tumanSel = mainView.querySelector('#peTuman');
        var list = (meta.tumanlar && meta.tumanlar[viloyat]) || [];
        tumanSel.innerHTML = '<option value="">—</option>' + list.map(function(tm){
          return '<option value="' + esc(tm) + '"' + (tm === selected ? ' selected' : '') + '>' + esc(tm) + '</option>';
        }).join('');
      }
      fillTuman(m.viloyat, m.tuman);
      viloyatSel.addEventListener('change', function(){ fillTuman(viloyatSel.value, null); });

      var xBox = mainView.querySelector('#peXizmatlar');
      xBox.innerHTML = (meta.xizmatlar || []).map(function(x){
        return '<button type="button" class="chip-toggle' + (selectedX[x] ? ' active' : '') + '" data-x="' + esc(x) + '">' + esc(x) + '</button>';
      }).join('');
      xBox.querySelectorAll('.chip-toggle').forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic('select');
          btn.classList.toggle('active');
        });
      });
    });

    mainView.querySelector('#peSave').addEventListener('click', function(){
      var ism = mainView.querySelector('#peIsm').value.trim();
      var telefon = mainView.querySelector('#peTel').value.trim();
      var viloyat = mainView.querySelector('#peViloyat').value;
      var tuman = mainView.querySelector('#peTuman').value;
      var xizmatlar = Array.prototype.slice.call(mainView.querySelectorAll('.chip-toggle.active')).map(function(b){ return b.getAttribute('data-x'); });

      if (!ism || !telefon || xizmatlar.length === 0) {
        alert(t().orderErrRequired);
        return;
      }
      var saveBtn = mainView.querySelector('#peSave');
      saveBtn.disabled = true; saveBtn.textContent = t().profileEditSaving;

      apiPost('/api/public/profile/master/edit', {
        init_data: getInitData(), ism: ism, telefon: telefon, viloyat: viloyat, tuman: tuman, xizmatlar: xizmatlar
      }).then(function(r){
        if (r.data && r.data.ok) {
          haptic('ok');
          mainView.querySelector('#peMsg').innerHTML = '<p class="note" style="color:var(--green)">' + t().profileEditSuccess + '</p>';
          m.ism = ism; m.telefon = telefon; m.viloyat = viloyat; m.tuman = tuman; m.xizmatlar = xizmatlar.join(', ');
          setTimeout(function(){ pop(); }, 700);
        } else {
          alert((r.data && r.data.error) || t().orderErrGeneric);
          saveBtn.disabled = false; saveBtn.textContent = t().profileEditSaveBtn;
        }
      }).catch(function(){
        alert(t().orderErrGeneric);
        saveBtn.disabled = false; saveBtn.textContent = t().profileEditSaveBtn;
      });
    });
  }

  function renderProfileUser(entry){
    var u = entry.user;
    var name = u.first_name || (u.username ? ('@' + u.username) : '—');
    var region = u.viloyat ? (u.viloyat + (u.tuman ? ' — ' + u.tuman : '')) : t().profileUserNoRegion;

    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuProfile + '</div>' +
      '<h2>' + esc(name) + '</h2></div>' +
      '<div class="panel dashed">' +
      (u.username ? '<div class="summary-row"><span class="k">Telegram</span><span class="v">@' + esc(u.username) + '</span></div>' : '') +
      '<div class="summary-row"><span class="k">🌍 ' + t().profileUserRegion + '</span><span class="v">' + esc(region) + '</span></div>' +
      (u.joined_at ? '<div class="summary-row"><span class="k">🕐 ' + t().profileUserJoined + '</span><span class="v">' + esc(u.joined_at) + '</span></div>' : '') +
      '</div>' +
      '<div class="profile-actions">' +
      '<button class="row" id="btnUserOrders"><span class="idx">📋</span><span class="lbl">' + t().profileUserOrdersBtn + '</span><span class="chev">→</span></button>' +
      '</div>' +
      '</div>';

    mainView.querySelector('#btnUserOrders').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileUserOrders', offset: 0 });
    });
  }

  function renderProfileUserOrders(entry){
    var offset = entry.offset || 0;
    mainView.innerHTML =
      '<div class="view"><div class="list-title">📋 ' + t().profileOrdersTitle + '</div>' +
      '<div id="ordersBox"><div class="empty">' + t().profileLoading + '</div></div></div>';

    apiGet('/api/public/profile/user/orders?init_data=' + encodeURIComponent(getInitData()) + '&offset=' + offset)
      .then(function(res){
        var box = mainView.querySelector('#ordersBox');
        if (!res || !res.ok) { box.innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>'; return; }
        var items = res.items || [];
        if (items.length === 0 && offset === 0) {
          box.innerHTML = '<div class="empty">📋 ' + t().profileOrdersEmpty + '</div>';
          return;
        }
        var cards = items.map(function(o, i){
          var hudud = [o.viloyat, o.tuman].filter(Boolean).join(' / ') || '—';
          var masterHtml = o.master
            ? '<div class="job-meta"><span>' + t().profileOrderMaster + ': ' + esc(o.master.ism || '—') + '</span>' +
              (o.master.telefon ? '<span>📞 ' + esc(o.master.telefon) + '</span>' : '') + '</div>'
            : '<div class="job-meta"><span class="dim">' + t().profileOrderNoMaster + '</span></div>';

          var actionHtml = '';
          if (o.status === 'bajarildi') {
            actionHtml =
              '<div class="order-confirm">' +
              '<p class="note" style="margin-bottom:8px">' + t().profileOrderConfirmAsk + '</p>' +
              '<div class="confirm-row">' +
              '<button class="btn-ghost confirm-btn" data-oid="' + o.id + '" data-yes="0">' + t().profileOrderConfirmNo + '</button>' +
              '<button class="btn-primary confirm-btn" data-oid="' + o.id + '" data-yes="1">' + t().profileOrderConfirmYes + '</button>' +
              '</div></div>';
          } else if (o.status === 'tasdiqlandi' && !o.baho) {
            actionHtml =
              '<div class="order-rate">' +
              '<p class="note" style="margin-bottom:8px">' + t().profileOrderRateAsk + '</p>' +
              '<div class="stars-row" data-oid="' + o.id + '">' +
              [1,2,3,4,5].map(function(s){ return '<button class="star-btn" data-star="' + s + '">⭐</button>'; }).join('') +
              '</div></div>';
          } else if (o.baho) {
            actionHtml = '<div class="job-status">' + t().profileOrderRated(o.baho) + '</div>';
          }

          return '<div class="job-card" style="animation:view-in .2s ' + (Math.min(i,8)*0.03) + 's both">' +
            '<div class="job-top"><span class="job-hash">#' + o.id + '</span></div>' +
            '<div class="job-meta"><span>🔧 ' + esc(o.xizmat || '—') + '</span><span>📍 ' + esc(hudud) + '</span></div>' +
            masterHtml +
            '<div class="job-status">' + jobStatusLabel(o.status) + '</div>' +
            '<div class="job-time">🕐 ' + esc(o.created_at || '—') + '</div>' +
            actionHtml +
            '</div>';
        }).join('');
        var nav = '';
        var hasPrev = offset > 0;
        var hasNext = (offset + (res.limit || 8)) < (res.total || 0);
        if (hasPrev || hasNext) {
          nav = '<div class="page-nav">' +
            (hasPrev ? '<button class="btn-ghost" id="ordersPrev">' + t().prevPage + '</button>' : '<span></span>') +
            (hasNext ? '<button class="btn-ghost" id="ordersNext">' + t().nextPage + '</button>' : '<span></span>') +
            '</div>';
        }
        box.innerHTML = '<div class="job-list">' + cards + '</div>' + nav;

        box.querySelectorAll('.confirm-btn').forEach(function(btn){
          btn.addEventListener('click', function(){
            var oid = parseInt(btn.getAttribute('data-oid'),10);
            var yes = btn.getAttribute('data-yes') === '1';
            var wrap = btn.closest('.order-confirm');
            wrap.innerHTML = '<p class="note">' + t().profileSending + '</p>';
            apiPost('/api/public/profile/user/order/confirm', { init_data: getInitData(), order_id: oid, yes: yes })
              .then(function(r){
                if (r.data && r.data.ok) {
                  haptic('ok');
                  state.stack[state.stack.length - 1] = { view:'profileUserOrders', offset: offset };
                  render();
                } else {
                  alert((r.data && r.data.error) || t().orderErrGeneric);
                }
              }).catch(function(){ alert(t().orderErrGeneric); });
          });
        });

        box.querySelectorAll('.stars-row').forEach(function(row){
          row.querySelectorAll('.star-btn').forEach(function(sbtn){
            sbtn.addEventListener('click', function(){
              var oid = parseInt(row.getAttribute('data-oid'),10);
              var star = parseInt(sbtn.getAttribute('data-star'),10);
              row.parentElement.innerHTML = '<p class="note">' + t().profileSending + '</p>';
              apiPost('/api/public/profile/user/order/rate', { init_data: getInitData(), order_id: oid, baho: star, izoh: '' })
                .then(function(r){
                  if (r.data && r.data.ok) {
                    haptic('ok');
                    state.stack[state.stack.length - 1] = { view:'profileUserOrders', offset: offset };
                    render();
                  } else {
                    alert((r.data && r.data.error) || t().orderErrGeneric);
                  }
                }).catch(function(){ alert(t().orderErrGeneric); });
            });
          });
        });

        var prevBtn = box.querySelector('#ordersPrev');
        if (prevBtn) prevBtn.addEventListener('click', function(){
          haptic('select');
          state.stack[state.stack.length - 1] = { view:'profileUserOrders', offset: Math.max(0, offset - (res.limit||8)) };
          render();
        });
        var nextBtn = box.querySelector('#ordersNext');
        if (nextBtn) nextBtn.addEventListener('click', function(){
          haptic('select');
          state.stack[state.stack.length - 1] = { view:'profileUserOrders', offset: offset + (res.limit||8) };
          render();
        });
      }).catch(function(){
        mainView.querySelector('#ordersBox').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
      });
  }

  function renderHome(){
    var q = (state.homeQuery || '').trim().toLowerCase();
    var filtered = CATS.filter(function(c){
      if (!q) return true;
      var nm = pick(c,'name').toLowerCase();
      return nm.indexOf(q) > -1;
    });
    var cards = filtered.map(function(c, i){
      var count = countForCategory(c);
      return '<button class="cat-card" data-cat="' + c.id + '" style="animation:view-in .3s ' + (i*0.03) + 's both">' +
        '<span class="corner"></span>' +
        '<span class="icn">' + c.icon + '</span>' +
        '<span class="nm">' + pick(c,'name') + '</span>' +
        '<span class="ct">' + t().itemsCount(count) + '</span>' +
        '</button>';
    }).join('');

    mainView.innerHTML =
      '<div class="view">' +
      '<div class="hero">' +
        '<h1>' + t().heroTitle + '</h1>' +
        '<p>' + t().heroDesc + '</p>' +
        '<div class="scope-line">' + svgTrace() + '</div>' +
      '</div>' +
      '<div class="search-wrap"><span class="sic">🔎</span><input id="homeSearch" placeholder="' + t().searchPh + '" value="' + (state.homeQuery||'') + '"></div>' +
      (filtered.length ? '<div class="grid">' + cards + '</div>' : '<div class="empty">' + t().notFound + '</div>') +
      '</div>';

    var search = document.getElementById('homeSearch');
    search.addEventListener('input', function(){
      state.homeQuery = search.value;
      renderHome();
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    });

    mainView.querySelectorAll('.cat-card').forEach(function(card){
      card.addEventListener('click', function(){
        haptic('select');
        openCategory(card.getAttribute('data-cat'));
      });
    });
  }

  function countForCategory(c){
    if (c.type === 'flat' || c.type === 'flat_with_codes') return c.items.length;
    if (c.type === 'single') return 1;
    if (c.type === 'printer') {
      var n = 0;
      c.subtypes.forEach(function(s){ s.brands.forEach(function(b){ n += b.items.length; }); });
      return n;
    }
    return 0;
  }

  function openCategory(id){
    var c = catById(id);
    if (c.type === 'single') {
      push({ view:'issue', mode:'single', catId:id });
      return;
    }
    if (c.type === 'printer') {
      push({ view:'category', catId:id });
      return;
    }
    push({ view:'category', catId:id });
  }

  function renderCategory(entry){
    var c = catById(entry.catId);

    if (c.type === 'printer') {
      var cards = c.subtypes.map(function(s, i){
        var n = s.brands.reduce(function(a,b){return a+b.items.length;}, 0);
        return '<button class="row" data-sub="' + s.id + '" style="animation:view-in .25s ' + (i*0.04) + 's both">' +
          '<span class="idx">0' + (i+1) + '</span><span class="lbl">' + pick(s,'name') + '</span><span class="chev">' + t().itemsCount(n) + ' →</span></button>';
      }).join('');
      mainView.innerHTML = '<div class="view"><div class="list-title">' + c.icon + ' ' + pick(c,'name') + '<span class="tag">' + t().choosePrinterType + '</span></div><div class="list">' + cards + '</div></div>';
      mainView.querySelectorAll('[data-sub]').forEach(function(btn){
        btn.addEventListener('click', function(){ haptic('select'); push({ view:'printerType', catId:c.id, subId: btn.getAttribute('data-sub') }); });
      });
      return;
    }

    // flat / flat_with_codes
    var rows = c.items.map(function(item, i){
      return '<button class="row" data-idx="' + i + '" style="animation:view-in .22s ' + (Math.min(i,10)*0.03) + 's both">' +
        '<span class="idx">' + String(i+1).padStart(2,'0') + '</span>' +
        '<span class="lbl">' + esc(pick(item,'label')) + '</span>' +
        '<span class="chev">→</span></button>';
    }).join('');

    var codesRow = '';
    if (c.type === 'flat_with_codes') {
      codesRow = '<button class="row" data-codes="1" style="border-color:var(--amber-dim)">' +
        '<span class="idx">🔢</span><span class="lbl"><strong>' + t().errorCodes + '</strong></span><span class="chev">→</span></button>';
    }

    mainView.innerHTML = '<div class="view"><div class="list-title">' + c.icon + ' ' + pick(c,'name') + '<span class="tag">' + t().chooseIssue + '</span></div><div class="list">' + rows + codesRow + '</div></div>';

    mainView.querySelectorAll('[data-idx]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        push({ view:'issue', mode:'flat', catId:c.id, idx: parseInt(btn.getAttribute('data-idx'),10) });
      });
    });
    var codesBtn = mainView.querySelector('[data-codes]');
    if (codesBtn) {
      codesBtn.addEventListener('click', function(){
        haptic('select');
        push({ view:'brandCodesList', catId:c.id });
      });
    }
  }

  function renderPrinterType(entry){
    var c = catById(entry.catId);
    var st = c.subtypes.find(function(s){ return s.id === entry.subId; });
    var rows = st.brands.map(function(b, i){
      return '<button class="row brand-row" data-bi="' + i + '" style="animation:view-in .22s ' + (i*0.03) + 's both">' +
        '<span class="idx">' + String(i+1).padStart(2,'0') + '</span>' +
        '<span class="lbl">' + esc(b.name) + '</span>' +
        '<span class="chev">' + b.items.length + ' →</span></button>';
    }).join('');
    mainView.innerHTML = '<div class="view"><div class="list-title">🖨️ ' + pick(st,'name') + '<span class="tag">' + t().chooseBrand + '</span></div><div class="list">' + rows + '</div></div>';
    mainView.querySelectorAll('[data-bi]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        push({ view:'brand', catId:c.id, subId: st.id, brandIdx: parseInt(btn.getAttribute('data-bi'),10), brandName: st.brands[parseInt(btn.getAttribute('data-bi'),10)].name });
      });
    });
  }

  function renderBrand(entry){
    var c = catById(entry.catId);
    var st = c.subtypes.find(function(s){ return s.id === entry.subId; });
    var brand = st.brands[entry.brandIdx];
    var rows = brand.items.map(function(item, i){
      return '<button class="row" data-idx="' + i + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
        '<span class="idx">' + String(i+1).padStart(2,'0') + '</span>' +
        '<span class="lbl">' + esc(pick(item,'label')) + '</span>' +
        '<span class="chev">→</span></button>';
    }).join('');
    mainView.innerHTML = '<div class="view"><div class="list-title">' + brand.name + '<span class="tag">' + t().chooseIssue + '</span></div><div class="list">' + rows + '</div></div>';
    mainView.querySelectorAll('[data-idx]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        push({ view:'issue', mode:'printer', catId:c.id, subId: st.id, brandIdx: entry.brandIdx, brandName: brand.name, idx: parseInt(btn.getAttribute('data-idx'),10) });
      });
    });
  }

  function renderBrandCodesList(entry){
    var c = catById(entry.catId);
    var rows = c.codes.brands.map(function(b, i){
      return '<button class="row brand-row" data-bi="' + i + '" style="animation:view-in .2s ' + (i*0.03) + 's both">' +
        '<span class="idx">🔢</span><span class="lbl">' + esc(b.name) + '</span><span class="chev">→</span></button>';
    }).join('');
    mainView.innerHTML = '<div class="view"><div class="list-title">🔢 ' + t().errorCodes + '<span class="tag">' + t().chooseBrand + '</span></div><div class="list">' + rows + '</div></div>';
    mainView.querySelectorAll('[data-bi]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        var i = parseInt(btn.getAttribute('data-bi'),10);
        push({ view:'codesBrand', catId:c.id, brandIdx:i, brandName: c.codes.brands[i].name });
      });
    });
  }

  function renderCodesBrand(entry){
    var c = catById(entry.catId);
    var brand = c.codes.brands[entry.brandIdx];
    var raw = pick(brand, 'text');
    var blocksHtml = codesTextToHTML(raw);
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().diagnosing + '</div>' +
      '<h2>' + esc(brand.name) + '</h2>' +
      '</div>' + blocksHtml +
      '<p class="note">ℹ️ ' + t().note + '</p></div>';
  }

  function codesTextToHTML(raw){
    // format: title line, blank, then 🔹 *CODE* — description lines (no blank between)
    var lines = raw.split('\n').filter(function(l){ return l.trim(); });
    var items = lines.filter(function(l){ return l.indexOf('🔹') === 0; });
    var codesHtml = items.map(function(line){
      var m = line.match(/^🔹\s*\*(.+?)\*\s*[—-]\s*(.+)$/);
      if (m) return '<div class="code-item"><span class="chip">' + esc(m[1]) + '</span><p>' + inline(m[2]) + '</p></div>';
      return '<div class="code-item"><p>' + inline(line.replace(/^🔹\s*/, '')) + '</p></div>';
    }).join('');
    return '<div class="panel"><div class="ph">🔢 ' + t().codesTitle + '</div><div class="code-list">' + codesHtml + '</div></div>';
  }

  function renderIssue(entry){
    var c = catById(entry.catId);
    var item, raw, label;

    if (entry.mode === 'single') {
      label = pick(c, 'name');
      raw = pick(c, 'text');
    } else if (entry.mode === 'flat') {
      item = c.items[entry.idx];
      label = pick(item, 'label');
      raw = pick(item, 'text');
    } else if (entry.mode === 'printer') {
      var st = c.subtypes.find(function(s){ return s.id === entry.subId; });
      var brand = st.brands[entry.brandIdx];
      item = brand.items[entry.idx];
      label = pick(item, 'label');
      raw = pick(item, 'text');
    }

    var blocks = parseDiagText(raw);
    var html = blocksToHTML(blocks);

    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().diagnosing + '</div>' +
      '<h2>' + esc(label.replace(/^\S+\s/, function(m){ return ''; }) || label) + '</h2>' +
      '</div>' + html +
      '<p class="note">ℹ️ ' + t().note + '</p></div>';
  }

  // ---------- Master render dispatcher ----------
  function render(){
    var entry = state.stack[state.stack.length - 1];
    backBtn.classList.toggle('show', state.stack.length > 1);
    renderCrumb();
    window.scrollTo(0,0);

    if (entry.view === 'oferta') renderOferta();
    else if (entry.view === 'mainMenu') renderMainMenu();
    else if (entry.view === 'home') renderHome();
    else if (entry.view === 'category') renderCategory(entry);
    else if (entry.view === 'printerType') renderPrinterType(entry);
    else if (entry.view === 'brand') renderBrand(entry);
    else if (entry.view === 'brandCodesList') renderBrandCodesList(entry);
    else if (entry.view === 'codesBrand') renderCodesBrand(entry);
    else if (entry.view === 'issue') renderIssue(entry);
    else if (entry.view === 'topishViloyat') renderTopishViloyat(entry);
    else if (entry.view === 'topishTuman') renderTopishTuman(entry);
    else if (entry.view === 'topishXizmat') renderTopishXizmat(entry);
    else if (entry.view === 'topishResults') renderTopishResults(entry);
    else if (entry.view === 'orderGate') renderOrderGate(entry);
    else if (entry.view === 'orderViloyat') renderOrderViloyat(entry);
    else if (entry.view === 'orderXizmat') renderOrderXizmat(entry);
    else if (entry.view === 'orderForm') renderOrderForm(entry);
    else if (entry.view === 'orderConfirm') renderOrderConfirm(entry);
    else if (entry.view === 'orderSuccess') renderOrderSuccess(entry);
    else if (entry.view === 'about') renderAbout();
    else if (entry.view === 'contact') renderContact();
    else if (entry.view === 'profileGate') renderProfileGate();
    else if (entry.view === 'profileMaster') renderProfileMaster(entry);
    else if (entry.view === 'profileMasterJobs') renderProfileMasterJobs(entry);
    else if (entry.view === 'profileEditMaster') renderProfileEditMaster(entry);
    else if (entry.view === 'profileUser') renderProfileUser(entry);
    else if (entry.view === 'profileUserOrders') renderProfileUserOrders(entry);
  }

  // init lang buttons to reflect stored pref
  document.querySelectorAll('.lang-toggle button').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-lang') === state.lang);
  });
  document.getElementById('brandSub').textContent = t().subtitle;

  render();
})();

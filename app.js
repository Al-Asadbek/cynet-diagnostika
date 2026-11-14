/* ============================================================
   ONLINE USTAXONA DIAGNOSTIKA — app logic
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
      tg.setHeaderColor && tg.setHeaderColor('#07080d');
      tg.setBackgroundColor && tg.setBackgroundColor('#07080d');
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
    return fetch(API_BASE + path, { cache: 'no-store' }).then(function(r){ return r.json(); });
  }
  // Eski server versiyasi ommaviy yo'nalishni bilmasa "Token noto'g'ri" qaytaradi —
  // foydalanuvchiga tushunarli xabar ko'rsatamiz.
  function fixApiError(status, data){
    if (data && (status === 404 || (status === 401 && data.error === "Token noto'g'ri"))) {
      data.error = (state && state.lang === 'ru')
        ? 'Сервер не обновлён: эта функция пока недоступна. Сообщите администратору.'
        : "Server yangilanmagan: bu funksiya hali ishlamaydi. Administratorga xabar bering.";
    }
    return data;
  }
  function apiPost(path, body){
    if (!API_BASE) return Promise.reject(new Error('NO_API_BASE'));
    return fetch(API_BASE + path, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(data){ return { status: r.status, data: fixApiError(r.status, data) }; });
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
      subtitle: "DIAGNOSTIKA · TOSHKENT",
      heroTitle: "Nosozlikni tanlang, <em>yechimini</em> ko'ring",
      heroDesc: "14 texnika turi bo'yicha diagnostika va batafsil ta'mirlash yo'riqnomasi — Online Ustaxona texniklari tayyorlagan.",
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
      illusTitle: "Ko'rgazmali animatsiya",
      videoTitle: "Video ko'rsatma",
      videoOpen: "Videoni ochish",
      priceTitle: "Taxminiy ta'mirlash narxi",
      priceBtn: "Narxni ko'rish",
      priceNone: "Narx hali kiritilmagan. Aniq narxni usta tashxisdan keyin aytadi.",
      home: "Online Ustaxona Diagnostika",
      contactMaster: "Ustaga yozish",
      note: "Aniq diagnostika uchun qurilmani ko'zdan kechirish tavsiya etiladi. Murakkab holatlarda Online Ustaxona ustalariga murojaat qiling.",
      notFound: "Hech narsa topilmadi",
      all: "Barchasi",

      // ── Oferta ──
      ofertaTitle: "📜 Ommaviy oferta",
      ofertaAgree: "✅ Qabul qilaman — Davom etish",
      ofertaDecline: "❌ Qabul qilmayman",
      ofertaDeclinedMsg: "Botdan foydalanish uchun shartlarni qabul qilishingiz kerak.",
      ofertaReview: "📜 Shartlarni qayta ko'rish",
      ofertaText:
        "🏢 Online Ustaxona platformasi\n\n" +
        "Botdan foydalanish uchun quyidagi shartlarni o'qing:\n\n" +
        "1️⃣ Ma'lumotlar to'g'riligi\n" +
        "Ustalar o'z ma'lumotlarini to'liq va to'g'ri taqdim etishi shart. Noto'g'ri ma'lumot uchun usta shaxsan javob beradi.\n\n" +
        "2️⃣ Javobgarlik\n" +
        "Online Ustaxona foydalanuvchi va ustalar o'rtasidagi munosabatlar, bajarilgan ishlar sifati hamda oqibatlari uchun javobgarlik olmaydi.\n\n" +
        "3️⃣ Intellektual mulk\n" +
        "Ushbu bot Online Ustaxona platformasining mulki. Nusxalash, o'xshash platforma yaratish va tijoriy foydalanish qonunan taqiqlanadi.\n\n" +
        "4️⃣ Elektr xavfsizligi\n" +
        "Texnikani ta'mirlash yoki tekshirishdan oldin albatta elektr tarmog'idan uzing. Elektr toki hayot uchun xavfli!\n\n" +
        "5️⃣ Texnika xavfsizligi\n" +
        "Barcha ta'mirlash ishlarida xavfsizlik qoidalariga qat'iy amal qiling. Xavfli holatlarda faqat mutaxassisga murojaat qiling.\n\n" +
        "6️⃣ Shartlar o'zgarishi\n" +
        "Online Ustaxona platforma shartlarini oldindan xabardor etgan holda o'zgartirish huquqini saqlab qoladi.",

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
      profileNewOrdersBtn: "🆕 Kelgan buyurtmalar",
      profileJobsBtn: "📋 Bajarilgan ishlarim",
      profileStatsBtn: "📊 Statistika",
      statsTitle: "📊 Statistika",
      statsLoading: "Yuklanmoqda...",
      statsErr: "Statistikani yuklab bo'lmadi",
      statsTabDaily: "Kunlik", statsTabWeekly: "Haftalik", statsTabMonthly: "Oylik",
      statsTotalJobs: "Jami bajarilgan ish", statsAvgRating: "O'rtacha reyting",
      statsComplaints: "Shikoyatlar", statsAvgResponse: "O'rtacha javob vaqti",
      statsMinutes: "daq", statsHours: "soat",
      statsNoData: "Hali ma'lumot yo'q",
      statsServiceTitle: "🧰 Texnika turi bo'yicha",
      statsRatingDistTitle: "⭐ Baholar taqsimoti",
      statsWeekdayTitle: "📅 Hafta kunlari bo'yicha faollik",
      statsJobsUnit: "ta ish",
      statsWeekdayShort: ["Du","Se","Cho","Pay","Ju","Sha","Ya"],
      profileAvailTitle: "Bugungi holatingiz",
      profileAvailFree: "🟢 Band emasman",
      profileAvailBusy: "🔴 Bandman",
      profileAvailHint: "Mijozlar \"Ustaxona topish\"da holatingizni ko'radi",
      profileAvailFreeSub: "Mijozlar hoziroq murojaat qilishi mumkin",
      profileAvailBusySub: "Qidiruv natijalarida pastroqda ko'rinasiz",
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

      profileNewOrdersTitle: "🆕 Kelgan buyurtmalar",
      profileNewOrdersEmpty: "Hozircha yangi buyurtma yo'q.",
      profileNewOrdersHint: "Mijozning ismi va telefoni faqat buyurtmani qabul qilgach ko'rinadi.",
      profileNewOrderAcceptBtn: "✅ Qabul qilish",
      profileNewOrderAccepting: "Qabul qilinmoqda...",
      profileNewOrderTakenErr: "😔 Kechirasiz, bu buyurtmani boshqa usta allaqachon oldi.",
      profileNewOrderAcceptedTitle: "🎉 Buyurtma qabul qilindi!",
      profileNewOrderAcceptedOk: "Tushunarli",
      photoAttached: "📸 Surat biriktirilgan",
      viewOnMap: "Xaritada ko'rish",

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
      topishBusy: "🔴 Hozir band",
      topishFree: "🟢 Band emas",
      complainBtn: "⚠️ Shikoyat",
      complainTitle: "⚠️ Shikoyat qoldirish",
      complainOn: function(name){ return "Usta: " + name; },
      complainPh: "Shikoyatingizni batafsil yozing...",
      complainSend: "Yuborish",
      complainCancel: "Bekor qilish",
      complainTooShort: "Shikoyat matni juda qisqa (kamida 5 belgi).",
      complainSent: "✅ Shikoyatingiz qabul qilindi. Tez orada ko'rib chiqamiz.",
      complainErr: "Yuborishda xatolik. Birozdan so'ng qayta urinib ko'ring.",
      topishNoInitData: "Bu bo'lim faqat Telegram ilovasi ichida ochilganda ishlaydi.",
      topishApiMissing: "Server ulanmagan. Admin bilan bog'laning.",

      // ── Buyurtma qoldirish ──
      orderChecking: "Tekshirilmoqda...",
      orderActiveTitle: "⚠️ Sizda hali yakunlanmagan buyurtma bor",
      orderActiveHint: "Yangi buyurtma berishdan oldin shu buyurtma bo'yicha natijani kuting.",
      orderStatusNew: "🆕 Ustalarga yuborilgan, javob kutilmoqda",
      orderStatusTaken: "🧑‍🔧 Usta qabul qildi, ish jarayonida",
      orderStatusDone: "✅ Usta yakunladi, tasdiqingiz kutilmoqda",
      orderStatusConfirmed: "✅ Tasdiqlandi",
      orderStepNew: "Qabul qilindi", orderStepTaken: "Ustaga biriktirildi",
      orderStepDone: "Ish bajarildi", orderStepConfirmed: "Yakunlandi",
      orderMasterTitle: "🧑‍🔧 Sizga biriktirilgan usta",
      orderPhotoLabel: "📷 Nosozlik surati (ixtiyoriy)",
      orderPhotoHint: "Ustaga oldindan tushunarli bo'lishi uchun surat qo'shing",
      orderPhotoGot: "✅ Rasm biriktirildi",
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

      // ── Anketa to'ldirish (usta bo'lish) ──
      menuAnketa: "📝 Anketani to'ldirish",
      menuAnketaSub: "Usta sifatida ro'yxatdan o'ting",
      anketaChecking: "Tekshirilmoqda...",
      anketaAlreadyActiveTitle: "✅ Siz allaqachon ro'yxatdan o'tgan ustasiz!",
      anketaAlreadyActiveHint: "Ma'lumotlaringizni o'zgartirish uchun \"Mening profilim\" bo'limidan foydalaning.",
      anketaAlreadyPendingTitle: "⏳ Anketangiz ko'rib chiqilmoqda",
      anketaAlreadyPendingHint: "Qayta yuborishning hojati yo'q — admin tez orada javob beradi.",
      anketaAlreadyRejectedTitle: "❌ Anketangiz avval rad etilgan",
      anketaAlreadyRejectedHint: "Qayta yuborish mumkin emas. Savol bo'lsa: @online_ustaxona",
      anketaChooseViloyat: "Qaysi hududda ishlaysiz?",
      anketaChooseTuman: "Qaysi tuman(lar)da xizmat ko'rsatasiz?",
      anketaTumanHint: "Bir nechtasini tanlashingiz mumkin",
      anketaFormTitle: "📝 Anketa ma'lumotlari",
      fYil: "Tug'ilgan yil", fYilPh: "Masalan: 1995",
      fPasport: "Pasport seriya va raqami", fPasportPh: "Masalan: AC1234567",
      fPasportHint: "Faqat shartnoma va identifikatsiya uchun, mijozlarga ko'rsatilmaydi",
      anketaChooseServices: "Ko'rsatadigan xizmatlaringiz",
      anketaPhotoLabel: "O'z suratingiz",
      anketaPhotoHint: "Yuklash uchun bosing",
      anketaPhotoGot: "✅ Rasm tanlandi",
      anketaLocHint: "Ish faoliyatingiz manzili (ixtiyoriy) — mijozlar yaqinlikka qarab topadi",
      anketaErrRequired: "Barcha maydonlarni to'ldiring",
      anketaErrYil: "Tug'ilgan yilni to'g'ri kiriting (1950-2005)",
      anketaErrPasport: "Pasport seriya/raqamini to'g'ri kiriting",
      anketaErrPhoto: "Iltimos, suratingizni yuklang",
      anketaContractTitle: "📜 Xizmat ko'rsatishda vositachilik shartnomasi",
      anketaContractHint: "Davom etishdan oldin shartnoma bilan tanishib chiqing",
      anketaContractAgree: "✅ Roziman va imzolayman",
      anketaContractDecline: "❌ Rad etaman",
      anketaContractDeclinedMsg: "Shartnoma imzolanmasdan turib usta sifatida ro'yxatdan o'tib bo'lmaydi.",
      anketaSubmitting: "Yuborilmoqda...",
      anketaSuccessTitle: "✅ Anketa qabul qilindi!",
      anketaSuccessHint: "Anketangiz adminlarga yuborildi. Ko'rib chiqish vaqti — 1-2 ish kuni.",
      anketaBecomeMaster: "📝 Usta sifatida ro'yxatdan o'tish",

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
      subtitle: "ДИАГНОСТИКА · ТАШКЕНТ",
      heroTitle: "Выберите неисправность — <em>получите</em> решение",
      heroDesc: "Диагностика и подробная инструкция по ремонту для 14 видов техники — подготовлено мастерами Online Ustaxona.",
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
      illusTitle: "Наглядная анимация",
      videoTitle: "Видео инструкция",
      videoOpen: "Открыть видео",
      priceTitle: "Примерная стоимость ремонта",
      priceBtn: "Узнать цену",
      priceNone: "Цена пока не указана. Точную цену мастер назовёт после диагностики.",
      home: "Online Ustaxona Диагностика",
      contactMaster: "Написать мастеру",
      note: "Для точной диагностики рекомендуется осмотр устройства. В сложных случаях обратитесь к мастерам Online Ustaxona.",
      notFound: "Ничего не найдено",
      all: "Все",

      // ── Оферта ──
      ofertaTitle: "📜 Публичная оферта",
      ofertaAgree: "✅ Принимаю — Продолжить",
      ofertaDecline: "❌ Не принимаю",
      ofertaDeclinedMsg: "Для использования бота необходимо принять условия.",
      ofertaReview: "📜 Пересмотреть условия",
      ofertaText:
        "🏢 Платформа Online Ustaxona\n\n" +
        "Для использования бота прочитайте условия:\n\n" +
        "1️⃣ Достоверность данных\n" +
        "Мастера обязаны предоставлять полные и достоверные данные. За недостоверные данные мастер несёт личную ответственность.\n\n" +
        "2️⃣ Ответственность\n" +
        "Online Ustaxona не несёт ответственности за отношения между пользователями и мастерами, качество и последствия работ.\n\n" +
        "3️⃣ Интеллектуальная собственность\n" +
        "Данный бот является собственностью платформы Online Ustaxona. Копирование, создание аналогов и коммерческое использование запрещены законом.\n\n" +
        "4️⃣ Электробезопасность\n" +
        "Перед ремонтом или проверкой техники обязательно отключите её от электросети. Электрический ток опасен для жизни!\n\n" +
        "5️⃣ Техника безопасности\n" +
        "При любых ремонтных работах строго соблюдайте правила безопасности. В опасных ситуациях обращайтесь к специалисту.\n\n" +
        "6️⃣ Изменения условий\n" +
        "Online Ustaxona оставляет за собой право изменять условия с предварительным уведомлением пользователей.",

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
      profileNewOrdersBtn: "🆕 Новые заказы",
      profileJobsBtn: "📋 Мои выполненные заказы",
      profileStatsBtn: "📊 Статистика",
      statsTitle: "📊 Статистика",
      statsLoading: "Загрузка...",
      statsErr: "Не удалось загрузить статистику",
      statsTabDaily: "По дням", statsTabWeekly: "По неделям", statsTabMonthly: "По месяцам",
      statsTotalJobs: "Всего выполнено", statsAvgRating: "Средний рейтинг",
      statsComplaints: "Жалобы", statsAvgResponse: "Среднее время ответа",
      statsMinutes: "мин", statsHours: "ч",
      statsNoData: "Пока нет данных",
      statsServiceTitle: "🧰 По типу техники",
      statsRatingDistTitle: "⭐ Распределение оценок",
      statsWeekdayTitle: "📅 Активность по дням недели",
      statsJobsUnit: "зак.",
      statsWeekdayShort: ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],
      profileAvailTitle: "Ваш статус сегодня",
      profileAvailFree: "🟢 Я свободен",
      profileAvailBusy: "🔴 Я занят",
      profileAvailHint: "Клиенты видят ваш статус в разделе \"Найти мастерскую\"",
      profileAvailFreeSub: "Клиенты могут обратиться прямо сейчас",
      profileAvailBusySub: "В результатах поиска будете показаны ниже",
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

      profileNewOrdersTitle: "🆕 Новые заказы",
      profileNewOrdersEmpty: "Пока нет новых заказов.",
      profileNewOrdersHint: "Имя и телефон клиента видны только после принятия заказа.",
      profileNewOrderAcceptBtn: "✅ Принять",
      profileNewOrderAccepting: "Принимается...",
      profileNewOrderTakenErr: "😔 Извините, этот заказ уже принял другой мастер.",
      profileNewOrderAcceptedTitle: "🎉 Заказ принят!",
      profileNewOrderAcceptedOk: "Понятно",
      photoAttached: "📸 Фото прикреплено",
      viewOnMap: "Посмотреть на карте",

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
      topishBusy: "🔴 Сейчас занят",
      topishFree: "🟢 Свободен",
      complainBtn: "⚠️ Жалоба",
      complainTitle: "⚠️ Подать жалобу",
      complainOn: function(name){ return "Мастер: " + name; },
      complainPh: "Опишите вашу жалобу подробно...",
      complainSend: "Отправить",
      complainCancel: "Отмена",
      complainTooShort: "Текст жалобы слишком короткий (минимум 5 символов).",
      complainSent: "✅ Ваша жалоба принята. Мы скоро её рассмотрим.",
      complainErr: "Ошибка отправки. Попробуйте немного позже.",
      topishNoInitData: "Этот раздел работает только внутри приложения Telegram.",
      topishApiMissing: "Сервер не подключён. Свяжитесь с администратором.",

      // ── Оставить заявку ──
      orderChecking: "Проверка...",
      orderActiveTitle: "⚠️ У вас есть незавершённая заявка",
      orderActiveHint: "Прежде чем оставить новую заявку, дождитесь результата по этой.",
      orderStatusNew: "🆕 Отправлена мастерам, ожидаем ответ",
      orderStatusTaken: "🧑‍🔧 Мастер принял, работа выполняется",
      orderStatusDone: "✅ Мастер завершил, ожидаем ваше подтверждение",
      orderStatusConfirmed: "✅ Подтверждено",
      orderStepNew: "Принята", orderStepTaken: "Назначен мастер",
      orderStepDone: "Работа выполнена", orderStepConfirmed: "Завершено",
      orderMasterTitle: "🧑‍🔧 Назначенный вам мастер",
      orderPhotoLabel: "📷 Фото неисправности (необязательно)",
      orderPhotoHint: "Добавьте фото, чтобы мастеру было сразу понятно",
      orderPhotoGot: "✅ Фото прикреплено",
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

      // ── Заполнение анкеты (стать мастером) ──
      menuAnketa: "📝 Заполнить анкету",
      menuAnketaSub: "Зарегистрируйтесь как мастер",
      anketaChecking: "Проверка...",
      anketaAlreadyActiveTitle: "✅ Вы уже зарегистрированный мастер!",
      anketaAlreadyActiveHint: "Чтобы изменить данные, используйте раздел \"Мой профиль\".",
      anketaAlreadyPendingTitle: "⏳ Ваша анкета рассматривается",
      anketaAlreadyPendingHint: "Повторно отправлять не нужно — администратор скоро ответит.",
      anketaAlreadyRejectedTitle: "❌ Ваша анкета была отклонена",
      anketaAlreadyRejectedHint: "Повторная отправка недоступна. Вопросы: @online_ustaxona",
      anketaChooseViloyat: "В каком регионе вы работаете?",
      anketaChooseTuman: "В каком(их) районе(ах) оказываете услуги?",
      anketaTumanHint: "Можно выбрать несколько",
      anketaFormTitle: "📝 Данные анкеты",
      fYil: "Год рождения", fYilPh: "Например: 1995",
      fPasport: "Серия и номер паспорта", fPasportPh: "Например: AC1234567",
      fPasportHint: "Только для договора и идентификации, клиентам не показывается",
      anketaChooseServices: "Ваши услуги",
      anketaPhotoLabel: "Ваше фото",
      anketaPhotoHint: "Нажмите, чтобы загрузить",
      anketaPhotoGot: "✅ Фото выбрано",
      anketaLocHint: "Адрес вашей рабочей зоны (необязательно) — клиенты найдут вас по близости",
      anketaErrRequired: "Заполните все поля",
      anketaErrYil: "Введите корректный год рождения (1950-2005)",
      anketaErrPasport: "Введите корректную серию/номер паспорта",
      anketaErrPhoto: "Пожалуйста, загрузите своё фото",
      anketaContractTitle: "📜 Договор о посреднических услугах",
      anketaContractHint: "Ознакомьтесь с договором перед продолжением",
      anketaContractAgree: "✅ Согласен и подписываю",
      anketaContractDecline: "❌ Отказываюсь",
      anketaContractDeclinedMsg: "Без подписания договора регистрация мастером невозможна.",
      anketaSubmitting: "Отправка...",
      anketaSuccessTitle: "✅ Анкета принята!",
      anketaSuccessHint: "Анкета отправлена администраторам. Срок рассмотрения — 1-2 рабочих дня.",
      anketaBecomeMaster: "📝 Зарегистрироваться как мастер",

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
    orderForm: {},
    anketaForm: {}
  };
  var illusTimer = null;

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
    if (entry.view === 'printerCodesList') return t().errorCodes;
    if (entry.view === 'printerCodesBrand') return entry.brandName;
    if (entry.view === 'issue') return null; // shown as page title, keep crumb short
    if (entry.view === 'topishViloyat' || entry.view === 'orderViloyat') return t().menuTopish;
    if (entry.view === 'topishTuman' || entry.view === 'topishXizmat' || entry.view === 'topishResults') return entry.viloyat;
    if (entry.view === 'orderXizmat' || entry.view === 'orderForm' || entry.view === 'orderConfirm') return entry.viloyat;
    if (entry.view === 'orderGate' || entry.view === 'orderSuccess') return t().menuOrder;
    if (entry.view === 'map') return L('Xarita','Карта');
    if (entry.view === 'about') return t().menuAbout;
    if (entry.view === 'contact') return t().menuContact;
    if (entry.view === 'profileGate' || entry.view === 'profileMaster' || entry.view === 'profileUser') return t().menuProfile;
    if (entry.view === 'profileMasterJobs') return t().profileJobsTitle;
    if (entry.view === 'profileMasterNewOrders') return t().profileNewOrdersTitle;
    if (entry.view === 'profileMasterOrderAccepted') return t().profileNewOrderAcceptedTitle;
    if (entry.view === 'profileEditMaster') return t().profileEditTitle;
    if (entry.view === 'profileMasterLocation') return L('Joylashuv','Локация');
    if (entry.view === 'profileUserOrders') return t().profileOrdersTitle;
    if (entry.view === 'anketaGate') return t().menuAnketa;
    if (entry.view === 'anketaViloyat') return t().menuAnketa;
    if (entry.view === 'anketaTuman') return entry.viloyat;
    if (entry.view === 'anketaForm') return entry.viloyat;
    if (entry.view === 'anketaContract') return t().anketaContractTitle;
    if (entry.view === 'anketaSuccess') return t().menuAnketa;
    if (entry.view === 'market') return 'Market';
    if (entry.view === 'marketCats') return L('Ehtiyot qismlar','Запчасти');
    if (entry.view === 'marketParts') { var mc = catById(entry.cat); return mc ? pick(mc, 'name') : ''; }
    if (entry.view === 'marketPart') return null;
    if (entry.view === 'marketCart') return L('Savatcha','Корзина');
    if (entry.view === 'marketCheckout') return L('Yetkazib berish','Доставка');
    if (entry.view === 'marketPay') return L("To'lov",'Оплата');
    if (entry.view === 'marketDone' || entry.view === 'marketOrder') return L('Buyurtma','Заказ');
    if (entry.view === 'marketOrders') return L('Buyurtmalarim','Мои заказы');
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
          var availHtml = '<span class="mc-avail ' + (m.band ? 'busy' : 'free') + '">' + (m.band ? t().topishBusy : t().topishFree) + '</span>';
          return '<div class="master-card' + (m.is_premium ? ' premium' : '') + (m.band ? ' is-busy' : '') + '" style="animation:view-in .22s ' + (Math.min(i,8)*0.04) + 's both">' +
            (m.is_premium ? '<div class="mc-premium-tag">⭐ PREMIUM</div>' : '') +
            '<div class="mc-top">' +
            '<div class="mc-avatar">' + avatarHtml + '</div>' +
            '<div class="mc-id">' +
            '<div class="mc-name">' + esc(m.ism) + '</div>' +
            '<div class="mc-stats">' +
            '<span class="mc-stat mc-rating">⭐ ' + ratingHtml + '</span>' +
            (m.masofa_km != null ? '<span class="mc-stat">📏 ' + m.masofa_km + ' km</span>' : '') +
            '</div></div></div>' +
            (chipsHtml ? '<div class="mc-chips">' + chipsHtml + availHtml + '</div>' : '<div class="mc-chips">' + availHtml + '</div>') +
            pfCardExtras(m) +
            '<div class="mc-actions">' +
            '<a class="tel" href="tel:' + esc(m.telefon) + '">📞 ' + esc(m.telefon) + '</a>' +
            '<a class="tg" href="' + link + '" target="_blank">✈️ ' + t().topishWrite + '</a>' +
            '<button class="mc-complain" data-tgid="' + esc(String(m.tg_id)) + '" data-ism="' + esc(m.ism || '') + '">' + t().complainBtn + '</button>' +
            '</div></div>';
        }).join('');
        box.innerHTML = header + '<div class="master-list">' + cards + '</div>';
        Array.prototype.forEach.call(box.querySelectorAll('.mc-complain'), function(btn){
          btn.addEventListener('click', function(){
            openComplaintModal(btn.getAttribute('data-tgid'), btn.getAttribute('data-ism'));
          });
        });
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

  // ---------- Shikoyat modali (usta kartochkasidan) ----------
  function closeComplaintModal(){
    var el = document.getElementById('complaintOverlay');
    if (el) el.remove();
  }

  function openComplaintModal(ustaTgId, ustaIsm){
    closeComplaintModal();
    var overlay = document.createElement('div');
    overlay.id = 'complaintOverlay';
    overlay.className = 'complaint-overlay';
    overlay.innerHTML =
      '<div class="complaint-box">' +
      '<div class="complaint-title">' + t().complainTitle + '</div>' +
      (ustaIsm ? '<div class="complaint-on">' + esc(t().complainOn(ustaIsm)) + '</div>' : '') +
      '<textarea id="complaintText" class="complaint-textarea" placeholder="' + esc(t().complainPh) + '"></textarea>' +
      '<div id="complaintErr" class="complaint-err"></div>' +
      '<div class="complaint-actions">' +
      '<button class="btn-ghost" id="complaintCancelBtn">' + t().complainCancel + '</button>' +
      '<button class="btn-primary" id="complaintSendBtn">' + t().complainSend + '</button>' +
      '</div></div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeComplaintModal(); });
    document.getElementById('complaintCancelBtn').addEventListener('click', closeComplaintModal);
    document.getElementById('complaintSendBtn').addEventListener('click', function(){
      var errBox = document.getElementById('complaintErr');
      var matn = document.getElementById('complaintText').value.trim();
      errBox.textContent = '';
      if (matn.length < 5) {
        errBox.textContent = t().complainTooShort;
        return;
      }
      if (!getInitData() || !API_BASE) {
        errBox.textContent = t().complainErr;
        return;
      }
      var sendBtn = document.getElementById('complaintSendBtn');
      sendBtn.disabled = true;
      apiPost('/api/public/complaint/create', {
        init_data: getInitData(), matn: matn, usta_tg_id: ustaTgId || null, usta_ism: ustaIsm || null
      }).then(function(res){
        if (res && res.data && res.data.ok) {
          haptic('ok');
          overlay.querySelector('.complaint-box').innerHTML =
            '<div class="complaint-sent">' + t().complainSent + '</div>';
          setTimeout(closeComplaintModal, 1600);
        } else {
          sendBtn.disabled = false;
          errBox.textContent = t().complainErr;
        }
      }).catch(function(){
        sendBtn.disabled = false;
        errBox.textContent = t().complainErr;
      });
    });
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
    var steps = [
      { key: 'yangi', label: t().orderStepNew, icon: '🆕' },
      { key: 'olindi', label: t().orderStepTaken, icon: '🧑‍🔧' },
      { key: 'bajarildi', label: t().orderStepDone, icon: '✅' },
      { key: 'tasdiqlandi', label: t().orderStepConfirmed, icon: '🏁' },
    ];
    var statusMap = { yangi: t().orderStatusNew, olindi: t().orderStatusTaken, bajarildi: t().orderStatusDone, tasdiqlandi: t().orderStatusConfirmed };
    var curIdx = steps.findIndex(function(s){ return s.key === order.status; });
    if (curIdx < 0) curIdx = 0;

    var stepperHtml = '<div class="order-stepper">' + steps.map(function(s, i){
      var cls = i < curIdx ? 'done' : (i === curIdx ? 'active' : 'todo');
      return '<div class="os-step ' + cls + '">' +
        '<div class="os-dot">' + (i < curIdx ? '✓' : s.icon) + '</div>' +
        '<div class="os-label">' + s.label + '</div>' +
        (i < steps.length - 1 ? '<div class="os-line ' + (i < curIdx ? 'done' : '') + '"></div>' : '') +
        '</div>';
    }).join('') + '</div>';

    var masterHtml = '';
    if (order.master && order.master.ism) {
      var mk = order.master;
      var link = mk.username ? ('https://t.me/' + mk.username) : ('tg://user?id=' + mk.tg_id);
      masterHtml =
        '<div class="panel dashed" style="margin-top:12px">' +
        '<div class="summary-row"><span class="k">' + t().orderMasterTitle + '</span><span class="v">' + esc(mk.ism || '—') + '</span></div>' +
        '<div class="mc-actions" style="margin-top:8px">' +
        '<a class="tel" href="tel:' + esc(mk.telefon || '') + '">📞 ' + esc(mk.telefon || '—') + '</a>' +
        '<a class="tg" href="' + link + '" target="_blank">✈️ ' + t().topishWrite + '</a>' +
        '</div></div>';
    }

    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuOrder + '</div>' +
      '<h2>' + t().orderActiveTitle + '</h2></div>' +
      stepperHtml +
      '<div class="panel dashed" style="margin-top:12px">' +
      '<div class="summary-row"><span class="k">' + t().viloyat + '</span><span class="v">' + esc(order.viloyat || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">' + t().xizmat + '</span><span class="v">' + esc(order.xizmat || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">Status</span><span class="v">' + (statusMap[order.status] || order.status) + '</span></div>' +
      '</div>' +
      masterHtml +
      '<p class="note">' + t().orderActiveHint + '</p></div>';
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
      '<div class="field"><label>' + t().orderPhotoLabel + '</label>' +
      '<label class="photo-upload' + (f.photo_b64 ? ' got' : '') + '" id="ofPhotoBox">' +
      '<span class="pu-thumb" id="ofPhotoThumb">' + (f.photo_b64 ? '' : '📷') + '</span>' +
      '<span class="pu-label" id="ofPhotoLabel">' + (f.photo_b64 ? t().orderPhotoGot : t().orderPhotoHint) + '</span>' +
      '<input type="file" accept="image/*" id="ofPhotoInput"></label></div>' +
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

    if (f.photo_b64) {
      mainView.querySelector('#ofPhotoThumb').style.backgroundImage = 'url(' + f.photo_b64 + ')';
    }
    mainView.querySelector('#ofPhotoInput').addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var label = mainView.querySelector('#ofPhotoLabel');
      label.textContent = t().profileSending;
      resizeImageToDataUrl(file).then(function(dataUrl){
        state.orderForm.photo_b64 = dataUrl;
        var box = mainView.querySelector('#ofPhotoBox');
        box.classList.add('got');
        var thumb = mainView.querySelector('#ofPhotoThumb');
        thumb.style.backgroundImage = 'url(' + dataUrl + ')';
        thumb.textContent = '';
        label.textContent = t().orderPhotoGot;
      }).catch(function(){
        label.textContent = t().orderPhotoHint;
        alert(t().orderErrGeneric);
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
        lat: state.orderForm.lat, lon: state.orderForm.lon, photo_b64: state.orderForm.photo_b64 };
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
      '<div class="summary-row"><span class="k">' + t().orderPhotoLabel + '</span><span class="v">' + (f.photo_b64 ? '✅' : '—') + '</span></div>' +
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
        lat: f.lat, lon: f.lon, photo_b64: f.photo_b64
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
    pfInjectCss();
    var reyting = m.rating ? ('⭐ ' + m.rating + ' (' + m.rating_count + ')') : ('⭐ ' + t().profileNoRating);
    var subHolat = m.sub_ok ? t().profileActiveUntil(m.sub_until) : t().profileNotPaid;
    var premHolat = m.premium_ok ? t().profileActiveUntil(m.premium_until) : t().profileNotEnabled;
    var manzil = m.viloyat ? (m.viloyat + (m.tuman ? ' — ' + m.tuman : '')) : '—';
    var isBusy = !!m.band;

    mainView.innerHTML =
      '<div class="view">' + pfMasterTop(m) +
      '<div class="panel dashed pf-rise" style="--i:4;margin-top:14px">' +
      '<div class="summary-row"><span class="k">' + t().profileAvailTitle + '</span></div>' +
      '<div class="avail-toggle" id="availToggle">' +
      '<button type="button" class="avail-opt' + (!isBusy ? ' active' : '') + '" data-band="0">' +
      '<span class="avail-opt-label">' + t().profileAvailFree + '</span>' +
      '<span class="avail-opt-sub">' + t().profileAvailFreeSub + '</span></button>' +
      '<button type="button" class="avail-opt busy' + (isBusy ? ' active' : '') + '" data-band="1">' +
      '<span class="avail-opt-label">' + t().profileAvailBusy + '</span>' +
      '<span class="avail-opt-sub">' + t().profileAvailBusySub + '</span></button>' +
      '</div>' +
      '<div class="note" style="margin-top:6px">' + t().profileAvailHint + '</div>' +
      '</div>' +
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
      '<button class="row" id="btnMasterNewOrders"><span class="idx">🆕</span><span class="lbl">' + t().profileNewOrdersBtn + '</span>' +
      (m.new_orders_count ? '<span class="row-badge">' + m.new_orders_count + '</span>' : '') +
      '<span class="chev">→</span></button>' +
      '<button class="row" id="btnMasterStats"><span class="idx">📊</span><span class="lbl">' + t().profileStatsBtn + '</span><span class="chev">→</span></button>' +
      '<button class="row" id="btnEditMaster"><span class="idx">✏️</span><span class="lbl">' + t().profileEditBtn + '</span><span class="chev">→</span></button>' +
      '<button class="row" id="btnMasterJobs"><span class="idx">📋</span><span class="lbl">' + t().profileJobsBtn + '</span><span class="chev">→</span></button>' +
      '</div>' +
      '</div>';

    pfBindMasterTop(m);

    mainView.querySelector('#availToggle').querySelectorAll('.avail-opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        var band = btn.getAttribute('data-band') === '1';
        if (band === isBusy) return;
        haptic('select');
        mainView.querySelector('#availToggle').querySelectorAll('.avail-opt').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        isBusy = band;
        m.band = band;
        apiPost('/api/public/profile/master/availability', { init_data: getInitData(), band: band }).catch(function(){});
      });
    });

    mainView.querySelector('#btnMasterNewOrders').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileMasterNewOrders', offset: 0 });
    });
    mainView.querySelector('#btnMasterStats').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileMasterStats', period:'weekly' });
    });
    mainView.querySelector('#btnEditMaster').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileEditMaster', master: m });
    });
    mainView.querySelector('#btnMasterJobs').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileMasterJobs', offset: 0 });
    });
  }

  function renderProfileMasterStats(entry){
    var period = entry.period || 'weekly';
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuProfile + '</div>' +
      '<h2>' + t().statsTitle + '</h2></div>' +
      '<div id="statsBody" class="stats-loading">' + t().statsLoading + '</div>' +
      '</div>';

    apiGet('/api/public/profile/master/stats?init_data=' + encodeURIComponent(getInitData()) + '&months=6')
      .then(function(res){
        if (!res || !res.ok) { renderStatsError(); return; }
        renderStatsBody(res, period);
      })
      .catch(function(){ renderStatsError(); });

    function renderStatsError(){
      var body = mainView.querySelector('#statsBody');
      if (body) body.innerHTML = '<p class="note">' + t().statsErr + '</p>';
    }

    function fmtResponseTime(mins){
      if (mins == null) return '—';
      if (mins < 60) return Math.round(mins) + ' ' + t().statsMinutes;
      return (Math.round(mins / 6) / 10) + ' ' + t().statsHours;
    }

    function barRows(items, labelKey, valueKey, unitLabel){
      var max = items.reduce(function(m, it){ return Math.max(m, it[valueKey] || 0); }, 0) || 1;
      return items.map(function(it){
        var pct = Math.round(((it[valueKey] || 0) / max) * 100);
        return '<div class="stat-bar-row">' +
          '<div class="stat-bar-label">' + esc(String(it[labelKey])) + '</div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="stat-bar-val">' + (it[valueKey] || 0) + (unitLabel ? ' ' + unitLabel : '') + '</div>' +
          '</div>';
      }).join('');
    }

    function periodChart(res, per){
      var items, labelFn;
      if (per === 'daily') {
        items = res.days || [];
        labelFn = function(it){ return it.weekday_label + '\n' + it.label; };
      } else if (per === 'monthly') {
        items = res.months || [];
        labelFn = function(it){ return it.label; };
      } else {
        items = res.weeks || [];
        labelFn = function(it){ return it.label; };
      }
      var max = items.reduce(function(m, it){ return Math.max(m, it.jobs || 0); }, 0) || 1;
      var hasAny = items.some(function(it){ return (it.jobs || 0) > 0; });
      if (!hasAny) return '<p class="note">' + t().statsNoData + '</p>';
      return '<div class="stats-chart">' + items.map(function(it){
        var h = Math.max(4, Math.round(((it.jobs || 0) / max) * 78));
        return '<div class="sc-col" title="' + (it.jobs||0) + ' ' + t().statsJobsUnit + '">' +
          '<div class="sc-val">' + (it.jobs > 0 ? it.jobs : '') + '</div>' +
          '<div class="sc-bar" style="height:' + h + 'px"></div>' +
          '<div class="sc-label">' + esc(labelFn(it)) + '</div>' +
          '</div>';
      }).join('') + '</div>';
    }

    function renderStatsBody(res, per){
      var body = mainView.querySelector('#statsBody');
      var maxWd = Math.max.apply(null, (res.weekday_activity||[]).map(function(w){ return w.count||0; }).concat([1]));

      body.innerHTML =
        '<div class="stats-summary">' +
        '<div class="stat-card"><div class="stat-num">' + (res.total_jobs||0) + '</div><div class="stat-lbl">' + t().statsTotalJobs + '</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + (res.overall_avg_rating ? ('⭐'+res.overall_avg_rating) : '—') + '</div><div class="stat-lbl">' + t().statsAvgRating + '</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + fmtResponseTime(res.avg_response_minutes) + '</div><div class="stat-lbl">' + t().statsAvgResponse + '</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + (res.complaints_count||0) + '</div><div class="stat-lbl">' + t().statsComplaints + '</div></div>' +
        '</div>' +

        '<div class="panel dashed">' +
        '<div class="stats-tabs" id="statsTabs">' +
        '<button type="button" class="st-tab' + (per==='daily'?' active':'') + '" data-p="daily">' + t().statsTabDaily + '</button>' +
        '<button type="button" class="st-tab' + (per==='weekly'?' active':'') + '" data-p="weekly">' + t().statsTabWeekly + '</button>' +
        '<button type="button" class="st-tab' + (per==='monthly'?' active':'') + '" data-p="monthly">' + t().statsTabMonthly + '</button>' +
        '</div>' +
        '<div id="statsChartHost">' + periodChart(res, per) + '</div>' +
        '</div>' +

        (res.service_breakdown && res.service_breakdown.length ?
          '<div class="panel dashed"><div class="stat-block-title">' + t().statsServiceTitle + '</div>' +
          barRows(res.service_breakdown, 'xizmat', 'count', t().statsJobsUnit) + '</div>' : '') +

        (res.rating_distribution && res.rating_distribution.some(function(r){ return r.count>0; }) ?
          '<div class="panel dashed"><div class="stat-block-title">' + t().statsRatingDistTitle + '</div>' +
          barRows(res.rating_distribution.map(function(r){ return { lbl: '⭐'.repeat(r.star), count: r.count }; }), 'lbl', 'count', '') + '</div>' : '') +

        (res.weekday_activity ?
          '<div class="panel dashed"><div class="stat-block-title">' + t().statsWeekdayTitle + '</div>' +
          '<div class="stats-chart small">' + res.weekday_activity.map(function(w){
            var h = Math.max(4, Math.round(((w.count||0)/maxWd)*54));
            return '<div class="sc-col"><div class="sc-val">' + (w.count>0?w.count:'') + '</div>' +
              '<div class="sc-bar" style="height:' + h + 'px"></div>' +
              '<div class="sc-label">' + t().statsWeekdayShort[w.weekday] + '</div></div>';
          }).join('') + '</div></div>' : '');

      mainView.querySelectorAll('#statsTabs .st-tab').forEach(function(btn){
        btn.addEventListener('click', function(){
          var p = btn.getAttribute('data-p');
          if (p === per) return;
          haptic('select');
          mainView.querySelectorAll('#statsTabs .st-tab').forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          mainView.querySelector('#statsChartHost').innerHTML = periodChart(res, p);
          per = p;
        });
      });
    }
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

  function renderProfileMasterNewOrders(entry){
    var offset = entry.offset || 0;
    mainView.innerHTML =
      '<div class="view"><div class="list-title">🆕 ' + t().profileNewOrdersTitle + '</div>' +
      '<div class="note" style="margin:-6px 0 12px">' + t().profileNewOrdersHint + '</div>' +
      '<div id="newOrdersBox"><div class="empty">' + t().profileLoading + '</div></div></div>';

    apiGet('/api/public/profile/master/orders/new?init_data=' + encodeURIComponent(getInitData()) + '&offset=' + offset)
      .then(function(res){
        var box = mainView.querySelector('#newOrdersBox');
        if (!res || !res.ok) { box.innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>'; return; }
        var items = res.items || [];
        if (items.length === 0 && offset === 0) {
          box.innerHTML = '<div class="empty">🆕 ' + t().profileNewOrdersEmpty + '</div>';
          return;
        }
        var cards = items.map(function(o, i){
          var hudud = [o.viloyat, o.tuman].filter(Boolean).join(' / ') || '—';
          return '<div class="job-card" id="newOrderCard' + o.id + '" style="animation:view-in .2s ' + (Math.min(i,8)*0.03) + 's both">' +
            '<div class="job-top"><span class="job-hash">#' + o.id + '</span><span class="job-name">' + esc(o.xizmat || '—') + '</span></div>' +
            '<div class="job-meta"><span>📍 ' + esc(hudud) + '</span>' + (o.has_photo ? '<span>' + t().photoAttached + '</span>' : '') + '</div>' +
            '<div class="job-status">💬 ' + esc(o.muammo || '—') + '</div>' +
            '<div class="job-status">🏠 ' + esc(o.manzil || '—') + '</div>' +
            '<div class="job-time">🕐 ' + esc(o.created_at || '—') + '</div>' +
            '<button class="btn-accept-order" data-oid="' + o.id + '">' + t().profileNewOrderAcceptBtn + '</button>' +
            '</div>';
        }).join('');
        var nav = '';
        var hasPrev = offset > 0;
        var hasNext = (offset + (res.limit || 8)) < (res.total || 0);
        if (hasPrev || hasNext) {
          nav = '<div class="page-nav">' +
            (hasPrev ? '<button class="btn-ghost" id="newOrdersPrev">' + t().prevPage + '</button>' : '<span></span>') +
            (hasNext ? '<button class="btn-ghost" id="newOrdersNext">' + t().nextPage + '</button>' : '<span></span>') +
            '</div>';
        }
        box.innerHTML = '<div class="job-list">' + cards + '</div>' + nav;

        box.querySelectorAll('.btn-accept-order').forEach(function(btn){
          btn.addEventListener('click', function(){
            var oid = parseInt(btn.getAttribute('data-oid'), 10);
            btn.disabled = true; btn.textContent = t().profileNewOrderAccepting;
            apiPost('/api/public/profile/master/order/accept', { init_data: getInitData(), order_id: oid })
              .then(function(r2){
                if (r2.data && r2.data.ok) {
                  haptic('ok');
                  push({ view:'profileMasterOrderAccepted', order: r2.data.order, fromOffset: offset });
                } else {
                  haptic('tap');
                  var errTxt = (r2.data && r2.data.error) || t().orderErrGeneric;
                  alert(errTxt);
                  var card = mainView.querySelector('#newOrderCard' + oid);
                  if (card) card.remove();
                  btn.disabled = false; btn.textContent = t().profileNewOrderAcceptBtn;
                }
              }).catch(function(){
                alert(t().orderErrGeneric);
                btn.disabled = false; btn.textContent = t().profileNewOrderAcceptBtn;
              });
          });
        });
        var prevBtn = box.querySelector('#newOrdersPrev');
        if (prevBtn) prevBtn.addEventListener('click', function(){
          haptic('select');
          state.stack[state.stack.length - 1] = { view:'profileMasterNewOrders', offset: Math.max(0, offset - (res.limit||8)) };
          render();
        });
        var nextBtn = box.querySelector('#newOrdersNext');
        if (nextBtn) nextBtn.addEventListener('click', function(){
          haptic('select');
          state.stack[state.stack.length - 1] = { view:'profileMasterNewOrders', offset: offset + (res.limit||8) };
          render();
        });
      }).catch(function(){
        mainView.querySelector('#newOrdersBox').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
      });
  }

  function renderProfileMasterOrderAccepted(entry){
    var o = entry.order || {};
    var fio = [o.familya, o.ism].filter(Boolean).join(' ') || '—';
    var loc = (o.lat != null && o.lon != null)
      ? '<a class="tg" href="https://maps.google.com/?q=' + o.lat + ',' + o.lon + '" target="_blank">🗺 ' + t().viewOnMap + '</a>'
      : '';
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().profileNewOrdersTitle + '</div>' +
      '<h2>' + t().profileNewOrderAcceptedTitle + '</h2></div>' +
      '<div class="panel dashed">' +
      '<div class="summary-row"><span class="k">👤</span><span class="v">' + esc(fio) + '</span></div>' +
      '<div class="summary-row"><span class="k">🔧</span><span class="v">' + esc(o.xizmat || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">🏠</span><span class="v">' + esc(o.manzil || '—') + '</span></div>' +
      '<div class="summary-row"><span class="k">💬</span><span class="v">' + esc(o.muammo || '—') + '</span></div>' +
      '</div>' +
      '<div class="mc-actions">' +
      '<a class="tel" href="tel:' + esc(o.telefon || '') + '">📞 ' + esc(o.telefon || '—') + '</a>' +
      loc +
      '</div>' +
      '<button class="btn-accept-order" id="btnBackToJobs" style="margin-top:16px">' + t().profileNewOrderAcceptedOk + '</button>' +
      '</div>';

    mainView.querySelector('#btnBackToJobs').addEventListener('click', function(){
      haptic('select');
      state.stack.pop();
      state.stack[state.stack.length - 1] = { view:'profileMasterNewOrders', offset: entry.fromOffset || 0 };
      render();
      if (tg && tg.BackButton && state.stack.length === 1) { tg.BackButton.hide(); }
    });
  }

  // ================= PROFIL: QULAYLIKLAR + XARITADA JOYLASHUV =================
  // Usta profilidagi yangi imkoniyatlar: xaritadagi joylashuvni belgilash (pin bilan),
  // profil to'liqlik halqasi, qulayliklar (ish vaqti, tajriba, kafolat, to'lov turlari...).
  // Mijoz kartalarida (Ustaxona topish + Xarita) ham shu ma'lumotlar ko'rinadi.
  var PF_AMEN = [
    { k:'chiqib_keladi', ic:'🚗', uz:'Uyga borib xizmat',     ru:'Выезд к клиенту' },
    { k:'ustaxona',      ic:'🏠', uz:'Ustaxonada qabul',      ru:'Приём в мастерской' },
    { k:'soat24',        ic:'🌙', uz:'24/7 ishlayman',        ru:'Работаю 24/7' },
    { k:'bepul_diag',    ic:'🆓', uz:'Bepul diagnostika',     ru:'Бесплатная диагностика' },
    { k:'original',      ic:'🔩', uz:'Original ehtiyot qism', ru:'Оригинальные запчасти' },
    { k:'chek',          ic:'🧾', uz:'Chek / hujjat beraman', ru:'Выдаю чек / документ' },
    { k:'naqd',          ic:'💵', uz:'Naqd to\'lov',          ru:'Наличные' },
    { k:'karta',         ic:'💳', uz:'Karta orqali',          ru:'Оплата картой' },
    { k:'onlayn',        ic:'📲', uz:'Click / Payme',         ru:'Click / Payme' }
  ];
  var PF_DAYS = [
    { n:1, uz:'Du', ru:'Пн' }, { n:2, uz:'Se', ru:'Вт' }, { n:3, uz:'Ch', ru:'Ср' }, { n:4, uz:'Pa', ru:'Чт' },
    { n:5, uz:'Ju', ru:'Пт' }, { n:6, uz:'Sh', ru:'Сб' }, { n:7, uz:'Ya', ru:'Вс' }
  ];
  var PF_WARRANTY = [
    { d:0,   uz:'Yo\'q',   ru:'Нет' },     { d:7,  uz:'7 kun',  ru:'7 дн.' },
    { d:14,  uz:'2 hafta', ru:'2 нед.' },  { d:30, uz:'1 oy',   ru:'1 мес.' },
    { d:60,  uz:'2 oy',    ru:'2 мес.' },  { d:90, uz:'3 oy',   ru:'3 мес.' },
    { d:180, uz:'6 oy',    ru:'6 мес.' },  { d:365, uz:'1 yil',  ru:'1 год' }
  ];
  var PF_REGION_CENTER = [
    ['toshkent shahri', 41.3111, 69.2797, 12], ['toshkent', 41.05, 69.35, 9], ['samarqand', 39.6542, 66.9597, 11],
    ['farg', 40.3842, 71.7843, 11], ['andijon', 40.7821, 72.3442, 11], ['namangan', 40.9983, 71.6726, 11],
    ['buxoro', 39.7747, 64.4286, 11], ['xorazm', 41.55, 60.6333, 10], ['qashqadaryo', 38.8606, 65.7891, 10],
    ['surxondaryo', 37.2242, 67.2783, 10], ['jizzax', 40.1158, 67.8422, 11], ['sirdaryo', 40.4897, 68.7842, 11],
    ['navoiy', 40.0844, 65.3792, 11], ['qoraqalpog', 42.4531, 59.6103, 10]
  ];
  var pfRt = null; // ochiq joylashuv-xaritasi holati

  function pfRegionCenter(viloyat){
    var v = String(viloyat || '').toLowerCase().replace(/[‘’`´ʻʼ']/g, '');
    for (var i = 0; i < PF_REGION_CENTER.length; i++) {
      if (v.indexOf(PF_REGION_CENTER[i][0].replace(/'/g, '')) !== -1) {
        return { lat: PF_REGION_CENTER[i][1], lon: PF_REGION_CENTER[i][2], zoom: PF_REGION_CENTER[i][3] };
      }
    }
    return { lat: MAP_DEFAULT.lat, lon: MAP_DEFAULT.lon, zoom: 11 };
  }
  function pfMyId(){
    try { return tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null; } catch(e){ return null; }
  }
  function pfAmenDef(k){ for (var i = 0; i < PF_AMEN.length; i++) if (PF_AMEN[i].k === k) return PF_AMEN[i]; return null; }
  function pfWarrLabel(d){
    for (var i = 0; i < PF_WARRANTY.length; i++) if (PF_WARRANTY[i].d === d) return L(PF_WARRANTY[i].uz, PF_WARRANTY[i].ru);
    return d + ' ' + L('kun', 'дн.');
  }
  function pfYears(n){
    if (state.lang === 'uz') return n + ' yil';
    var a = n % 10, b = n % 100;
    return n + ' ' + ((a === 1 && b !== 11) ? 'год' : ((a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'года' : 'лет'));
  }

  function pfToast(msg){
    var old = document.getElementById('pfToast'); if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'pfToast'; el.className = 'pf-toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.classList.add('out'); }, 2600);
    setTimeout(function(){ try { el.remove(); } catch(e){} }, 3100);
  }

  function pfInjectCss(){
    if (document.getElementById('pfCss')) return;
    var css = [
      /* ---- umumiy kirish animatsiyasi ---- */
      '.pf-rise{opacity:0;transform:translateY(24px) scale(.97);animation:pf-rise .7s cubic-bezier(.2,.9,.3,1.12) forwards;animation-delay:calc(var(--i,0) * 75ms)}',
      '@keyframes pf-rise{to{opacity:1;transform:none}}',
      '@keyframes pf-pop{from{transform:scale(.3) rotate(-14deg);opacity:0}to{transform:none;opacity:1}}',
      '@keyframes pf-ping{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.28);opacity:0}}',
      '@keyframes pf-spin{to{transform:rotate(360deg)}}',
      '@keyframes pf-ping-big{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.9);opacity:0}}',
      '@keyframes pf-drift{to{transform:translate3d(34px,26px,0) scale(1.28)}}',
      '@keyframes pf-blink{50%{opacity:.25}}',
      '@keyframes pf-shine{0%,50%{left:-70%}100%{left:140%}}',
      '@keyframes pf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
      '@keyframes pf-pulse{0%,100%{box-shadow:0 0 0 0 var(--pc,rgba(255,145,66,.55))}70%{box-shadow:0 0 0 14px rgba(255,145,66,0)}}',
      '@keyframes pf-draw{to{stroke-dashoffset:0}}',
      '@keyframes pf-conf{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}100%{transform:translate3d(var(--dx),var(--dy),0) rotate(var(--rot));opacity:0}}',
      '@keyframes pf-glow{0%{box-shadow:0 0 0 0 rgba(79,216,201,.8)}100%{box-shadow:0 0 0 22px rgba(79,216,201,0)}}',
      '@keyframes pf-drop{0%{transform:translateY(-34px) rotate(-45deg);opacity:0}60%{transform:translateY(4px) rotate(-45deg);opacity:1}100%{transform:translateY(0) rotate(-45deg)}}',
      '@keyframes pf-toast-in{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}',

      /* ---- HERO ---- */
      '.pf-hero{position:relative;overflow:hidden;border-radius:30px;padding:26px 16px 20px;text-align:center;isolation:isolate;border:1px solid rgba(255,255,255,.14);background:linear-gradient(160deg,rgba(79,216,201,.16),rgba(120,80,255,.16) 55%,rgba(255,145,66,.13));box-shadow:0 24px 54px -24px rgba(79,216,201,.6),inset 0 1px 0 rgba(255,255,255,.22)}',
      '.pf-aurora{position:absolute;inset:0;z-index:-1;pointer-events:none}',
      '.pf-aurora i{position:absolute;width:230px;height:230px;border-radius:50%;filter:blur(40px);opacity:.5;animation:pf-drift 9s ease-in-out infinite alternate}',
      '.pf-aurora i:nth-child(1){left:-70px;top:-80px;background:#2b86ff}',
      '.pf-aurora i:nth-child(2){right:-80px;top:-40px;background:#ff9142;animation-delay:-3s}',
      '.pf-aurora i:nth-child(3){left:28%;bottom:-130px;background:#4af0e0;animation-delay:-6s}',
      '.pf-av{position:relative;width:132px;height:132px;margin:0 auto 18px}',
      '.pf-ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}',
      '.pf-ring .bg{fill:none;stroke:rgba(255,255,255,.12);stroke-width:4.5}',
      '.pf-ring .fg{fill:none;stroke:url(#pfg);stroke-width:4.5;stroke-linecap:round;stroke-dasharray:289.03;stroke-dashoffset:289.03;transition:stroke-dashoffset 1.7s cubic-bezier(.2,.8,.2,1) .3s;filter:drop-shadow(0 0 5px rgba(79,216,201,.85))}',
      '.pf-av-in{position:absolute;inset:12px;border-radius:50%;overflow:hidden;background:linear-gradient(145deg,#2b86ff,#7b4dff);display:flex;align-items:center;justify-content:center;font-family:var(--f-big,var(--font-display));font-weight:800;font-size:34px;color:#fff;animation:pf-pop .9s cubic-bezier(.3,1.5,.5,1) both .1s;box-shadow:0 10px 26px -8px rgba(0,0,0,.6)}',
      '.pf-av-in img{width:100%;height:100%;object-fit:cover;display:block}',
      '.pf-pct{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);padding:5px 12px;border-radius:999px;background:#0b0e13;border:1px solid rgba(79,216,201,.55);font-family:var(--font-mono);font-weight:700;font-size:12px;color:var(--cyan);box-shadow:0 8px 18px -6px rgba(79,216,201,.7);white-space:nowrap;animation:pf-float 3.4s ease-in-out infinite}',
      '.pf-name{font-family:var(--f-big,var(--font-display));font-weight:800;font-size:26px;letter-spacing:-.02em;line-height:1.12;background:linear-gradient(100deg,#fff 20%,#bff7f0 70%,#9ec9ff);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.pf-sub{margin-top:6px;color:var(--text-2);font-size:13px;font-weight:500}',
      '.pf-badges{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:13px}',
      '.pf-b{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;font-size:11.5px;font-weight:700;color:var(--text-1);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(6px)}',
      '.pf-b.g{color:var(--green);border-color:rgba(111,207,151,.4);background:rgba(111,207,151,.1)}',
      '.pf-b.a{color:var(--amber);border-color:rgba(255,145,66,.4);background:rgba(255,145,66,.1)}',
      '.pf-b i{width:6px;height:6px;border-radius:50%;background:currentColor;animation:pf-blink 1.4s infinite}',

      /* ---- LOKATSIYA KARTASI ---- */
      '.pf-loc{--lc:#ff9142;position:relative;overflow:hidden;margin-top:14px;border-radius:26px;padding:16px;border:1px solid color-mix(in srgb,var(--lc) 45%,transparent);background:linear-gradient(150deg,color-mix(in srgb,var(--lc) 14%,transparent),rgba(255,255,255,.03));display:flex;flex-direction:column;gap:13px}',
      '.pf-loc.ok{--lc:#6fcf97}',
      '.pf-loc-top{display:flex;gap:14px;align-items:center}',
      '.pf-radar{position:relative;width:66px;height:66px;flex:none;color:var(--lc);margin:8px 6px 8px 8px}',
      '.pf-radar i{position:absolute;inset:0;border-radius:50%;border:2px solid currentColor;opacity:0;animation:pf-ping 2.6s cubic-bezier(.2,.6,.3,1) infinite}',
      '.pf-radar i:nth-child(2){animation-delay:.87s}.pf-radar i:nth-child(3){animation-delay:1.74s}',
      '.pf-radar::after{content:"";position:absolute;inset:6px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 70%,color-mix(in srgb,currentColor 55%,transparent) 100%);animation:pf-spin 2.8s linear infinite;-webkit-mask:radial-gradient(circle,transparent 30%,#000 32%);mask:radial-gradient(circle,transparent 30%,#000 32%)}',
      '.pf-radar span{position:absolute;inset:16px;border-radius:50%;background:#0b0e13;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:17px;z-index:2;animation:pf-float 2.8s ease-in-out infinite}',
      '.pf-loc-t{font-family:var(--f-big,var(--font-display));font-weight:800;font-size:17px;line-height:1.2;color:var(--text-1)}',
      '.pf-loc-s{margin-top:4px;font-size:12.5px;line-height:1.5;color:var(--text-2)}',
      '.pf-btns{display:flex;gap:9px}',
      '.pf-cta{position:relative;overflow:hidden;flex:1;border:none;border-radius:16px;padding:14px 16px;font-family:var(--font-body);font-weight:800;font-size:14.5px;color:#1a0f05;background:linear-gradient(135deg,#ffb15c,#ff7a2e);box-shadow:0 12px 26px -10px rgba(255,122,46,.8);transition:transform .15s}',
      '.pf-cta:active{transform:scale(.96)}',
      '.pf-cta.pulse{animation:pf-pulse 2s infinite}',
      '.pf-cta::after{content:"";position:absolute;top:0;bottom:0;width:45%;left:-70%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:pf-shine 3.2s ease-in-out infinite}',
      '.pf-cta.cyan{color:#06201d;background:linear-gradient(135deg,#6af2e3,#2fb8ff);box-shadow:0 12px 26px -10px rgba(47,184,255,.8)}',
      '.pf-ghost{flex:1;border-radius:16px;padding:14px 12px;font-family:var(--font-body);font-weight:700;font-size:13.5px;color:var(--text-1);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14)}',
      '.pf-ghost:active{background:rgba(255,255,255,.12)}',

      /* ---- TO'LIQLIK RO'YXATI ---- */
      '.pf-card{margin-top:14px;border-radius:26px;padding:16px;background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.1)}',
      '.pf-card h3{font-family:var(--f-big,var(--font-display));font-weight:800;font-size:16px;margin-bottom:11px;display:flex;align-items:center;gap:8px}',
      '.pf-todo{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:11px 12px;margin-top:8px;border-radius:16px;font-family:var(--font-body);color:var(--text-1);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:transform .2s cubic-bezier(.3,1.5,.5,1),background .2s}',
      '.pf-todo:first-of-type{margin-top:0}',
      '.pf-todo:active{transform:scale(.97);background:rgba(255,255,255,.09)}',
      '.pf-todo .ic{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;background:rgba(255,255,255,.07);flex:none}',
      '.pf-todo .tx{flex:1;font-size:13.5px;font-weight:600;line-height:1.3}',
      '.pf-todo .tx small{display:block;font-weight:500;font-size:11px;color:var(--text-3);margin-top:2px}',
      '.pf-todo .w{font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--amber);padding:4px 8px;border-radius:99px;background:rgba(255,145,66,.12)}',
      '.pf-todo.done{opacity:.72}',
      '.pf-todo.done .ic{background:rgba(111,207,151,.16);color:var(--green)}',
      '.pf-todo.done .w{color:var(--green);background:rgba(111,207,151,.12)}',
      '.pf-full{display:flex;align-items:center;gap:12px;font-size:13.5px;font-weight:600;color:var(--text-1)}',
      '.pf-full b{font-size:30px;animation:pf-float 2.4s ease-in-out infinite}',
      '.pf-amen-view{display:flex;flex-wrap:wrap;gap:7px}',
      '.pf-amen-view span{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:99px;font-size:12px;font-weight:600;background:rgba(79,216,201,.09);border:1px solid rgba(79,216,201,.28);color:var(--text-1)}',

      /* ---- TAHRIR EKRANI ---- */
      '.pf-sec{margin-top:14px;border-radius:26px;padding:16px;background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.1);scroll-margin-top:calc(var(--tb,64px) + 12px)}',
      '.pf-sec.flash{opacity:1;transform:none;animation:pf-glow 1.2s ease-out 2}',
      '.pf-sec h3{font-family:var(--f-big,var(--font-display));font-weight:800;font-size:16px;margin-bottom:4px;display:flex;align-items:center;gap:8px}',
      '.pf-sec .hint{font-size:12px;color:var(--text-3);margin-bottom:12px;line-height:1.45}',
      '.pf-sec textarea{width:100%;min-height:104px;resize:none;border-radius:16px;padding:13px;font-size:15px;line-height:1.5;font-family:var(--font-body);color:var(--text-1);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12);transition:border-color .2s,box-shadow .2s}',
      '.pf-sec textarea:focus,.pf-time:focus{outline:none;border-color:var(--cyan-dim);box-shadow:0 0 0 3px var(--cyan-glow)}',
      '.pf-bio-foot{display:flex;align-items:center;justify-content:space-between;margin-top:9px;gap:10px}',
      '.pf-sample{padding:8px 12px;border-radius:99px;font-size:12px;font-weight:700;font-family:var(--font-body);color:var(--cyan);background:rgba(79,216,201,.1);border:1px solid rgba(79,216,201,.35)}',
      '.pf-cnt{font-family:var(--font-mono);font-size:11px;color:var(--text-3)}',
      '.pf-cnt.hi{color:var(--green)}.pf-cnt.max{color:var(--amber)}',
      '.pf-step{display:flex;align-items:center;justify-content:center;gap:16px;margin:4px 0 12px}',
      '.pf-step button{width:46px;height:46px;border-radius:15px;font-size:22px;font-weight:700;color:var(--text-1);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);transition:transform .15s cubic-bezier(.3,1.6,.5,1)}',
      '.pf-step button:active{transform:scale(.88)}',
      '.pf-step .num{min-width:120px;text-align:center;font-family:var(--f-big,var(--font-display));font-weight:800;font-size:28px;line-height:1}',
      '.pf-step .num.bump{animation:pf-pop .35s cubic-bezier(.3,1.6,.5,1)}',
      '.pf-chips{display:flex;flex-wrap:wrap;gap:8px}',
      '.pf-chip{padding:9px 13px;border-radius:99px;font-family:var(--font-body);font-size:13px;font-weight:700;color:var(--text-2);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);transition:transform .2s cubic-bezier(.3,1.6,.5,1),background .2s,color .2s,border-color .2s}',
      '.pf-chip:active{transform:scale(.92)}',
      '.pf-chip.on{color:#06201d;background:linear-gradient(135deg,#6af2e3,#2fb8ff);border-color:transparent;box-shadow:0 8px 18px -8px rgba(47,184,255,.9);transform:translateY(-1px)}',
      '.pf-time-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
      '.pf-time-row .dash{color:var(--text-3);font-weight:800}',
      '.pf-time{flex:1;min-width:0;border-radius:16px;padding:12px;font-size:17px;font-family:var(--font-mono);font-weight:700;text-align:center;color:var(--text-1);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12);color-scheme:dark}',
      '.pf-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:10px 0}',
      '.pf-day{padding:11px 0;border-radius:13px;font-size:12.5px;font-weight:800;font-family:var(--font-body);color:var(--text-2);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);transition:transform .2s cubic-bezier(.3,1.6,.5,1),background .2s}',
      '.pf-day.on{color:#06201d;background:linear-gradient(135deg,#6af2e3,#2fb8ff);border-color:transparent;transform:translateY(-2px)}',
      '.pf-amen-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
      '.pf-amen{position:relative;text-align:left;border-radius:18px;padding:12px 11px;display:flex;gap:9px;align-items:center;font-family:var(--font-body);color:var(--text-1);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);transition:transform .25s cubic-bezier(.3,1.6,.5,1),background .25s,border-color .25s,box-shadow .25s}',
      '.pf-amen:active{transform:scale(.94)}',
      '.pf-amen .ic{font-size:22px;transition:transform .45s cubic-bezier(.3,1.8,.5,1),filter .25s;filter:grayscale(1) opacity(.65)}',
      '.pf-amen .lb{flex:1;font-size:12.3px;font-weight:600;line-height:1.25}',
      '.pf-amen .sw{width:34px;height:20px;border-radius:99px;background:rgba(255,255,255,.16);position:relative;flex:none;transition:background .25s}',
      '.pf-amen .sw::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .32s cubic-bezier(.3,1.6,.5,1)}',
      '.pf-amen.on{border-color:rgba(79,216,201,.6);background:linear-gradient(145deg,rgba(79,216,201,.17),rgba(43,134,255,.1));box-shadow:0 12px 26px -16px rgba(79,216,201,1)}',
      '.pf-amen.on .ic{filter:none;transform:scale(1.2) rotate(-7deg)}',
      '.pf-amen.on .sw{background:var(--cyan)}',
      '.pf-amen.on .sw::after{transform:translateX(14px)}',
      '.pf-savebar{position:sticky;bottom:0;z-index:20;margin:18px -4px 0;padding:12px 4px calc(12px + var(--safe-bottom,0px));background:linear-gradient(180deg,transparent,rgba(7,8,13,.92) 38%)}',

      /* ---- JOYLASHUV XARITASI ---- */
      '.pf-lhead{padding:4px 2px 14px}',
      '.pf-lhead h2{font-family:var(--f-big,var(--font-display));font-weight:800;font-size:26px;letter-spacing:-.02em;line-height:1.12}',
      '.pf-lhead p{margin-top:7px;color:var(--text-2);font-size:13.5px;line-height:1.5}',
      '.pfmap{position:relative;border-radius:28px;overflow:hidden;height:clamp(320px,52vh,520px);border:1px solid rgba(255,255,255,.16);background:#0b0e13;isolation:isolate;box-shadow:0 24px 50px -26px rgba(0,0,0,.9)}',
      '.pfmap-canvas{position:absolute;inset:0;z-index:0}',
      '.pfmap.dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.92) contrast(.92) saturate(.8)}',
      '.pfmap .leaflet-container{background:#0b0e13;font-family:var(--font-body);outline:none}',
      '.pfmap .leaflet-control-attribution{background:rgba(14,17,22,.7);color:var(--text-3);font-size:9.5px}',
      '.pfmap .leaflet-control-attribution a{color:var(--text-2)}',
      '.pfmap-load{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-2);font-size:13px;background:#0b0e13;text-align:center;padding:20px}',
      '.pfmap-load .sp{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan);animation:pf-spin .9s linear infinite}',
      '.pfmap-pin{position:absolute;left:50%;top:50%;width:0;height:0;z-index:600;pointer-events:none}',
      '.pfmap-pin .ring{position:absolute;left:-14px;top:-7px;width:28px;height:14px;border-radius:50%;border:2px solid rgba(79,216,201,.9);animation:pf-ping-big 2s ease-out infinite}',
      '.pfmap-pin .ring.r2{animation-delay:1s}',
      '.pfmap-pin .shd{position:absolute;left:-9px;top:-3px;width:18px;height:7px;border-radius:50%;background:rgba(0,0,0,.6);filter:blur(2px);transition:transform .25s,opacity .25s}',
      '.pfmap-pin .hd{position:absolute;left:-22px;top:-62px;width:44px;height:44px;box-sizing:border-box;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(145deg,#6af2e3,#2f8bff);border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 22px rgba(0,0,0,.55);transition:top .22s cubic-bezier(.3,1.5,.5,1)}',
      '.pfmap-pin .hd span{transform:rotate(45deg);font-size:19px;line-height:1}',
      '.pfmap-pin.lift .hd{top:-82px}',
      '.pfmap-pin.lift .shd{transform:scale(.5);opacity:.35}',
      '.pfmap-pin.drop .hd{animation:pf-drop .6s cubic-bezier(.3,1.5,.5,1)}',
      '.pfmap-fab{position:absolute;right:12px;bottom:12px;z-index:700;width:50px;height:50px;border-radius:16px;font-size:22px;background:rgba(23,27,33,.96);border:1px solid rgba(255,255,255,.18);color:var(--text-1);box-shadow:0 8px 20px rgba(0,0,0,.5);transition:transform .15s}',
      '.pfmap-fab:active{transform:scale(.9)}',
      '.pfmap-fab.busy{animation:pf-spin 1s linear infinite}',
      '.pfmap-hint{position:absolute;left:12px;top:12px;z-index:700;max-width:calc(100% - 24px);padding:8px 13px;border-radius:99px;font-size:12px;font-weight:700;color:var(--text-1);background:rgba(23,27,33,.92);border:1px solid rgba(255,255,255,.16);box-shadow:0 6px 16px rgba(0,0,0,.4);transition:opacity .4s}',
      '.pfmap-hint.off{opacity:0}',
      '.pf-sheet{margin-top:14px;border-radius:26px;padding:16px;background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.1)}',
      '.pf-coord{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border-radius:15px;background:rgba(0,0,0,.3);border:1px dashed rgba(255,255,255,.16);font-family:var(--font-mono);font-size:12.5px;color:var(--text-2)}',
      '.pf-coord b{color:var(--cyan);font-weight:700}',
      '.pf-coord .st{font-family:var(--font-body);font-size:11.5px;font-weight:700;color:var(--amber)}',
      '.pf-coord .st.ok{color:var(--green)}',
      '.pf-field{margin-top:12px}',
      '.pf-field label{display:block;font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:7px}',
      '.pf-field input{width:100%;border-radius:15px;padding:13px;font-size:15px;font-family:var(--font-body);color:var(--text-1);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12)}',
      '.pf-field input:focus{outline:none;border-color:var(--cyan-dim);box-shadow:0 0 0 3px var(--cyan-glow)}',
      '.pf-priv{display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding:11px 12px;border-radius:15px;font-size:11.8px;line-height:1.5;color:var(--text-2);background:rgba(79,216,201,.07);border:1px solid rgba(79,216,201,.22)}',
      '.pf-priv span{font-size:16px}',
      '.pf-cta[disabled]{opacity:.45;box-shadow:none;animation:none}',
      '.pf-link{display:block;width:100%;margin-top:11px;padding:11px;font-size:12.5px;font-weight:700;font-family:var(--font-body);color:var(--red);background:none;border:none}',

      /* ---- MUVAFFAQIYAT ---- */
      '.pf-done{position:fixed;inset:0;z-index:5000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:30px;text-align:center;background:radial-gradient(circle at 50% 38%,rgba(79,216,201,.28),rgba(7,8,13,.96) 62%);backdrop-filter:blur(10px);animation:fade-in .3s ease both;overflow:hidden}',
      '.pf-done .badge{position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center}',
      '.pf-done .badge i{position:absolute;inset:0;border-radius:50%;border:3px solid var(--green);opacity:0;animation:pf-ping-big 1.8s ease-out infinite}',
      '.pf-done .badge i:nth-child(2){animation-delay:.6s}',
      '.pf-done svg{position:relative;width:104px;height:104px;filter:drop-shadow(0 0 18px rgba(111,207,151,.8))}',
      '.pf-done svg circle{fill:rgba(111,207,151,.14);stroke:var(--green);stroke-width:4;stroke-dasharray:289;stroke-dashoffset:289;animation:pf-draw .7s ease forwards}',
      '.pf-done svg path{fill:none;stroke:#fff;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:pf-draw .5s ease .55s forwards}',
      '.pf-done h2{font-family:var(--f-big,var(--font-display));font-weight:800;font-size:25px;line-height:1.2;animation:cap-in .5s ease .5s both}',
      '.pf-done p{color:var(--text-2);font-size:14px;line-height:1.55;max-width:320px;animation:cap-in .5s ease .7s both}',
      '.pf-done .pf-cta{flex:none;min-width:220px;animation:cap-in .5s ease .9s both}',
      '.pf-conf{position:absolute;left:50%;top:38%;width:9px;height:14px;border-radius:2px;animation:pf-conf 1.7s cubic-bezier(.15,.7,.3,1) forwards;pointer-events:none}',
      '.pf-toast{position:fixed;left:50%;bottom:calc(26px + var(--safe-bottom,0px));transform:translateX(-50%);z-index:6000;max-width:calc(100% - 40px);padding:12px 18px;border-radius:16px;font-size:13px;font-weight:600;line-height:1.4;color:var(--text-1);background:rgba(23,27,33,.98);border:1px solid rgba(255,255,255,.18);box-shadow:0 14px 34px rgba(0,0,0,.6);animation:pf-toast-in .35s cubic-bezier(.3,1.4,.5,1) both;transition:opacity .4s}',
      '.pf-toast.out{opacity:0}',

      /* ---- MIJOZ KARTALARIDAGI QULAYLIKLAR ---- */
      '.pfc{margin-top:11px;display:flex;flex-direction:column;gap:8px}',
      '.pfc-row{display:flex;flex-wrap:wrap;gap:6px}',
      '.pfc-b{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:700;color:var(--text-2);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}',
      '.pfc-b.open{color:var(--green);border-color:rgba(111,207,151,.38);background:rgba(111,207,151,.1)}',
      '.pfc-b.open i{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pf-blink 1.4s infinite}',
      '.pfc-b.warr{color:#ffd37a;border-color:rgba(255,200,61,.32);background:rgba(255,200,61,.08)}',
      '.pfc-b.exp{color:var(--cyan);border-color:rgba(79,216,201,.32);background:rgba(79,216,201,.08)}',
      '.pfc-bio{font-size:12.5px;line-height:1.5;color:var(--text-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.pfc-loc{font-size:11.5px;color:var(--text-3)}',

      '@media (prefers-reduced-motion:reduce){.pf-rise{opacity:1;transform:none;animation:none}.pf-aurora i,.pf-radar i,.pf-radar::after,.pf-radar span,.pf-cta,.pf-cta::after,.pf-pct,.pf-full b,.pfmap-pin .ring{animation:none!important}.pf-ring .fg{transition:none}}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'pfCss'; st.textContent = css;
    document.head.appendChild(st);
  }

  function pfCountUp(el, to, ms){
    if (!el) return;
    var t0 = null;
    function step(ts){
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1 && document.body.contains(el)) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function pfConfetti(host, n){
    var colors = ['#6af2e3', '#ffb15c', '#ff7ac8', '#9b6bff', '#6fcf97', '#ffe259', '#35b6ff'];
    for (var i = 0; i < (n || 26); i++) {
      var c = document.createElement('i');
      c.className = 'pf-conf';
      var ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 190;
      c.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
      c.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 40 + Math.random() * 160) + 'px');
      c.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.2) + 's';
      host.appendChild(c);
    }
  }

  // Profil to'liqlik hisobi
  function pfScore(m){
    var x = m.extra || {};
    var q = x.qulayliklar || [];
    var hasLoc = m.lat != null && m.lon != null;
    var items = [
      { k:'loc',   w:30, ic:'📍', done: hasLoc,
        uz:'Xaritadagi joylashuv', ru:'Точка на карте',
        suz:'Xaritada ko\'rinish uchun eng muhimi', sru:'Самое важное, чтобы вас видели на карте', go:'loc' },
      { k:'bio',   w:20, ic:'👋', done: String(x.bio || '').trim().length >= 20,
        uz:'O\'zingiz haqingizda qisqa matn', ru:'Коротко о себе',
        suz:'Mijoz sizga ishonch hosil qiladi', sru:'Клиенты больше доверяют', go:'bio' },
      { k:'hours', w:15, ic:'🕘', done: !!(x.ish_boshlash && x.ish_tugash) || q.indexOf('soat24') >= 0,
        uz:'Ish vaqti', ru:'Время работы',
        suz:'Mijoz qachon murojaat qilishni biladi', sru:'Клиент знает, когда звонить', go:'hours' },
      { k:'amen',  w:15, ic:'✨', done: q.length >= 3,
        uz:'Qulayliklar (kamida 3 ta)', ru:'Удобства (минимум 3)',
        suz:'Uyga borish, bepul diagnostika, to\'lov turlari...', sru:'Выезд, диагностика, способы оплаты...', go:'amen' },
      { k:'exp',   w:10, ic:'🏅', done: x.tajriba_yil != null && x.tajriba_yil !== '',
        uz:'Ish tajribasi', ru:'Опыт работы',
        suz:'Necha yildan beri ishlaysiz', sru:'Сколько лет вы работаете', go:'exp' },
      { k:'warr',  w:10, ic:'🛡️', done: (x.kafolat_kun || 0) > 0,
        uz:'Ish kafolati', ru:'Гарантия на работу',
        suz:'Kafolatli ustalarga ko\'proq ishonishadi', sru:'Мастерам с гарантией доверяют больше', go:'warr' }
    ];
    var pct = 0;
    items.forEach(function(it){ if (it.done) pct += it.w; });
    return { pct: pct, items: items };
  }

  function pfMasterTop(m){
    var x = m.extra || {};
    var sc = pfScore(m);
    var hasLoc = m.lat != null && m.lon != null;
    var initials = String(m.ism || '?').trim().split(/\s+/).slice(0, 2).map(function(w){ return w.charAt(0) || ''; }).join('').toUpperCase().replace(/[^A-Za-z0-9\u0400-\u04FF\u0100-\u024F]/g, '') || '?';
    var uid = pfMyId();
    var avatar = (m.has_photo && API_BASE && uid)
      ? '<img src="' + esc(API_BASE) + '/api/public/master/photo?tg_id=' + encodeURIComponent(uid) + '" alt="" onerror="this.replaceWith(document.createTextNode(\'' + initials + '\'))">'
      : initials;
    var sub = [];
    if (m.rating) sub.push('⭐ ' + m.rating + ' (' + m.rating_count + ')');
    if (x.tajriba_yil != null && x.tajriba_yil !== '') sub.push('🏅 ' + pfYears(x.tajriba_yil));
    var badges = '';
    if (m.band) badges += '<span class="pf-b a"><i></i>' + L('Hozir band', 'Сейчас занят') + '</span>';
    else badges += '<span class="pf-b g"><i></i>' + L('Buyurtmaga tayyor', 'Готов к заказам') + '</span>';
    badges += hasLoc ? '<span class="pf-b g">📍 ' + L('Xaritada ko\'rinasiz', 'Вы на карте') + '</span>'
                     : '<span class="pf-b a">📍 ' + L('Xaritada yo\'q', 'Вас нет на карте') + '</span>';

    var hero =
      '<div class="pf-hero pf-rise" style="--i:0">' +
      '<div class="pf-aurora"><i></i><i></i><i></i></div>' +
      '<div class="pf-av">' +
        '<svg class="pf-ring" viewBox="0 0 100 100"><defs><linearGradient id="pfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6af2e3"/><stop offset="1" stop-color="#9b6bff"/></linearGradient></defs>' +
        '<circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" id="pfRingFg" cx="50" cy="50" r="46"/></svg>' +
        '<div class="pf-av-in">' + avatar + '</div>' +
        '<div class="pf-pct"><span id="pfPct" data-to="' + sc.pct + '">0</span>% ' + L('to\'liq', 'заполнен') + '</div>' +
      '</div>' +
      '<div class="pf-name">' + esc(m.ism || '—') + '</div>' +
      (sub.length ? '<div class="pf-sub">' + sub.join('  ·  ') + '</div>' : '') +
      '<div class="pf-badges">' + badges + '</div>' +
      '</div>';

    var loc;
    if (hasLoc) {
      loc =
        '<div class="pf-loc ok pf-rise" style="--i:1"><div class="pf-loc-top">' +
        '<div class="pf-radar"><i></i><i></i><i></i><span>📍</span></div>' +
        '<div><div class="pf-loc-t">' + L('Siz xaritada ko\'rinasiz ✓', 'Вы отображаетесь на карте ✓') + '</div>' +
        '<div class="pf-loc-s">' + L('Mijozlarga aniq manzil emas, taxminiy nuqta (150–400 m) ko\'rsatiladi.', 'Клиентам показывается приблизительная точка (150–400 м), а не точный адрес.') + '</div></div></div>' +
        (x.moljal ? '<div class="pf-loc-s" style="margin-top:-4px">📌 ' + esc(x.moljal) + '</div>' : '') +
        '<div class="pf-btns"><button class="pf-ghost" id="pfLocEdit">✏️ ' + L('Yangilash', 'Обновить') + '</button>' +
        '<button class="pf-ghost" id="pfLocView">🗺 ' + L('Xaritada ko\'rish', 'Смотреть на карте') + '</button></div></div>';
    } else {
      loc =
        '<div class="pf-loc warn pf-rise" style="--i:1"><div class="pf-loc-top">' +
        '<div class="pf-radar"><i></i><i></i><i></i><span>📍</span></div>' +
        '<div><div class="pf-loc-t">' + L('Siz xaritada ko\'rinmaysiz', 'Вас не видно на карте') + '</div>' +
        '<div class="pf-loc-s">' + L('Joylashuvingizni belgilang — mijozlar sizni xaritadan topib, yaqinlikka qarab murojaat qiladi. Bu 20 soniya vaqt oladi.', 'Отметьте свою точку — клиенты найдут вас на карте и обратятся по близости. Это займёт 20 секунд.') + '</div></div></div>' +
        '<div class="pf-btns"><button class="pf-cta pulse" id="pfLocEdit">📍 ' + L('Joylashuvni qo\'shish', 'Добавить местоположение') + '</button></div></div>';
    }

    var todo = '';
    var left = sc.items.filter(function(it){ return !it.done; });
    if (left.length === 0) {
      todo = '<div class="pf-card pf-rise" style="--i:2"><div class="pf-full"><b>🏆</b><div>' +
        L('Ajoyib! Profilingiz 100% to\'liq — mijozlar sizga ko\'proq ishonadi.', 'Отлично! Профиль заполнен на 100% — клиенты доверяют вам больше.') + '</div></div></div>';
    } else {
      todo = '<div class="pf-card pf-rise" style="--i:2"><h3>🚀 ' + L('Profilni kuchaytiring', 'Усильте профиль') + '</h3>' +
        left.map(function(it){
          return '<button class="pf-todo" data-go="' + it.go + '"><span class="ic">' + it.ic + '</span>' +
            '<span class="tx">' + L(it.uz, it.ru) + '<small>' + L(it.suz, it.sru) + '</small></span>' +
            '<span class="w">+' + it.w + '%</span></button>';
        }).join('') + '</div>';
    }

    var q = (x.qulayliklar || []);
    var amen = '';
    if (q.length || (x.kafolat_kun || 0) > 0) {
      amen = '<div class="pf-card pf-rise" style="--i:3"><h3>✨ ' + L('Sizning qulayliklaringiz', 'Ваши удобства') + '</h3><div class="pf-amen-view">' +
        q.map(function(k){ var d = pfAmenDef(k); return d ? '<span>' + d.ic + ' ' + L(d.uz, d.ru) + '</span>' : ''; }).join('') +
        ((x.kafolat_kun || 0) > 0 ? '<span>🛡️ ' + L('Kafolat', 'Гарантия') + ': ' + pfWarrLabel(x.kafolat_kun) + '</span>' : '') +
        '</div></div>';
    }
    return hero + loc + todo + amen;
  }

  function pfBindMasterTop(m){
    var ring = mainView.querySelector('#pfRingFg'), pct = mainView.querySelector('#pfPct');
    if (ring && pct) {
      var to = parseInt(pct.getAttribute('data-to'), 10) || 0;
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ ring.style.strokeDashoffset = String(289.03 * (1 - to / 100)); }); });
      pfCountUp(pct, to, 1700);
    }
    var openLoc = function(){ haptic('select'); push({ view:'profileMasterLocation', master: m }); };
    var b1 = mainView.querySelector('#pfLocEdit'); if (b1) b1.addEventListener('click', openLoc);
    var b2 = mainView.querySelector('#pfLocView'); if (b2) b2.addEventListener('click', function(){ haptic('select'); push({ view:'map' }); });
    Array.prototype.forEach.call(mainView.querySelectorAll('.pf-todo'), function(btn){
      btn.addEventListener('click', function(){
        var go = btn.getAttribute('data-go');
        haptic('select');
        if (go === 'loc') openLoc();
        else push({ view:'profileEditMaster', master: m, focus: go });
      });
    });
  }

  // ---------- Joylashuvni aniqlash (Telegram LocationManager -> brauzer GPS) ----------
  function pfGetLocation(){
    return new Promise(function(resolve){
      var done = false;
      function fin(v){ if (!done) { done = true; resolve(v); } }
      function viaBrowser(){
        if (!navigator.geolocation) { fin({ error:'unsupported' }); return; }
        navigator.geolocation.getCurrentPosition(
          function(pos){ fin({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }); },
          function(err){ fin({ error: (err && err.code === 1) ? 'denied' : 'failed' }); },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
        );
      }
      try {
        var lm = tg && tg.LocationManager;
        if (lm && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
          lm.init(function(){
            if (!lm.isLocationAvailable) { viaBrowser(); return; }
            if (!lm.isAccessGranted) {
              if (lm.isAccessRequested) { fin({ error:'denied' }); try { lm.openSettings(); } catch(e){} return; }
              // birinchi so'rov — getLocation ruxsat dialogini ochadi
            }
            lm.getLocation(function(data){
              if (data && data.latitude != null) fin({ lat: data.latitude, lon: data.longitude, acc: data.horizontal_accuracy || null });
              else fin({ error:'denied' });
            });
          });
          setTimeout(function(){ if (!done) viaBrowser(); }, 4000);
          return;
        }
      } catch(e){}
      viaBrowser();
    });
  }

  function pfCleanup(){
    if (!pfRt) return;
    try { if (pfRt.map) pfRt.map.remove(); } catch(e){}
    try { window.removeEventListener('resize', pfRt.onResize); } catch(e){}
    pfRt = null;
  }

  function renderProfileMasterLocation(entry){
    pfInjectCss();
    var m = entry.master;
    var x = m.extra || {};
    var hasSaved = m.lat != null && m.lon != null;
    var reg = pfRegionCenter(m.viloyat);
    var start = hasSaved ? { lat: m.lat, lon: m.lon, zoom: 17 } : reg;

    mainView.innerHTML =
      '<div class="view">' +
      '<div class="pf-lhead pf-rise" style="--i:0"><h2>📍 ' + L('Joylashuvni belgilang', 'Отметьте местоположение') + '</h2>' +
      '<p>' + L('Xaritani siljitib, pinni ish joyingiz (ustaxona yoki uyingiz) ustiga qo\'ying. Yoki 🎯 tugmasi bilan avtomatik aniqlang.', 'Двигайте карту, чтобы пин оказался на вашем месте работы. Или нажмите 🎯 для автоопределения.') + '</p></div>' +
      '<div class="pfmap dark pf-rise" style="--i:1" id="pfMap">' +
        '<div class="pfmap-canvas" id="pfMapCanvas"></div>' +
        '<div class="pfmap-load" id="pfMapLoad"><div class="sp"></div><div>' + L('Xarita yuklanmoqda...', 'Карта загружается...') + '</div></div>' +
        '<div class="pfmap-pin drop" id="pfPin"><i class="ring"></i><i class="ring r2"></i><div class="shd"></div><div class="hd"><span>🛠️</span></div></div>' +
        '<div class="pfmap-hint" id="pfHint">' + L('👆 Xaritani siljiting', '👆 Двигайте карту') + '</div>' +
        '<button class="pfmap-fab" id="pfLocate" aria-label="GPS">🎯</button>' +
      '</div>' +
      '<div class="pf-sheet pf-rise" style="--i:2">' +
        '<div class="pf-coord"><span id="pfCoordTxt">—</span><span class="st" id="pfCoordSt"></span></div>' +
        '<div class="pf-field"><label>📌 ' + L('Mo\'ljal (ixtiyoriy)', 'Ориентир (необязательно)') + '</label>' +
        '<input id="pfMoljal" maxlength="120" placeholder="' + esc(L('Masalan: Havas market yonida, 2-qavat', 'Например: рядом с рынком, 2 этаж')) + '" value="' + esc(x.moljal || '') + '"></div>' +
        '<div class="pf-priv"><span>🔒</span><div>' + L('Mijozlarga sizning aniq manzilingiz emas, 150–400 metr siljitilgan taxminiy nuqta ko\'rsatiladi. Aniq joyni faqat siz bilasiz.', 'Клиентам показывается не точный адрес, а приблизительная точка со смещением 150–400 м. Точное место знаете только вы.') + '</div></div>' +
        '<div class="pf-btns" style="margin-top:14px"><button class="pf-cta cyan" id="pfSave" disabled>💾 ' + L('Saqlash', 'Сохранить') + '</button></div>' +
        (hasSaved ? '<button class="pf-link" id="pfRemove">🗑 ' + L('Xaritadan yashirish', 'Скрыть с карты') + '</button>' : '') +
      '</div></div>';

    var rt = pfRt = { map:null, touched: hasSaved, center: { lat: start.lat, lon: start.lon }, acc: null, accCircle: null, onResize:null };
    var pinEl = mainView.querySelector('#pfPin');
    var coordTxt = mainView.querySelector('#pfCoordTxt'), coordSt = mainView.querySelector('#pfCoordSt');
    var saveBtn = mainView.querySelector('#pfSave'), hintEl = mainView.querySelector('#pfHint');
    var locBtn = mainView.querySelector('#pfLocate');
    setTimeout(function(){ if (pinEl) pinEl.classList.remove('drop'); }, 800);

    function refreshCoords(){
      if (rt.touched) {
        coordTxt.innerHTML = '<b>' + rt.center.lat.toFixed(5) + '</b>, <b>' + rt.center.lon.toFixed(5) + '</b>';
        coordSt.textContent = rt.acc ? ('±' + Math.round(rt.acc) + ' m') : '✓';
        coordSt.className = 'st ok';
        saveBtn.disabled = false;
      } else {
        coordTxt.textContent = L('Nuqta hali tanlanmagan', 'Точка ещё не выбрана');
        coordSt.textContent = ''; coordSt.className = 'st';
        saveBtn.disabled = true;
      }
    }
    refreshCoords();

    function useFallbackNoMap(){
      var ld = mainView.querySelector('#pfMapLoad');
      if (ld) ld.innerHTML = '<div style="font-size:30px">🗺️</div><div>' + L('Xarita yuklanmadi. Internetni tekshiring yoki 🎯 tugmasi bilan joylashuvni aniqlang.', 'Карта не загрузилась. Проверьте интернет или нажмите 🎯 для автоопределения.') + '</div>';
    }

    function applyGps(loc){
      rt.center = { lat: loc.lat, lon: loc.lon }; rt.acc = loc.acc || null; rt.touched = true;
      rt.progUntil = Date.now() + 1900;
      if (rt.map) {
        rt.map.flyTo([loc.lat, loc.lon], 17, { duration: 1.1 });
        try {
          if (rt.accCircle) rt.map.removeLayer(rt.accCircle);
          if (loc.acc && loc.acc < 800) rt.accCircle = window.L.circle([loc.lat, loc.lon], { radius: loc.acc, color:'#4FD8C9', weight:1, fillColor:'#4FD8C9', fillOpacity:.12 }).addTo(rt.map);
        } catch(e){}
      }
      if (hintEl) hintEl.classList.add('off');
      refreshCoords();
    }

    locBtn.addEventListener('click', function(){
      haptic('select');
      locBtn.classList.add('busy');
      pfGetLocation().then(function(res){
        locBtn.classList.remove('busy');
        if (res && res.lat != null) { haptic('ok'); applyGps(res); return; }
        if (res && res.error === 'denied') pfToast(L('GPS ruxsati berilmadi. Telegram sozlamalarida joylashuvga ruxsat bering yoki xaritani qo\'lda siljiting.', 'Нет доступа к GPS. Разрешите геолокацию в настройках Telegram или двигайте карту вручную.'));
        else pfToast(L('Joylashuvni aniqlab bo\'lmadi. Xaritani qo\'lda siljiting.', 'Не удалось определить местоположение. Двигайте карту вручную.'));
      });
    });

    mapEnsureLib().then(function(){
      if (pfRt !== rt) return; // foydalanuvchi ketib qolgan
      var LF = window.L;
      var canvas = mainView.querySelector('#pfMapCanvas');
      if (!canvas) return;
      var map = LF.map(canvas, { zoomControl:false, attributionControl:true, tap:true });
      rt.map = map;
      map.setView([start.lat, start.lon], start.zoom);
      LF.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; OpenStreetMap' }).addTo(map);
      var ld = mainView.querySelector('#pfMapLoad'); if (ld) { ld.style.transition = 'opacity .5s'; ld.style.opacity = '0'; setTimeout(function(){ try { ld.remove(); } catch(e){} }, 520); }
      rt.progUntil = Date.now() + 600;
      map.on('movestart', function(){ if (pinEl) pinEl.classList.add('lift'); });
      map.on('moveend', function(){
        if (pinEl) { pinEl.classList.remove('lift'); pinEl.classList.add('drop'); setTimeout(function(){ if (pinEl) pinEl.classList.remove('drop'); }, 620); }
        var c = map.getCenter();
        rt.center = { lat: c.lat, lon: c.lng };
        if (Date.now() > rt.progUntil && !rt.flying) { rt.touched = true; rt.acc = null; if (hintEl) hintEl.classList.add('off'); }
        refreshCoords();
      });
      rt.onResize = function(){ try { map.invalidateSize(); } catch(e){} };
      window.addEventListener('resize', rt.onResize);
      setTimeout(function(){ try { map.invalidateSize(); } catch(e){} }, 250);
      if (hasSaved) { if (hintEl) setTimeout(function(){ hintEl.classList.add('off'); }, 2500); }
    }).catch(function(){ useFallbackNoMap(); });

    saveBtn.addEventListener('click', function(){
      if (!rt.touched) return;
      var moljal = mainView.querySelector('#pfMoljal').value.trim();
      saveBtn.disabled = true; saveBtn.textContent = L('Saqlanmoqda...', 'Сохраняется...');
      apiPost('/api/public/profile/master/location', { init_data: getInitData(), lat: rt.center.lat, lon: rt.center.lon, moljal: moljal })
        .then(function(r){
          if (r.data && r.data.ok) {
            haptic('ok');
            m.lat = rt.center.lat; m.lon = rt.center.lon; m.has_location = true;
            m.extra = m.extra || {}; m.extra.moljal = moljal; m.extra.has_location = true;
            pfShowDone(function(){ pop(); });
          } else {
            pfToast((r.data && r.data.error) || t().orderErrGeneric);
            saveBtn.disabled = false; saveBtn.textContent = '💾 ' + L('Saqlash', 'Сохранить');
          }
        }).catch(function(){
          pfToast(t().orderErrGeneric);
          saveBtn.disabled = false; saveBtn.textContent = '💾 ' + L('Saqlash', 'Сохранить');
        });
    });

    var rem = mainView.querySelector('#pfRemove');
    if (rem) rem.addEventListener('click', function(){
      var ask = L('Xaritadan yashirilsangiz, mijozlar sizni xaritada ko\'rmaydi. Davom etasizmi?', 'Если скрыть себя с карты, клиенты не увидят вас на ней. Продолжить?');
      var go = function(ok){
        if (!ok) return;
        apiPost('/api/public/profile/master/location', { init_data: getInitData(), lat: null, lon: null }).then(function(r){
          if (r.data && r.data.ok) { m.lat = null; m.lon = null; m.has_location = false; if (m.extra) m.extra.has_location = false; pfToast(L('Xaritadan yashirildi', 'Скрыто с карты')); pop(); }
          else pfToast((r.data && r.data.error) || t().orderErrGeneric);
        }).catch(function(){ pfToast(t().orderErrGeneric); });
      };
      if (tg && tg.showConfirm) tg.showConfirm(ask, go); else go(window.confirm(ask));
    });
  }

  function pfShowDone(after){
    var ov = document.createElement('div');
    ov.className = 'pf-done';
    ov.innerHTML =
      '<div class="badge"><i></i><i></i><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="46"/><path d="M32 54 L46 68 L73 38"/></svg></div>' +
      '<h2>' + L('Siz endi xaritada ko\'rinasiz!', 'Теперь вас видно на карте!') + '</h2>' +
      '<p>' + L('Mijozlar sizni yaqinlik bo\'yicha topib, to\'g\'ridan-to\'g\'ri murojaat qila oladi.', 'Клиенты смогут находить вас по близости и обращаться напрямую.') + '</p>' +
      '<button class="pf-cta" id="pfDoneOk">🎉 ' + L('Zo\'r!', 'Отлично!') + '</button>';
    document.body.appendChild(ov);
    pfConfetti(ov, 34);
    var closed = false;
    function close(){
      if (closed) return; closed = true;
      ov.style.transition = 'opacity .3s'; ov.style.opacity = '0';
      setTimeout(function(){ try { ov.remove(); } catch(e){} if (after) after(); }, 300);
    }
    ov.querySelector('#pfDoneOk').addEventListener('click', function(){ haptic('select'); close(); });
    setTimeout(close, 4200);
  }

  // ---------- Tahrirlash ekrani (asosiy + qulayliklar) ----------
  function renderProfileEditMaster(entry){
    pfInjectCss();
    var m = entry.master;
    var src = m.extra || {};
    var ex = {
      bio: src.bio || '',
      tajriba_yil: (src.tajriba_yil == null || src.tajriba_yil === '') ? null : src.tajriba_yil,
      ish_boshlash: src.ish_boshlash || '',
      ish_tugash: src.ish_tugash || '',
      ish_kunlari: (src.ish_kunlari || []).slice(),
      qulayliklar: (src.qulayliklar || []).slice(),
      kafolat_kun: src.kafolat_kun || 0,
      moljal: src.moljal || ''
    };
    var BIO_MAX = 300;
    var sample = L('Tajribali usta. Ishni sifatli va va\'da qilingan muddatda bajaraman. Avval bepul maslahat beraman, narxni oldindan kelishib olamiz.',
                   'Опытный мастер. Выполняю работу качественно и в обещанные сроки. Сначала бесплатная консультация, цену согласуем заранее.');

    mainView.innerHTML =
      '<div class="view"><div class="list-title pf-rise" style="--i:0">' + t().profileEditTitle + '</div>' +

      '<div class="pf-sec pf-rise" style="--i:1" data-sec="main"><h3>👤 ' + L('Asosiy ma\'lumotlar', 'Основное') + '</h3><div style="height:10px"></div>' +
      '<div class="form-card">' +
      '<div class="field"><label>👤 ' + t().fIsm + '</label><input id="peIsm" value="' + esc(m.ism || '') + '"></div>' +
      '<div class="field"><label>📱 ' + t().fTel + '</label><input id="peTel" type="tel" value="' + esc(m.telefon || '') + '"></div>' +
      '<div class="field"><label>🌍 ' + t().fViloyat + '</label><select id="peViloyat" class="select-field"></select></div>' +
      '<div class="field"><label>📍 ' + t().fTuman + '</label><select id="peTuman" class="select-field"></select></div>' +
      '<div class="field" style="margin-bottom:0"><label>🔧 ' + t().profileEditChooseServices + '</label><div class="chip-toggle-list" id="peXizmatlar"></div></div>' +
      '</div></div>' +

      '<div class="pf-sec pf-rise" style="--i:2" data-sec="bio"><h3>👋 ' + L('Men haqimda', 'Обо мне') + '</h3>' +
      '<div class="hint">' + L('Mijozlar sizni tanlashdan oldin shu matnni o\'qiydi. Qisqa va aniq yozing.', 'Клиенты читают этот текст перед выбором. Пишите коротко и по делу.') + '</div>' +
      '<textarea id="peBio" maxlength="' + BIO_MAX + '" placeholder="' + esc(L('Masalan: 8 yillik tajriba, muzlatgich va kir yuvish mashinalari ustasi...', 'Например: 8 лет опыта, ремонт холодильников и стиральных машин...')) + '">' + esc(ex.bio) + '</textarea>' +
      '<div class="pf-bio-foot"><button class="pf-sample" id="peSample" type="button">✨ ' + L('Namuna matn', 'Пример текста') + '</button><span class="pf-cnt" id="peCnt"></span></div></div>' +

      '<div class="pf-sec pf-rise" style="--i:3" data-sec="exp"><h3>🏅 ' + L('Ish tajribasi', 'Опыт работы') + '</h3>' +
      '<div class="hint">' + L('Necha yildan beri shu sohada ishlaysiz?', 'Сколько лет вы работаете в этой сфере?') + '</div>' +
      '<div class="pf-step"><button type="button" id="peExpMinus">−</button><div class="num" id="peExpNum"></div><button type="button" id="peExpPlus">+</button></div>' +
      '<div class="pf-chips" id="peExpChips" style="justify-content:center">' +
      [1, 3, 5, 10, 15, 20].map(function(n){ return '<button type="button" class="pf-chip" data-n="' + n + '">' + pfYears(n) + '</button>'; }).join('') + '</div></div>' +

      '<div class="pf-sec pf-rise" style="--i:4" data-sec="hours"><h3>🕘 ' + L('Ish vaqti', 'Время работы') + '</h3>' +
      '<div class="hint">' + L('Mijozlar sizni "Hozir ochiq" belgisi bilan ko\'radi. 24/7 ishlasangiz, pastdagi qulayliklardan tanlang.', 'Клиенты увидят отметку «Сейчас открыто». Если работаете 24/7 — отметьте в удобствах ниже.') + '</div>' +
      '<div class="pf-time-row"><input type="time" class="pf-time" id="peT1" value="' + esc(ex.ish_boshlash) + '"><span class="dash">—</span><input type="time" class="pf-time" id="peT2" value="' + esc(ex.ish_tugash) + '"></div>' +
      '<div class="pf-chips" id="peTPre">' +
      [['09:00', '18:00'], ['08:00', '20:00'], ['10:00', '22:00'], ['07:00', '23:00']].map(function(p){ return '<button type="button" class="pf-chip" data-a="' + p[0] + '" data-b="' + p[1] + '">' + p[0] + '–' + p[1] + '</button>'; }).join('') + '</div>' +
      '<div class="pf-days" id="peDays">' +
      PF_DAYS.map(function(d){ return '<button type="button" class="pf-day' + (ex.ish_kunlari.indexOf(d.n) >= 0 ? ' on' : '') + '" data-n="' + d.n + '">' + L(d.uz, d.ru) + '</button>'; }).join('') + '</div>' +
      '<div class="hint" style="margin:0">' + L('Ish kunlarini belgilang (hech narsa tanlamasangiz — har kuni).', 'Отметьте рабочие дни (если ничего не выбрано — каждый день).') + '</div></div>' +

      '<div class="pf-sec pf-rise" style="--i:5" data-sec="amen"><h3>✨ ' + L('Qulayliklar', 'Удобства') + '</h3>' +
      '<div class="hint">' + L('Mijozga qulay bo\'lgan hamma narsani belgilang — shunda sizni tanlash ehtimoli oshadi.', 'Отметьте всё, что удобно клиенту — так вас выберут чаще.') + '</div>' +
      '<div class="pf-amen-grid" id="peAmen">' +
      PF_AMEN.map(function(a){ return '<button type="button" class="pf-amen' + (ex.qulayliklar.indexOf(a.k) >= 0 ? ' on' : '') + '" data-k="' + a.k + '"><span class="ic">' + a.ic + '</span><span class="lb">' + L(a.uz, a.ru) + '</span><span class="sw"></span></button>'; }).join('') +
      '</div></div>' +

      '<div class="pf-sec pf-rise" style="--i:6" data-sec="warr"><h3>🛡️ ' + L('Ish kafolati', 'Гарантия на работу') + '</h3>' +
      '<div class="hint">' + L('Bajarilgan ishga qancha muddat kafolat berasiz?', 'На какой срок вы даёте гарантию на выполненную работу?') + '</div>' +
      '<div class="pf-chips" id="peWarr">' +
      PF_WARRANTY.map(function(w){ return '<button type="button" class="pf-chip' + (ex.kafolat_kun === w.d ? ' on' : '') + '" data-d="' + w.d + '">' + L(w.uz, w.ru) + '</button>'; }).join('') + '</div></div>' +

      '<div id="peMsg"></div>' +
      '<div class="pf-savebar"><button class="pf-cta" id="peSave" style="width:100%">' + t().profileEditSaveBtn + '</button></div>' +
      '</div>';

    // --- Asosiy maydonlar (avvalgidek) ---
    var selectedX = {};
    (m.xizmatlar || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean).forEach(function(x){ selectedX[x] = true; });
    apiGet('/api/public/profile/meta').then(function(meta){
      var viloyatSel = mainView.querySelector('#peViloyat');
      if (!viloyatSel) return;
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
        btn.addEventListener('click', function(){ haptic('select'); btn.classList.toggle('active'); });
      });
    });

    // --- Bio ---
    var bioEl = mainView.querySelector('#peBio'), cntEl = mainView.querySelector('#peCnt');
    function updCnt(){
      var n = bioEl.value.length;
      cntEl.textContent = n + ' / ' + BIO_MAX;
      cntEl.className = 'pf-cnt' + (n >= 20 ? ' hi' : '') + (n >= BIO_MAX - 20 ? ' max' : '');
    }
    bioEl.addEventListener('input', updCnt); updCnt();
    mainView.querySelector('#peSample').addEventListener('click', function(){
      haptic('select');
      if (bioEl.value.trim() && !window.confirm(L('Hozirgi matn almashtirilsinmi?', 'Заменить текущий текст?'))) return;
      bioEl.value = sample; updCnt(); bioEl.focus();
    });

    // --- Tajriba ---
    var numEl = mainView.querySelector('#peExpNum');
    function renderExp(bump){
      numEl.textContent = ex.tajriba_yil == null ? L('— yil', '— лет') : pfYears(ex.tajriba_yil);
      if (bump) { numEl.classList.remove('bump'); void numEl.offsetWidth; numEl.classList.add('bump'); }
      Array.prototype.forEach.call(mainView.querySelectorAll('#peExpChips .pf-chip'), function(c){
        c.classList.toggle('on', parseInt(c.getAttribute('data-n'), 10) === ex.tajriba_yil);
      });
    }
    renderExp(false);
    mainView.querySelector('#peExpMinus').addEventListener('click', function(){ haptic('select'); ex.tajriba_yil = Math.max(0, (ex.tajriba_yil == null ? 1 : ex.tajriba_yil) - 1); renderExp(true); });
    mainView.querySelector('#peExpPlus').addEventListener('click', function(){ haptic('select'); ex.tajriba_yil = Math.min(60, (ex.tajriba_yil == null ? -1 : ex.tajriba_yil) + 1); renderExp(true); });
    Array.prototype.forEach.call(mainView.querySelectorAll('#peExpChips .pf-chip'), function(c){
      c.addEventListener('click', function(){ haptic('select'); ex.tajriba_yil = parseInt(c.getAttribute('data-n'), 10); renderExp(true); });
    });

    // --- Ish vaqti ---
    var t1 = mainView.querySelector('#peT1'), t2 = mainView.querySelector('#peT2');
    function markPre(){
      Array.prototype.forEach.call(mainView.querySelectorAll('#peTPre .pf-chip'), function(c){
        c.classList.toggle('on', c.getAttribute('data-a') === t1.value && c.getAttribute('data-b') === t2.value);
      });
    }
    markPre();
    t1.addEventListener('input', markPre); t2.addEventListener('input', markPre);
    Array.prototype.forEach.call(mainView.querySelectorAll('#peTPre .pf-chip'), function(c){
      c.addEventListener('click', function(){ haptic('select'); t1.value = c.getAttribute('data-a'); t2.value = c.getAttribute('data-b'); markPre(); });
    });
    Array.prototype.forEach.call(mainView.querySelectorAll('#peDays .pf-day'), function(b){
      b.addEventListener('click', function(){
        haptic('select');
        var n = parseInt(b.getAttribute('data-n'), 10), i = ex.ish_kunlari.indexOf(n);
        if (i >= 0) ex.ish_kunlari.splice(i, 1); else ex.ish_kunlari.push(n);
        b.classList.toggle('on', i < 0);
      });
    });

    // --- Qulayliklar ---
    Array.prototype.forEach.call(mainView.querySelectorAll('#peAmen .pf-amen'), function(b){
      b.addEventListener('click', function(){
        haptic('select');
        var k = b.getAttribute('data-k'), i = ex.qulayliklar.indexOf(k);
        if (i >= 0) ex.qulayliklar.splice(i, 1); else ex.qulayliklar.push(k);
        b.classList.toggle('on', i < 0);
      });
    });

    // --- Kafolat ---
    Array.prototype.forEach.call(mainView.querySelectorAll('#peWarr .pf-chip'), function(c){
      c.addEventListener('click', function(){
        haptic('select');
        ex.kafolat_kun = parseInt(c.getAttribute('data-d'), 10);
        Array.prototype.forEach.call(mainView.querySelectorAll('#peWarr .pf-chip'), function(o){ o.classList.toggle('on', o === c); });
      });
    });

    // --- Kerakli bo'limga o'tish ---
    if (entry.focus) {
      var secEl = mainView.querySelector('[data-sec="' + entry.focus + '"]');
      if (secEl) setTimeout(function(){
        secEl.scrollIntoView({ behavior:'smooth', block:'start' });
        secEl.classList.add('flash');
        if (entry.focus === 'bio') { try { bioEl.focus({ preventScroll:true }); } catch(e){} }
      }, 650);
    }

    // --- Saqlash ---
    mainView.querySelector('#peSave').addEventListener('click', function(){
      var ism = mainView.querySelector('#peIsm').value.trim();
      var telefon = mainView.querySelector('#peTel').value.trim();
      var viloyat = mainView.querySelector('#peViloyat').value;
      var tuman = mainView.querySelector('#peTuman').value;
      var xizmatlar = Array.prototype.slice.call(mainView.querySelectorAll('.chip-toggle.active')).map(function(b){ return b.getAttribute('data-x'); });
      if (!ism || !telefon || xizmatlar.length === 0) { alert(t().orderErrRequired); return; }
      var a = t1.value, b = t2.value;
      if ((a && !b) || (!a && b)) { pfToast(L('Ish vaqtining boshlanishi va tugashini ikkalasini ham kiriting', 'Укажите и начало, и конец рабочего времени')); return; }
      var payload = {
        bio: bioEl.value.trim(), tajriba_yil: ex.tajriba_yil, ish_boshlash: a, ish_tugash: b,
        ish_kunlari: ex.ish_kunlari.slice().sort(), qulayliklar: ex.qulayliklar, kafolat_kun: ex.kafolat_kun, moljal: ex.moljal
      };
      var saveBtn = mainView.querySelector('#peSave');
      saveBtn.disabled = true; saveBtn.textContent = t().profileEditSaving;
      apiPost('/api/public/profile/master/edit', {
        init_data: getInitData(), ism: ism, telefon: telefon, viloyat: viloyat, tuman: tuman, xizmatlar: xizmatlar, extra: payload
      }).then(function(r){
        if (r.data && r.data.ok) {
          haptic('ok');
          mainView.querySelector('#peMsg').innerHTML = '<p class="note" style="color:var(--green);text-align:center;margin-top:14px">' + t().profileEditSuccess + '</p>';
          m.ism = ism; m.telefon = telefon; m.viloyat = viloyat; m.tuman = tuman; m.xizmatlar = xizmatlar.join(', ');
          m.extra = m.extra || {};
          m.extra.bio = payload.bio; m.extra.tajriba_yil = payload.tajriba_yil; m.extra.ish_boshlash = a; m.extra.ish_tugash = b;
          m.extra.ish_kunlari = payload.ish_kunlari; m.extra.qulayliklar = payload.qulayliklar; m.extra.kafolat_kun = payload.kafolat_kun;
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

  // ---------- Mijoz kartalaridagi qulaylik belgilari ----------
  function pfCardExtras(m){
    var x = m && m.extra;
    if (!x) return '';
    pfInjectCss();
    var rows = [];
    if (x.ochiq_hozir === true) rows.push('<span class="pfc-b open"><i></i>' + L('Hozir ochiq', 'Сейчас открыто') + (x.ish_tugash && (x.qulayliklar || []).indexOf('soat24') < 0 ? ' · ' + (state.lang === 'uz' ? mapEsc(x.ish_tugash) + ' gacha' : 'до ' + mapEsc(x.ish_tugash)) : '') + '</span>');
    else if (x.ochiq_hozir === false) rows.push('<span class="pfc-b">🌙 ' + L('Hozir yopiq', 'Сейчас закрыто') + (x.ish_boshlash ? ' · ' + mapEsc(x.ish_boshlash) + '–' + mapEsc(x.ish_tugash) : '') + '</span>');
    if (x.tajriba_yil != null && x.tajriba_yil >= 1) rows.push('<span class="pfc-b exp">🏅 ' + mapEsc(pfYears(x.tajriba_yil)) + ' ' + L('tajriba', 'опыта') + '</span>');
    if ((x.kafolat_kun || 0) > 0) rows.push('<span class="pfc-b warr">🛡️ ' + L('Kafolat', 'Гарантия') + ' ' + mapEsc(pfWarrLabel(x.kafolat_kun)) + '</span>');
    (x.qulayliklar || []).forEach(function(k){
      var d = pfAmenDef(k);
      if (d) rows.push('<span class="pfc-b">' + d.ic + ' ' + mapEsc(L(d.uz, d.ru)) + '</span>');
    });
    var html = '';
    if (x.bio) html += '<div class="pfc-bio">' + mapEsc(x.bio) + '</div>';
    if (rows.length) html += '<div class="pfc-row">' + rows.join('') + '</div>';
    if (x.moljal) html += '<div class="pfc-loc">📌 ' + mapEsc(x.moljal) + '</div>';
    return html ? '<div class="pfc">' + html + '</div>' : '';
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
      '<button class="row" id="btnBecomeMaster"><span class="idx">📝</span><span class="lbl">' + t().anketaBecomeMaster + '</span><span class="chev">→</span></button>' +
      '</div>' +
      '</div>';

    mainView.querySelector('#btnUserOrders').addEventListener('click', function(){
      haptic('select');
      push({ view:'profileUserOrders', offset: 0 });
    });
    mainView.querySelector('#btnBecomeMaster').addEventListener('click', function(){
      haptic('select');
      push({ view:'anketaGate' });
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
              (o.master.telefon ? '<span>📞 ' + esc(o.master.telefon) + '</span>' : '') +
              (o.master.username || o.master.tg_id
                ? '<span><a class="tg-inline" href="' + (o.master.username ? ('https://t.me/' + o.master.username) : ('tg://user?id=' + o.master.tg_id)) + '" target="_blank">✈️ ' + t().topishWrite + '</a></span>'
                : '') + '</div>'
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

  // ================= ANKETA (USTA BO'LISH) =================

  function resizeImageToDataUrl(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function(){
        var img = new Image();
        img.onerror = reject;
        img.onload = function(){
          var maxDim = 1280;
          var w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderAnketaBlocked(title, hint){
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().menuAnketa + '</div>' +
      '<h2>' + title + '</h2></div>' +
      '<p class="note">' + hint + '</p>' +
      '<button class="btn-primary" id="anketaBackBtn" style="width:100%;padding:13px;border-radius:11px;margin-top:14px">' +
      t().backToMenu + '</button></div>';
    mainView.querySelector('#anketaBackBtn').addEventListener('click', function(){ resetHome(); });
  }

  function renderAnketaGate(){
    mainView.innerHTML = '<div class="view"><div class="empty">' + t().anketaChecking + '</div></div>';
    if (!getInitData()) {
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().topishNoInitData + '</div></div>';
      return;
    }
    if (!API_BASE) {
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().topishApiMissing + '</div></div>';
      return;
    }
    apiGet('/api/public/anketa/status?init_data=' + encodeURIComponent(getInitData())).then(function(res){
      if (!res || !res.ok) {
        mainView.innerHTML = '<div class="view"><div class="empty">' + t().orderErrGeneric + '</div></div>';
        return;
      }
      if (res.status === 'active') {
        renderAnketaBlocked(t().anketaAlreadyActiveTitle, t().anketaAlreadyActiveHint);
      } else if (res.status === 'pending') {
        renderAnketaBlocked(t().anketaAlreadyPendingTitle, t().anketaAlreadyPendingHint);
      } else if (res.status === 'rejected') {
        renderAnketaBlocked(t().anketaAlreadyRejectedTitle, t().anketaAlreadyRejectedHint);
      } else {
        state.anketaForm = {};
        state.stack[state.stack.length - 1] = { view:'anketaViloyat' };
        render();
      }
    }).catch(function(){
      mainView.innerHTML = '<div class="view"><div class="empty">' + t().orderErrGeneric + '</div></div>';
    });
  }

  function renderAnketaViloyat(){
    mainView.innerHTML = '<div class="view"><div class="list-title">📝 ' + t().menuAnketa +
      '<span class="tag">' + t().anketaChooseViloyat + '</span></div>' +
      '<div class="list" id="avList"><div class="empty">' + t().topishSearching + '</div></div></div>';
    apiGet('/api/public/profile/meta').then(function(res){
      var list = (res && res.viloyatlar) || [];
      var html = list.map(function(v, i){
        return '<button class="row" data-v="' + esc(v) + '" style="animation:view-in .2s ' + (Math.min(i,10)*0.03) + 's both">' +
          '<span class="idx">📍</span><span class="lbl">' + esc(v) + '</span><span class="chev">→</span></button>';
      }).join('');
      var listEl = mainView.querySelector('#avList');
      listEl.innerHTML = html || '<div class="empty">' + t().notFound + '</div>';
      listEl.querySelectorAll('[data-v]').forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic('select');
          push({ view:'anketaTuman', viloyat: btn.getAttribute('data-v') });
        });
      });
    }).catch(function(){
      mainView.querySelector('#avList').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
    });
  }

  function renderAnketaTuman(entry){
    mainView.innerHTML =
      '<div class="view"><div class="list-title">📍 ' + esc(entry.viloyat) +
      '<span class="tag">' + t().anketaChooseTuman + '</span></div>' +
      '<p class="note" style="margin:-6px 0 12px">' + t().anketaTumanHint + '</p>' +
      '<div class="chip-toggle-list" id="atList"><div class="empty">' + t().topishSearching + '</div></div>' +
      '</div>';
    apiGet('/api/public/profile/meta').then(function(res){
      var list = (res && res.tumanlar && res.tumanlar[entry.viloyat]) || [];
      var selected = state.anketaForm.tuman_list || [];
      var box = mainView.querySelector('#atList');
      box.innerHTML = list.map(function(tm){
        return '<button type="button" class="chip-toggle' + (selected.indexOf(tm) > -1 ? ' active' : '') + '" data-tm="' + esc(tm) + '">' + esc(tm) + '</button>';
      }).join('') || '<div class="empty">' + t().notFound + '</div>';
      box.querySelectorAll('.chip-toggle').forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic('select');
          btn.classList.toggle('active');
        });
      });

      var bar = document.createElement('div');
      bar.className = 'action-bar'; bar.style.position = 'static'; bar.style.background = 'none'; bar.style.backdropFilter = 'none';
      bar.innerHTML = '<button class="btn-primary" id="atNext" style="width:100%">' + t().continueBtn + '</button>';
      mainView.querySelector('.view').appendChild(bar);

      mainView.querySelector('#atNext').addEventListener('click', function(){
        var chosen = Array.prototype.slice.call(mainView.querySelectorAll('#atList .chip-toggle.active')).map(function(b){ return b.getAttribute('data-tm'); });
        if (chosen.length === 0) {
          alert(t().anketaErrRequired);
          return;
        }
        state.anketaForm.tuman_list = chosen;
        haptic('select');
        push({ view:'anketaForm', viloyat: entry.viloyat });
      });
    }).catch(function(){
      mainView.querySelector('#atList').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
    });
  }

  function renderAnketaForm(entry){
    var f = state.anketaForm || {};
    mainView.innerHTML =
      '<div class="view"><div class="list-title">📝 ' + t().anketaFormTitle + '</div>' +
      '<div class="form-card">' +
      '<div class="field"><label>👤 ' + t().fIsm + '</label><input id="afIsm" value="' + esc(f.ism||'') + '" placeholder="' + t().fIsmPh + '"></div>' +
      '<div class="field"><label>🎂 ' + t().fYil + '</label><input id="afYil" type="tel" inputmode="numeric" value="' + esc(f.yil||'') + '" placeholder="' + t().fYilPh + '"></div>' +
      '<div class="field"><label>📱 ' + t().fTel + '</label><input id="afTel" type="tel" value="' + esc(f.telefon||'') + '" placeholder="' + t().fTelPh + '"></div>' +
      '<div class="field"><label>🪪 ' + t().fPasport + '</label><input id="afPasport" value="' + esc(f.pasport||'') + '" placeholder="' + t().fPasportPh + '" style="text-transform:uppercase">' +
      '<div class="note" style="margin-top:6px">' + t().fPasportHint + '</div></div>' +
      '<div class="field"><label>🔧 ' + t().anketaChooseServices + '</label><div class="chip-toggle-list" id="afXizmatlar"></div></div>' +
      '<div class="field"><label>📷 ' + t().anketaPhotoLabel + '</label>' +
      '<label class="photo-upload' + (f.photo_b64 ? ' got' : '') + '" id="afPhotoBox">' +
      '<span class="pu-thumb" id="afPhotoThumb">' + (f.photo_b64 ? '' : '📷') + '</span>' +
      '<span class="pu-label" id="afPhotoLabel">' + (f.photo_b64 ? t().anketaPhotoGot : t().anketaPhotoHint) + '</span>' +
      '<input type="file" accept="image/*" id="afPhotoInput"></label></div>' +
      '</div>' +
      '<button class="loc-btn" id="afLocBtn">' + (f.lat ? t().topishLocGot : t().anketaLocHint) + '</button>' +
      '</div>';

    if (f.photo_b64) {
      mainView.querySelector('#afPhotoThumb').style.backgroundImage = 'url(' + f.photo_b64 + ')';
    }
    if (f.lat) mainView.querySelector('#afLocBtn').classList.add('got');

    mainView.querySelector('#afLocBtn').addEventListener('click', function(){
      requestLocation().then(function(loc){
        if (loc) {
          state.anketaForm.lat = loc.lat; state.anketaForm.lon = loc.lon;
          var btn = mainView.querySelector('#afLocBtn');
          btn.classList.add('got'); btn.textContent = t().topishLocGot;
        }
      });
    });

    apiGet('/api/public/profile/meta').then(function(meta){
      var selectedX = {};
      (f.xizmatlar || []).forEach(function(x){ selectedX[x] = true; });
      var xBox = mainView.querySelector('#afXizmatlar');
      if (!xBox) return;
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

    mainView.querySelector('#afPhotoInput').addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var label = mainView.querySelector('#afPhotoLabel');
      label.textContent = t().profileSending;
      resizeImageToDataUrl(file).then(function(dataUrl){
        state.anketaForm.photo_b64 = dataUrl;
        var box = mainView.querySelector('#afPhotoBox');
        box.classList.add('got');
        var thumb = mainView.querySelector('#afPhotoThumb');
        thumb.style.backgroundImage = 'url(' + dataUrl + ')';
        thumb.textContent = '';
        label.textContent = t().anketaPhotoGot;
      }).catch(function(){
        label.textContent = t().anketaPhotoHint;
        alert(t().orderErrGeneric);
      });
    });

    var bar = document.createElement('div');
    bar.className = 'action-bar'; bar.style.position = 'static'; bar.style.background = 'none'; bar.style.backdropFilter = 'none';
    bar.innerHTML = '<button class="btn-primary" id="afNext" style="width:100%">' + t().continueBtn + '</button>';
    mainView.querySelector('.view').appendChild(bar);

    mainView.querySelector('#afNext').addEventListener('click', function(){
      var ism = mainView.querySelector('#afIsm').value.trim();
      var yil = mainView.querySelector('#afYil').value.trim();
      var telefon = mainView.querySelector('#afTel').value.trim();
      var pasport = mainView.querySelector('#afPasport').value.trim().toUpperCase();
      var xizmatlar = Array.prototype.slice.call(mainView.querySelectorAll('#afXizmatlar .chip-toggle.active')).map(function(b){ return b.getAttribute('data-x'); });
      var photo_b64 = state.anketaForm.photo_b64;

      if (!ism || ism.length < 3 || !telefon || xizmatlar.length === 0 || !pasport) {
        alert(t().anketaErrRequired);
        return;
      }
      var raqam = telefon.replace(/\D/g, '');
      if (raqam.length < 9) {
        alert(t().orderErrPhone);
        return;
      }
      var yilNum = parseInt(yil, 10);
      if (!/^\d+$/.test(yil) || yilNum < 1950 || yilNum > 2005) {
        alert(t().anketaErrYil);
        return;
      }
      var harflar = (pasport.match(/[A-Z]/g) || []).length;
      var raqamlar = (pasport.match(/[0-9]/g) || []).length;
      if (pasport.replace(/\s/g,'').length < 7 || harflar < 2 || raqamlar < 6) {
        alert(t().anketaErrPasport);
        return;
      }
      if (!photo_b64) {
        alert(t().anketaErrPhoto);
        return;
      }

      state.anketaForm = {
        ism: ism, yil: yil, telefon: telefon, pasport: pasport, xizmatlar: xizmatlar,
        photo_b64: photo_b64, lat: state.anketaForm.lat, lon: state.anketaForm.lon,
        tuman_list: state.anketaForm.tuman_list
      };
      haptic('select');
      push({ view:'anketaContract', viloyat: entry.viloyat });
    });
  }

  function renderAnketaContract(entry){
    mainView.innerHTML =
      '<div class="view"><div class="hero" style="padding-bottom:14px"><h1>' + t().anketaContractTitle + '</h1>' +
      '<p style="color:var(--text-2);font-size:12.5px;margin-top:6px">' + t().anketaContractHint + '</p></div>' +
      '<div id="shartnomaBox"><div class="empty">' + t().anketaChecking + '</div></div>' +
      '<div id="anketaSubmitErr"></div>' +
      '</div>';

    apiGet('/api/public/anketa/shartnoma?lang=' + state.lang).then(function(res){
      var parts = (res && res.parts) || [];
      var box = mainView.querySelector('#shartnomaBox');
      box.innerHTML = parts.map(function(p){ return '<div class="shartnoma-box">' + inline(p) + '</div>'; }).join('');
    }).catch(function(){
      mainView.querySelector('#shartnomaBox').innerHTML = '<div class="empty">' + t().orderErrGeneric + '</div>';
    });

    var bar = document.createElement('div');
    bar.className = 'action-bar';
    bar.style.position = 'static'; bar.style.background = 'none'; bar.style.backdropFilter = 'none';
    bar.innerHTML =
      '<button class="btn-ghost" id="scDecline">' + t().anketaContractDecline + '</button>' +
      '<button class="btn-primary" id="scAgree">' + t().anketaContractAgree + '</button>';
    mainView.querySelector('.view').appendChild(bar);

    mainView.querySelector('#scDecline').addEventListener('click', function(){
      haptic('tap');
      alert(t().anketaContractDeclinedMsg);
    });

    mainView.querySelector('#scAgree').addEventListener('click', function(){
      var btn = mainView.querySelector('#scAgree');
      btn.disabled = true;
      btn.textContent = t().anketaSubmitting;
      var f = state.anketaForm;
      apiPost('/api/public/anketa/submit', {
        init_data: getInitData(), lang: state.lang,
        viloyat: entry.viloyat, tuman_list: f.tuman_list,
        ism: f.ism, yil: f.yil, telefon: f.telefon, pasport: f.pasport,
        xizmatlar: f.xizmatlar, photo_b64: f.photo_b64,
        lat: f.lat, lon: f.lon, shartnoma_imzo: true
      }).then(function(res){
        if (res.data && res.data.ok) {
          haptic('ok');
          state.anketaForm = {};
          push({ view:'anketaSuccess' });
        } else {
          btn.disabled = false; btn.textContent = t().anketaContractAgree;
          var err = (res.data && res.data.error) || t().orderErrGeneric;
          mainView.querySelector('#anketaSubmitErr').innerHTML =
            '<p class="note" style="color:var(--red)">⚠️ ' + esc(err) + '</p>';
        }
      }).catch(function(){
        btn.disabled = false; btn.textContent = t().anketaContractAgree;
        mainView.querySelector('#anketaSubmitErr').innerHTML =
          '<p class="note" style="color:var(--red)">⚠️ ' + t().orderErrGeneric + '</p>';
      });
    });
  }

  function renderAnketaSuccess(){
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping" style="background:var(--green)"></span>OK</div>' +
      '<h2>' + t().anketaSuccessTitle + '</h2></div>' +
      '<p class="note">' + t().anketaSuccessHint + '</p>' +
      '<button class="btn-primary" id="anketaSuccessBack" style="width:100%;padding:13px;border-radius:11px;margin-top:14px">' +
      t().backToMenu + '</button></div>';
    mainView.querySelector('#anketaSuccessBack').addEventListener('click', function(){ resetHome(); });
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
      var hasAnim = true;
      return '<button class="row" data-idx="' + i + '" style="animation:view-in .3s ' + (Math.min(i,10)*0.04) + 's both">' +
        '<span class="idx">' + String(i+1).padStart(2,'0') + '</span>' +
        '<span class="lbl">' + esc(pick(item,'label')) + '</span>' +
        (hasAnim ? '<span class="play"><b></b>VIDEO</span>' : '') +
        '</button>';
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
    var codesRow = '';
    if (st.codes) {
      codesRow = '<button class="row" data-pcodes="1" style="border-color:var(--amber-dim)">' +
        '<span class="idx">💡</span><span class="lbl"><strong>' + t().errorCodes + '</strong></span><span class="chev">→</span></button>';
    }
    mainView.innerHTML = '<div class="view"><div class="list-title">🖨️ ' + pick(st,'name') + '<span class="tag">' + t().chooseBrand + '</span></div><div class="list">' + rows + codesRow + '</div></div>';
    mainView.querySelectorAll('[data-bi]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        push({ view:'brand', catId:c.id, subId: st.id, brandIdx: parseInt(btn.getAttribute('data-bi'),10), brandName: st.brands[parseInt(btn.getAttribute('data-bi'),10)].name });
      });
    });
    var pcodesBtn = mainView.querySelector('[data-pcodes]');
    if (pcodesBtn) {
      pcodesBtn.addEventListener('click', function(){
        haptic('select');
        push({ view:'printerCodesList', catId:c.id, subId: st.id });
      });
    }
  }

  function renderPrinterCodesList(entry){
    var c = catById(entry.catId);
    var st = c.subtypes.find(function(s){ return s.id === entry.subId; });
    var rows = st.codes.brands.map(function(b, i){
      return '<button class="row brand-row" data-bi="' + i + '" style="animation:view-in .2s ' + (i*0.03) + 's both">' +
        '<span class="idx">💡</span><span class="lbl">' + esc(b.name) + '</span><span class="chev">→</span></button>';
    }).join('');
    mainView.innerHTML = '<div class="view"><div class="list-title">💡 ' + t().errorCodes + '<span class="tag">' + t().chooseBrand + '</span></div><div class="list">' + rows + '</div></div>';
    mainView.querySelectorAll('[data-bi]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        var i = parseInt(btn.getAttribute('data-bi'),10);
        push({ view:'printerCodesBrand', catId:c.id, subId: st.id, brandIdx:i, brandName: st.codes.brands[i].name });
      });
    });
  }

  function renderPrinterCodesBrand(entry){
    var c = catById(entry.catId);
    var st = c.subtypes.find(function(s){ return s.id === entry.subId; });
    var brand = st.codes.brands[entry.brandIdx];
    var raw = pick(brand, 'text');
    var blocksHtml = codesTextToHTML(raw);
    var illusKey = 'rangli_err_' + brandSlug(brand.name);
    var illusHtml = renderIllustrationBlock(illusKey);
    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().diagnosing + '</div>' +
      '<h2>' + esc(brand.name) + '</h2>' +
      '</div>' + illusHtml + blocksHtml +
      '<p class="note">ℹ️ ' + t().note + '</p></div>';
    wireIllustrationCycle();
  }

  function brandSlug(name){
    var n = name.toLowerCase();
    if (n.indexOf('canon') !== -1) return 'canon';
    if (n.indexOf('hp') !== -1) return 'hp';
    if (n.indexOf('epson') !== -1) return 'epson';
    if (n.indexOf('brother') !== -1) return 'brother';
    return 'generic';
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

  // ---------- Ko'rgazmali animatsiyalar (illustratsiyalar) ----------
  // Har bir bandga (diagnostika kaliti bo'yicha) 2-4 bosqichli animatsion
  // "tekshirish" sxemasi biriktirilishi mumkin. Yangi bandlar uchun shu
  // formatda qo'shib borish mumkin — key = last.py'dagi D lug'ati kaliti.
  var ILLUSTRATIONS = {
    "tv_0": {
      device: "📺",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🔋", caption_uz:"Pult batareyasini tekshiring", caption_ru:"Проверьте батарейки пульта" },
      ],
    },
    "tv_1": {
      device: "📺",
      steps: [
        { icon:"🖥️", caption_uz:"Kabelni tekshiring", caption_ru:"Проверьте кабель" },
        { icon:"⚙️", caption_uz:"Sozlamalarni tekshiring", caption_ru:"Проверьте настройки" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_2": {
      device: "📺",
      steps: [
        { icon:"🔊", caption_uz:"Ovoz balandligini tekshiring", caption_ru:"Проверьте громкость" },
        { icon:"🔌", caption_uz:"Audio ulanishni tekshiring", caption_ru:"Проверьте аудио-подключение" },
        { icon:"⚙️", caption_uz:"Ovoz manbasini tekshiring", caption_ru:"Проверьте источник звука" },
      ],
    },
    "tv_3": {
      device: "📺",
      steps: [
        { icon:"🖥️", caption_uz:"Kabelni tekshiring", caption_ru:"Проверьте кабель" },
        { icon:"⚙️", caption_uz:"Sozlamalarni tekshiring", caption_ru:"Проверьте настройки" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_4": {
      device: "📺",
      steps: [
        { icon:"📶", caption_uz:"Signalni tekshiring", caption_ru:"Проверьте сигнал" },
        { icon:"🔄", caption_uz:"Qurilmani qayta ishga tushiring", caption_ru:"Перезагрузите устройство" },
        { icon:"⚙️", caption_uz:"Tarmoq sozlamalarini qayta kiriting", caption_ru:"Заново введите настройки сети" },
      ],
    },
    "tv_5": {
      device: "📺",
      steps: [
        { icon:"📶", caption_uz:"Signalni tekshiring", caption_ru:"Проверьте сигнал" },
        { icon:"🔄", caption_uz:"Qurilmani qayta ishga tushiring", caption_ru:"Перезагрузите устройство" },
        { icon:"⚙️", caption_uz:"Tarmoq sozlamalarini qayta kiriting", caption_ru:"Заново введите настройки сети" },
      ],
    },
    "tv_6": {
      device: "📺",
      steps: [
        { icon:"📡", caption_uz:"Antenna signalini tekshiring", caption_ru:"Проверьте сигнал антенны" },
        { icon:"🔍", caption_uz:"Avtomatik qidiruvni ishga tushiring", caption_ru:"Запустите автопоиск" },
        { icon:"⚙️", caption_uz:"Mintaqa sozlamasini tekshiring", caption_ru:"Проверьте настройку региона" },
      ],
    },
    "tv_7": {
      device: "📺",
      steps: [
        { icon:"🔋", caption_uz:"Batareyasini almashtiring", caption_ru:"Замените батарейки" },
        { icon:"🧹", caption_uz:"Linzasini tozalang", caption_ru:"Протрите линзу" },
        { icon:"🔄", caption_uz:"Qurilma bilan qayta ulang", caption_ru:"Заново привяжите к устройству" },
      ],
    },
    "tv_8": {
      device: "📺",
      steps: [
        { icon:"🔌", caption_uz:"Rozetka kuchlanishini tekshiring", caption_ru:"Проверьте напряжение в розетке" },
        { icon:"🌡️", caption_uz:"Qizib ketmaganini tekshiring", caption_ru:"Проверьте перегрев" },
        { icon:"🔄", caption_uz:"Dasturiy nosozlikni tekshirish uchun reset qiling", caption_ru:"Сделайте сброс настроек" },
      ],
    },
    "tv_9": {
      device: "📺",
      steps: [
        { icon:"🖥️", caption_uz:"Kabelni tekshiring", caption_ru:"Проверьте кабель" },
        { icon:"⚙️", caption_uz:"Sozlamalarni tekshiring", caption_ru:"Проверьте настройки" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_10": {
      device: "📺",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_11": {
      device: "📺",
      steps: [
        { icon:"🖥️", caption_uz:"Kabelni tekshiring", caption_ru:"Проверьте кабель" },
        { icon:"⚙️", caption_uz:"Sozlamalarni tekshiring", caption_ru:"Проверьте настройки" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_12": {
      device: "📺",
      steps: [
        { icon:"🖥️", caption_uz:"Kabelni tekshiring", caption_ru:"Проверьте кабель" },
        { icon:"⚙️", caption_uz:"Sozlamalarni tekshiring", caption_ru:"Проверьте настройки" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_13": {
      device: "📺",
      steps: [
        { icon:"🖥️", caption_uz:"Kabelni tekshiring", caption_ru:"Проверьте кабель" },
        { icon:"⚙️", caption_uz:"Sozlamalarni tekshiring", caption_ru:"Проверьте настройки" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "tv_14": {
      device: "📺",
      steps: [
        { icon:"🔌", caption_uz:"Rozetkadan darhol uzing", caption_ru:"Сразу отключите от розетки" },
        { icon:"✋", caption_uz:"Ekranga tegmang va bosmang", caption_ru:"Не трогайте и не нажимайте на экран" },
        { icon:"📸", caption_uz:"Suratga oling, modelni yozib oling", caption_ru:"Сфотографируйте, запишите модель" },
        { icon:"🛠️", caption_uz:"Ustaga murojaat qiling — matritsa almashtiriladi", caption_ru:"Обратитесь к мастеру — замена матрицы" },
      ],
    },
    "kond_0": {
      device: "❄️",
      steps: [
        { icon:"💧", caption_uz:"Shlanga ulanishini tekshiring", caption_ru:"Проверьте соединение шланга" },
        { icon:"🔧", caption_uz:"Filtr / klapanni ko'zdan kechiring", caption_ru:"Осмотрите фильтр / клапан" },
        { icon:"🪣", caption_uz:"Drenaj tizimini tozalang", caption_ru:"Прочистите дренажную систему" },
      ],
    },
    "kond_1": {
      device: "❄️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "kond_2": {
      device: "❄️",
      steps: [
        { icon:"🔌", caption_uz:"Kontaktor / kabelni tekshiring", caption_ru:"Проверьте контактор / кабель" },
        { icon:"🌀", caption_uz:"Ventilyator aylanishini tekshiring", caption_ru:"Проверьте вращение вентилятора" },
        { icon:"⚡", caption_uz:"Kondensatorni tekshiring", caption_ru:"Проверьте конденсатор" },
      ],
    },
    "kond_3": {
      device: "❄️",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "kond_4": {
      device: "❄️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "kond_6": {
      device: "❄️",
      steps: [
        { icon:"🧹", caption_uz:"Filtrni tozalang", caption_ru:"Прочистите фильтр" },
        { icon:"💧", caption_uz:"Drenaj tizimini tekshiring", caption_ru:"Проверьте дренажную систему" },
        { icon:"🦠", caption_uz:"Ichki blokni dezinfeksiya qiling", caption_ru:"Продезинфицируйте внутренний блок" },
      ],
    },
    "kond_7": {
      device: "❄️",
      steps: [
        { icon:"👂", caption_uz:"Ovoz manbaini aniqlang", caption_ru:"Определите источник звука" },
        { icon:"🔩", caption_uz:"Mahkamlovchi qismlarni tekshiring", caption_ru:"Проверьте крепёжные детали" },
        { icon:"⚙️", caption_uz:"Podshipnik / motorni ko'zdan kechiring", caption_ru:"Осмотрите подшипник / мотор" },
      ],
    },
    "kond_8": {
      device: "❄️",
      steps: [
        { icon:"🔌", caption_uz:"Rozetka kuchlanishini tekshiring", caption_ru:"Проверьте напряжение в розетке" },
        { icon:"🌡️", caption_uz:"Qizib ketmaganini tekshiring", caption_ru:"Проверьте перегрев" },
        { icon:"🔄", caption_uz:"Dasturiy nosozlikni tekshirish uchun reset qiling", caption_ru:"Сделайте сброс настроек" },
      ],
    },
    "kond_9": {
      device: "❄️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "kond_10": {
      device: "❄️",
      steps: [
        { icon:"🔋", caption_uz:"Batareyasini almashtiring", caption_ru:"Замените батарейки" },
        { icon:"🧹", caption_uz:"Linzasini tozalang", caption_ru:"Протрите линзу" },
        { icon:"🔄", caption_uz:"Qurilma bilan qayta ulang", caption_ru:"Заново привяжите к устройству" },
      ],
    },
    "kond_11": {
      device: "❄️",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "kond_5": {
      device: "❄️",
      steps: [
        { icon:"⚙️", caption_uz:"Rejimni tanlang", caption_ru:"Выберите режим" },
        { icon:"🌡️", caption_uz:"Haroratni sozlang", caption_ru:"Настройте температуру" },
        { icon:"💨", caption_uz:"Ventilyator tezligini tanlang", caption_ru:"Выберите скорость вентилятора" },
      ],
    },
    "xolod_0": {
      device: "🧊",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "xolod_1": {
      device: "🧊",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "xolod_2": {
      device: "🧊",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "xolod_3": {
      device: "🧊",
      steps: [
        { icon:"💧", caption_uz:"Shlanga ulanishini tekshiring", caption_ru:"Проверьте соединение шланга" },
        { icon:"🔧", caption_uz:"Filtr / klapanni ko'zdan kechiring", caption_ru:"Осмотрите фильтр / клапан" },
        { icon:"🪣", caption_uz:"Drenaj tizimini tozalang", caption_ru:"Прочистите дренажную систему" },
      ],
    },
    "xolod_4": {
      device: "🧊",
      steps: [
        { icon:"🔌", caption_uz:"Elektr ta'minotini tekshiring", caption_ru:"Проверьте электропитание" },
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🌀", caption_uz:"Kompressor relesini tekshiring", caption_ru:"Проверьте реле компрессора" },
      ],
    },
    "xolod_5": {
      device: "🧊",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "xolod_6": {
      device: "🧊",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🧊", caption_uz:"Freon darajasini tekshiring", caption_ru:"Проверьте уровень фреона" },
        { icon:"🌀", caption_uz:"Kompressor ovoziga quloq soling", caption_ru:"Прислушайтесь к компрессору" },
      ],
    },
    "kir_0": {
      device: "🫧",
      steps: [
        { icon:"🚰", caption_uz:"Suv kranini tekshiring", caption_ru:"Проверьте кран подачи воды" },
        { icon:"🧵", caption_uz:"Filtr to'rini tozalang", caption_ru:"Прочистите сетку фильтра" },
        { icon:"🔌", caption_uz:"Klapan elektromagnitini tekshiring", caption_ru:"Проверьте электромагнитный клапан" },
      ],
    },
    "kir_1": {
      device: "🫧",
      steps: [
        { icon:"🚰", caption_uz:"Suv kranini tekshiring", caption_ru:"Проверьте кран подачи воды" },
        { icon:"🧵", caption_uz:"Filtr to'rini tozalang", caption_ru:"Прочистите сетку фильтра" },
        { icon:"🔌", caption_uz:"Klapan elektromagnitini tekshiring", caption_ru:"Проверьте электромагнитный клапан" },
      ],
    },
    "kir_2": {
      device: "🫧",
      steps: [
        { icon:"🔒", caption_uz:"Qulfni tekshiring", caption_ru:"Проверьте замок" },
        { icon:"🔌", caption_uz:"Elektr ta'minotini tekshiring", caption_ru:"Проверьте электропитание" },
        { icon:"⏳", caption_uz:"Dastur tugashini kuting", caption_ru:"Дождитесь окончания программы" },
      ],
    },
    "kir_3": {
      device: "🫧",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "kir_4": {
      device: "🫧",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "suv_0": {
      device: "💧",
      steps: [
        { icon:"💧", caption_uz:"Shlanga ulanishini tekshiring", caption_ru:"Проверьте соединение шланга" },
        { icon:"🔧", caption_uz:"Filtr / klapanni ko'zdan kechiring", caption_ru:"Осмотрите фильтр / клапан" },
        { icon:"🪣", caption_uz:"Drenaj tizimini tozalang", caption_ru:"Прочистите дренажную систему" },
      ],
    },
    "suv_1": {
      device: "💧",
      steps: [
        { icon:"🚰", caption_uz:"Suv kranini tekshiring", caption_ru:"Проверьте кран подачи воды" },
        { icon:"🧵", caption_uz:"Filtr to'rini tozalang", caption_ru:"Прочистите сетку фильтра" },
        { icon:"🔌", caption_uz:"Klapan elektromagnitini tekshiring", caption_ru:"Проверьте электромагнитный клапан" },
      ],
    },
    "komp_0": {
      device: "🖥️",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "komp_1": {
      device: "🖥️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "komp_2": {
      device: "🖥️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "dux_0": {
      device: "♨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "dux_1": {
      device: "♨️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "dux_2": {
      device: "♨️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "dux_3": {
      device: "♨️",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "mikro_0": {
      device: "📡",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "mikro_1": {
      device: "📡",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "mikro_2": {
      device: "📡",
      steps: [
        { icon:"👂", caption_uz:"Ovoz manbaini aniqlang", caption_ru:"Определите источник звука" },
        { icon:"🔩", caption_uz:"Mahkamlovchi qismlarni tekshiring", caption_ru:"Проверьте крепёжные детали" },
        { icon:"⚙️", caption_uz:"Podshipnik / motorni ko'zdan kechiring", caption_ru:"Осмотрите подшипник / мотор" },
      ],
    },
    "mikro_3": {
      device: "📡",
      steps: [
        { icon:"⚙️", caption_uz:"Aylantirgich moslamasini tekshiring", caption_ru:"Проверьте вращающий механизм" },
        { icon:"🔧", caption_uz:"Tishli g'ildirakchani tekshiring", caption_ru:"Проверьте шестерёнку" },
        { icon:"🍽️", caption_uz:"Tarelka joylashuvini tekshiring", caption_ru:"Проверьте установку тарелки" },
      ],
    },
    "piles_0": {
      device: "🌀",
      steps: [
        { icon:"🧹", caption_uz:"Filtr / g'altaklarni tozalang", caption_ru:"Прочистите фильтр / ролики" },
        { icon:"🔧", caption_uz:"Mahkamlanishini tekshiring", caption_ru:"Проверьте крепление" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезапустите" },
      ],
    },
    "piles_1": {
      device: "🌀",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "dazmol_0": {
      device: "👕",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "dazmol_1": {
      device: "👕",
      steps: [
        { icon:"🌡️", caption_uz:"Termostatni tekshiring", caption_ru:"Проверьте термостат" },
        { icon:"🔥", caption_uz:"Isitish elementini ko'zdan kechiring", caption_ru:"Осмотрите нагревательный элемент" },
        { icon:"⏱️", caption_uz:"Rejim / vaqt sozlamasini tekshiring", caption_ru:"Проверьте режим / таймер" },
      ],
    },
    "dazmol_2": {
      device: "👕",
      steps: [
        { icon:"🧹", caption_uz:"Filtr / g'altaklarni tozalang", caption_ru:"Прочистите фильтр / ролики" },
        { icon:"🔧", caption_uz:"Mahkamlanishini tekshiring", caption_ru:"Проверьте крепление" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезапустите" },
      ],
    },
    "dazmol_3": {
      device: "👕",
      steps: [
        { icon:"🧹", caption_uz:"Filtr / g'altaklarni tozalang", caption_ru:"Прочистите фильтр / ролики" },
        { icon:"🔧", caption_uz:"Mahkamlanishini tekshiring", caption_ru:"Проверьте крепление" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезапустите" },
      ],
    },
    "vent": {
      device: "💨",
      steps: [
        { icon:"🔍", caption_uz:"Tashqi ko'rinishni tekshiring", caption_ru:"Осмотрите внешний вид" },
        { icon:"🔌", caption_uz:"Ulanishlarni tekshiring", caption_ru:"Проверьте соединения" },
        { icon:"🛠️", caption_uz:"Ustaga murojaat qiling", caption_ru:"Обратитесь к мастеру" },
      ],
    },
    "stab": {
      device: "⚡",
      steps: [
        { icon:"🔍", caption_uz:"Tashqi ko'rinishni tekshiring", caption_ru:"Осмотрите внешний вид" },
        { icon:"🔌", caption_uz:"Ulanishlarni tekshiring", caption_ru:"Проверьте соединения" },
        { icon:"🛠️", caption_uz:"Ustaga murojaat qiling", caption_ru:"Обратитесь к мастеру" },
      ],
    },
    "ups": {
      device: "🔌",
      steps: [
        { icon:"🔍", caption_uz:"Tashqi ko'rinishni tekshiring", caption_ru:"Осмотрите внешний вид" },
        { icon:"🔌", caption_uz:"Ulanishlarni tekshiring", caption_ru:"Проверьте соединения" },
        { icon:"🛠️", caption_uz:"Ustaga murojaat qiling", caption_ru:"Обратитесь к мастеру" },
      ],
    },
    "printer_canon_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_canon_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_canon_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_canon_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_canon_4": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_canon_5": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_canon_6": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "printer_canon_7": {
      device: "🖨️",
      steps: [
        { icon:"🔧", caption_uz:"Karetka yo'lini tozalang", caption_ru:"Прочистите направляющую каретки" },
        { icon:"🛢️", caption_uz:"Moylash kerakligini tekshiring", caption_ru:"Проверьте необходимость смазки" },
        { icon:"🔌", caption_uz:"Motor ulanishini tekshiring", caption_ru:"Проверьте подключение мотора" },
      ],
    },
    "printer_canon_8": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_canon_9": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"USB / tarmoq ulanishini tekshiring", caption_ru:"Проверьте USB / сеть" },
        { icon:"🧼", caption_uz:"Skaner oynasini tozalang", caption_ru:"Протрите стекло сканера" },
        { icon:"🔄", caption_uz:"Drayverni qayta o'rnating", caption_ru:"Переустановите драйвер" },
      ],
    },
    "printer_hp_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_hp_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_hp_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_hp_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_hp_4": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_hp_5": {
      device: "🖨️",
      steps: [
        { icon:"💡", caption_uz:"Xatolik kodiga qarang", caption_ru:"Посмотрите код ошибки" },
        { icon:"📖", caption_uz:"Qo'llanmadan kodni toping", caption_ru:"Найдите код в инструкции" },
        { icon:"🔧", caption_uz:"Ko'rsatilgan qismni tekshiring", caption_ru:"Проверьте указанный узел" },
      ],
    },
    "printer_hp_6": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_hp_7": {
      device: "🖨️",
      steps: [
        { icon:"🖥️", caption_uz:"Print navbatini tozalang", caption_ru:"Очистите очередь печати" },
        { icon:"🔄", caption_uz:"Spooler xizmatini qayta ishga tushiring", caption_ru:"Перезапустите службу печати" },
        { icon:"🔌", caption_uz:"Kabel / tarmoqni tekshiring", caption_ru:"Проверьте кабель / сеть" },
      ],
    },
    "printer_hp_8": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Duplex modulini tekshiring", caption_ru:"Проверьте модуль дуплекса" },
        { icon:"🔧", caption_uz:"To'g'ri o'rnatilganini tekshiring", caption_ru:"Проверьте правильность установки" },
        { icon:"⚙️", caption_uz:"Sozlamalarni qayta tekshiring", caption_ru:"Перепроверьте настройки" },
      ],
    },
    "printer_hp_9": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"USB / tarmoq ulanishini tekshiring", caption_ru:"Проверьте USB / сеть" },
        { icon:"🧼", caption_uz:"Skaner oynasini tozalang", caption_ru:"Протрите стекло сканера" },
        { icon:"🔄", caption_uz:"Drayverni qayta o'rnating", caption_ru:"Переустановите драйвер" },
      ],
    },
    "printer_epson_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_epson_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_epson_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_epson_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_epson_4": {
      device: "🖨️",
      steps: [
        { icon:"🔧", caption_uz:"Karetka yo'lini tozalang", caption_ru:"Прочистите направляющую каретки" },
        { icon:"🛢️", caption_uz:"Moylash kerakligini tekshiring", caption_ru:"Проверьте необходимость смазки" },
        { icon:"🔌", caption_uz:"Motor ulanishini tekshiring", caption_ru:"Проверьте подключение мотора" },
      ],
    },
    "printer_epson_5": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_epson_6": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_epson_7": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_epson_8": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabel / rozetkani tekshiring", caption_ru:"Проверьте кабель / розетку" },
        { icon:"💡", caption_uz:"Indikator chirog'iga qarang", caption_ru:"Посмотрите на индикатор" },
        { icon:"🧯", caption_uz:"Saqlagich / tugmani tekshiring", caption_ru:"Проверьте предохранитель/кнопку" },
      ],
    },
    "printer_epson_9": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_brother_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_brother_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_brother_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_brother_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_brother_4": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_brother_5": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_brother_6": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_brother_7": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_brother_8": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Qurilmani reset qiling", caption_ru:"Сделайте сброс устройства" },
        { icon:"🔋", caption_uz:"Quvvatni tekshiring", caption_ru:"Проверьте питание" },
        { icon:"🛠️", caption_uz:"Platani tekshirish uchun ustaga murojaat qiling", caption_ru:"Обратитесь к мастеру для проверки платы" },
      ],
    },
    "printer_brother_9": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"USB / tarmoq ulanishini tekshiring", caption_ru:"Проверьте USB / сеть" },
        { icon:"🧼", caption_uz:"Skaner oynasini tozalang", caption_ru:"Протрите стекло сканера" },
        { icon:"🔄", caption_uz:"Drayverni qayta o'rnating", caption_ru:"Переустановите драйвер" },
      ],
    },
    "rangli_err_canon": {
      device: "🖨️",
      steps: [
        { icon:"⚠️", caption_uz:"Alarm chirog'ining necha marta milt-milt qilishini sanang", caption_ru:"Посчитайте, сколько раз мигает индикатор Alarm" },
        { icon:"🔢", caption_uz:"Sanoqni pastdagi kod jadvali bilan solishtiring", caption_ru:"Сравните счёт с таблицей кодов ниже" },
        { icon:"🛠️", caption_uz:"Mos yechim bo'yicha qadamlarni bajaring", caption_ru:"Выполните шаги для найденного кода" },
        { icon:"🔄", caption_uz:"Printerni qayta ishga tushirib tekshiring", caption_ru:"Перезапустите принтер и проверьте" },
      ],
    },
    "rangli_err_hp": {
      device: "🖨️",
      steps: [
        { icon:"🔎", caption_uz:"Qaysi chiroq yonayotgani/milt-milt qilayotganini aniqlang", caption_ru:"Определите, какой индикатор горит/мигает" },
        { icon:"🔢", caption_uz:"Chiroq holatini pastdagi jadval bilan solishtiring", caption_ru:"Сравните состояние индикатора с таблицей ниже" },
        { icon:"🛠️", caption_uz:"Mos yechim bo'yicha qadamlarni bajaring", caption_ru:"Выполните шаги для найденной причины" },
        { icon:"🔄", caption_uz:"Printerni qayta ishga tushirib tekshiring", caption_ru:"Перезапустите принтер и проверьте" },
      ],
    },
    "rangli_err_epson": {
      device: "🖨️",
      steps: [
        { icon:"🔎", caption_uz:"Power va siyoh chirog'i qanday yonayotganiga qarang", caption_ru:"Посмотрите, как горят индикаторы питания и чернил" },
        { icon:"🔢", caption_uz:"Holatni pastdagi kod jadvali bilan solishtiring", caption_ru:"Сравните состояние с таблицей кодов ниже" },
        { icon:"🛠️", caption_uz:"Mos yechim bo'yicha qadamlarni bajaring", caption_ru:"Выполните шаги для найденной причины" },
        { icon:"🔄", caption_uz:"Printerni qayta ishga tushirib tekshiring", caption_ru:"Перезапустите принтер и проверьте" },
      ],
    },
    "rangli_err_brother": {
      device: "🖨️",
      steps: [
        { icon:"🔎", caption_uz:"Ekrandagi xabar yoki chiroqni o'qing", caption_ru:"Прочитайте сообщение на экране или индикатор" },
        { icon:"🔢", caption_uz:"Xabarni pastdagi jadval bilan solishtiring", caption_ru:"Сравните сообщение с таблицей ниже" },
        { icon:"🛠️", caption_uz:"Mos yechim bo'yicha qadamlarni bajaring", caption_ru:"Выполните шаги для найденной причины" },
        { icon:"🔄", caption_uz:"Printerni qayta ishga tushirib tekshiring", caption_ru:"Перезапустите принтер и проверьте" },
      ],
    },
    "printer_hp_laser_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_hp_laser_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_hp_laser_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_hp_laser_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_hp_laser_4": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_hp_laser_5": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_hp_laser_6": {
      device: "🖨️",
      steps: [
        { icon:"🌡️", caption_uz:"Fuser haroratini tekshiring", caption_ru:"Проверьте температуру печки" },
        { icon:"🔌", caption_uz:"Ulanishni tekshiring", caption_ru:"Проверьте соединение" },
        { icon:"⏳", caption_uz:"Sovishini kuting", caption_ru:"Дайте остыть" },
      ],
    },
    "printer_hp_laser_7": {
      device: "🖨️",
      steps: [
        { icon:"🥁", caption_uz:"Drum (baraban) holatini tekshiring", caption_ru:"Проверьте состояние барабана" },
        { icon:"🧼", caption_uz:"Ichini tozalang", caption_ru:"Прочистите внутри" },
        { icon:"🔄", caption_uz:"Drum kartrijini almashtiring", caption_ru:"Замените драм-картридж" },
      ],
    },
    "printer_hp_laser_8": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_hp_laser_9": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Duplex modulini tekshiring", caption_ru:"Проверьте модуль дуплекса" },
        { icon:"🔧", caption_uz:"To'g'ri o'rnatilganini tekshiring", caption_ru:"Проверьте правильность установки" },
        { icon:"⚙️", caption_uz:"Sozlamalarni qayta tekshiring", caption_ru:"Перепроверьте настройки" },
      ],
    },
    "printer_canon_laser_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_canon_laser_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_canon_laser_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_canon_laser_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_canon_laser_4": {
      device: "🖨️",
      steps: [
        { icon:"💡", caption_uz:"Xatolik kodiga qarang", caption_ru:"Посмотрите код ошибки" },
        { icon:"📖", caption_uz:"Qo'llanmadan kodni toping", caption_ru:"Найдите код в инструкции" },
        { icon:"🔧", caption_uz:"Ko'rsatilgan qismni tekshiring", caption_ru:"Проверьте указанный узел" },
      ],
    },
    "printer_canon_laser_5": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_canon_laser_6": {
      device: "🖨️",
      steps: [
        { icon:"🌡️", caption_uz:"Fuser haroratini tekshiring", caption_ru:"Проверьте температуру печки" },
        { icon:"🔌", caption_uz:"Ulanishni tekshiring", caption_ru:"Проверьте соединение" },
        { icon:"⏳", caption_uz:"Sovishini kuting", caption_ru:"Дайте остыть" },
      ],
    },
    "printer_canon_laser_7": {
      device: "🖨️",
      steps: [
        { icon:"🥁", caption_uz:"Drum (baraban) holatini tekshiring", caption_ru:"Проверьте состояние барабана" },
        { icon:"🧼", caption_uz:"Ichini tozalang", caption_ru:"Прочистите внутри" },
        { icon:"🔄", caption_uz:"Drum kartrijini almashtiring", caption_ru:"Замените драм-картридж" },
      ],
    },
    "printer_canon_laser_8": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_canon_laser_9": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Duplex modulini tekshiring", caption_ru:"Проверьте модуль дуплекса" },
        { icon:"🔧", caption_uz:"To'g'ri o'rnatilganini tekshiring", caption_ru:"Проверьте правильность установки" },
        { icon:"⚙️", caption_uz:"Sozlamalarni qayta tekshiring", caption_ru:"Перепроверьте настройки" },
      ],
    },
    "printer_samsung_laser_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_samsung_laser_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_samsung_laser_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_samsung_laser_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_samsung_laser_4": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_samsung_laser_5": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_samsung_laser_6": {
      device: "🖨️",
      steps: [
        { icon:"🌡️", caption_uz:"Fuser haroratini tekshiring", caption_ru:"Проверьте температуру печки" },
        { icon:"🔌", caption_uz:"Ulanishni tekshiring", caption_ru:"Проверьте соединение" },
        { icon:"⏳", caption_uz:"Sovishini kuting", caption_ru:"Дайте остыть" },
      ],
    },
    "printer_samsung_laser_7": {
      device: "🖨️",
      steps: [
        { icon:"🥁", caption_uz:"Drum (baraban) holatini tekshiring", caption_ru:"Проверьте состояние барабана" },
        { icon:"🧼", caption_uz:"Ichini tozalang", caption_ru:"Прочистите внутри" },
        { icon:"🔄", caption_uz:"Drum kartrijini almashtiring", caption_ru:"Замените драм-картридж" },
      ],
    },
    "printer_samsung_laser_8": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_samsung_laser_9": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Duplex modulini tekshiring", caption_ru:"Проверьте модуль дуплекса" },
        { icon:"🔧", caption_uz:"To'g'ri o'rnatilganini tekshiring", caption_ru:"Проверьте правильность установки" },
        { icon:"⚙️", caption_uz:"Sozlamalarni qayta tekshiring", caption_ru:"Перепроверьте настройки" },
      ],
    },
    "printer_xerox_laser_0": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_xerox_laser_1": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrij / toner darajasini tekshiring", caption_ru:"Проверьте уровень картриджа / тонера" },
        { icon:"🧼", caption_uz:"Bosh / valikni tozalang", caption_ru:"Прочистите головку / вал" },
        { icon:"📄", caption_uz:"Sinov sahifasini chop eting", caption_ru:"Распечатайте тестовую страницу" },
      ],
    },
    "printer_xerox_laser_2": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_xerox_laser_3": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Qisilgan qog'ozni oling", caption_ru:"Удалите застрявшую бумагу" },
        { icon:"🧹", caption_uz:"G'altaklarni tozalang", caption_ru:"Прочистите ролики" },
        { icon:"📥", caption_uz:"Qog'ozni to'g'ri joylang", caption_ru:"Правильно уложите бумагу" },
      ],
    },
    "printer_xerox_laser_4": {
      device: "🖨️",
      steps: [
        { icon:"🖨️", caption_uz:"Kartrijni chiqarib qayta o'rnating", caption_ru:"Извлеките и переустановите картридж" },
        { icon:"🧼", caption_uz:"Kontaktlarini tozalang", caption_ru:"Прочистите контакты" },
        { icon:"🔄", caption_uz:"Drayverni yangilang", caption_ru:"Обновите драйвер" },
      ],
    },
    "printer_xerox_laser_5": {
      device: "🖨️",
      steps: [
        { icon:"🔌", caption_uz:"Kabelni / ulanishni tekshiring", caption_ru:"Проверьте кабель / подключение" },
        { icon:"⚙️", caption_uz:"Drayver / sozlamani tekshiring", caption_ru:"Проверьте драйвер / настройку" },
        { icon:"🔄", caption_uz:"Qayta ulang", caption_ru:"Переподключите" },
      ],
    },
    "printer_xerox_laser_6": {
      device: "🖨️",
      steps: [
        { icon:"🌡️", caption_uz:"Fuser haroratini tekshiring", caption_ru:"Проверьте температуру печки" },
        { icon:"🔌", caption_uz:"Ulanishni tekshiring", caption_ru:"Проверьте соединение" },
        { icon:"⏳", caption_uz:"Sovishini kuting", caption_ru:"Дайте остыть" },
      ],
    },
    "printer_xerox_laser_7": {
      device: "🖨️",
      steps: [
        { icon:"🥁", caption_uz:"Drum (baraban) holatini tekshiring", caption_ru:"Проверьте состояние барабана" },
        { icon:"🧼", caption_uz:"Ichini tozalang", caption_ru:"Прочистите внутри" },
        { icon:"🔄", caption_uz:"Drum kartrijini almashtiring", caption_ru:"Замените драм-картридж" },
      ],
    },
    "printer_xerox_laser_8": {
      device: "🖨️",
      steps: [
        { icon:"🧹", caption_uz:"Vaqtinchalik fayllarni tozalang", caption_ru:"Очистите временные файлы" },
        { icon:"🌡️", caption_uz:"Ichidagi changni tekshiring", caption_ru:"Проверьте пыль внутри" },
        { icon:"🔄", caption_uz:"Qayta ishga tushiring", caption_ru:"Перезагрузите" },
      ],
    },
    "printer_xerox_laser_9": {
      device: "🖨️",
      steps: [
        { icon:"📄", caption_uz:"Duplex modulini tekshiring", caption_ru:"Проверьте модуль дуплекса" },
        { icon:"🔧", caption_uz:"To'g'ri o'rnatilganini tekshiring", caption_ru:"Проверьте правильность установки" },
        { icon:"⚙️", caption_uz:"Sozlamalarni qayta tekshiring", caption_ru:"Перепроверьте настройки" },
      ],
    },
  };

  function youtubeEmbedUrl(url){
    if (!url) return null;
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,15})/);
    return m ? ('https://www.youtube.com/embed/' + m[1]) : null;
  }

  // ================= V2: animatsion sahnalar (SVG) =================
  // Har bir sahna 230x210 viewBox. `only0/only1/only2` — faqat shu qadamda ko'rinadi.
  function seedNoise(){
    var s = '', r = 7;
    for (var y = 0; y < 8; y++) for (var x = 0; x < 12; x++) {
      r = (r * 9301 + 49297) % 233280;
      var g = 90 + Math.floor((r / 233280) * 160);
      s += '<rect x="' + (22 + x*15.5) + '" y="' + (32 + y*16) + '" width="15.5" height="16" fill="rgb(' + g + ',' + g + ',' + g + ')" style="animation-delay:' + ((r % 100) / 500) + 's"/>';
    }
    return s;
  }
  var SCENES = {
    tv: function(){
      var bars = ['#fff','#ffe14a','#2be4e4','#3be15b','#ff4bd8','#ff4040','#3a5bff'].map(function(c,i){
        return '<rect x="' + (22 + i*26.6) + '" y="32" width="26.8" height="128" fill="' + c + '"/>';
      }).join('');
      return '<ellipse cx="115" cy="200" rx="78" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="97" y="168" width="36" height="22" rx="4" fill="#2b2f45"/><rect x="68" y="186" width="94" height="9" rx="4.5" fill="#1b1f33"/>' +
        '<rect x="10" y="20" width="210" height="152" rx="18" fill="#161a33"/><rect x="10" y="20" width="210" height="152" rx="18" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
        '<clipPath id="tvc"><rect x="22" y="32" width="186" height="128" rx="9"/></clipPath>' +
        '<g clip-path="url(#tvc)"><rect x="22" y="32" width="186" height="128" fill="#0b1226"/>' +
        '<g class="only0 sv-noise">' + seedNoise() + '</g>' +
        '<g class="only1"><path class="sv-flow" d="M22 100 Q50 50 78 100 T134 100 T190 100 T246 100" fill="none" stroke="#3bf0d8" stroke-width="5" stroke-linecap="round"/>' +
        '<text x="115" y="146" text-anchor="middle" font-size="13" font-weight="800" fill="#7df" class="sv-blink">SIGNAL…</text></g>' +
        '<g class="only2">' + bars + '<g class="sv-pulse"><circle cx="115" cy="96" r="26" fill="rgba(0,0,0,.55)"/><path d="M102 96 l9 10 l19 -22" stroke="#4dff88" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
        '<rect class="sv-scan" style="--sh:112px" x="22" y="32" width="186" height="12" fill="rgba(255,255,255,.2)"/></g>' +
        '<circle cx="195" cy="165" r="3.5" fill="#ff5a5a" class="sv-blink"/>';
    },
    kond: function(){
      var snow = '';
      for (var i = 0; i < 9; i++) snow += '<text class="sv-fall" x="' + (26 + i*22) + '" y="118" font-size="' + (13 + (i%3)*4) + '" style="animation-delay:' + (i*0.27) + 's">❄️</text>';
      return '<rect x="6" y="22" width="218" height="84" rx="26" fill="#f6f8ff"/><rect x="6" y="22" width="218" height="84" rx="26" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/>' +
        '<rect x="22" y="36" width="186" height="9" rx="4.5" fill="#dde4fa"/>' +
        '<g class="sv-bob"><rect x="20" y="82" width="190" height="14" rx="7" fill="#b9c6f0"/></g>' +
        '<circle cx="196" cy="62" r="5" fill="#34e07a" class="sv-blink"/>' +
        '<text class="only0 sv-blink" x="30" y="72" font-size="26" font-weight="900" fill="#ff3b3b" font-family="Space Grotesk,sans-serif">E4 ✖</text>' +
        '<text class="only1" x="30" y="72" font-size="22" font-weight="900" fill="#2a6bff" font-family="Space Grotesk,sans-serif">⚙ …</text>' +
        '<text class="only2" x="30" y="74" font-size="30" font-weight="900" fill="#1f7bff" font-family="Space Grotesk,sans-serif">18°C</text>' + snow +
        '<g class="only1"><text class="sv-wrench" x="140" y="196" font-size="52">🔧</text></g>' +
        '<g class="only2"><path class="sv-flow" d="M30 130 q40 24 80 0 t80 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path class="sv-flow" d="M20 160 q50 26 100 0 t90 0" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="4" stroke-linecap="round"/></g>';
    },
    xolod: function(){
      var fl = '';
      for (var i = 0; i < 7; i++) fl += '<text class="sv-rise" x="' + (74 + (i%4)*24) + '" y="' + (80 + (i%3)*36) + '" font-size="15" style="animation-delay:' + (i*0.33) + 's">❄️</text>';
      return '<ellipse cx="115" cy="204" rx="62" ry="6" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="60" y="6" width="110" height="196" rx="20" fill="#f2f7ff"/><rect x="60" y="6" width="110" height="196" rx="20" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="60" y="72" width="110" height="5" fill="#c9d6f2"/>' +
        '<rect x="148" y="30" width="7" height="28" rx="3.5" fill="#9fb2dd"/><rect x="148" y="104" width="7" height="50" rx="3.5" fill="#9fb2dd"/>' +
        '<rect x="74" y="20" width="56" height="26" rx="6" fill="#0f1b3d"/><text x="102" y="39" text-anchor="middle" font-size="15" font-weight="900" fill="#47f0ff" font-family="JetBrains Mono,monospace">-18°</text>' +
        '<g class="only0"><text class="sv-fall" x="84" y="86" font-size="20">💧</text><text class="sv-fall" x="112" y="90" font-size="16" style="animation-delay:.6s">💧</text><circle cx="128" cy="34" r="5" fill="#ff4040" class="sv-blink"/></g>' +
        '<g class="only1"><rect class="sv-pulse" x="72" y="86" width="72" height="96" rx="8" fill="rgba(255,240,150,.85)"/><text class="sv-wrench" x="86" y="162" font-size="46">🔧</text></g>' +
        '<g class="only2">' + fl + '<g class="sv-pulse"><circle cx="108" cy="134" r="24" fill="#2fd27a"/><path d="M96 134 l9 10 l18 -21" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>';
    },
    kir: function(){
      var cl = '<rect x="92" y="96" width="26" height="16" rx="6" fill="#ff5fa2"/><rect x="118" y="120" width="26" height="16" rx="6" fill="#ffd23f"/><rect x="96" y="128" width="22" height="14" rx="6" fill="#4ad0ff"/><rect x="124" y="94" width="18" height="14" rx="6" fill="#fff"/>';
      return '<ellipse cx="115" cy="204" rx="78" ry="6" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="36" y="8" width="158" height="192" rx="22" fill="#f6f8ff"/><rect x="36" y="8" width="158" height="192" rx="22" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="48" y="20" width="134" height="30" rx="10" fill="#e1e8fb"/><circle cx="70" cy="35" r="9" fill="#9fb2dd"/><rect x="100" y="28" width="46" height="14" rx="5" fill="#0f1b3d"/><circle cx="162" cy="35" r="4" fill="#34e07a" class="sv-blink"/>' +
        '<circle cx="115" cy="122" r="60" fill="#c3cff0"/><circle cx="115" cy="122" r="51" fill="#12315f"/>' +
        '<clipPath id="drc"><circle cx="115" cy="122" r="49"/></clipPath>' +
        '<g clip-path="url(#drc)"><rect x="60" y="112" width="110" height="60" fill="#37b5ff" opacity=".8"/><g class="sv-spin only1" style="animation-duration:.6s">' + cl + '</g><g class="sv-spin slow only0 only2">' + cl + '</g></g>' +
        '<circle cx="115" cy="122" r="51" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4"/>' +
        '<g class="only0"><text class="sv-fall" x="62" y="196" font-size="22">💧</text><text class="sv-fall" x="150" y="196" font-size="18" style="animation-delay:.7s">💧</text></g>' +
        '<g class="only2"><text class="sv-rise" x="84" y="110" font-size="16">🫧</text><text class="sv-rise" x="130" y="130" font-size="20" style="animation-delay:.5s">🫧</text><text class="sv-rise" x="108" y="150" font-size="14" style="animation-delay:1s">✨</text></g>';
    },
    suv: function(){
      return '<ellipse cx="115" cy="204" rx="50" ry="6" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="62" y="8" width="106" height="190" rx="36" fill="#f6f8ff"/><rect x="62" y="8" width="106" height="190" rx="36" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<circle cx="115" cy="76" r="32" fill="#0f1b3d"/><circle cx="115" cy="76" r="27" fill="#16275a"/>' +
        '<g class="only0 only1 only2"><line class="sv-sw" x1="115" y1="76" x2="115" y2="54" stroke="#ff6a3d" stroke-width="4" stroke-linecap="round"/></g><circle cx="115" cy="76" r="5" fill="#fff"/>' +
        '<rect x="82" y="128" width="66" height="12" rx="6" fill="#e1e8fb"/><circle cx="96" cy="160" r="6" fill="#ff3b3b" class="sv-blink"/><circle cx="116" cy="160" r="6" fill="#34e07a"/>' +
        '<rect x="88" y="196" width="10" height="12" fill="#4a90ff"/><rect x="132" y="196" width="10" height="12" fill="#ff5a3a"/>' +
        '<text class="sv-rise" x="40" y="130" font-size="24">♨️</text><text class="sv-rise" x="176" y="150" font-size="24" style="animation-delay:.8s">♨️</text>' +
        '<g class="only1"><text class="sv-wrench" x="160" y="186" font-size="48">🔧</text></g>' +
        '<g class="only2"><text class="sv-bob" x="104" y="122" font-size="22">🌡️</text></g>';
    },
    komp: function(){
      return '<ellipse cx="115" cy="200" rx="100" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="30" y="16" width="170" height="122" rx="12" fill="#161a33"/><rect x="30" y="16" width="170" height="122" rx="12" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2"/><rect x="38" y="24" width="154" height="106" rx="6" fill="#0b1226"/>' +
        '<g class="only0"><text x="46" y="48" font-size="11" font-weight="700" fill="#4dff88" font-family="JetBrains Mono,monospace">BIOS v2.1</text><text x="46" y="64" font-size="10" fill="#9ad" font-family="JetBrains Mono,monospace">CPU … OK</text><text x="46" y="78" font-size="10" fill="#f66" font-family="JetBrains Mono,monospace" class="sv-blink">DISK … ERR</text><rect x="46" y="100" width="138" height="9" rx="4.5" fill="#1d2748"/><rect class="sv-fill" x="46" y="100" width="138" height="9" rx="4.5" fill="#4dff88"/></g>' +
        '<g class="only1"><g class="sv-spin" transform="translate(115 78)"><path d="M0 0 C-4 -26 4 -26 0 0 M0 0 C22 -14 26 -6 0 0 M0 0 C22 14 18 20 0 0 M0 0 C-4 26 -12 24 0 0 M0 0 C-22 14 -26 6 0 0 M0 0 C-22 -14 -18 -20 0 0" stroke="#47f0ff" stroke-width="5" fill="#47f0ff" /></g><text x="115" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#ffb347" class="sv-blink" font-family="JetBrains Mono,monospace">92°C → 48°C</text></g>' +
        '<g class="only2"><rect x="46" y="34" width="60" height="38" rx="5" fill="#3a7bff"/><rect x="112" y="34" width="72" height="22" rx="5" fill="#ff7a3d"/><rect x="112" y="60" width="72" height="42" rx="5" fill="#2fd27a"/><rect x="46" y="78" width="60" height="24" rx="5" fill="#a56bff"/><g class="sv-pulse"><circle cx="115" cy="80" r="20" fill="rgba(0,0,0,.6)"/><path d="M105 80 l7 8 l14 -16" stroke="#4dff88" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
        '<path d="M14 142 H216 L204 172 Q202 178 194 178 H36 Q28 178 26 172 Z" fill="#dfe6fa"/><rect x="88" y="146" width="54" height="8" rx="4" fill="#b4c0e6"/>';
    },
    dux: function(){
      return '<ellipse cx="115" cy="200" rx="90" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="22" y="22" width="186" height="168" rx="20" fill="#eef1fa"/><rect x="22" y="22" width="186" height="168" rx="20" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="34" y="32" width="162" height="30" rx="10" fill="#d4dbf0"/>' +
        '<circle cx="58" cy="47" r="9" fill="#2b2f45"/><circle cx="92" cy="47" r="9" fill="#2b2f45"/><rect x="118" y="38" width="46" height="18" rx="5" fill="#0f1b3d"/><text x="141" y="52" text-anchor="middle" font-size="11" font-weight="800" fill="#ff9a3d" font-family="JetBrains Mono,monospace">200°</text><circle cx="180" cy="47" r="4" fill="#ff5a3a" class="sv-blink"/>' +
        '<rect x="42" y="76" width="146" height="96" rx="12" fill="#161a33"/><rect x="48" y="82" width="134" height="84" rx="8" fill="#241a1f"/>' +
        '<g class="only0 only2"><rect class="sv-pulse" x="58" y="96" width="114" height="7" rx="3.5" fill="#ff4a2a"/><rect class="sv-pulse" x="58" y="150" width="114" height="7" rx="3.5" fill="#ff7a2a" style="animation-delay:.4s"/></g>' +
        '<g class="only1"><rect x="58" y="96" width="114" height="7" rx="3.5" fill="#5a4a50"/><text class="sv-wrench" x="132" y="156" font-size="44">🔧</text></g>' +
        '<g class="only2"><text class="sv-bob" x="96" y="140" font-size="34">🍪</text></g><rect x="62" y="172" width="106" height="4" rx="2" fill="#aab4d4"/>';
    },
    mikro: function(){
      return '<ellipse cx="115" cy="190" rx="94" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="12" y="44" width="206" height="136" rx="20" fill="#eef1fa"/><rect x="12" y="44" width="206" height="136" rx="20" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="26" y="58" width="124" height="108" rx="12" fill="#161a33"/><rect x="32" y="64" width="112" height="96" rx="8" fill="#0d1226"/>' +
        '<ellipse cx="88" cy="140" rx="42" ry="9" fill="#2b3566"/>' +
        '<g class="sv-spin slow" style="transform-origin:88px 140px"><ellipse cx="88" cy="140" rx="30" ry="6" fill="none" stroke="#8fa3ff" stroke-width="2" stroke-dasharray="6 6"/><circle cx="62" cy="136" r="9" fill="#ff7a3d"/></g>' +
        '<g class="only0"><text x="88" y="100" text-anchor="middle" font-size="14" font-weight="800" fill="#ff5a5a" class="sv-blink" font-family="JetBrains Mono,monospace">NO HEAT</text></g>' +
        '<g class="only1"><text class="sv-wrench" x="100" y="112" font-size="40">🔧</text></g>' +
        '<g class="only2"><path class="sv-flow" d="M44 90 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#ffb347" stroke-width="3.5" fill="none" stroke-linecap="round"/><path class="sv-flow" d="M44 106 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#ff7a3d" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>' +
        '<rect x="160" y="58" width="46" height="24" rx="6" fill="#0f1b3d"/><text x="183" y="75" text-anchor="middle" font-size="13" font-weight="800" fill="#47f0ff" class="sv-blink" font-family="JetBrains Mono,monospace">0:30</text>' +
        '<g fill="#c4cce8"><rect x="160" y="92" width="20" height="16" rx="4"/><rect x="186" y="92" width="20" height="16" rx="4"/><rect x="160" y="114" width="20" height="16" rx="4"/><rect x="186" y="114" width="20" height="16" rx="4"/></g><rect x="160" y="140" width="46" height="20" rx="8" fill="#34e07a"/>';
    },
    piles: function(){
      var d = '';
      for (var i = 0; i < 6; i++) d += '<circle class="sv-rise" cx="' + (36 + i*10) + '" cy="150" r="' + (3 + i%3) + '" fill="#6b4a2b" style="animation-delay:' + (i*0.35) + 's"/>';
      return '<ellipse cx="110" cy="200" rx="86" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<path class="sv-flow" d="M150 100 C 210 100 214 40 176 30 C 150 22 130 44 130 44" fill="none" stroke="#2b2f45" stroke-width="12" stroke-linecap="round" style="stroke-dasharray:none;animation:none"/>' +
        '<path d="M150 100 C 210 100 214 40 176 30 C 150 22 130 44 130 44" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-dasharray="4 10" class="sv-flow"/>' +
        '<ellipse cx="100" cy="144" rx="72" ry="44" fill="#f2f5ff"/><ellipse cx="100" cy="144" rx="72" ry="44" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="60" y="92" width="80" height="26" rx="13" fill="#ffffff"/><circle cx="100" cy="105" r="8" fill="#ff6a3d" class="sv-pulse"/>' +
        '<circle cx="44" cy="184" r="15" fill="#2b2f45"/><circle cx="156" cy="184" r="15" fill="#2b2f45"/><circle cx="44" cy="184" r="6" fill="#9fb2dd" class="sv-spin"/><circle cx="156" cy="184" r="6" fill="#9fb2dd" class="sv-spin"/>' +
        '<rect x="18" y="156" width="40" height="12" rx="6" fill="#2b2f45"/>' + d +
        '<g class="only0"><text class="sv-blink" x="76" y="152" font-size="16" font-weight="900" fill="#ff3b3b" font-family="Space Grotesk,sans-serif">0%</text></g>' +
        '<g class="only1"><text class="sv-wrench" x="108" y="170" font-size="44">🔧</text></g>' +
        '<g class="only2"><text class="sv-bob" x="78" y="158" font-size="22">💨</text></g>';
    },
    dazmol: function(){
      return '<ellipse cx="115" cy="190" rx="92" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<path d="M26 160 H196 Q214 160 210 140 L188 96 Q178 78 150 78 H70 Q40 78 34 110 Z" fill="#3a8bff"/><path d="M26 160 H196 Q214 160 210 140 L188 96 Q178 78 150 78 H70 Q40 78 34 110 Z" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/>' +
        '<path d="M70 78 Q70 38 118 38 Q158 38 158 78" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M22 160 H212 Q214 176 196 176 H38 Q20 176 22 160 Z" fill="#dfe6fa"/>' +
        '<circle cx="122" cy="116" r="14" fill="#0f1b3d"/><circle cx="122" cy="116" r="6" fill="#ff9a3d" class="sv-blink"/>' +
        '<text class="sv-rise" x="40" y="150" font-size="26">☁️</text><text class="sv-rise" x="80" y="156" font-size="22" style="animation-delay:.6s">☁️</text><text class="sv-rise" x="120" y="152" font-size="26" style="animation-delay:1.2s">☁️</text>' +
        '<g class="only0"><text x="150" y="130" font-size="16" font-weight="900" fill="#fff" class="sv-blink" font-family="Space Grotesk,sans-serif">⚠</text></g>' +
        '<g class="only1"><text class="sv-wrench" x="148" y="150" font-size="40">🔧</text></g>' +
        '<g class="only2"><text class="sv-bob" x="150" y="130" font-size="26">👕</text></g>';
    },
    vent: function(){
      var bl = '';
      [0,120,240].forEach(function(a){ bl += '<ellipse cx="115" cy="58" rx="16" ry="38" fill="#fff" opacity=".95" transform="rotate(' + a + ' 115 90)"/>'; });
      return '<ellipse cx="115" cy="202" rx="52" ry="6" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="108" y="150" width="14" height="46" rx="6" fill="#dfe6fa"/><rect x="72" y="190" width="86" height="12" rx="6" fill="#c5cff0"/>' +
        '<circle cx="115" cy="90" r="74" fill="rgba(255,255,255,.14)"/><circle cx="115" cy="90" r="74" fill="none" stroke="#fff" stroke-width="4"/><circle cx="115" cy="90" r="54" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/><circle cx="115" cy="90" r="34" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
        '<g class="sv-spin only0" style="animation-duration:2.4s;transform-origin:115px 90px">' + bl + '</g><g class="sv-spin only1 only2" style="animation-duration:.35s;transform-origin:115px 90px">' + bl + '</g>' +
        '<circle cx="115" cy="90" r="12" fill="#2b2f45"/><circle cx="115" cy="90" r="4" fill="#9fb2dd"/>' +
        '<g class="only2"><path class="sv-flow" d="M200 70 h26 M204 90 h22 M200 110 h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>' +
        '<g class="only1"><text class="sv-wrench" x="150" y="170" font-size="40">🔧</text></g>';
    },
    stab: function(){
      return '<ellipse cx="115" cy="196" rx="86" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="22" y="40" width="186" height="140" rx="22" fill="#2b2f45"/><rect x="22" y="40" width="186" height="140" rx="22" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2"/>' +
        '<path d="M52 128 A63 63 0 0 1 178 128 Z" fill="#f6f8ff"/><path d="M62 124 A53 53 0 0 1 168 124" fill="none" stroke="#ff4a3a" stroke-width="6" stroke-dasharray="14 8"/>' +
        '<g class="sv-sw" style="transform-origin:115px 128px"><line x1="115" y1="128" x2="115" y2="78" stroke="#1b1f33" stroke-width="4" stroke-linecap="round"/></g><circle cx="115" cy="128" r="8" fill="#1b1f33"/>' +
        '<text x="115" y="156" text-anchor="middle" font-size="16" font-weight="900" fill="#34e07a" font-family="JetBrains Mono,monospace">220 V</text>' +
        '<circle cx="48" cy="60" r="5" fill="#34e07a" class="sv-blink"/><circle cx="64" cy="60" r="5" fill="#ffd23f"/><circle cx="80" cy="60" r="5" fill="#ff4a3a" class="sv-blink" style="animation-delay:.5s"/>' +
        '<text class="sv-spark" x="170" y="62" font-size="26">⚡</text><text class="sv-spark" x="40" y="176" font-size="20" style="animation-delay:.4s">⚡</text>' +
        '<g class="only1"><text class="sv-wrench" x="150" y="190" font-size="42">🔧</text></g><g class="only2"><circle class="sv-pulse" cx="190" cy="60" r="12" fill="#2fd27a"/><path d="M184 60 l4 5 l9 -11" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
    },
    ups: function(){
      return '<ellipse cx="115" cy="198" rx="80" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="34" y="26" width="162" height="158" rx="24" fill="#2b2f45"/><rect x="34" y="26" width="162" height="158" rx="24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2"/>' +
        '<rect x="62" y="56" width="98" height="52" rx="10" fill="none" stroke="#fff" stroke-width="5"/><rect x="162" y="72" width="10" height="20" rx="3" fill="#fff"/>' +
        '<rect class="sv-fill only0" x="68" y="62" width="30" height="40" rx="5" fill="#ff4a3a"/><rect class="sv-fill only1 only2" x="68" y="62" width="86" height="40" rx="5" fill="#34e07a"/>' +
        '<text class="sv-pulse" x="102" y="152" font-size="40">⚡</text>' +
        '<circle cx="52" cy="46" r="4.5" fill="#34e07a" class="sv-blink"/><circle cx="68" cy="46" r="4.5" fill="#ffd23f"/>' +
        '<g class="only1"><text class="sv-wrench" x="150" y="176" font-size="42">🔧</text></g><g class="only2"><text class="sv-bob" x="150" y="44" font-size="26">🔋</text></g>';
    },
    printer: function(){
      return '<ellipse cx="115" cy="196" rx="94" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="62" y="22" width="106" height="64" rx="6" fill="#fff"/><g stroke="#cfd5ea" stroke-width="3"><path d="M72 38 h86 M72 50 h86 M72 62 h60"/></g>' +
        '<rect x="14" y="80" width="202" height="86" rx="20" fill="#eef1fa"/><rect x="14" y="80" width="202" height="86" rx="20" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="28" y="92" width="52" height="22" rx="6" fill="#0f1b3d"/><text x="54" y="108" text-anchor="middle" font-size="11" font-weight="800" fill="#47f0ff" class="sv-blink" font-family="JetBrains Mono,monospace">READY</text><circle cx="196" cy="102" r="5" fill="#34e07a" class="sv-blink"/>' +
        '<rect x="30" y="140" width="170" height="10" rx="5" fill="#1b1f33"/>' +
        '<clipPath id="ppc"><rect x="50" y="150" width="130" height="50"/></clipPath>' +
        '<g clip-path="url(#ppc)"><g class="sv-feed"><rect x="62" y="122" width="106" height="64" fill="#fff" rx="3"/><path d="M72 138 h86 M72 150 h70 M72 162 h86" stroke="#4a5bd0" stroke-width="3.5"/></g></g>' +
        '<g class="only0"><circle class="sv-fall" cx="100" cy="116" r="5" fill="#00d1ff"/><circle class="sv-fall" cx="120" cy="116" r="5" fill="#ff3fa8" style="animation-delay:.4s"/><circle class="sv-fall" cx="140" cy="116" r="5" fill="#ffe14a" style="animation-delay:.8s"/></g>' +
        '<g class="only1"><text class="sv-wrench" x="150" y="112" font-size="40">🔧</text></g>' +
        '<g class="only2"><g class="sv-pulse"><circle cx="196" cy="60" r="16" fill="#2fd27a"/><path d="M188 60 l6 7 l12 -15" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>';
    },
    _gen: function(){
      return '<g class="sv-spin slow" style="transform-origin:115px 100px"><text x="115" y="140" text-anchor="middle" font-size="130">⚙️</text></g><text class="sv-wrench" x="140" y="180" font-size="52">🔧</text>';
    }
  };

  // ================= V2: yorqin plitkalar + animatsiya pleyer =================
  var PAL = { tv:'g-pink', kond:'g-sky', xolod:'g-ice', kir:'g-indigo', suv:'g-fire', komp:'g-violet', dux:'g-coral',
    mikro:'g-gold', piles:'g-lime', dazmol:'g-rose', vent:'g-teal', stab:'g-sun', ups:'g-mint', printer:'g-fire' };
  function palOf(id){ return PAL[id] || 'g-violet'; }
  var STAR_SVG = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z"/></svg>';

  function buildStars(){
    if (document.getElementById('stars')) return;
    var d = document.createElement('div'); d.id = 'stars';
    var h = '';
    for (var i = 0; i < 30; i++) {
      h += '<i style="left:' + (Math.random()*100).toFixed(1) + '%;top:' + (Math.random()*100).toFixed(1) + '%;animation-delay:' + (Math.random()*4).toFixed(2) + 's;animation-duration:' + (3 + Math.random()*3).toFixed(1) + 's"></i>';
    }
    d.innerHTML = h;
    document.body.insertBefore(d, document.body.firstChild);
  }
  buildStars();

  function userName(){
    try { var u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user; if (u && u.first_name) return esc(u.first_name); } catch(e){}
    return L("Mehmon","Гость");
  }

  function tileHTML(o, i){
    return '<button class="tile ' + o.pal + (o.wide ? ' wide' : '') + (o.tall ? ' tall' : '') + '" data-ti="' + i + '" style="animation-delay:' + (i*0.07) + 's;--sd:' + ((i*0.6)%4).toFixed(1) + 's">' +
      '<span class="burst"></span><span class="burst b2"></span>' +
      '<span class="brandrow">' + STAR_SVG + '<span>Online Ustaxona<small>' + (o.brand || '') + '</small></span></span>' +
      (o.badge ? '<span class="badge">' + o.badge + '</span>' : '') +
      '<span class="emo">' + o.icon + '</span>' +
      '<span class="ttl">' + o.title + '</span>' +
      (o.sub ? '<span class="sub">' + o.sub + '</span>' : '') +
      (o.count ? '<span class="count">' + o.count + '</span>' : '') +
      (o.cta ? '<span class="cta">' + o.cta + '</span>' : '') +
      '</button>';
  }

  function totalIssues(){ var n = 0; CATS.forEach(function(c){ n += countForCategory(c); }); return n; }

  // ============================================================
  //  BOZOR TICKER (valyuta/oltin/BTC/neft...) + OB-HAVO + EFFEKTLAR
  // ============================================================
  var MX_CACHE_KEY = 'mx_market_v1', WX_REGION_KEY = 'wx_region_v1';
  var WX_REGIONS = [
    { id:'toshkent_sh', uz:'Toshkent shahri', ru:'г. Ташкент', lat:41.3111, lon:69.2797 },
    { id:'toshkent_v', uz:'Toshkent viloyati', ru:'Ташкентская обл.', lat:41.0, lon:69.36 },
    { id:'andijon', uz:'Andijon', ru:'Андижан', lat:40.7821, lon:72.3442 },
    { id:'buxoro', uz:'Buxoro', ru:'Бухара', lat:39.7747, lon:64.4286 },
    { id:'fargona', uz:'Farg\u2018ona', ru:'Фергана', lat:40.3864, lon:71.7864 },
    { id:'jizzax', uz:'Jizzax', ru:'Джизак', lat:40.1158, lon:67.8422 },
    { id:'xorazm', uz:'Xorazm', ru:'Хорезм', lat:41.5506, lon:60.6317 },
    { id:'namangan', uz:'Namangan', ru:'Наманган', lat:40.9983, lon:71.6726 },
    { id:'navoiy', uz:'Navoiy', ru:'Навои', lat:40.1030, lon:65.3739 },
    { id:'qashqadaryo', uz:'Qashqadaryo', ru:'Кашкадарья', lat:38.8606, lon:65.7890 },
    { id:'qoraqalpoq', uz:'Qoraqalpog\u2018iston', ru:'Каракалпакстан', lat:42.4531, lon:59.6103 },
    { id:'samarqand', uz:'Samarqand', ru:'Самарканд', lat:39.6542, lon:66.9597 },
    { id:'sirdaryo', uz:'Sirdaryo', ru:'Сырдарья', lat:40.4897, lon:68.7842 },
    { id:'surxondaryo', uz:'Surxondaryo', ru:'Сурхандарья', lat:37.2242, lon:67.2783 }
  ];
  var mxState = { data:null, wx:null, region:null, timer:null, wxTimer:null, fx:null, alive:false };

  function mxLoad(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }
  function mxSave(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function mxNum(n, d){
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits:d||0, maximumFractionDigits:d||0 }).replace(/,/g, ' ');
  }
  function mxJson(url){
    return fetch(url, { cache:'no-store' }).then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  // --- Bozor ma'lumotlari: avval backend (/api/public/market), bo'lmasa to'g'ridan-to'g'ri ochiq API'lar ---
  function mxFetchMarket(){
    var viaApi = API_BASE ? mxJson(API_BASE + '/api/public/market').then(function(j){
      if (!j || !j.ok || !j.items) throw new Error('bad'); return j.items;
    }) : Promise.reject(new Error('NO_API'));
    return viaApi.catch(function(){
      var out = {};
      var p = [
        mxJson('https://open.er-api.com/v6/latest/USD').then(function(j){
          if (j && j.rates){ out.usd = { v:j.rates.UZS }; if (j.rates.EUR) out.eur = { v:j.rates.UZS / j.rates.EUR }; }
        }).catch(function(){}),
        mxJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true').then(function(j){
          if (j && j.bitcoin) out.btc = { v:j.bitcoin.usd, ch:j.bitcoin.usd_24h_change };
        }).catch(function(){}),
        mxJson('https://api.gold-api.com/price/XAU').then(function(j){ if (j && j.price) out.gold = { v:j.price }; }).catch(function(){}),
        mxJson('https://api.gold-api.com/price/XAG').then(function(j){ if (j && j.price) out.silver = { v:j.price }; }).catch(function(){})
      ];
      return Promise.all(p).then(function(){ if (!Object.keys(out).length) throw new Error('empty'); return out; });
    });
  }

  var MX_DEFS = [
    { k:'usd',    ic:'💵', uz:'Dollar',  ru:'Доллар',  fmt:function(v){ return mxNum(v,0) + ' so\u2018m'; }, fmtRu:function(v){ return mxNum(v,0) + ' сум'; } },
    { k:'eur',    ic:'💶', uz:'Yevro',   ru:'Евро',    fmt:function(v){ return mxNum(v,0) + ' so\u2018m'; }, fmtRu:function(v){ return mxNum(v,0) + ' сум'; } },
    { k:'gold',   ic:'🥇', uz:'Tilla',   ru:'Золото',  fmt:function(v){ return '$' + mxNum(v,0) + '/oz'; } },
    { k:'silver', ic:'🥈', uz:'Kumush',  ru:'Серебро', fmt:function(v){ return '$' + mxNum(v,2) + '/oz'; } },
    { k:'btc',    ic:'₿',  uz:'Bitcoin', ru:'Биткоин', fmt:function(v){ return '$' + mxNum(v,0); } },
    { k:'oil',    ic:'🛢️', uz:'Neft',    ru:'Нефть',   fmt:function(v){ return '$' + mxNum(v,2) + '/bbl'; } }
  ];

  function mxTickerInner(data){
    var chips = MX_DEFS.map(function(d){
      var it = data && data[d.k];
      var val = it && it.v != null ? (state.lang === 'ru' && d.fmtRu ? d.fmtRu(it.v) : d.fmt(it.v)) : '…';
      var ch = it && it.ch != null && !isNaN(it.ch) ? it.ch : null;
      var cls = ch == null ? '' : (ch > 0 ? ' up' : (ch < 0 ? ' down' : ''));
      var chTxt = ch == null ? '' : '<em class="mx-ch">' + (ch > 0 ? '▲' : (ch < 0 ? '▼' : '•')) + ' ' + Math.abs(ch).toFixed(2) + '%</em>';
      return '<span class="mx-chip' + cls + '"><b class="mx-ic">' + d.ic + '</b><span class="mx-nm">' + (state.lang === 'ru' ? d.ru : d.uz) +
        '</span><span class="mx-val">' + val + '</span>' + chTxt + '</span>';
    }).join('');
    return '<div class="mx-track">' + chips + chips + '</div>';
  }
  function mxPaintTicker(){
    var el = document.getElementById('mxTicker');
    if (!el) return;
    el.innerHTML = '<div class="mx-live"><i></i>LIVE</div><div class="mx-rail">' + mxTickerInner(mxState.data) + '</div>';
  }
  function mxRefreshMarket(){
    mxFetchMarket().then(function(items){
      mxState.data = items; mxSave(MX_CACHE_KEY, items); mxPaintTicker();
    }).catch(function(){ /* eski ma'lumot qoladi */ });
  }

  // --- Ob-havo ---
  var WX_URL = 'https://api.open-meteo.com/v1/forecast?current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto&forecast_days=1';
  // kind: clear | cloud | fog | drizzle | rain | snow | storm
  function wxKind(code){
    if (code === 0 || code === 1) return 'clear';
    if (code === 2 || code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 57) return 'drizzle';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloud';
  }
  var WX_TXT = {
    clear:   { uz:'Ochiq osmon', ru:'Ясно', ic:'☀️', icN:'🌙' },
    cloud:   { uz:'Bulutli', ru:'Облачно', ic:'⛅', icN:'☁️' },
    fog:     { uz:'Tuman', ru:'Туман', ic:'🌫️', icN:'🌫️' },
    drizzle: { uz:'Mayda yomg\u2018ir', ru:'Морось', ic:'🌦️', icN:'🌧️' },
    rain:    { uz:'Yomg\u2018ir', ru:'Дождь', ic:'🌧️', icN:'🌧️' },
    snow:    { uz:'Qor yog\u2018moqda', ru:'Идёт снег', ic:'❄️', icN:'❄️' },
    storm:   { uz:'Momaqaldiroq', ru:'Гроза', ic:'⛈️', icN:'⛈️' }
  };
  function wxRegion(){
    var id = mxLoad(WX_REGION_KEY);
    if (id && id.geo) return { id:'geo', uz:'Joylashuvim', ru:'Моё местоположение', lat:id.lat, lon:id.lon };
    for (var i = 0; i < WX_REGIONS.length; i++) if (id && WX_REGIONS[i].id === id.id) return WX_REGIONS[i];
    return WX_REGIONS[0];
  }
  function wxForced(){
    var m = /[?&]wx=(clear|cloud|fog|drizzle|rain|snow|storm)/.exec(location.search || '');
    return m ? m[1] : null;
  }
  function wxFetch(){
    var r = mxState.region = wxRegion();
    return mxJson(WX_URL + '&latitude=' + r.lat + '&longitude=' + r.lon).then(function(j){
      var c = j.current || {};
      var w = { t:c.temperature_2m, feels:c.apparent_temperature, h:c.relative_humidity_2m, wind:c.wind_speed_10m,
                code:c.weather_code, day:c.is_day !== 0, region:r.id };
      w.kind = wxForced() || wxKind(w.code);
      mxSave('wx_cache_v1', w);
      return w;
    });
  }
  function wxPaint(){
    var el = document.getElementById('wxCard');
    if (!el) return;
    var r = mxState.region || wxRegion(), w = mxState.wx;
    var opts = WX_REGIONS.map(function(x){
      return '<option value="' + x.id + '"' + (x.id === r.id ? ' selected' : '') + '>' + esc(state.lang === 'ru' ? x.ru : x.uz) + '</option>';
    }).join('');
    var geoOpt = '<option value="__geo"' + (r.id === 'geo' ? ' selected' : '') + '>📍 ' + L('Joylashuvim','Моё местоположение') + '</option>';
    var body;
    if (w) {
      var tx = WX_TXT[w.kind] || WX_TXT.cloud;
      body = '<div class="wx-main"><div class="wx-ic">' + (w.day ? tx.ic : tx.icN) + '</div>' +
        '<div class="wx-temp">' + (w.t != null ? Math.round(w.t) : '—') + '<sup>°C</sup></div>' +
        '<div class="wx-desc"><b>' + (state.lang === 'ru' ? tx.ru : tx.uz) + '</b><span>' +
        L('His qilinishi','Ощущается') + ' ' + (w.feels != null ? Math.round(w.feels) : '—') + '°</span></div></div>' +
        '<div class="wx-meta"><span>💧 ' + (w.h != null ? Math.round(w.h) : '—') + '%</span><span>💨 ' +
        (w.wind != null ? Math.round(w.wind) : '—') + ' km/h</span></div>';
    } else {
      body = '<div class="wx-main"><div class="wx-ic">⏳</div><div class="wx-desc"><b>' + L('Ob-havo yuklanmoqda…','Загрузка погоды…') + '</b></div></div>';
    }
    el.innerHTML = '<div class="wx-top"><span class="wx-pin">📍</span><select id="wxSel" aria-label="region">' + opts + geoOpt + '</select></div>' + body;
    el.setAttribute('data-kind', w ? w.kind : 'cloud');
    el.setAttribute('data-day', w && !w.day ? '0' : '1');
    var sel = document.getElementById('wxSel');
    if (sel) sel.addEventListener('change', function(){
      haptic('select');
      if (sel.value === '__geo') return wxLocate();
      mxSave(WX_REGION_KEY, { id: sel.value });
      wxReload();
    });
  }
  function wxLocate(){
    if (!navigator.geolocation) { wxPaint(); return; }
    navigator.geolocation.getCurrentPosition(function(pos){
      mxSave(WX_REGION_KEY, { geo:true, lat:pos.coords.latitude, lon:pos.coords.longitude });
      wxReload();
    }, function(){ wxPaint(); }, { timeout:8000, maximumAge:600000 });
  }
  function wxReload(){
    mxState.region = wxRegion(); mxState.wx = null; wxPaint(); wxFx(null);
    wxFetch().then(function(w){ if (!mxState.alive) return; mxState.wx = w; wxPaint(); wxFx(w); })
      .catch(function(){ if (!mxState.alive) return; wxPaint(); });
  }

  // --- Effektlar (canvas): qor, yomg'ir, momaqaldiroq, tuman, bulut, quyosh, yulduzlar ---
  function wxFx(w){
    if (mxState.fx) { mxState.fx.stop(); mxState.fx = null; }
    var cv = document.getElementById('wxFx');
    if (!cv || !w) { if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); return; }
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, raf = 0, dead = false;
    function size(){ W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    size();
    var onResize = function(){ size(); }; window.addEventListener('resize', onResize);
    var kind = w.kind, night = !w.day, P = [], flash = 0, nextBolt = 120;
    var small = W < 500;
    function rnd(a, b){ return a + Math.random() * (b - a); }
    var N = kind === 'snow' ? (small ? 90 : 160) : (kind === 'rain' || kind === 'storm') ? (small ? 110 : 190) :
            kind === 'drizzle' ? (small ? 60 : 110) : kind === 'fog' ? 6 : kind === 'cloud' ? 5 : (night ? (small ? 45 : 80) : 0);
    for (var i = 0; i < N; i++) {
      if (kind === 'snow') P.push({ x:rnd(0,W), y:rnd(0,H), r:rnd(1.2,3.8), vy:rnd(0.7,2.0), vx:rnd(-0.4,0.4), ph:rnd(0,6.28), sw:rnd(0.4,1.2) });
      else if (kind === 'rain' || kind === 'storm' || kind === 'drizzle') {
        var d = kind === 'drizzle';
        P.push({ x:rnd(-50,W), y:rnd(0,H), l:d ? rnd(6,10) : rnd(12,22), vy:d ? rnd(9,13) : rnd(16,26), vx:d ? -1.5 : -3.2 });
      }
      else if (kind === 'fog' || kind === 'cloud') P.push({ x:rnd(-200,W), y:rnd(0, kind === 'fog' ? H : H * 0.55), r:rnd(110,230), vx:rnd(0.12,0.4) * (kind === 'fog' ? 1 : 0.8) });
      else P.push({ x:rnd(0,W), y:rnd(0,H * 0.7), r:rnd(0.5,1.7), ph:rnd(0,6.28), sp:rnd(0.01,0.04) });
    }
    var t = 0;
    function frame(){
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      t++; ctx.clearRect(0, 0, W, H);
      if (kind === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        P.forEach(function(p){
          p.ph += 0.02 * p.sw; p.y += p.vy; p.x += p.vx + Math.sin(p.ph) * 0.6;
          if (p.y > H + 6) { p.y = -6; p.x = rnd(0, W); } if (p.x > W + 6) p.x = -6; if (p.x < -6) p.x = W + 6;
          ctx.globalAlpha = Math.min(1, 0.35 + p.r / 4.5);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (kind === 'rain' || kind === 'storm' || kind === 'drizzle') {
        ctx.strokeStyle = 'rgba(170,205,255,.55)'; ctx.lineWidth = kind === 'drizzle' ? 1 : 1.3; ctx.beginPath();
        P.forEach(function(p){
          p.y += p.vy; p.x += p.vx;
          if (p.y > H) { p.y = -p.l; p.x = rnd(0, W + 60); }
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.6, p.y + p.l);
        });
        ctx.stroke();
        if (kind === 'storm') {
          if (--nextBolt <= 0) { flash = 1; nextBolt = Math.floor(rnd(150, 420)); }
          if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.38).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); flash -= 0.045; }
        }
      } else if (kind === 'fog' || kind === 'cloud') {
        var col = kind === 'fog' ? '215,222,235' : '200,210,230', a = kind === 'fog' ? 0.10 : 0.07;
        P.forEach(function(p){
          p.x += p.vx; if (p.x - p.r > W) { p.x = -p.r; }
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
          ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        });
      } else if (night) {
        ctx.fillStyle = '#fff';
        P.forEach(function(p){ p.ph += p.sp; ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(p.ph)); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); });
        ctx.globalAlpha = 1;
      } else {
        var pulse = 0.5 + 0.5 * Math.sin(t / 60), g2 = ctx.createRadialGradient(W * 0.92, -20, 0, W * 0.92, -20, W * 0.85);
        g2.addColorStop(0, 'rgba(255,210,110,' + (0.30 + pulse * 0.08).toFixed(3) + ')'); g2.addColorStop(1, 'rgba(255,210,110,0)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      }
    }
    frame();
    mxState.fx = { stop:function(){ dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); } };
  }

  function mxStart(){
    mxStop(); mxState.alive = true;
    var cv0 = document.createElement('canvas'); cv0.id = 'wxFx'; document.body.appendChild(cv0);
    mxState.data = mxState.data || mxLoad(MX_CACHE_KEY);
    var cw = mxLoad('wx_cache_v1'); mxState.region = wxRegion();
    mxState.wx = (cw && cw.region === mxState.region.id) ? cw : null;
    if (mxState.wx && wxForced()) mxState.wx.kind = wxForced();
    mxPaintTicker(); wxPaint(); wxFx(mxState.wx);
    mxRefreshMarket();
    wxFetch().then(function(w){ if (!mxState.alive) return; mxState.wx = w; wxPaint(); wxFx(w); }).catch(function(){});
    mxState.timer = setInterval(mxRefreshMarket, 60000);
    mxState.wxTimer = setInterval(function(){
      wxFetch().then(function(w){ if (!mxState.alive) return; var changed = !mxState.wx || mxState.wx.kind !== w.kind; mxState.wx = w; wxPaint(); if (changed) wxFx(w); }).catch(function(){});
    }, 600000);
  }
  function mxStop(){
    mxState.alive = false;
    if (mxState.timer) { clearInterval(mxState.timer); mxState.timer = null; }
    if (mxState.wxTimer) { clearInterval(mxState.wxTimer); mxState.wxTimer = null; }
    if (mxState.fx) { mxState.fx.stop(); mxState.fx = null; }
    var cv = document.getElementById('wxFx'); if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
  }

  function renderMainMenu(){
    var cl = function(s){ return s.replace(/^\S+\s?/, ''); };
    var items = [
      { pal:'g-sun', wide:true, tall:true, icon:'🛠️', title:cl(t().menuTechs), sub:t().menuTechsSub, badge:'🎬 ' + L('ANIMATSIYA','АНИМАЦИЯ'),
        count:t().itemsCount(totalIssues()), brand:L('Texnika','Техника'), action:function(el){ pzOpen('tech', el, function(){ push({ view:'home' }); }); } },
      { pal:'g-market', wide:true, icon:'🛒', title:'Market', sub:L('Ehtiyot qismlar, eski va B/U texnika','Запчасти, старая и Б/У техника'), badge:'🔥 ' + L('YANGI','НОВОЕ'),
        cta:'🛒 ' + L('Marketga kirish','В маркет') + ' ›', brand:'Market', action:function(el){ mkOpenPortal(el); } },
      { pal:'g-night', wide:true, icon:'🔍', title:cl(t().menuTopish), sub:t().menuTopishSub, cta:'🔎 ' + L('Qidirish','Искать') + ' ›',
        brand:L('Ustaxona','Мастерская'), action:function(el){ pzOpen('find', el, function(){ push({ view:'topishViloyat' }); }); } },
      { pal:'g-teal', wide:true, icon:'🗺️', title:L('Xarita','Карта'), sub:L('Yaqin atrofdagi ustalarni xaritada toping','Найдите мастеров рядом на карте'),
        cta:'🗺 ' + L('Xaritani ochish','Открыть карту') + ' ›', brand:L('Xarita','Карта'), action:function(el){ pzOpen('map', el, function(){ push({ view:'map' }); }); } },
      { pal:'g-pink', icon:'📋', title:cl(t().menuOrder), sub:t().menuOrderSub, brand:L('Buyurtma','Заказ'), action:function(el){ pzOpen('order', el, function(){ push({ view:'orderGate' }); }); } },
      { pal:'g-sky', icon:'👤', title:cl(t().menuProfile), sub:t().menuProfileSub, brand:L('Profil','Профиль'), action:function(el){ pzOpen('prof', el, function(){ push({ view:'profileGate' }); }); } },
      { pal:'g-lime', icon:'📝', title:cl(t().menuAnketa), sub:t().menuAnketaSub, brand:L('Usta bo\'l','Стать мастером'), action:function(el){ pzOpen('anketa', el, function(){ push({ view:'anketaGate' }); }); } },
      { pal:'g-fire', icon:'🏆', title:cl(t().menuAbout), sub:t().menuAboutSub, brand:L('Biz','Мы'), action:function(el){ pzOpen('about', el, function(){ push({ view:'about' }); }); } },
      { pal:'g-violet', wide:true, icon:'📞', title:cl(t().menuContact), sub:t().menuContactSub, cta:'+998 99 009 90 37', brand:L('Aloqa','Связь'), action:function(el){ pzOpen('call', el, function(){ push({ view:'contact' }); }); } }
    ];
    mainView.innerHTML =
      '<div class="view"><div class="mx-ticker" id="mxTicker"></div><div class="hello"><h1>' + L('Salom','Привет') + ', <span class="gr">' + userName() + '</span> <span class="wave">👋</span></h1>' +
      '<p>' + L('Barcha bo\'limlar shu yerda — tanlang','Все разделы здесь — выбирайте') + '</p></div>' +
      '<div class="wx-card" id="wxCard"></div>' +
      '<div class="tiles">' + items.map(tileHTML).join('') + '</div></div>';
    mainView.querySelectorAll('[data-ti]').forEach(function(btn){
      btn.addEventListener('click', function(){ haptic('select'); items[parseInt(btn.getAttribute('data-ti'), 10)].action(btn); });
    });
  mxStart();
  }

  function renderHome(){
    var q = (state.homeQuery || '').trim().toLowerCase();
    var filtered = CATS.filter(function(c){ return !q || pick(c,'name').toLowerCase().indexOf(q) > -1; });
    filtered.sort(function(a,b){ return (b.id === 'printer') - (a.id === 'printer'); });
    var rest = filtered.length - (filtered.length && filtered[0].id === 'printer' ? 1 : 0);
    var items = filtered.map(function(c, i){
      var wide = (c.id === 'printer') || (i === filtered.length - 1 && rest % 2 === 1 && c.id !== 'printer');
      return { pal:palOf(c.id), wide:wide, tall:(c.id === 'printer'), icon:c.icon, title:pick(c,'name'),
        count:t().itemsCount(countForCategory(c)), brand:L('Texnika','Техника'), cid:c.id };
    });
    mainView.innerHTML =
      '<div class="view"><div class="hero v2"><h1>' + t().heroTitle + '</h1><p>' + t().heroDesc + '</p></div>' +
      '<div class="search-wrap"><span class="sic">🔎</span><input id="homeSearch" placeholder="' + t().searchPh + '" value="' + (state.homeQuery||'') + '"></div>' +
      (items.length ? '<div class="tiles">' + items.map(tileHTML).join('') + '</div>' : '<div class="empty">' + t().notFound + '</div>') + '</div>';
    var search = document.getElementById('homeSearch');
    search.addEventListener('input', function(){
      state.homeQuery = search.value; renderHome(); search.focus(); search.setSelectionRange(search.value.length, search.value.length);
    });
    mainView.querySelectorAll('[data-ti]').forEach(function(btn){
      btn.addEventListener('click', function(){ haptic('select'); openCategory(items[parseInt(btn.getAttribute('data-ti'),10)].cid); });
    });
  }

  // ---------- Animatsiya pleyer ----------
  var curIllus = null;
  var STEP_MS = 3800;
  function genericSteps(){
    return [
      { icon:'🔍', caption_uz:'Nosozlik joyini aniqlang', caption_ru:'Определите место неисправности' },
      { icon:'🔧', caption_uz:'Tuzating yoki almashtiring', caption_ru:'Устраните или замените' },
      { icon:'✅', caption_uz:'Sinab ko\'ring — tayyor!', caption_ru:'Проверьте — готово!' }
    ];
  }
  function renderIllustrationBlock(diagKey, cat){
    var conf = ILLUSTRATIONS[diagKey];
    var steps = conf ? conf.steps : genericSteps();
    var cid = cat ? cat.id : '';
    curIllus = { steps: steps, scene: SCENES[cid] ? cid : '_gen' };
    var segs = steps.map(function(s, i){ return '<div class="vp-seg" data-i="' + i + '"><i></i></div>'; }).join('');
    return '<div class="vp playing" id="vp" data-step="0" style="--dur:' + (STEP_MS/1000) + 's">' +
      '<div class="vp-stage"><div class="vp-grid"></div><div class="vp-live"><i></i>' + L('ANIMATSIYA','АНИМАЦИЯ') + '</div>' +
      '<div class="vp-count" id="vpCount"></div><div class="vp-ring"></div>' +
      '<div class="vp-dev"><svg viewBox="0 0 230 210" aria-hidden="true">' + SCENES[curIllus.scene]() + '</svg></div>' +
      '<div class="vp-tool" id="vpTool"></div></div>' +
      '<div class="vp-cap" id="vpCap"></div>' +
      '<div class="vp-bar"><button class="vp-btn" id="vpPlay" aria-label="play/pause">❚❚</button><div class="vp-segs" id="vpSegs">' + segs + '</div><button class="vp-replay" id="vpReplay" aria-label="replay">↻</button></div></div>';
  }

  function wireIllustrationCycle(){
    var vp = mainView.querySelector('#vp');
    if (!vp || !curIllus) return;
    if (illusTimer) clearTimeout(illusTimer);
    var steps = curIllus.steps, n = steps.length, cur = 0, playing = true, started = 0, remain = STEP_MS;
    var segs = Array.prototype.slice.call(vp.querySelectorAll('.vp-seg'));
    var playBtn = vp.querySelector('#vpPlay');
    function paint(){
      var s = steps[cur];
      vp.setAttribute('data-step', String(cur));
      vp.querySelector('#vpCount').textContent = (cur+1) + ' / ' + n;
      vp.querySelector('#vpCap').innerHTML = '<div class="n">' + L('Qadam','Шаг') + ' ' + (cur+1) + '</div><div class="t">' + esc(pick(s,'caption')) + '</div>';
      var tool = vp.querySelector('#vpTool'), nt = tool.cloneNode(false);
      nt.innerHTML = '<span>' + s.icon + '</span>'; tool.parentNode.replaceChild(nt, tool);
      segs.forEach(function(sg, i){
        sg.classList.remove('cur'); sg.classList.toggle('done', i < cur);
        if (i === cur) { void sg.offsetWidth; sg.classList.add('cur'); }
      });
    }
    function schedule(ms){
      clearTimeout(illusTimer); started = Date.now(); remain = ms;
      illusTimer = setTimeout(function(){
        if (!document.body.contains(vp)) return;
        cur = (cur + 1) % n; paint(); schedule(STEP_MS);
      }, ms);
    }
    function setPlaying(p){
      playing = p; vp.classList.toggle('playing', p); playBtn.textContent = p ? '❚❚' : '▶';
      if (p) schedule(remain); else { clearTimeout(illusTimer); remain = Math.max(300, remain - (Date.now() - started)); }
    }
    playBtn.addEventListener('click', function(){ haptic('tap'); setPlaying(!playing); });
    vp.querySelector('#vpReplay').addEventListener('click', function(){ haptic('select'); cur = 0; paint(); vp.classList.add('playing'); playBtn.textContent = '❚❚'; playing = true; schedule(STEP_MS); });
    segs.forEach(function(sg){ sg.addEventListener('click', function(){
      haptic('select'); cur = parseInt(sg.getAttribute('data-i'),10); paint(); if (playing) schedule(STEP_MS); else remain = STEP_MS;
    }); });
    document.addEventListener('visibilitychange', function h(){
      if (!document.body.contains(vp)) { document.removeEventListener('visibilitychange', h); return; }
      if (document.hidden && playing) setPlaying(false);
    });
    paint(); schedule(STEP_MS);
  }

  // Havola turini aniqlaydi: YouTube/Vimeo (iframe), to'g'ridan-to'g'ri video fayl,
  // ochiq Telegram posti (t.me/kanal/123 — iframe), boshqasi — faqat "Ochish" tugmasi.
  function videoSpec(url){
    if (!url) return null;
    url = String(url).trim();
    if (!/^https?:\/\//i.test(url)) return null;
    var yt = youtubeEmbedUrl(url);
    if (yt) return { kind:'iframe', src: yt + '?playsinline=1&rel=0' };
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d{5,12})/i);
    if (vm) return { kind:'iframe', src: 'https://player.vimeo.com/video/' + vm[1] };
    var clean = url.split('#')[0].split('?')[0].toLowerCase();
    if (/\.(mp4|webm|mov|m4v|ogv)$/.test(clean)) return { kind:'file', src: url };
    var tm = url.match(/^https?:\/\/(?:www\.)?(?:t|telegram)\.me\/([A-Za-z0-9_]+)\/(?:\d+\/)?(\d+)(?:[\/?#].*)?$/i);
    if (tm && tm[1].toLowerCase() !== 'c') return { kind:'tgpost', src: 'https://t.me/' + tm[1] + '/' + tm[2] + '?embed=1&mode=tme' };
    return { kind:'link' };
  }

  function openVideoLink(url){
    try {
      if (tg && /^https?:\/\/(?:www\.)?(?:t|telegram)\.me\//i.test(url) && tg.openTelegramLink) { tg.openTelegramLink(url); return; }
      if (tg && tg.openLink) { tg.openLink(url); return; }
    } catch(e){}
    window.open(url, '_blank');
  }

  function renderVideoBlock(url){
    var spec = videoSpec(url);
    if (!spec) return '';
    var media = '';
    if (spec.kind === 'iframe') {
      media = '<div class="video-embed"><iframe src="' + esc(spec.src) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    } else if (spec.kind === 'file') {
      media = '<video class="video-el" controls playsinline preload="metadata" src="' + esc(spec.src) + '"></video>';
    } else if (spec.kind === 'tgpost') {
      media = '<div class="video-embed tg"><iframe src="' + esc(spec.src) + '" allowfullscreen loading="lazy"></iframe></div>';
    }
    return '<div class="panel" data-video-url="' + esc(url) + '">' +
      '<div class="ph">▶️ ' + t().videoTitle + '</div>' + media +
      '<button type="button" class="video-open">🔗 ' + t().videoOpen + '</button>' +
      '</div>';
  }

  function wireVideoBlock(root){
    if (!root) return;
    var box = root.querySelector('[data-video-url]');
    if (!box) return;
    var btn = box.querySelector('.video-open');
    if (btn) btn.addEventListener('click', function(){ haptic('select'); openVideoLink(box.getAttribute('data-video-url')); });
  }

  var diagLinksCache = null;
  function loadDiagLinks(){
    if (diagLinksCache) return Promise.resolve(diagLinksCache);
    return apiGet('/api/public/diag/links').then(function(res){
      diagLinksCache = (res && res.ok && res.links) ? res.links : {};
      return diagLinksCache;
    }).catch(function(){ return {}; });
  }

  var diagPricesCache = null;
  function loadDiagPrices(){
    if (diagPricesCache) return Promise.resolve(diagPricesCache);
    return apiGet('/api/public/diag/prices').then(function(res){
      diagPricesCache = (res && res.ok && res.prices) ? res.prices : {};
      return diagPricesCache;
    }).catch(function(){ return {}; });
  }

  function renderPriceSection(p){
    var has = p && (p.narx || p.malumot);
    var body = has
      ? ((p.narx ? '<p><strong>' + esc(p.narx) + '</strong></p>' : '') +
         (p.malumot ? '<p>' + esc(p.malumot) + '</p>' : ''))
      : '<p>' + t().priceNone + '</p>';
    return '<button class="btn-primary" id="priceBtn" style="width:100%;padding:14px;border-radius:11px;font-weight:600;margin-top:6px">' +
      '💰 ' + t().priceBtn + '</button>' +
      '<div class="panel" id="priceBox" style="display:none;margin-top:10px">' +
      '<div class="ph">💰 ' + t().priceTitle + '</div>' + body + '</div>';
  }

  function renderIssue(entry){
    var c = catById(entry.catId);
    var item, raw, label, diagKey, videoUrl;

    if (entry.mode === 'single') {
      label = pick(c, 'name');
      raw = pick(c, 'text');
      diagKey = c.key;
      videoUrl = pick(c, 'video');
    } else if (entry.mode === 'flat') {
      item = c.items[entry.idx];
      label = pick(item, 'label');
      raw = pick(item, 'text');
      diagKey = item.key;
      videoUrl = pick(item, 'video');
    } else if (entry.mode === 'printer') {
      var st = c.subtypes.find(function(s){ return s.id === entry.subId; });
      var brand = st.brands[entry.brandIdx];
      item = brand.items[entry.idx];
      label = pick(item, 'label');
      raw = pick(item, 'text');
      diagKey = item.key;
      videoUrl = pick(item, 'video');
    }

    var blocks = parseDiagText(raw);
    var html = blocksToHTML(blocks);
    var illusHtml = renderIllustrationBlock(diagKey, c);
    var videoHtml = renderVideoBlock(videoUrl);

    mainView.innerHTML =
      '<div class="view"><div class="detail-head">' +
      '<div class="eyebrow"><span class="ping"></span>' + t().diagnosing + '</div>' +
      '<h2>' + esc(label.replace(/^\S+\s/, function(m){ return ''; }) || label) + '</h2>' +
      '</div>' + illusHtml + '<div id="videoSlot" data-key="' + esc(diagKey) + '">' + videoHtml + '</div>' + html +
      '<div id="priceSlot" style="margin:14px 0"></div>' +
      '<p class="note">ℹ️ ' + t().note + '</p></div>';

    wireIllustrationCycle();
    wireVideoBlock(mainView.querySelector('#videoSlot'));

    // Admin panelda ("Nosozlik havolalari") kiritilgan video havola bo'lsa — u ustuvor
    loadDiagLinks().then(function(links){
      var vslot = mainView.querySelector('#videoSlot');
      if (!vslot || vslot.getAttribute('data-key') !== diagKey) return;
      var u = links[diagKey];
      if (!u) return;
      var h = renderVideoBlock(u);
      if (!h) return;
      vslot.innerHTML = h;
      wireVideoBlock(vslot);
    });

    loadDiagPrices().then(function(all){
      var slot = mainView.querySelector('#priceSlot');
      if (!slot) return;
      slot.innerHTML = renderPriceSection(all[diagKey]);
      var btn = slot.querySelector('#priceBtn');
      var box = slot.querySelector('#priceBox');
      btn.addEventListener('click', function(){
        var open = box.style.display !== 'none';
        box.style.display = open ? 'none' : 'block';
        if (!open) { try { box.scrollIntoView({behavior:'smooth', block:'nearest'}); } catch(e){} }
      });
    });
  }

  // ---------- XARITA (Leaflet + OpenStreetMap) ----------
  // Yangi soha qo'shish (do'konlar, servis markazlari va h.k.):
  //   1) MAP_LAYERS ga yozuv qo'shing (bittadan ortiq bo'lsa yuqorida qatlam tablari chiqadi);
  //   2) serverda /api/public/map/nearby dagi `layer` shartiga shu qatlam uchun ma'lumot ulang.
  // Diqqat: bu fayldagi L() — til yordamchisi. Leaflet'ga window.L orqali LF sifatida murojaat qilinadi.
  var MAP_LAYERS = [
    { id:'ustalar', icon:'🛠️', name_uz:'Ustalar', name_ru:'Мастера',
      ph_uz:'Usta ismi yoki xizmat...', ph_ru:'Имя мастера или услуга...',
      unit_uz:'ta usta', unit_ru:'мастеров' }
  ];
  var MAP_DEFAULT = { lat: 41.3111, lon: 69.2797, zoom: 11 }; // Toshkent
  var MAP_LIB = {
    css: [
      ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'],
      ['https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css', 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css']
    ],
    leaflet: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],
    cluster: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js', 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js']
  };
  var mapUI = { layer:'ustalar', q:'', xizmatlar:[], dark:true }; // seans davomida eslab qolinadi
  var mapRt = null;          // ochiq xarita holati
  var mapLibPromise = null;

  function mapEsc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function mapKm(a, b){
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var x = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(a.lat*rad) * Math.cos(b.lat*rad) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function mapLayerDef(){
    for (var i = 0; i < MAP_LAYERS.length; i++) if (MAP_LAYERS[i].id === mapUI.layer) return MAP_LAYERS[i];
    return MAP_LAYERS[0];
  }

  function mapLoadCss(urls){
    return new Promise(function(resolve){
      var i = 0;
      (function next(){
        if (i >= urls.length) { resolve(); return; }
        var l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = urls[i++];
        l.onload = function(){ resolve(); };
        l.onerror = function(){ l.remove(); next(); };
        document.head.appendChild(l);
      })();
    });
  }
  function mapLoadScript(urls){
    return new Promise(function(resolve, reject){
      var i = 0;
      (function next(){
        if (i >= urls.length) { reject(new Error('script')); return; }
        var s = document.createElement('script');
        s.src = urls[i++];
        s.onload = function(){ resolve(); };
        s.onerror = function(){ s.remove(); next(); };
        document.head.appendChild(s);
      })();
    });
  }
  // Leaflet faqat xarita ochilganda yuklanadi (ilovaning boshqa qismlari sekinlashmaydi).
  function mapEnsureLib(){
    if (window.L && window.L.map) return Promise.resolve();
    if (mapLibPromise) return mapLibPromise;
    mapLibPromise = Promise.all(MAP_LIB.css.map(mapLoadCss)).then(function(){
      return mapLoadScript(MAP_LIB.leaflet);
    }).then(function(){
      return mapLoadScript(MAP_LIB.cluster).catch(function(){ /* klasterlashsiz ham ishlaydi */ });
    }).catch(function(e){ mapLibPromise = null; throw e; });
    return mapLibPromise;
  }

  function mapInjectCss(){
    if (document.getElementById('mapxCss')) return;
    var css = [
      '.mapx{position:relative;isolation:isolate;overflow:hidden;border-radius:18px;border:1px solid var(--border);background:var(--bg-panel);margin-top:4px}',
      '.mapx-canvas{position:absolute;top:0;left:0;right:0;bottom:0;z-index:0;background:#0b0e13}',
      '.mapx .leaflet-container{font-family:var(--font-body);background:#0b0e13;outline:none}',
      '.mapx.dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.92) contrast(.92) saturate(.8)}',
      '.mapx .leaflet-control-attribution{background:rgba(14,17,22,.7);color:var(--text-3);font-size:9.5px}',
      '.mapx .leaflet-control-attribution a{color:var(--text-2)}',
      '.mapx-top{position:absolute;left:10px;right:10px;top:10px;z-index:1000;display:flex;flex-direction:column;gap:8px;pointer-events:none}',
      '.mapx-top>*{pointer-events:auto}',
      '.mapx-search{position:relative}',
      '.mapx-search input{width:100%;box-sizing:border-box;background:rgba(23,27,33,.96);border:1px solid var(--border);border-radius:12px;padding:12px 38px;color:var(--text-1);font-size:16px;font-family:var(--font-body);box-shadow:0 6px 18px rgba(0,0,0,.35)}',
      '.mapx-search input::placeholder{color:var(--text-3)}',
      '.mapx-search .sic{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--text-3)}',
      '.mapx-clear{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;background:transparent;border:none;color:var(--text-2);font-size:14px}',
      '.mapx-chips{display:flex;gap:7px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}',
      '.mapx-chips::-webkit-scrollbar{display:none}',
      '.mapx-chip{flex:0 0 auto;white-space:nowrap;background:rgba(23,27,33,.96);border:1px solid var(--border);color:var(--text-2);border-radius:999px;padding:8px 13px;font-size:12.5px;font-family:var(--font-body);font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.3)}',
      '.mapx-chip.on{background:var(--cyan);border-color:var(--cyan);color:#06201d}',
      '.mapx-filter{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;max-width:calc(100% - 44px);background:rgba(23,27,33,.96);border:1px solid var(--border);color:var(--text-1);border-radius:12px;padding:10px 14px;font-size:13.5px;font-weight:600;font-family:var(--font-body);box-shadow:0 4px 12px rgba(0,0,0,.3)}',
      '.mapx-filter .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mapx-filter .car{color:var(--text-3);font-size:11px;transition:transform .18s}',
      '.mapx-filter.open .car{transform:rotate(180deg)}',
      '.mapx-filter.on{border-color:var(--cyan);color:var(--cyan)}',
      '.mapx-drop{align-self:flex-start;width:min(320px,calc(100% - 44px));overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(23,27,33,.98);border:1px solid var(--border);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.5);animation:view-in .16s ease both}',
      '.mapx-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;box-sizing:border-box;padding:13px 16px;background:transparent;border:none;border-bottom:1px solid var(--border-soft);color:var(--text-1);font-size:14px;font-family:var(--font-body);text-align:left}',
      '.mapx-opt:last-child{border-bottom:none}',
      '.mapx-opt:active{background:var(--bg-panel-hover)}',
      '.mapx-opt.on{color:var(--cyan);font-weight:700}',
      '.mapx-opt .tick{font-size:15px}',
      '.mapx-badge{align-self:flex-start;background:rgba(23,27,33,.96);border:1px solid var(--border);color:var(--text-2);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.3)}',
      '.mapx-badge:empty{display:none}',
      '.mapx-badge.warn{color:var(--amber);border-color:var(--amber-dim)}',
      '.mapx-here{align-self:center;background:var(--cyan);color:#06201d;border:none;border-radius:999px;padding:9px 16px;font-size:12.5px;font-weight:700;font-family:var(--font-body);box-shadow:0 6px 16px rgba(0,0,0,.4)}',
      '.mapx-fabs{position:absolute;right:10px;top:140px;z-index:1000;display:flex;flex-direction:column;gap:8px}',
      '.mapx-fab{width:42px;height:42px;border-radius:12px;background:rgba(23,27,33,.96);border:1px solid var(--border);color:var(--text-1);font-size:18px;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.35)}',
      '.mapx-msg{position:absolute;left:20px;right:20px;top:50%;transform:translateY(-50%);z-index:1000;background:rgba(23,27,33,.97);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center;color:var(--text-2);font-size:13px;line-height:1.5}',
      '.mapx-card{position:absolute;left:10px;right:10px;bottom:26px;z-index:1000;animation:view-in .2s ease both}',
      '.mapx-card .master-card{box-shadow:0 10px 30px rgba(0,0,0,.5)}',
      '.mapx-close{position:absolute;top:6px;right:6px;z-index:2;width:30px;height:30px;border-radius:50%;background:var(--bg-panel-2);border:1px solid var(--border);color:var(--text-2);font-size:13px}',
      '.mapx-hint{margin-top:8px;color:var(--text-3);font-size:11px}',
      '.mapx-pin-wrap,.mapx-me-wrap,.mapx-cluster{background:none;border:none}',
      '.mapx-pin{width:38px;height:38px;box-sizing:border-box;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--bg-panel);border:3px solid var(--green);box-shadow:0 4px 10px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}',
      '.mapx-pin span{transform:rotate(45deg);font-size:17px;line-height:1}',
      '.mapx-pin.busy{border-color:var(--red)}',
      '.mapx-pin.prem{box-shadow:0 0 0 3px rgba(255,200,61,.55),0 4px 10px rgba(0,0,0,.45)}',
      '.mapx-me{width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;animation:mapx-pulse 2s infinite}',
      '@keyframes mapx-pulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,.55)}70%{box-shadow:0 0 0 16px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}',
      '.mapx-cluster div{width:40px;height:40px;box-sizing:border-box;border-radius:50%;background:var(--cyan);color:#06201d;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid rgba(255,255,255,.85);box-shadow:0 4px 12px rgba(0,0,0,.4)}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'mapxCss';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function mapCleanup(){
    try { pfCleanup(); } catch(e){}
    if (!mapRt) return;
    try { clearTimeout(mapRt.qTimer); } catch(e){}
    try { window.removeEventListener('resize', mapRt.onResize); } catch(e){}
    try { if (mapRt.map) mapRt.map.remove(); } catch(e){}
    mapRt = null;
  }

  function mapPinIcon(m){
    var LF = window.L;
    var first = String(m.xizmatlar || '').split(',')[0].trim();
    var tok = (first.match(/^\S+/) || [''])[0];
    var em = (tok && tok.length <= 4) ? tok : '🛠️';
    var cls = 'mapx-pin ' + (m.band ? 'busy' : 'free') + (m.is_premium ? ' prem' : '');
    return LF.divIcon({ className:'mapx-pin-wrap', html:'<div class="' + cls + '"><span>' + mapEsc(em) + '</span></div>',
      iconSize:[38, 46], iconAnchor:[19, 44] });
  }

  function mapAvatarHTML(m){
    var initials = String(m.ism || '?').trim().split(/\s+/).slice(0, 2).map(function(w){ return w.charAt(0) || ''; }).join('').toUpperCase().replace(/[^A-Za-z0-9\u0400-\u04FF\u0100-\u024F]/g, '');
    if (m.has_photo && API_BASE) {
      return '<img class="mc-avatar-img" src="' + mapEsc(API_BASE) + '/api/public/master/photo?tg_id=' + encodeURIComponent(m.tg_id) +
        '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'mc-avatar-fallback\',textContent:\'' + initials + '\'}))">';
    }
    return '<div class="mc-avatar-fallback">' + mapEsc(initials) + '</div>';
  }

  function mapOpenCard(m){
    var rt = mapRt; if (!rt) return;
    var link = m.username ? ('https://t.me/' + encodeURIComponent(m.username)) : ('tg://user?id=' + encodeURIComponent(m.tg_id));
    var ratingHtml = m.rating ? (mapEsc(m.rating) + ' <span class="mc-rc">(' + mapEsc(m.rating_count) + ')</span>') : '—';
    var chips = String(m.xizmatlar || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean)
      .map(function(s){ return '<span class="mc-chip">' + mapEsc(s) + '</span>'; }).join('');
    var avail = '<span class="mc-avail ' + (m.band ? 'busy' : 'free') + '">' + (m.band ? t().topishBusy : t().topishFree) + '</span>';
    var where = [m.viloyat, m.tuman].filter(Boolean).map(mapEsc).join(' · ');
    var card = rt.cardEl;
    card.innerHTML =
      '<button class="mapx-close" id="mapxClose" aria-label="close">✕</button>' +
      '<div class="master-card' + (m.is_premium ? ' premium' : '') + (m.band ? ' is-busy' : '') + '">' +
      (m.is_premium ? '<div class="mc-premium-tag">⭐ PREMIUM</div>' : '') +
      '<div class="mc-top"><div class="mc-avatar">' + mapAvatarHTML(m) + '</div>' +
      '<div class="mc-id"><div class="mc-name">' + mapEsc(m.ism) + '</div>' +
      '<div class="mc-stats"><span class="mc-stat mc-rating">⭐ ' + ratingHtml + '</span>' +
      (m.masofa_km != null ? '<span class="mc-stat">📏 ' + mapEsc(m.masofa_km) + ' km</span>' : '') + '</div></div></div>' +
      '<div class="mc-chips">' + chips + avail + '</div>' +
      pfCardExtras(m) +
      '<div class="mc-actions">' +
      '<a class="tel" href="tel:' + mapEsc(m.telefon) + '">📞 ' + mapEsc(m.telefon) + '</a>' +
      '<a class="tg" href="' + mapEsc(link) + '" target="_blank">✈️ ' + t().topishWrite + '</a></div>' +
      '<div class="mapx-hint">📍 ' + (where ? where + ' · ' : '') + L('Taxminiy joylashuv', 'Примерное местоположение') + '</div>' +
      '</div>';
    card.hidden = false;
    card.querySelector('#mapxClose').addEventListener('click', function(){ haptic('tap'); mapCloseCard(); });
    haptic('select');
  }
  function mapCloseCard(){
    if (mapRt && mapRt.cardEl) { mapRt.cardEl.hidden = true; mapRt.cardEl.innerHTML = ''; }
  }

  function mapBadge(text, warn){
    if (!mapRt) return;
    mapRt.badgeEl.textContent = text || '';
    mapRt.badgeEl.classList.toggle('warn', !!warn);
  }
  function mapMsg(text){
    if (!mapRt) return;
    mapRt.msgEl.hidden = !text;
    mapRt.msgEl.textContent = text || '';
  }

  function mapSetView(latlng, zoom){
    if (!mapRt) return;
    mapRt.progUntil = Date.now() + 900;
    mapRt.map.setView(latlng, zoom, { animate: true });
  }
  function mapFitResults(items){
    var rt = mapRt; if (!rt) return;
    var pts = items.slice(0, 20).map(function(m){ return [m.lat, m.lon]; });
    if (rt.user) pts.push([rt.user.lat, rt.user.lon]);
    if (!pts.length) return;
    rt.progUntil = Date.now() + 1200;
    if (pts.length === 1) { rt.map.setView(pts[0], 14, { animate: true }); return; }
    rt.map.fitBounds(pts, { paddingTopLeft:[40, 170], paddingBottomRight:[40, 60], maxZoom:15, animate:true });
  }

  function mapRenderMarkers(items){
    var rt = mapRt; if (!rt) return;
    var LF = window.L;
    rt.group.clearLayers();
    var markers = items.map(function(m){
      var mk = LF.marker([m.lat, m.lon], { icon: mapPinIcon(m), title: m.ism || '', keyboard: false });
      mk.on('click', function(){ mapOpenCard(m); });
      return mk;
    });
    if (rt.group.addLayers) rt.group.addLayers(markers);
    else markers.forEach(function(mk){ rt.group.addLayer(mk); });
  }

  function mapFetch(o){
    var rt = mapRt; if (!rt) return;
    o = o || {};
    var id = ++rt.reqId;
    var c = o.center || rt.map.getCenter();
    var clat = c.lat, clon = (c.lng != null ? c.lng : c.lon);
    if (!getInitData()) { mapMsg(t().topishNoInitData); mapBadge(''); return; }
    if (!API_BASE) { mapMsg(t().topishApiMissing); mapBadge(''); return; }
    mapMsg(null);
    mapBadge('⏳ ' + L('Qidirilmoqda...', 'Поиск...'));
    apiPost('/api/public/map/nearby', {
      init_data: getInitData(), layer: mapUI.layer, lat: clat, lon: clon,
      ulat: rt.user ? rt.user.lat : null, ulon: rt.user ? rt.user.lon : null,
      xizmatlar: mapUI.xizmatlar, q: mapUI.q
    }).then(function(res){
      if (!mapRt || id !== mapRt.reqId) return;
      var body = res.data;
      if (!body || !body.ok) { mapBadge(''); mapMsg(body && body.error ? body.error : t().orderErrGeneric); return; }
      var items = body.items || [];
      mapRt.items = items;
      mapRt.lastCenter = { lat: clat, lon: clon };
      mapRt.hereBtn.hidden = true;
      mapCloseCard();
      mapRenderMarkers(items);
      var unit = L(mapLayerDef().unit_uz, mapLayerDef().unit_ru);
      if (!items.length) mapBadge('😔 ' + t().topishNoResults, true);
      else mapBadge(items.length + ' ' + unit);
      if (o.refit && items.length) mapFitResults(items);
    }).catch(function(){
      if (!mapRt || id !== mapRt.reqId) return;
      mapBadge(''); mapMsg(t().orderErrGeneric);
    });
  }

  function mapSetUser(loc){
    var rt = mapRt; if (!rt || !loc) return;
    var LF = window.L;
    rt.user = loc;
    if (rt.userMarker) rt.userMarker.setLatLng([loc.lat, loc.lon]);
    else rt.userMarker = LF.marker([loc.lat, loc.lon], {
      icon: LF.divIcon({ className:'mapx-me-wrap', html:'<div class="mapx-me"></div>', iconSize:[18, 18], iconAnchor:[9, 9] }),
      interactive: false, keyboard: false, zIndexOffset: 1000
    }).addTo(rt.map);
  }

  function mapLocate(initial){
    var rt = mapRt; if (!rt) return;
    requestLocation().then(function(loc){
      if (!mapRt) return;
      if (!loc) { if (!initial) { mapBadge('⚠️ ' + L('Joylashuvga ruxsat berilmadi', 'Нет доступа к геолокации'), true); } return; }
      mapSetUser(loc);
      mapSetView([loc.lat, loc.lon], 14);
      mapFetch({ center: loc, refit: true });
    });
  }

  function renderMap(entry){
    mapInjectCss();
    var layer = mapLayerDef();
    var services = DATA.xizmatlar || [];
    mainView.innerHTML =
      '<div class="view"><div class="mapx' + (mapUI.dark ? ' dark' : '') + '" id="mapx">' +
      '<div class="mapx-canvas" id="mapxCanvas"></div>' +
      '<div class="mapx-top">' +
        (MAP_LAYERS.length > 1 ? '<div class="mapx-chips" id="mapxTabs">' + MAP_LAYERS.map(function(l){
          return '<button class="mapx-chip' + (l.id === mapUI.layer ? ' on' : '') + '" data-layer="' + mapEsc(l.id) + '">' + l.icon + ' ' + mapEsc(pick(l, 'name')) + '</button>';
        }).join('') + '</div>' : '') +
        '<div class="mapx-search"><span class="sic">🔎</span>' +
          '<input id="mapxQ" type="search" autocomplete="off" placeholder="' + mapEsc(pick(layer, 'ph')) + '" value="' + mapEsc(mapUI.q) + '">' +
          '<button class="mapx-clear" id="mapxClear" aria-label="clear"' + (mapUI.q ? '' : ' hidden') + '>✕</button></div>' +
        '<button class="mapx-filter" id="mapxFilter"></button>' +
        '<div class="mapx-drop" id="mapxDrop" hidden></div>' +
        '<div class="mapx-badge" id="mapxBadge"></div>' +
        '<button class="mapx-here" id="mapxHere" hidden>🔄 ' + L('Shu hududda qidirish', 'Искать в этой области') + '</button>' +
      '</div>' +
      '<div class="mapx-fabs">' +
        '<button class="mapx-fab" id="mapxLocate" aria-label="locate">📍</button>' +
        '<button class="mapx-fab" id="mapxZoomIn" aria-label="zoom in">＋</button>' +
        '<button class="mapx-fab" id="mapxZoomOut" aria-label="zoom out">－</button>' +
        '<button class="mapx-fab" id="mapxTheme" aria-label="theme">' + (mapUI.dark ? '☀️' : '🌙') + '</button>' +
      '</div>' +
      '<div class="mapx-msg" id="mapxMsg" hidden></div>' +
      '<div class="mapx-card" id="mapxCard" hidden></div>' +
      '</div></div>';

    var root = mainView.querySelector('#mapx');
    var filterBtn = mainView.querySelector('#mapxFilter');
    var dropEl = mainView.querySelector('#mapxDrop');

    function filterLabel(){
      return mapUI.xizmatlar.length ? mapEsc(mapUI.xizmatlar[0]) : '🔧 ' + L('Xizmat turi', 'Тип услуги');
    }
    function drawFilter(){
      filterBtn.innerHTML = '<span class="lbl">' + filterLabel() + '</span><span class="car">▼</span>';
      filterBtn.classList.toggle('on', mapUI.xizmatlar.length > 0);
    }
    function drawDrop(){
      var none = mapUI.xizmatlar.length === 0;
      dropEl.innerHTML = '<button class="mapx-opt' + (none ? ' on' : '') + '" data-x="">' +
        '<span>' + L('Barcha xizmat turlari', 'Все типы услуг') + '</span><span class="tick">' + (none ? '✓' : '') + '</span></button>' +
        services.map(function(x, i){
          var on = mapUI.xizmatlar.indexOf(x) > -1;
          return '<button class="mapx-opt' + (on ? ' on' : '') + '" data-i="' + i + '"><span>' + mapEsc(x) + '</span><span class="tick">' + (on ? '✓' : '') + '</span></button>';
        }).join('');
    }
    function openDrop(open){
      if (open) {
        drawDrop();
        dropEl.style.maxHeight = Math.max(180, root.clientHeight - 190) + 'px';
      }
      dropEl.hidden = !open;
      filterBtn.classList.toggle('open', !!open);
    }
    drawFilter();

    // Ekran balandligiga moslash
    function fit(){
      var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      var h = Math.max(380, Math.floor(vh - (root.getBoundingClientRect().top) - 14));
      root.style.height = h + 'px';
      if (mapRt && mapRt.map) mapRt.map.invalidateSize();
    }
    fit();

    mapCleanup();
    mapRt = {
      map: null, group: null, items: [], user: null, userMarker: null, reqId: 0, lastCenter: null, progUntil: 0,
      qTimer: null, onResize: fit,
      cardEl: mainView.querySelector('#mapxCard'), badgeEl: mainView.querySelector('#mapxBadge'),
      msgEl: mainView.querySelector('#mapxMsg'), hereBtn: mainView.querySelector('#mapxHere')
    };
    var rt = mapRt;
    window.addEventListener('resize', fit);

    function refetch(){ mapFetch({ refit: true }); }

    // --- boshqaruv elementlari ---
    var qInput = mainView.querySelector('#mapxQ');
    var clearBtn = mainView.querySelector('#mapxClear');
    qInput.addEventListener('input', function(){
      mapUI.q = qInput.value;
      clearBtn.hidden = !qInput.value;
      clearTimeout(rt.qTimer);
      rt.qTimer = setTimeout(refetch, 350);
    });
    qInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') { qInput.blur(); } });
    clearBtn.addEventListener('click', function(){
      haptic('tap'); qInput.value = ''; mapUI.q = ''; clearBtn.hidden = true; refetch();
    });
    filterBtn.addEventListener('click', function(){ haptic('tap'); openDrop(dropEl.hidden); });
    dropEl.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('.mapx-opt') : null;
      if (!b) return;
      haptic('select');
      if (b.getAttribute('data-x') === '') mapUI.xizmatlar = [];
      else mapUI.xizmatlar = [services[parseInt(b.getAttribute('data-i'), 10)]];
      drawFilter();
      openDrop(false);
      refetch();
    });
    // ro'yxatdan tashqarini bosganda yopiladi
    root.addEventListener('click', function(e){
      if (dropEl.hidden) return;
      if (e.target.closest && (e.target.closest('#mapxDrop') || e.target.closest('#mapxFilter'))) return;
      openDrop(false);
    });
    var tabs = mainView.querySelector('#mapxTabs');
    if (tabs) tabs.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('.mapx-chip') : null;
      if (!b || b.getAttribute('data-layer') === mapUI.layer) return;
      haptic('select');
      mapUI.layer = b.getAttribute('data-layer'); mapUI.q = ''; mapUI.xizmatlar = [];
      renderMap(entry);
    });
    mainView.querySelector('#mapxLocate').addEventListener('click', function(){ haptic('tap'); mapLocate(false); });
    mainView.querySelector('#mapxZoomIn').addEventListener('click', function(){ haptic('tap'); if (rt.map) rt.map.zoomIn(); });
    mainView.querySelector('#mapxZoomOut').addEventListener('click', function(){ haptic('tap'); if (rt.map) rt.map.zoomOut(); });
    mainView.querySelector('#mapxTheme').addEventListener('click', function(){
      haptic('tap'); mapUI.dark = !mapUI.dark;
      root.classList.toggle('dark', mapUI.dark);
      this.textContent = mapUI.dark ? '☀️' : '🌙';
    });
    rt.hereBtn.addEventListener('click', function(){ haptic('select'); mapFetch({ refit: false }); });

    // --- Leaflet'ni yuklab, xaritani qurish ---
    mapBadge('⏳ ' + L('Xarita yuklanmoqda...', 'Загрузка карты...'));
    mapEnsureLib().then(function(){
      if (mapRt !== rt) return; // foydalanuvchi boshqa sahifaga o'tib ketgan
      var LF = window.L;
      var map = LF.map(root.querySelector('#mapxCanvas'), { zoomControl: false, attributionControl: true, tap: true });
      map.attributionControl.setPrefix(false);
      LF.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(map);
      map.setView([MAP_DEFAULT.lat, MAP_DEFAULT.lon], MAP_DEFAULT.zoom);
      rt.map = map;
      rt.group = LF.markerClusterGroup ? LF.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true,
        iconCreateFunction: function(cl){
          return LF.divIcon({ html: '<div><span>' + cl.getChildCount() + '</span></div>', className: 'mapx-cluster', iconSize: LF.point(40, 40) });
        }
      }) : LF.layerGroup();
      rt.group.addTo(map);
      map.on('click', function(){ mapCloseCard(); });
      map.on('moveend', function(){
        if (Date.now() < rt.progUntil || !rt.lastCenter) return;
        var c = map.getCenter();
        if (mapKm(rt.lastCenter, { lat: c.lat, lon: c.lng }) > 2) rt.hereBtn.hidden = false;
      });
      fit();
      mapBadge('');
      mapFetch({ refit: false });
      mapLocate(true);
    }).catch(function(){
      if (mapRt !== rt) return;
      mapBadge('');
      mapMsg(L('Xaritani yuklab bo\'lmadi. Internetni tekshirib, qayta urinib ko\'ring.', 'Не удалось загрузить карту. Проверьте интернет и повторите попытку.'));
    });
  }

  // ---------- Master render dispatcher ----------
  // ================= MARKET =================
  // Market bo'limi: Ehtiyot qismlar (faol), Eski texnika va B/U texnika (tez orada).
  // Ma'lumotlar jonli API'dan (/api/public/market/*) olinadi — admin_panel.py orqali kiritiladi.
  state.mk = { overview:null, ovAt:0, parts:{}, partsAt:{}, q:{}, holat:{}, stock:{}, scroll:{} };
  var MK_TTL = 60000;
  var MK_CART_KEY = 'cynet_mk_cart', MK_PROFILE_KEY = 'cynet_mk_profile', MK_PENDING_KEY = 'cynet_mk_pending';
  function mkStoreGet(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }
  function mkStoreSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  state.mk.cart = (mkStoreGet(MK_CART_KEY) || []).filter(function(x){ return x && x.id > 0 && x.qty > 0 && x.narx > 0; });
  state.mk.form = null; state.mk.pay = null; state.mk.payTimer = null; state.mk.orders = null; state.mk.ordTimer = null;
  var mkBusy = false;

  function mkGlyph(name){
    var h = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
    if (name === 'gear') {
      for (var i = 0; i < 8; i++) h += '<rect x="21" y="3.5" width="6" height="9" rx="1.6" transform="rotate(' + (i*45) + ' 24 24)"/>';
      h += '<circle cx="24" cy="24" r="12.5"/><circle cx="24" cy="24" r="4.5"/>';
    } else if (name === 'chip') {
      h += '<rect x="12" y="12" width="24" height="24" rx="4"/><rect x="19" y="19" width="10" height="10" rx="2"/>' +
        '<path d="M18 5v7M24 5v7M30 5v7M18 36v7M24 36v7M30 36v7M5 18h7M5 24h7M5 30h7M36 18h7M36 24h7M36 30h7"/>';
    } else if (name === 'cap') {
      h += '<rect x="14" y="8" width="20" height="28" rx="5"/><path d="M14 17h20M20 36v8M28 36v8"/>';
    } else if (name === 'fan') {
      h += '<circle cx="24" cy="24" r="3"/><circle cx="24" cy="24" r="20"/>';
      for (var k = 0; k < 3; k++) h += '<path d="M24 21c-1.5-7 1-12 7-13 3 5 .5 11-5.5 13.5" transform="rotate(' + (k*120) + ' 24 24)"/>';
    } else if (name === 'bolt') {
      h += '<path d="M27 4 12 27h11l-3 17 16-24H25z"/>';
    } else if (name === 'board') {
      h += '<rect x="6" y="10" width="36" height="28" rx="4"/><circle cx="14" cy="18" r="2"/><path d="M18 18h13l4 4v7M14 30h10l4 4"/>';
    } else if (name === 'res') {
      h += '<path d="M3 24h9l3-8 6 16 6-16 6 16 3-8h9"/>';
    } else {
      h += '<circle cx="22" cy="24" r="13"/><circle cx="22" cy="24" r="4"/><path d="M35 24h9M22 11V6M22 42v-4"/>';
    }
    return h + '</svg>';
  }

  function mkFmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function mkPriceHTML(p, cls){
    if (p.narx > 0) return '<span class="' + cls + '">' + mkFmt(p.narx) + ' <small style="font-size:.6em;font-weight:700;opacity:.8">' + L("so'm","сум") + '</small></span>';
    return '<span class="' + cls + ' neg">' + L('Narx kelishiladi','Цена договорная') + '</span>';
  }
  function mkHolat(h){
    return h === 'bu' ? 'B/U' : (h === 'demontaj' ? L('Demontaj','Демонтаж') : L('Yangi','Новое'));
  }
  function mkPhotoUrl(p){ return API_BASE + '/api/public/market/photo?id=' + p.id + '&v=' + (p.rasm_v || 0); }

  function mkToast(msg){
    var old = document.querySelector('.mk-toast'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'mk-toast'; el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('in'); }); });
    setTimeout(function(){ el.classList.remove('in'); setTimeout(function(){ el.remove(); }, 350); }, 2000);
  }

  function mkCountUp(el, to){
    if (!el) return;
    if (!to) { el.textContent = '0'; return; }
    var t0 = null, dur = 900;
    function step(ts){
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * e));
      if (p < 1 && document.body.contains(el)) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- fon (aurora + suzuvchi detallar) ----------
  function mkBuildBg(){
    if (document.getElementById('mkBg')) return;
    var d = document.createElement('div'); d.id = 'mkBg';
    var names = ['gear','chip','cap','fan','bolt','board','res','motor'];
    var h = '<div class="au a1"></div><div class="au a2"></div><div class="au a3"></div>';
    for (var i = 0; i < 12; i++) {
      var sz = 22 + Math.round(Math.random() * 26);
      h += '<div class="pt' + (i % 3 === 0 ? ' gd' : '') + '" style="left:' + (Math.random()*96).toFixed(1) + '%;width:' + sz + 'px;height:' + sz + 'px;' +
        'animation-duration:' + (22 + Math.random()*26).toFixed(1) + 's;animation-delay:-' + (Math.random()*30).toFixed(1) + 's;' +
        '--dx:' + Math.round(-60 + Math.random()*120) + 'px;--rot:' + Math.round(-300 + Math.random()*600) + 'deg">' + mkGlyph(names[i % names.length]) + '</div>';
    }
    d.innerHTML = h;
    document.body.insertBefore(d, document.body.firstChild);
  }
  mkBuildBg();

  // ---------- kirish animatsiyasi (portal) ----------
  function mkLogoSVG(){
    var teeth = '';
    for (var i = 0; i < 10; i++) teeth += '<rect x="56" y="12" width="8" height="12" rx="2" transform="rotate(' + (i*36) + ' 60 60)"/>';
    return '<svg class="logo" viewBox="0 0 120 120" fill="none" stroke="#19e6a0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      '<g class="gearwrap">' + teeth + '<circle class="dr" style="--len:290" cx="60" cy="60" r="36"/></g>' +
      '<path class="dr d2" style="--len:140;stroke:#ffc83d" d="M44 54h32l-3 24H47z"/>' +
      '<path class="dr d2" style="--len:60;stroke:#ffc83d" d="M52 54v-5a8 8 0 0 1 16 0v5"/></svg>';
  }

  function mkOpenPortal(srcEl){
    if (mkBusy) return;
    mkBusy = true;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { push({ view:'market' }); mkBusy = false; return; }
    var r = srcEl ? srcEl.getBoundingClientRect() : { left: innerWidth/2, top: innerHeight/2, width: 0, height: 0 };
    var o = document.createElement('div'); o.id = 'mkPortal';
    o.style.setProperty('--px', Math.round(r.left + r.width/2) + 'px');
    o.style.setProperty('--py', Math.round(r.top + r.height/2) + 'px');
    var word = 'MARKET'.split('').map(function(ch, k){ return '<i style="--k:' + k + '">' + ch + '</i>'; }).join('');
    o.innerHTML = '<span class="ring"></span><span class="ring r2"></span>' + mkLogoSVG() +
      '<div class="word">' + word + '</div><div class="tag">' + L('EHTIYOT QISMLAR · ESKI · B/U','ЗАПЧАСТИ · СТАРАЯ · Б/У') + '</div><div class="bar"><b></b></div>';
    document.body.appendChild(o);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ o.classList.add('in'); }); });
    setTimeout(function(){ push({ view:'market' }); }, 720);
    setTimeout(function(){ o.classList.add('out'); }, 1750);
    setTimeout(function(){ o.remove(); mkBusy = false; }, 2300);
  }


  // ---------- har bir bo'lim uchun alohida kirish animatsiyasi (pz) ----------
  function pzConfetti(){
    var cs = ['#ffd24a','#ff6a2b','#fff','#ff4d8d','#4fd8f0'], h = '';
    for (var i = 0; i < 18; i++) {
      var an = Math.random()*Math.PI*2, d = 90 + Math.random()*150;
      h += '<s style="--dx:' + Math.round(Math.cos(an)*d) + 'px;--dy:' + Math.round(Math.sin(an)*d - 40) + 'px;--rt:' + Math.round(-540 + Math.random()*1080) + 'deg;--c:' + cs[i % cs.length] + '"></s>';
    }
    return h;
  }
  var PZ = {
    tech:{ a:'#ffb02e', b:'#ff6a2b', p1:'#7a3a06', p2:'#2a1204', ln:'pz-lu', r0:'inset(0 0 100% 0)', r1:'inset(0 0 0 0)',
      uz:'TEXNIKA', ru:'ТЕХНИКА', tu:'DIAGNOSTIKA · 137+ HOLAT', tr:'ДИАГНОСТИКА · 137+ СЛУЧАЕВ', fx:'',
      svg:'<rect class="dr" pathLength="1" x="16" y="24" width="88" height="58" rx="9"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M26 54h15l7-17 12 34 8-22 5 5h21"/><path class="dr" pathLength="1" d="M46 98h28M60 82v16"/>' },
    find:{ a:'#3be1ff', b:'#9dff6a', p1:'#0b4a66', p2:'#04101f', ln:'pz-lb',
      uz:'QIDIRUV', ru:'ПОИСК', tu:'USTAXONA TOPISH', tr:'ПОИСК МАСТЕРСКОЙ',
      fx:'<b style="left:28%;top:30%;--d:.5s"></b><b style="left:70%;top:58%;--d:.9s"></b><b style="left:40%;top:72%;--d:1.2s"></b>',
      svg:'<circle class="dr" pathLength="1" cx="52" cy="52" r="30"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M75 75l26 26"/><path class="dr d2" pathLength="1" d="M38 52h8l5-10 7 20 5-10h5"/>' },
    map:{ a:'#27e0c0', b:'#ffd24a', p1:'#0b6a62', p2:'#031614', ln:'pz-lf', r0:'inset(0 50% 0 50%)', r1:'inset(0 0 0 0)',
      uz:'XARITA', ru:'КАРТА', tu:'YAQIN ATROFDAGI USTALAR', tr:'МАСТЕРА РЯДОМ', fx:'',
      svg:'<path class="dr" pathLength="1" d="M14 34l30-12 32 12 30-12v64l-30 12-32-12-30 12z"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M44 22v64M76 34v64"/><ellipse class="rip" cx="60" cy="66" rx="8" ry="3"/><g class="pin"><path d="M60 64c-9-11-14-18-14-25a14 14 0 0 1 28 0c0 7-5 14-14 25z" fill="var(--b)" stroke="none"/><circle cx="60" cy="39" r="5" fill="#fff" stroke="none"/></g>' },
    order:{ a:'#ff5fa8', b:'#ffe14a', p1:'#7a1646', p2:'#240614', ln:'pz-ld', r0:'inset(100% 0 0 0)', r1:'inset(0 0 0 0)',
      uz:'BUYURTMA', ru:'ЗАКАЗ', tu:'USTA CHAQIRISH', tr:'ВЫЗВАТЬ МАСТЕРА', fx:'',
      svg:'<rect class="dr" pathLength="1" x="26" y="18" width="68" height="88" rx="9"/><path class="dr d2" pathLength="1" d="M48 18v-5h24v5M40 48h40M40 64h40M40 80h22"/><g class="stamp"><circle cx="86" cy="88" r="19" fill="rgba(0,0,0,.4)" stroke="var(--b)"/><path d="M77 88l7 8 12-15" stroke="var(--b)"/></g>' },
    prof:{ a:'#4fb4ff', b:'#b6f2ff', p1:'#12427a', p2:'#050f24', ln:'pz-lb', r0:'inset(50% 50% 50% 50% round 50%)', r1:'inset(0% 0% 0% 0% round 0%)',
      uz:'PROFIL', ru:'ПРОФИЛЬ', tu:'SHAXSIY KABINET', tr:'ЛИЧНЫЙ КАБИНЕТ', fx:'',
      svg:'<circle class="dr" pathLength="1" cx="60" cy="42" r="20"/><path class="dr d2" pathLength="1" d="M20 104c0-22 18-34 40-34s40 12 40 34"/>' },
    anketa:{ a:'#9be83a', b:'#fff27a', p1:'#3d6a0c', p2:'#0d1a04', ln:'pz-lu', r0:'polygon(0 0,0 0,-30% 100%,-30% 100%)', r1:'polygon(0 0,130% 0,100% 100%,-30% 100%)',
      uz:'USTA', ru:'МАСТЕР', tu:"USTA BO'LING · ANKETA", tr:'СТАНЬ МАСТЕРОМ · АНКЕТА', fx:'',
      svg:'<circle class="dr" pathLength="1" cx="60" cy="44" r="26"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M60 29l4.6 9.6 10.4 1.4-7.6 7.3 1.9 10.4-9.3-5-9.3 5 1.9-10.4-7.6-7.3 10.4-1.4z"/><path class="dr d2" pathLength="1" d="M44 66l-8 30 24-11 24 11-8-30"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M20 110c10-8 14 4 22-4s10 6 20-2 14 4 38-4"/>' },
    about:{ a:'#ffb52e', b:'#ffe9a6', p1:'#8a2a08', p2:'#2a0b04', ln:'pz-ld',
      uz:'BIZ', ru:'МЫ', tu:'BIZ HAQIMIZDA', tr:'О НАС', fx:'',
      svg:'<path class="dr" pathLength="1" d="M36 22h48v26a24 24 0 0 1-48 0z"/><path class="dr d2" pathLength="1" d="M36 30H20c0 14 6 22 18 24M84 30h16c0 14-6 22-18 24"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M60 72v16M42 100h36M48 88h24"/><path class="spark" d="M60 28l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z"/>' },
    call:{ a:'#b98bff', b:'#6ff0c4', p1:'#43207f', p2:'#0d0620', ln:'pz-lf',
      uz:'ALOQA', ru:'СВЯЗЬ', tu:'+998 99 009 90 37', tr:'+998 99 009 90 37',
      fx:'<i style="--d:.5s"></i><i style="--d:.9s"></i><i style="--d:1.3s"></i>',
      svg:'<path class="dr" pathLength="1" d="M30 26c-8 6-8 18 2 36s24 32 40 40c10 4 20 0 24-10l-14-12-10 6c-8-4-16-12-20-20l6-10-12-14z"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M66 24a30 30 0 0 1 30 30M66 40a14 14 0 0 1 14 14"/>' }
  };
  PZ.about.fx = pzConfetti();

  function pzOpen(key, srcEl, go){
    var c = PZ[key];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!c || reduce) { go(); return; }
    if (mkBusy) return;
    mkBusy = true;
    var r = srcEl ? srcEl.getBoundingClientRect() : { left: innerWidth/2, top: innerHeight/2, width: 0, height: 0 };
    var o = document.createElement('div'); o.className = 'pz pz-' + key;
    o.style.cssText = '--a:' + c.a + ';--b:' + c.b + ';--p1:' + c.p1 + ';--p2:' + c.p2 + ';--ln:' + c.ln +
      ';--px:' + Math.round(r.left + r.width/2) + 'px;--py:' + Math.round(r.top + r.height/2) + 'px' +
      (c.r0 ? ';--r0:' + c.r0 + ';--r1:' + c.r1 : '');
    var word = L(c.uz, c.ru).split('').map(function(ch, k){ return '<i style="--k:' + k + '">' + ch + '</i>'; }).join('');
    o.innerHTML = '<div class="fx">' + c.fx + '</div><svg class="logo" viewBox="0 0 120 120">' + c.svg + '</svg>' +
      '<div class="word">' + word + '</div><div class="tag">' + L(c.tu, c.tr) + '</div><div class="bar"><b></b></div>';
    document.body.appendChild(o);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ o.classList.add('in'); }); });
    setTimeout(go, 720);
    setTimeout(function(){ o.classList.add('out'); }, 1850);
    setTimeout(function(){ o.remove(); mkBusy = false; }, 2400);
  }

  // ---------- ma'lumot yuklash ----------
  function mkLoadOverview(cb){
    var m = state.mk;
    if (m.overview && (Date.now() - m.ovAt) < MK_TTL) { cb(m.overview); return; }
    if (!API_BASE) { cb(m.overview); return; }
    apiGet('/api/public/market/overview').then(function(d){
      if (d && d.ok) { m.overview = d; m.ovAt = Date.now(); }
      cb(m.overview);
    }).catch(function(){ cb(m.overview); });
  }
  function mkLoadParts(cat, cb){
    var m = state.mk;
    var fresh = m.parts[cat] && (Date.now() - (m.partsAt[cat] || 0)) < MK_TTL;
    if (fresh) { cb(m.parts[cat], null); return; }
    if (!API_BASE) { cb(null, 'NO_API'); return; }
    apiGet('/api/public/market/parts?cat=' + encodeURIComponent(cat)).then(function(d){
      if (d && d.ok) { m.parts[cat] = d.items || []; m.partsAt[cat] = Date.now(); cb(m.parts[cat], null); }
      else cb(m.parts[cat] || null, 'ERR');
    }).catch(function(){ cb(m.parts[cat] || null, 'ERR'); });
  }
  function mkCountFor(cat){
    var ov = state.mk.overview; return ov && ov.counts && ov.counts[cat] ? ov.counts[cat] : 0;
  }

  // ---------- Market bosh sahifa ----------
  function renderMarket(){
    var names = ['gear','chip','cap','fan','bolt','board','res','motor'], belt = '';
    for (var rep = 0; rep < 2; rep++) names.forEach(function(n){ belt += '<div class="gl">' + mkGlyph(n) + '</div>'; });
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-hero"><span class="mk-kicker">ONLINE USTAXONA · MARKET</span><h1>Market</h1>' +
        '<p>' + L("Texnika turini tanlang, model yoki qism raqami bo'yicha ehtiyot qismni toping.","Выберите тип техники и найдите запчасть по модели или номеру детали.") + '</p></div>' +
        '<div class="mk-belt"><div class="mk-belt-track">' + belt + '</div></div>' +
        '<button class="mk-main" id="mkOpenParts">' +
          '<span class="gear g1">' + mkGlyph('gear') + '</span><span class="gear g2">' + mkGlyph('gear') + '</span>' +
          '<span class="lvl">' + L('FAOL','АКТИВНО') + '</span>' +
          '<span class="ttl">' + L('Ehtiyot qismlar','Запчасти') + '</span>' +
          '<span class="sub">' + L("Televizor, konditsioner, xolodilnik va boshqa texnikalar uchun","Для телевизоров, кондиционеров, холодильников и другой техники") + '</span>' +
          '<span class="meta"><span><b id="mkTotal">0</b> ' + L('ta qism','дет.') + '</span><span><b id="mkCatN">0</b> ' + L('texnika turi','типов техники') + '</span></span>' +
          '<span class="go">→</span>' +
        '</button>' +
        '<div id="mkHomeOrders"></div>' +
        '<div class="mk-soon-row">' +
          '<button class="mk-soon" data-soon="1" style="--i:0"><span class="ico">🧰</span><span class="chip">' + L('TEZ ORADA','СКОРО') + '</span><b>' + L('Eski texnika','Старая техника') + '</b><span class="d">' + L("Ehtiyot qism uchun texnika","Техника на запчасти") + '</span></button>' +
          '<button class="mk-soon" data-soon="2" style="--i:1"><span class="ico">♻️</span><span class="chip">' + L('TEZ ORADA','СКОРО') + '</span><b>' + L('B/U texnika','Б/У техника') + '</b><span class="d">' + L("Ishlatilgan texnikalar","Бывшая в употреблении") + '</span></button>' +
        '</div>' +
      '</div>';
    document.getElementById('mkOpenParts').addEventListener('click', function(){ haptic('select'); push({ view:'marketCats' }); });
    mkRenderHomeOrders();
    mainView.querySelectorAll('[data-soon]').forEach(function(b){
      b.addEventListener('click', function(){ haptic('tap'); mkToast(L("Tez orada ochiladi 🚀","Скоро откроется 🚀")); });
    });
    mkLoadOverview(function(ov){
      if (!ov || state.stack[state.stack.length-1].view !== 'market') return;
      var total = 0, n = 0;
      Object.keys(ov.counts || {}).forEach(function(k){ total += ov.counts[k]; if (ov.counts[k] > 0) n++; });
      setTimeout(function(){ mkCountUp(document.getElementById('mkTotal'), total); mkCountUp(document.getElementById('mkCatN'), n); }, 900);
    });
  }

  // ---------- Texnika turlari ----------
  function renderMarketCats(){
    mainView.innerHTML = '<div class="view mk-view"><div class="mk-title">' + L('Ehtiyot qismlar','Запчасти') + '</div>' +
      '<div class="mk-sub">' + L("Qaysi texnika uchun ehtiyot qism kerak?","Для какой техники нужна запчасть?") + '</div><div class="mk-grid" id="mkGrid"></div></div>';
    function draw(){
      var order = CATS.map(function(c, i){ return { c:c, n:mkCountFor(c.id), i:i }; });
      order.sort(function(a, b){ return (b.n > 0) - (a.n > 0) || a.i - b.i; });
      var grid = document.getElementById('mkGrid'); if (!grid) return;
      grid.innerHTML = order.map(function(o, i){
        return '<button class="mk-cat ' + palOf(o.c.id) + (o.n ? '' : ' zero') + '" data-cat="' + o.c.id + '" style="--i:' + i + '">' +
          '<span class="emo">' + o.c.icon + '</span><span class="nm">' + esc(pick(o.c,'name')) + '</span>' +
          '<span class="ct">' + (o.n ? o.n + ' ' + L('ta qism','дет.') : L('Tez orada','Скоро')) + '</span></button>';
      }).join('');
      grid.querySelectorAll('[data-cat]').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); push({ view:'marketParts', cat:b.getAttribute('data-cat') }); });
      });
    }
    draw();
    var before = JSON.stringify(state.mk.overview && state.mk.overview.counts);
    mkLoadOverview(function(ov){
      if (state.stack[state.stack.length-1].view !== 'marketCats') return;
      if (JSON.stringify(ov && ov.counts) !== before) {
        // raqamlar kelganda kartochkalarni qayta chizamiz (animatsiyasiz miltillamasligi uchun)
        draw();
        mainView.querySelectorAll('.mk-cat').forEach(function(el){ el.style.animation = 'none'; el.style.opacity = '1'; });
      }
    });
  }

  // ---------- Ehtiyot qismlar ro'yxati (yuqorida qidiruv) ----------
  function mkNorm(s){ return String(s || '').toLowerCase().replace(/[ʻʼ’‘`´']/g, ''); }
  function mkCompact(s){ return mkNorm(s).replace(/[\s\-_\/.,()]+/g, ''); }
  function mkHay(p){
    if (p._hay === undefined) {
      var parts = [p.nomi, p.nomi_ru, p.brend, p.model, p.part_no, p.mos_modellar, p.tavsif];
      (p.chars || []).forEach(function(kv){ parts.push(kv[0], kv[1]); });
      var raw = parts.join(' ');
      p._hay = mkNorm(raw); p._hayc = mkCompact(raw);
    }
    return p;
  }
  function mkMatch(p, tokens){
    mkHay(p);
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (p._hay.indexOf(tk) < 0) { var c = mkCompact(tk); if (!c || p._hayc.indexOf(c) < 0) return false; }
    }
    return true;
  }
  function mkReEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function mkHi(text, re){
    text = String(text || '');
    if (!re) return esc(text);
    return esc(text.replace(re, function(m){ return '\u0001' + m + '\u0002'; })).replace(/\u0001/g, '<mark class="mk-m">').replace(/\u0002/g, '</mark>');
  }

  function renderMarketParts(entry){
    var cat = entry.cat, c = catById(cat);
    if (!c) { state.stack.pop(); render(); return; }
    var m = state.mk;
    var q0 = m.q[cat] || '';
    var chips = [['all', L('Barchasi','Все')], ['yangi', L('Yangi','Новые')], ['bu', 'B/U'], ['demontaj', L('Demontaj','Демонтаж')], ['stock', L('Mavjud','В наличии')]];
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-sticky"><div class="mk-search">' +
          '<span class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg></span>' +
          '<input id="mkQ" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(L("Nomi, model yoki qism raqami...","Название, модель или номер детали...")) + '">' +
          '<button class="mk-clear" id="mkClear" aria-label="clear">✕</button></div>' +
          '<div class="mk-chips" id="mkChips">' + chips.map(function(ch){ return '<button class="mk-chip" data-h="' + ch[0] + '">' + ch[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="mk-head"><div class="tt"><span>' + c.icon + '</span>' + esc(pick(c,'name')) + '</div><div class="cn" id="mkCnt"></div></div>' +
        '<div class="mk-list fx" id="mkList"><div class="mk-skel"></div><div class="mk-skel"></div><div class="mk-skel"></div></div>' +
      '</div>';

    var input = document.getElementById('mkQ'), clearBtn = document.getElementById('mkClear');
    var listEl = document.getElementById('mkList'), cntEl = document.getElementById('mkCnt');
    input.value = q0;
    var firstPaint = true, loadError = null;

    function setChips(){
      var cur = m.stock[cat] ? 'stock' : (m.holat[cat] || 'all');
      mainView.querySelectorAll('.mk-chip').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-h') === cur); });
      clearBtn.classList.toggle('show', !!input.value);
    }

    function paint(){
      var items = m.parts[cat];
      if (!items) {
        if (loadError) {
          listEl.innerHTML = '<div class="mk-empty"><span class="big">📡</span><b>' + L("Ulanib bo'lmadi","Не удалось подключиться") + '</b>' + L("Internetni tekshirib, qayta urinib ko'ring.","Проверьте интернет и повторите.") + '<br><span class="act" id="mkRetry">' + L('Qayta urinish','Повторить') + '</span></div>';
          var rb = document.getElementById('mkRetry'); if (rb) rb.addEventListener('click', function(){ loadError = null; load(true); });
        }
        return;
      }
      var tokens = mkNorm(input.value).split(/\s+/).filter(Boolean);
      var hol = m.holat[cat] || 'all', st = !!m.stock[cat];
      var res = items.filter(function(p){
        if (hol !== 'all' && p.holat !== hol) return false;
        if (st && !(p.qoldiq > 0)) return false;
        return tokens.length ? mkMatch(p, tokens) : true;
      });
      var re = tokens.length ? new RegExp('(' + tokens.map(mkReEsc).join('|') + ')', 'gi') : null;

      var label = res.length + ' ' + (tokens.length || hol !== 'all' || st ? L('ta natija','рез.') : L('ta qism','дет.'));
      if (cntEl.textContent !== label) { cntEl.textContent = label; cntEl.classList.remove('pop'); void cntEl.offsetWidth; cntEl.classList.add('pop'); }

      if (!items.length) {
        listEl.innerHTML = '<div class="mk-empty"><span class="big">📦</span><b>' + L("Hozircha ehtiyot qism yo'q","Пока нет запчастей") + '</b>' +
          L("Bu texnika uchun qismlar tez orada qo'shiladi.","Запчасти для этой техники скоро появятся.") + '<br><span class="act" id="mkBackCats">' + L('Boshqa texnika','Другая техника') + '</span></div>';
        var bc = document.getElementById('mkBackCats'); if (bc) bc.addEventListener('click', function(){ pop(); });
        return;
      }
      if (!res.length) {
        listEl.innerHTML = '<div class="mk-empty"><span class="big">🔍</span><b>' + t().notFound + '</b>' +
          L("Model yoki qism raqamining bir qismini yozib ko'ring.","Попробуйте часть модели или номера детали.") + '<br><span class="act" id="mkReset">' + L('Tozalash','Сбросить') + '</span></div>';
        var rs = document.getElementById('mkReset');
        if (rs) rs.addEventListener('click', function(){ input.value = ''; m.q[cat] = ''; m.holat[cat] = 'all'; m.stock[cat] = false; setChips(); paint(); });
        return;
      }
      listEl.className = 'mk-list' + (firstPaint ? ' fx' : '');
      listEl.innerHTML = res.map(function(p, i){
        var chars = (p.chars || []).slice(0, 3).map(function(kv){ return '<span>' + mkHi(kv[0] + ': ' + kv[1], re) + '</span>'; }).join('');
        var sub = [p.brend, p.model].filter(Boolean).join(' · ');
        return '<button class="mk-card ' + palOf(cat) + (p.qoldiq > 0 ? '' : ' out') + (mkBuyable(p) ? ' buy' : '') + '" data-id="' + p.id + '" style="--i:' + Math.min(i, 12) + '">' +
          '<span class="mk-thumb"><span>' + c.icon + '</span>' +
            (p.photo ? '<img loading="lazy" alt="" src="' + mkPhotoUrl(p) + '">' : '') +
            '<span class="mk-hl hl-' + p.holat + '">' + mkHolat(p.holat) + '</span></span>' +
          '<span class="mk-info">' +
            (mkBuyable(p) ? mkAddBtnHTML(p.id) : '') +
            '<span class="mk-name">' + mkHi(pick(p,'nomi'), re) + '</span>' +
            (sub ? '<span class="mk-meta">' + mkHi(sub, re) + '</span>' : '') +
            (p.part_no ? '<span class="mk-pn"># ' + mkHi(p.part_no, re) + '</span>' : '') +
            (chars ? '<span class="mk-chars">' + chars + '</span>' : '') +
            '<span class="mk-foot">' + mkPriceHTML(p, 'mk-price') +
              '<span class="mk-stock' + (p.qoldiq > 0 ? '' : ' no') + '">' + (p.qoldiq > 0 ? L('Mavjud','В наличии') : L('Tugagan','Нет')) + '</span></span>' +
          '</span></button>';
      }).join('');
      listEl.querySelectorAll('img').forEach(function(im){
        im.addEventListener('load', function(){ im.classList.add('ok'); });
        im.addEventListener('error', function(){ im.remove(); });
        if (im.complete && im.naturalWidth) im.classList.add('ok');
      });
      listEl.querySelectorAll('[data-id]').forEach(function(b){
        b.addEventListener('click', function(e){
          var pid = parseInt(b.getAttribute('data-id'), 10);
          var addEl = e.target && e.target.closest ? e.target.closest('.mk-add') : null;
          if (addEl) {
            e.preventDefault(); e.stopPropagation();
            var part = items.find(function(x){ return x.id === pid; });
            if (part && mkCartAdd(part, cat)) { haptic('ok'); mkToast(L("Savatchaga qo'shildi ✓","Добавлено в корзину ✓")); }
            mkRefreshAddBtns(listEl);
            return;
          }
          haptic('select'); m.scroll[cat] = window.scrollY;
          push({ view:'marketPart', cat:cat, id:pid });
        });
      });
      mkRefreshAddBtns(listEl);
      firstPaint = false;
    }

    function load(force){
      if (force) m.partsAt[cat] = 0;
      mkLoadParts(cat, function(items, err){
        if (state.stack[state.stack.length-1].view !== 'marketParts' || state.stack[state.stack.length-1].cat !== cat) return;
        loadError = err && !items ? err : null;
        paint();
        if (m.scroll[cat] && items) { var y = m.scroll[cat]; m.scroll[cat] = 0; setTimeout(function(){ window.scrollTo(0, y); }, 30); }
      });
    }

    input.addEventListener('input', function(){ m.q[cat] = input.value; setChips(); paint(); });
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') input.blur(); });
    clearBtn.addEventListener('click', function(){ haptic('tap'); input.value = ''; m.q[cat] = ''; setChips(); paint(); input.focus(); });
    mainView.querySelectorAll('.mk-chip').forEach(function(b){
      b.addEventListener('click', function(){
        haptic('select');
        var h = b.getAttribute('data-h');
        if (h === 'stock') { m.stock[cat] = !m.stock[cat]; if (m.stock[cat]) m.holat[cat] = 'all'; }
        else { m.holat[cat] = h; m.stock[cat] = false; }
        setChips(); paint();
      });
    });
    setChips();
    if (m.parts[cat]) paint();
    load(false);
  }

  // ---------- Qism sahifasi ----------
  function mkOpenLightbox(src){
    var lb = document.createElement('div'); lb.id = 'mkLightbox';
    lb.innerHTML = '<img alt="" src="' + src + '">';
    lb.addEventListener('click', function(){ lb.classList.remove('in'); setTimeout(function(){ lb.remove(); }, 260); });
    document.body.appendChild(lb);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ lb.classList.add('in'); }); });
  }

  function renderMarketPart(entry){
    var cat = entry.cat, c = catById(cat), m = state.mk;
    var list = m.parts[cat] || [];
    var p = list.find(function(x){ return x.id === entry.id; });
    if (!p) {
      mainView.innerHTML = '<div class="view mk-view"><div class="mk-skel" style="height:260px"></div></div>';
      mkLoadParts(cat, function(items){
        var top = state.stack[state.stack.length-1];
        if (top.view !== 'marketPart' || top.id !== entry.id) return;
        if (items && items.find(function(x){ return x.id === entry.id; })) renderMarketPart(entry);
        else mainView.innerHTML = '<div class="view mk-view"><div class="mk-empty"><span class="big">🤷</span><b>' + L("Qism topilmadi","Деталь не найдена") + '</b>' + L("U sotuvdan olingan bo'lishi mumkin.","Возможно, она снята с продажи.") + '</div></div>';
      });
      return;
    }
    var chars = p.chars || [];
    var mos = String(p.mos_modellar || '').split(/[,;\n]+/).map(function(s){ return s.trim(); }).filter(Boolean);
    var sub = [p.brend, p.model].filter(Boolean).join(' · ');
    var desc = pick(p, 'tavsif');
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-img ' + palOf(cat) + '" id="mkImg"><span class="emo">' + c.icon + '</span>' +
          (p.photo ? '<img alt="" src="' + mkPhotoUrl(p) + '"><span class="zoom">⤢</span>' : '') +
          '<span class="mk-hl hl-' + p.holat + '">' + mkHolat(p.holat) + '</span></div>' +
        '<div class="mk-d-top"><div class="mk-d-title">' + esc(pick(p,'nomi')) + '</div>' + (sub ? '<div class="mk-d-meta">' + esc(sub) + '</div>' : '') + '</div>' +
        '<div class="mk-d-row">' + mkPriceHTML(p, 'mk-d-price') + '<span class="mk-stock' + (p.qoldiq > 0 ? '' : ' no') + '">' +
          (p.qoldiq > 0 ? L('Mavjud','В наличии') + (p.qoldiq > 1 ? ' · ' + p.qoldiq + ' ' + L('dona','шт.') : '') : L('Tugagan','Нет в наличии')) + '</span></div>' +
        (p.part_no ? '<div class="mk-pnbox"><span class="k">' + L('Qism raqami','Номер детали') + '</span><span class="v">' + esc(p.part_no) + '</span><button id="mkCopy">' + L('Nusxa','Копия') + '</button></div>' : '') +
        (chars.length ? '<div class="mk-sec"><h3>' + L('Xarakteristikalari','Характеристики') + '</h3><div class="mk-box">' +
          chars.map(function(kv, i){ return '<div class="mk-tr" style="--i:' + Math.min(i, 14) + '"><span class="k">' + esc(kv[0]) + '</span><span class="v">' + esc(kv[1]) + '</span></div>'; }).join('') + '</div></div>' : '') +
        (mos.length ? '<div class="mk-sec"><h3>' + L('Mos modellar','Совместимые модели') + '</h3><div class="mk-tags">' + mos.map(function(s){ return '<span>' + esc(s) + '</span>'; }).join('') + '</div></div>' : '') +
        (desc ? '<div class="mk-sec"><h3>' + L('Tavsif','Описание') + '</h3><div class="mk-box"><div class="mk-desc">' + esc(desc) + '</div></div></div>' : '') +
        '<div class="mk-contact" id="mkContact"></div>' +
        '<div class="mk-actions" id="mkActions"></div>' +
      '</div>';

    var img = mainView.querySelector('.mk-img img');
    if (img) {
      img.addEventListener('load', function(){ img.classList.add('ok'); });
      img.addEventListener('error', function(){ img.remove(); var z = mainView.querySelector('.mk-img .zoom'); if (z) z.remove(); });
      if (img.complete && img.naturalWidth) img.classList.add('ok');
      document.getElementById('mkImg').addEventListener('click', function(){ if (img.parentNode) { haptic('tap'); mkOpenLightbox(img.src); } });
    }
    var copyBtn = document.getElementById('mkCopy');
    if (copyBtn) copyBtn.addEventListener('click', function(){
      haptic('ok');
      var done = function(){ mkToast(L('Nusxa olindi ✓','Скопировано ✓')); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p.part_no).then(done, done); else done();
    });

    function drawActions(ov){
      var phone = String((ov && ov.phone) || t().contactPhone).replace(/[^\d+]/g, '');
      var tgUser = String((ov && ov.tg) || 'online_ustaxona').replace(/^@/, '');
      var msg = L("Assalomu alaykum! Ehtiyot qism bo'yicha so'rayman:\n","Здравствуйте! Интересует запчасть:\n") + pick(p,'nomi') +
        (p.brend ? '\n' + L('Brend','Бренд') + ': ' + p.brend : '') + (p.model ? '\n' + L('Model','Модель') + ': ' + p.model : '') +
        (p.part_no ? '\n' + L('Qism raqami','Номер детали') + ': ' + p.part_no : '') +
        '\n' + (p.narx > 0 ? L('Narx','Цена') + ': ' + mkFmt(p.narx) + ' ' + L("so'm","сум") : '');
      var tgUrl = 'https://t.me/' + tgUser + '?text=' + encodeURIComponent(msg);
      var buyable = mkBuyable(p);
      var box = document.getElementById(buyable ? 'mkContact' : 'mkActions'); if (!box) return;
      box.innerHTML = '<a class="mk-btn ghost" href="tel:' + esc(phone) + '">📞 ' + L("Qo'ng'iroq","Позвонить") + '</a>' +
        '<a class="mk-btn ' + (buyable ? 'ghost' : 'pri') + '" id="mkTg" href="' + esc(tgUrl) + '">✈️ ' + L("Telegramda so'rash","Спросить в Telegram") + '</a>';
      document.getElementById('mkTg').addEventListener('click', function(e){
        if (tg && tg.openTelegramLink) { e.preventDefault(); haptic('select'); tg.openTelegramLink(tgUrl); }
      });
    }
    function drawBuy(){
      var box = document.getElementById('mkActions'); if (!box || !mkBuyable(p)) return;
      var inCart = mkCartFind(p.id);
      box.innerHTML = (inCart ? '<button class="mk-btn ghost" id="mkOpenCart">🛒 ' + L('Savatchada','В корзине') + ': ' + inCart.qty + '</button>' : '') +
        '<button class="mk-btn pri" id="mkAddCart">🛒 ' + L("Savatchaga qo'shish","В корзину") + '</button>';
      document.getElementById('mkAddCart').addEventListener('click', function(){
        if (mkCartAdd(p, cat)) { haptic('ok'); mkToast(L("Savatchaga qo'shildi ✓","Добавлено в корзину ✓")); }
        drawBuy();
      });
      var oc = document.getElementById('mkOpenCart');
      if (oc) oc.addEventListener('click', function(){ haptic('select'); push({ view:'marketCart' }); });
    }
    drawBuy();
    drawActions(m.overview);
    if (!m.overview) mkLoadOverview(function(ov){ if (ov) drawActions(ov); });
  }

  // ================= MARKET: SAVATCHA, YETKAZIB BERISH, TO'LOV =================
  // Tanlangan qismlar savatchada (telefon xotirasida) turadi. "To'lov" bosilganda yetkazib berish
  // ma'lumotlari so'raladi (keyingi xaridlar uchun serverda saqlanadi), so'ng Payme/Click orqali to'lanadi.
  // To'lov o'tgach server tanlangan qismlar + yetkazib berish + to'lovni Telegram bot adminiga yuboradi.
  function mkBuyable(p){ return p && p.narx > 0 && p.qoldiq > 0; }
  function mkCartFind(id){ return state.mk.cart.find(function(x){ return x.id === id; }); }
  function mkCartSave(){
    mkStoreSet(MK_CART_KEY, state.mk.cart.map(function(x){
      return { id:x.id, cat:x.cat, nomi:x.nomi, nomi_ru:x.nomi_ru, brend:x.brend, model:x.model, narx:x.narx,
               qoldiq:x.qoldiq, photo:x.photo, rasm_v:x.rasm_v, qty:x.qty };
    }));
  }
  function mkCartCount(){ return state.mk.cart.reduce(function(a, x){ return a + (x.bad ? 0 : x.qty); }, 0); }
  function mkCartTotal(){ return state.mk.cart.reduce(function(a, x){ return a + (x.bad ? 0 : x.narx * x.qty); }, 0); }
  function mkCartAdd(p, cat){
    if (!mkBuyable(p)) return false;
    var it = mkCartFind(p.id), max = Math.min(p.qoldiq, 99);
    if (it) {
      if (it.qty >= max) { mkToast(L('Omborda faqat ' + max + ' dona bor','В наличии только ' + max + ' шт.')); return false; }
      it.qty += 1; it.narx = p.narx; it.qoldiq = p.qoldiq;
    } else {
      state.mk.cart.push({ id:p.id, cat:cat, nomi:p.nomi, nomi_ru:p.nomi_ru, brend:p.brend, model:p.model, narx:p.narx,
        qoldiq:p.qoldiq, photo:!!p.photo, rasm_v:p.rasm_v || 0, qty:1 });
    }
    mkCartSave(); mkUpdateCartBar();
    return true;
  }
  function mkCartSetQty(id, q){
    var it = mkCartFind(id); if (!it) return;
    if (q <= 0) state.mk.cart = state.mk.cart.filter(function(x){ return x.id !== id; });
    else it.qty = Math.min(q, Math.max(1, Math.min(it.qoldiq || 99, 99)));
    mkCartSave(); mkUpdateCartBar();
  }
  function mkAddBtnHTML(id){ return '<span class="mk-add" role="button" data-add="' + id + '">🛒<b></b></span>'; }
  function mkRefreshAddBtns(root){
    root.querySelectorAll('.mk-add').forEach(function(el){
      var it = mkCartFind(parseInt(el.getAttribute('data-add'), 10));
      el.classList.toggle('in', !!it);
      var b = el.querySelector('b'); if (b) b.textContent = it ? '×' + it.qty : '';
    });
  }
  // ---------- yuqori panel: savatcha va buyurtmalar tugmalari ----------
  function mkUpdateTopCart(){
    var c = document.getElementById('topCart'), o = document.getElementById('topOrders');
    if (!c || !o) return;
    var entry = state.stack[state.stack.length - 1] || {}, v = entry.view || '';
    var inMk = /^market/.test(v), n = mkCartCount();
    var hideCart = (v === 'marketCart' || v === 'marketCheckout' || v === 'marketPay');
    c.classList.toggle('show', (inMk || n > 0) && !hideCart);
    o.classList.toggle('show', inMk && v !== 'marketOrders');
    c.classList.toggle('has', n > 0);
    var b = document.getElementById('topCartN'); if (b) b.textContent = n > 0 ? String(n) : '';
    var t = document.getElementById('topCartTot'); if (t) t.textContent = n > 0 ? mkFmt(mkCartTotal()) : '';
  }
  (function(){
    var c = document.getElementById('topCart'), o = document.getElementById('topOrders');
    if (c) c.addEventListener('click', function(){ haptic('select'); push({ view:'marketCart' }); });
    if (o) o.addEventListener('click', function(){ haptic('select'); push({ view:'marketOrders' }); });
  })();

  function mkUpdateCartBar(){
    mkUpdateTopCart();
    var entry = state.stack[state.stack.length - 1];
    var show = entry && (entry.view === 'market' || entry.view === 'marketCats' || entry.view === 'marketParts') && mkCartCount() > 0;
    var bar = document.getElementById('mkCartBar');
    if (!show) { if (bar) bar.remove(); document.body.classList.remove('mk-has-cart'); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'mkCartBar'; bar.className = 'mk-cartbar';
      bar.addEventListener('click', function(){ haptic('select'); push({ view:'marketCart' }); });
      document.body.appendChild(bar);
    }
    bar.innerHTML = '<span class="l"><span class="n">' + mkCartCount() + '</span>🛒 ' + L('Savatcha','Корзина') + '</span><span>' + mkFmt(mkCartTotal()) + ' ' + L("so'm","сум") + ' ›</span>';
    document.body.classList.add('mk-has-cart');
  }
  function mkConfirm(msg, cb){
    if (tg && tg.showConfirm) tg.showConfirm(msg, function(ok){ cb(!!ok); });
    else cb(window.confirm(msg));
  }
  function mkOpenExternal(url){
    if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank');
  }

  // savatchadagi narx/qoldiqni serverdagi hozirgi ma'lumot bilan tenglaydi
  function mkSyncCart(done){
    var cats = {};
    state.mk.cart.forEach(function(x){ cats[x.cat] = true; });
    var keys = Object.keys(cats), left = keys.length;
    if (!left) { done(); return; }
    keys.forEach(function(cat){
      mkLoadParts(cat, function(items){
        if (items) {
          state.mk.cart.forEach(function(it){
            if (it.cat !== cat) return;
            var p = items.find(function(x){ return x.id === it.id; });
            if (!p) { it.bad = 'gone'; return; }
            it.nomi = p.nomi; it.nomi_ru = p.nomi_ru; it.narx = p.narx; it.qoldiq = p.qoldiq; it.photo = !!p.photo; it.rasm_v = p.rasm_v || 0;
            it.bad = !mkBuyable(p) ? 'out' : null;
            if (!it.bad && it.qty > p.qoldiq) it.qty = p.qoldiq;
          });
        }
        if (--left === 0) { mkCartSave(); done(); }
      });
    });
  }

  // ---------- Savatcha ----------
  function renderMarketCart(){
    var m = state.mk;
    if (!m.cart.length) {
      mainView.innerHTML = '<div class="view mk-view"><div class="mk-empty"><span class="big">🛒</span><b>' + L("Savatcha bo'sh","Корзина пуста") + '</b>' +
        L("Ehtiyot qismlarni tanlab, savatchaga qo'shing.","Выберите запчасти и добавьте их в корзину.") + '<br><span class="act" id="mkCartBack">' + L('Ehtiyot qismlar','Запчасти') + '</span></div></div>';
      document.getElementById('mkCartBack').addEventListener('click', function(){ pop(); });
      return;
    }
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-head"><div class="tt"><span>🛒</span>' + L('Savatcha','Корзина') + '</div><div class="cn" id="mkCCnt"></div></div>' +
        '<div class="mk-clist" id="mkCList"></div>' +
        '<div id="mkCTotal"></div>' +
        '<div class="mk-actions" id="mkCActions"></div>' +
      '</div>';
    var listEl = document.getElementById('mkCList');

    function paint(){
      if (state.stack[state.stack.length - 1].view !== 'marketCart') return;
      if (!m.cart.length) { renderMarketCart(); return; }
      var hasBad = m.cart.some(function(x){ return x.bad; });
      document.getElementById('mkCCnt').textContent = mkCartCount() + ' ' + L('ta','шт.');
      listEl.innerHTML = m.cart.map(function(it){
        var c = catById(it.cat) || { icon:'⚙️' };
        var sub = [it.brend, it.model].filter(Boolean).join(' · ');
        return '<div class="mk-crow ' + palOf(it.cat) + (it.bad ? ' bad' : '') + '" data-id="' + it.id + '">' +
          '<span class="mk-cthumb"><span>' + c.icon + '</span>' + (it.photo ? '<img alt="" src="' + mkPhotoUrl(it) + '">' : '') + '</span>' +
          '<span class="mk-cinfo">' +
            '<span class="mk-cname">' + esc(pick(it, 'nomi')) + '</span>' +
            (sub ? '<span class="mk-cmeta">' + esc(sub) + '</span>' : '') +
            (it.bad ? '<span class="mk-cbad">' + (it.bad === 'gone' ? L('Sotuvdan olingan','Снято с продажи') : L('Tugagan','Нет в наличии')) + '</span>' : '') +
            '<span class="mk-crow-foot">' +
              (it.bad ? '<button class="mk-cdel" data-act="del" aria-label="del">🗑️</button>' :
                '<span class="mk-qty"><button data-act="dec">−</button><span>' + it.qty + '</span><button data-act="inc">+</button></span>' +
                '<span class="mk-csum">' + mkFmt(it.narx * it.qty) + ' <small style="font-size:.6em;opacity:.8">' + L("so'm","сум") + '</small></span>') +
            '</span>' +
          '</span></div>';
      }).join('');
      listEl.querySelectorAll('img').forEach(function(im){ im.addEventListener('error', function(){ im.remove(); }); });
      listEl.querySelectorAll('[data-act]').forEach(function(b){
        b.addEventListener('click', function(){
          var id = parseInt(b.closest('.mk-crow').getAttribute('data-id'), 10), it = mkCartFind(id), act = b.getAttribute('data-act');
          if (!it) return;
          haptic('tap');
          if (act === 'inc') {
            var max = Math.min(it.qoldiq || 99, 99);
            if (it.qty >= max) { mkToast(L('Omborda faqat ' + max + ' dona bor','В наличии только ' + max + ' шт.')); return; }
            mkCartSetQty(id, it.qty + 1);
          } else if (act === 'dec') mkCartSetQty(id, it.qty - 1);
          else mkCartSetQty(id, 0);
          paint();
        });
      });
      var total = mkCartTotal();
      document.getElementById('mkCTotal').innerHTML =
        '<div class="mk-totalbox"><span class="k">' + L('Jami','Итого') + '</span><span class="v">' + mkFmt(total) + ' ' + L("so'm","сум") + '</span></div>' +
        (hasBad ? '<div class="mk-hint err">' + L("Sotuvda yo'q qismlarni savatchadan olib tashlang.","Удалите из корзины товары, которых нет в наличии.") + '</div>'
                : '<div class="mk-hint">' + L("Narx va qoldiq to'lov paytida yana bir bor tekshiriladi.","Цена и наличие будут проверены ещё раз при оплате.") + '</div>');
      var act = document.getElementById('mkCActions');
      act.innerHTML = '<button class="mk-btn pri" id="mkGoPay"' + (hasBad || total <= 0 ? ' disabled style="opacity:.5"' : '') + '>💳 ' + L("To'lov","Оплатить") + ' · ' + mkFmt(total) + ' ' + L("so'm","сум") + '</button>';
      var go = document.getElementById('mkGoPay');
      if (go && !go.disabled) go.addEventListener('click', function(){ haptic('select'); push({ view:'marketCheckout' }); });
    }
    paint();
    mkSyncCart(paint);
  }

  // ---------- Yetkazib berish ma'lumotlari ----------
  function mkReverseGeocode(lat, lon, cb){
    var called = false, ctrl = window.AbortController ? new AbortController() : null;
    function fin(v){ if (called) return; called = true; clearTimeout(to); cb(v); }
    var to = setTimeout(function(){ if (ctrl) ctrl.abort(); fin(null); }, 6000);
    fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=' + (state.lang === 'ru' ? 'ru' : 'uz,ru') +
      '&lat=' + lat + '&lon=' + lon, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function(r){ return r.json(); })
      .then(function(d){ fin(d && d.display_name ? String(d.display_name) : null); })
      .catch(function(){ fin(null); });
  }

  function renderMarketCheckout(){
    var m = state.mk;
    if (!m.cart.length) { state.stack.pop(); render(); return; }
    if (!m.form) m.form = mkStoreGet(MK_PROFILE_KEY) || {};
    var f = m.form;
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-head"><div class="tt"><span>🚚</span>' + L('Yetkazib berish','Доставка') + '</div><div class="cn">' + mkCartCount() + ' ' + L('ta','шт.') + '</div></div>' +
        '<div class="mk-box" style="padding:14px 16px;margin-bottom:14px"><div class="mk-totalbox" style="margin:0;border:none;background:none;padding:0"><span class="k">' + L("To'lov summasi","Сумма к оплате") + '</span><span class="v">' + mkFmt(mkCartTotal()) + ' ' + L("so'm","сум") + '</span></div></div>' +
        '<div class="form-card mk-form">' +
          '<div class="field"><label>👤 ' + L('Ism','Имя') + '</label><input id="mkfIsm" autocomplete="given-name" value="' + esc(f.ism || '') + '" placeholder="' + esc(L('Ismingiz','Ваше имя')) + '"></div>' +
          '<div class="field"><label>👤 ' + L('Familya','Фамилия') + '</label><input id="mkfFam" autocomplete="family-name" value="' + esc(f.familya || '') + '" placeholder="' + esc(L('Familyangiz','Ваша фамилия')) + '"></div>' +
          '<div class="field"><label>📱 ' + L('Telefon raqam','Номер телефона') + '</label><input id="mkfTel" type="tel" autocomplete="tel" value="' + esc(f.telefon || '') + '" placeholder="+998 90 123 45 67"></div>' +
          '<div class="field"><label>📍 ' + L('Yetkazib berish manzili','Адрес доставки') + '</label><textarea id="mkfAdr" placeholder="' + esc(L("Viloyat, tuman, ko'cha, uy, mo'ljal","Область, район, улица, дом, ориентир")) + '">' + esc(f.manzil || '') + '</textarea></div>' +
        '</div>' +
        '<button class="mk-locbtn' + (f.lat ? ' got' : '') + '" id="mkLocBtn">' + (f.lat ? L('✅ Lokatsiya aniqlandi (qayta aniqlash)','✅ Локация определена (обновить)') : L('📍 Lokatsiyamni aniqlash','📍 Определить мою локацию')) + '</button>' +
        '<div class="mk-hint" id="mkLocHint">' + L("Lokatsiya orqali manzil aniqroq bo'ladi va kuryer sizni tez topadi.","По локации адрес будет точнее, и курьер быстрее вас найдёт.") + '</div>' +
        '<div class="mk-hint">' + L("🔒 Ma'lumotlaringiz keyingi xaridlar uchun saqlab qolinadi.","🔒 Ваши данные сохранятся для следующих покупок.") + '</div>' +
        '<div class="mk-hint err" id="mkFormErr"></div>' +
        '<div class="mk-actions"><button class="mk-btn pri" id="mkSubmit">💳 ' + L("To'lovga o'tish","Перейти к оплате") + '</button></div>' +
      '</div>';

    var $ = function(id){ return document.getElementById(id); };
    function readForm(){
      f.ism = $('mkfIsm').value.trim(); f.familya = $('mkfFam').value.trim();
      f.telefon = $('mkfTel').value.trim(); f.manzil = $('mkfAdr').value.trim();
    }
    ['mkfIsm','mkfFam','mkfTel','mkfAdr'].forEach(function(id){ $(id).addEventListener('input', readForm); });

    // avval saqlangan ma'lumot serverda bo'lsa — bo'sh maydonlarni to'ldiramiz
    if (!m.profileLoaded && getInitData()) {
      m.profileLoaded = true;
      apiGet('/api/public/market/profile?init_data=' + encodeURIComponent(getInitData())).then(function(d){
        var pr = d && d.ok ? d.profile : null;
        if (!pr || state.stack[state.stack.length - 1].view !== 'marketCheckout') return;
        [['ism','mkfIsm'],['familya','mkfFam'],['telefon','mkfTel'],['manzil','mkfAdr']].forEach(function(pair){
          if (!$(pair[1]).value.trim() && pr[pair[0]]) { $(pair[1]).value = pr[pair[0]]; f[pair[0]] = pr[pair[0]]; }
        });
        if (f.lat == null && pr.lat != null) { f.lat = pr.lat; f.lon = pr.lon; $('mkLocBtn').classList.add('got'); $('mkLocBtn').textContent = L('✅ Lokatsiya aniqlandi (qayta aniqlash)','✅ Локация определена (обновить)'); }
      }).catch(function(){});
    }

    $('mkLocBtn').addEventListener('click', function(){
      var btn = $('mkLocBtn'); haptic('select');
      btn.textContent = L('⏳ Aniqlanmoqda...','⏳ Определяем...');
      requestLocation().then(function(loc){
        if (!loc) {
          btn.textContent = L('📍 Lokatsiyamni aniqlash','📍 Определить мою локацию');
          $('mkLocHint').textContent = L("Lokatsiyani aniqlab bo'lmadi. Telefon sozlamalarida Telegram uchun joylashuvga ruxsat bering va qayta urinib ko'ring.","Не удалось определить локацию. Разрешите Telegram доступ к геопозиции в настройках телефона и повторите.");
          return;
        }
        f.lat = loc.lat; f.lon = loc.lon;
        btn.classList.add('got'); btn.textContent = L('✅ Lokatsiya aniqlandi (qayta aniqlash)','✅ Локация определена (обновить)');
        haptic('ok');
        $('mkLocHint').textContent = L("Lokatsiya saqlandi. Manzil bo'yicha aniqlik kiritilmoqda...","Локация сохранена. Уточняем адрес...");
        mkReverseGeocode(loc.lat, loc.lon, function(addr){
          if (state.stack[state.stack.length - 1].view !== 'marketCheckout') return;
          if (addr && !$('mkfAdr').value.trim()) {
            $('mkfAdr').value = addr; readForm();
            $('mkLocHint').textContent = L("Manzil lokatsiya bo'yicha to'ldirildi — uy/xonadon raqamini qo'shib, tekshirib chiqing.","Адрес заполнен по локации — проверьте и добавьте номер дома/квартиры.");
          } else {
            $('mkLocHint').textContent = L("Lokatsiya saqlandi. Manzilni o'zingiz yozing.","Локация сохранена. Укажите адрес вручную.");
          }
        });
      });
    });

    function submit(){
      readForm();
      var err = $('mkFormErr'); err.textContent = '';
      if (!f.ism || !f.familya || !f.manzil) { err.textContent = L("Ism, familya va manzilni to'ldiring.","Заполните имя, фамилию и адрес."); return; }
      if (f.telefon.replace(/\D/g, '').length < 9) { err.textContent = L("Telefon raqamni to'liq kiriting.","Введите номер телефона полностью."); return; }
      var btn = $('mkSubmit'); btn.disabled = true; btn.textContent = L('⏳ Yuborilmoqda...','⏳ Отправка...');
      apiPost('/api/public/market/order/create', {
        init_data: getInitData(), lang: state.lang,
        ism: f.ism, familya: f.familya, telefon: f.telefon, manzil: f.manzil, lat: f.lat, lon: f.lon,
        items: m.cart.map(function(x){ return { id:x.id, qty:x.qty }; })
      }).then(function(res){
        var d = res.data || {};
        if (d.ok) {
          mkStoreSet(MK_PROFILE_KEY, { ism:f.ism, familya:f.familya, telefon:f.telefon, manzil:f.manzil, lat:f.lat, lon:f.lon });
          m.pay = { order_id:d.order_id, jami:d.jami, links:d.links || {}, snap:{ ism:f.ism, familya:f.familya, telefon:f.telefon, manzil:f.manzil } };
          m.orders = null;
          // ilova to'lov paytida yopilib/qayta ochilsa ham buyurtma holatini tiklash uchun
          mkStoreSet(MK_PENDING_KEY, { order_id:d.order_id, t:Date.now() });
          haptic('ok'); push({ view:'marketPay' });
        } else {
          btn.disabled = false; btn.textContent = '💳 ' + L("To'lovga o'tish","Перейти к оплате");
          err.textContent = d.error ? String(d.error) : L("Xatolik yuz berdi. Qayta urinib ko'ring.","Произошла ошибка. Повторите попытку.");
        }
      }).catch(function(){
        btn.disabled = false; btn.textContent = '💳 ' + L("To'lovga o'tish","Перейти к оплате");
        err.textContent = L("Ulanib bo'lmadi. Internetni tekshiring.","Нет соединения. Проверьте интернет.");
      });
    }
    $('mkSubmit').addEventListener('click', function(){
      readForm();
      if (f.lat == null && f.ism && f.familya && f.manzil && f.telefon.replace(/\D/g, '').length >= 9) {
        mkConfirm(L("Lokatsiya aniqlanmadi. Lokatsiyasiz yetkazib berish sekinroq bo'lishi mumkin. Davom etamizmi?","Локация не определена. Без неё доставка может занять больше времени. Продолжить?"), function(ok){ if (ok) submit(); });
      } else submit();
    });
  }

  // ---------- To'lov ----------
  function mkPayCleanup(){
    var m = state.mk;
    if (m.payTimer) { clearInterval(m.payTimer); m.payTimer = null; }
    if (m.ordTimer) { clearInterval(m.ordTimer); m.ordTimer = null; }
    if (m.payVis) { document.removeEventListener('visibilitychange', m.payVis); m.payVis = null; }
  }

  function mkGoHomeMarket(){
    state.stack = [{ view:'mainMenu' }, { view:'market' }];
    render();
    if (tg && tg.BackButton) tg.BackButton.show();
  }

  function renderMarketPay(){
    var m = state.mk, pay = m.pay;
    if (!pay) { state.stack.pop(); render(); return; }
    var provs = [['payme','Payme'], ['click','Click']].filter(function(x){ return pay.links[x[0]]; });
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-head"><div class="tt"><span>💳</span>' + L("To'lov","Оплата") + '</div><div class="cn">№' + pay.order_id + '</div></div>' +
        '<div class="mk-totalbox" style="margin:0 0 16px"><span class="k">' + L("To'lov summasi","Сумма к оплате") + '</span><span class="v">' + mkFmt(pay.jami) + ' ' + L("so'm","сум") + '</span></div>' +
        '<div class="mk-hint" style="margin:0 2px 12px">' + L("To'lov usulini tanlang. To'lov tugagach shu oynaga qaytasiz — buyurtma avtomatik tasdiqlanadi.","Выберите способ оплаты. После оплаты вернитесь сюда — заказ подтвердится автоматически.") + '</div>' +
        '<div class="mk-paybtns">' + provs.map(function(x){ return '<a class="mk-payopt ' + x[0] + '" data-p="' + x[0] + '" href="#">💳 ' + x[1] + ' ' + L('orqali to\'lash','— оплатить') + '</a>'; }).join('') + '</div>' +
        '<div class="mk-wait" id="mkWait"><i></i><span>' + L("To'lov kutilmoqda...","Ожидаем оплату...") + '</span></div>' +
        '<div style="text-align:center;margin-top:12px"><span class="mk-empty" style="padding:0"><span class="act" id="mkCheckPay" style="margin-top:0">' + L("🔄 To'lovni tekshirish","🔄 Проверить оплату") + '</span></span></div>' +
        '<div class="mk-hint" style="text-align:center">' + L("To'lov qilgan bo'lsangiz va oyna yopilib qolgan bo'lsa — holatni ","Если вы оплатили, а окно закрылось — смотрите статус в разделе ") + '<span class="mk-link" id="mkPayOrders">' + L("Buyurtmalarim","Мои заказы") + '</span>' + L(" bo'limidan ko'ring.",".") + '</div>' +
      '</div>';

    mainView.querySelectorAll('.mk-payopt').forEach(function(a){
      a.addEventListener('click', function(e){ e.preventDefault(); haptic('select'); mkOpenExternal(pay.links[a.getAttribute('data-p')]); });
    });

    var busy = false, tries = 0;
    function check(manual){
      if (busy) return; busy = true;
      apiGet('/api/public/market/order/status?id=' + pay.order_id + '&init_data=' + encodeURIComponent(getInitData())).then(function(d){
        busy = false;
        if (state.stack[state.stack.length - 1].view !== 'marketPay') return;
        if (d && d.ok && d.paid) { onPaid(); return; }
        if (d && d.ok && d.status === 'bekor') {
          mkPayCleanup();
          var w = document.getElementById('mkWait'); if (w) w.innerHTML = '<span>' + L("Buyurtma bekor qilindi. Savatchadan qayta buyurtma bering.","Заказ отменён. Оформите заказ из корзины заново.") + '</span>';
          return;
        }
        if (manual) mkToast(L("To'lov hali kelmadi","Оплата пока не поступила"));
      }).catch(function(){ busy = false; if (manual) mkToast(L("Ulanib bo'lmadi","Нет соединения")); });
    }
    function onPaid(){
      mkPayCleanup();
      var order_id = pay.order_id;
      mkOnOrderPaid(order_id);
      m.cart = []; mkCartSave(); m.pay = null; m.orders = null;
      haptic('ok');
      state.stack = [{ view:'mainMenu' }, { view:'market' }];
      push({ view:'marketOrder', order_id:order_id, fresh:true });
    }
    m.payTimer = setInterval(function(){ tries++; if (tries > 300) { mkPayCleanup(); return; } check(false); }, 3000);
    m.payVis = function(){ if (!document.hidden) check(false); };
    document.addEventListener('visibilitychange', m.payVis);
    document.getElementById('mkCheckPay').addEventListener('click', function(){ haptic('tap'); check(true); });
    var po = document.getElementById('mkPayOrders');
    if (po) po.addEventListener('click', function(){ haptic('tap'); push({ view:'marketOrders' }); });
  }

  // ---------- buyurtmalar: holat belgilari, tarix va tafsilot ----------
  var MK_ST = {
    kutilmoqda:    { uz:"To'lov kutilmoqda", ru:'Ожидает оплаты', ico:'⏳', cls:'wait' },
    tolangan:      { uz:"To'langan", ru:'Оплачен', ico:'✅', cls:'ok' },
    qabul:         { uz:'Qabul qilindi', ru:'Принят', ico:'📥', cls:'ok' },
    yetkazilmoqda: { uz:'Yetkazilmoqda', ru:'Доставляется', ico:'🚚', cls:'go' },
    yetkazildi:    { uz:'Yetkazildi', ru:'Доставлен', ico:'🎉', cls:'done' },
    bekor:         { uz:'Bekor qilindi', ru:'Отменён', ico:'✖️', cls:'bad' }
  };
  function mkStat(st){ return MK_ST[st] || MK_ST.kutilmoqda; }
  function mkStLabel(st){ var x = mkStat(st); return L(x.uz, x.ru); }
  function mkStBadge(st){ var x = mkStat(st); return '<span class="mk-st ' + x.cls + '">' + x.ico + ' ' + esc(L(x.uz, x.ru)) + '</span>'; }
  function mkIsFinal(st){ return st === 'yetkazildi' || st === 'bekor'; }
  function mkQuery(k){ try { return new URLSearchParams(location.search).get(k); } catch(e){ return null; } }
  function mkOrderApi(oid){ return '/api/public/market/order/status?id=' + oid + '&init_data=' + encodeURIComponent(getInitData()); }
  function mkClearPending(){ mkStoreSet(MK_PENDING_KEY, null); }

  // to'lov o'tgach: savatchani tozalaymiz va "kutilayotgan to'lov" belgisini o'chiramiz
  function mkOnOrderPaid(oid){
    var pend = mkStoreGet(MK_PENDING_KEY);
    if (pend && pend.order_id === oid) {
      state.mk.cart = []; mkCartSave(); mkClearPending(); mkUpdateCartBar();
    }
  }

  function mkOrderCard(o){
    var names = (o.items || []).map(function(it){ return it.nomi + (it.qty > 1 ? ' ×' + it.qty : ''); });
    var summ = names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) : '');
    return '<div class="mk-ocard" data-oid="' + o.id + '">' +
      '<div class="r1"><b>№' + o.id + '</b>' + mkStBadge(o.status) + '</div>' +
      '<div class="r2">' + esc(summ) + '</div>' +
      '<div class="r3"><span>' + esc(o.created_at || '') + '</span><b>' + mkFmt(o.jami) + ' ' + L("so'm","сум") + '</b></div></div>';
  }
  function mkBindOrderCards(root){
    root.querySelectorAll('.mk-ocard').forEach(function(el){
      el.addEventListener('click', function(){ haptic('select'); push({ view:'marketOrder', order_id:parseInt(el.getAttribute('data-oid'), 10) }); });
    });
  }
  function mkLoadOrders(cb){
    if (!getInitData() || !API_BASE) { cb(null); return; }
    apiGet('/api/public/market/orders?init_data=' + encodeURIComponent(getInitData())).then(function(d){
      if (d && d.ok) { state.mk.orders = d.items || []; cb(state.mk.orders); } else cb(null);
    }).catch(function(){ cb(null); });
  }

  // Market bosh sahifasida: oxirgi buyurtmalar
  function mkRenderHomeOrders(){
    function paint(list){
      var box = document.getElementById('mkHomeOrders');
      if (!box || state.stack[state.stack.length - 1].view !== 'market') return;
      if (!list || !list.length) { box.innerHTML = ''; return; }
      var active = list.filter(function(o){ return !mkIsFinal(o.status); }).length;
      box.innerHTML = '<div class="mk-sec"><div class="mk-sech"><h3>📦 ' + L('Buyurtmalar tarixi','История заказов') +
        (active ? ' <span class="mk-cnt">' + active + ' ' + L('faol','активн.') + '</span>' : '') + '</h3>' +
        '<span class="mk-all" id="mkAllOrd">' + L('Barchasi','Все') + ' ›</span></div>' +
        '<div class="mk-olist">' + list.slice(0, 3).map(mkOrderCard).join('') + '</div></div>';
      mkBindOrderCards(box);
      document.getElementById('mkAllOrd').addEventListener('click', function(){ haptic('select'); push({ view:'marketOrders' }); });
    }
    if (state.mk.orders) paint(state.mk.orders);
    mkLoadOrders(function(list){ if (list) paint(list); });
  }

  // ---------- Buyurtmalarim (to'liq tarix) ----------
  function renderMarketOrders(){
    var m = state.mk;
    mainView.innerHTML = '<div class="view mk-view"><div class="mk-head"><div class="tt"><span>📦</span>' + L('Buyurtmalarim','Мои заказы') + '</div><div class="cn" id="mkOCnt"></div></div><div id="mkOList"></div></div>';
    var listEl = document.getElementById('mkOList');
    if (!getInitData()) {
      listEl.innerHTML = '<div class="mk-empty"><span class="big">📦</span><b>' + L("Buyurtmalar tarixi","История заказов") + '</b>' + L("Buyurtmalarni ko'rish uchun ilovani Telegram ichida oching.","Откройте приложение внутри Telegram, чтобы увидеть заказы.") + '</div>';
      return;
    }
    function paint(list){
      if (state.stack[state.stack.length - 1].view !== 'marketOrders') return;
      document.getElementById('mkOCnt').textContent = list.length + ' ' + L('ta','шт.');
      if (!list.length) {
        listEl.innerHTML = '<div class="mk-empty"><span class="big">🛒</span><b>' + L("Hali buyurtma yo'q","Заказов пока нет") + '</b>' + L("Ehtiyot qism buyurtma qilsangiz, shu yerda holati ko'rinadi.","Здесь появятся ваши заказы и их статус.") + '<br><span class="act" id="mkOEmpty">' + L('Ehtiyot qismlar','Запчасти') + '</span></div>';
        document.getElementById('mkOEmpty').addEventListener('click', function(){ haptic('select'); push({ view:'marketCats' }); });
        return;
      }
      listEl.innerHTML = '<div class="mk-olist">' + list.map(mkOrderCard).join('') + '</div>';
      mkBindOrderCards(listEl);
    }
    if (m.orders) paint(m.orders);
    else listEl.innerHTML = '<div class="mk-wait"><i></i><span>' + L('Yuklanmoqda...','Загрузка...') + '</span></div>';
    function load(){
      mkLoadOrders(function(list){
        if (list) paint(list);
        else if (!m.orders && state.stack[state.stack.length - 1].view === 'marketOrders')
          listEl.innerHTML = '<div class="mk-hint err" style="text-align:center">' + L("Ulanib bo'lmadi. Keyinroq urinib ko'ring.","Не удалось загрузить. Повторите позже.") + '</div>';
      });
    }
    load();
    m.ordTimer = setInterval(function(){ if (!document.hidden) load(); }, 10000);
  }

  // ---------- Buyurtma tafsiloti: holat, qismlar, yetkazib berish, to'lov ----------
  function renderMarketOrder(entry){
    var m = state.mk, oid = entry.order_id, cur = null, busy = false, ticks = 0, lastSig = '';
    mainView.innerHTML = '<div class="view mk-view"><div class="mk-head"><div class="tt"><span>🧾</span>' + L('Buyurtma','Заказ') + ' №' + oid + '</div><div class="cn" id="mkODate"></div></div>' +
      '<div id="mkOBody"><div class="mk-wait"><i></i><span>' + L('Yuklanmoqda...','Загрузка...') + '</span></div></div></div>';
    var body = document.getElementById('mkOBody');

    function paint(o){
      var st = o.status;
      var dEl = document.getElementById('mkODate'); if (dEl) dEl.textContent = o.created_at || '';
      var title = mkStLabel(st), sub = '', cls = 'ok', ico = mkStat(st).ico;
      if (st === 'kutilmoqda') {
        cls = 'wait';
        sub = L("To'lovni tugatgan bo'lsangiz, holat bir necha soniyada o'zi yangilanadi.","Если вы уже оплатили, статус обновится сам через несколько секунд.");
      } else if (st === 'bekor') {
        cls = 'bad'; sub = o.izoh ? esc(o.izoh) : '';
      } else if (st === 'yetkazildi') {
        sub = L("Buyurtma yetkazib berildi. Rahmat!","Заказ доставлен. Спасибо!");
      } else {
        if (entry.fresh && (st === 'tolangan' || st === 'qabul')) title = L("To'lov qabul qilindi!","Оплата принята!");
        sub = L("Siz bilan tez orada bog'lanamiz va ehtiyot qismlarni yetkazib beramiz.","Мы скоро свяжемся с вами и доставим запчасти.");
      }
      var h = '<div class="mk-obanner ' + cls + '">' + (st === 'kutilmoqda' ? '<i class="sp"></i>' : '<span class="e">' + ico + '</span>') +
        '<div><b>' + esc(title) + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div></div>';

      if (st !== 'bekor') {
        var order = ['tolangan','qabul','yetkazilmoqda','yetkazildi'];
        var names = [L("To'lov qabul qilindi","Оплата принята"), L('Buyurtma qabul qilindi','Заказ принят'), L('Yetkazilmoqda','Доставляется'), L('Yetkazildi','Доставлен')];
        var idx = st === 'kutilmoqda' ? -1 : order.indexOf(st);
        h += '<div class="mk-sec"><h3>' + L('Buyurtma holati','Статус заказа') + '</h3><ul class="mk-tl">' + order.map(function(k, i){
          var c = i < idx ? 'done' : (i === idx ? (st === 'yetkazildi' ? 'done' : 'cur') : '');
          var when = i === 0 ? o.paid_at : (i === idx ? o.updated_at : '');
          return '<li class="' + c + '"><i>' + (c === 'done' ? '✓' : (i + 1)) + '</i><div><b>' + esc(names[i]) + '</b>' + (when ? '<span>' + esc(when) + '</span>' : '') + '</div></li>';
        }).join('') + '</ul></div>';
      }

      h += '<div class="mk-sec"><h3>' + L('Tanlangan qismlar','Выбранные запчасти') + '</h3><div class="mk-box">' + (o.items || []).map(function(it, i){
        var sub2 = [it.brend, it.model].filter(Boolean).join(' · ');
        return '<div class="mk-tr" style="--i:' + i + '"><span class="k" style="color:#eafff7;font-weight:700">' + esc(it.nomi) + (sub2 ? '<br><span style="color:#9fb8b0;font-weight:500;font-size:11.5px">' + esc(sub2) + '</span>' : '') + '</span>' +
          '<span class="v">' + it.qty + ' × ' + mkFmt(it.narx) + '<br><span style="color:var(--mk-em)">' + mkFmt(it.summa) + '</span></span></div>';
      }).join('') + '<div class="mk-tr"><span class="k">' + L('Jami','Итого') + '</span><span class="v" style="font-size:15px">' + mkFmt(o.jami) + ' ' + L("so'm","сум") + '</span></div></div></div>';

      h += '<div class="mk-sec"><h3>' + L('Yetkazib berish','Доставка') + '</h3><div class="mk-box">' +
        '<div class="mk-tr"><span class="k">' + L('Ism familya','Имя фамилия') + '</span><span class="v">' + esc((o.familya || '') + ' ' + (o.ism || '')) + '</span></div>' +
        '<div class="mk-tr"><span class="k">' + L('Telefon','Телефон') + '</span><span class="v">' + esc(o.telefon || '') + '</span></div>' +
        '<div class="mk-tr"><span class="k">' + L('Manzil','Адрес') + '</span><span class="v">' + esc(o.manzil || '') + '</span></div></div></div>';

      var prov = { payme:'Payme', click:'Click' }[o.provider] || '';
      if (o.paid) {
        h += '<div class="mk-sec"><h3>' + L("To'lov","Оплата") + '</h3><div class="mk-box">' +
          '<div class="mk-tr"><span class="k">' + L('Usul','Способ') + '</span><span class="v">' + esc(prov || '—') + '</span></div>' +
          '<div class="mk-tr"><span class="k">' + L('Vaqt','Время') + '</span><span class="v">' + esc(o.paid_at || '—') + '</span></div></div></div>';
      }

      h += '<div class="mk-actions" id="mkOActs" style="flex-direction:column">';
      if (st === 'kutilmoqda') {
        var links = o.links || {};
        h += '<div class="mk-paybtns" style="width:100%">' + [['payme','Payme'],['click','Click']].filter(function(x){ return links[x[0]]; }).map(function(x){
          return '<a class="mk-payopt ' + x[0] + '" data-p="' + x[0] + '" href="#">💳 ' + x[1] + ' ' + L("orqali to'lash","— оплатить") + '</a>'; }).join('') + '</div>' +
          '<button class="mk-btn ghost" id="mkOCheck">🔄 ' + L("To'lovni tekshirish","Проверить оплату") + '</button>';
      }
      h += '<button class="mk-btn ' + (st === 'kutilmoqda' ? 'ghost' : 'pri') + '" id="mkOBack">🛒 ' + L('Marketga qaytish','Вернуться в маркет') + '</button></div>';
      body.innerHTML = h;

      body.querySelectorAll('.mk-payopt').forEach(function(a){
        a.addEventListener('click', function(e){
          e.preventDefault(); haptic('select');
          mkStoreSet(MK_PENDING_KEY, { order_id:oid, t:Date.now() });
          mkOpenExternal((o.links || {})[a.getAttribute('data-p')]);
        });
      });
      var chk = document.getElementById('mkOCheck'); if (chk) chk.addEventListener('click', function(){ haptic('tap'); load(true); });
      document.getElementById('mkOBack').addEventListener('click', function(){ haptic('select'); mkGoHomeMarket(); });
    }

    function load(manual){
      if (busy) return; busy = true;
      apiGet(mkOrderApi(oid)).then(function(d){
        busy = false;
        var top = state.stack[state.stack.length - 1];
        if (!top || top.view !== 'marketOrder' || top.order_id !== oid) return;
        if (!d || !d.ok || !d.order) {
          if (!cur) body.innerHTML = '<div class="mk-hint err" style="text-align:center">' + esc((d && d.error) || L("Buyurtmani yuklab bo'lmadi.","Не удалось загрузить заказ.")) + '</div>';
          return;
        }
        var o = d.order, was = cur && cur.status;
        if (o.paid) mkOnOrderPaid(oid);
        else if (o.status === 'bekor') { var pd = mkStoreGet(MK_PENDING_KEY); if (pd && pd.order_id === oid) mkClearPending(); }
        if (was === 'kutilmoqda' && o.paid) { entry.fresh = true; haptic('ok'); state.mk.orders = null; }
        if (manual && o.status === 'kutilmoqda') mkToast(L("To'lov hali kelmadi","Оплата пока не поступила"));
        cur = o;
        var sig = JSON.stringify([o.status, o.updated_at, o.paid_at, !!entry.fresh, Object.keys(o.links || {}).length]);
        if (sig === lastSig) return;
        lastSig = sig; paint(o);
      }).catch(function(){ busy = false; if (manual) mkToast(L("Ulanib bo'lmadi","Нет соединения")); });
    }
    load(false);
    m.ordTimer = setInterval(function(){
      ticks++;
      if (ticks > 450 || (cur && mkIsFinal(cur.status))) { clearInterval(m.ordTimer); m.ordTimer = null; return; }
      if (!document.hidden) load(false);
    }, 4000);
    m.payVis = function(){ if (!document.hidden) load(false); };
    document.addEventListener('visibilitychange', m.payVis);
  }

  // ilova to'lov paytida yopilgan/qayta ochilgan bo'lsa — buyurtma holatiga qaytaramiz
  function mkResumePending(onlyPaid){
    if (!getInitData() || !API_BASE) return;
    var top = state.stack[state.stack.length - 1] || {};
    if (top.view === 'oferta' || top.view === 'marketPay' || top.view === 'marketOrder') return;
    var deep = parseInt(mkQuery('mk') || '', 10) || 0, oid = deep;
    var pend = mkStoreGet(MK_PENDING_KEY);
    if (!oid && pend && pend.order_id) {
      if (Date.now() - (pend.t || 0) > 30 * 60000) { mkClearPending(); return; }
      oid = pend.order_id;
    }
    if (!oid) return;
    apiGet(mkOrderApi(oid)).then(function(d){
      if (!d || !d.ok || !d.order) { if (!deep && d && d.error) mkClearPending(); return; }
      var o = d.order;
      if (o.paid) mkOnOrderPaid(oid);
      if (o.status === 'bekor' && !deep) { mkClearPending(); return; }
      if (onlyPaid && !o.paid) return;
      var t2 = state.stack[state.stack.length - 1] || {};
      if (t2.view === 'oferta' || t2.view === 'marketPay' || (t2.view === 'marketOrder' && t2.order_id === oid)) return;
      if (deep) { try { history.replaceState(null, '', location.pathname); } catch(e){} }
      state.stack = [{ view:'mainMenu' }, { view:'market' }];
      push({ view:'marketOrder', order_id:oid, fresh:!!(o.paid && (o.status === 'tolangan' || o.status === 'qabul')) });
    }).catch(function(){});
  }

  function renderMarketDone(entry){
    var s = entry.snap || {};
    mainView.innerHTML =
      '<div class="view mk-view"><div class="mk-done"><span class="big">✅</span>' +
        '<h2>' + L("To'lov qabul qilindi!","Оплата принята!") + '</h2>' +
        '<p>' + L('Buyurtma','Заказ') + ' №' + entry.order_id + ' · ' + mkFmt(entry.jami) + ' ' + L("so'm","сум") + '</p>' +
        '<p>' + L("Siz bilan tez orada bog'lanamiz va ehtiyot qismlarni yetkazib beramiz.","Мы скоро свяжемся с вами и доставим запчасти.") + '</p></div>' +
        '<div class="mk-sec"><h3>' + L('Yetkazib berish','Доставка') + '</h3><div class="mk-box">' +
          '<div class="mk-tr"><span class="k">' + L('Ism familya','Имя фамилия') + '</span><span class="v">' + esc((s.familya || '') + ' ' + (s.ism || '')) + '</span></div>' +
          '<div class="mk-tr"><span class="k">' + L('Telefon','Телефон') + '</span><span class="v">' + esc(s.telefon || '') + '</span></div>' +
          '<div class="mk-tr"><span class="k">' + L('Manzil','Адрес') + '</span><span class="v">' + esc(s.manzil || '') + '</span></div>' +
        '</div></div>' +
        '<div class="mk-actions"><button class="mk-btn pri" id="mkDoneBtn">🛒 ' + L('Marketga qaytish','Вернуться в маркет') + '</button></div>' +
      '</div>';
    document.getElementById('mkDoneBtn').addEventListener('click', function(){ haptic('select'); mkGoHomeMarket(); });
  }

  function render(){
    var entry = state.stack[state.stack.length - 1];
    mapCleanup();
    if (entry.view !== 'mainMenu') mxStop();
    mkPayCleanup();
    backBtn.classList.toggle('show', state.stack.length > 1);
    renderCrumb();
    var inMk = /^market/.test(entry.view);
    document.body.classList.toggle('in-market', inMk);
    mkUpdateCartBar();
    document.getElementById('brandSub').textContent = inMk ? 'MARKET · ' + L('EHTIYOT QISMLAR','ЗАПЧАСТИ') : t().subtitle;
    var tbEl = document.querySelector('.topbar');
    if (tbEl) document.documentElement.style.setProperty('--tb', tbEl.offsetHeight + 'px');
    window.scrollTo(0,0);
    mainView.className = entry.catId ? palOf(entry.catId) : '';

    if (entry.view === 'oferta') renderOferta();
    else if (entry.view === 'mainMenu') renderMainMenu();
    else if (entry.view === 'home') renderHome();
    else if (entry.view === 'category') renderCategory(entry);
    else if (entry.view === 'printerType') renderPrinterType(entry);
    else if (entry.view === 'brand') renderBrand(entry);
    else if (entry.view === 'brandCodesList') renderBrandCodesList(entry);
    else if (entry.view === 'codesBrand') renderCodesBrand(entry);
    else if (entry.view === 'printerCodesList') renderPrinterCodesList(entry);
    else if (entry.view === 'printerCodesBrand') renderPrinterCodesBrand(entry);
    else if (entry.view === 'issue') renderIssue(entry);
    else if (entry.view === 'topishViloyat') renderTopishViloyat(entry);
    else if (entry.view === 'topishTuman') renderTopishTuman(entry);
    else if (entry.view === 'topishXizmat') renderTopishXizmat(entry);
    else if (entry.view === 'topishResults') renderTopishResults(entry);
    else if (entry.view === 'map') renderMap(entry);
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
    else if (entry.view === 'profileMasterNewOrders') renderProfileMasterNewOrders(entry);
    else if (entry.view === 'profileMasterOrderAccepted') renderProfileMasterOrderAccepted(entry);
    else if (entry.view === 'profileMasterStats') renderProfileMasterStats(entry);
    else if (entry.view === 'profileEditMaster') renderProfileEditMaster(entry);
    else if (entry.view === 'profileMasterLocation') renderProfileMasterLocation(entry);
    else if (entry.view === 'profileUser') renderProfileUser(entry);
    else if (entry.view === 'profileUserOrders') renderProfileUserOrders(entry);
    else if (entry.view === 'anketaGate') renderAnketaGate();
    else if (entry.view === 'anketaViloyat') renderAnketaViloyat();
    else if (entry.view === 'anketaTuman') renderAnketaTuman(entry);
    else if (entry.view === 'anketaForm') renderAnketaForm(entry);
    else if (entry.view === 'anketaContract') renderAnketaContract(entry);
    else if (entry.view === 'anketaSuccess') renderAnketaSuccess();
    else if (entry.view === 'market') renderMarket();
    else if (entry.view === 'marketCats') renderMarketCats();
    else if (entry.view === 'marketParts') renderMarketParts(entry);
    else if (entry.view === 'marketPart') renderMarketPart(entry);
    else if (entry.view === 'marketCart') renderMarketCart();
    else if (entry.view === 'marketCheckout') renderMarketCheckout();
    else if (entry.view === 'marketPay') renderMarketPay();
    else if (entry.view === 'marketDone') renderMarketDone(entry);
    else if (entry.view === 'marketOrders') renderMarketOrders();
    else if (entry.view === 'marketOrder') renderMarketOrder(entry);
  }

  // init lang buttons to reflect stored pref
  document.querySelectorAll('.lang-toggle button').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-lang') === state.lang);
  });
  document.getElementById('brandSub').textContent = t().subtitle;

  render();
  mkResumePending(false);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) mkResumePending(true); });
})();
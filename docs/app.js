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
      data.error = (state && state.lang !== 'uz')
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
        "🏆 Online Ustaxona nima?\n" +
        "Online Ustaxona — O'zbekiston bo'ylab mijozlarni malakali ustalar bilan bevosita bog'laydigan Telegram platformasi. Usta izlab vaqt sarflash shart emas — bot buni siz uchun qiladi.\n" +
        "\n" +
        "🤖 Bot nima qiladi?\n" +
        "• Hududingiz va xizmat turi bo'yicha ustalarni topadi\n" +
        "• Buyurtmangizni bir bosishda ustalarga yuboradi — bo'sh usta o'zi qabul qiladi\n" +
        "• Usta bilan to'g'ridan-to'g'ri qo'ng'iroq yoki Telegram orqali bog'laydi\n" +
        "• Bajarilgan ishdan so'ng ustani baholash imkonini beradi\n" +
        "• Texnika nosozliklarini o'zingiz aniqlashingiz uchun 14 turdagi texnika bo'yicha diagnostika va qadamma-qadam yo'riqnoma beradi\n" +
        "• Marketda ehtiyot qismlar va printer chip reset dasturlarini sotadi (Payme / Click / Stars / karta orqali to'lov)\n" +
        "\n" +
        "🔧 Qanday texnikalar?\n" +
        "Televizor, konditsioner, xolodilnik, kir yuvish mashinasi, printer, kompyuter va noutbuk hamda boshqa uy texnikalari.\n" +
        "\n" +
        "📋 Qanday foydalaniladi?\n" +
        "1️⃣ «Ustaxona» bo'limidan «Buyurtma qilish» ni bosing va nosozlik haqida yozing\n" +
        "2️⃣ Hududingizdagi ustalar buyurtmani oladi\n" +
        "3️⃣ Usta siz bilan bog'lanib, uyingizga keladi\n" +
        "4️⃣ Ish tugagach, ustani baholang\n" +
        "\n" +
        "🛠 Usta bo'lsangiz\n" +
        "«Profil» bo'limidagi «Anketani to'ldirish» orqali ro'yxatdan o'ting. Anketa admin tomonidan ko'rib chiqiladi, tasdiqlangach buyurtmalar sizga keladi va o'z profilingizni boshqarasiz.\n" +
        "\n" +
        "⚡ Afzalliklarimiz:\n" +
        "• Tez va qulay — hammasi Telegram ichida\n" +
        "• Tekshirilgan, tajribali ustalar\n" +
        "• Ustalar reytingi ochiq ko'rinadi\n" +
        "• Uyingizga kelamiz\n" +
        "• O'zbekiston bo'ylab",
      contactTitle: "📞 Bog'lanish",
      contactPhone: "+998 50 071 5242",
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
        "🏆 Что такое Online Ustaxona?\n" +
        "Online Ustaxona — Telegram-платформа, которая напрямую связывает клиентов с квалифицированными мастерами по всему Узбекистану. Не нужно тратить время на поиск мастера — бот сделает это за вас.\n" +
        "\n" +
        "🤖 Что умеет бот?\n" +
        "• Находит мастеров по вашему региону и виду услуги\n" +
        "• Отправляет вашу заявку мастерам в один клик — свободный мастер принимает её сам\n" +
        "• Связывает с мастером напрямую по звонку или в Telegram\n" +
        "• После выполнения работы позволяет оценить мастера\n" +
        "• Помогает самостоятельно определить неисправность: диагностика и пошаговые инструкции по 14 видам техники\n" +
        "• В маркете продаёт запчасти и программы Chip reset для принтеров (оплата через Payme / Click / Stars / карту)\n" +
        "\n" +
        "🔧 Какая техника?\n" +
        "Телевизоры, кондиционеры, холодильники, стиральные машины, принтеры, компьютеры и ноутбуки, а также другая бытовая техника.\n" +
        "\n" +
        "📋 Как пользоваться?\n" +
        "1️⃣ В разделе «Мастерская» нажмите «Оставить заявку» и опишите неисправность\n" +
        "2️⃣ Мастера вашего региона получают заявку\n" +
        "3️⃣ Мастер связывается с вами и приезжает на дом\n" +
        "4️⃣ После работы оцените мастера\n" +
        "\n" +
        "🛠 Если вы мастер\n" +
        "Зарегистрируйтесь через «Заполнить анкету» в разделе «Профиль». Анкета рассматривается администратором, после одобрения заявки начнут поступать вам, а профилем вы управляете сами.\n" +
        "\n" +
        "⚡ Наши преимущества:\n" +
        "• Быстро и удобно — всё внутри Telegram\n" +
        "• Проверенные опытные мастера\n" +
        "• Открытый рейтинг мастеров\n" +
        "• Выезд на дом\n" +
        "• По всему Узбекистану",
      contactTitle: "📞 Контакты",
      contactPhone: "+998 50 071 5242",
      contactHours: "⏰ Режим работы:\nПн — Сб: 9:00 — 20:00\nВс: 10:00 — 18:00",
      contactAddress: "📍 г. Ташкент",
    }
  };

  // ---------- Qo'shimcha tillar: qozoq / tojik / qirg'iz / turkman ----------
  // Tarjima qilinmagan kalitlar rus tilidagi variantga tushadi (Central Asia lingua franca).
  var STR_EXTRA = {
    kk: {
      subtitle: "ДИАГНОСТИКА · ТАШКЕНТ",
      heroTitle: "Ақауды таңдаңыз — <em>шешімін</em> көріңіз",
      heroDesc: "14 түрлі техника бойынша диагностика және жөндеудің толық нұсқаулығы — Online Ustaxona мамандары дайындаған.",
      searchPh: "Техника түрін іздеу...",
      chooseIssue: "Ақауды таңдаңыз",
      chooseBrand: "Брендті таңдаңыз",
      choosePrinterType: "Принтер түрін таңдаңыз",
      errorCodes: "🔢 Қате кодтары",
      backHome: "Басты бет",
      diagnosing: "ДИАГНОЗ",
      description: "Сипаттама",
      solution: "Шешім",
      codesTitle: "Қате кодтары",
      illusTitle: "Көрнекі анимация",
      videoTitle: "Бейне нұсқаулық",
      videoOpen: "Бейнені ашу",
      priceTitle: "Жөндеудің шамамен бағасы",
      priceBtn: "Бағаны көру",
      priceNone: "Баға әлі енгізілмеген. Нақты бағаны шебер диагностикадан кейін айтады.",
      contactMaster: "Шеберге жазу",
      note: "Нақты диагностика үшін құрылғыны қарап шығу ұсынылады. Күрделі жағдайларда Online Ustaxona шеберлеріне жүгініңіз.",
      notFound: "Ештеңе табылмады",
      all: "Барлығы",
      ofertaTitle: "📜 Жария оферта",
      ofertaAgree: "✅ Қабылдаймын — Жалғастыру",
      ofertaDecline: "❌ Қабылдамаймын",
      ofertaDeclinedMsg: "Ботты пайдалану үшін шарттарды қабылдауыңыз керек.",
      ofertaReview: "📜 Шарттарды қайта қарау",
      menuTechs: "🔧 Техника",
      menuTechsSub: "Ақауды өзіңіз табыңыз",
      menuTopish: "🔍 Шеберхана іздеу",
      menuTopishSub: "Өңіріңіздегі шеберлерді көріңіз",
      menuOrder: "📋 Тапсырыс беру",
      menuOrderSub: "Шебер шақырыңыз — бір басуда",
      menuAbout: "ℹ️ Біз туралы",
      menuAboutSub: "Қызметтер мен артықшылықтар",
      menuContact: "📞 Байланыс",
      menuContactSub: "Тікелей хабарласу",
      menuProfile: "👤 Менің профилім",
      menuProfileSub: "Тапсырыстар, өңдеу, төлем",
      menuAnketa: "📝 Анкета толтыру",
      menuAnketaSub: "Шебер ретінде тіркеліңіз",
      profileLoading: "Жүктелуде...",
      prevPage: "⬅️ Алдыңғы",
      nextPage: "Келесі ➡️",
      topishChooseViloyat: "Өңірді таңдаңыз",
      topishChooseTuman: "Ауданды таңдаңыз (міндетті емес)",
      topishSkipTuman: "— Бүкіл облыс —",
      topishChooseXizmat: "Қандай қызмет керек?",
      topishSearching: "Ізделуде...",
      topishWrite: "Жазу",
      topishBusy: "🔴 Қазір бос емес",
      topishFree: "🟢 Бос",
      complainBtn: "⚠️ Шағым",
      orderChooseViloyat: "Өңірді таңдаңыз",
      orderChooseXizmat: "Қай техника/сала бойынша шебер керек?",
      orderFormTitle: "Деректеріңізді енгізіңіз",
      fIsm: "Аты",
      fFamilya: "Тегі",
      fTel: "Телефон нөмірі",
      fMuammo: "Мәселенің сипаттамасы",
      fManzil: "Мекенжай",
      continueBtn: "Жалғастыру →",
      backToMenu: "🏠 Басты мәзір",
      viloyat: "Өңір",
      xizmat: "Қызмет",
      aboutText: "🏆 Біз кімбіз?\nКәсіби тұрмыстық техниканы жөндеу қызметі\n\n✅ Қызметтеріміз:\n• Теледидар жөндеу\n• Кондиционер қызметі\n• Тоңазытқыш жөндеу\n• Кір жуу машинасы\n• Принтер жөндеу\n• Компьютер және ноутбук\n• Және басқа тұрмыстық техникалар\n\n⚡ Артықшылықтарымыз:\n• Жылдам әрі сапалы қызмет\n• Кепілдік беріледі\n• Үйіңізге барамыз\n• Тәжірибелі шеберлер",
      contactTitle: "📞 Байланыс",
      contactHours: "⏰ Жұмыс уақыты:\nДүйсенбі — Сенбі: 9:00 — 20:00\nЖексенбі: 10:00 — 18:00",
      contactAddress: "📍 Ташкент қаласы",
      itemsCount: function(n){ return n + " жағдай"; },
      topishFound: function(n){ return n + " шебер табылды"; },
    },
    tg: {
      subtitle: "ТАШХИС · ТОШКАНД",
      heroTitle: "Носозиро интихоб кунед — <em>ҳалли</em> онро бинед",
      heroDesc: "Ташхис ва дастури муфассали таъмир барои 14 намуди техника — аз тарафи устоҳои Online Ustaxona омода шудааст.",
      searchPh: "Ҷустуҷӯи навъи техника...",
      chooseIssue: "Носозиро интихоб кунед",
      chooseBrand: "Брендро интихоб кунед",
      choosePrinterType: "Навъи принтерро интихоб кунед",
      errorCodes: "🔢 Рамзҳои хатогӣ",
      backHome: "Саҳифаи асосӣ",
      diagnosing: "ТАШХИС",
      description: "Тавсиф",
      solution: "Ҳал",
      codesTitle: "Рамзҳои хатогӣ",
      illusTitle: "Аниматсияи намоишӣ",
      videoTitle: "Дастури видеоӣ",
      videoOpen: "Кушодани видео",
      priceTitle: "Нархи тақрибии таъмир",
      priceBtn: "Дидани нарх",
      priceNone: "Нарх ҳанӯз ворид нашудааст. Нархи аниқро уста пас аз ташхис мегӯяд.",
      contactMaster: "Ба уста навиштан",
      note: "Барои ташхиси аниқ тавсия мешавад, ки дастгоҳро аз назар гузаронед. Дар ҳолатҳои мураккаб ба устоҳои Online Ustaxona муроҷиат кунед.",
      notFound: "Чизе ёфт нашуд",
      all: "Ҳама",
      ofertaTitle: "📜 Оферти оммавӣ",
      ofertaAgree: "✅ Қабул мекунам — Давом додан",
      ofertaDecline: "❌ Қабул намекунам",
      ofertaDeclinedMsg: "Барои истифодаи бот шумо бояд шартҳоро қабул кунед.",
      ofertaReview: "📜 Бознигарии шартҳо",
      menuTechs: "🔧 Техника",
      menuTechsSub: "Носозиро худатон ёбед",
      menuTopish: "🔍 Ҷустуҷӯи устохона",
      menuTopishSub: "Устоҳои минтақаи худро бинед",
      menuOrder: "📋 Фармоиш додан",
      menuOrderSub: "Усто даъват кунед — бо як зеркунӣ",
      menuAbout: "ℹ️ Дар бораи мо",
      menuAboutSub: "Хидматҳо ва бартариҳо",
      menuContact: "📞 Тамос",
      menuContactSub: "Муроҷиати мустақим",
      menuProfile: "👤 Профили ман",
      menuProfileSub: "Фармоишҳо, таҳрир, пардохт",
      menuAnketa: "📝 Пур кардани анкета",
      menuAnketaSub: "Ҳамчун усто сабти ном шавед",
      profileLoading: "Бор шуда истодааст...",
      prevPage: "⬅️ Қаблӣ",
      nextPage: "Баъдӣ ➡️",
      topishChooseViloyat: "Минтақаро интихоб кунед",
      topishChooseTuman: "Ноҳияро интихоб кунед (ихтиёрӣ)",
      topishSkipTuman: "— Тамоми вилоят —",
      topishChooseXizmat: "Кадом хидмат лозим аст?",
      topishSearching: "Ҷустуҷӯ...",
      topishWrite: "Навиштан",
      topishBusy: "🔴 Ҳоло банд аст",
      topishFree: "🟢 Банд нест",
      complainBtn: "⚠️ Шикоят",
      orderChooseViloyat: "Минтақаро интихоб кунед",
      orderChooseXizmat: "Усто аз рӯи кадом техника/соҳа лозим аст?",
      orderFormTitle: "Маълумоти худро ворид кунед",
      fIsm: "Ном",
      fFamilya: "Насаб",
      fTel: "Рақами телефон",
      fMuammo: "Тавсифи мушкил",
      fManzil: "Суроға",
      continueBtn: "Давом додан →",
      backToMenu: "🏠 Менюи асосӣ",
      viloyat: "Минтақа",
      xizmat: "Хидмат",
      aboutText: "🏆 Мо кистем?\nХидмати касбии таъмири техникаи рӯзгор\n\n✅ Хидматҳои мо:\n• Таъмири телевизор\n• Хидмати кондитсионер\n• Таъмири яхдон\n• Мошини кирошӯӣ\n• Таъмири принтер\n• Компютер ва ноутбук\n• Ва дигар техникаи рӯзгор\n\n⚡ Бартариҳои мо:\n• Хидмати тез ва босифат\n• Кафолат дода мешавад\n• Ба хонаи шумо меоем\n• Устоҳои соҳибтаҷриба",
      contactTitle: "📞 Тамос",
      contactHours: "⏰ Вақти кор:\nДушанбе — Шанбе: 9:00 — 20:00\nЯкшанбе: 10:00 — 18:00",
      contactAddress: "📍 Шаҳри Тошканд",
      itemsCount: function(n){ return n + " ҳолат"; },
      topishFound: function(n){ return n + " усто ёфт шуд"; },
    },
    ky: {
      subtitle: "ДИАГНОСТИКА · ТАШКЕНТ",
      heroTitle: "Бузукту тандаңыз — <em>чечимин</em> көрүңүз",
      heroDesc: "14 түрдөгү техника боюнча диагностика жана оңдоонун толук колдонмосу — Online Ustaxona адистери даярдаган.",
      searchPh: "Техника түрүн издөө...",
      chooseIssue: "Бузукту тандаңыз",
      chooseBrand: "Брендди тандаңыз",
      choosePrinterType: "Принтердин түрүн тандаңыз",
      errorCodes: "🔢 Ката коддору",
      backHome: "Башкы бет",
      diagnosing: "ДИАГНОЗ",
      description: "Сүрөттөмө",
      solution: "Чечим",
      codesTitle: "Ката коддору",
      illusTitle: "Көрсөтмөлүү анимация",
      videoTitle: "Видео колдонмо",
      videoOpen: "Видеону ачуу",
      priceTitle: "Оңдоонун болжолдуу баасы",
      priceBtn: "Баасын көрүү",
      priceNone: "Баасы азырынча киргизилген эмес. Так баасын уста диагностикадан кийин айтат.",
      contactMaster: "Устага жазуу",
      note: "Так диагностика үчүн түзмөктү карап чыгуу сунушталат. Татаал учурларда Online Ustaxona усталарына кайрылыңыз.",
      notFound: "Эч нерсе табылган жок",
      all: "Бардыгы",
      ofertaTitle: "📜 Жалпыга ачык оферта",
      ofertaAgree: "✅ Кабыл алам — Улантуу",
      ofertaDecline: "❌ Кабыл албайм",
      ofertaDeclinedMsg: "Ботту колдонуу үчүн шарттарды кабыл алышыңыз керек.",
      ofertaReview: "📜 Шарттарды кайра көрүү",
      menuTechs: "🔧 Техника",
      menuTechsSub: "Бузукту өзүңүз табыңыз",
      menuTopish: "🔍 Устакана издөө",
      menuTopishSub: "Аймагыңыздагы усталарды көрүңүз",
      menuOrder: "📋 Буйрутма берүү",
      menuOrderSub: "Уста чакырыңыз — бир басууда",
      menuAbout: "ℹ️ Биз жөнүндө",
      menuAboutSub: "Кызматтар жана артыкчылыктар",
      menuContact: "📞 Байланыш",
      menuContactSub: "Түз кайрылуу",
      menuProfile: "👤 Менин профилим",
      menuProfileSub: "Буйрутмалар, өзгөртүү, төлөм",
      menuAnketa: "📝 Анкета толтуруу",
      menuAnketaSub: "Уста катары катталыңыз",
      profileLoading: "Жүктөлүүдө...",
      prevPage: "⬅️ Мурунку",
      nextPage: "Кийинки ➡️",
      topishChooseViloyat: "Аймакты тандаңыз",
      topishChooseTuman: "Районду тандаңыз (милдеттүү эмес)",
      topishSkipTuman: "— Бүт облус —",
      topishChooseXizmat: "Кандай кызмат керек?",
      topishSearching: "Издөөдө...",
      topishWrite: "Жазуу",
      topishBusy: "🔴 Азыр бош эмес",
      topishFree: "🟢 Бош",
      complainBtn: "⚠️ Даттануу",
      orderChooseViloyat: "Аймакты тандаңыз",
      orderChooseXizmat: "Кайсы техника/тармак боюнча уста керек?",
      orderFormTitle: "Маалыматыңызды киргизиңиз",
      fIsm: "Аты",
      fFamilya: "Фамилиясы",
      fTel: "Телефон номери",
      fMuammo: "Көйгөйдүн сүрөттөмөсү",
      fManzil: "Дареги",
      continueBtn: "Улантуу →",
      backToMenu: "🏠 Башкы меню",
      viloyat: "Аймак",
      xizmat: "Кызмат",
      aboutText: "🏆 Биз кимбиз?\nТүрмүш техникасын кесипкөй оңдоо кызматы\n\n✅ Кызматтарыбыз:\n• Телевизор оңдоо\n• Кондиционер кызматы\n• Муздаткыч оңдоо\n• Кир жуугуч машина\n• Принтер оңдоо\n• Компьютер жана ноутбук\n• Жана башка түрмүш техникалары\n\n⚡ Артыкчылыктарыбыз:\n• Тез жана сапаттуу кызмат\n• Кепилдик берилет\n• Үйүңүзгө барабыз\n• Тажрыйбалуу усталар",
      contactTitle: "📞 Байланыш",
      contactHours: "⏰ Иш убактысы:\nДүйшөмбү — Ишемби: 9:00 — 20:00\nЖекшемби: 10:00 — 18:00",
      contactAddress: "📍 Ташкент шаары",
      itemsCount: function(n){ return n + " учур"; },
      topishFound: function(n){ return n + " уста табылды"; },
    },
    tk: {
      subtitle: "DIAGNOSTIKA · DAŞKENT",
      heroTitle: "Näsazlygy saýlaň — <em>çözgüdini</em> görüň",
      heroDesc: "14 görnüşli tehnika boýunça diagnostika we jikme-jik abatlamak gollanmasy — Online Ustaxona ussalary tarapyndan taýýarlanyldy.",
      searchPh: "Tehnika görnüşini gözlemek...",
      chooseIssue: "Näsazlygy saýlaň",
      chooseBrand: "Brendi saýlaň",
      choosePrinterType: "Printeriň görnüşini saýlaň",
      errorCodes: "🔢 Ýalňyşlyk kodlary",
      backHome: "Baş sahypa",
      diagnosing: "DIAGNOZ",
      description: "Düşündiriş",
      solution: "Çözgüt",
      codesTitle: "Ýalňyşlyk kodlary",
      illusTitle: "Görkezme animasiýasy",
      videoTitle: "Wideo gollanma",
      videoOpen: "Wideony açmak",
      priceTitle: "Abatlamagyň takmynan bahasy",
      priceBtn: "Bahasyny görmek",
      priceNone: "Bahasy entek girizilmedik. Takyk bahany ussa diagnostikadan soň aýdar.",
      contactMaster: "Ussa ýazmak",
      note: "Takyk diagnostika üçin enjamy gözden geçirmek maslahat berilýär. Çylşyrymly ýagdaýlarda Online Ustaxona ussalaryna ýüz tutuň.",
      notFound: "Hiç zat tapylmady",
      all: "Hemmesi",
      ofertaTitle: "📜 Köpçülikleýin oferta",
      ofertaAgree: "✅ Kabul edýärin — Dowam etmek",
      ofertaDecline: "❌ Kabul etmeýärin",
      ofertaDeclinedMsg: "Boty ulanmak üçin şertleri kabul etmeli.",
      ofertaReview: "📜 Şertlere täzeden seretmek",
      menuTechs: "🔧 Tehnikalar",
      menuTechsSub: "Näsazlygy özüňiz tapyň",
      menuTopish: "🔍 Ussahana gözlemek",
      menuTopishSub: "Sebitiňizdäki ussalary görüň",
      menuOrder: "📋 Sargyt bermek",
      menuOrderSub: "Ussa çagyryň — bir basmak bilen",
      menuAbout: "ℹ️ Biz barada",
      menuAboutSub: "Hyzmatlar we artykmaçlyklar",
      menuContact: "📞 Aragatnaşyk",
      menuContactSub: "Göni ýüz tutmak",
      menuProfile: "👤 Meniň profilim",
      menuProfileSub: "Sargytlar, üýtgetmek, töleg",
      menuAnketa: "📝 Anketa doldurmak",
      menuAnketaSub: "Ussa hökmünde hasaba duruň",
      profileLoading: "Ýüklenýär...",
      prevPage: "⬅️ Öňki",
      nextPage: "Indiki ➡️",
      topishChooseViloyat: "Sebiti saýlaň",
      topishChooseTuman: "Etraby saýlaň (hökman däl)",
      topishSkipTuman: "— Bütin welaýat —",
      topishChooseXizmat: "Haýsy hyzmat gerek?",
      topishSearching: "Gözlenilýär...",
      topishWrite: "Ýazmak",
      topishBusy: "🔴 Häzir bent",
      topishFree: "🟢 Bent däl",
      complainBtn: "⚠️ Şikaýat",
      orderChooseViloyat: "Sebiti saýlaň",
      orderChooseXizmat: "Haýsy tehnika/pudak boýunça ussa gerek?",
      orderFormTitle: "Maglumatlaryňyzy giriziň",
      fIsm: "Ady",
      fFamilya: "Familiýasy",
      fTel: "Telefon belgisi",
      fMuammo: "Meseläniň beýany",
      fManzil: "Salgy",
      continueBtn: "Dowam etmek →",
      backToMenu: "🏠 Baş menýu",
      viloyat: "Sebit",
      xizmat: "Hyzmat",
      aboutText: "🏆 Biz kim?\nÝaşaýyş tehnikalaryny hünärmenlere mahsus abatlamak hyzmaty\n\n✅ Hyzmatlarymyz:\n• Telewizor abatlamak\n• Kondisioner hyzmaty\n• Sowadyjy abatlamak\n• Eşik ýuwujy maşyn\n• Printer abatlamak\n• Kompýuter we noutbuk\n• We beýleki ýaşaýyş tehnikalary\n\n⚡ Artykmaçlyklarymyz:\n• Çalt we hilli hyzmat\n• Kepillik berilýär\n• Öýüňize gelýäris\n• Tejribeli ussalar",
      contactTitle: "📞 Aragatnaşyk",
      contactHours: "⏰ Iş wagty:\nDuşenbe — Şenbe: 9:00 — 20:00\nÝekşenbe: 10:00 — 18:00",
      contactAddress: "📍 Daşkent şäheri",
      itemsCount: function(n){ return n + " ýagdaý"; },
      topishFound: function(n){ return n + " ussa tapyldy"; },
    },
  };
  ['kk','tg','ky','tk'].forEach(function(c){ STR[c] = Object.assign({}, STR.ru, STR_EXTRA[c]); });
  var LANGS = [
    { c: 'uz', n: "O'zbekcha", f: '<svg viewBox="0 0 24 16" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#fff"/><rect width="24" height="5.2" fill="#0099B5"/><rect y="5.2" width="24" height=".5" fill="#CE1126"/><rect y="10.3" width="24" height=".5" fill="#CE1126"/><rect y="10.8" width="24" height="5.2" fill="#1EB53A"/><circle cx="4.2" cy="2.7" r="1.7" fill="#fff"/><circle cx="4.9" cy="2.7" r="1.45" fill="#0099B5"/><circle cx="8" cy="1.4" r=".35" fill="#fff"/><circle cx="9.6" cy="1.4" r=".35" fill="#fff"/><circle cx="8.8" cy="2.9" r=".35" fill="#fff"/><circle cx="7.2" cy="2.9" r=".35" fill="#fff"/><circle cx="10.4" cy="2.9" r=".35" fill="#fff"/></svg>' },
    { c: 'ru', n: "Русский", f: '<svg viewBox="0 0 24 16" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#D52B1E"/><rect width="24" height="10.67" fill="#0039A6"/><rect width="24" height="5.33" fill="#fff"/></svg>' },
    { c: 'kk', n: "Қазақша", f: '<svg viewBox="0 0 24 16" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#00AFCA"/><circle cx="12" cy="7" r="3" fill="#FEC50C"/><circle cx="12" cy="7" r="4.1" fill="none" stroke="#FEC50C" stroke-width=".9" stroke-dasharray=".7 .6"/><path d="M6.5 12.2 Q12 10.2 17.5 12.2 Q12 13.4 6.5 12.2Z" fill="#FEC50C"/><rect x="1.2" y="1.5" width=".9" height="13" fill="#FEC50C" opacity=".85"/></svg>' },
    { c: 'tg', n: "Тоҷикӣ", f: '<svg viewBox="0 0 24 16" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#006600"/><rect width="24" height="11.43" fill="#fff"/><rect width="24" height="4.57" fill="#CC0000"/><path d="M10.2 9 Q12 5.8 13.8 9 Z" fill="#F8C300"/><circle cx="12" cy="5.7" r=".5" fill="#F8C300"/></svg>' },
    { c: 'ky', n: "Кыргызча", f: '<svg viewBox="0 0 24 16" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#E8112D"/><circle cx="12" cy="8" r="3.7" fill="#FFEF00"/><circle cx="12" cy="8" r="2.3" fill="#E8112D"/><circle cx="12" cy="8" r="5" fill="none" stroke="#FFEF00" stroke-width="1.3" stroke-dasharray=".55 .5"/><path d="M10.3 7.2 L13.7 8.8 M10.3 8.8 L13.7 7.2" stroke="#FFEF00" stroke-width=".5"/></svg>' },
    { c: 'tk', n: "Türkmençe", f: '<svg viewBox="0 0 24 16" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#00843D"/><rect x="3" width="4.2" height="16" fill="#D22630"/><circle cx="5.1" cy="4.2" r=".9" fill="#fff" opacity=".9"/><circle cx="5.1" cy="8" r=".9" fill="#fff" opacity=".9"/><circle cx="5.1" cy="11.8" r=".9" fill="#fff" opacity=".9"/><circle cx="11.4" cy="3.4" r="1.9" fill="#fff"/><circle cx="12.1" cy="3.4" r="1.6" fill="#00843D"/><circle cx="14.2" cy="2.3" r=".35" fill="#fff"/><circle cx="14.2" cy="3.4" r=".35" fill="#fff"/><circle cx="14.2" cy="4.5" r=".35" fill="#fff"/></svg>' },
  ];
  function langMeta(c){ for (var i=0;i<LANGS.length;i++) if (LANGS[i].c===c) return LANGS[i]; return LANGS[0]; }
  // Serverga faqat uz/ru yuboriladi (backend shu ikkitasini biladi); yangi tillar uchun rus tili.
  function srvLang(){ return state.lang === 'uz' ? 'uz' : 'ru'; }
  // Ruscha matn -> yangi tillar tarjimasi (asosiy sahifa, kurs lentasi, ob-havo)
  var XT = {"Техника": {"kk": "Техника", "tg": "Техника", "ky": "Техника", "tk": "Tehnika"}, "Запчасти, старая и Б/У техника": {"kk": "Қосалқы бөлшектер, ескі және Б/У техника", "tg": "Қисмҳои эҳтиётӣ, техникаи кӯҳна ва Б/У", "ky": "Запчасттар, эски жана Б/У техника", "tk": "Ätiýaçlyk bölekler, köne we ulanylan tehnika"}, "НОВОЕ": {"kk": "ЖАҢА", "tg": "НАВ", "ky": "ЖАҢЫ", "tk": "TÄZE"}, "В маркет": {"kk": "Маркетке кіру", "tg": "Ба маркет", "ky": "Маркетке кирүү", "tk": "Markete girmek"}, "Моя техника": {"kk": "Менің жабдықтарым", "tg": "Таҷҳизоти ман", "ky": "Менин шаймандарым", "tk": "Meniň enjamlarym"}, "Гарантия, история ремонта и напоминания": {"kk": "Кепілдік, жөндеу тарихы және еске салғыштар", "tg": "Кафолат, таърихи таъмир ва ёдраскунакҳо", "ky": "Кепилдик, оңдоо тарыхы жана эскертмелер", "tk": "Kepillik, abatlamak taryhy we ýatlatmalar"}, "Открыть мою технику": {"kk": "Жабдықтарымды ашу", "tg": "Кушодани таҷҳизоти ман", "ky": "Шаймандарымды ачуу", "tk": "Enjamlarymy açmak"}, "Паспорт дома": {"kk": "Үй паспорты", "tg": "Шиносномаи хона", "ky": "Үй паспорту", "tk": "Öýüň pasporty"}, "Калькулятор цен": {"kk": "Баға калькуляторы", "tg": "Калкулятори нархҳо", "ky": "Баа калькулятору", "tk": "Bahalar kalkulýatory"}, "Узнайте цену ремонта заранее": {"kk": "Жөндеу бағасын алдын ала біліңіз", "tg": "Нархи таъмирро пешакӣ бидонед", "ky": "Оңдоонун баасын алдын ала билиңиз", "tk": "Abatlamagyň bahasyny öňünden biliň"}, "Цены": {"kk": "Бағалар", "tg": "Нархҳо", "ky": "Баалар", "tk": "Bahalar"}, "Советчик по покупке": {"kk": "Сатып алу кеңесшісі", "tg": "Мушовири харид", "ky": "Сатып алуу боюнча кеңешчи", "tk": "Satyn almak maslahatçysy"}, "Какая техника вам подойдёт?": {"kk": "Қандай техника сізге сәйкес?", "tg": "Кадом техника ба шумо мувофиқ аст?", "ky": "Кайсы техника сизге ылайыктуу?", "tk": "Haýsy tehnika size laýyk?"}, "Совет": {"kk": "Кеңес", "tg": "Маслиҳат", "ky": "Кеңеш", "tk": "Maslahat"}, "Искать": {"kk": "Іздеу", "tg": "Ҷустуҷӯ", "ky": "Издөө", "tk": "Gözle"}, "Мастерская": {"kk": "Шеберхана", "tg": "Устохона", "ky": "Устакана", "tk": "Ussahana"}, "Карта": {"kk": "Карта", "tg": "Харита", "ky": "Карта", "tk": "Karta"}, "Найдите мастеров рядом на карте": {"kk": "Жақын маңдағы шеберлерді картадан табыңыз", "tg": "Устоҳои наздикро дар харита ёбед", "ky": "Жакын жердеги усталарды картадан табыңыз", "tk": "Ýakyndaky ussalary kartadan tapyň"}, "Открыть карту": {"kk": "Картаны ашу", "tg": "Кушодани харита", "ky": "Картаны ачуу", "tk": "Kartany açmak"}, "Заказ": {"kk": "Тапсырыс", "tg": "Фармоиш", "ky": "Буйрутма", "tk": "Sargyt"}, "Профиль": {"kk": "Профиль", "tg": "Профил", "ky": "Профиль", "tk": "Profil"}, "Стать мастером": {"kk": "Шебер болу", "tg": "Усто шудан", "ky": "Уста болуу", "tk": "Ussa bolmak"}, "Мы": {"kk": "Біз", "tg": "Мо", "ky": "Биз", "tk": "Biz"}, "Связь": {"kk": "Байланыс", "tg": "Тамос", "ky": "Байланыш", "tk": "Aragatnaşyk"}, "АНИМАЦИЯ": {"kk": "АНИМАЦИЯ", "tg": "АНИМАТСИЯ", "ky": "АНИМАЦИЯ", "tk": "ANIMASIÝA"}, "Привет": {"kk": "Сәлем", "tg": "Салом", "ky": "Салам", "tk": "Salam"}, "Гость": {"kk": "Қонақ", "tg": "Меҳмон", "ky": "Конок", "tk": "Myhman"}, "Все разделы здесь — выбирайте": {"kk": "Барлық бөлімдер осында — таңдаңыз", "tg": "Ҳамаи бахшҳо дар ин ҷост — интихоб кунед", "ky": "Бардык бөлүмдөр ушул жерде — тандаңыз", "tk": "Ähli bölümler şu ýerde — saýlaň"}, "Моё местоположение": {"kk": "Менің орналасқан жерім", "tg": "Ҷойгиршавии ман", "ky": "Менин жайгашкан жерим", "tk": "Meniň ýerleşýän ýerim"}, "Ощущается": {"kk": "Сезіледі", "tg": "Ҳис мешавад", "ky": "Сезилет", "tk": "Duýulýar"}, "Загрузка погоды…": {"kk": "Ауа райы жүктелуде…", "tg": "Обуҳаво бор шуда истодааст…", "ky": "Аба ырайы жүктөлүүдө…", "tk": "Howa maglumaty ýüklenýär…"}, "Доллар": {"kk": "Доллар", "tg": "Доллар", "ky": "Доллар", "tk": "Dollar"}, "Евро": {"kk": "Еуро", "tg": "Евро", "ky": "Евро", "tk": "Ýewro"}, "Золото": {"kk": "Алтын", "tg": "Тилло", "ky": "Алтын", "tk": "Altyn"}, "Серебро": {"kk": "Күміс", "tg": "Нуқра", "ky": "Күмүш", "tk": "Kümüş"}, "Биткоин": {"kk": "Биткоин", "tg": "Биткоин", "ky": "Биткоин", "tk": "Bitkoin"}, "Нефть": {"kk": "Мұнай", "tg": "Нафт", "ky": "Мунай", "tk": "Nebit"}, "Ясно": {"kk": "Ашық аспан", "tg": "Осмони софо", "ky": "Ачык асман", "tk": "Açyk asman"}, "Облачно": {"kk": "Бұлтты", "tg": "Абрнок", "ky": "Булуттуу", "tk": "Bulutly"}, "Туман": {"kk": "Тұман", "tg": "Туман", "ky": "Туман", "tk": "Duman"}, "Морось": {"kk": "Сіркіреген жаңбыр", "tg": "Борони майда", "ky": "Майда жамгыр", "tk": "Ownuk ýagyş"}, "Дождь": {"kk": "Жаңбыр", "tg": "Борон", "ky": "Жамгыр", "tk": "Ýagyş"}, "Идёт снег": {"kk": "Қар жауып тұр", "tg": "Барф меборад", "ky": "Кар жаап жатат", "tk": "Gar ýagýar"}, "Гроза": {"kk": "Найзағай", "tg": "Раъду барқ", "ky": "Күн күркүрөө", "tk": "Güldürewük"}};
  function tr(ru){ if (state.lang === 'uz' || state.lang === 'ru') return ru; var e = XT[ru]; return (e && e[state.lang]) || ru; }
  var OFERTA_KEY = 'cynet_oferta_accepted';

  var state = {
    lang: (function(){ var l = localStorage.getItem('cynet_lang'); return (l && STR[l]) ? l : 'uz'; })(),
    stack: [{ view: (localStorage.getItem(OFERTA_KEY) === '1') ? 'mainMenu' : 'oferta' }],
    orderForm: {},
    anketaForm: {}
  };
  var illusTimer = null;

  function t(){ return STR[state.lang]; }
  function L(uzKey, ruKey){ return state.lang === 'uz' ? uzKey : tr(ruKey); }
  function pick(obj, base){ return obj[base + '_' + state.lang] || (state.lang !== 'uz' ? obj[base + '_ru'] : '') || obj[base]; }

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
    if (entry.view === 'hubUstaxona') return L('Ustaxona','Мастерская');
    if (entry.view === 'hubProfil') return L('Profil','Профиль');
    if (entry.view === 'hubUskuna') return L('Uskunalarim','Моя техника');
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
    if (entry.view === 'info') return L('Biz haqimizda','О нас');
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
    if (entry.view === 'faceCapture') return L('Yuzni tasdiqlash','Подтверждение лица');
    if (entry.view === 'calc') return L('Narx kalkulyatori','Калькулятор цен');
    if (entry.view === 'advisor') return L('Maslahatchi','Советчик');
    if (entry.view === 'devices') return L('Uskunalarim','Моя техника');
    if (entry.view === 'deviceForm') return entry.id ? L('Tahrirlash','Изменить') : L("Qo'shish","Добавить");
    if (entry.view === 'device') return null;
    if (entry.view === 'deviceHistoryForm') return L('Yozuv','Запись');
    if (entry.view === 'deviceReminderForm') return L('Eslatma','Напоминание');
    if (entry.view === 'market') return 'Market';
    if (entry.view === 'marketBu') return L('B/U texnika','Б/У техника');
    if (entry.view === 'marketBuForm') return L("E'lon berish",'Подать объявление');
    if (entry.view === 'marketBuMy') return L("Mening e'lonlarim",'Мои объявления');
    if (entry.view === 'foyd') return L('Foydali ilovalar','Полезные приложения');
    if (entry.view === 'marketCats') return L('Ehtiyot qismlar','Запчасти');
    if (entry.view === 'marketParts') { var mc = catById(entry.cat); return mc ? pick(mc, 'name') : ''; }
    if (entry.view === 'marketPart') return null;
    if (entry.view === 'marketCart') return L('Savatcha','Корзина');
    if (entry.view === 'marketCheckout') return L('Yetkazib berish','Доставка');
    if (entry.view === 'marketPay') return L("To'lov",'Оплата');
    if (entry.view === 'marketDone' || entry.view === 'marketOrder') return L('Buyurtma','Заказ');
    if (entry.view === 'marketOrders') return L('Buyurtmalarim','Мои заказы');
    if (entry.view === 'marketAdj') return 'Chip reset';
    if (entry.view === 'marketAdjItem') return null;
    if (entry.view === 'marketAdjPay') return L("To'lov",'Оплата');
    if (entry.view === 'marketAdjDone') return L('Buyurtma','Заказ');
    if (entry.view === 'marketAdjOrders') return L('Xaridlarim','Мои покупки');
    if (entry.view === 'feedback') return L("Taklif va e'tirozlar",'Предложения и претензии');
    if (entry.view === 'guide') return L("Qo'llanma",'Руководство');
    if (entry.view === 'guideTech') { var gm = gdMeta(entry.gid); return gm ? gm.name : ''; }
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
        init_data: getInitData(), lang: srvLang(),
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

  var infoHost = null;
  function ihost(){ return (infoHost && infoHost.isConnected) ? infoHost : mainView; }

  function renderInfo(entry){
    var tab = state.infoTab || 'about';
    var tabs = [['about','🏆',L('Biz haqimizda','О нас')],['contact','📞',L("Bog'lanish",'Связь')],['feedback','💬',L("Taklif",'Отзыв')]];
    var idx = Math.max(0, tabs.map(function(x){ return x[0]; }).indexOf(tab));
    mainView.innerHTML =
      '<div class="view info-view">' +
      '<div class="info-hero"><div class="info-orb"><i></i><i></i><span>' + tabs[idx][1] + '</span></div>' +
      '<div class="info-ht"><b>Online Ustaxona</b><span>' + L("Ishonchli ustalar — bir joyda",'Надёжные мастера — в одном месте') + '</span></div></div>' +
      '<div class="info-tabs" data-i="' + idx + '"><u></u>' +
      tabs.map(function(x, i){ return '<button type="button" data-it="' + x[0] + '" class="' + (i === idx ? 'on' : '') + '"><em>' + x[1] + '</em><span>' + x[2] + '</span></button>'; }).join('') +
      '</div><div class="info-body" id="infoBody"></div></div>';
    var body = document.getElementById('infoBody');
    infoHost = body;
    function show(k){
      state.infoTab = k;
      var i = Math.max(0, tabs.map(function(x){ return x[0]; }).indexOf(k));
      var bar = mainView.querySelector('.info-tabs'); if (bar) bar.setAttribute('data-i', i);
      mainView.querySelectorAll('[data-it]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-it') === k); });
      var orb = mainView.querySelector('.info-orb span'); if (orb) orb.textContent = tabs[i][1];
      body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
      if (k === 'contact') renderContact(); else if (k === 'feedback') renderFeedback(); else renderAbout();
    }
    mainView.querySelectorAll('[data-it]').forEach(function(b){
      b.addEventListener('click', function(){ if (b.classList.contains('on')) return; haptic('select'); show(b.getAttribute('data-it')); });
    });
    show(tabs[idx][0]);
  }

  function renderAbout(){
    ihost().innerHTML =
      '<div class="view"><div class="detail-head"><h2>' + t().aboutTitle + '</h2></div>' +
      '<div class="panel"><p class="ptext" style="white-space:pre-line">' + esc(t().aboutText) + '</p></div>' +
      '<div class="panel dashed"><p class="ptext">' + esc(t().contactAddress) + '<br>📞 ' + esc(t().contactPhone) + '<br>✈️ @online_ustaxona<br>📸 @online_ustaxona</p></div>' +
      '</div>';
  }

  function renderContact(){
    ihost().innerHTML =
      '<div class="view"><div class="detail-head"><h2>' + t().contactTitle + '</h2></div>' +
      '<div class="panel">' +
      '<p class="ptext" style="font-size:16px;color:var(--text-1);font-weight:600;margin-bottom:10px">' +
      '<a href="tel:' + esc(t().contactPhone.replace(/\s/g,'')) + '" style="color:var(--cyan);text-decoration:none">📞 ' + esc(t().contactPhone) + '</a></p>' +
      '<p class="ptext" style="margin-bottom:10px"><a href="https://t.me/online_ustaxona" target="_blank" style="color:var(--cyan);text-decoration:none">✈️ Telegram: @online_ustaxona</a></p>' +
      '<p class="ptext"><a href="https://www.instagram.com/online_ustaxona" target="_blank" rel="noopener" style="color:var(--cyan);text-decoration:none">📸 Instagram: @online_ustaxona</a></p>' +
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
      (m.face_verified === false ? '<button class="row" id="btnMasterFace"><span class="idx">🧑</span><span class="lbl">' + L('Yuzni tasdiqlash','Подтвердить лицо') + '</span><span class="chev">→</span></button>' : '') +
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
    var faceBtn = mainView.querySelector('#btnMasterFace');
    if (faceBtn) faceBtn.addEventListener('click', function(){ haptic('select'); lvInjectCss(); push({ view:'faceCapture', mode:'profile', master: m }); });
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
      '<div class="field"><label>🧑 ' + L('Yuzni tasdiqlash','Подтверждение лица') + '</label>' +
      '<button type="button" class="fv-open' + (f.face_photos ? ' got' : '') + '" id="afFaceBtn"><span>' +
      (f.face_photos ? '✅ ' + L('Yuz tasdiqlandi (qayta olish)','Лицо подтверждено (переснять)') : '📸 ' + L('Kamera orqali yuzni tasdiqlash','Подтвердить лицо через камеру')) + '</span>' +
      (f.face_photos ? '<span class="fv-mini">' + f.face_photos.map(function(u){ return '<i style="background-image:url(' + u + ')"></i>'; }).join('') + '</span>' : '') + '</button>' +
      '<div class="note" style="margin-top:6px">🔒 ' + L('Suratlar shaxsingizni tasdiqlash uchun saqlanadi','Снимки сохраняются для подтверждения вашей личности') + '</div></div>' +
      '</div>' +
      '<button class="loc-btn" id="afLocBtn">' + (f.lat ? t().topishLocGot : t().anketaLocHint) + '</button>' +
      '</div>';

    if (f.photo_b64) {
      mainView.querySelector('#afPhotoThumb').style.backgroundImage = 'url(' + f.photo_b64 + ')';
    }
    if (f.lat) mainView.querySelector('#afLocBtn').classList.add('got');

    lvInjectCss();
    mainView.querySelector('#afFaceBtn').addEventListener('click', function(){
      var af = state.anketaForm;
      af.ism = mainView.querySelector('#afIsm').value; af.yil = mainView.querySelector('#afYil').value;
      af.telefon = mainView.querySelector('#afTel').value; af.pasport = mainView.querySelector('#afPasport').value;
      af.xizmatlar = Array.prototype.slice.call(mainView.querySelectorAll('#afXizmatlar .chip-toggle.active')).map(function(b){ return b.getAttribute('data-x'); });
      haptic('select');
      push({ view:'faceCapture', mode:'anketa' });
    });
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
      var facePh = state.anketaForm.face_photos;
      if (!facePh || facePh.length !== 3) {
        alert(L("Iltimos, kamera orqali yuzingizni tasdiqlang","Пожалуйста, подтвердите лицо через камеру"));
        return;
      }

      state.anketaForm = {
        ism: ism, yil: yil, telefon: telefon, pasport: pasport, xizmatlar: xizmatlar,
        photo_b64: photo_b64, lat: state.anketaForm.lat, lon: state.anketaForm.lon,
        tuman_list: state.anketaForm.tuman_list,
        face_photos: facePh, face_detector: !!state.anketaForm.face_detector
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

    apiGet('/api/public/anketa/shartnoma?lang=' + srvLang()).then(function(res){
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
        init_data: getInitData(), lang: srvLang(),
        viloyat: entry.viloyat, tuman_list: f.tuman_list,
        ism: f.ism, yil: f.yil, telefon: f.telefon, pasport: f.pasport,
        xizmatlar: f.xizmatlar, photo_b64: f.photo_b64,
        lat: f.lat, lon: f.lon, shartnoma_imzo: true,
        face_photos: f.face_photos, face_steps: ['front','left','right'], face_detector: !!f.face_detector
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
    "printer_epson_10": {
      device: "🖨️",
      scene: "epdamper",
      steps: [
        { icon:"🖨️", caption_uz:"Nozzle Check chop eting: ba'zi ranglar chiziqlari yo'q yoki uzilgan", caption_ru:"Напечатайте Nozzle Check: у некоторых цветов нет линий или они прерываются" },
        { icon:"🔌", caption_uz:"Printerni o'chiring, kabelni rozetkadan uzing (karetka o'rtada tursin)", caption_ru:"Выключите принтер, выдерните кабель (каретка в центре)" },
        { icon:"🔍", caption_uz:"Chiqmayotgan rang damperini toping: karetkadagi shaffof blok, ustida nipel", caption_ru:"Найдите демпфер нужного цвета: прозрачный блок на каретке с ниппелем" },
        { icon:"💉", caption_uz:"Shpritsga (10–20 ml, ignasiz) silikon naycha kiygizib, nipelga ulang", caption_ru:"Наденьте на шприц (10–20 мл, без иглы) силиконовую трубку и подключите к ниппелю" },
        { icon:"🫧", caption_uz:"Pistonni JUDA SEKIN torting: avval havo pufakchalari, so'ng siyoh keladi (3–5 ml)", caption_ru:"ОЧЕНЬ МЕДЛЕННО потяните поршень: сначала пузырьки воздуха, затем чернила (3–5 мл)" },
        { icon:"✅", caption_uz:"Siyoh pufaksiz oqqach to'xtang, shpritsni ajrating, asl naychani joyiga kiying", caption_ru:"Когда чернила идут без пузырей — остановитесь, снимите шприц, наденьте родную трубку" },
        { icon:"🧹", caption_uz:"Printerni yoqing: 1 marta Head Cleaning va Nozzle Check — hamma ranglar chiqdi!", caption_ru:"Включите принтер: 1 прочистка и Nozzle Check — все цвета печатают!" },
      ],
    },
    "printer_canon_p07": {
      device: "🖨️",
      scene: "p07",
      steps: [
        { icon:"🔌", caption_uz:"P07 chiqdi: printerni o'chiring (kabel rozetkada tursin)", caption_ru:"Появилась P07: выключите принтер (кабель оставьте в розетке)" },
        { icon:"⏻", caption_uz:"POWER tugmasini 5 soniya bosib turing", caption_ru:"Удерживайте кнопку POWER 5 секунд" },
        { icon:"⏹️", caption_uz:"STOP tugmasini (qizil doira ichidagi uchburchak) 5 marta bosing", caption_ru:"Нажмите кнопку STOP (треугольник в красном круге) 5 раз" },
        { icon:"⏳", caption_uz:"Biroz kuting — POWER yonidagi chiroq yonguncha", caption_ru:"Немного подождите — пока загорится индикатор у POWER" },
        { icon:"⏹️", caption_uz:"Chiroq yonganidan so'ng STOP ni yana 5 marta bosing", caption_ru:"Когда индикатор загорится, снова нажмите STOP 5 раз" },
        { icon:"⏻", caption_uz:"POWER tugmasini 1 marta bosing", caption_ru:"Нажмите POWER один раз" },
        { icon:"📄", caption_uz:"Qog'oz bo'lsa — displeyda P.0.0 chiqadi va qog'oz chiqib keladi", caption_ru:"Если есть бумага — на дисплее P.0.0 и бумага выходит" },
        { icon:"🔄", caption_uz:"Printerni o'chirib qayta yoqing — tayyor!", caption_ru:"Выключите и снова включите принтер — готово!" },
      ],
    },
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

  // ---- P07 sahnasi uchun maxsus CSS (qadam raqami .vp[data-step] bo'yicha almashadi) ----
  function p7InjectCss(){
    if (document.getElementById('p7Css')) return;
    var hide = [];
    for (var i = 0; i < 8; i++) hide.push('.vp:not([data-step="' + i + '"]) .p7-' + i);
    var css = hide.join(',') + '{display:none}\n' +
      '.p7n{opacity:0;animation:p7show 3.4s linear infinite}\n' +
      '@keyframes p7show{0%{opacity:0}2%{opacity:1}19%{opacity:1}21%{opacity:0}100%{opacity:0}}\n' +
      '.p7f{transform-box:fill-box;transform-origin:center;animation:p7tap .68s ease-in-out 5}\n' +
      '.p7f.p7-tap1{animation:p7tap .68s ease-in-out 2 .3s}\n' +
      '.p7f.p7-hold{animation:p7hold .5s ease-out forwards}\n' +
      '@keyframes p7tap{0%,100%{transform:translateY(0)}45%{transform:translateY(-9px)}}\n' +
      '@keyframes p7hold{to{transform:translateY(-9px)}}\n' +
      '.p7-ring{stroke-dasharray:100;stroke-dashoffset:100;animation:p7ring 3.4s linear forwards}\n' +
      '@keyframes p7ring{to{stroke-dashoffset:0}}\n' +
      '.p7-led-late{opacity:0;animation:p7led 3.4s linear forwards}\n' +
      '@keyframes p7led{0%,60%{opacity:0}66%,100%{opacity:1}}\n' +
      '.p7-onoff{animation:p7onoff 3.4s linear infinite}\n' +
      '@keyframes p7onoff{0%,12%{opacity:1}14%,52%{opacity:0}54%,100%{opacity:1}}\n' +
      '.vp[data-step="1"] .p7-pw{transform-box:fill-box;transform-origin:center;animation:p7holdbtn 3.4s ease-out forwards}\n' +
      '@keyframes p7holdbtn{0%{transform:scale(1)}8%,100%{transform:scale(.88)}}\n' +
      '.vp[data-step="2"] .p7-st,.vp[data-step="4"] .p7-st{transform-box:fill-box;transform-origin:center;animation:p7push .68s ease-in-out 5}\n' +
      '.vp[data-step="5"] .p7-pw{transform-box:fill-box;transform-origin:center;animation:p7push .68s ease-in-out 2 .3s}\n' +
      '.vp[data-step="7"] .p7-pw{transform-box:fill-box;transform-origin:center;animation:p7push .68s ease-in-out 2 .2s}\n' +
      '@keyframes p7push{0%,100%{transform:scale(1)}45%{transform:scale(.84)}}\n';
    var st = document.createElement('style'); st.id = 'p7Css'; st.textContent = css; document.head.appendChild(st);
  }

  // ---- Epson "ba'zi ranglar chiqmaydi" (damperdan havo chiqarish) sahnasi uchun CSS ----
  function edInjectCss(){
    if (document.getElementById('edCss')) return;
    var css = '';
    function only(cls, list){
      var sel = list.map(function(i){ return ':not([data-step="' + i + '"])'; }).join('');
      css += '.vp' + sel + ' .' + cls + '{display:none}\n';
    }
    only('ed-bad', [0]); only('ed-ok', [6]); only('ed-car', [1,2,3,4,5]);
    only('ed-s1', [1]); only('ed-s2', [2]); only('ed-air', [1,2,3]); only('ed-rise', [4]);
    only('ed-tube', [1,2,5]); only('ed-tubeoff', [3,4]); only('ed-syr', [3,4,5]);
    only('ed-hint', [4]); only('ed-done', [5]);
    css += '@keyframes ed-move{from{transform:translateX(-34px)}to{transform:none}}\n' +
      '.vp[data-step="1"] .ed-carg{animation:ed-move 2.6s ease-in-out forwards}\n' +
      '@keyframes ed-in{from{transform:translateY(-46px);opacity:0}to{transform:none;opacity:1}}\n' +
      '.vp[data-step="3"] .ed-syr{animation:ed-in 1.8s ease-out forwards}\n' +
      '@keyframes ed-pull{to{transform:translateY(-18px)}}\n' +
      '.vp[data-step="4"] .ed-plg{animation:ed-pull 3.4s ease-in-out forwards}\n' +
      '.vp[data-step="5"] .ed-plg{transform:translateY(-18px)}\n' +
      '.ed-liq{transform-box:fill-box;transform-origin:center bottom;transform:scaleY(.03)}\n' +
      '@keyframes ed-fill{to{transform:scaleY(.75)}}\n' +
      '.vp[data-step="4"] .ed-liq{animation:ed-fill 3.4s ease-in-out forwards}\n' +
      '.vp[data-step="5"] .ed-liq{transform:scaleY(.75)}\n' +
      '@keyframes ed-away{to{transform:translateY(-70px);opacity:0}}\n' +
      '.vp[data-step="5"] .ed-syr{animation:ed-away 1.6s ease-in .6s forwards}\n';
    var st = document.createElement('style'); st.id = 'edCss'; st.textContent = css; document.head.appendChild(st);
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
    p07: function(){
      var nums = function(arr, x, y, cls, fill){
        return arr.map(function(n, i){
          return '<text class="p7n ' + cls + '" style="animation-delay:' + (i * 0.68).toFixed(2) + 's" x="' + x + '" y="' + y + '" text-anchor="middle" font-size="34" font-weight="900" fill="' + fill + '">' + n + '</text>';
        }).join('');
      };
      var finger = function(x, cls, extra){
        return '<text class="p7f ' + cls + '" x="' + x + '" y="166" font-size="30" text-anchor="middle" ' + (extra || '') + '>👆</text>';
      };
      return '<ellipse cx="115" cy="198" rx="96" ry="7" fill="rgba(0,0,0,.28)"/>' +
        '<rect x="62" y="18" width="106" height="58" rx="6" fill="#fff"/><g stroke="#cfd5ea" stroke-width="3"><path d="M72 34 h86 M72 46 h86 M72 58 h60"/></g>' +
        '<rect x="10" y="72" width="210" height="106" rx="20" fill="#eef1fa"/><rect x="10" y="72" width="210" height="106" rx="20" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
        '<rect x="22" y="82" width="186" height="58" rx="10" fill="#d9deef"/>' +
        /* displey */
        '<rect x="30" y="90" width="64" height="42" rx="6" fill="#0b1226"/>' +
        '<g class="p7-0"><text class="sv-blink" x="62" y="119" text-anchor="middle" font-size="24" font-weight="800" fill="#ff5a5a" font-family="JetBrains Mono,monospace">P07</text></g>' +
        '<g class="p7-6"><text x="62" y="119" text-anchor="middle" font-size="18" font-weight="800" fill="#4dff88" font-family="JetBrains Mono,monospace">P.0.0</text></g>' +
        '<g class="p7-7"><text class="p7-onoff" x="62" y="119" text-anchor="middle" font-size="18" font-weight="800" fill="#4dff88" font-family="JetBrains Mono,monospace">P.0.0</text></g>' +
        /* chiroq (POWER yonida) */
        '<circle cx="125" cy="94" r="4" fill="#9aa3bd"/>' +
        '<g class="p7-3"><circle class="p7-led-late" cx="125" cy="94" r="4.5" fill="#34e07a"/></g>' +
        '<g class="p7-4"><circle cx="125" cy="94" r="4.5" fill="#34e07a"/></g><g class="p7-5"><circle cx="125" cy="94" r="4.5" fill="#34e07a"/></g><g class="p7-6"><circle cx="125" cy="94" r="4.5" fill="#34e07a"/></g>' +
        '<g class="p7-7"><circle class="p7-onoff" cx="125" cy="94" r="4.5" fill="#34e07a"/></g>' +
        /* POWER tugmasi */
        '<g class="p7-pw"><circle cx="125" cy="113" r="14" fill="#2a2f45" stroke="#8892b8" stroke-width="2"/>' +
        '<path d="M120 108.5 A7.5 7.5 0 1 0 130 108.5" fill="none" stroke="#e8ecff" stroke-width="2.2" stroke-linecap="round"/><path d="M125 105 V113" stroke="#e8ecff" stroke-width="2.2" stroke-linecap="round"/></g>' +
        '<text x="125" y="136" text-anchor="middle" font-size="6.5" font-weight="800" fill="#5b6488">POWER</text>' +
        /* STOP tugmasi */
        '<g class="p7-st"><circle cx="178" cy="113" r="14" fill="#e53935" stroke="#ff9a97" stroke-width="2"/>' +
        '<path d="M178 105.5 L186 119 L170 119 Z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></g>' +
        '<text x="178" y="136" text-anchor="middle" font-size="6.5" font-weight="800" fill="#5b6488">STOP</text>' +
        /* qadamlar */
        '<g class="p7-1">' + finger(125, 'p7-hold') + '<circle class="p7-ring" cx="125" cy="113" r="19" pathLength="100" transform="rotate(-90 125 113)" fill="none" stroke="#47f0ff" stroke-width="3.5" stroke-linecap="round"/>' +
          nums([5,4,3,2,1], 192, 56, 'p7-cd', '#47f0ff') + '<text x="192" y="70" text-anchor="middle" font-size="9" font-weight="800" fill="#7a86b0">' + L("soniya","сек") + '</text></g>' +
        '<g class="p7-2">' + finger(178, 'p7-tap5') + nums([1,2,3,4,5], 192, 56, 'p7-cd', '#ff7a76') + '</g>' +
        '<g class="p7-3"><text class="sv-bob" x="190" y="54" font-size="30">⏳</text></g>' +
        '<g class="p7-4">' + finger(178, 'p7-tap5') + nums([1,2,3,4,5], 192, 56, 'p7-cd', '#ff7a76') + '</g>' +
        '<g class="p7-5">' + finger(125, 'p7-tap1') + '<text class="sv-pulse" x="192" y="56" text-anchor="middle" font-size="30" font-weight="900" fill="#47f0ff">×1</text></g>' +
        '<g class="p7-6"><clipPath id="p7c"><rect x="30" y="150" width="170" height="50"/></clipPath>' +
          '<rect x="30" y="146" width="170" height="8" rx="4" fill="#1b1f33"/>' +
          '<g clip-path="url(#p7c)"><g class="sv-feed"><rect x="62" y="128" width="106" height="60" fill="#fff" rx="3"/><path d="M72 142 h86 M72 154 h70 M72 166 h86" stroke="#4a5bd0" stroke-width="3.5"/></g></g></g>' +
        '<g class="p7-7"><g class="sv-pulse"><circle cx="192" cy="50" r="16" fill="#2fd27a"/><path d="M184 50 l6 7 l12 -15" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>';
    },
    epdamper: function(){
      var cols = ['#23232b', '#00b7ff', '#ff2bd0', '#ffe14a', '#8fe3ff', '#ff9be8'];
      var names = ['K', 'C', 'M', 'Y', 'LC', 'LM'];
      var HI = 5, hx = 43 + 24 * HI + 9;             // muammoli damper (LM) markazi
      /* ---- Nozzle Check varag'i (0 va 6-qadam) ---- */
      var sheet = function(ok){
        var s = '<rect x="30" y="10" width="170" height="156" rx="7" fill="#fff"/>' +
          '<text x="115" y="26" text-anchor="middle" font-size="9" font-weight="800" fill="#59627f">NOZZLE CHECK</text>';
        for (var i = 0; i < 6; i++) {
          var y = 42 + i * 19, bad = !ok && (i === 2 || i === 5);
          s += '<text x="40" y="' + (y + 6) + '" font-size="8" font-weight="800" fill="#59627f">' + names[i] + '</text>';
          for (var j = 0; j < 4; j++) {
            var x = 62 + j * 34;
            if (bad && j % 2 === 0) s += '<rect x="' + x + '" y="' + y + '" width="28" height="7" rx="3.5" fill="none" stroke="#c3c8da" stroke-width="1.2" stroke-dasharray="3 3"/>';
            else s += '<rect x="' + x + '" y="' + y + '" width="28" height="7" rx="3.5" fill="' + cols[i] + '"/>';
          }
          if (bad) s += '<rect class="sv-blink" x="36" y="' + (y - 5) + '" width="160" height="17" rx="8" fill="none" stroke="#ff4d4d" stroke-width="2"/>';
        }
        return s;
      };
      /* ---- karetka + dampherlar ---- */
      var dampers = '', tubes = '', labels = '';
      for (var i = 0; i < 6; i++) {
        var x = 43 + 24 * i, cx = x + 9, full = (i !== HI);
        dampers += '<rect x="' + x + '" y="72" width="18" height="36" rx="4" fill="' + cols[i] + '" fill-opacity=".85" stroke="rgba(255,255,255,.6)" stroke-width="1.4"/>' +
          '<rect x="' + (cx - 2.5) + '" y="64" width="5" height="9" rx="1.5" fill="#9aa3bd"/>';
        labels += '<text x="' + cx + '" y="94" text-anchor="middle" font-size="7.5" font-weight="900" fill="' + (i === 0 ? '#fff' : '#161a33') + '">' + names[i] + '</text>';
        if (i !== HI) tubes += '<path d="M' + cx + ' 64 V20" stroke="' + cols[i] + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
      }
      var carriage =
        '<g class="ed-car"><g transform="translate(-24 -4) scale(1.18)"><rect x="22" y="40" width="178" height="5" rx="2.5" fill="#3b4163"/>' +
        '<g class="ed-carg">' +
          tubes +
          '<g class="ed-tube"><path d="M' + hx + ' 64 V20" stroke="' + cols[HI] + '" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
          '<g class="ed-tubeoff"><path d="M' + (hx + 12) + ' 18 C ' + (hx + 28) + ' 26, ' + (hx + 40) + ' 40, ' + (hx + 34) + ' 58" stroke="' + cols[HI] + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<circle cx="' + (hx + 34) + '" cy="60" r="2.6" fill="#fff" fill-opacity=".85"/></g>' +
          '<rect x="36" y="56" width="152" height="94" rx="14" fill="#262b47" fill-opacity=".92" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
          '<rect x="44" y="112" width="136" height="24" rx="7" fill="#3b4163"/>' +
          '<g fill="#9aa3bd">' + (function(){ var d = ''; for (var k = 0; k < 17; k++) d += '<circle cx="' + (52 + k * 7.6) + '" cy="128" r="1.4"/>'; return d; })() + '</g>' +
          dampers + labels +
          /* damperdagi havo pufakchalari */
          '<g class="ed-air"><circle cx="' + (hx - 3) + '" cy="79" r="3.2" fill="#fff" fill-opacity=".92"/><circle cx="' + (hx + 3) + '" cy="86" r="2.2" fill="#fff" fill-opacity=".92"/><circle cx="' + (hx - 2) + '" cy="93" r="1.6" fill="#fff" fill-opacity=".85"/></g>' +
        '</g>' +
        /* 1-qadam: o'chirish belgisi */
        '<g class="ed-s1"><text x="204" y="34" text-anchor="middle" font-size="26">🔌</text><text class="sv-blink" x="204" y="60" text-anchor="middle" font-size="12" font-weight="900" fill="#ff5a5a">OFF</text></g>' +
        /* 2-qadam: muammoli damperni ajratib ko'rsatish */
        '<g class="ed-s2"><rect class="sv-pulse" x="' + (hx - 13) + '" y="62" width="26" height="50" rx="8" fill="none" stroke="#ffb02e" stroke-width="2.6"/>' +
          '<text class="sv-bob" x="' + hx + '" y="52" text-anchor="middle" font-size="20">👇</text></g>' +
        /* 3-5: shprits */
        '<g class="ed-syr">' +
          '<path d="M' + hx + ' 56 V66" stroke="#cfd8ff" stroke-width="3.2" stroke-linecap="round" opacity=".9"/>' +
          '<rect x="' + (hx - 8) + '" y="20" width="16" height="36" rx="2.5" fill="rgba(230,240,255,.16)" stroke="#cfd8ff" stroke-width="1.6"/>' +
          '<path d="M' + (hx - 8) + ' 30 h5 M' + (hx - 8) + ' 38 h5 M' + (hx - 8) + ' 46 h5" stroke="#cfd8ff" stroke-width="1"/>' +
          '<rect class="ed-liq" x="' + (hx - 6.5) + '" y="30" width="13" height="24" fill="' + cols[HI] + '" fill-opacity=".92"/>' +
          '<g class="ed-plg"><rect x="' + (hx - 7.5) + '" y="50" width="15" height="4.5" rx="1.5" fill="#2a2f45"/><rect x="' + (hx - 1.6) + '" y="14" width="3.2" height="37" fill="#cfd8ff"/><rect x="' + (hx - 9) + '" y="10" width="18" height="4" rx="2" fill="#e8ecff"/></g>' +
        '</g>' +
        /* 4: yuqoriga ko'tarilayotgan havo pufakchalari + eslatma */
        '<g class="ed-rise"><circle class="sv-rise" cx="' + hx + '" cy="84" r="2.6" fill="#fff"/><circle class="sv-rise" style="animation-delay:.8s" cx="' + (hx - 2) + '" cy="88" r="2" fill="#fff"/><circle class="sv-rise" style="animation-delay:1.6s" cx="' + (hx + 2) + '" cy="82" r="2.3" fill="#fff"/></g>' +

        /* 5: tayyor */
        '<g class="ed-done"><g class="sv-pulse"><circle cx="204" cy="84" r="14" fill="#2fd27a"/><path d="M197 84 l5 6 l10 -13" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
        '</g></g>';
      return '<ellipse cx="115" cy="200" rx="90" ry="6" fill="rgba(0,0,0,.28)"/>' +
        '<g class="ed-bad">' + sheet(false) + '</g>' +
        '<g class="ed-ok">' + sheet(true) + '<g class="sv-pulse"><circle cx="190" cy="26" r="13" fill="#2fd27a"/><path d="M183 26 l5 6 l10 -13" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
        carriage +
        '<g class="ed-hint"><text class="sv-pulse" x="115" y="186" text-anchor="middle" font-size="14" font-weight="900" fill="#ffe08a">' + L('Juda sekin! 3–5 ml', 'Очень медленно! 3–5 мл') + '</text></g>';
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
  var mxState = { data:null, wx:null, wxStatus:null, region:null, timer:null, wxTimer:null, fx:null, alive:false };

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
      var val = it && it.v != null ? (state.lang !== 'uz' && d.fmtRu ? d.fmtRu(it.v) : d.fmt(it.v)) : '…';
      var ch = it && it.ch != null && !isNaN(it.ch) ? it.ch : null;
      var cls = ch == null ? '' : (ch > 0 ? ' up' : (ch < 0 ? ' down' : ''));
      var chTxt = ch == null ? '' : '<em class="mx-ch">' + (ch > 0 ? '▲' : (ch < 0 ? '▼' : '•')) + ' ' + Math.abs(ch).toFixed(2) + '%</em>';
      return '<span class="mx-chip' + cls + '"><b class="mx-ic">' + d.ic + '</b><span class="mx-nm">' + (state.lang === 'uz' ? d.uz : tr(d.ru)) +
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
  // Faqat foydalanuvchi joylashuvi bosilganda aniqlangan koordinatalar ishlatiladi.
  function wxRegion(){
    var id = mxLoad(WX_REGION_KEY);
    if (id && id.geo && isFinite(id.lat) && isFinite(id.lon)) return { id:'geo', lat:id.lat, lon:id.lon };
    return null;
  }
  function wxForced(){
    var m = /[?&]wx=(clear|cloud|fog|drizzle|rain|snow|storm)/.exec(location.search || '');
    return m ? m[1] : null;
  }
  function wxFetch(){
    var r = mxState.region = wxRegion();
    if (!r) return Promise.reject(new Error('no-location'));
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
    var w = mxState.wx, st = mxState.wxStatus;
    var body, top;
    if (w) {
      var tx = WX_TXT[w.kind] || WX_TXT.cloud;
      top = '<div class="wx-top"><button type="button" class="wx-loc" id="wxLoc" aria-label="' + L('Joylashuvni yangilash','Обновить местоположение') + '">' +
        '<span class="wx-pin">📍</span>' + L('Joylashuvim','Моё местоположение') + '<span class="wx-rf">↻</span></button></div>';
      body = '<div class="wx-main"><div class="wx-ic">' + (w.day ? tx.ic : tx.icN) + '</div>' +
        '<div class="wx-temp">' + (w.t != null ? Math.round(w.t) : '—') + '<sup>°C</sup></div>' +
        '<div class="wx-desc"><b>' + (state.lang === 'uz' ? tx.uz : tr(tx.ru)) + '</b><span>' +
        L('His qilinishi','Ощущается') + ' ' + (w.feels != null ? Math.round(w.feels) : '—') + '°</span></div></div>' +
        '<div class="wx-meta"><span>💧 ' + (w.h != null ? Math.round(w.h) : '—') + '%</span><span>💨 ' +
        (w.wind != null ? Math.round(w.wind) : '—') + ' km/h</span></div>';
    } else if (st === 'loading') {
      top = '';
      body = '<div class="wx-main"><div class="wx-ic">⏳</div><div class="wx-desc"><b>' + L('Ob-havo yuklanmoqda…','Загрузка погоды…') + '</b></div></div>';
    } else {
      var msg = L('Ob-havoni ko‘rish uchun bosing','Нажмите, чтобы увидеть погоду');
      if (st === 'denied') msg = L('Joylashuvga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering va qayta bosing.','Доступ к геолокации запрещён. Разрешите его в настройках и нажмите снова.');
      else if (st === 'error') msg = L('Ob-havoni olib bo‘lmadi. Qayta urinib ko‘ring.','Не удалось получить погоду. Попробуйте ещё раз.');
      top = '';
      body = '<button type="button" class="wx-ask" id="wxLoc"><span class="wx-ask-ic">📍</span><span class="wx-ask-tx"><b>' +
        L('Joylashuvni aniqlash','Определить местоположение') + '</b><span>' + msg + '</span></span></button>';
    }
    el.innerHTML = top + body;
    el.setAttribute('data-kind', w ? w.kind : 'cloud');
    el.setAttribute('data-day', w && !w.day ? '0' : '1');
    var btn = document.getElementById('wxLoc');
    if (btn) btn.addEventListener('click', function(){ haptic('select'); wxLocate(); });
  }
  // Joylashuv tugmasi bosilganda: ruxsat so'raladi -> koordinatalar saqlanadi -> ob-havo yuklanadi
  function wxLocate(){
    if (mxState.wxStatus === 'loading') return;
    mxState.wxStatus = 'loading'; wxPaint();
    pfGetLocation().then(function(res){
      if (!mxState.alive) return;
      if (!res || res.error || res.lat == null) {
        mxState.wxStatus = (res && res.error === 'denied') ? 'denied' : 'error';
        wxPaint(); return;
      }
      mxSave(WX_REGION_KEY, { geo:true, lat:res.lat, lon:res.lon });
      mxState.wx = null;
      wxFetch().then(function(w){
        if (!mxState.alive) return;
        mxState.wx = w; mxState.wxStatus = null; wxPaint(); wxFx(w);
      }).catch(function(){
        if (!mxState.alive) return;
        mxState.wxStatus = 'error'; wxPaint();
      });
    });
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
    mxState.wxStatus = null;
    mxState.wx = (mxState.region && cw && cw.region === 'geo') ? cw : null;
    if (mxState.wx && wxForced()) mxState.wx.kind = wxForced();
    mxPaintTicker(); wxPaint(); wxFx(mxState.wx);
    mxRefreshMarket();
    if (mxState.region) wxFetch().then(function(w){ if (!mxState.alive) return; mxState.wx = w; wxPaint(); wxFx(w); }).catch(function(){});
    mxState.timer = setInterval(mxRefreshMarket, 60000);
    mxState.wxTimer = setInterval(function(){
      if (!wxRegion()) return;
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

  // ---------- Jonli obunachilar hisoblagichi + Yuz tasdiqlash (kamera) ----------
  function lvInjectCss(){
    if (document.getElementById('lvFvCss')) return;
    var st = document.createElement('style'); st.id = 'lvFvCss';
    st.textContent = [
      '.lv-card{display:flex;align-items:center;gap:12px;margin:0 0 14px;padding:12px 14px;border-radius:14px;background:var(--bg-panel,#161b26);border:1px solid var(--border,rgba(255,255,255,.1))}',
      '.lv-ic{font-size:26px;line-height:1}',
      '.lv-main{flex:1;min-width:0}',
      '.lv-label{font-size:12px;color:var(--text-2,#9aa4b5);display:flex;align-items:center;gap:6px}',
      '.lv-num{font-size:26px;font-weight:800;letter-spacing:.2px;line-height:1.15;font-variant-numeric:tabular-nums}',
      '.lv-side{text-align:right;font-size:11.5px;color:var(--text-2,#9aa4b5)}',
      '.lv-side b{display:block;font-size:16px;color:inherit;font-variant-numeric:tabular-nums}',
      '.lv-live{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;letter-spacing:.6px;color:#22c55e;text-transform:uppercase}',
      '.lv-live i{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:lv-pulse 1.6s infinite}',
      '@keyframes lv-pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}',
      '.fv-wrap{text-align:center}',
      '.fv-prompt{font-size:18px;font-weight:700;margin:6px 0 4px}',
      '.fv-step{font-size:12px;color:var(--text-2,#9aa4b5);margin-bottom:12px}',
      '.fv-circle{position:relative;width:min(72vw,280px);aspect-ratio:1/1;margin:0 auto 14px;border-radius:50%;overflow:hidden;background:#000;border:3px solid var(--border,rgba(255,255,255,.18));box-shadow:0 0 0 4px rgba(99,102,241,.25)}',
      '.fv-circle video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}',
      '.fv-circle.ok{border-color:#22c55e}',
      '.fv-dots{display:flex;justify-content:center;gap:8px;margin-bottom:12px}',
      '.fv-dots span{width:9px;height:9px;border-radius:50%;background:var(--border,rgba(255,255,255,.2))}',
      '.fv-dots span.cur{background:#6366f1;transform:scale(1.25)}',
      '.fv-dots span.done{background:#22c55e}',
      '.fv-thumbs{display:flex;justify-content:center;gap:10px;margin:12px 0}',
      '.fv-thumb{width:72px;height:72px;border-radius:50%;background:var(--bg-panel-2,#1d2331) center/cover no-repeat;border:2px dashed var(--border,rgba(255,255,255,.2));display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-2,#9aa4b5);cursor:pointer;padding:0}',
      '.fv-thumb.got{border-style:solid;border-color:#22c55e;font-size:0}',
      '.fv-msg{min-height:18px;font-size:12.5px;margin:6px 0;color:var(--text-2,#9aa4b5)}',
      '.fv-msg.err{color:var(--red,#ef4444)}',
      '.fv-open{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border-radius:12px;border:1px dashed var(--border,rgba(255,255,255,.2));background:var(--bg-panel-2,#1d2331);color:inherit;font:inherit;cursor:pointer;text-align:left}',
      '.fv-open.got{border-style:solid;border-color:#22c55e}',
      '.fv-open .fv-mini{display:flex;gap:4px;margin-left:auto}',
      '.fv-open .fv-mini i{width:26px;height:26px;border-radius:50%;background:center/cover no-repeat}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---- Jonli statistika ----
  var lv = { timer:null, shown:null, last:null, raf:0 };
  function lvFmt(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function lvPaint(){
    var numEl = document.getElementById('subsNum');
    if (!numEl || !lv.last) return;
    var from = (lv.shown == null) ? 0 : lv.shown, to = lv.last.users_total || 0;
    if (lv.raf) cancelAnimationFrame(lv.raf);
    if (from === to) { numEl.textContent = lvFmt(to); lv.shown = to; return; }
    var t0 = performance.now(), dur = 700;
    (function step(now){
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      lv.shown = from + (to - from) * e;
      var n2 = document.getElementById('subsNum'); if (n2) n2.textContent = lvFmt(lv.shown);
      if (p < 1) lv.raf = requestAnimationFrame(step); else { lv.shown = to; lv.raf = 0; }
    })(t0);
  }
  function lvFetch(){
    if (document.hidden || !API_BASE) return;
    apiGet('/api/public/live/stats').then(function(res){
      if (res && res.ok) { lv.last = res; lvPaint(); }
    }).catch(function(){});
  }
  function lvStart(){
    lvInjectCss();
    if (lv.last) { lv.shown = lv.last.users_total || 0; lvPaint(); }
    if (lv.timer) clearInterval(lv.timer);
    lvFetch();
    lv.timer = setInterval(lvFetch, 10000);
  }
  function lvStop(){
    if (lv.timer) { clearInterval(lv.timer); lv.timer = null; }
    if (lv.raf) { cancelAnimationFrame(lv.raf); lv.raf = 0; }
  }
  document.addEventListener('visibilitychange', function(){ if (!document.hidden && lv.timer) lvFetch(); });

  // ---- Yuzni tasdiqlash (jonli kamera, 3 qadam) ----
  var FV_STEPS = ['front', 'left', 'right'];
  var fv = { stream:null, shots:[null,null,null], step:0, detector:false, busy:false, entry:null };
  function fvPrompt(i){
    return [L("To'g'ri qarang","Смотрите прямо"), L("Boshingizni chapga buring","Поверните голову влево"), L("Boshingizni o'ngga buring","Поверните голову вправо")][i];
  }
  function fvStop(){
    if (fv.stream) { try { fv.stream.getTracks().forEach(function(tr){ tr.stop(); }); } catch(e){} fv.stream = null; }
    var v = document.getElementById('fvVideo'); if (v) { try { v.srcObject = null; } catch(e){} }
  }
  function fvDone(){ return fv.shots.every(function(s){ return !!s; }); }
  function fvMsg(txt, err){
    var m = document.getElementById('fvMsg'); if (!m) return;
    m.textContent = txt || ''; m.className = 'fv-msg' + (err ? ' err' : '');
  }
  function fvStartCamera(){
    fvStop();
    var vid = document.getElementById('fvVideo');
    var capBtn = document.getElementById('fvCap');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      fvMsg(L("Bu qurilmada kamera qo'llab-quvvatlanmaydi","Камера не поддерживается на этом устройстве"), true);
      fvShowRetry(true); return;
    }
    fvMsg(L("Kamera ochilmoqda...","Открываем камеру..."), false);
    navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false }).then(function(stream){
      var v = document.getElementById('fvVideo');
      if (!v || (state.stack[state.stack.length-1] || {}).view !== 'faceCapture') { stream.getTracks().forEach(function(tr){ tr.stop(); }); return; }
      fv.stream = stream;
      v.setAttribute('playsinline', ''); v.muted = true;
      v.srcObject = stream;
      var p = v.play(); if (p && p.catch) p.catch(function(){});
      fvShowRetry(false);
      if (capBtn) capBtn.disabled = false;
      fvMsg('', false);
    }).catch(function(err){
      var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      fvMsg(denied
        ? L("Kameraga ruxsat berilmadi. Telegram/telefon sozlamalarida kameraga ruxsat bering va qayta urinib ko'ring.","Нет доступа к камере. Разрешите доступ к камере в настройках Telegram/телефона и повторите.")
        : L("Kamera topilmadi yoki ochib bo'lmadi.","Камера не найдена или недоступна."), true);
      fvShowRetry(true);
      if (capBtn) capBtn.disabled = true;
    });
  }
  function fvShowRetry(show){
    var r = document.getElementById('fvRetry'); if (r) r.style.display = show ? '' : 'none';
  }
  function fvPaintState(){
    var dots = document.getElementById('fvDots'), th = document.getElementById('fvThumbs');
    if (!dots) return;
    dots.innerHTML = FV_STEPS.map(function(_, i){
      return '<span class="' + (fv.shots[i] ? 'done' : (i === fv.step ? 'cur' : '')) + '"></span>';
    }).join('');
    th.innerHTML = FV_STEPS.map(function(_, i){
      return '<button type="button" class="fv-thumb' + (fv.shots[i] ? ' got' : '') + '" data-i="' + i + '"' +
        (fv.shots[i] ? ' style="background-image:url(' + fv.shots[i] + ')"' : '') + '>' + (i + 1) + '</button>';
    }).join('');
    th.querySelectorAll('.fv-thumb').forEach(function(b){
      b.addEventListener('click', function(){
        fv.step = parseInt(b.getAttribute('data-i'), 10); fv.shots[fv.step] = null;
        haptic('tap'); fvPaintState();
        if (!fv.stream) fvStartCamera();
      });
    });
    var pr = document.getElementById('fvPrompt'), st = document.getElementById('fvStepTxt');
    var done = fvDone();
    pr.textContent = done ? L("Tayyor! ✅","Готово! ✅") : fvPrompt(fv.step);
    st.textContent = done ? L("Barcha 3 surat olindi","Все 3 снимка сделаны") : (L("Qadam","Шаг") + ' ' + (fv.step + 1) + ' / 3');
    document.getElementById('fvCircle').classList.toggle('ok', done);
    var cap = document.getElementById('fvCap'), ok = document.getElementById('fvOk');
    cap.style.display = done ? 'none' : '';
    ok.style.display = done ? '' : 'none';
    if (done) fvStop();
  }
  function fvCapture(){
    if (fv.busy) return;
    var v = document.getElementById('fvVideo');
    if (!v || !v.videoWidth) { fvMsg(L("Kamera hali tayyor emas","Камера ещё не готова"), true); return; }
    fv.busy = true;
    var w = v.videoWidth, h = v.videoHeight, sc = Math.min(1, 640 / Math.max(w, h));
    var cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
    cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
    var finish = function(){
      fv.shots[fv.step] = cv.toDataURL('image/jpeg', 0.82);
      var nx = fv.shots.findIndex(function(s){ return !s; });
      if (nx > -1) fv.step = nx;
      fv.busy = false; haptic('ok'); fvMsg('', false); fvPaintState();
    };
    if (window.FaceDetector) {
      var det; try { det = new window.FaceDetector({ fastMode:true, maxDetectedFaces:1 }); } catch(e){ det = null; }
      if (det) {
        det.detect(cv).then(function(faces){
          fv.detector = true;
          if (!faces || !faces.length) { fv.busy = false; haptic('tap'); fvMsg(L("Yuz aniqlanmadi. Yuzingiz kadrda va yorug' joyda bo'lsin, qayta urinib ko'ring.","Лицо не найдено. Встаньте в кадр при хорошем свете и повторите."), true); return; }
          finish();
        }).catch(function(){ finish(); });
        return;
      }
    }
    finish();
  }
  function fvSubmitProfile(){
    var btn = document.getElementById('fvOk');
    btn.disabled = true; btn.textContent = L('Yuborilmoqda...','Отправка...');
    apiPost('/api/public/profile/master/face', {
      init_data: getInitData(), lang: srvLang(),
      face_photos: fv.shots.slice(), face_steps: FV_STEPS.slice(), face_detector: !!fv.detector
    }).then(function(res){
      if (res.data && res.data.ok) {
        haptic('ok');
        var e = fv.entry; if (e && e.master) e.master.face_verified = true;
        state.stack = state.stack.slice(0, -1);
        var prev = state.stack[state.stack.length - 1];
        if (prev && prev.master) prev.master.face_verified = true;
        render();
      } else {
        btn.disabled = false; btn.textContent = L('Yuborish','Отправить');
        fvMsg((res.data && res.data.error) || t().orderErrGeneric, true);
      }
    }).catch(function(){
      btn.disabled = false; btn.textContent = L('Yuborish','Отправить');
      fvMsg(t().orderErrGeneric, true);
    });
  }
  function renderFaceCapture(entry){
    lvInjectCss();
    var firstEnter = fv.entry !== entry;
    if (firstEnter) { fv.entry = entry; fv.shots = [null,null,null]; fv.step = 0; fv.detector = false; fv.busy = false; }
    var isAnk = entry.mode === 'anketa';
    mainView.innerHTML =
      '<div class="view fv-wrap"><div class="fv-prompt" id="fvPrompt"></div><div class="fv-step" id="fvStepTxt"></div>' +
      '<div class="fv-circle" id="fvCircle"><video id="fvVideo" autoplay playsinline muted></video></div>' +
      '<div class="fv-dots" id="fvDots"></div>' +
      '<div class="fv-msg" id="fvMsg"></div>' +
      '<button class="btn-ghost" id="fvRetry" style="display:none;margin-bottom:8px">' + L('Qayta urinish','Повторить') + '</button>' +
      '<div class="fv-thumbs" id="fvThumbs"></div>' +
      '<p class="note">🔒 ' + L('Suratlar shaxsingizni tasdiqlash uchun saqlanadi','Снимки сохраняются для подтверждения вашей личности') + '</p>' +
      '<button class="btn-primary" id="fvCap" style="width:100%;padding:13px;border-radius:11px">📸 ' + L('Suratga olish','Сделать снимок') + '</button>' +
      '<button class="btn-primary" id="fvOk" style="width:100%;padding:13px;border-radius:11px;display:none">' + (isAnk ? L('Tayyor','Готово') : L('Yuborish','Отправить')) + '</button></div>';
    fvPaintState();
    document.getElementById('fvCap').addEventListener('click', fvCapture);
    document.getElementById('fvRetry').addEventListener('click', function(){ haptic('tap'); fvStartCamera(); });
    document.getElementById('fvOk').addEventListener('click', function(){
      if (!fvDone()) return;
      if (isAnk) {
        state.anketaForm.face_photos = fv.shots.slice();
        state.anketaForm.face_detector = !!fv.detector;
        haptic('ok'); fvStop(); pop();
      } else {
        fvSubmitProfile();
      }
    });
    if (!fvDone()) fvStartCamera();
  }

  // ---------- Birlashtirilgan bo'limlar (hub) ----------
  // Asosiy menyuni soddalashtirish uchun 9 ta alohida plitka 3 ta bo'limga jamlandi:
  //   Ustaxona  = Ustaxona topish + Xarita + Buyurtma qilish
  //   Profil    = Mening profilim + Anketani to'ldirish
  //   Uskunalarim = Mening uskunalarim + Narx kalkulyatori + Sotib olish maslahatchisi + Qo'llanma
  function hubClean(s){ return s.replace(/^\S+\s?/, ''); }
  function hubDef(id){
    if (id === 'hubUstaxona') return {
      title: L('Ustaxona','Мастерская'),
      sub: L('Ustaxona topish, xarita va buyurtma — bir joyda','Поиск мастерской, карта и заказ — в одном месте'),
      items: [
        { pal:'g-night', wide:true, icon:'🔍', title:hubClean(t().menuTopish), sub:t().menuTopishSub, cta:'🔎 ' + L('Qidirish','Искать') + ' ›',
          brand:L('Ustaxona','Мастерская'), action:function(el){ pzOpen('find', el, function(){ push({ view:'topishViloyat' }); }); } },
        { pal:'g-teal', icon:'🗺️', title:L('Xarita','Карта'), sub:L('Yaqin atrofdagi ustalar','Мастера рядом'),
          brand:L('Xarita','Карта'), action:function(el){ pzOpen('map', el, function(){ push({ view:'map' }); }); } },
        { pal:'g-pink', icon:'📋', title:hubClean(t().menuOrder), sub:t().menuOrderSub,
          brand:L('Buyurtma','Заказ'), action:function(el){ pzOpen('order', el, function(){ push({ view:'orderGate' }); }); } }
      ]
    };
    if (id === 'hubProfil') return {
      title: L('Profil','Профиль'),
      sub: L('Mening profilim va usta bo\'lish anketasi','Мой профиль и анкета мастера'),
      items: [
        { pal:'g-sky', icon:'👤', title:hubClean(t().menuProfile), sub:t().menuProfileSub,
          brand:L('Profil','Профиль'), action:function(el){ pzOpen('prof', el, function(){ push({ view:'profileGate' }); }); } },
        { pal:'g-lime', icon:'📝', title:hubClean(t().menuAnketa), sub:t().menuAnketaSub,
          brand:L('Usta bo\'l','Стать мастером'), action:function(el){ pzOpen('anketa', el, function(){ push({ view:'anketaGate' }); }); } }
      ]
    };
    if (id === 'hubUskuna') return {
      title: L('Uskunalarim','Моя техника'),
      sub: L('Uskunalar, narx kalkulyatori, maslahatchi va qo\'llanma','Техника, калькулятор цен, советчик и руководство'),
      items: [
        { pal:'g-lime', wide:true, icon:'🏠', title:L('Mening uskunalarim','Моя техника'), sub:L('Kafolat, ta\'mirlash tarixi va eslatmalar','Гарантия, история ремонта и напоминания'),
          cta:'🏠 ' + L('Uskunalarimni ochish','Открыть мою технику') + ' ›', brand:L('Uy pasporti','Паспорт дома'),
          action:function(el){ state.dv.items = null; push({ view:'devices' }); } },
        { pal:'g-fire', icon:'💰', title:L('Narx kalkulyatori','Калькулятор цен'), sub:L('Ta\'mirlash narxini oldindan biling','Узнайте цену ремонта заранее'), brand:L('Narxlar','Цены'),
          action:function(el){ state.calc.tur = ''; state.calc.sel = {}; push({ view:'calc' }); } },
        { pal:'g-sky', icon:'🧭', title:L('Sotib olish maslahatchisi','Советчик по покупке'), sub:L('Qaysi texnika sizga mos?','Какая техника вам подойдёт?'), brand:L('Maslahat','Совет'),
          action:function(el){ state.adv.tur = ''; state.adv.step = 0; state.adv.ans = {}; push({ view:'advisor' }); } },
        { pal:'g-gold', wide:true, icon:'📖', title:L("Qo'llanma",'Руководство'), sub:L("Yangi texnikani o'rnatish, ishga tushirish va foydalanish — rasm va video bilan","Установка, запуск и использование новой техники — с фото и видео"),
          cta:'📖 ' + L("Qo'llanmani ochish","Открыть руководство") + ' ›', brand:L("Qo'llanma","Руководство"),
          action:function(el){ state.guideQuery = ''; push({ view:'guide' }); } }
      ]
    };
    return null;
  }

  function renderHub(entry){
    var d = hubDef(entry.view);
    if (!d) { resetHome(); return; }
    var items = d.items;
    mainView.innerHTML =
      '<div class="view"><div class="hello"><h1>' + d.title + '</h1><p>' + d.sub + '</p></div>' +
      '<div class="tiles">' + items.map(tileHTML).join('') + '</div></div>';
    mainView.querySelectorAll('[data-ti]').forEach(function(btn){
      btn.addEventListener('click', function(){ haptic('select'); items[parseInt(btn.getAttribute('data-ti'), 10)].action(btn); });
    });
  }

  function renderMainMenu(){
    var cl = function(s){ return s.replace(/^\S+\s?/, ''); };
    var items = [
      { pal:'g-sun', wide:true, tall:true, icon:'🛠️', title:cl(t().menuTechs), sub:t().menuTechsSub, badge:'🎬 ' + L('ANIMATSIYA','АНИМАЦИЯ'),
        count:t().itemsCount(totalIssues()), brand:L('Texnika','Техника'), action:function(el){ pzOpen('tech', el, function(){ push({ view:'home' }); }); } },
      { pal:'g-market', wide:true, icon:'🛒', title:'Market', sub:L('Ehtiyot qismlar, eski va B/U texnika','Запчасти, старая и Б/У техника'), badge:'🔥 ' + L('YANGI','НОВОЕ'),
        cta:'🛒 ' + L('Marketga kirish','В маркет') + ' ›', brand:'Market', action:function(el){ mkOpenPortal(el); } },
      { pal:'g-night', wide:true, icon:'🔍', title:L('Ustaxona','Мастерская'), sub:L('Ustaxona topish, xarita va buyurtma','Поиск мастерской, карта и заказ'),
        cta:'🔎 ' + L('Ochish','Открыть') + ' ›', brand:L('Ustaxona','Мастерская'), action:function(el){ pzOpen('hubU', el, function(){ push({ view:'hubUstaxona' }); }); } },
      { pal:'g-sky', icon:'👤', title:L('Profil','Профиль'), sub:L('Profil va usta anketasi','Профиль и анкета мастера'), brand:L('Profil','Профиль'),
        action:function(el){ pzOpen('hubP', el, function(){ push({ view:'hubProfil' }); }); } },
      { pal:'g-lime', icon:'🏠', title:L('Uskunalarim','Моя техника'), sub:L('Narx, maslahat va qo\'llanma','Цены, советы и руководство'), brand:L('Uy pasporti','Паспорт дома'),
        action:function(el){ pzOpen('hubK', el, function(){ push({ view:'hubUskuna' }); }); } },
      { pal:'g-teal', wide:true, icon:'🧩', title:L('Foydali ilovalar','Полезные приложения'), sub:L('Texnika bo\'yicha kerakli ilovalar — bir joyda','Нужные приложения по технике — в одном месте'),
        cta:'🧩 ' + L('Ochish','Открыть') + ' ›', brand:L('Ilovalar','Приложения'), action:function(el){ foydOpen(); } },
      { pal:'g-fire', wide:true, icon:'🏆', title:L('Biz haqimizda','О нас'), sub:L("Biz haqimizda · Bog'lanish · Taklif va e'tirozlar",'О нас · Связь · Предложения и претензии'),
        cta:'✨ ' + L('Ochish','Открыть') + ' ›', brand:L('Biz','Мы'), action:function(el){ state.infoTab = 'about'; state.fb = { type:'taklif', text:'', sent:false }; pzOpen('info', el, function(){ push({ view:'info' }); }); } }
    ];
    mainView.innerHTML =
      '<div class="view"><div class="mx-ticker" id="mxTicker"></div><div class="wx-card cmp" id="wxCard"></div><div class="hello"><h1>' + L('Salom','Привет') + ', <span class="gr">' + userName() + '</span> <span class="wave">👋</span></h1>' +
      '<p>' + L('Barcha bo\'limlar shu yerda — tanlang','Все разделы здесь — выбирайте') + '</p></div>' +
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
    var sc = (conf && conf.scene && SCENES[conf.scene]) ? conf.scene : (SCENES[cid] ? cid : '_gen');
    if (sc === 'p07') p7InjectCss();
    if (sc === 'epdamper') edInjectCss();
    curIllus = { steps: steps, scene: sc };
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
  var MAP_DEFAULT = { lat: 41.3111, lon: 69.2797, zoom: 11 }; // Toshkent (profil joylashuv xaritasi uchun zaxira)
  // Ustalar xaritasi dastlab BUTUN O'ZBEKISTONni ko'rsatadi (joylashuvga ruxsat berilsa — foydalanuvchi atrofiga o'tadi)
  var MAP_UZ = { lat: 41.2, lon: 64.6, zoom: 5, bounds: [[37.1, 55.9], [45.6, 73.2]] };
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
      '<div class="mapx-hint">📍 ' + (where ? where + ' · ' : '') + (m.approx ? L('Aniq joylashuv kiritilmagan — viloyat/tuman bo\'yicha taxminiy nuqta', 'Точное место не указано — примерная точка по области/району') : L('Taxminiy joylashuv', 'Примерное местоположение')) + '</div>' +
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
      map.setView([MAP_UZ.lat, MAP_UZ.lon], MAP_UZ.zoom);
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
      try { rt.progUntil = Date.now() + 1200; map.fitBounds(MAP_UZ.bounds, { padding: [10, 10], animate: false }); } catch (e) {}
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
  state.mk = { overview:null, ovAt:0, parts:{}, partsAt:{}, q:{}, holat:{}, stock:{}, scroll:{}, secs:{}, sec:{}, models:{}, model:{} };
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
    if (p.narx > 0) {
      var oldP = (p.usta && p.narx_asl > p.narx) ? '<s style="opacity:.55;font-size:.72em;font-weight:600;margin-right:6px">' + mkFmt(p.narx_asl) + '</s>' : '';
      var badge = p.usta ? '<small style="display:block;font-size:.58em;font-weight:800;color:#16a34a;margin-top:2px">👷 ' + L("Usta narxi","Цена для мастера") + '</small>' : '';
      return '<span class="' + cls + '">' + oldP + mkFmt(p.narx) + ' <small style="font-size:.6em;font-weight:700;opacity:.8">' + L("so'm","сум") + '</small>' + badge + '</span>';
    }
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
  PZ.info = { a:'#ffb52e', b:'#27e0c0', p1:'#6b2a0a', p2:'#1c0a10', ln:'pz-ld', cls:'about', fx:pzConfetti(),
    uz:'BIZ', ru:'МЫ', tu:"BIZ HAQIMIZDA · ALOQA · FIKR-MULOHAZA", tr:'О НАС · СВЯЗЬ · ОБРАТНАЯ СВЯЗЬ', svg:PZ.about.svg };

  PZ.hubU = { a:'#3be1ff', b:'#ffb52e', p1:'#0b4a6e', p2:'#040b18', ln:'pz-lb', r0:'inset(0 0 100% 0)', r1:'inset(0 0 0 0)',
    uz:'USTAXONA', ru:'МАСТЕРСКАЯ', tu:'TOPISH · XARITA · BUYURTMA', tr:'ПОИСК · КАРТА · ЗАКАЗ',
    fx:'<b style="left:28%;top:30%;--d:.5s"></b><b style="left:72%;top:55%;--d:.9s"></b><b style="left:42%;top:74%;--d:1.3s"></b>',
    svg:'<path class="dr" pathLength="1" d="M12 58 60 16l48 42M22 52v52h76V52"/><circle class="dr d2" pathLength="1" style="stroke:var(--b)" cx="52" cy="72" r="13"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M62 82l14 14"/><ellipse class="rip" cx="86" cy="78" rx="8" ry="3"/><g class="pin"><path d="M86 46c-7 0-12 5-12 11 0 8 12 19 12 19s12-11 12-19c0-6-5-11-12-11z"/><circle cx="86" cy="57" r="4" fill="#06101f"/></g>' };
  PZ.hubP = { a:'#4fb4ff', b:'#9be83a', p1:'#17407a', p2:'#050d22', ln:'pz-lf', r0:'inset(50% 50% 50% 50% round 50%)', r1:'inset(0% 0% 0% 0% round 0%)',
    uz:'PROFIL', ru:'ПРОФИЛЬ', tu:"PROFIL · USTA BO'LISH ANKETASI", tr:'ПРОФИЛЬ · АНКЕТА МАСТЕРА', fx:'',
    svg:'<rect class="dr" pathLength="1" x="12" y="26" width="96" height="68" rx="10"/><circle class="dr d2" pathLength="1" cx="40" cy="54" r="10"/><path class="dr d2" pathLength="1" d="M22 82c0-9 8-15 18-15s18 6 18 15"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M70 46h28M70 58h22M70 70h14"/><g class="stamp"><circle cx="92" cy="84" r="14" fill="rgba(0,0,0,.45)" stroke="var(--b)"/><path d="M85 84l5 5 9-10" stroke="var(--b)"/></g>' };
  PZ.hubK = { a:'#ffb52e', b:'#6ff0c4', p1:'#6b3b08', p2:'#190d03', ln:'pz-lu',
    uz:'USKUNALARIM', ru:'МОЯ ТЕХНИКА', tu:"USKUNALAR · NARX · MASLAHAT · QO'LLANMA", tr:'ТЕХНИКА · ЦЕНЫ · СОВЕТЫ · РУКОВОДСТВО',
    fx:'<i style="left:14%;--d:.4s">$</i><i style="left:34%;--d:1.1s">%</i><i style="left:58%;--d:.1s">?</i><i style="left:80%;--d:.8s">✓</i>',
    svg:'<g class="gear"><circle class="dr" pathLength="1" cx="60" cy="60" r="13"/><circle class="dr d2" pathLength="1" cx="60" cy="60" r="25"/><path class="dr d2" pathLength="1" style="stroke:var(--b)" d="M60 28v7M60 85v7M28 60h7M85 60h7M37.4 37.4l5 5M77.6 77.6l5 5M82.6 37.4l-5 5M42.4 77.6l-5 5"/></g><g class="orb"><circle cx="60" cy="10" r="4"/><circle cx="60" cy="110" r="3"/></g>' };

  function pzOpen(key, srcEl, go){
    var c = PZ[key];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!c || reduce) { go(); return; }
    if (mkBusy) return;
    mkBusy = true;
    var r = srcEl ? srcEl.getBoundingClientRect() : { left: innerWidth/2, top: innerHeight/2, width: 0, height: 0 };
    var o = document.createElement('div'); o.className = 'pz pz-' + (c.cls || key);
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
    apiGet('/api/public/market/parts?cat=' + encodeURIComponent(cat) + (getInitData() ? '&init_data=' + encodeURIComponent(getInitData()) : '')).then(function(d){
      if (d && d.ok) { m.parts[cat] = d.items || []; m.secs[cat] = d.sections || []; m.models[cat] = d.models || []; m.partsAt[cat] = Date.now(); cb(m.parts[cat], null); }
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
          '<button class="mk-soon" id="mkOpenBu" style="--i:1"><span class="ico">♻️</span><span class="chip">' + L('FAOL','АКТИВНО') + '</span><b>' + L('B/U texnika','Б/У техника') + '</b><span class="d">' + L("Ishlatilgan texnikani soting yoki toping","Продавайте и находите Б/У технику") + '</span></button>' +
        '</div>' +
      '</div>';
    document.getElementById('mkOpenParts').addEventListener('click', function(){ haptic('select'); push({ view:'marketCats' }); });
    mkRenderHomeOrders();
    adjCheckPending();
    var buBtn = document.getElementById('mkOpenBu');
    if (buBtn) buBtn.addEventListener('click', function(){ haptic('select'); buOpen(); });
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
        return '<button class="mk-cat ' + palOf(o.c.id) + (o.n || o.c.id === 'printer' ? '' : ' zero') + '" data-cat="' + o.c.id + '" style="--i:' + i + '">' +
          '<span class="emo">' + o.c.icon + '</span><span class="nm">' + esc(pick(o.c,'name')) + '</span>' +
          '<span class="ct">' + (o.c.id === 'printer' ? (o.n ? o.n + ' ' + L('ta qism','дет.') + ' · ' : '') + '🔄 Chip reset' : (o.n ? o.n + ' ' + L('ta qism','дет.') : L('Tez orada','Скоро'))) + '</span></button>';
      }).join('');
      grid.querySelectorAll('[data-cat]').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); var cc = b.getAttribute('data-cat'); delete state.mk.model[cc]; state.mk.sec[cc] = 0; push({ view:'marketParts', cat:cc }); });
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
  function mkChipResetBanner(){
    return '<button class="adj-main" id="mkOpenChipReset"><span class="tag">' + L('YANGI','НОВОЕ') + '</span><span class="ico">🔄</span><span class="tx"><b>Chip reset</b><span>' + L("Printer «Service required» yoki ink pad to'lgan deb to'xtab qolsa — tiklash dasturi. To'lovdan so'ng darhol chatga yuboriladi","Принтер остановился с ошибкой «Service required» или памперс переполнен — программа сброса. После оплаты сразу приходит в чат") + '</span></span><span class="go">→</span></button>';
  }

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
    if (m.model[cat] === undefined) { renderMarketModelPick(entry); return; }   // 1-qadam: texnika modeli
    var q0 = m.q[cat] || '';
    var chips = [['all', L('Barchasi','Все')], ['yangi', L('Yangi','Новые')], ['bu', 'B/U'], ['demontaj', L('Demontaj','Демонтаж')], ['stock', L('Mavjud','В наличии')]];
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-sticky"><div class="mk-search">' +
          '<span class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg></span>' +
          '<input id="mkQ" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(L("Nomi, model yoki qism raqami...","Название, модель или номер детали...")) + '">' +
          '<button class="mk-clear" id="mkClear" aria-label="clear">✕</button></div>' +
          '<div class="mk-chips mk-secs" id="mkSecs" style="display:none"></div>' +
          '<div class="mk-chips" id="mkChips">' + chips.map(function(ch){ return '<button class="mk-chip" data-h="' + ch[0] + '">' + ch[1] + '</button>'; }).join('') + '</div></div>' +
        (cat === 'printer' ? mkChipResetBanner() : '') +
        '<button class="mk-modelbar" id="mkModelBar" style="display:none"></button>' +
        '<div class="mk-head"><div class="tt"><span>' + c.icon + '</span>' + esc(pick(c,'name')) + '</div><div class="cn" id="mkCnt"></div></div>' +
        '<div class="mk-list fx" id="mkList"><div class="mk-skel"></div><div class="mk-skel"></div><div class="mk-skel"></div></div>' +
      '</div>';

    var input = document.getElementById('mkQ'), clearBtn = document.getElementById('mkClear');
    var listEl = document.getElementById('mkList'), cntEl = document.getElementById('mkCnt');
    var chipBtn = document.getElementById('mkOpenChipReset');
    if (chipBtn) chipBtn.addEventListener('click', function(){ haptic('select'); push({ view:'marketAdj' }); });
    adjCheckPending();
    input.value = q0;
    var firstPaint = true, loadError = null;

    function setChips(){
      var cur = m.stock[cat] ? 'stock' : (m.holat[cat] || 'all');
      mainView.querySelectorAll('#mkChips .mk-chip').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-h') === cur); });
      clearBtn.classList.toggle('show', !!input.value);
    }

    // Bo'limlar: texnika ichidagi turkumlar (admin panel → Market → Bo'limlar). Bo'lim yo'q bo'lsa qator ko'rinmaydi.
    function drawSecs(){
      var box = document.getElementById('mkSecs'); if (!box) return;
      var mod = m.model[cat] || 0;
      var items = (m.parts[cat] || []).filter(function(p){ return !(mod > 0 && p.model_id && p.model_id !== mod); });   // tanlangan model (+ umumiy qismlar)
      var cnt = {}; items.forEach(function(p){ if (p.section_id) cnt[p.section_id] = (cnt[p.section_id] || 0) + 1; });
      var secs = (m.secs[cat] || []).filter(function(sc){ return cnt[sc.id] > 0; }).map(function(sc){ return { id:sc.id, nomi:sc.nomi, nomi_ru:sc.nomi_ru, count:cnt[sc.id] }; });
      if (!secs.length) { box.style.display = 'none'; box.innerHTML = ''; m.sec[cat] = 0; return; }
      var known = {}; secs.forEach(function(sc){ known[sc.id] = 1; });
      var rest = items.filter(function(p){ return !p.section_id || !known[p.section_id]; }).length;
      var cur = m.sec[cat] || 0;
      if (cur > 0 && !known[cur]) cur = m.sec[cat] = 0;
      if (cur === -1 && !rest) cur = m.sec[cat] = 0;
      var h = '<button class="mk-chip sec' + (cur === 0 ? ' on' : '') + '" data-s="0">📂 ' + L('Barchasi','Все') + ' <small>' + items.length + '</small></button>';
      secs.forEach(function(sc){
        h += '<button class="mk-chip sec' + (cur === sc.id ? ' on' : '') + '" data-s="' + sc.id + '">' + esc(pick(sc,'nomi')) + ' <small>' + sc.count + '</small></button>';
      });
      if (rest) h += '<button class="mk-chip sec' + (cur === -1 ? ' on' : '') + '" data-s="-1">' + L('Boshqa','Прочее') + ' <small>' + rest + '</small></button>';
      var sl = box.scrollLeft;
      box.innerHTML = h; box.style.display = ''; box.scrollLeft = sl;
      var onEl = box.querySelector('.on');   // tanlangan chip ko'rinmay qolmasin
      if (onEl && (onEl.offsetLeft < box.scrollLeft || onEl.offsetLeft + onEl.offsetWidth > box.scrollLeft + box.clientWidth)) box.scrollLeft = Math.max(0, onEl.offsetLeft - 16);
      box.querySelectorAll('[data-s]').forEach(function(b){
        b.addEventListener('click', function(){
          haptic('select');
          m.sec[cat] = parseInt(b.getAttribute('data-s'), 10) || 0;
          if (b.getAttribute('data-s') === '-1') m.sec[cat] = -1;
          drawSecs(); paint();
        });
      });
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
      drawSecs();
      var tokens = mkNorm(input.value).split(/\s+/).filter(Boolean);
      var hol = m.holat[cat] || 'all', st = !!m.stock[cat], sec = m.sec[cat] || 0;
      var knownSec = {}; (m.secs[cat] || []).forEach(function(sc){ knownSec[sc.id] = 1; });
      var mod = m.model[cat] || 0;
      var res = items.filter(function(p){
        if (mod > 0 && p.model_id && p.model_id !== mod) return false;
        if (sec > 0 && p.section_id !== sec) return false;
        if (sec === -1 && p.section_id && knownSec[p.section_id]) return false;
        if (hol !== 'all' && p.holat !== hol) return false;
        if (st && !(p.qoldiq > 0)) return false;
        return tokens.length ? mkMatch(p, tokens) : true;
      });
      var re = tokens.length ? new RegExp('(' + tokens.map(mkReEsc).join('|') + ')', 'gi') : null;

      var label = res.length + ' ' + (tokens.length || hol !== 'all' || st || sec || mod ? L('ta natija','рез.') : L('ta qism','дет.'));
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
        if (rs) rs.addEventListener('click', function(){ input.value = ''; m.q[cat] = ''; m.holat[cat] = 'all'; m.stock[cat] = false; m.sec[cat] = 0; setChips(); paint(); });
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
    mainView.querySelectorAll('#mkChips .mk-chip').forEach(function(b){
      b.addEventListener('click', function(){
        haptic('select');
        var h = b.getAttribute('data-h');
        if (h === 'stock') { m.stock[cat] = !m.stock[cat]; if (m.stock[cat]) m.holat[cat] = 'all'; }
        else { m.holat[cat] = h; m.stock[cat] = false; }
        setChips(); paint();
      });
    });
    // Tanlangan model paneli (bosilsa — modelni almashtirish)
    var mbar = document.getElementById('mkModelBar');
    function drawModelBar(){
      var models = m.models[cat] || [];
      if (!mbar || !models.length) { if (mbar) mbar.style.display = 'none'; return; }
      var mo = models.find(function(x){ return x.id === m.model[cat]; });
      mbar.innerHTML = '<span class="ic">🔧</span><span class="tx"><small>' + L('Texnika modeli','Модель техники') + '</small><b>' + (mo ? esc(pick(mo,'nomi')) : L('Barcha modellar','Все модели')) + '</b></span><span class="ch">' + L("O'zgartirish","Изменить") + ' ›</span>';
      mbar.style.display = '';
    }
    if (mbar) mbar.addEventListener('click', function(){ haptic('select'); delete m.model[cat]; m.sec[cat] = 0; renderMarketParts(entry); window.scrollTo(0, 0); });
    drawModelBar();
    setChips();
    if (m.parts[cat]) paint();
    load(false);
  }

  // ---------- 1-qadam: texnika modelini tanlash (Texnika → Model → Bo'lim → Qismlar) ----------
  function renderMarketModelPick(entry){
    var cat = entry.cat, c = catById(cat), m = state.mk;
    mainView.innerHTML = '<div class="view mk-view">' +
      '<div class="mk-title"><span>' + c.icon + '</span> ' + esc(pick(c,'name')) + '</div>' +
      '<div class="mk-sub">' + L("Texnika modelini tanlang","Выберите модель техники") + '</div>' +
      (cat === 'printer' ? mkChipResetBanner() : '') +
      '<div class="mk-models" id="mkModels"><div class="mk-skel"></div><div class="mk-skel"></div><div class="mk-skel"></div></div></div>';
    var chipBtn = document.getElementById('mkOpenChipReset');
    if (chipBtn) chipBtn.addEventListener('click', function(){ haptic('select'); push({ view:'marketAdj' }); });
    function isTop(){ var t = state.stack[state.stack.length-1]; return t.view === 'marketParts' && t.cat === cat; }
    function choose(id){ m.model[cat] = id; m.sec[cat] = 0; renderMarketParts(entry); window.scrollTo(0, 0); }
    function draw(items){
      var box = document.getElementById('mkModels'); if (!box) return;
      var models = (m.models[cat] || []);
      var uni = items.filter(function(p){ return !p.model_id; }).length;
      var rows = models.map(function(mo){
        return { mo:mo, n: items.filter(function(p){ return p.model_id === mo.id; }).length + uni };
      }).filter(function(r){ return r.n > 0; });
      if (!rows.length) { m.model[cat] = 0; renderMarketParts(entry); return; }   // model yo'q — to'g'ridan-to'g'ri qismlar
      var h = '<input id="mkModelQ" class="mk-modelq" type="search" autocomplete="off" placeholder="' + esc(L("Model nomini qidiring...","Поиск модели...")) + '" style="' + (rows.length > 7 ? '' : 'display:none') + '">' +
        '<button class="mk-model all" data-mid="0"><span class="nm">' + L('Barcha modellar','Все модели') + '</span><span class="ct">' + items.length + '</span><span class="go">›</span></button>' +
        '<div id="mkModelRows">' + rows.map(function(r){
          return '<button class="mk-model" data-mid="' + r.mo.id + '" data-n="' + esc(mkNorm(r.mo.nomi + ' ' + (r.mo.nomi_ru || ''))) + '"><span class="nm">' + esc(pick(r.mo,'nomi')) + '</span><span class="ct">' + r.n + '</span><span class="go">›</span></button>';
        }).join('') + '</div>';
      box.innerHTML = h;
      box.querySelectorAll('[data-mid]').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); choose(parseInt(b.getAttribute('data-mid'), 10) || 0); });
      });
      var q = document.getElementById('mkModelQ');
      if (q) q.addEventListener('input', function(){
        var t = mkNorm(q.value).trim();
        box.querySelectorAll('#mkModelRows [data-mid]').forEach(function(b){ b.style.display = (!t || b.getAttribute('data-n').indexOf(t) >= 0) ? '' : 'none'; });
      });
    }
    mkLoadParts(cat, function(items, err){
      if (!isTop()) return;
      if (!items) {
        var box = document.getElementById('mkModels');
        if (box) {
          box.innerHTML = '<div class="mk-empty"><span class="big">📡</span><b>' + L("Ulanib bo'lmadi","Не удалось подключиться") + '</b>' + L("Internetni tekshirib, qayta urinib ko'ring.","Проверьте интернет и повторите.") + '<br><span class="act" id="mkRetryM">' + L('Qayta urinish','Повторить') + '</span></div>';
          var rb = document.getElementById('mkRetryM'); if (rb) rb.addEventListener('click', function(){ m.partsAt[cat] = 0; renderMarketModelPick(entry); });
        }
        return;
      }
      draw(items);
    });
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
    var inAdj = /^marketAdj/.test(v);
    c.classList.toggle('show', (inMk || n > 0) && !hideCart && !inAdj);
    o.classList.toggle('show', inMk && v !== 'marketOrders' && !inAdj);
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
    fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=' + (state.lang === 'uz' ? 'uz,ru' : (state.lang + ',ru')) +
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
        init_data: getInitData(), lang: srvLang(),
        ism: f.ism, familya: f.familya, telefon: f.telefon, manzil: f.manzil, lat: f.lat, lon: f.lon,
        items: m.cart.map(function(x){ return { id:x.id, qty:x.qty }; })
      }).then(function(res){
        var d = res.data || {};
        if (d.ok) {
          mkStoreSet(MK_PROFILE_KEY, { ism:f.ism, familya:f.familya, telefon:f.telefon, manzil:f.manzil, lat:f.lat, lon:f.lon });
          m.pay = { order_id:d.order_id, jami:d.jami, links:d.links || {}, stars:d.stars || 0, snap:{ ism:f.ism, familya:f.familya, telefon:f.telefon, manzil:f.manzil } };
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


  // ---------- To'lov usullari: Payme / Click / Telegram Stars / Visa-Mastercard ----------
  // Stars va karta Telegram'ning ichki invoice oynasi (tg.openInvoice) orqali, Payme/Click esa tashqi havola orqali ochiladi.
  var MK_PAY_KINDS = ['payme', 'click', 'stars', 'card', 'manual'];
  var MK_PAY_NAMES = { payme:'Payme', click:'Click', stars:'Telegram Stars', card:'Visa / Mastercard', manual:"Karta o'tkazmasi" };
  function mkPayLabel(k, stars){
    if (k === 'stars') return '⭐ Telegram Stars' + (stars ? ' · ' + stars + ' ⭐' : '');
    if (k === 'card') return '💳 Visa / Mastercard';
    if (k === 'manual') return '🏦 ' + L("Karta raqamiga o'tkazish","Перевод на карту");
    return '💳 ' + MK_PAY_NAMES[k] + ' ' + L("orqali to'lash","— оплатить");
  }
  function mkPayBtnsHtml(links, stars){
    return MK_PAY_KINDS.filter(function(k){ return links && links[k]; }).map(function(k){
      return '<a class="mk-payopt ' + k + '" data-p="' + k + '" href="#">' + mkPayLabel(k, stars) + '</a>';
    }).join('');
  }
  function mkStartPay(kind, url, onPaid){
    if (!url) return;
    if ((kind === 'stars' || kind === 'card') && tg && tg.openInvoice) {
      try {
        tg.openInvoice(url, function(status){
          if (status === 'paid') { haptic('ok'); if (onPaid) onPaid(); }
          else if (status === 'failed') { mkToast(L("To'lov amalga oshmadi. Qayta urinib ko'ring.","Платёж не прошёл. Повторите попытку.")); }
        });
        return;
      } catch(e) {}
    }
    mkOpenExternal(url);
  }

  // ============================================================================================
  //  CHEK YUBORISH — to'lovdan keyin chek rasmini yuklaydi, u darhol Telegram orqali adminga boradi.
  //  Payme / Click / Visa / karta raqamiga o'tkazma uchun. Admin tasdiqlasa buyurtma avtomatik rasmiylashadi.
  // ============================================================================================
  state.mk.rc = state.mk.rc || {};
  (function(){
    if (document.getElementById('rcCss')) return;
    var css =
      '.rc-box{margin-top:18px;padding:16px;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14)}' +
      '.rc-h{font-family:var(--f-big);font-weight:800;font-size:16px;margin-bottom:6px}' +
      '.rc-p{font-size:12.5px;line-height:1.45;color:#b9d0c9;margin-bottom:12px}' +
      '.rc-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:16px;font-family:var(--f-big);font-weight:800;font-size:15px;color:#02140f;background:linear-gradient(135deg,var(--mk-em),#7df5cf);box-shadow:0 12px 26px -10px rgba(25,230,160,.8);transition:transform .15s}' +
      '.rc-btn:active{transform:scale(.97)}.rc-btn:disabled{opacity:.6}' +
      '.rc-sent{display:flex;gap:12px;align-items:center;margin-bottom:12px;padding:10px;border-radius:16px;background:rgba(25,230,160,.1);border:1px solid rgba(25,230,160,.3);animation:view-in .25s both}' +
      '.rc-sent img{width:64px;height:64px;object-fit:cover;border-radius:12px;flex:none;background:#0004}' +
      '.rc-sent b{display:block;font-size:13.5px;line-height:1.3}.rc-sent span{display:block;font-size:11.5px;color:#a9c7bf;margin-top:2px;line-height:1.35}' +
      '.rc-sent.sending{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.18)}' +
      '.rc-sent.bad{background:rgba(255,98,89,.12);border-color:rgba(255,98,89,.4)}' +
      '.rc-sent.sending img{opacity:.6}' +
      '.rc-card{margin-top:14px;padding:16px;border-radius:22px;background:linear-gradient(135deg,#4f56d9,#7c3aed);color:#fff;border:1px solid rgba(255,255,255,.22);box-shadow:0 16px 34px -16px rgba(79,70,229,.7);animation:view-in .25s both}' +
      '.rc-cn{font-family:var(--font-mono);font-weight:800;font-size:21px;letter-spacing:.06em;text-align:center;padding:12px 4px;word-break:break-all}' +
      '.rc-copy{display:block;margin:0 auto 12px;padding:9px 16px;border-radius:999px;font-weight:800;font-size:13px;color:#fff;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3)}' +
      '.rc-r{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:6px 0;border-top:1px solid rgba(255,255,255,.14)}.rc-r span{opacity:.8}.rc-r b{text-align:right}' +
      '.rc-steps{margin:10px 0 0;padding-left:20px;font-size:12.5px;line-height:1.5;opacity:.92}';
    var st = document.createElement('style'); st.id = 'rcCss'; st.textContent = css; document.head.appendChild(st);
  })();

  function rcKey(kind, oid){ return kind + ':' + oid; }
  function rcEl(id){ return document.getElementById(id); }

  // Rasmni kichraytirib JPEG ga o'giradi (tez yuborilishi va server limitiga sig'ishi uchun)
  function rcCompress(file, cb){
    var fr = new FileReader();
    fr.onerror = function(){ cb(null); };
    fr.onload = function(){
      var img = new Image();
      img.onerror = function(){ cb(null); };
      img.onload = function(){
        try {
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          var k = Math.min(1, 1600 / Math.max(w, h, 1));
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
          var q = 0.85, out = c.toDataURL('image/jpeg', q);
          while (out.length > 5200000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          cb(out);
        } catch(e) { cb(null); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  function rcCopy(text){
    function fallback(){
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        mkToast(L("Karta raqami nusxalandi ✓","Номер карты скопирован ✓"));
      } catch(e) { mkToast(text); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function(){ mkToast(L("Karta raqami nusxalandi ✓","Номер карты скопирован ✓")); }, fallback);
        return;
      }
    } catch(e) {}
    fallback();
  }

  // Karta raqami paneli (qo'lda o'tkazma uchun)
  function rcManualHtml(man, amount){
    if (!man || !man.number) return '';
    return '<div class="rc-card" id="rcManual" style="display:none">' +
      '<div style="font-size:12px;opacity:.85;text-align:center">' + L("Shu karta raqamiga to'lov qiling","Переведите оплату на эту карту") + '</div>' +
      '<div class="rc-cn" id="rcNum">' + esc(man.number) + '</div>' +
      '<button class="rc-copy" id="rcCopy">📋 ' + L('Nusxalash','Копировать') + '</button>' +
      (man.holder ? '<div class="rc-r"><span>' + L('Karta egasi','Владелец') + '</span><b>' + esc(man.holder) + '</b></div>' : '') +
      (man.bank ? '<div class="rc-r"><span>' + L('Bank','Банк') + '</span><b>' + esc(man.bank) + '</b></div>' : '') +
      '<div class="rc-r"><span>' + L("O'tkazma summasi","Сумма перевода") + '</span><b>' + mkFmt(amount) + ' ' + L("so'm","сум") + '</b></div>' +
      '<ol class="rc-steps"><li>' + L("Summani shu kartaga o'tkazing","Переведите сумму на эту карту") + '</li>' +
      '<li>' + L("To'lov chekini (skrinshot) saqlang","Сохраните чек (скриншот) оплаты") + '</li>' +
      '<li>' + L("Pastdagi «Chekni yuborish» tugmasini bosib rasmni yuklang","Нажмите «Отправить чек» ниже и загрузите фото") + '</li></ol></div>';
  }
  function rcShowManual(){
    var box = rcEl('rcManual');
    if (!box) { mkToast(L("Karta raqami hali kiritilmagan. Adminga murojaat qiling","Номер карты не указан. Обратитесь к администратору")); return; }
    box.style.display = '';
    var cp = rcEl('rcCopy'), num = rcEl('rcNum');
    if (cp && !cp._b) { cp._b = 1; cp.addEventListener('click', function(){ haptic('tap'); rcCopy((num ? num.textContent : '').replace(/\s+/g, '')); }); }
    // Karta bosilganda raqam darhol alohida oynada (bottom-sheet) chiqadi
    var prev = document.getElementById('rcModal'); if (prev) prev.remove();
    var ov = document.createElement('div'); ov.id = 'rcModal';
    ov.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
    var inner = box.innerHTML.replace('id="rcNum"', 'id="rcNum2"').replace('id="rcCopy"', 'id="rcCopy2"');
    ov.innerHTML = '<div style="width:100%;max-width:480px;max-height:88vh;overflow:auto">' +
      '<div class="rc-card" style="margin-top:0">' + inner + '</div>' +
      '<button id="rcClose" style="width:100%;margin-top:10px;padding:14px;border:0;border-radius:16px;font-weight:800;font-size:15px;background:#fff;color:#111">' + L('Yopish','Закрыть') + '</button></div>';
    document.body.appendChild(ov);
    function close(){ var m = document.getElementById('rcModal'); if (m) m.remove(); }
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    var c2 = document.getElementById('rcClose'); if (c2) c2.addEventListener('click', function(){ haptic('tap'); close(); });
    var cp2 = document.getElementById('rcCopy2'), num2 = document.getElementById('rcNum2');
    if (cp2) cp2.addEventListener('click', function(){ haptic('tap'); rcCopy((num2 ? num2.textContent : '').replace(/\s+/g, '')); });
  }

  function rcBoxHtml(){
    return '<div class="rc-box" id="rcBox">' +
      '<div class="rc-h">🧾 ' + L("To'lov qildingizmi? Chekni yuboring","Оплатили? Отправьте чек") + '</div>' +
      '<div class="rc-p">' + L("Payme, Click yoki karta orqali to'lagan bo'lsangiz — chek rasmini yuklang. U darhol Telegram orqali adminga yuboriladi va tekshirilgach buyurtma tasdiqlanadi.",
        "Если вы оплатили через Payme, Click или картой — загрузите фото чека. Оно сразу уйдёт администратору в Telegram, и после проверки заказ будет подтверждён.") + '</div>' +
      '<div id="rcState"></div>' +
      '<input type="file" id="rcFile" accept="image/*" style="display:none">' +
      '<button class="rc-btn" id="rcPick">📤 ' + L('Chekni yuborish','Отправить чек') + '</button></div>';
  }

  function rcPaint(kind, oid){
    var s = state.mk.rc[rcKey(kind, oid)], el = rcEl('rcState'), btn = rcEl('rcPick'); if (!el) return;
    if (!s) { el.innerHTML = ''; if (btn) { btn.disabled = false; btn.textContent = '📤 ' + L('Chekni yuborish','Отправить чек'); } return; }
    var cls = '', title = '', sub = '';
    if (s.status === 'sending') { cls = 'sending'; title = '⏳ ' + L('Yuborilmoqda...','Отправляется...'); sub = L("Chek Telegram orqali adminga yuborilmoqda","Чек отправляется администратору в Telegram"); }
    else if (s.status === 'yangi') { title = '✅ ' + L("Chek yuborildi","Чек отправлен"); sub = L("Admin tekshirmoqda. Tasdiqlanishi bilan buyurtma avtomatik rasmiylashadi.","Администратор проверяет. После подтверждения заказ оформится автоматически."); }
    else if (s.status === 'tasdiqlandi') { title = '✅ ' + L("Chek tasdiqlandi","Чек подтверждён"); sub = L("To'lov qabul qilindi.","Оплата принята."); }
    else if (s.status === 'rad') { cls = 'bad'; title = '❌ ' + L("Chek qabul qilinmadi","Чек не принят"); sub = L("To'lovni tekshirib, chekni qayta yuboring.","Проверьте оплату и отправьте чек ещё раз."); }
    else { cls = 'bad'; title = '⚠️ ' + L("Yuborilmadi","Не отправлено"); sub = esc(s.err || ''); }
    el.innerHTML = '<div class="rc-sent ' + cls + '">' + (s.thumb ? '<img alt="" src="' + s.thumb + '">' : '') + '<div><b>' + title + '</b><span>' + sub + '</span></div></div>';
    if (btn) {
      btn.disabled = s.status === 'sending';
      btn.textContent = s.status === 'yangi' || s.status === 'tasdiqlandi' ? '📤 ' + L('Yana chek yuborish','Отправить ещё чек') : (s.status === 'sending' ? '⏳' : '📤 ' + L('Chekni yuborish','Отправить чек'));
    }
  }

  // Serverdan kelgan oxirgi chek holatini ekranga moslaydi (poll paytida)
  function rcSync(kind, oid, st){
    if (!st) return;
    var key = rcKey(kind, oid), s = state.mk.rc[key];
    if (!s) state.mk.rc[key] = { status: st, thumb: null };
    else if (s.status !== 'sending' && s.status !== 'error') {
      if (s.status === st) return;
      s.status = st;
      if (st === 'rad') mkToast(L("Chek qabul qilinmadi","Чек не принят"));
    } else return;
    rcPaint(kind, oid);
  }

  function rcBind(kind, oid, getMethod){
    var pick = rcEl('rcPick'), file = rcEl('rcFile'); if (!pick || !file) return;
    rcPaint(kind, oid);
    pick.addEventListener('click', function(){ haptic('select'); file.click(); });
    file.addEventListener('change', function(){
      var f = file.files && file.files[0]; file.value = ''; if (!f) return;
      var key = rcKey(kind, oid);
      state.mk.rc[key] = { status:'sending', thumb:null }; rcPaint(kind, oid);
      rcCompress(f, function(dataUrl){
        if (!dataUrl) { state.mk.rc[key] = { status:'error', err:L("Rasmni o'qib bo'lmadi. Boshqa rasm tanlang.","Не удалось прочитать фото. Выберите другое.") }; rcPaint(kind, oid); return; }
        state.mk.rc[key] = { status:'sending', thumb:dataUrl }; rcPaint(kind, oid);   // rasm darhol ko'rinadi
        apiPost('/api/public/receipt/upload', { init_data:getInitData(), kind:kind, order_id:oid, method:(getMethod ? getMethod() : 'other') || 'other', image:dataUrl }).then(function(res){
          var d = res.data || {};
          if (d.ok) { state.mk.rc[key] = { status:'yangi', thumb:dataUrl }; haptic('ok'); mkToast(L("✅ Chek adminga yuborildi","✅ Чек отправлен администратору")); }
          else state.mk.rc[key] = { status:'error', thumb:dataUrl, err:d.error ? String(d.error) : L("Xatolik yuz berdi","Произошла ошибка") };
          rcPaint(kind, oid);
        }).catch(function(){
          state.mk.rc[key] = { status:'error', thumb:dataUrl, err:L("Ulanib bo'lmadi. Internetni tekshirib, qayta yuboring.","Нет соединения. Проверьте интернет и отправьте снова.") };
          rcPaint(kind, oid);
        });
      });
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
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-head"><div class="tt"><span>💳</span>' + L("To'lov","Оплата") + '</div><div class="cn">№' + pay.order_id + '</div></div>' +
        '<div class="mk-totalbox" style="margin:0 0 16px"><span class="k">' + L("To'lov summasi","Сумма к оплате") + '</span><span class="v">' + mkFmt(pay.jami) + ' ' + L("so'm","сум") + '</span></div>' +
        '<div class="mk-hint" style="margin:0 2px 12px">' + L("To'lov usulini tanlang. To'lov tugagach shu oynaga qaytasiz — buyurtma avtomatik tasdiqlanadi.","Выберите способ оплаты. После оплаты вернитесь сюда — заказ подтвердится автоматически.") + '</div>' +
        '<div class="mk-paybtns">' + mkPayBtnsHtml(pay.links, pay.stars) + '</div>' +
        rcManualHtml(pay.manual, pay.jami) +
        rcBoxHtml() +
        '<div class="mk-wait" id="mkWait"><i></i><span>' + L("To'lov kutilmoqda...","Ожидаем оплату...") + '</span></div>' +
        '<div style="text-align:center;margin-top:12px"><span class="mk-empty" style="padding:0"><span class="act" id="mkCheckPay" style="margin-top:0">' + L("🔄 To'lovni tekshirish","🔄 Проверить оплату") + '</span></span></div>' +
        '<div class="mk-hint" style="text-align:center">' + L("To'lov qilgan bo'lsangiz va oyna yopilib qolgan bo'lsa — holatni ","Если вы оплатили, а окно закрылось — смотрите статус в разделе ") + '<span class="mk-link" id="mkPayOrders">' + L("Buyurtmalarim","Мои заказы") + '</span>' + L(" bo'limidan ko'ring.",".") + '</div>' +
      '</div>';

    mainView.querySelectorAll('.mk-payopt').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault(); haptic('select'); var k = a.getAttribute('data-p'); m.payMethod = k;
        if (k === 'manual') { rcShowManual(); return; }
        mkStartPay(k, pay.links[k], function(){ check(false); });
      });
    });
    rcBind('market', pay.order_id, function(){ return m.payMethod || 'other'; });

    var busy = false, tries = 0;
    function check(manual){
      if (busy) return; busy = true;
      apiGet('/api/public/market/order/status?id=' + pay.order_id + '&init_data=' + encodeURIComponent(getInitData())).then(function(d){
        busy = false;
        if (state.stack[state.stack.length - 1].view !== 'marketPay') return;
        if (d && d.ok && d.order) rcSync('market', pay.order_id, d.order.receipt);
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

  // ============================================================================================
  //  ADJ — Printer adjustment dasturlari (Epson va boshqalar). Market → Printer ADJ → model → to'lov.
  //  To'lov tasdiqlanishi bilan tanlangan fayl serverdan mijozning Telegram chatiga AVTOMATIK yuboriladi.
  // ============================================================================================
  state.mk.adj = { items:null, brands:[], at:0, q:'', brend:null, pay:null, buying:false, orders:null, meta:null };
  var ADJ_PENDING_KEY = 'cynet_adj_pending';

  (function(){
    if (document.getElementById('adjCss')) return;
    var css =
      '.adj-main{position:relative;display:flex;align-items:center;gap:14px;width:100%;text-align:left;margin-top:14px;padding:16px 16px;border-radius:24px;color:#fff;overflow:hidden;isolation:isolate;' +
        'background:linear-gradient(135deg,#3b82f6 0%,#4f46e5 55%,#7c3aed 100%);border:1px solid rgba(255,255,255,.2);box-shadow:0 18px 38px -16px rgba(79,70,229,.65),inset 0 1px 0 rgba(255,255,255,.35);transition:transform .18s cubic-bezier(.3,1.4,.5,1),filter .18s}' +
      '.adj-main:active{transform:scale(.97);filter:brightness(1.1)}' +
      '.adj-main .ico{flex:none;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:28px;background:rgba(255,255,255,.18)}' +
      '.adj-main .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}' +
      '.adj-main .tx b{font-family:var(--f-big);font-weight:800;font-size:17px;line-height:1.15}' +
      '.adj-main .tx span{font-size:12px;line-height:1.35;opacity:.88}' +
      '.adj-main .tag{position:absolute;right:12px;top:10px;font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:.06em;padding:3px 8px;border-radius:999px;background:#ffc83d;color:#2a1b00}' +
      '.adj-main .go{flex:none;font-size:22px;opacity:.9}' +
      '.adj-th{--c1:#3b82f6;--c2:#312e81;flex-direction:column;gap:2px}.adj-th span{font-size:32px;line-height:1}.adj-th b{font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;opacity:.95}' +
      '.adj-tag{font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:rgba(25,230,160,.12);border:1px solid rgba(25,230,160,.28);color:#9df5d3;white-space:nowrap}' +
      '.adj-hero{position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;height:150px;border-radius:26px;margin-bottom:14px;overflow:hidden;color:#fff;' +
        'background:linear-gradient(140deg,#3b82f6,#4f46e5 55%,#1e1b4b);border:1px solid rgba(255,255,255,.16)}' +
      '.adj-hero .em{font-size:54px;line-height:1}.adj-hero .lb{font-family:var(--font-mono);font-weight:700;letter-spacing:.18em;font-size:12px;opacity:.9}' +
      '.adj-list{display:flex;flex-direction:column;gap:10px;margin:0 0 4px}' +
      '.adj-li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.4;color:#d7e6e1}.adj-li i{font-style:normal;flex:none}' +
      '.adj-st{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}' +
      '.adj-st.ok{background:rgba(25,230,160,.14);border-color:rgba(25,230,160,.35);color:#9df5d3}.adj-st.bad{background:rgba(255,98,89,.14);border-color:rgba(255,98,89,.35);color:#ffb3ae}' +
      '.adj-ord{padding:14px;border-radius:20px;background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;gap:8px}' +
      '.adj-ord .r{display:flex;justify-content:space-between;align-items:center;gap:8px}.adj-ord .m{font-weight:800;font-size:15px}.adj-ord .d{font-size:12px;color:#9fb8b0}' +
      '.adj-ord button{padding:11px;border-radius:14px;font-weight:800;font-size:13px;background:rgba(79,70,229,.25);border:1px solid rgba(129,140,248,.4);color:#fff}' +
      '.adj-ord button:disabled{opacity:.55}' +
      '.adj-done{text-align:center;padding:26px 10px 8px}.adj-done .big{font-size:64px;display:block;margin-bottom:8px}.adj-done h2{font-family:var(--f-big);font-weight:800;font-size:22px;margin:0 0 6px}' +
      '.adj-done p{color:#b5cbc4;font-size:14px;line-height:1.5;margin:0 0 12px}';
    var st = document.createElement('style'); st.id = 'adjCss'; st.textContent = css; document.head.appendChild(st);
  })();

  function adjSoM(){ return L("so'm","сум"); }
  function adjExt(p){
    var m = /\.([a-z0-9]{2,5})$/i.exec(p.file_name || ''); return m ? m[1].toUpperCase() : '';
  }
  function adjFileInfo(p){
    var parts = [];
    var ext = adjExt(p); if (ext) parts.push(ext);
    if (p.file_size) parts.push(p.file_size > 1048576 ? (p.file_size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(p.file_size / 1024)) + ' KB');
    return parts.join(' · ');
  }

  function adjLoad(cb, force){
    var a = state.mk.adj;
    if (!force && a.items && (Date.now() - a.at) < MK_TTL) { cb(a.items, null); return; }
    if (!API_BASE) { cb(null, 'NO_API'); return; }
    apiGet('/api/public/adj/products').then(function(d){
      if (d && d.ok) {
        a.items = d.items || []; a.brands = d.brands || []; a.at = Date.now(); a.meta = { phone:d.phone, tg:d.tg };
        if (a.brend === null) {
          var hasEpson = a.brands.some(function(b){ return String(b.brend).toLowerCase() === 'epson'; });
          a.brend = hasEpson ? 'Epson' : '';
        }
        cb(a.items, null);
      } else cb(a.items, 'ERR');
    }).catch(function(){ cb(a.items, 'ERR'); });
  }

  // ---------- Marketdagi kirish tugmasi uchun: to'lov paytida ilova yopilgan bo'lsa ----------
  function adjCheckPending(){
    var p = mkStoreGet(ADJ_PENDING_KEY);
    if (!p || !p.order_id || (Date.now() - (p.t || 0)) > 30 * 60 * 1000) { if (p) mkStoreSet(ADJ_PENDING_KEY, null); return; }
    if (!getInitData()) return;
    apiGet('/api/public/adj/order/status?id=' + p.order_id + '&init_data=' + encodeURIComponent(getInitData())).then(function(d){
      if (!d || !d.ok) return;
      if (d.paid) {
        mkStoreSet(ADJ_PENDING_KEY, null);
        mkToast(d.delivered ? L("✅ Chip reset fayli bot chatiga yuborildi","✅ Файл Chip reset отправлен в чат с ботом") : L("✅ To'lov qabul qilindi, fayl yuborilmoqda","✅ Оплата получена, файл отправляется"));
      } else if (d.status === 'bekor') mkStoreSet(ADJ_PENDING_KEY, null);
    }).catch(function(){});
  }

  // ---------- Ro'yxat: Market → Printer ADJ ----------
  function renderMarketAdj(){
    var a = state.mk.adj;
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-sticky"><div class="mk-search">' +
          '<span class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg></span>' +
          '<input id="adjQ" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(L("Printer modeli: L805, L3150, XP-600...","Модель принтера: L805, L3150, XP-600...")) + '">' +
          '<button class="mk-clear" id="adjClear" aria-label="clear">✕</button></div>' +
          '<div class="mk-chips" id="adjChips"></div></div>' +
        '<div class="mk-head"><div class="tt"><span>🖨️</span>' + 'Chip reset' + '</div><div class="cn" id="adjCnt"></div></div>' +
        '<div class="mk-hint" style="margin:0 2px 12px">' + L("Printer modelini tanlang — to'lovdan so'ng chip reset dasturi darhol shu bot chatiga yuboriladi.","Выберите модель принтера — после оплаты программа сброса (Chip reset) сразу придёт в чат с ботом.") + '</div>' +
        '<div id="adjFree"></div>' +
        '<div class="mk-list fx" id="adjList"><div class="mk-skel"></div><div class="mk-skel"></div><div class="mk-skel"></div></div>' +
        '<div class="mk-actions" style="margin-top:16px"><button class="mk-btn ghost" id="adjMy">📥 ' + L('Xaridlarim','Мои покупки') + '</button></div>' +
      '</div>';

    var input = document.getElementById('adjQ'), clearBtn = document.getElementById('adjClear');
    var listEl = document.getElementById('adjList'), cntEl = document.getElementById('adjCnt');
    input.value = a.q || '';
    var loadError = null, first = true;

    function drawChips(){
      var box = document.getElementById('adjChips'); if (!box) return;
      var chips = [['', L('Barchasi','Все')]].concat((a.brands || []).map(function(b){ return [b.brend, b.brend]; }));
      if (chips.length < 3) { box.style.display = 'none'; return; }
      box.style.display = '';
      box.innerHTML = chips.map(function(c){ return '<button class="mk-chip' + ((a.brend || '') === c[0] ? ' on' : '') + '" data-b="' + esc(c[0]) + '">' + esc(c[1]) + '</button>'; }).join('');
      box.querySelectorAll('.mk-chip').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); a.brend = b.getAttribute('data-b'); drawChips(); paint(); });
      });
    }

    function paint(){
      clearBtn.classList.toggle('show', !!input.value);
      if (!a.items) {
        if (loadError) {
          listEl.className = 'mk-list';
          listEl.innerHTML = '<div class="mk-empty"><span class="big">📡</span><b>' + L("Ma'lumotni yuklab bo'lmadi","Не удалось загрузить данные") + '</b>' + L("Internetni tekshirib, qayta urinib ko'ring.","Проверьте интернет и повторите попытку.") + '<span class="act" id="adjRetry">' + L('Qayta urinish','Повторить') + '</span></div>';
          document.getElementById('adjRetry').addEventListener('click', function(){ loadError = null; paint(); load(true); });
        }
        return;
      }
      var tokens = mkNorm(input.value).split(/\s+/).filter(Boolean);
      var items = a.items.filter(function(p){
        if (a.brend && String(p.brend).toLowerCase() !== String(a.brend).toLowerCase()) return false;
        return !tokens.length || mkMatch(p, tokens);
      });
      cntEl.textContent = items.length + ' ' + L('ta model','моделей');
      if (!items.length) {
        listEl.className = 'mk-list';
        listEl.innerHTML = '<div class="mk-empty"><span class="big">🔎</span><b>' + (a.items.length ? L("Model topilmadi","Модель не найдена") : L("Hozircha chip reset yo'q","Пока нет Chip reset")) + '</b>' +
          (a.items.length ? L("Boshqa nom bilan qidirib ko'ring. Kerakli model yo'q bo'lsa — bizga yozing, tez orada qo'shamiz.","Попробуйте другой запрос. Нужной модели нет — напишите нам, добавим.") : L("Tez orada qo'shiladi.","Скоро добавим.")) + '</div>';
        return;
      }
      listEl.className = 'mk-list' + (first ? ' fx' : '');
      first = false;
      listEl.innerHTML = items.map(function(p, i){
        var sub = (p.nomi || (p.brend + ' ' + p.model + ' Chip reset')), fi = adjFileInfo(p);
        return '<button class="mk-card" data-id="' + p.id + '" style="--i:' + Math.min(i, 12) + '">' +
          '<span class="mk-thumb adj-th"><span>🔄</span><b>RESET</b></span>' +
          '<span class="mk-info"><span class="mk-name">' + esc(p.brend + ' ' + p.model) + '</span>' +
          '<span class="mk-meta">' + esc(sub) + (fi ? ' · ' + esc(fi) : '') + '</span>' +
          '<span class="mk-foot"><span class="mk-price">' + mkFmt(p.narx) + ' <small style="font-size:.6em;font-weight:700;opacity:.8">' + adjSoM() + '</small></span>' +
          '<span class="adj-tag">⚡ ' + L('Darhol yuboriladi','Сразу в чат') + '</span></span></span></button>';
      }).join('');
      listEl.querySelectorAll('.mk-card').forEach(function(el){
        el.addEventListener('click', function(){ haptic('select'); push({ view:'marketAdjItem', id:parseInt(el.getAttribute('data-id'), 10) }); });
      });
    }

    function load(force){
      adjLoad(function(items, err){
        if (state.stack[state.stack.length - 1].view !== 'marketAdj') return;
        if (err && !items) loadError = err;
        drawChips(); paint();
      }, force);
    }
    var tmr = null;
    input.addEventListener('input', function(){ a.q = input.value; clearTimeout(tmr); tmr = setTimeout(paint, 90); clearBtn.classList.toggle('show', !!input.value); });
    clearBtn.addEventListener('click', function(){ input.value = ''; a.q = ''; paint(); input.focus(); });
    document.getElementById('adjMy').addEventListener('click', function(){ haptic('select'); push({ view:'marketAdjOrders' }); });
    drawChips(); paint(); load(false);
    adjFreeLoad(function(f){ var box = document.getElementById('adjFree'); if (box) adjFreeDrawBanner(box, f); });
    adjCheckPending();
  }


  // ============================================================
  //  🎁 TEKIN EPSON ADJUSTMENT — botga 50 ta do'st taklif qilganlarga
  // ============================================================
  (function(){
    if (document.getElementById('afCss')) return;
    var css = [
      '.af-box{margin:0 0 14px;padding:14px;border-radius:18px;background:linear-gradient(135deg,rgba(25,230,160,.18),rgba(255,200,61,.14));border:1px solid rgba(25,230,160,.45)}',
      '.af-t{font-weight:800;font-size:15px;margin-bottom:4px}',
      '.af-s{font-size:12.5px;line-height:1.45;opacity:.85}',
      '.af-bar{height:10px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden;margin:10px 0 4px}',
      '.af-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#19e6a0,#ffc83d);transition:width .5s}',
      '.af-n{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:8px}',
      '.af-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
      '.af-acts button{flex:1;min-width:130px;padding:11px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:inherit;font-weight:700;font-size:13px}',
      '.af-acts button.pri{background:linear-gradient(135deg,#19e6a0,#0aa37a);color:#06231a;border-color:transparent}',
      '.af-ok{color:#5ee08a;font-weight:800}'
    ].join('\n');
    var st = document.createElement('style'); st.id = 'afCss'; st.textContent = css; document.head.appendChild(st);
  })();

  function adjFreeLoad(cb, force){
    var a = state.mk.adj;
    if (!getInitData() || !API_BASE) { cb(null); return; }
    if (!force && a.free && (Date.now() - (a.freeAt || 0)) < 20000) { cb(a.free); return; }
    apiGet('/api/public/adj/free/status?init_data=' + encodeURIComponent(getInitData())).then(function(d){
      if (d && d.ok) { a.free = d; a.freeAt = Date.now(); cb(d); } else cb(null);
    }).catch(function(){ cb(null); });
  }
  function adjFreeShare(f){
    if (!f || !f.link) return;
    var text = L("Online Ustaxona botiga qo'shiling — texnika ta'miri, ehtiyot qismlar va ustalar!","Присоединяйтесь к боту Online Ustaxona — ремонт техники, запчасти и мастера!");
    var url = 'https://t.me/share/url?url=' + encodeURIComponent(f.link) + '&text=' + encodeURIComponent(text);
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
  }
  function adjFreeCopy(f){
    if (!f || !f.link) return;
    var done = function(){ mkToast(L('Havola nusxalandi','Ссылка скопирована')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(f.link).then(done, function(){ window.prompt('', f.link); });
    else window.prompt('', f.link);
  }
  function adjFreeBoxHTML(f, compact){
    if (!f || !f.enabled) return '';
    var need = f.required, have = Math.min(f.invited, need), pct = Math.round(have * 100 / need);
    if (f.claimed) return '<div class="af-box"><div class="af-t af-ok">✅ ' + L("Tekin adjustment olingan","Бесплатный adjustment получен") + '</div><div class="af-s">' + L("Taklif uchun sovg'a faqat bir marta beriladi. Fayl bot chatida.","Подарок за приглашения выдаётся один раз. Файл — в чате с ботом.") + '</div></div>';
    var title = f.eligible ? '🎁 ' + L("Tabriklaymiz! Tekin Epson adjustment sizniki","Поздравляем! Бесплатный Epson adjustment ваш")
                           : '🎁 ' + L("Epson adjustment — TEKIN!","Epson adjustment — БЕСПЛАТНО!");
    var sub = f.eligible ? L("Pastdagi Epson modellardan bittasini tanlang — «Tekin olish» tugmasi chiqadi (faqat bitta beriladi).","Выберите одну из моделей Epson ниже — появится кнопка «Получить бесплатно» (выдаётся только один).")
                         : L("Botga kamida " + need + " ta do'stingizni taklif qiling. Ular sizning havolangiz orqali botga qo'shilgan bo'lishi kerak. " + need + " ta bo'lgach bitta Epson adjustment tekin beriladi.","Пригласите в бот минимум " + need + " друзей. Они должны зайти в бот по вашей ссылке. Когда наберётся " + need + " — один Epson adjustment бесплатно.");
    return '<div class="af-box"><div class="af-t">' + title + '</div>' + (compact ? '' : '<div class="af-s">' + sub + '</div>') +
      '<div class="af-bar"><i style="width:' + pct + '%"></i></div><div class="af-n"><span>' + L("Qo'shilganlar","Присоединились") + ': ' + f.invited + '</span><span>' + need + '</span></div>' +
      (f.eligible ? '' : '<div class="af-acts"><button type="button" class="pri" data-af="share">📤 ' + L("Do'stlarni taklif qilish","Пригласить друзей") + '</button><button type="button" data-af="copy">🔗 ' + L("Havolani nusxalash","Копировать ссылку") + '</button></div>') + '</div>';
  }
  function adjFreeBind(box, f){
    box.querySelectorAll('[data-af]').forEach(function(b){
      b.addEventListener('click', function(){ haptic('select'); if (b.getAttribute('data-af') === 'share') adjFreeShare(f); else adjFreeCopy(f); });
    });
  }
  function adjFreeDrawBanner(box, f){
    box.innerHTML = adjFreeBoxHTML(f, false);
    adjFreeBind(box, f);
  }

  // Epson modeli sahifasida: tekin olish tugmasi yoki progress
  function adjFreeInitItem(p){
    if (String(p.brend || '').toLowerCase() !== 'epson') return;
    var box = document.getElementById('adjFreeItem'); if (!box) return;
    adjFreeLoad(function(f){
      box = document.getElementById('adjFreeItem'); if (!box || !f || !f.enabled) return;
      var a = state.mk.adj;
      if (f.eligible) {
        box.innerHTML = '<div class="af-box"><div class="af-t">🎁 ' + L("Bu adjustment sizga TEKIN","Этот adjustment для вас БЕСПЛАТНО") + '</div>' +
          '<div class="af-s">' + L("Siz " + f.invited + " ta do'st taklif qildingiz. Faqat bitta adjustment tekin beriladi — shu modelni tanlaysizmi?","Вы пригласили " + f.invited + " друзей. Бесплатно выдаётся только один adjustment — выбираете эту модель?") + '</div>' +
          '<div class="af-acts"><button type="button" class="pri" id="afClaim">🎁 ' + L("Tekin olish","Получить бесплатно") + '</button></div>' +
          '<div class="af-s" id="afErr" style="color:#ffb3ae;margin-top:6px"></div></div>';
        document.getElementById('afClaim').addEventListener('click', function(){
          var btn = this, errEl = document.getElementById('afErr');
          if (a.claiming) return;
          if (!confirm(L("Diqqat: tekin adjustment faqat BIR MARTA beriladi. " + p.brend + " " + p.model + " ni olasizmi?","Внимание: бесплатный adjustment выдаётся только ОДИН раз. Получить " + p.brend + " " + p.model + "?"))) return;
          a.claiming = true; haptic('tap'); btn.disabled = true; btn.textContent = L('⏳ Yuborilmoqda...','⏳ Отправка...');
          apiPost('/api/public/adj/free/claim', { init_data:getInitData(), lang:srvLang(), product_id:p.id }).then(function(res){
            a.claiming = false; var d = res.data || {};
            if (d.ok) {
              haptic('ok'); a.free = null; a.freeAt = 0;
              box.innerHTML = '<div class="af-box"><div class="af-t af-ok">✅ ' + L("Adjustment botga yuborildi!","Adjustment отправлен в бот!") + '</div><div class="af-s">' + L("Faylni bot chatidan oling. Topilmasa «Xaridlarim» bo'limidan qayta yuboriladi.","Файл — в чате с ботом. Если не нашли — отправим снова из раздела «Мои покупки».") + '</div></div>';
              var buy = document.getElementById('adjBuy'); if (buy) buy.style.display = 'none';
            } else { btn.disabled = false; btn.innerHTML = '🎁 ' + L("Tekin olish","Получить бесплатно"); errEl.textContent = d.error || L("Xatolik yuz berdi","Произошла ошибка"); }
          }).catch(function(){ a.claiming = false; btn.disabled = false; btn.innerHTML = '🎁 ' + L("Tekin olish","Получить бесплатно"); errEl.textContent = L("Ulanib bo'lmadi. Internetni tekshiring.","Нет соединения. Проверьте интернет."); });
        });
      } else {
        box.innerHTML = adjFreeBoxHTML(f, true);
        adjFreeBind(box, f);
      }
    });
  }

  // ---------- Model sahifasi ----------
  function renderMarketAdjItem(entry){
    var a = state.mk.adj;
    var p = (a.items || []).find(function(x){ return x.id === entry.id; });
    if (!p) {
      mainView.innerHTML = '<div class="view mk-view"><div class="mk-skel" style="height:260px"></div></div>';
      adjLoad(function(items){
        var top = state.stack[state.stack.length - 1];
        if (top.view !== 'marketAdjItem' || top.id !== entry.id) return;
        if ((items || []).find(function(x){ return x.id === entry.id; })) renderMarketAdjItem(entry);
        else mainView.innerHTML = '<div class="view mk-view"><div class="mk-empty"><span class="big">🤷</span><b>' + L("Chip reset topilmadi","Chip reset не найден") + '</b>' + L("U sotuvdan olingan bo'lishi mumkin.","Возможно, он снят с продажи.") + '</div></div>';
      }, true);
      return;
    }
    var desc = pick(p, 'tavsif'), fi = adjFileInfo(p);
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="adj-hero"><span class="em">🖨️</span><span class="lb">' + esc(String(p.brend).toUpperCase()) + ' · CHIP RESET</span></div>' +
        '<div class="mk-d-top"><div class="mk-d-title">' + esc(p.brend + ' ' + p.model) + '</div><div class="mk-d-meta">' + esc(p.nomi || 'Chip reset') + (fi ? ' · ' + esc(fi) : '') + '</div></div>' +
        '<div class="mk-d-row"><span class="mk-d-price">' + mkFmt(p.narx) + ' <small style="font-size:.6em;font-weight:700;opacity:.8">' + adjSoM() + '</small></span><span class="mk-stock">' + L('Raqamli mahsulot','Цифровой товар') + '</span></div>' +
        '<div class="mk-sec"><h3>' + L('Nima olasiz','Что вы получите') + '</h3><div class="mk-box" style="padding:14px"><div class="adj-list">' +
          '<div class="adj-li"><i>📦</i><span>' + L("Chip reset (adjustment) dasturi fayli — waste ink counter reset va boshqa servis funksiyalar","Файл программы Chip reset / Adjustment (сброс счётчика памперса и другие сервисные функции)") + '</span></div>' +
          '<div class="adj-li"><i>⚡</i><span>' + L("To'lov tasdiqlangach fayl avtomatik shu bot chatiga yuboriladi — kutish shart emas","После подтверждения оплаты файл автоматически придёт в этот чат с ботом") + '</span></div>' +
          '<div class="adj-li"><i>🔁</i><span>' + L("Fayl yo'qolsa «Xaridlarim» bo'limidan qayta yuboriladi","Если файл потеряется — отправим снова из раздела «Мои покупки»") + '</span></div>' +
        '</div></div></div>' +
        (desc ? '<div class="mk-sec"><h3>' + L('Tavsif','Описание') + '</h3><div class="mk-box"><div class="mk-desc">' + esc(desc) + '</div></div></div>' : '') +
        '<div id="adjFreeItem"></div>' +
        '<div class="mk-hint" id="adjErr" style="color:#ffb3ae;margin:0 2px 8px"></div>' +
        '<div class="mk-actions"><button class="mk-btn pri" id="adjBuy">💳 ' + L("Sotib olish","Купить") + ' · ' + mkFmt(p.narx) + ' ' + adjSoM() + '</button></div>' +
        '<div class="mk-contact" id="adjContact"></div>' +
      '</div>';

    adjFreeInitItem(p);
    var meta = a.meta || {};
    var phone = String(meta.phone || t().contactPhone || '').replace(/[^\d+]/g, '');
    var tgUser = String(meta.tg || 'online_ustaxona').replace(/^@/, '');
    var msg = L("Assalomu alaykum! Chip reset bo'yicha so'rayman:\n","Здравствуйте! Вопрос по Chip reset:\n") + p.brend + ' ' + p.model;
    var tgUrl = 'https://t.me/' + tgUser + '?text=' + encodeURIComponent(msg);
    document.getElementById('adjContact').innerHTML =
      (phone ? '<a class="mk-btn ghost" href="tel:' + esc(phone) + '">📞 ' + L("Qo'ng'iroq","Позвонить") + '</a>' : '') +
      '<a class="mk-btn ghost" id="adjTg" href="' + esc(tgUrl) + '">✈️ ' + L("Savol berish","Задать вопрос") + '</a>';
    document.getElementById('adjTg').addEventListener('click', function(e){ if (tg && tg.openTelegramLink) { e.preventDefault(); haptic('select'); tg.openTelegramLink(tgUrl); } });

    var buyBtn = document.getElementById('adjBuy'), errEl = document.getElementById('adjErr');
    buyBtn.addEventListener('click', function(){
      if (a.buying) return;
      errEl.textContent = '';
      if (!getInitData()) { errEl.textContent = L("Xarid qilish uchun ilovani Telegram ichida oching.","Для покупки откройте приложение внутри Telegram."); return; }
      a.buying = true; haptic('tap');
      var label = buyBtn.innerHTML; buyBtn.disabled = true; buyBtn.textContent = L('⏳ Tayyorlanmoqda...','⏳ Подготовка...');
      function reset(msg){ a.buying = false; buyBtn.disabled = false; buyBtn.innerHTML = label; if (msg) errEl.textContent = msg; }
      apiPost('/api/public/adj/order/create', { init_data:getInitData(), lang:srvLang(), product_id:p.id }).then(function(res){
        var d = res.data || {};
        if (d.ok) {
          a.buying = false;
          a.pay = { order_id:d.order_id, jami:d.jami, links:d.links || {}, stars:d.stars || 0, model:d.model || (p.brend + ' ' + p.model) };
          mkStoreSet(ADJ_PENDING_KEY, { order_id:d.order_id, t:Date.now() });
          haptic('ok'); push({ view:'marketAdjPay' });
        } else reset(d.error ? String(d.error) : L("Xatolik yuz berdi. Qayta urinib ko'ring.","Произошла ошибка. Повторите попытку."));
      }).catch(function(){ reset(L("Ulanib bo'lmadi. Internetni tekshiring.","Нет соединения. Проверьте интернет.")); });
    });
  }

  // ---------- To'lov ----------
  function renderMarketAdjPay(){
    var m = state.mk, a = m.adj, pay = a.pay;
    if (!pay) { state.stack.pop(); render(); return; }
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="mk-head"><div class="tt"><span>💳</span>' + L("To'lov","Оплата") + '</div><div class="cn">№' + pay.order_id + '</div></div>' +
        '<div class="mk-d-top" style="margin-bottom:10px"><div class="mk-d-title">🖨️ ' + esc(pay.model) + '</div><div class="mk-d-meta">Chip reset</div></div>' +
        '<div class="mk-totalbox" style="margin:0 0 16px"><span class="k">' + L("To'lov summasi","Сумма к оплате") + '</span><span class="v">' + mkFmt(pay.jami) + ' ' + adjSoM() + '</span></div>' +
        '<div class="mk-hint" style="margin:0 2px 12px">' + L("To'lov usulini tanlang. To'lov tasdiqlanishi bilan fayl avtomatik shu bot chatiga yuboriladi.","Выберите способ оплаты. После подтверждения оплаты файл автоматически придёт в чат с ботом.") + '</div>' +
        '<div class="mk-paybtns">' + mkPayBtnsHtml(pay.links, pay.stars) + '</div>' +
        rcManualHtml(pay.manual, pay.jami) +
        rcBoxHtml() +
        '<div class="mk-wait" id="mkWait"><i></i><span>' + L("To'lov kutilmoqda...","Ожидаем оплату...") + '</span></div>' +
        '<div style="text-align:center;margin-top:12px"><span class="mk-empty" style="padding:0"><span class="act" id="adjCheckPay" style="margin-top:0">' + L("🔄 To'lovni tekshirish","🔄 Проверить оплату") + '</span></span></div>' +
      '</div>';

    mainView.querySelectorAll('.mk-payopt').forEach(function(el){
      el.addEventListener('click', function(e){
        e.preventDefault(); haptic('select'); var k = el.getAttribute('data-p'); m.payMethod = k;
        if (k === 'manual') { rcShowManual(); return; }
        mkStartPay(k, pay.links[k], function(){ check(false); });
      });
    });
    rcBind('adj', pay.order_id, function(){ return m.payMethod || 'other'; });
    var busy = false, tries = 0;
    function check(manual){
      if (busy) return; busy = true;
      apiGet('/api/public/adj/order/status?id=' + pay.order_id + '&init_data=' + encodeURIComponent(getInitData())).then(function(d){
        busy = false;
        if (state.stack[state.stack.length - 1].view !== 'marketAdjPay') return;
        if (d && d.ok && d.order) rcSync('adj', pay.order_id, d.order.receipt);
        if (d && d.ok && d.paid) { onPaid(); return; }
        if (d && d.ok && d.status === 'bekor') {
          mkPayCleanup();
          var w = document.getElementById('mkWait'); if (w) w.innerHTML = '<span>' + L("Buyurtma bekor qilindi. Qaytadan sotib oling.","Заказ отменён. Оформите покупку заново.") + '</span>';
          return;
        }
        if (manual) mkToast(L("To'lov hali kelmadi","Оплата пока не поступила"));
      }).catch(function(){ busy = false; if (manual) mkToast(L("Ulanib bo'lmadi","Нет соединения")); });
    }
    function onPaid(){
      mkPayCleanup();
      var oid = pay.order_id;
      a.pay = null; a.orders = null; mkStoreSet(ADJ_PENDING_KEY, null);
      haptic('ok');
      state.stack = [{ view:'mainMenu' }, { view:'market' }, { view:'marketCats' }, { view:'marketParts', cat:'printer' }, { view:'marketAdj' }];
      push({ view:'marketAdjDone', order_id:oid });
    }
    m.payTimer = setInterval(function(){ tries++; if (tries > 300) { mkPayCleanup(); return; } check(false); }, 3000);
    m.payVis = function(){ if (!document.hidden) check(false); };
    document.addEventListener('visibilitychange', m.payVis);
    document.getElementById('adjCheckPay').addEventListener('click', function(){ haptic('tap'); check(true); });
  }

  // ---------- To'lov o'tdi: fayl yuborildi ----------
  function renderMarketAdjDone(entry){
    var m = state.mk, oid = entry.order_id;
    mainView.innerHTML =
      '<div class="view mk-view"><div class="adj-done"><span class="big">🎉</span><h2>' + L("To'lov qabul qilindi!","Оплата получена!") + '</h2>' +
        '<p id="adjDoneTx">' + L("Chip reset fayli bot chatiga yuborilmoqda...","Файл Chip reset отправляется в чат с ботом...") + '</p>' +
        '<div id="adjDoneSt"><span class="adj-st">⏳ ' + L('Yuborilmoqda','Отправляется') + '</span></div></div>' +
        '<div class="mk-actions" style="flex-direction:column"><button class="mk-btn pri" id="adjToChat">💬 ' + L("Chatga o'tish — faylni olish","Перейти в чат — забрать файл") + '</button>' +
        '<button class="mk-btn ghost" id="adjDoneMy">📥 ' + L('Xaridlarim','Мои покупки') + '</button></div></div>';
    document.getElementById('adjToChat').addEventListener('click', function(){ haptic('select'); if (tg && tg.close) tg.close(); });
    document.getElementById('adjDoneMy').addEventListener('click', function(){ haptic('select'); push({ view:'marketAdjOrders' }); });
    var tries = 0, busy = false;
    function upd(){
      if (busy) return; busy = true;
      apiGet('/api/public/adj/order/status?id=' + oid + '&init_data=' + encodeURIComponent(getInitData())).then(function(d){
        busy = false;
        var top = state.stack[state.stack.length - 1];
        if (!top || top.view !== 'marketAdjDone' || top.order_id !== oid) { mkPayCleanup(); return; }
        var st = document.getElementById('adjDoneSt'), tx = document.getElementById('adjDoneTx'); if (!st || !tx || !d || !d.ok) return;
        if (d.delivered) {
          st.innerHTML = '<span class="adj-st ok">✅ ' + L('Fayl yuborildi','Файл отправлен') + '</span>';
          tx.textContent = L("Chip reset fayli bot chatiga yuborildi. Chatni oching va faylni yuklab oling.","Файл Chip reset отправлен в чат с ботом. Откройте чат и скачайте файл.");
          mkPayCleanup();
        } else if (d.status === 'xato') {
          st.innerHTML = '<span class="adj-st bad">⚠️ ' + L('Yuborishda xato','Ошибка отправки') + '</span>';
          tx.textContent = L("Fayl yuborilmadi. «Xaridlarim» bo'limidan qayta yuborishni bosing yoki botni /start qiling.","Файл не отправлен. Нажмите «Отправить снова» в «Моих покупках» или запустите бота (/start).");
          mkPayCleanup();
        }
      }).catch(function(){ busy = false; });
    }
    upd();
    m.ordTimer = setInterval(function(){ tries++; if (tries > 20) { mkPayCleanup(); return; } upd(); }, 2000);
  }

  // ---------- Xaridlarim (qayta yuborish) ----------
  function renderMarketAdjOrders(){
    var a = state.mk.adj;
    mainView.innerHTML = '<div class="view mk-view"><div class="mk-head"><div class="tt"><span>📥</span>' + L('Xaridlarim','Мои покупки') + '</div><div class="cn" id="adjOCnt"></div></div>' +
      '<div class="mk-list" id="adjOList"><div class="mk-skel"></div><div class="mk-skel"></div></div></div>';
    function draw(items){
      var box = document.getElementById('adjOList'); if (!box) return;
      document.getElementById('adjOCnt').textContent = items.length ? items.length + ' ' + L('ta','шт.') : '';
      if (!items.length) {
        box.innerHTML = '<div class="mk-empty"><span class="big">🛍️</span><b>' + L("Hali xarid yo'q","Покупок пока нет") + '</b>' + L("Sotib olingan chip reset dasturlari shu yerda ko'rinadi.","Купленные Chip reset появятся здесь.") + '<span class="act" id="adjOGo">' + L('Chip reset ko\'rish','Смотреть Chip reset') + '</span></div>';
        document.getElementById('adjOGo').addEventListener('click', function(){ haptic('select'); state.stack = [{ view:'mainMenu' }, { view:'market' }, { view:'marketCats' }, { view:'marketParts', cat:'printer' }]; push({ view:'marketAdj' }); });
        return;
      }
      box.innerHTML = items.map(function(o){
        var ok = o.status === 'yuborildi', bad = o.status === 'xato';
        var lab = ok ? L('Yuborilgan','Отправлено') : (bad ? L('Yuborishda xato','Ошибка отправки') : L('Yuborilmoqda','Отправляется'));
        return '<div class="adj-ord"><div class="r"><span class="m">🖨️ ' + esc(o.model) + '</span><span class="adj-st ' + (ok ? 'ok' : (bad ? 'bad' : '')) + '">' + lab + '</span></div>' +
          '<div class="d">№' + o.id + ' · ' + mkFmt(o.narx) + ' ' + adjSoM() + ' · ' + esc(o.paid_at || o.created_at || '') + '</div>' +
          '<button data-oid="' + o.id + '"' + (o.resend_left > 0 ? '' : ' disabled') + '>📨 ' + L('Faylni qayta yuborish','Отправить файл снова') + '</button></div>';
      }).join('');
      box.querySelectorAll('button[data-oid]').forEach(function(b){
        b.addEventListener('click', function(){
          if (b.disabled) return; b.disabled = true; haptic('tap');
          var old = b.textContent; b.textContent = '⏳';
          apiPost('/api/public/adj/order/resend', { init_data:getInitData(), order_id:parseInt(b.getAttribute('data-oid'), 10) }).then(function(res){
            var d = res.data || {};
            if (d.ok) { haptic('ok'); mkToast(L("Fayl chatga yuborildi ✓","Файл отправлен в чат ✓")); b.textContent = old; setTimeout(load, 600); }
            else { b.disabled = false; b.textContent = old; mkToast(d.error ? String(d.error) : L("Xatolik","Ошибка")); }
          }).catch(function(){ b.disabled = false; b.textContent = old; mkToast(L("Ulanib bo'lmadi","Нет соединения")); });
        });
      });
    }
    function load(){
      if (!getInitData()) { draw([]); return; }
      apiGet('/api/public/adj/orders?init_data=' + encodeURIComponent(getInitData())).then(function(d){
        if (state.stack[state.stack.length - 1].view !== 'marketAdjOrders') return;
        a.orders = (d && d.ok) ? (d.items || []) : []; draw(a.orders);
      }).catch(function(){ if (state.stack[state.stack.length - 1].view === 'marketAdjOrders') draw(a.orders || []); });
    }
    if (a.orders) draw(a.orders);
    load();
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

      var prov = MK_PAY_NAMES[o.provider] || '';
      if (o.paid) {
        h += '<div class="mk-sec"><h3>' + L("To'lov","Оплата") + '</h3><div class="mk-box">' +
          '<div class="mk-tr"><span class="k">' + L('Usul','Способ') + '</span><span class="v">' + esc(prov || '—') + '</span></div>' +
          '<div class="mk-tr"><span class="k">' + L('Vaqt','Время') + '</span><span class="v">' + esc(o.paid_at || '—') + '</span></div></div></div>';
      }

      h += '<div class="mk-actions" id="mkOActs" style="flex-direction:column">';
      if (st === 'kutilmoqda') {
        var links = o.links || {};
        h += '<div class="mk-paybtns" style="width:100%">' + mkPayBtnsHtml(links, o.stars) + '</div>' +
          '<div style="width:100%">' + rcManualHtml(o.manual, o.jami) + rcBoxHtml() + '</div>' +
          '<button class="mk-btn ghost" id="mkOCheck">🔄 ' + L("To'lovni tekshirish","Проверить оплату") + '</button>';
      }
      h += '<button class="mk-btn ' + (st === 'kutilmoqda' ? 'ghost' : 'pri') + '" id="mkOBack">🛒 ' + L('Marketga qaytish','Вернуться в маркет') + '</button></div>';
      body.innerHTML = h;

      body.querySelectorAll('.mk-payopt').forEach(function(a){
        a.addEventListener('click', function(e){
          e.preventDefault(); haptic('select');
          mkStoreSet(MK_PENDING_KEY, { order_id:oid, t:Date.now() });
          var k = a.getAttribute('data-p'); m.payMethod = k;
          if (k === 'manual') { rcShowManual(); return; }
          mkStartPay(k, (o.links || {})[k], function(){ load(false); });
        });
      });
      if (st === 'kutilmoqda') rcBind('market', oid, function(){ return m.payMethod || 'other'; });
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
        if (o.status === 'kutilmoqda') rcSync('market', oid, o.receipt);
        var sig = JSON.stringify([o.status, o.updated_at, o.paid_at, !!entry.fresh, Object.keys(o.links || {}).length, o.receipt || '']);
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

  // ============================================================
  //  🏠 MENING USKUNALARIM (uy pasporti)
  // ============================================================
  var DV_TYPES = CATS.map(function(c){ return { id:c.id, icon:c.icon, name_uz:c.name_uz, name_ru:c.name_ru }; })
    .concat([{ id:'boshqa', icon:'🏠', name_uz:'Boshqa', name_ru:'Другое' }]);
  function dvType(id){ for (var i = 0; i < DV_TYPES.length; i++) if (DV_TYPES[i].id === id) return DV_TYPES[i]; return DV_TYPES[DV_TYPES.length - 1]; }
  function dvTitle(d){ return d.nom || [d.brend, d.model].filter(Boolean).join(' ') || pick(dvType(d.tur), 'name'); }
  function dvFmtDate(iso){ if (!iso) return '—'; var p = String(iso).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso; }
  function dvToday(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dvDaysTo(iso){ var a = new Date(dvToday() + 'T00:00:00'), b = new Date(iso + 'T00:00:00'); return Math.round((b - a) / 86400000); }
  function dvWarranty(d){
    if (d.kafolat_kun == null || !d.kafolat_tugash) return { cls:'off', txt:L('Kafolat kiritilmagan','Гарантия не указана') };
    if (d.kafolat_kun < 0) return { cls:'bad', txt:L('Kafolat tugagan','Гарантия закончилась') };
    if (d.kafolat_kun <= 30) return { cls:'warn', txt:L('Kafolat: ' + d.kafolat_kun + ' kun qoldi','Гарантия: осталось ' + d.kafolat_kun + ' дн.') };
    return { cls:'ok', txt:L('Kafolat: ' + dvFmtDate(d.kafolat_tugash) + 'gacha','Гарантия до ' + dvFmtDate(d.kafolat_tugash)) };
  }
  var DV_HIST = {
    tamir:  { ico:'🔧', uz:"Ta'mirlash", ru:'Ремонт' },
    xizmat: { ico:'🧽', uz:'Xizmat ko\'rsatish', ru:'Обслуживание' },
    qism:   { ico:'🧩', uz:'Qism almashtirish', ru:'Замена детали' },
    boshqa: { ico:'📝', uz:'Boshqa', ru:'Другое' }
  };

  (function dvInjectCss(){
    var st = document.createElement('style');
    st.textContent =
      '.dv-view{padding-bottom:40px}' +
      '.dv-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 2px 12px}' +
      '.dv-head .tt{font-family:var(--font-display);font-weight:800;font-size:20px;display:flex;align-items:center;gap:8px}' +
      '.dv-head .cn{font-family:var(--font-mono);font-size:10.5px;color:var(--cyan);border:1px solid var(--cyan-dim);padding:4px 9px;border-radius:999px}' +
      '.dv-hint{font-size:12.5px;line-height:1.5;color:var(--text-2);margin:8px 2px}' +
      '.dv-hint.err{color:var(--red);font-weight:600}' +
      '.dv-card{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:10px;border-radius:18px;background:var(--bg-panel);border:1px solid var(--border);color:var(--text-1);cursor:pointer;transition:transform .15s,background .15s}' +
      '.dv-card:active{transform:scale(.98);background:var(--bg-panel-hover)}' +
      '.dv-ico{flex:none;width:48px;height:48px;border-radius:14px;background:var(--bg-panel-2);display:flex;align-items:center;justify-content:center;font-size:26px}' +
      '.dv-card .mid{flex:1;min-width:0}' +
      '.dv-card .nm{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.dv-card .sb{font-size:12px;color:var(--text-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.dv-pill{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;margin-top:6px;border:1px solid transparent}' +
      '.dv-pill.ok{color:var(--green);background:rgba(111,207,151,.12);border-color:rgba(111,207,151,.35)}' +
      '.dv-pill.warn{color:var(--amber);background:rgba(255,145,66,.12);border-color:rgba(255,145,66,.4)}' +
      '.dv-pill.bad{color:var(--red);background:rgba(255,98,89,.12);border-color:rgba(255,98,89,.4)}' +
      '.dv-pill.off{color:var(--text-3);background:var(--bg-panel-2);border-color:var(--border)}' +
      '.dv-add{width:100%;padding:15px;border-radius:16px;font-weight:800;font-size:14px;border:1.5px dashed var(--cyan-dim);color:var(--cyan);background:transparent;margin:6px 0 14px;cursor:pointer}' +
      '.dv-add:active{transform:scale(.98)}' +
      '.dv-empty{text-align:center;padding:36px 18px;color:var(--text-2);line-height:1.55}' +
      '.dv-empty .big{font-size:60px;display:block;margin-bottom:10px}' +
      '.dv-empty b{display:block;color:var(--text-1);font-size:18px;margin-bottom:6px}' +
      '.dv-sec{margin:20px 2px 8px;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:8px}' +
      '.dv-sec small{font-weight:600;color:var(--text-2);font-size:12px}' +
      '.dv-box{background:var(--bg-panel);border:1px solid var(--border);border-radius:18px;padding:4px 14px}' +
      '.dv-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-soft);font-size:13.5px}' +
      '.dv-row:last-child{border-bottom:none}' +
      '.dv-row .k{color:var(--text-2)}.dv-row .v{font-weight:600;text-align:right;word-break:break-word}' +
      '.dv-item{padding:12px 0;border-bottom:1px solid var(--border-soft)}.dv-item:last-child{border-bottom:none}' +
      '.dv-item .top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}' +
      '.dv-item .tx{font-size:13.5px;line-height:1.45;font-weight:600}' +
      '.dv-item .meta{font-size:12px;color:var(--text-2);margin-top:3px}' +
      '.dv-item .meta.late{color:var(--red);font-weight:700}' +
      '.dv-acts{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}' +
      '.dv-mini{padding:7px 12px;border-radius:10px;font-size:12px;font-weight:700;background:var(--bg-panel-2);border:1px solid var(--border);color:var(--text-1);cursor:pointer}' +
      '.dv-mini.go{color:var(--green);border-color:rgba(111,207,151,.4)}.dv-mini.del{color:var(--red)}' +
      '.dv-actions{display:flex;gap:10px;margin:14px 0 4px;flex-wrap:wrap}' +
      '.dv-actions .btn{flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 12px;border-radius:14px;font-weight:700;font-size:14px;border:none;cursor:pointer}' +
      '.dv-actions .btn.btn-ghost{border:1px solid var(--border)}' +
      '.dv-types{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}' +
      '.dv-t{padding:10px 4px;border-radius:14px;background:var(--bg-panel);border:1.5px solid var(--border);color:var(--text-1);font-size:11.5px;font-weight:600;text-align:center;cursor:pointer;line-height:1.25}' +
      '.dv-t .e{display:block;font-size:24px;margin-bottom:3px}' +
      '.dv-t.on{border-color:var(--cyan);background:rgba(79,216,201,.12)}' +
      '.dv-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}' +
      '.dv-chips .c{padding:8px 12px;border-radius:999px;background:var(--bg-panel);border:1.5px solid var(--border);font-size:12.5px;font-weight:600;color:var(--text-1);cursor:pointer}' +
      '.dv-chips .c.on{border-color:var(--cyan);background:rgba(79,216,201,.12)}' +
      '.dv-form select,.dv-form input[type=date]{width:100%;padding:13px 14px;border-radius:14px;background:var(--bg-panel);border:1px solid var(--border);color:var(--text-1);font-size:15px;font-family:inherit}' +
      '.dv-total{display:flex;justify-content:space-between;padding:12px 14px;margin-bottom:10px;border-radius:14px;background:var(--bg-panel-2);font-size:13px}' +
      '.dv-total b{color:var(--amber)}';
    document.head.appendChild(st);
  })();

  state.dv = { items:null, loading:false };

  function dvAuthOk(){ return !!getInitData() && !!API_BASE; }
  function dvNoAuthHTML(){
    return '<div class="view dv-view"><div class="dv-empty"><span class="big">🔒</span><b>' + L('Telegram ichida oching','Откройте внутри Telegram') + '</b>' +
      L("Uskunalaringiz shaxsiy — ularni ko'rish uchun ilovani Telegram bot orqali oching.","Ваша техника личная — откройте приложение через Telegram-бот.") + '</div></div>';
  }
  function dvApiErr(d){ return (d && d.error) ? String(d.error) : L('Xatolik yuz berdi. Qayta urinib ko\'ring.','Произошла ошибка. Повторите попытку.'); }
  function dvPost(path, body){
    body = body || {}; body.init_data = getInitData(); body.lang = srvLang();
    return apiPost(path, body).then(function(r){ return r.data; });
  }
  function dvBack(){ state.dv.items = null; state.stack.pop(); render(); }

  // ---------- Ro'yxat ----------
  function renderDevices(){
    if (!dvAuthOk()) { mainView.innerHTML = dvNoAuthHTML(); return; }
    var dv = state.dv;
    function paint(){
      var items = dv.items || [];
      var html = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>🏠</span>' + L('Mening uskunalarim','Моя техника') + '</div><div class="cn">' + items.length + ' ' + L('ta','шт.') + '</div></div>';
      if (!items.length) {
        html += '<div class="dv-empty"><span class="big">📦</span><b>' + L("Hali uskuna qo'shilmagan","Пока нет техники") + '</b>' +
          L("Uskunangizni qo'shing — kafolat, ta'mirlash tarixi va vaqtida eslatmalar bir joyda bo'ladi.","Добавьте технику — гарантия, история ремонта и напоминания в одном месте.") + '</div>';
      }
      html += '<button class="dv-add" id="dvAdd">➕ ' + L("Uskuna qo'shish","Добавить технику") + '</button>';
      html += items.map(function(d){
        var w = dvWarranty(d), ty = dvType(d.tur);
        var sub = [pick(ty, 'name'), d.brend && d.model ? d.brend + ' ' + d.model : (d.brend || d.model)].filter(Boolean).join(' · ');
        var rem = d.next_reminder ? ' · ⏰ ' + dvFmtDate(d.next_reminder) : '';
        return '<button class="dv-card" data-id="' + d.id + '"><span class="dv-ico">' + ty.icon + '</span><span class="mid"><div class="nm">' + esc(dvTitle(d)) + '</div>' +
          '<div class="sb">' + esc(sub) + '</div><span class="dv-pill ' + w.cls + '">' + esc(w.txt) + '</span><span class="sb">' + rem + '</span></span><span>›</span></button>';
      }).join('');
      html += '<div class="dv-hint">' + L("🔔 Bot kafolat tugashi va davriy xizmat (tozalash, filtr) haqida o'zi eslatib turadi.","🔔 Бот сам напомнит об окончании гарантии и плановом обслуживании (чистка, фильтры).") + '</div></div>';
      mainView.innerHTML = html;
      document.getElementById('dvAdd').addEventListener('click', function(){ haptic('select'); push({ view:'deviceForm' }); });
      mainView.querySelectorAll('.dv-card').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); push({ view:'device', id:parseInt(b.getAttribute('data-id'), 10) }); });
      });
    }
    if (dv.items) { paint(); return; }
    mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">⏳</span>' + L('Yuklanmoqda...','Загрузка...') + '</div></div>';
    apiGet('/api/public/devices?init_data=' + encodeURIComponent(getInitData())).then(function(d){
      if (state.stack[state.stack.length - 1].view !== 'devices') return;
      if (!d || !d.ok) { mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">⚠️</span>' + esc(dvApiErr(d)) + '</div></div>'; return; }
      dv.items = d.items; paint();
    }).catch(function(){
      mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">📡</span>' + L("Ulanib bo'lmadi. Internetni tekshiring.","Нет соединения. Проверьте интернет.") + '</div></div>';
    });
  }

  // ---------- Qo'shish / tahrirlash ----------
  function renderDeviceForm(entry){
    if (!dvAuthOk()) { mainView.innerHTML = dvNoAuthHTML(); return; }
    var editing = !!entry.id;
    function paint(d){
      d = d || { tur:(entry.tur || ''), brend:'', model:'', nom:'', sotib_sana:'', kafolat_oy:0, serial:'', izoh:'' };
      var sel = d.tur || '';
      var wOpts = [0, 6, 12, 24, 36, 60];
      mainView.innerHTML = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>' + (editing ? '✏️' : '➕') + '</span>' +
        (editing ? L('Uskunani tahrirlash','Редактирование') : L("Uskuna qo'shish","Добавить технику")) + '</div></div>' +
        '<div class="dv-sec" style="margin-top:4px">' + L('Turi','Тип') + '</div>' +
        '<div class="dv-types">' + DV_TYPES.map(function(t){ return '<button type="button" class="dv-t' + (sel === t.id ? ' on' : '') + '" data-t="' + t.id + '"><span class="e">' + t.icon + '</span>' + esc(pick(t, 'name')) + '</button>'; }).join('') + '</div>' +
        '<div class="form-card dv-form">' +
          '<div class="field"><label>🏷 ' + L('Nomi (ixtiyoriy)','Название (необязательно)') + '</label><input id="dvNom" maxlength="60" value="' + esc(d.nom) + '" placeholder="' + esc(L("Masalan: Mehmonxonadagi konditsioner","Например: Кондиционер в гостиной")) + '"></div>' +
          '<div class="field"><label>🏭 ' + L('Brend','Бренд') + '</label><input id="dvBrend" maxlength="60" value="' + esc(d.brend) + '" placeholder="Samsung, LG, Artel..."></div>' +
          '<div class="field"><label>🔖 ' + L('Model','Модель') + '</label><input id="dvModel" maxlength="80" value="' + esc(d.model) + '" placeholder="AR12TXHQASINUA"></div>' +
          '<div class="field"><label>📅 ' + L('Sotib olingan sana','Дата покупки') + '</label><input id="dvDate" type="date" max="' + dvToday() + '" value="' + esc(d.sotib_sana) + '"></div>' +
          '<div class="field"><label>🛡 ' + L('Kafolat muddati','Срок гарантии') + '</label><div class="dv-chips" id="dvWar" style="margin-bottom:0">' +
            wOpts.map(function(m){ return '<button type="button" class="c' + ((d.kafolat_oy || 0) === m ? ' on' : '') + '" data-m="' + m + '">' + (m === 0 ? L("Yo'q","Нет") : (m % 12 === 0 ? (m / 12) + ' ' + L('yil','г.') : m + ' ' + L('oy','мес.'))) + '</button>'; }).join('') + '</div></div>' +
          '<div class="field"><label>🔢 ' + L('Seriya raqami (ixtiyoriy)','Серийный номер (необязательно)') + '</label><input id="dvSerial" maxlength="60" value="' + esc(d.serial) + '"></div>' +
          '<div class="field"><label>📝 ' + L('Izoh (ixtiyoriy)','Заметка (необязательно)') + '</label><textarea id="dvIzoh" maxlength="500">' + esc(d.izoh) + '</textarea></div>' +
        '</div>' +
        '<div class="dv-hint err" id="dvErr"></div>' +
        '<div class="dv-actions"><button class="btn btn-primary" id="dvSave">💾 ' + L('Saqlash','Сохранить') + '</button></div></div>';
      var $ = function(id){ return document.getElementById(id); };
      mainView.querySelectorAll('.dv-t').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); sel = b.getAttribute('data-t'); mainView.querySelectorAll('.dv-t').forEach(function(x){ x.classList.toggle('on', x === b); }); });
      });
      var war = d.kafolat_oy || 0;
      mainView.querySelectorAll('#dvWar .c').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); war = parseInt(b.getAttribute('data-m'), 10); mainView.querySelectorAll('#dvWar .c').forEach(function(x){ x.classList.toggle('on', x === b); }); });
      });
      $('dvSave').addEventListener('click', function(){
        var err = $('dvErr'); err.textContent = '';
        if (!sel) { err.textContent = L('Uskuna turini tanlang','Выберите тип техники'); return; }
        var btn = $('dvSave'); btn.disabled = true;
        dvPost('/api/public/devices/save', { id:entry.id || null, tur:sel, nom:$('dvNom').value, brend:$('dvBrend').value, model:$('dvModel').value,
          sotib_sana:$('dvDate').value, kafolat_oy:war, serial:$('dvSerial').value, izoh:$('dvIzoh').value }).then(function(r){
          if (r && r.ok) { haptic('ok'); state.dv.items = null; state.stack.pop(); if (!editing) { push({ view:'device', id:r.id }); } else { render(); } }
          else { btn.disabled = false; err.textContent = dvApiErr(r); }
        }).catch(function(){ btn.disabled = false; err.textContent = L("Ulanib bo'lmadi","Нет соединения"); });
      });
    }
    if (!editing) { paint(); return; }
    apiGet('/api/public/devices/get?id=' + entry.id + '&init_data=' + encodeURIComponent(getInitData())).then(function(r){
      if (r && r.ok) paint(r.device); else { state.stack.pop(); render(); }
    }).catch(function(){ state.stack.pop(); render(); });
  }

  // ---------- Uskuna sahifasi ----------
  function renderDevice(entry){
    if (!dvAuthOk()) { mainView.innerHTML = dvNoAuthHTML(); return; }
    mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">⏳</span>' + L('Yuklanmoqda...','Загрузка...') + '</div></div>';
    function load(){
      apiGet('/api/public/devices/get?id=' + entry.id + '&init_data=' + encodeURIComponent(getInitData())).then(function(r){
        if (state.stack[state.stack.length - 1].view !== 'device' || state.stack[state.stack.length - 1].id !== entry.id) return;
        if (!r || !r.ok) { state.stack.pop(); render(); return; }
        paint(r.device);
      }).catch(function(){ mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">📡</span>' + L("Ulanib bo'lmadi","Нет соединения") + '</div></div>'; });
    }
    function reload(){ state.dv.items = null; load(); }
    function paint(d){
      var ty = dvType(d.tur), w = dvWarranty(d), today = dvToday();
      var hasCat = d.tur !== 'boshqa';
      var rows = [[L('Turi','Тип'), pick(ty, 'name')], [L('Brend','Бренд'), d.brend], [L('Model','Модель'), d.model], [L('Seriya raqami','Серийный номер'), d.serial],
        [L('Sotib olingan','Куплено'), d.sotib_sana ? dvFmtDate(d.sotib_sana) : ''], [L('Izoh','Заметка'), d.izoh]]
        .filter(function(r){ return r[1]; });
      var html = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>' + ty.icon + '</span>' + esc(dvTitle(d)) + '</div></div>' +
        '<div style="margin:0 2px 6px"><span class="dv-pill ' + w.cls + '" style="margin-top:0">🛡 ' + esc(w.txt) + '</span></div>' +
        '<div class="dv-box">' + rows.map(function(r){ return '<div class="dv-row"><span class="k">' + r[0] + '</span><span class="v">' + esc(r[1]) + '</span></div>'; }).join('') + '</div>' +
        '<div class="dv-actions">' +
          (hasCat ? '<button class="btn btn-ghost" id="dvDiag">🔧 ' + L('Diagnostika','Диагностика') + '</button>' : '') +
          '<button class="btn btn-ghost" id="dvCalc">💰 ' + L('Narxlar','Цены') + '</button>' +
          '<button class="btn btn-primary" id="dvMaster">📋 ' + L('Usta chaqirish','Вызвать мастера') + '</button></div>' +
        // eslatmalar
        '<div class="dv-sec"><span>⏰ ' + L('Eslatmalar','Напоминания') + '</span></div><div class="dv-box">' +
        (d.reminders.length ? d.reminders.map(function(r){
          var late = r.sana <= today, dd = dvDaysTo(r.sana);
          var meta = (late ? '⚠️ ' + L('Muddati keldi','Срок настал') + ' · ' : '') + dvFmtDate(r.sana) +
            (r.takror_oy ? ' · 🔁 ' + L('har ' + r.takror_oy + ' oyda','каждые ' + r.takror_oy + ' мес.') : '') + (!late ? ' · ' + L(dd + ' kun qoldi','через ' + dd + ' дн.') : '');
          return '<div class="dv-item"><div class="tx">' + esc(r.matn) + '</div><div class="meta' + (late ? ' late' : '') + '">' + meta + '</div>' +
            '<div class="dv-acts"><button class="dv-mini go" data-rdone="' + r.id + '">✅ ' + L('Bajarildi','Выполнено') + '</button>' +
            '<button class="dv-mini" data-rsnz="' + r.id + '">⏰ +7 ' + L('kun','дн.') + '</button><button class="dv-mini del" data-rdel="' + r.id + '">🗑</button></div></div>';
        }).join('') : '<div class="dv-hint" style="padding:8px 0">' + L("Faol eslatma yo'q.","Нет активных напоминаний.") + '</div>') +
        '</div><button class="dv-add" id="dvAddRem" style="margin-top:10px">➕ ' + L("Eslatma qo'shish","Добавить напоминание") + '</button>' +
        // tarix
        '<div class="dv-sec"><span>🧾 ' + L("Ta'mirlash tarixi","История обслуживания") + '</span><small>' + d.history.length + ' ' + L('ta','шт.') + '</small></div>' +
        (d.total_spent > 0 ? '<div class="dv-total"><span>' + L('Jami sarflangan','Всего потрачено') + '</span><b>' + mkFmt(d.total_spent) + ' ' + L("so'm","сум") + '</b></div>' : '') +
        '<div class="dv-box">' +
        (d.history.length ? d.history.map(function(h){
          var ht = DV_HIST[h.turi] || DV_HIST.boshqa;
          return '<div class="dv-item"><div class="top"><div class="tx">' + ht.ico + ' ' + esc(h.tavsif) + '</div><button class="dv-mini del" data-hdel="' + h.id + '">🗑</button></div>' +
            '<div class="meta">' + dvFmtDate(h.sana) + ' · ' + esc(state.lang === 'uz' ? ht.uz : ht.ru) + (h.narx ? ' · ' + mkFmt(h.narx) + ' ' + L("so'm","сум") : '') + (h.usta ? ' · ' + esc(h.usta) : '') + '</div></div>';
        }).join('') : '<div class="dv-hint" style="padding:8px 0">' + L("Hali yozuv yo'q.","Записей пока нет.") + '</div>') +
        '</div><button class="dv-add" id="dvAddHist" style="margin-top:10px">➕ ' + L("Yozuv qo'shish","Добавить запись") + '</button>' +
        '<div class="dv-actions"><button class="btn btn-ghost" id="dvEdit">✏️ ' + L('Tahrirlash','Изменить') + '</button>' +
        '<button class="btn btn-ghost" id="dvDel" style="color:var(--red)">🗑 ' + L("O'chirish","Удалить") + '</button></div></div>';
      mainView.innerHTML = html;
      var $ = function(id){ return document.getElementById(id); };
      if ($('dvDiag')) $('dvDiag').addEventListener('click', function(){ haptic('select'); push({ view:'category', catId:d.tur }); });
      $('dvCalc').addEventListener('click', function(){ haptic('select'); push({ view:'calc', tur:d.tur }); });
      $('dvMaster').addEventListener('click', function(){ haptic('select'); push({ view:'orderGate' }); });
      $('dvEdit').addEventListener('click', function(){ haptic('select'); push({ view:'deviceForm', id:d.id }); });
      $('dvAddRem').addEventListener('click', function(){ haptic('select'); push({ view:'deviceReminderForm', id:d.id }); });
      $('dvAddHist').addEventListener('click', function(){ haptic('select'); push({ view:'deviceHistoryForm', id:d.id }); });
      $('dvDel').addEventListener('click', function(){
        mkConfirm(L("Bu uskuna, uning tarixi va eslatmalari o'chiriladi. Davom etamizmi?","Эта техника, её история и напоминания будут удалены. Продолжить?"), function(ok){
          if (!ok) return;
          dvPost('/api/public/devices/delete', { id:d.id }).then(function(r){ if (r && r.ok) { haptic('ok'); dvBack(); } else mkToast(dvApiErr(r)); });
        });
      });
      function act(attr, path, extra){
        mainView.querySelectorAll('[' + attr + ']').forEach(function(b){
          b.addEventListener('click', function(){
            haptic('tap'); b.disabled = true;
            var body = { id:parseInt(b.getAttribute(attr), 10) }; if (extra) for (var k in extra) body[k] = extra[k];
            dvPost(path, body).then(function(r){ if (r && r.ok) reload(); else { b.disabled = false; mkToast(dvApiErr(r)); } });
          });
        });
      }
      act('data-rdone', '/api/public/devices/reminders/done');
      act('data-rsnz', '/api/public/devices/reminders/done', { snooze:true });
      act('data-rdel', '/api/public/devices/reminders/delete');
      act('data-hdel', '/api/public/devices/history/delete');
    }
    load();
  }

  // ---------- Tarixga yozuv ----------
  function renderDeviceHistoryForm(entry){
    var turi = 'tamir';
    mainView.innerHTML = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>🧾</span>' + L("Tarixga yozuv","Запись в историю") + '</div></div>' +
      '<div class="dv-chips" id="dvHT">' + Object.keys(DV_HIST).map(function(k){ return '<button type="button" class="c' + (k === turi ? ' on' : '') + '" data-k="' + k + '">' + DV_HIST[k].ico + ' ' + (state.lang === 'uz' ? DV_HIST[k].uz : DV_HIST[k].ru) + '</button>'; }).join('') + '</div>' +
      '<div class="form-card dv-form">' +
        '<div class="field"><label>📝 ' + L('Nima qilindi?','Что было сделано?') + '</label><textarea id="dvhT" maxlength="400" placeholder="' + esc(L("Masalan: Gaz to'ldirildi, kompressor tekshirildi","Например: Заправлен фреон, проверен компрессор")) + '"></textarea></div>' +
        '<div class="field"><label>📅 ' + L('Sana','Дата') + '</label><input id="dvhD" type="date" max="' + dvToday() + '" value="' + dvToday() + '"></div>' +
        '<div class="field"><label>💰 ' + L("Narxi (so'm, ixtiyoriy)","Стоимость (сум, необязательно)") + '</label><input id="dvhN" type="number" inputmode="numeric" min="0" placeholder="0"></div>' +
        '<div class="field"><label>👷 ' + L('Usta / servis (ixtiyoriy)','Мастер / сервис (необязательно)') + '</label><input id="dvhU" maxlength="80"></div>' +
      '</div><div class="dv-hint err" id="dvErr"></div>' +
      '<div class="dv-actions"><button class="btn btn-primary" id="dvSave">💾 ' + L('Saqlash','Сохранить') + '</button></div></div>';
    var $ = function(id){ return document.getElementById(id); };
    mainView.querySelectorAll('#dvHT .c').forEach(function(b){ b.addEventListener('click', function(){ haptic('select'); turi = b.getAttribute('data-k'); mainView.querySelectorAll('#dvHT .c').forEach(function(x){ x.classList.toggle('on', x === b); }); }); });
    $('dvSave').addEventListener('click', function(){
      var btn = $('dvSave'), err = $('dvErr'); err.textContent = ''; btn.disabled = true;
      dvPost('/api/public/devices/history/add', { device_id:entry.id, turi:turi, tavsif:$('dvhT').value, sana:$('dvhD').value, narx:$('dvhN').value, usta:$('dvhU').value }).then(function(r){
        if (r && r.ok) { haptic('ok'); state.dv.items = null; state.stack.pop(); render(); } else { btn.disabled = false; err.textContent = dvApiErr(r); }
      }).catch(function(){ btn.disabled = false; err.textContent = L("Ulanib bo'lmadi","Нет соединения"); });
    });
  }

  // ---------- Eslatma qo'shish ----------
  function renderDeviceReminderForm(entry){
    var rep = 0, tom = new Date(); tom.setDate(tom.getDate() + 1);
    var tomIso = tom.getFullYear() + '-' + ('0' + (tom.getMonth() + 1)).slice(-2) + '-' + ('0' + tom.getDate()).slice(-2);
    var reps = [[0, L('Bir marta','Один раз')], [1, L('Har oy','Каждый месяц')], [3, L('3 oyda','Раз в 3 мес.')], [6, L('6 oyda','Раз в 6 мес.')], [12, L('Har yili','Каждый год')]];
    mainView.innerHTML = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>⏰</span>' + L("Eslatma qo'shish","Новое напоминание") + '</div></div>' +
      '<div class="form-card dv-form">' +
        '<div class="field"><label>📝 ' + L('Nimani eslatay?','О чём напомнить?') + '</label><textarea id="dvrT" maxlength="200" placeholder="' + esc(L("Masalan: Filtrni almashtirish","Например: Заменить фильтр")) + '"></textarea></div>' +
        '<div class="field"><label>📅 ' + L('Qachon?','Когда?') + '</label><input id="dvrD" type="date" min="' + dvToday() + '" value="' + tomIso + '"></div>' +
        '<div class="field"><label>🔁 ' + L('Takrorlash','Повтор') + '</label><div class="dv-chips" id="dvRep" style="margin-bottom:0">' +
          reps.map(function(x){ return '<button type="button" class="c' + (x[0] === 0 ? ' on' : '') + '" data-m="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '</div><div class="dv-hint">' + L("Muddati kelganda bot sizga Telegramda xabar yuboradi.","Когда придёт срок, бот напишет вам в Telegram.") + '</div><div class="dv-hint err" id="dvErr"></div>' +
      '<div class="dv-actions"><button class="btn btn-primary" id="dvSave">💾 ' + L('Saqlash','Сохранить') + '</button></div></div>';
    var $ = function(id){ return document.getElementById(id); };
    mainView.querySelectorAll('#dvRep .c').forEach(function(b){ b.addEventListener('click', function(){ haptic('select'); rep = parseInt(b.getAttribute('data-m'), 10); mainView.querySelectorAll('#dvRep .c').forEach(function(x){ x.classList.toggle('on', x === b); }); }); });
    $('dvSave').addEventListener('click', function(){
      var btn = $('dvSave'), err = $('dvErr'); err.textContent = ''; btn.disabled = true;
      dvPost('/api/public/devices/reminders/add', { device_id:entry.id, matn:$('dvrT').value, sana:$('dvrD').value, takror_oy:rep }).then(function(r){
        if (r && r.ok) { haptic('ok'); state.dv.items = null; state.stack.pop(); render(); } else { btn.disabled = false; err.textContent = dvApiErr(r); }
      }).catch(function(){ btn.disabled = false; err.textContent = L("Ulanib bo'lmadi","Нет соединения"); });
    });
  }

  // ============================================================
  //  💰 NARX KALKULYATORI
  // ============================================================
  state.calc = { items:null, tur:'', sel:{} };

  (function calcInjectCss(){
    var st = document.createElement('style');
    st.textContent =
      '.cc-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:var(--bg-panel);border:1px solid var(--border);font-size:12.5px;font-weight:600;color:var(--text-2);cursor:pointer;margin-bottom:12px}' +
      '.cc-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 14px;margin-bottom:8px;border-radius:16px;background:var(--bg-panel);border:1.5px solid var(--border);color:var(--text-1);cursor:pointer;transition:transform .12s,border-color .12s}' +
      '.cc-row:active{transform:scale(.98)}' +
      '.cc-row.on{border-color:var(--cyan);background:rgba(79,216,201,.09)}' +
      '.cc-chk{flex:none;width:24px;height:24px;border-radius:8px;border:2px solid var(--text-3);display:flex;align-items:center;justify-content:center;font-size:14px;color:transparent}' +
      '.cc-row.on .cc-chk{background:var(--cyan);border-color:var(--cyan);color:#06201d}' +
      '.cc-row .nm{flex:1;font-size:14px;font-weight:600;line-height:1.3}' +
      '.cc-row .pr{flex:none;text-align:right;font-family:var(--font-mono);font-size:11.5px;color:var(--amber);font-weight:700;line-height:1.35}' +
      '.cc-total{position:sticky;bottom:10px;z-index:5;margin:16px 0 8px;padding:14px 16px;border-radius:18px;background:linear-gradient(135deg,#1d2b2a,#16212b);border:1.5px solid var(--cyan-dim);box-shadow:0 14px 30px -12px rgba(0,0,0,.7)}' +
      '.cc-total .k{font-size:11.5px;color:var(--text-2);letter-spacing:.04em;text-transform:uppercase}' +
      '.cc-total .v{font-family:var(--font-display);font-weight:800;font-size:22px;margin-top:3px;color:var(--text-1)}' +
      '.cc-total .v small{font-size:13px;font-weight:700;color:var(--text-2)}' +
      '.cc-total .n{font-size:11.5px;color:var(--text-2);margin-top:4px}';
    document.head.appendChild(st);
  })();

  function ccRange(it){
    if (!it.max && !it.min) return L('kelishiladi','договорная');
    if (it.min === it.max) return mkFmt(it.max);
    return mkFmt(it.min) + ' – ' + mkFmt(it.max);
  }

  function renderCalc(entry){
    var c = state.calc;
    if (entry && entry.tur && entry.tur !== c.tur) { c.tur = entry.tur; c.sel = {}; }
    function go(){
      if (!c.tur) paintTypes(); else paintItems();
    }
    function paintTypes(){
      mainView.innerHTML = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>💰</span>' + L('Narx kalkulyatori','Калькулятор цен') + '</div></div>' +
        '<div class="dv-hint" style="margin-top:0">' + L("Uskuna turini tanlang, keyin kerakli ishlarni belgilang — taxminiy ta'mirlash narxini ko'rasiz.","Выберите тип техники, затем отметьте нужные работы — увидите примерную стоимость ремонта.") + '</div>' +
        '<div class="dv-types" style="margin-top:12px">' + DV_TYPES.map(function(t){ return '<button type="button" class="dv-t" data-t="' + t.id + '"><span class="e">' + t.icon + '</span>' + esc(pick(t, 'name')) + '</button>'; }).join('') + '</div></div>';
      mainView.querySelectorAll('.dv-t').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); c.tur = b.getAttribute('data-t'); c.sel = {}; go(); window.scrollTo(0, 0); });
      });
    }
    function paintItems(){
      var ty = dvType(c.tur);
      var list = c.items.filter(function(x){ return x.tur === c.tur; });
      var html = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>' + ty.icon + '</span>' + esc(pick(ty, 'name')) + '</div></div>' +
        '<button class="cc-chip" id="ccChange">↺ ' + L('Boshqa uskuna turi','Другой тип техники') + '</button>';
      if (!list.length) {
        html += '<div class="dv-empty"><span class="big">🧰</span><b>' + L("Bu tur uchun narxlar hali kiritilmagan","Для этого типа цены ещё не добавлены") + '</b>' +
          L("Aniq narxni usta ko'rikdan keyin aytadi.","Точную цену мастер назовёт после осмотра.") + '</div>';
      } else {
        html += '<div class="dv-sec" style="margin-top:2px"><span>' + L('Qanday ish kerak?','Какая работа нужна?') + '</span><small>' + L('bir nechtasini belgilash mumkin','можно выбрать несколько') + '</small></div>' +
          list.map(function(it){ return '<button class="cc-row' + (c.sel[it.id] ? ' on' : '') + '" data-id="' + it.id + '"><span class="cc-chk">✓</span><span class="nm">' + esc(pick(it, 'nom')) + '</span><span class="pr">' + ccRange(it) + '</span></button>'; }).join('') +
          '<div class="cc-total" id="ccTotal"></div>' +
          '<div class="dv-hint">' + L("ℹ️ Narxlar — taxminiy. Aniq narxni usta ko'rikdan keyin aytadi. Ehtiyot qism narxi alohida bo'lishi mumkin.","ℹ️ Цены ориентировочные. Точную стоимость мастер назовёт после осмотра. Запчасти могут оплачиваться отдельно.") + '</div>' +
          '<div class="dv-actions"><button class="btn btn-primary" id="ccMaster">📋 ' + L('Usta chaqirish','Вызвать мастера') + '</button>' +
          '<button class="btn btn-ghost" id="ccParts">🛒 ' + L('Ehtiyot qismlar','Запчасти') + '</button></div>';
      }
      html += '</div>';
      mainView.innerHTML = html;
      document.getElementById('ccChange').addEventListener('click', function(){ haptic('tap'); c.tur = ''; c.sel = {}; go(); });
      if (!list.length) return;
      function total(){
        var mn = 0, mx = 0, n = 0;
        list.forEach(function(it){ if (c.sel[it.id]) { mn += it.min; mx += it.max; n++; } });
        var el = document.getElementById('ccTotal');
        if (!n) { el.innerHTML = '<div class="k">' + L('Taxminiy jami','Примерный итог') + '</div><div class="n" style="font-size:13px;margin-top:6px">' + L('Kerakli ishlarni belgilang','Отметьте нужные работы') + '</div>'; return; }
        el.innerHTML = '<div class="k">' + L('Taxminiy jami','Примерный итог') + ' · ' + n + ' ' + L('ta ish','раб.') + '</div><div class="v">' +
          (mn === mx ? mkFmt(mx) : mkFmt(mn) + ' – ' + mkFmt(mx)) + ' <small>' + L("so'm","сум") + '</small></div>';
      }
      mainView.querySelectorAll('.cc-row').forEach(function(b){
        b.addEventListener('click', function(){
          haptic('select'); var id = b.getAttribute('data-id');
          if (c.sel[id]) delete c.sel[id]; else c.sel[id] = true;
          b.classList.toggle('on', !!c.sel[id]); total();
        });
      });
      total();
      document.getElementById('ccMaster').addEventListener('click', function(){ haptic('select'); push({ view:'orderGate' }); });
      document.getElementById('ccParts').addEventListener('click', function(){ haptic('select'); push({ view:'market' }); });
    }
    if (c.items) { go(); return; }
    mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">⏳</span>' + L('Yuklanmoqda...','Загрузка...') + '</div></div>';
    apiGet('/api/public/prices').then(function(d){
      if (state.stack[state.stack.length - 1].view !== 'calc') return;
      if (!d || !d.ok) { mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">⚠️</span>' + esc(dvApiErr(d)) + '</div></div>'; return; }
      c.items = d.items.map(function(x){ return { id:x.id, tur:x.tur, nom_uz:x.nom_uz, nom_ru:x.nom_ru, min:x.min, max:x.max }; });
      go();
    }).catch(function(){
      mainView.innerHTML = '<div class="view dv-view"><div class="dv-empty"><span class="big">📡</span>' + L("Ulanib bo'lmadi. Internetni tekshiring.","Нет соединения. Проверьте интернет.") + '</div></div>';
    });
  }

  // ============================================================
  //  🧭 SOTIB OLISHDAN OLDIN MASLAHATCHI
  // ============================================================
  state.adv = { tur:'', step:0, ans:{} };

  function advOpts(arr){ return arr.map(function(o){ return { v:o[0], t:L(o[1], o[2]) }; }); }
  var ADV_TYPES = ['kir','xolod','kond','tv','suv','komp'];

  // Har bir tur uchun: savollar (steps) va natija quruvchi (build). L() chaqiruv paytida baholanadi — til almashsa ham to'g'ri.
  function advDef(tur){
    var condStep = { id:'cond', q:L('Yangi sotib olasizmi?','Покупаете новую?'),
      opts:advOpts([['new','Yangi','Новая'],['bu','B/U (ishlatilgan)','Б/У (подержанная)']]) };
    var pplStep = { id:'ppl', q:L('Oilada necha kishi?','Сколько человек в семье?'),
      opts:advOpts([['1','1–2 kishi','1–2 человека'],['2','3–4 kishi','3–4 человека'],['3','5 va undan ko\'p','5 и более']]) };
    var budgetStep = { id:'bud', q:L('Sizga nima muhimroq?','Что для вас важнее?'),
      opts:advOpts([['low','Arzonroq narx','Цена пониже'],['mid','Narx va sifat muvozanati','Баланс цены и качества'],['high','Uzoq xizmat va tejamkorlik','Долговечность и экономичность']]) };

    if (tur === 'kir') return { steps:[pplStep,
      { id:'space', q:L('Mashina qo\'yiladigan joy qanday?','Какое место под машину?'), opts:advOpts([['norm','Joy yetarli','Места достаточно'],['tor','Joy tor (≈40 sm)','Место узкое (≈40 см)']]) },
      budgetStep, condStep],
      build:function(a){
        var cap = { '1':['5–6 kg','5–6 кг'], '2':['7–8 kg','7–8 кг'], '3':['9–10 kg','9–10 кг'] }[a.ppl];
        var hi = a.bud !== 'low';
        return {
          head:L('Sizga mos kir yuvish mashinasi','Вам подойдёт стиральная машина'),
          specs:[
            [L('Sig\'im','Загрузка'), L(cap[0], cap[1])],
            [L('Yuklash turi','Тип загрузки'), a.space === 'tor' ? L('Tor (slim) frontal 40–45 sm chuqurlik yoki tepadan yuklanadigan','Узкая фронтальная 40–45 см или вертикальная загрузка') : L('Frontal (oldidan yuklanadigan)','Фронтальная загрузка')],
            [L('Motor','Мотор'), hi ? L('Inverter (to\'g\'ridan-to\'g\'ri yuritma) — sokin va chidamli','Инверторный (прямой привод) — тише и долговечнее') : L('Oddiy motor ham bo\'ladi, lekin shovqinliroq','Обычный мотор тоже подойдёт, но шумнее')],
            [L('Aylanish','Отжим'), L('1000–1200 ayl/min yetarli','1000–1200 об/мин достаточно')],
            [L('Himoya','Защита'), L('Aquastop (oqishdan himoya), bolalar qulfi','Aquastop (защита от протечек), блокировка от детей')]
          ],
          tips:[
            L('Sig\'im o\'lchami: har bir oila a\'zosiga taxminan 1,5–2 kg hisoblanadi, katta ko\'rpa-to\'shak yuvsangiz bir pog\'ona kattaroq oling.','Ориентир по загрузке: примерно 1,5–2 кг на человека; если стираете одеяла — берите на размер больше.'),
            L('Quritish funksiyasi kerak bo\'lmasa, pul to\'lamang — ko\'pincha yuvish sifati pasayadi.','Если сушка не нужна — не переплачивайте: у комбинированных моделей стирка часто слабее.'),
            L('Suv qattiq bo\'lsa nakip TEN va nasosni buzadi — yuvish vositasi/filtr ishlating.','Жёсткая вода образует накипь на ТЭНе и насосе — используйте средства от накипи/фильтр.')
          ],
          check:[
            L('Do\'konda sinov yuvishni so\'rang yoki hech bo\'lmasa baraban qo\'lda erkin aylanishini tekshiring','Попросите пробную стирку или хотя бы проверьте, что барабан вращается свободно'),
            L('Eshik rezinasi va lyuk yopilishini ko\'zdan kechiring','Осмотрите манжету и закрывание люка'),
            L('Eng yaqin servis markazi bor brendni tanlang','Выбирайте бренд с сервисным центром в вашем городе')
          ],
          stab:true
        };
      } };

    if (tur === 'xolod') return { steps:[pplStep, budgetStep, condStep],
      build:function(a){
        var vol = { '1':['150–250 l','150–250 л'], '2':['250–350 l','250–350 л'], '3':['350–500 l','350–500 л'] }[a.ppl];
        var hi = a.bud !== 'low';
        return {
          head:L('Sizga mos xolodilnik','Вам подойдёт холодильник'),
          specs:[
            [L('Umumiy hajm','Общий объём'), L(vol[0], vol[1])],
            [L('Eritish tizimi','Разморозка'), L('No Frost — muz hosil bo\'lmaydi, eritish shart emas','No Frost — лёд не образуется, размораживать не нужно')],
            [L('Kompressor','Компрессор'), hi ? L('Inverter — tejamkor, sokin, kuchlanish o\'zgarishiga chidamliroq','Инвертор — экономичнее, тише, устойчивее к скачкам напряжения') : L('Oddiy kompressor ham mos, lekin ko\'proq shovqin va elektr sarfi','Обычный компрессор подойдёт, но он шумнее и потребляет больше')],
            [L('Iqlim sinfi','Климатический класс'), L('ST yoki T — issiq iqlim uchun','ST или T — для жаркого климата')],
            [L('Shovqin','Шум'), L('40 dB dan past bo\'lgani yaxshi','лучше ниже 40 дБ')]
          ],
          tips:[
            L('Hajm: har bir kishiga taxminan 100–150 litr. Muzlatgich kamerasi kerak bo\'lsa, uning hajmiga alohida qarang.','Объём: примерно 100–150 л на человека. Если нужна большая морозилка — смотрите её объём отдельно.'),
            L('Voltaj tez-tez o\'zgarsa, kompressor eng birinchi zarar ko\'radi — stabilizator tavsiya etiladi.','При частых скачках напряжения первым страдает компрессор — рекомендуем стабилизатор.')
          ],
          check:[
            L('Eshik rezinasi zich yopilishini tekshiring (qog\'oz varag\'ini qisib ko\'ring)','Проверьте плотность уплотнителя (зажмите лист бумаги дверцей)'),
            L('Yetkazishda qiya olib kelingan bo\'lsa, ulashdan oldin 2–4 soat tik turib dam olsin','Если привезли в наклоне — перед включением дайте постоять вертикально 2–4 часа'),
            L('Kompressor ulanganda g\'alati shovqin yoki titrash bo\'lmasligi kerak','Компрессор при запуске не должен сильно шуметь или вибрировать')
          ],
          stab:true
        };
      } };

    if (tur === 'kond') return { steps:[
      { id:'area', q:L('Xona maydoni qancha?','Какая площадь комнаты?'), opts:advOpts([['0','20 m² gacha','до 20 м²'],['1','20–28 m²','20–28 м²'],['2','28–36 m²','28–36 м²'],['3','36–50 m²','36–50 м²'],['4','50–70 m²','50–70 м²']]) },
      { id:'sun', q:L('Xona issiqroqmi? (quyoshli tomon, oxirgi qavat, ko\'p odam yoki texnika)','Комната жарче обычного? (солнечная сторона, последний этаж, много людей или техники)'), opts:advOpts([['no','Yo\'q, oddiy','Нет, обычная'],['yes','Ha, issiqroq','Да, жарче']]) },
      { id:'heat', q:L('Qishda isitish ham kerakmi?','Нужен ли обогрев зимой?'), opts:advOpts([['no','Faqat sovutish','Только охлаждение'],['yes','Ha, isitish ham','Да, и обогрев']]) },
      condStep],
      build:function(a){
        var sizes = [7000, 9000, 12000, 18000, 24000];
        var i = Math.min(4, parseInt(a.area, 10) + (a.sun === 'yes' ? 1 : 0));
        var btu = sizes[i];
        var heat = a.heat === 'yes';
        return {
          head:L('Sizga mos konditsioner','Вам подойдёт кондиционер'),
          specs:[
            [L('Quvvat','Мощность'), btu + ' BTU' + ' (' + (btu === 7000 ? '2,0' : btu === 9000 ? '2,6' : btu === 12000 ? '3,5' : btu === 18000 ? '5,3' : '7,0') + ' kW)'],
            [L('Turi','Тип'), L('Inverter — elektrni kam sarflaydi, sokin, harorat barqaror','Инвертор — экономит электричество, тише, держит температуру ровнее')],
            [L('Rejim','Режим'), heat ? L('Sovutish + isitish (issiqlik nasosi). Juda sovuq kunlarda (−10°C dan past) samarasi tushadi','Охлаждение + обогрев (тепловой насос). В сильные морозы (ниже −10°C) эффективность падает') : L('Faqat sovutish yetarli','Достаточно режима охлаждения')],
            [L('Freon','Хладагент'), L('R32 (zamonaviy, samaraliroq)','R32 (современный, эффективнее)')],
            [L('Qo\'shimcha','Дополнительно'), L('Wi‑Fi — ixtiyoriy, majburiy emas','Wi‑Fi — по желанию, не обязателен')]
          ],
          tips:[
            L('Quvvat xona maydoniga qarab tanlanadi (taxminan 100 Vt/m²). Kichik quvvatli konditsioner doim to\'liq ishlab, tez eskiradi.','Мощность подбирается по площади (≈100 Вт/м²). Слабый кондиционер работает на пределе и быстрее изнашивается.'),
            L('O\'rnatish alohida xizmat: quvur uzunligi, tashqi blok joyi va montaj narxini oldindan so\'rang.','Монтаж — отдельная услуга: заранее уточните длину трассы, место внешнего блока и цену монтажа.')
          ],
          check:[
            L('Tashqi blok uchun xavfsiz va xizmat ko\'rsatish mumkin bo\'lgan joy bormi, tekshiring','Убедитесь, что для внешнего блока есть безопасное и доступное для обслуживания место'),
            L('Kafolat o\'rnatishni ham qamrab oladimi, aniqlang','Уточните, распространяется ли гарантия на монтаж'),
            L('Yilda 1–2 marta tozalash kerakligini unutmang — Uskunalarim bo\'limida eslatma qo\'yiladi','Не забывайте про чистку 1–2 раза в год — напоминание можно поставить в «Моей технике»')
          ],
          stab:true
        };
      } };

    if (tur === 'tv') return { steps:[
      { id:'dist', q:L('Divandan televizorgacha masofa?','Расстояние от дивана до телевизора?'), opts:advOpts([['0','2 m gacha','до 2 м'],['1','2–3 m','2–3 м'],['2','3–4 m','3–4 м'],['3','4 m dan uzoq','более 4 м']]) },
      { id:'use', q:L('Asosan nima uchun?','Для чего в основном?'), opts:advOpts([['tv','Kundalik ko\'rish, YouTube','Повседневный просмотр, YouTube'],['kino','Kino va seriallar','Кино и сериалы'],['game','O\'yin (PlayStation/Xbox)','Игры (PlayStation/Xbox)']]) },
      budgetStep, condStep],
      build:function(a){
        var size = [['40–43"','40–43"'],['50–55"','50–55"'],['55–65"','55–65"'],['65–75"','65–75"']][parseInt(a.dist, 10)];
        var panel = a.bud === 'high' ? L('OLED yoki QLED/Mini‑LED — chuqur qora rang va yorqin tasvir','OLED или QLED/Mini‑LED — глубокий чёрный и яркая картинка') : a.bud === 'mid' ? L('QLED yoki yaxshi VA/IPS LED','QLED или хороший VA/IPS LED') : L('Oddiy LED (VA yoki IPS) yetarli','Обычный LED (VA или IPS) достаточно');
        var game = a.use === 'game';
        return {
          head:L('Sizga mos televizor','Вам подойдёт телевизор'),
          specs:[
            [L('Diagonal','Диагональ'), L(size[0], size[1])],
            [L('Ruxsat','Разрешение'), L('4K (UHD). 8K kerak emas — kontent yo\'q','4K (UHD). 8K не нужен — нет контента')],
            [L('Ekran turi','Тип матрицы'), panel],
            [L('Smart tizim','Smart‑платформа'), L('Google TV / Android TV yoki Tizen, webOS — YouTube va kinoteatr ilovalari bo\'lsin','Google TV / Android TV или Tizen, webOS — с YouTube и онлайн‑кинотеатрами')],
            [L('Tasvir tezligi','Частота'), game ? L('120 Hz, HDMI 2.1, VRR — o\'yin uchun','120 Гц, HDMI 2.1, VRR — для игр') : L('60 Hz yetarli','60 Гц достаточно')]
          ],
          tips:[
            L('Masofa qoidasi: televizor diagonali (dyuym) ≈ masofa (metr) × 20. Juda katta qilib olish ham yaxshi emas.','Правило: диагональ (дюймы) ≈ расстояние (метры) × 20. Слишком большой экран тоже неудобен.'),
            L('Ekran (matritsa) — eng qimmat qism. Uni ta\'mirlash narxini Narx kalkulyatorida ko\'ring; kuchlanish to\'satdan sakrashidan himoya uchun stabilizator foydali.','Матрица — самая дорогая деталь. Стоимость её ремонта смотрите в калькуляторе цен; от скачков напряжения полезен стабилизатор.')
          ],
          check:[
            L('Do\'konda qora va oq fonli rasmni ko\'ring — o\'lik piksellar, yorug\'lik dog\'lari bo\'lmasin','Включите тёмную и светлую картинку — не должно быть битых пикселей и пятен подсветки'),
            L('HDMI/USB portlari soni va Wi‑Fi ulanishini tekshiring','Проверьте количество HDMI/USB и работу Wi‑Fi'),
            L('Kafolat talonidagi seriya raqami qutidagi bilan mos bo\'lsin','Серийный номер в гарантии должен совпадать с номером на коробке')
          ],
          stab:true
        };
      } };

    if (tur === 'suv') return { steps:[pplStep,
      { id:'use', q:L('Suv nimaga ishlatiladi?','Для чего нужна горячая вода?'), opts:advOpts([['small','Idish-tovoq, qo\'l yuvish','Посуда, мытьё рук'],['dush','Dush','Душ'],['vanna','Vanna / ko\'p suv','Ванна / много воды']]) },
      condStep],
      build:function(a){
        var base = { '1':[50,80], '2':[80,100], '3':[100,150] }[a.ppl];
        var extra = a.use === 'vanna' ? 30 : (a.use === 'small' ? -20 : 0);
        var lo = Math.max(10, base[0] + extra), hi = base[1] + extra;
        return {
          head:L('Sizga mos suv isitgich','Вам подойдёт водонагреватель'),
          specs:[
            [L('Hajm','Объём'), lo + '–' + hi + ' ' + L('litr','л')],
            [L('Quvvat','Мощность'), L('1,5–2 kW (ko\'p bo\'lsa — simlar yuki ortadi)','1,5–2 кВт (больше — выше нагрузка на проводку)')],
            [L('Bak','Бак'), L('Emal yoki titan qoplamali, magniy anodli','С эмалью или титановым покрытием, с магниевым анодом')],
            [L('TEN','ТЭН'), L('Quruq TEN — nakipdan kam zarar ko\'radi','«Сухой» ТЭН — меньше страдает от накипи')]
          ],
          tips:[
            L('Katta bak ko\'proq issiq suv beradi, lekin sekin qiziydi va ko\'p elektr sarflaydi.','Большой бак даёт больше горячей воды, но дольше греется и тратит больше энергии.'),
            L('Magniy anodni yiliga 1 marta tekshirib turing — bu bakning umrini uzaytiradi. Eslatmani Uskunalarimga qo\'shing.','Проверяйте магниевый анод раз в год — это продлевает жизнь бака. Напоминание можно добавить в «Мою технику».')
          ],
          check:[
            L('Himoya klapani (qaytarma klapan) va xavfsizlik klapani komplektda bo\'lsin','В комплекте должны быть обратный и предохранительный клапаны'),
            L('Devor mustahkam ekanini tekshiring — to\'lgan bak og\'ir','Проверьте прочность стены — полный бак тяжёлый'),
            L('Elektr o\'tkazgich va avtomat quvvatga mosligini ustadan so\'rang','Попросите мастера проверить проводку и автомат под мощность')
          ],
          stab:false
        };
      } };

    if (tur === 'komp') return { steps:[
      { id:'use', q:L('Kompyuter nima uchun kerak?','Для чего нужен компьютер?'), opts:advOpts([['office','Ofis, o\'qish, internet','Офис, учёба, интернет'],['dev','Dasturlash, dizayn','Программирование, дизайн'],['game','O\'yinlar','Игры'],['video','Video montaj, 3D','Видеомонтаж, 3D']]) },
      { id:'form', q:L('Qaysi turi qulay?','Какой формат удобнее?'), opts:advOpts([['lap','Noutbuk','Ноутбук'],['pc','Statsionar kompyuter','Стационарный ПК']]) },
      condStep],
      build:function(a){
        var ram = { office:['8 GB (16 GB afzal)','8 ГБ (лучше 16 ГБ)'], dev:['16 GB','16 ГБ'], game:['16 GB','16 ГБ'], video:['32 GB','32 ГБ'] }[a.use];
        var cpu = { office:['Core i3 / Ryzen 3 darajasi','уровня Core i3 / Ryzen 3'], dev:['Core i5 / Ryzen 5 va yuqori','Core i5 / Ryzen 5 и выше'], game:['Core i5 / Ryzen 5 va alohida videokarta','Core i5 / Ryzen 5 и дискретная видеокарта'], video:['Core i7 / Ryzen 7 va kuchli videokarta','Core i7 / Ryzen 7 и мощная видеокарта'] }[a.use];
        var lap = a.form === 'lap';
        return {
          head:L('Sizga mos kompyuter','Вам подойдёт компьютер'),
          specs:[
            [L('Protsessor','Процессор'), L(cpu[0], cpu[1])],
            [L('Operativ xotira','Оперативная память'), L(ram[0], ram[1])],
            [L('Xotira','Накопитель'), L('SSD 512 GB dan kam bo\'lmasin. Faqat HDD li kompyuter olmang','SSD не менее 512 ГБ. Не берите ПК только с HDD')],
            [lap ? L('Ekran','Экран') : L('Monitor','Монитор'), L('IPS, Full HD (1920×1080)' + (lap ? ', 14–16"' : ', 24–27"'), 'IPS, Full HD (1920×1080)' + (lap ? ', 14–16"' : ', 24–27"'))],
            lap ? [L('Batareya','Батарея'), L('Ofis uchun 8 soat va undan ko\'p','Для офиса — 8 часов и больше')] : [L('Blok pitaniya','Блок питания'), L('Zaxirali quvvatli, brendli','С запасом мощности, известного производителя')]
          ],
          tips:[
            L('Protsessor modellari tez-tez yangilanadi — aniq model emas, daraja va vazifaga qarang.','Модели процессоров быстро меняются — ориентируйтесь на уровень и задачи, а не на конкретную модель.'),
            L('RAM va SSD ni keyinroq kengaytirish mumkinmi, oldindan so\'rang (ba\'zi noutbuklarda payvandlangan).','Заранее узнайте, можно ли расширить ОЗУ и SSD (в части ноутбуков они распаяны).')
          ],
          check:[
            L('Ekranni oq va qora fonda tekshiring: o\'lik piksel, dog\' bo\'lmasin','Проверьте экран на белом и чёрном фоне: без битых пикселей и пятен'),
            L('Barcha portlar, klaviatura va tovushni sinab ko\'ring','Проверьте все порты, клавиатуру и звук'),
            lap ? L('Zaryadlovchi va batareya holatini so\'rang','Проверьте зарядку и состояние батареи') : L('Sovutish shovqini va harorat me\'yorida ekanini tekshiring','Проверьте шум охлаждения и температуру')
          ],
          stab:true
        };
      } };

    return null;
  }

  var ADV_USED = function(){ return [
    L('B/U buyum: seriya raqami o\'chirilmaganini va ishlab chiqarilgan yilini tekshiring','Б/У: проверьте, что серийный номер не стёрт, и год выпуска'),
    L('Sotuvchi oldida to\'liq yoqib, 15–20 daqiqa ishlatib ko\'ring','Включите при продавце и проверьте в работе 15–20 минут'),
    L('Ta\'mirlash izlari (burama izlari, yangi payvand) va hid bo\'lsa — ehtiyot bo\'ling','Следы вскрытия/ремонта и запах гари — повод насторожиться'),
    L('Imkon bo\'lsa, ustaga ko\'rsatib oling — «Usta chaqirish» orqali','По возможности покажите мастеру — через «Вызвать мастера»'),
    L('Kafolat yo\'q bo\'lsa, narxni pasaytirishni so\'rang','Если гарантии нет — просите скидку')
  ]; };
  var ADV_COMMON = function(){ return [
    L('Rasmiy kafolat talonini oling va chekni saqlang','Получите гарантийный талон и сохраните чек'),
    L('Shaharda brend servis markazi borligini aniqlang','Узнайте, есть ли в вашем городе сервис‑центр бренда'),
    L('Ehtiyot qismlari topilishini tekshiring (Marketimizda qidirib ko\'ring)','Проверьте доступность запчастей (поищите в нашем Маркете)'),
    L('Sotib olgach, uskunani «Mening uskunalarim»ga qo\'shing — kafolat va eslatmalar avtomatik bo\'ladi','После покупки добавьте технику в «Мою технику» — гарантия и напоминания появятся автоматически')
  ]; };

  function advList(items){ return '<ul class="ad-ul">' + items.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }

  (function advInjectCss(){
    var st = document.createElement('style');
    st.textContent =
      '.ad-prog{display:flex;gap:6px;margin:2px 0 14px}.ad-prog i{flex:1;height:5px;border-radius:99px;background:var(--bg-panel-2)}.ad-prog i.on{background:var(--cyan)}' +
      '.ad-q{font-family:var(--font-display);font-weight:800;font-size:19px;line-height:1.3;margin:4px 2px 14px}' +
      '.ad-res{border-radius:20px;padding:16px;margin-bottom:12px;background:linear-gradient(135deg,rgba(79,216,201,.12),rgba(79,216,201,.03));border:1.5px solid var(--cyan-dim)}' +
      '.ad-res h3{margin:0 0 6px;font-family:var(--font-display);font-size:18px}' +
      '.ad-spec{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid var(--border-soft);font-size:13.5px}.ad-spec:last-child{border-bottom:none}' +
      '.ad-spec .k{color:var(--text-2);flex:none;max-width:38%}.ad-spec .v{font-weight:600;text-align:right}' +
      '.ad-ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.55;color:var(--text-1)}.ad-ul li{margin:5px 0}' +
      '.ad-box{background:var(--bg-panel);border:1px solid var(--border);border-radius:18px;padding:12px 14px;margin-bottom:12px}' +
      '.ad-box .ttl{font-weight:800;font-size:14px;margin-bottom:6px}';
    document.head.appendChild(st);
  })();

  function renderAdvisor(entry){
    var a = state.adv;
    if (entry && entry.tur && entry.tur !== a.tur) { a.tur = entry.tur; a.step = 0; a.ans = {}; }
    function go(){ if (!a.tur) paintTypes(); else paintFlow(); }
    function paintTypes(){
      var types = DV_TYPES.filter(function(t){ return t.id !== 'boshqa'; });
      mainView.innerHTML = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>🧭</span>' + L('Sotib olish maslahatchisi','Советчик по покупке') + '</div></div>' +
        '<div class="dv-hint" style="margin-top:0">' + L("Nima sotib olmoqchisiz? Bir necha savolga javob bering — sizga mos parametrlar va do'konda nimani tekshirish kerakligini aytamiz.","Что хотите купить? Ответьте на несколько вопросов — подскажем подходящие параметры и что проверить в магазине.") + '</div>' +
        '<div class="dv-types" style="margin-top:12px">' + types.map(function(t){ return '<button type="button" class="dv-t" data-t="' + t.id + '"><span class="e">' + t.icon + '</span>' + esc(pick(t, 'name')) + '</button>'; }).join('') + '</div></div>';
      mainView.querySelectorAll('.dv-t').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); a.tur = b.getAttribute('data-t'); a.step = 0; a.ans = {}; go(); window.scrollTo(0, 0); });
      });
    }
    function paintFlow(){
      var ty = dvType(a.tur), def = advDef(a.tur);
      if (!def) { paintResult(ty, null); return; }
      if (a.step >= def.steps.length) { paintResult(ty, def); return; }
      var st = def.steps[a.step];
      mainView.innerHTML = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>' + ty.icon + '</span>' + esc(pick(ty, 'name')) + '</div><div class="cn">' + (a.step + 1) + '/' + def.steps.length + '</div></div>' +
        '<div class="ad-prog">' + def.steps.map(function(_, i){ return '<i class="' + (i <= a.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="ad-q">' + esc(st.q) + '</div>' +
        st.opts.map(function(o){ return '<button class="cc-row" data-v="' + esc(o.v) + '"><span class="nm">' + esc(o.t) + '</span><span>›</span></button>'; }).join('') +
        '<button class="cc-chip" id="adBack" style="margin-top:6px">← ' + L('Orqaga','Назад') + '</button></div>';
      mainView.querySelectorAll('.cc-row').forEach(function(b){
        b.addEventListener('click', function(){ haptic('select'); a.ans[st.id] = b.getAttribute('data-v'); a.step++; go(); window.scrollTo(0, 0); });
      });
      document.getElementById('adBack').addEventListener('click', function(){ haptic('tap'); if (a.step > 0) { a.step--; } else { a.tur = ''; } go(); });
    }
    function paintResult(ty, def){
      var r = def ? def.build(a.ans) : null;
      var used = a.ans.cond === 'bu';
      var html = '<div class="view dv-view"><div class="dv-head"><div class="tt"><span>' + ty.icon + '</span>' + esc(pick(ty, 'name')) + '</div></div>';
      if (r) {
        html += '<div class="ad-res"><h3>✅ ' + esc(r.head) + '</h3>' + r.specs.map(function(s){ return '<div class="ad-spec"><span class="k">' + esc(s[0]) + '</span><span class="v">' + esc(s[1]) + '</span></div>'; }).join('') + '</div>' +
          '<div class="ad-box"><div class="ttl">💡 ' + L('Maslahatlar','Советы') + '</div>' + advList(r.tips) + '</div>' +
          '<div class="ad-box"><div class="ttl">🔍 ' + L("Do'konda tekshiring","Проверьте в магазине") + '</div>' + advList(r.check) + '</div>';
      } else {
        html += '<div class="ad-res"><h3>' + L('Umumiy maslahat','Общие советы') + '</h3><div class="dv-hint" style="margin:0">' + L("Bu tur uchun batafsil maslahatchi hali yo'q. Quyidagi umumiy tavsiyalar hamma texnika uchun mos.","Для этого типа подробного советчика пока нет. Ниже — общие рекомендации для любой техники.") + '</div></div>';
      }
      if (used) html += '<div class="ad-box"><div class="ttl">♻️ ' + L('B/U sotib olsangiz','Если берёте Б/У') + '</div>' + advList(ADV_USED()) + '</div>';
      html += '<div class="ad-box"><div class="ttl">📌 ' + L('Har qanday sotib olishda','При любой покупке') + '</div>' + advList(ADV_COMMON()) + '</div>' +
        '<div class="dv-actions">' +
          '<button class="btn btn-primary" id="adAdd">🏠 ' + L("Sotib olgach — uskunalarimga qo'shish","После покупки — в мою технику") + '</button>' +
          '<button class="btn btn-ghost" id="adPrice">💰 ' + L("Ta'mirlash narxlari","Цены на ремонт") + '</button>' +
          ((r && r.stab) ? '<button class="btn btn-ghost" id="adStab">⚡ ' + L('Stabilizator (Market)','Стабилизатор (Маркет)') + '</button>' : '') +
          (used ? '<button class="btn btn-ghost" id="adMaster">📋 ' + L("Ustaga ko'rsatish","Показать мастеру") + '</button>' : '') +
          '<button class="btn btn-ghost" id="adAgain">↺ ' + L('Boshqa uskuna','Другая техника') + '</button></div></div>';
      mainView.innerHTML = html;
      var $ = function(id){ return document.getElementById(id); };
      $('adAdd').addEventListener('click', function(){ haptic('select'); push({ view:'deviceForm', tur:a.tur }); });
      $('adPrice').addEventListener('click', function(){ haptic('select'); push({ view:'calc', tur:a.tur }); });
      if ($('adStab')) $('adStab').addEventListener('click', function(){ haptic('select'); push({ view:'marketParts', cat:'stab' }); });
      if ($('adMaster')) $('adMaster').addEventListener('click', function(){ haptic('select'); push({ view:'orderGate' }); });
      $('adAgain').addEventListener('click', function(){ haptic('tap'); a.tur = ''; a.step = 0; a.ans = {}; go(); window.scrollTo(0, 0); });
    }
    go();
  }


  // ---------- Reklama paneli (tepada, har doim ko'rinib turadi) ----------
  // Tayyor reklama bo'lsa: image ga rasm manzilini (URL) yozing, link ga bosilganda ochiladigan havolani.
  var AD_BANNER = {
    link: 'https://t.me/online_ustaxona',
    image: '',
    uz: { title:"Reklamangiz uchun joy", sub:"Bu yerda sizning reklamangiz ko'rinadi", cta:"Joylash ›" },
    ru: { title:"Место для вашей рекламы", sub:"Здесь будет ваша реклама", cta:"Разместить ›" }
  };
  function adbarSync(){
    var el = document.getElementById('adBar'); if (!el) return;
    var set = function(id, v){ var n = document.getElementById(id); if (n && n.textContent !== v) n.textContent = v; };
    set('adTitle', L(AD_BANNER.uz.title, AD_BANNER.ru.title));
    set('adSub', L(AD_BANNER.uz.sub, AD_BANNER.ru.sub));
    set('adCta', L(AD_BANNER.uz.cta, AD_BANNER.ru.cta));
    el.classList.toggle('img', !!AD_BANNER.image);
    if (AD_BANNER.image) el.style.setProperty('--adimg', 'url("' + AD_BANNER.image + '")');
  }
  (function(){
    var el = document.getElementById('adBar'); if (!el) return;
    el.addEventListener('click', function(){
      haptic('select');
      try {
        if (tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(AD_BANNER.link)) tg.openTelegramLink(AD_BANNER.link);
        else window.open(AD_BANNER.link, '_blank');
      } catch(e){}
    });
  })();

  function render(){
    var entry = state.stack[state.stack.length - 1];
    mapCleanup();
    fvStop();
    if (entry.view !== 'mainMenu') mxStop();
    mkPayCleanup();
    backBtn.classList.toggle('show', state.stack.length > 1);
    renderCrumb();
    adbarSync();
    var inMk = /^market/.test(entry.view);
    document.body.classList.toggle('in-market', inMk);
    mkUpdateCartBar();
    document.getElementById('brandSub').textContent = inMk ? 'MARKET · ' + (/^marketAdj/.test(entry.view) ? 'CHIP RESET' : L('EHTIYOT QISMLAR','ЗАПЧАСТИ')) : t().subtitle;
    var tbEl = document.querySelector('.topbar');
    var adEl = document.getElementById('adBar');
    if (tbEl) document.documentElement.style.setProperty('--tb', (tbEl.offsetHeight + (adEl ? adEl.offsetHeight : 0)) + 'px');
    window.scrollTo(0,0);
    mainView.className = entry.catId ? palOf(entry.catId) : '';

    if (entry.view === 'oferta') renderOferta();
    else if (entry.view === 'mainMenu') renderMainMenu();
    else if (entry.view === 'hubUstaxona' || entry.view === 'hubProfil' || entry.view === 'hubUskuna') renderHub(entry);
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
    else if (entry.view === 'info') renderInfo(entry);
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
    else if (entry.view === 'faceCapture') renderFaceCapture(entry);
    else if (entry.view === 'market') renderMarket();
    else if (entry.view === 'marketBu') renderBu();
    else if (entry.view === 'marketBuForm') renderBuForm();
    else if (entry.view === 'marketBuMy') renderBuMy();
    else if (entry.view === 'foyd') renderFoyd();
    else if (entry.view === 'marketCats') renderMarketCats();
    else if (entry.view === 'marketParts') renderMarketParts(entry);
    else if (entry.view === 'marketPart') renderMarketPart(entry);
    else if (entry.view === 'marketCart') renderMarketCart();
    else if (entry.view === 'marketCheckout') renderMarketCheckout();
    else if (entry.view === 'marketPay') renderMarketPay();
    else if (entry.view === 'marketDone') renderMarketDone(entry);
    else if (entry.view === 'marketOrders') renderMarketOrders();
    else if (entry.view === 'marketOrder') renderMarketOrder(entry);
    else if (entry.view === 'marketAdj') renderMarketAdj();
    else if (entry.view === 'marketAdjItem') renderMarketAdjItem(entry);
    else if (entry.view === 'marketAdjPay') renderMarketAdjPay();
    else if (entry.view === 'marketAdjDone') renderMarketAdjDone(entry);
    else if (entry.view === 'marketAdjOrders') renderMarketAdjOrders();
    else if (entry.view === 'calc') renderCalc(entry);
    else if (entry.view === 'advisor') renderAdvisor(entry);
    else if (entry.view === 'devices') renderDevices();
    else if (entry.view === 'deviceForm') renderDeviceForm(entry);
    else if (entry.view === 'device') renderDevice(entry);
    else if (entry.view === 'deviceHistoryForm') renderDeviceHistoryForm(entry);
    else if (entry.view === 'deviceReminderForm') renderDeviceReminderForm(entry);
    else if (entry.view === 'feedback') renderFeedback();
    else if (entry.view === 'guide') renderGuide();
    else if (entry.view === 'guideTech') renderGuideTech(entry);
  }


  var GD = {};
  // Har bir bo'lim: [ [uz bandlari], [ru bandlari] ]
  GD.gen = { new:[[
    "Qutini ochishdan oldin va keyin telefon bilan video/rasmga oling — transport shikasti bo'lsa isbot bo'ladi.",
    "Do'konda texnikani yoqtirib ko'ring: ekran, tugmalar, tovush, sovutish/isitish ishlayaptimi.",
    "Chek, kafolat talonini va seriya raqami (S/N) yozilgan stikerni saqlang — rasmga olib qo'yish ham yaxshi.",
    "Komplektni qo'llanmadagi ro'yxat bilan solishtiring: pult, batareya, kabel, shlang, mahkamlagichlar.",
    "Qadoq va stirofoamni kafolat muddati tugaguncha (kamida 14 kun) tashlamang — qaytarish/almashtirish uchun kerak bo'ladi."
  ],[
    "Снимите на видео/фото вскрытие коробки и состояние техники — это доказательство при повреждении в транспортировке.",
    "В магазине включите технику: проверьте экран, кнопки, звук, охлаждение/нагрев.",
    "Сохраните чек, гарантийный талон и наклейку с серийным номером (S/N) — лучше сфотографировать.",
    "Сверьте комплектацию со списком в инструкции: пульт, батарейки, кабели, шланги, крепёж.",
    "Не выбрасывайте упаковку до конца срока возврата (минимум 14 дней) — она нужна для возврата/обмена."
  ]], install:[[
    "Rozetka erga ulangan (3 simli, «zemlya») bo'lishi shart — ayniqsa kir yuvish mashinasi, xolodilnik, boyler, duxovka uchun.",
    "Katta quvvatli uskunalarni uzaytirgich orqali ulamang — to'g'ridan-to'g'ri rozetkaga ulang.",
    "O'zbekiston tarmog'ida kuchlanish tez-tez tushib ketadi: xolodilnik, konditsioner, televizor uchun stabilizator ishlating.",
    "Gaz, suv va kuchli elektr ulanishlarini faqat malakali usta bajarsin."
  ],[
    "Розетка должна быть с заземлением (3 провода) — особенно для стиральной машины, холодильника, бойлера, духовки.",
    "Мощную технику не подключайте через удлинитель — только напрямую в розетку.",
    "В сети часто «проседает» напряжение: для холодильника, кондиционера, телевизора используйте стабилизатор.",
    "Газ, воду и мощное электроподключение должен делать квалифицированный мастер."
  ]], start:[[
    "Birinchi yoqishdan oldin qo'llanmani (kamida «Xavfsizlik» bo'limini) o'qib chiqing.",
    "Barcha transport plyonkalari, lentalari va himoya qistirmalarini olib tashlang.",
    "Birinchi ishga tushirishni bo'sh holda, qarov ostida o'tkazing: g'alati hid, shovqin, tutun bo'lsa darhol o'chiring.",
    "Sozlamalarni zavod holatida qoldirib, avval oddiy rejimda sinab ko'ring."
  ],[
    "Перед первым включением прочитайте инструкцию (минимум раздел «Безопасность»).",
    "Снимите все транспортировочные плёнки, ленты и защитные прокладки.",
    "Первый запуск проведите без нагрузки и под присмотром: при странном запахе, шуме, дыме — сразу выключите.",
    "Оставьте заводские настройки и сначала проверьте работу в обычном режиме."
  ]], use:[[
    "Texnikani faqat o'z vazifasi uchun ishlating va yuklama chegarasidan oshirmang.",
    "Uzoq vaqt foydalanmasangiz, rozetkadan uzib qo'ying — chaqmoq va kuchlanish sakrashidan saqlaydi.",
    "G'ayrioddiy ovoz, hid yoki xato kodi chiqsa, «Diagnostika» bo'limiga kiring."
  ],[
    "Используйте технику только по назначению и не превышайте допустимую нагрузку.",
    "Если не пользуетесь долго — отключайте от розетки: это защитит от грозы и скачков напряжения.",
    "При странном звуке, запахе или коде ошибки откройте раздел «Диагностика»."
  ]], care:[[
    "Tozalashdan oldin har doim tarmoqdan uzing.",
    "Abraziv, spirtli va kimyoviy tozalagichlarni faqat qo'llanmada ruxsat etilgan joyda ishlating.",
    "Mavsumiy profilaktikani o'z vaqtida qiling — arzon va texnika umrini uzaytiradi."
  ],[
    "Перед чисткой всегда отключайте от сети.",
    "Абразивы, спирт и химию применяйте только там, где это разрешено инструкцией.",
    "Делайте сезонную профилактику вовремя — это дёшево и продлевает срок службы."
  ]], warn:[[
    "Ho'l qo'l bilan rozetkaga tegmang, shikastlangan kabel bilan ishlatmang.",
    "O'zingiz ichini ochmang — kafolat bekor bo'ladi va xavfli. Usta chaqiring.",
    "Texnika yonida suv, yonuvchi suyuqlik yoki aerozol saqlamang."
  ],[
    "Не трогайте розетку мокрыми руками, не используйте технику с повреждённым кабелем.",
    "Не вскрывайте технику самостоятельно — гарантия аннулируется и это опасно. Вызовите мастера.",
    "Не храните рядом воду, горючие жидкости и аэрозоли."
  ]] };

  GD.tv = { new:[[
    "Televizorni ikki kishi bo'lib, faqat ramka tomonidan ushlab ko'taring — ekranga bosmang, o'rtasidan ushlamang.",
    "Komplektni tekshiring: pult, batareyalar, oyoqchalar/taglik, mahkamlash vintlari, tarmoq kabeli, kafolat.",
    "Do'konda ekranni oq va qora fonda tekshiring: o'lik piksellar, dog'lar, yoriq va yorug'lik tekis emasligi.",
    "Oyoqchalarni qadoqdagi sxema bo'yicha qo'ying; ekran yuzi pastga qaratib stolga qo'yilsa — yumshoq mato ustida."
  ],[
    "Поднимайте телевизор вдвоём, только за рамку — не давите на экран и не беритесь за центр.",
    "Проверьте комплект: пульт, батарейки, ножки/подставка, крепёж, сетевой кабель, гарантия.",
    "В магазине проверьте экран на белом и чёрном фоне: битые пиксели, пятна, трещины, неравномерная подсветка.",
    "Ножки ставьте по схеме в упаковке; если кладёте экраном вниз — только на мягкую ткань."
  ]], install:[[
    "Devorga osish: televizor VESA o'lchamiga (masalan 200×200, 400×400) mos qavs oling va devor materialiga mos dyubel/anker ishlating.",
    "Tagligi bilan qo'ysangiz, stol/tumba televizor og'irligi va kengligiga chidasin; chetga yaqin qo'ymang.",
    "Orqada va yonlarda kamida 10 sm bo'sh joy qoldiring — shamollatish uchun.",
    "Quyosh nuri tushmaydigan, radiator/konditsioner shamoli yo'q joyni tanlang. Ko'z balandligi ekran markaziga to'g'ri kelsin.",
    "Antenna/kabelli TV/HDMI/Internet kabellarini avval ulang, tarmoqqa eng oxirida ulang."
  ],[
    "Крепление на стену: купите кронштейн под размер VESA телевизора (например 200×200, 400×400) и дюбели/анкеры под материал стены.",
    "На тумбу: она должна выдерживать вес и ширину телевизора; не ставьте у самого края.",
    "Оставьте минимум 10 см свободного места сзади и по бокам — для вентиляции.",
    "Выберите место без прямого солнца и потока воздуха от радиатора/кондиционера. Центр экрана — на уровне глаз.",
    "Сначала подключите антенну/кабельное ТВ/HDMI/интернет, питание — в последнюю очередь."
  ]], start:[[
    "Ulang va pultdan yoqing; ekran tilini va mamlakatni (O'zbekiston) tanlang.",
    "Wi-Fi'ga ulang, Smart TV akkauntiga (Google/ ilova do'koni) kiring.",
    "Kanallarni avto-qidirish: efirli TV uchun DVB-T2, kabelli TV uchun DVB-C yoki operator qutisi orqali HDMI.",
    "Sozlamalar → Dastur yangilanishi: eng so'nggi versiyani o'rnating.",
    "Rasm rejimini «Kino/Uy/Standart» ga qo'ying — do'kondagi «Yorqin» (Vivid) rejim ko'zni charchatadi va ekranni tez eskiradi."
  ],[
    "Включите, выберите язык и страну (Узбекистан).",
    "Подключитесь к Wi-Fi, войдите в аккаунт Smart TV (Google/магазин приложений).",
    "Автопоиск каналов: для эфирного ТВ — DVB-T2, для кабельного — DVB-C или через приставку по HDMI.",
    "Настройки → Обновление ПО: установите последнюю версию.",
    "Режим изображения — «Кино/Дом/Стандарт»: магазинный «Яркий» (Vivid) утомляет глаза и ускоряет износ экрана."
  ]], use:[[
    "Tashqi qurilmalar (TV-box, konsol, noutbuk) uchun HDMI kabel ishlating; HDMI-CEC bitta pult bilan boshqarishga imkon beradi.",
    "Ovozni yorqinlikni kechasi kamaytiring; «Energiya tejash» rejimi quvvatni 20–30% kamaytiradi.",
    "Uzoq vaqt foydalanmasangiz, kutish (standby)da qoldirmay, tarmoq tugmasi/uzaytirgichdan o'chiring.",
    "Ilovalarni yangilab turing; keraksiz ilovalarni o'chiring — xotira bo'shaydi va TV tez ishlaydi."
  ],[
    "Для внешних устройств (ТВ-бокс, консоль, ноутбук) используйте HDMI; HDMI-CEC позволяет управлять одним пультом.",
    "Ночью уменьшайте яркость; режим «Энергосбережение» снижает потребление на 20–30%.",
    "Если не пользуетесь долго — отключайте от сети, а не оставляйте в режиме ожидания.",
    "Обновляйте приложения и удаляйте ненужные — освободится память, телевизор станет быстрее."
  ]], care:[[
    "Ekranni faqat o'chirilgan va sovigan holda, quruq yoki biroz nam mikrofibra mato bilan arting.",
    "Ekranga to'g'ridan-to'g'ri suyuqlik purkamang; spirt, ammiak, aseton ishlatmang.",
    "Shamollatish teshiklarini 3–6 oyda bir marta changyutgich (past quvvat) bilan tozalang.",
    "Chaqmoq paytida antenna va tarmoq kabelini uzing."
  ],[
    "Протирайте экран только выключенным и остывшим, сухой или слегка влажной микрофиброй.",
    "Не распыляйте жидкость на экран; не используйте спирт, аммиак, ацетон.",
    "Раз в 3–6 месяцев чистите вентиляционные отверстия пылесосом на малой мощности.",
    "Во время грозы отключайте антенну и сетевой кабель."
  ]], warn:[[
    "Ekranni barmoq yoki o'tkir narsa bilan bosmang — matritsa yorilsa kafolatga kirmaydi.",
    "Bir xil statik rasmni (logotip, o'yin interfeysi) soatlab qoldirmang — OLED/Plazmada «kuyish» bo'ladi.",
    "Bolalar bor uyda televizorni devorga yoki tumbaga mahkam o'rnating — yiqilib tushishi xavfli.",
    "Yoriq ekran, yorug'lik chizig'i, tarmoqqa ulanganda hid/shitir-shitir bo'lsa — darhol o'chiring."
  ],[
    "Не давите на экран пальцем и острыми предметами — трещина матрицы не по гарантии.",
    "Не оставляйте на часы статичную картинку (логотип, интерфейс игры) — на OLED/плазме возможно «выгорание».",
    "Если в доме дети, надёжно закрепите телевизор на стене/тумбе — падение опасно.",
    "Трещина экрана, полосы, запах или треск при включении — сразу выключите."
  ]] };

  GD.kond = { new:[[
    "Ichki va tashqi blokni, pult, mahkamlash plastinasi, drenaj shlangi, ulash kabelini tekshiring.",
    "Quvvatni xona maydoniga qarab tanlang: 9000 BTU ≈ 25 m², 12000 BTU ≈ 35 m², 18000 BTU ≈ 50 m², 24000 BTU ≈ 70 m² (shift balandligi 2,7 m gacha).",
    "Inverter modellari kam elektr sarflaydi va tovushi past — kunlik foydalanish uchun afzal.",
    "Bloklarni qadoqdan o'z joyida olish tavsiya etiladi — tashishda yon tomoniga yotqizmang."
  ],[
    "Проверьте внутренний и наружный блоки, пульт, монтажную планку, дренажный шланг, соединительный кабель.",
    "Мощность выбирайте по площади: 9000 BTU ≈ 25 м², 12000 BTU ≈ 35 м², 18000 BTU ≈ 50 м², 24000 BTU ≈ 70 м² (потолок до 2,7 м).",
    "Инверторные модели потребляют меньше и работают тише — лучше для ежедневного использования.",
    "Блоки лучше распаковывать на месте монтажа; при перевозке не кладите на бок."
  ]], install:[[
    "Konditsionerni faqat malakali usta o'rnatsin — noto'g'ri montaj kafolatni bekor qiladi va freon oqishiga olib keladi.",
    "Ichki blok: poldan 2 m dan baland, shiftdan kamida 15 sm, ro'parasida to'siq (parda, shkaf) bo'lmasin, to'g'ridan-to'g'ri quyoshdan va karavot/divan tepasidan uzoq.",
    "Tashqi blok: mustahkam qavsga, atrofida 30–50 sm bo'sh joy qoldirib, issiq havo qaytib kirmaydigan qilib qo'yiladi.",
    "Mis quvurlar: standart trassa 3–5 m, maksimal ~15 m; quvurlar issiqlik izolyatsiyasi bilan o'ralgan bo'lishi kerak.",
    "Drenaj shlangi tashqariga qiyalik bilan, bukilmasdan chiqarilsin.",
    "Elektr: alohida kabel (kamida 2,5 mm² mis) va alohida avtomat (9–12 ming BTU uchun 16 A), rozetka erga ulangan."
  ],[
    "Монтаж — только квалифицированным мастером: неправильная установка снимает гарантию и приводит к утечке фреона.",
    "Внутренний блок: выше 2 м от пола, от потолка не менее 15 см, перед ним не должно быть преград (шторы, шкаф), вдали от прямого солнца и от места над кроватью/диваном.",
    "Наружный блок: на прочный кронштейн, со свободным местом 30–50 см вокруг, чтобы горячий воздух не возвращался.",
    "Медные трубы: стандартная трасса 3–5 м, максимум ~15 м; трубы должны быть в теплоизоляции.",
    "Дренажный шланг выводится наружу под уклоном, без изгибов.",
    "Электрика: отдельный кабель (мин. 2,5 мм² медь) и отдельный автомат (для 9–12 тыс. BTU — 16 А), розетка с заземлением."
  ]], start:[[
    "Usta tizimni vakuum nasosi bilan 20–30 daqiqa vakuumlashi shart — havo va namlik qolsa kompressor tez ishdan chiqadi.",
    "Klapanlar ochilgach, ulanish joylari sovunli suv bilan oqish uchun tekshiriladi.",
    "Birinchi yoqish: pult bilan «Sovutish» rejimi, 18–20 °C — ichki blok havosi 8–12 °C sovuq chiqishi kerak.",
    "Drenaj suvi tashqariga oqayotganini va ichki blok jaluzilari ishlayotganini tekshiring.",
    "Ish tugagach ustadan montaj yozuvini (sana, usta) kafolat talonida belgilashni so'rang."
  ],[
    "Мастер обязан провести вакуумирование насосом 20–30 минут — остатки воздуха и влаги быстро убивают компрессор.",
    "После открытия вентилей места соединений проверяют на утечки мыльным раствором.",
    "Первый запуск: режим «Охлаждение», 18–20 °C — воздух из внутреннего блока должен быть холоднее на 8–12 °C.",
    "Проверьте, что дренаж отводит воду наружу, а жалюзи внутреннего блока двигаются.",
    "Попросите мастера отметить монтаж (дата, мастер) в гарантийном талоне."
  ]], use:[[
    "Yozda 24–26 °C, qishda isitishda 20–22 °C qo'yish eng tejamli va sog'lom; tashqi harorat bilan farq 6–8 °C dan oshmasin.",
    "Sovutish/isitishda eshik va derazalarni yoping.",
    "Rejimlar: Cool — sovutish, Heat — isitish, Dry — namlikni olish, Fan — shamollatish, Auto — avtomatik; Sleep tun uchun haroratni asta o'zgartiradi.",
    "Havo oqimini to'g'ridan-to'g'ri odamga qaratmang — shamollash xavfi bor.",
    "Konditsionerni o'chirgach, qayta yoqish uchun kamida 3 daqiqa kuting (kompressorni himoya qilish uchun)."
  ],[
    "Летом 24–26 °C, зимой при обогреве 20–22 °C — самое экономичное и здоровое; разница с улицей не более 6–8 °C.",
    "При работе закрывайте окна и двери.",
    "Режимы: Cool — охлаждение, Heat — обогрев, Dry — осушение, Fan — вентиляция, Auto — авто; Sleep плавно меняет температуру ночью.",
    "Не направляйте поток воздуха прямо на людей — риск простуды.",
    "После выключения подождите минимум 3 минуты перед повторным включением (защита компрессора)."
  ]], care:[[
    "Ichki blok filtrini 2–4 haftada bir marta ajratib, iliq suvda (40 °C dan issiq emas) yuving va soyada quriting.",
    "Mavsum oldidan (bahorda) professional tozalash: ichki blok radiatori, drenaj, tashqi blok; yiliga kamida 1 marta.",
    "Tashqi blok panjarasidagi chang, tol paxtasi, barglarni tozalang.",
    "Freon bosimini 1–2 yilda bir marta tekshirtiring."
  ],[
    "Фильтры внутреннего блока снимайте и мойте тёплой водой (не горячее 40 °C) раз в 2–4 недели, сушите в тени.",
    "Перед сезоном (весной) — профессиональная чистка: радиатор внутреннего блока, дренаж, наружный блок; минимум раз в год.",
    "Очищайте решётку наружного блока от пыли, тополиного пуха, листьев.",
    "Проверяйте давление фреона раз в 1–2 года."
  ]], warn:[[
    "Tashqi harorat +16 °C dan past bo'lsa sovutishga yoqmang; isitishda -7 °C (inverterda ko'pincha -15 °C) dan past bo'lsa pasportga qarang.",
    "Filtrsiz ishlatmang — radiator tiqiladi.",
    "Tashqi blokka oyoq qo'ymang va narsa osib qo'ymang.",
    "Ichki blokdan suv tomchilasa yoki muz bossa — o'chirib usta chaqiring."
  ],[
    "Не включайте на охлаждение при уличной температуре ниже +16 °C; обогрев ниже -7 °C (у инверторных часто -15 °C) — смотрите паспорт.",
    "Не работайте без фильтров — радиатор забьётся.",
    "Не наступайте на наружный блок и ничего не вешайте на него.",
    "Если из внутреннего блока капает вода или он обмерзает — выключите и вызовите мастера."
  ]] };

  GD.xolod = { new:[[
    "Xolodilnikni tik holda tashing. Yotqizilgan bo'lsa, ishga tushirishdan oldin 12–24 soat tik turishi kerak (moy kompressorga qaytishi uchun).",
    "Tik tashilgan bo'lsa ham kamida 2–4 soat kuting.",
    "Ichki va tashqi himoya plyonkalari, stirofoam va yopishqoq lentalarni olib tashlang.",
    "Ichkarini iliq suv va ozgina soda bilan yuvib, quriting — yangi plastik hidi ketadi."
  ],[
    "Перевозите холодильник строго вертикально. Если везли лёжа — перед включением выстоять 12–24 часа (масло должно стечь в компрессор).",
    "Даже при вертикальной перевозке подождите минимум 2–4 часа.",
    "Снимите защитные плёнки, пенопласт и клейкие ленты внутри и снаружи.",
    "Протрите внутри тёплой водой с небольшим количеством соды и высушите — уйдёт запах нового пластика."
  ]], install:[[
    "Devordan orqa tomonda 5–10 sm, yonlarda 2–3 sm, tepada 10 sm bo'sh joy qoldiring.",
    "Plita, radiator, quyosh nuri va isitgichdan uzoq qo'ying — aks holda ko'p elektr sarflaydi.",
    "Pol tekis bo'lsin: old oyoqchalarni sozlab xolodilnikni sal orqaga og'dirib qo'ying (eshik o'zi yopilishi uchun).",
    "Alohida rozetka (erga ulangan), uzaytirgichsiz. Stabilizator yoki kuchlanish relesi qo'yish tavsiya etiladi."
  ],[
    "Оставьте от стены 5–10 см сзади, 2–3 см по бокам, 10 см сверху.",
    "Ставьте вдали от плиты, радиатора, солнца и обогревателей — иначе большой расход электроэнергии.",
    "Пол ровный: регулируйте передние ножки, чтобы холодильник слегка наклонялся назад (дверь закрывается сама).",
    "Отдельная розетка с заземлением, без удлинителя. Рекомендуется стабилизатор или реле напряжения."
  ]], start:[[
    "Tarmoqqa ulang va 4–6 soat bo'sh ishlating; shundan keyin mahsulot joylang.",
    "Harorat: sovutgich bo'limi +3…+5 °C, muzlatgich −18 °C. Yangi xolodilnikda 3–5 raqami o'rtacha hisoblanadi.",
    "Mahsulotlarni birinchi kuni asta-sekin, bir necha bosqichda joylang.",
    "No Frost modellarida muz eritish kerak emas; oddiy (tomchi) modelda muz qalinligi 5 mm bo'lganda eritiladi."
  ],[
    "Включите в сеть и дайте поработать 4–6 часов без продуктов; потом загружайте.",
    "Температура: холодильная камера +3…+5 °C, морозильная −18 °C. На новом холодильнике 3–5 — средний режим.",
    "В первый день загружайте продукты постепенно, в несколько приёмов.",
    "В моделях No Frost размораживать не нужно; в капельных — когда лёд толщиной около 5 мм."
  ]], use:[[
    "Issiq ovqatni avval xona haroratigacha sovitib so'ng soling.",
    "Eshikni uzoq ochiq qoldirmang; to'ldirish darajasi 70–80% bo'lsin — havo aylanishi uchun mahsulotlar orasida joy qoldiring.",
    "Xom go'sht va baliqni pastki javonda, yopiq idishda saqlang — sharbat boshqa mahsulotga tomishi mumkin emas.",
    "Ichi hidlanmasligi uchun mahsulotlarni yopiq idish yoki plyonkada saqlang."
  ],[
    "Горячее сначала остудите до комнатной температуры.",
    "Не держите дверь долго открытой; заполнение 70–80% — оставляйте между продуктами место для циркуляции воздуха.",
    "Сырое мясо и рыбу держите на нижней полке в закрытой посуде, чтобы сок не попал на другие продукты.",
    "Храните продукты в закрытых контейнерах или плёнке, чтобы не было запахов."
  ]], care:[[
    "Ichini har 3–6 oyda iliq suv va soda bilan yuvib, eshik rezinasini ham tozalang.",
    "Orqa panel/kondensatorni (agar ochiq bo'lsa) yilda 1–2 marta changdan tozalang.",
    "Drenaj teshigi (orqa devor ostidagi) tiqilmasligi uchun ingichka cho'p bilan tozalab turing.",
    "Uzoq vaqt ishlatmasangiz: bo'shatib, yuvib, eshikni ochiq qoldiring."
  ],[
    "Раз в 3–6 месяцев мойте внутри тёплой водой с содой и протирайте уплотнитель двери.",
    "Заднюю панель/конденсатор (если открыт) чистите от пыли 1–2 раза в год.",
    "Дренажное отверстие на задней стенке прочищайте тонкой палочкой, чтобы не засорилось.",
    "При длительном простое: разгрузить, помыть и оставить дверь приоткрытой."
  ]], warn:[[
    "O'chirgandan keyin kamida 5 daqiqa kutib qayta yoqing — aks holda kompressor ishlamay qolishi mumkin.",
    "Muzni pichoq, o'tkir narsa bilan qirmang — sovutish trubkasi teshilishi mumkin.",
    "Tok o'chganda eshikni ochmang — sovuqlik ~4 soat saqlanadi.",
    "Ichkarida aerozol, yonuvchan suyuqlik va yopiq shisha ichimliklarni muzlatgichda saqlamang."
  ],[
    "После выключения подождите минимум 5 минут перед повторным включением — иначе компрессор может не запуститься.",
    "Не скалывайте лёд ножом и острыми предметами — можно проколоть трубку испарителя.",
    "При отключении света не открывайте дверь — холод сохраняется около 4 часов.",
    "Не храните внутри аэрозоли, горючие жидкости и закрытые бутылки в морозилке."
  ]] };

  GD.kir = { new:[[
    "ENG MUHIM: orqa devordagi transport boltlarini (odatda 4 ta) albatta oling — aks holda baraban buziladi va mashina qattiq titraydi.",
    "Boltlar tuynuklarini komplektdagi plastik tiqinlar bilan yoping; boltlarni saqlab qo'ying (ko'chirganda kerak).",
    "Stirofoam va plyonkani olib tashlang. Ichida bir oz suv chiqsa — bu zavod sinovidan, me'yor.",
    "Komplekt: kirish shlangi, drenaj shlangi (ayrim modelda), kukun uchun idish, qo'llanma."
  ],[
    "ВАЖНЕЙШЕЕ: обязательно снимите транспортировочные болты на задней стенке (обычно 4 шт.) — иначе сломается барабан и машина будет сильно вибрировать.",
    "Закройте отверстия пластиковыми заглушками из комплекта; болты сохраните (понадобятся при переезде).",
    "Уберите пенопласт и плёнку. Немного воды внутри — остаток заводского теста, это нормально.",
    "Комплект: шланг подачи воды, сливной шланг (в некоторых моделях), лоток для порошка, инструкция."
  ]], install:[[
    "Qattiq, tekis polga qo'ying; oyoqchalarni suv sathi (uroven) bilan sozlab, kontrgaykalarni qotiring — mashina tebranmasin.",
    "Sovuq suv kranidan ulang (shlang 3/4\"), albatta mexanik filtr (setka) qo'ying; shlangni bukmang.",
    "Drenaj shlangi poldan 60–100 sm balandlikda sifonga yoki kanalizatsiyaga ulangan bo'lsin; uchi suvga botmasin.",
    "Alohida erga ulangan rozetka; plastik/yog'och uy-joyda ham uzaytirgichsiz.",
    "Mashinani gaz plitasi va vannaning to'g'ridan-to'g'ri suv sachrashi joyiga qo'ymang."
  ],[
    "Ставьте на ровный жёсткий пол; отрегулируйте ножки по уровню и затяните контргайки — машина не должна качаться.",
    "Подключайте к холодному водопроводу (шланг 3/4\"), обязательно с механическим фильтром (сеткой); шланг не перегибать.",
    "Сливной шланг — на высоте 60–100 см от пола, в сифон или канализацию; конец не должен быть погружён в воду.",
    "Отдельная заземлённая розетка, без удлинителя.",
    "Не ставьте рядом с газовой плитой и в зоне прямых брызг воды из ванны."
  ]], start:[[
    "Birinchi marta kirsiz, 60–90 °C li to'liq dastur (yoki «Barabanni tozalash») bilan yuvib, ozgina kukun qo'shing — zavod yog'i va chang ketadi.",
    "Shu vaqt ichida shlang ulanishlarida oqish borligini, ustiga qog'oz qo'yib tekshiring.",
    "Mashina chayqalmasligi, boltlarsiz ham shovqinsiz aylanishini kuzating."
  ],[
    "В первый раз запустите без белья программу 60–90 °C (или «Очистка барабана») с небольшим количеством порошка — уйдут заводская смазка и пыль.",
    "В это время проверьте подключения шлангов на течь, подложив бумагу.",
    "Следите, чтобы машина не прыгала и крутилась без сильного шума."
  ]], use:[[
    "Kirni rang, mato turi va haroratga qarab ajrating; cho'ntaklarni tekshiring (tanga, qalam, qog'oz).",
    "Barabanni 3/4 to'ldiring; to'la yuklash yuvish sifatini yomonlashtiradi, kam yuklash esa mashinani qattiq titratadi.",
    "Faqat «avtomat» uchun kukun/gel ishlating — qo'lda yuvish kukuni juda ko'pik beradi.",
    "Kukun miqdori suv qattiqligi va kir miqdoriga bog'liq; Toshkentda suv o'rtacha qattiq — kalgon (antinakipin) foydali.",
    "Mato belgilari: paxta 40–60 °C, sintetika 30–40 °C, jun/ipak — maxsus rejim."
  ],[
    "Сортируйте бельё по цвету, ткани и температуре; проверяйте карманы (монеты, ручки, бумага).",
    "Загружайте барабан на 3/4: переполнение ухудшает стирку, недогруз вызывает сильную вибрацию.",
    "Используйте порошок/гель только для «автомата» — для ручной стирки даёт слишком много пены.",
    "Количество порошка зависит от жёсткости воды и объёма белья; вода у нас в основном жёсткая — полезен антинакипин.",
    "Ткани: хлопок 40–60 °C, синтетика 30–40 °C, шерсть/шёлк — специальный режим."
  ]], care:[[
    "Kukun idishini oyda 1 marta chiqarib yuving.",
    "Eshik manjetini (rezina) har yuvishdan keyin quruq latta bilan arting; eshikni va idishni ochiq qoldirib quriting — hid va chirish bo'lmasin.",
    "Drenaj nasosi filtrini (pastdagi lyuk) 1–2 oyda tozalang: oldin idish qo'yib suv chiqaring.",
    "Oyda bir marta bo'sh holda 60 °C li dastur yoki mashina tozalagichi bilan yuvish; 3–4 oyda kalgon.",
    "Kirish shlangidagi setka filtrni yilda bir marta tozalang."
  ],[
    "Лоток для порошка раз в месяц вынимайте и мойте.",
    "Манжету люка вытирайте насухо после каждой стирки; оставляйте дверцу и лоток приоткрытыми — чтобы не было запаха и плесени.",
    "Фильтр сливного насоса (нижний лючок) чистите раз в 1–2 месяца: сначала подставьте ёмкость.",
    "Раз в месяц — стирка без белья на 60 °C или средством для чистки машин; раз в 3–4 месяца — антинакипин.",
    "Сетку-фильтр на входном шланге чистите раз в год."
  ]], warn:[[
    "Transport boltlarini olmasdan ISHGA TUSHIRMANG.",
    "Yuvish ketayotganda eshikni majburlab ochmang; suv va issiqlik xavfi.",
    "Foydalanilmayotganda suv kranini yoping — shlang uzilsa uy suv bosadi.",
    "Kirish shlangi 5 yilda bir marta almashtiriladi; Aquastop himoyali shlang tavsiya etiladi.",
    "Bolalar va uy hayvonlari barabanga kirib qolmasligini nazorat qiling."
  ],[
    "НЕ ВКЛЮЧАЙТЕ без снятия транспортировочных болтов.",
    "Не открывайте люк силой во время стирки — опасность воды и ожога.",
    "Когда не пользуетесь — перекрывайте кран: прорыв шланга затопит квартиру.",
    "Шланг подачи меняйте раз в 5 лет; лучше шланг с защитой Aquastop.",
    "Следите, чтобы дети и домашние животные не залезли в барабан."
  ]] };

  GD.suv = { new:[[
    "Hajmni tanlang: 1–2 kishiga 30–50 l, 3–4 kishiga 80 l, katta oila uchun 100 l.",
    "Komplektni tekshiring: devorga mahkamlash qavslari, xavfsizlik (qaytarma) klapani, qo'llanma. Klapan bo'lmasa — albatta sotib oling.",
    "To'ldirilgan 80 l boyler 100 kg ga yaqin og'irlikda bo'ladi — devor shunga chidashi kerak."
  ],[
    "Выберите объём: 30–50 л на 1–2 человека, 80 л на 3–4, 100 л для большой семьи.",
    "Проверьте комплект: кронштейны, предохранительный (обратный) клапан, инструкция. Если клапана нет — обязательно купите.",
    "Заполненный бойлер на 80 л весит около 100 кг — стена должна это выдержать."
  ]], install:[[
    "Devor g'isht yoki beton bo'lishi kerak; gipsokarton va yupqa devorga mahkamlamang. Anker boltlar ishlating.",
    "Kirish (ko'k) va chiqish (qizil) quvurlarini adashtirmang.",
    "Xavfsizlik klapani KIRISH quvuriga o'rnatiladi — ortiqcha bosimda u suvni tashlab yuboradi; klapanga drenaj quvuri ulang.",
    "Klapan oldiga o'chirgich (kran) qo'ymang — tizim yopiq bo'lib portlashi mumkin.",
    "Erga ulangan alohida rozetka; UZO (qoldiq tok o'chirgichi) o'rnatish tavsiya etiladi."
  ],[
    "Стена должна быть кирпичной или бетонной; на гипсокартон и тонкие перегородки не вешайте. Используйте анкерные болты.",
    "Не перепутайте вход (синий) и выход (красный).",
    "Предохранительный клапан ставится на ВХОД: при превышении давления он сбрасывает воду; к клапану подведите дренажную трубку.",
    "Не ставьте кран между клапаном и бойлером — система закроется и может взорваться.",
    "Отдельная заземлённая розетка; рекомендуется УЗО (устройство защитного отключения)."
  ]], start:[[
    "AVVAL suv bilan to'ldiring: issiq suv kranini oching, suv oqguncha va havo chiqib bo'lguncha kuting; keyin kranini yoping.",
    "Shundan so'ng tarmoqqa ulang. Suvsiz yoqish isitgichni (TEN) bir zumda kuydiradi.",
    "Isish 1,5–3 soat davom etadi (hajmga qarab); termostatni 55–60 °C ga qo'ying."
  ],[
    "СНАЧАЛА заполните водой: откройте кран горячей воды и ждите, пока пойдёт вода и выйдет воздух; затем закройте кран.",
    "После этого включите в сеть. Включение без воды мгновенно сжигает ТЭН.",
    "Нагрев занимает 1,5–3 часа (в зависимости от объёма); термостат выставьте на 55–60 °C."
  ]], use:[[
    "55–60 °C eng yaxshi: energiya tejaladi, nakip kam hosil bo'ladi va kuyish xavfi kam.",
    "Uzoq safarga ketsangiz (3+ kun) o'chirib qo'ying; kamroq ketsangiz, 30–40 °C ga tushiring.",
    "Dush paytida avval sovuq, keyin issiq suvni aralashtirib oching."
  ],[
    "55–60 °C оптимально: экономит энергию, меньше накипи и риск ожога.",
    "Если уезжаете более чем на 3 дня — выключите; на меньший срок — снизьте до 30–40 °C.",
    "Для душа смешивайте горячую и холодную воду."
  ]], care:[[
    "Magniy anodni 12 oyda bir marta tekshiring va kerak bo'lsa almashtiring — u zanglashdan baklarni himoya qiladi.",
    "TEN va bakni nakipdan 1–2 yilda tozalang (suv qattiq bo'lsa tezroq).",
    "Xavfsizlik klapanidan tomchi chiqishi me'yor (isitishda); suv to'xtovsiz oqsa — klapan nosoz."
  ],[
    "Магниевый анод проверяйте раз в 12 месяцев и меняйте при необходимости — он защищает бак от коррозии.",
    "Чистите ТЭН и бак от накипи раз в 1–2 года (при жёсткой воде чаще).",
    "Капли из предохранительного клапана при нагреве — норма; если течёт постоянно — клапан неисправен."
  ]], warn:[[
    "SUVSIZ YOQMANG!",
    "Klapanni berkitmang va uning teshigini yopmang.",
    "Muzlashi mumkin bo'lgan xonada suvni to'ldirib qoldirmang — bak yoriladi.",
    "Ulanishni faqat mutaxassis qilsin; o'zingiz ichini ochmang."
  ],[
    "НЕ ВКЛЮЧАЙТЕ БЕЗ ВОДЫ!",
    "Не перекрывайте клапан и не затыкайте его отверстие.",
    "В помещении, где вода может замёрзнуть, не оставляйте бойлер заполненным — бак лопнет.",
    "Подключение — только мастер; самостоятельно не вскрывайте."
  ]] };

  GD.komp = { new:[[
    "Ekran, klaviatura, tugmalar, portlar (USB, HDMI, zaryad), kamera va dinamiklarni tekshiring.",
    "Noutbukda S/N va kafolat muddatini tekshiring (ishlab chiqaruvchi saytida).",
    "Yuklash diskida operatsion tizim bor-yo'qligini bilib oling: «DOS/FreeDOS» yoki «Windows yo'q» yozilgan bo'lsa, tizimni o'zingiz o'rnatasiz.",
    "Zaryadlovchi original va tarmoq kabeli bilan to'liq ekanini tekshiring."
  ],[
    "Проверьте экран, клавиатуру, кнопки, порты (USB, HDMI, зарядка), камеру и динамики.",
    "У ноутбука проверьте S/N и срок гарантии (на сайте производителя).",
    "Выясните, есть ли ОС: если указано «DOS/FreeDOS» или «без Windows», систему нужно будет установить самому.",
    "Убедитесь, что есть оригинальное зарядное и сетевой кабель."
  ]], install:[[
    "Noutbuk: qattiq, tekis stol; to'shak/divanda ishlatmang — shamollatish teshiklari yopilib, qizib ketadi.",
    "Monitor ko'z darajasida, 50–70 sm masofada; yorug'lik ekranga aks etmasin.",
    "Stol kompyuter bloki: shamollatish uchun atrofida 10–15 sm joy; devor tomonga orqa qismi bilan yaqin qo'ymang.",
    "UPS yoki tarmoq filtri orqali ulang — kuchlanish sakrashidan va to'satdan o'chishdan saqlaydi."
  ],[
    "Ноутбук: на жёсткий ровный стол; не используйте на кровати/диване — вентиляция перекроется, он перегреется.",
    "Монитор на уровне глаз, на расстоянии 50–70 см; свет не должен отражаться в экране.",
    "Системный блок: оставьте 10–15 см вокруг для вентиляции; не прижимайте задней панелью к стене.",
    "Подключайте через ИБП или сетевой фильтр — защита от скачков напряжения и внезапного отключения."
  ]], start:[[
    "Birinchi yoqishda Windows sozlash: til, mintaqa, Wi-Fi, Microsoft akkaunt yoki mahalliy akkaunt.",
    "Windows Update orqali barcha yangilanishlarni o'rnating — bir necha marta qayta ishga tushirish kerak bo'lishi mumkin.",
    "Drayverlarni faqat ishlab chiqaruvchining rasmiy saytidan yuklang (videokarta, Wi-Fi, chipset).",
    "Antivirus: Windows Defender yetarli; qo'shimcha «uchinchi tomon» antivirus shart emas.",
    "Muhim ma'lumotlar uchun zaxira nusxa (backup) tizimini darhol sozlang."
  ],[
    "При первом включении настройте Windows: язык, регион, Wi-Fi, аккаунт Microsoft или локальный.",
    "Установите все обновления через Windows Update — может потребоваться несколько перезагрузок.",
    "Драйверы скачивайте только с официального сайта производителя (видеокарта, Wi-Fi, чипсет).",
    "Антивирус: достаточно Windows Defender; сторонний не обязателен.",
    "Сразу настройте резервное копирование важных данных."
  ]], use:[[
    "Noutbuk batareyasi uchun optimal: 20–80% oralig'i; doim 100% da, rozetkada qoldirish batareyani eskiradi — «zaryad chegarasi» funksiyasini yoqing (agar bor bo'lsa).",
    "Faqat original yoki sertifikatlangan zaryadlovchi ishlating.",
    "Muhim fayllarni 3-2-1 qoidasi bilan saqlang: 3 nusxa, 2 xil tashuvchi, 1 tasi uydan tashqarida (bulut).",
    "Haroratni kuzating: protsessor 80–85 °C dan oshsa — chang yoki termopasta muammosi.",
    "Faqat litsenziyali/ishonchli manbadagi dasturlarni o'rnating."
  ],[
    "Для батареи ноутбука оптимально 20–80%; постоянно 100% от розетки старит батарею — включите «ограничение заряда» (если есть).",
    "Используйте только оригинальное или сертифицированное зарядное.",
    "Храните важные файлы по правилу 3-2-1: 3 копии, 2 типа носителей, 1 вне дома (облако).",
    "Следите за температурой: процессор выше 80–85 °C — признак пыли или высохшей термопасты.",
    "Ставьте программы только из лицензионных/надёжных источников."
  ]], care:[[
    "Har 6–12 oyda changdan tozalash; har 2–3 yilda termopasta almashtirish (ayniqsa noutbukda).",
    "Ekranni faqat quruq yoki biroz nam mikrofibra bilan arting; spirt, shisha tozalagich ishlatmang.",
    "Klaviatura: changyutgich yoki siqilgan havo; suyuqlik sachramasin.",
    "Diskni tekshiring: SSD/HDD holatini CrystalDiskInfo kabi dastur bilan."
  ],[
    "Раз в 6–12 месяцев чистка от пыли; раз в 2–3 года замена термопасты (особенно в ноутбуке).",
    "Экран протирайте сухой или слегка влажной микрофиброй; не используйте спирт и средство для стекол.",
    "Клавиатура: пылесос или сжатый воздух; жидкость не лить.",
    "Проверяйте состояние диска SSD/HDD программой вроде CrystalDiskInfo."
  ]], warn:[[
    "Suyuqlik to'kilsa: darhol o'chiring, batareyani/tarmoqni uzing, usta chaqiring — qurimaguncha yoqmang.",
    "Ishlab turgan noutbukni ko'tarib yurmang va yopiq sumkaga solmang.",
    "Noma'lum xatlar, havolalar va «crack» dasturlar — viruslar manbai.",
    "Disk tovushi, to'satdan o'chish, qizish — muhim fayllarni darhol zaxiralang."
  ],[
    "Если пролили жидкость: сразу выключите, отключите батарею/сеть, вызовите мастера — не включайте до полной сушки.",
    "Не носите работающий ноутбук и не кладите его в закрытую сумку.",
    "Неизвестные письма, ссылки и «крякнутые» программы — источник вирусов.",
    "Шум диска, внезапные выключения, перегрев — срочно сделайте резервную копию."
  ]] };

  GD.dux = { new:[[
    "Ichkarisidagi plyonka, stirofoam, qog'oz va qadoq materiallarini to'liq olib tashlang (shu jumladan eshik/shisha orasidagi).",
    "Komplekt: panjara, protivenlar (pishirish tabaqalari), ba'zi modellarda grill ushlagichi, qo'llanma.",
    "O'rnatiladigan (vstraivaemaya) duxovka uchun shkafning mos o'lchamlarini oldindan o'lchang."
  ],[
    "Уберите изнутри плёнку, пенопласт, бумагу и упаковку (включая между стёклами дверцы).",
    "Комплект: решётка, противни, у некоторых моделей держатель гриля, инструкция.",
    "Для встраиваемой духовки заранее проверьте размеры шкафа-ниши."
  ]], install:[[
    "Elektr duxovka quvvati 2–3,5 kVt: alohida kabel (2,5–4 mm² mis) va avtomat (16–25 A) kerak. Mavjud rozetkaga ulash — yong'in xavfi.",
    "Quvvatli ulanishni elektrik bajarsin, rozetka/ulagich issiqqa chidamli bo'lsin.",
    "Gazli duxovka: gaz ulanishi va gaz-nazorat tekshiruvini faqat gaz xizmati bajaradi.",
    "O'rnatiladigan modellarda shkaf orqasida va ostida shamollatish tirqishi bo'lishi shart; atrofdagi mebel issiqqa chidamli bo'lsin.",
    "Duxovkani tekis, barqaror joyga qo'ying; mahkamlash vintlarini qotiring."
  ],[
    "Электрическая духовка 2–3,5 кВт: нужен отдельный кабель (2,5–4 мм² медь) и автомат (16–25 А). Подключать в обычную розетку — риск пожара.",
    "Мощное подключение делает электрик; розетка/клемма должны быть термостойкими.",
    "Газовая духовка: подключение газа и проверку выполняет только газовая служба.",
    "У встраиваемых моделей нужны вентиляционные зазоры сзади и снизу ниши; мебель вокруг — термостойкая.",
    "Ставьте на ровное устойчивое основание; затяните крепёжные винты."
  ]], start:[[
    "Birinchi marta ichi bo'sh holda 200–250 °C da 30–60 daqiqa qizdiring (konveksiya rejimi bo'lsa — bilan) — ishlab chiqarish moyi va qoplamasi kuyib, hid chiqadi.",
    "Shu vaqt xonani shamollating, bolalar va uy hayvonlarini chiqaring.",
    "Sovigach ichini nam mato bilan arting; keyin ishlatishga tayyor.",
    "Soat/taymerni sozlang (qo'llanmadagi tugma ketma-ketligi bo'yicha)."
  ],[
    "В первый раз прогрейте пустую духовку при 200–250 °C 30–60 минут (с конвекцией, если есть) — сгорит заводская смазка и покрытие, будет запах.",
    "Проветривайте комнату, уберите детей и животных.",
    "После остывания протрите внутри влажной тканью — можно пользоваться.",
    "Настройте часы/таймер (по последовательности кнопок из инструкции)."
  ]], use:[[
    "Ko'pgina retseptlarda oldindan isitish kerak: kerakli haroratga yetguncha 10–15 daqiqa kuting.",
    "Rejimlar: yuqori-past isitish — an'anaviy; konveksiya — bir tekis pishirish; grill — qovurish; pastki — xamir.",
    "Faqat issiqqa chidamli idishlar: shisha (Pyrex), keramika, metall, silikon. Oddiy plastmassa va qog'oz — yo'q.",
    "Eshikni ochganda yuz va qo'lni bug'dan uzoq tuting, qo'lqop ishlating."
  ],[
    "Большинство рецептов требуют предварительного нагрева: подождите 10–15 минут до нужной температуры.",
    "Режимы: верх-низ — классика; конвекция — равномерная выпечка; гриль — запекание; нижний нагрев — тесто.",
    "Только жаропрочная посуда: стекло (Pyrex), керамика, металл, силикон. Обычный пластик и бумага — нельзя.",
    "Открывая дверцу, держите лицо и руки подальше от пара, используйте прихватки."
  ]], care:[[
    "Har ishlatgandan keyin sovigach ichini yuving — kuygan yog' qotib qolmasin.",
    "Shisha eshikni maxsus vositalar yoki soda bilan tozalang; abraziv shimgich va metall cho'tka ishlatmang.",
    "Panjara va protivenlarni iliq sovunli suvda yuving.",
    "Pirolitik/katalitik modellarda tozalash rejimini qo'llanma bo'yicha ishlating."
  ],[
    "После каждого использования мойте остывшую камеру — чтобы жир не пригорал.",
    "Стекло двери очищайте специальными средствами или содой; не применяйте абразивы и металлические щётки.",
    "Решётку и противни мойте тёплой водой с мылом.",
    "В пиролитических/каталитических моделях запускайте режим очистки по инструкции."
  ]], warn:[[
    "Gaz hidi sezsangiz: gazni yoping, ochiq olov va elektr tugmalarni ishlatmang, xonani shamollating, 104 ga qo'ng'iroq qiling.",
    "Eshik oynasi yorilgan bo'lsa ishlatmang.",
    "Qizigan duxovka ichiga qog'oz, plastmassa, yonuvchan narsa qo'ymang.",
    "Duxovka tashqi yuzasi qiziydi — bolalarni yaqinlashtirmang."
  ],[
    "При запахе газа: перекройте газ, не пользуйтесь огнём и выключателями, проветрите, звоните 104.",
    "Не используйте духовку с треснувшим стеклом двери.",
    "Не кладите в горячую духовку бумагу, пластик и горючие предметы.",
    "Внешние поверхности нагреваются — не подпускайте детей."
  ]] };

  GD.mikro = { new:[[
    "Ichkaridagi karton, stirofoam va plyonkalarni olib tashlang; aylanuvchi shisha plita va roller halqasini joyiga qo'ying.",
    "Eshik yopilishi, ichki chiroq va tugmalarni tekshiring.",
    "Eshik zichlagichida (rezinada) yoriq yoki deformatsiya bo'lmasligi kerak."
  ],[
    "Удалите изнутри картон, пенопласт и плёнки; поставьте на место стеклянную вращающуюся тарелку и роллер-кольцо.",
    "Проверьте закрывание дверцы, подсветку и кнопки.",
    "Уплотнитель двери не должен быть треснувшим или деформированным."
  ]], install:[[
    "Tekis, barqaror joyga qo'ying; tepasida 20 sm, yonlari va orqasida 10 sm bo'sh joy qoldiring.",
    "Issiqlik manbai (plita), nam joy va televizor/radio yaqinidan uzoq turing — xalaqit berishi mumkin.",
    "Alohida rozetka (erga ulangan); boshqa quvvatli uskunalar bilan bitta uzaytirgichda ishlatmang.",
    "Shamollatish teshiklarini yopmang."
  ],[
    "Ставьте на ровную устойчивую поверхность; оставьте 20 см сверху и по 10 см по бокам и сзади.",
    "Подальше от плиты, влажных мест, телевизора/радио — возможны помехи.",
    "Отдельная заземлённая розетка; не включайте в один удлинитель с другой мощной техникой.",
    "Не закрывайте вентиляционные отверстия."
  ]], start:[[
    "Ulab, soat va taymerni sozlang.",
    "Birinchi sinov: ichiga yarim stakan suv qo'yib, 1 daqiqa to'liq quvvatda ishlating — suv issiq bo'lishi kerak.",
    "BO'SH holda hech qachon yoqmang."
  ],[
    "Подключите, настройте часы и таймер.",
    "Первый тест: поставьте полстакана воды и включите на 1 минуту на полной мощности — вода должна нагреться.",
    "НИКОГДА не включайте пустую."
  ]], use:[[
    "Faqat mikroto'lqinga mos idish: shisha, keramika, «microwave safe» belgili plastik. Metall, folga, oltin/kumush naqshli idish, qisman yopiq idish — mumkin emas.",
    "Idishga qopqoq qo'ying, lekin tirqish qoldiring; bug' chiqishi kerak.",
    "Tuxumni qobig'ida isitmang — portlaydi; sosiska, kartoshka, pomidorni teshib qo'ying.",
    "Ovqatni vaqti-vaqti bilan aralashtiring — bir tekis isishi uchun.",
    "Suvni yoki sutni qizdirganda ichiga qoshiq/cho'p qo'ying, aks holda keskin qaynab chiqib kuydirishi mumkin."
  ],[
    "Только посуда для СВЧ: стекло, керамика, пластик с маркировкой «microwave safe». Металл, фольга, посуда с золотом/серебром, частично закрытые ёмкости — нельзя.",
    "Накрывайте крышкой с отверстием — пар должен выходить.",
    "Яйца в скорлупе не греть — взорвутся; сосиски, картофель, помидоры — проколоть.",
    "Периодически перемешивайте еду — для равномерного нагрева.",
    "При нагреве воды/молока кладите ложку/палочку, иначе возможно резкое вскипание и ожог."
  ]], care:[[
    "Ichini har ishlatgandan keyin nam mato bilan arting; qotib qolgan dog'lar uchun limonli suvni 2–3 daqiqa qaynatib, bug'da yumshating.",
    "Eshik rezinasi va unga tegadigan yuza toza bo'lsin — aks holda mahkam yopilmaydi.",
    "Aylanuvchi plitani suvda yuving (sovigach)."
  ],[
    "Протирайте камеру влажной тканью после каждого использования; присохшие пятна размягчите паром от воды с лимоном (2–3 минуты).",
    "Уплотнитель двери и прилегающая поверхность должны быть чистыми — иначе дверь не закроется плотно.",
    "Вращающуюся тарелку мойте в воде после остывания."
  ]], warn:[[
    "Eshigi zichligi buzilgan yoki zanjiri sinadigan pechni ishlatmang — nurlanish xavfi.",
    "Ichkarida uchqun chiqsa (metall) — darhol o'chiring.",
    "Bolalarga yolg'iz ishlatishga ruxsat bermang; idish va ovqat juda issiq bo'ladi.",
    "Yopiq bankalarni, tuxumni va muhrlangan qadoqlarni isitmang."
  ],[
    "Не используйте печь с нарушенным уплотнением двери или сломанным замком — риск излучения.",
    "Если внутри искрит (металл) — немедленно выключите.",
    "Не разрешайте детям пользоваться без присмотра; посуда и еда очень горячие.",
    "Не греть закрытые банки, яйца и запаянные упаковки."
  ]] };

  GD.piles = { new:[[
    "Komplektni tekshiring: shlang, trubka, nasadkalar (pol/gilam, tirqish, mebel), filtrlar, chang yig'gich yoki konteyner.",
    "Robot changyutgichda: dok-stansiya, batareya, yon cho'tkalar, namlovchi mato (agar mavjud).",
    "Filtr o'z joyida ekanini tekshiring — filtrsiz ishga tushirmang."
  ],[
    "Проверьте комплект: шланг, трубка, насадки (пол/ковёр, щелевая, мебель), фильтры, пылесборник или контейнер.",
    "У робота-пылесоса: док-станция, батарея, боковые щётки, влажная салфетка (если есть).",
    "Убедитесь, что фильтр на месте — без фильтра не включайте."
  ]], install:[[
    "Oddiy: shlang va trubkani biriktiring, kerakli nasadkani tanlang.",
    "Robot: dok-stansiyani devor yoniga, yon tomonlarida 0,5 m va old tomonda 1,5 m bo'sh joy qoldirib qo'ying; rozetkaga ulang.",
    "Robotni ishga tushirishdan oldin yerdagi simlar, ip, mayda narsalarni yig'ib oling."
  ],[
    "Обычный: соедините шланг и трубку, выберите нужную насадку.",
    "Робот: поставьте док-станцию у стены, оставив 0,5 м по бокам и 1,5 м спереди; подключите к розетке.",
    "Перед запуском робота уберите с пола провода, шнурки, мелкие предметы."
  ]], start:[[
    "Robot batareyasini birinchi marta 100% gacha to'liq zaryad qiling (3–5 soat).",
    "Robotni ilovaga ulang: 2,4 GHz Wi-Fi (5 GHz bo'lmasligi mumkin), akkaunt, xarita tuzish uchun birinchi yurishni ruxsat bering.",
    "Taqiqlangan zonalar (virtual devor) va jadvalni xaritada belgilang."
  ],[
    "Батарею робота при первом использовании зарядите до 100% (3–5 часов).",
    "Подключите робота к приложению: Wi-Fi 2,4 ГГц (5 ГГц может не поддерживаться), аккаунт, разрешите первый проход для построения карты.",
    "Отметьте на карте запретные зоны (виртуальные стены) и расписание."
  ]], use:[[
    "Gilam uchun yuqori, silliq pol uchun past/o'rta quvvatni tanlang.",
    "Katta chiqindi (shisha, tosh)ni oldin qo'lda yig'ing.",
    "Chang yig'gich 2/3 to'lganda bo'shating — to'la bo'lsa so'rish quvvati tushadi.",
    "Robot: haftasiga 3–4 marta jadval bo'yicha ishlatish yetarli; eshik chegarasi 2 sm dan baland bo'lsa chiqib ketolmasligi mumkin."
  ],[
    "Для ковра — высокая мощность, для гладкого пола — низкая/средняя.",
    "Крупный мусор (стекло, камни) сначала уберите вручную.",
    "Опорожняйте пылесборник, когда он заполнен на 2/3 — иначе падает мощность.",
    "Робот: достаточно 3–4 раза в неделю по расписанию; пороги выше 2 см он может не преодолеть."
  ]], care:[[
    "HEPA va mator oldi filtrlarini qo'llanmaga ko'ra yuving (ba'zi HEPA filtr yuvilmaydi — faqat almashtiriladi) va to'liq quriting.",
    "Cho'tka va rolikdan soch, ipni olib tashlang — oyda 1–2 marta.",
    "Robot: yon cho'tka, g'ildirak va sensorlarni quruq mato bilan arting.",
    "Filtrlarni 3–6 oyda, cho'tkalarni 6–12 oyda almashtiring."
  ],[
    "HEPA и предмоторные фильтры мойте по инструкции (некоторые HEPA не моются — только замена) и полностью сушите.",
    "Очищайте щётку и ролик от волос и ниток — 1–2 раза в месяц.",
    "Робот: протирайте боковую щётку, колёса и датчики сухой тканью.",
    "Фильтры меняйте раз в 3–6 месяцев, щётки — раз в 6–12 месяцев."
  ]], warn:[[
    "Ho'l narsalar va suyuqliklarni oddiy changyutgich bilan so'rmang (suv so'rish funksiyasi bo'lmasa).",
    "Kul, gips changi, cement, issiq cho'g'ni so'rmang — filtr va dvigatel buziladi.",
    "Dvigatel qizib ketsa, qizish himoyasi o'chiradi — 30–40 daqiqa sovishini kuting.",
    "Robotni zinapoya, balkon va ochiq akvarium yonida nazoratsiz qoldirmang."
  ],[
    "Не собирайте обычным пылесосом воду и жидкости (если нет функции влажной уборки).",
    "Не пылесосьте золу, гипсовую/цементную пыль, горячие угли — выйдут из строя фильтр и двигатель.",
    "При перегреве сработает защита — подождите 30–40 минут до остывания.",
    "Не оставляйте робот без присмотра у лестниц, балконов и открытых аквариумов."
  ]] };

  GD.dazmol = { new:[[
    "Dazmolni qutidan oling, tag'idagi himoya plyonkasi/stikerni olib tashlang.",
    "Bug'li dazmol: suv idishi, o'lchov stakani va komplektni tekshiring.",
    "Kabel, vilka va pastki yuzada chizilish yoki yoriq bo'lmasligini ko'ring."
  ],[
    "Достаньте утюг, снимите защитную плёнку/стикер с подошвы.",
    "Паровой утюг: проверьте ёмкость для воды, мерный стаканчик и комплект.",
    "Убедитесь, что на кабеле, вилке и подошве нет царапин и трещин."
  ]], install:[[
    "Barqaror dazmol taxtasi yoki issiqqa chidamli tekis yuza.",
    "Rozetka dazmol taxtasi yaqinida bo'lsin; kabel o'tkir burchaklardan va qizigan yuzadan uzoq turishi kerak."
  ],[
    "Устойчивая гладильная доска или ровная термостойкая поверхность.",
    "Розетка рядом с доской; кабель не должен касаться острых углов и горячих поверхностей."
  ]], start:[[
    "Bug'li dazmol: tozalangan/distillangan yoki yumshatilgan suv quying (maksimal belgigacha).",
    "Birinchi marta eski, keraksiz mato ustida ishlating — ishlab chiqarish hidi/tutuni chiqishi mumkin; bu normal.",
    "Haroratni tegishli matoga qarab qo'ying va isishini kuting (chiroq o'chishi)."
  ],[
    "Паровой утюг: заливайте очищенную/дистиллированную или смягчённую воду (до максимальной отметки).",
    "В первый раз проглаживайте ненужную ткань — возможен запах/дым от заводской смазки; это нормально.",
    "Выставьте температуру по ткани и дождитесь нагрева (погаснет индикатор)."
  ]], use:[[
    "Mato belgisi: bir nuqta • — ipak, sintetika (110 °C); ikki nuqta •• — jun, poliester (150 °C); uch nuqta ••• — paxta, zig'ir (200 °C).",
    "Avval kam qizdiriladigan matolarni, oxirida paxta/zig'irni dazmollang — dazmolning isishini kutmaysiz.",
    "Ipak, sintetika va qora matoni teskari tomonidan yoki mato orqali dazmollang — yaltiroq iz qolmasin.",
    "Bug' tugmasini kerak bo'lganda ishlating; vertikal bug' (parlash) osilgan kiyimga yaxshi."
  ],[
    "Значки на ткани: одна точка • — шёлк, синтетика (110 °C); две точки •• — шерсть, полиэстер (150 °C); три точки ••• — хлопок, лён (200 °C).",
    "Сначала гладьте ткани, требующие низкой температуры, в конце — хлопок/лён: не придётся ждать остывания.",
    "Шёлк, синтетику и тёмные вещи гладьте с изнанки или через ткань — не останется блестящих следов.",
    "Пар используйте по необходимости; вертикальное отпаривание хорошо для вещей на вешалке."
  ]], care:[[
    "Tag'ini sovigan holda nam mato yoki maxsus vosita bilan tozalang; metall cho'tka ishlatmang.",
    "Nakipdan tozalash: Self-clean funksiyasi bo'lsa — ishlating; aks holda 1 oyda bir marta qo'llanmadagi vosita yoki suv + limon kislotasi.",
    "Foydalangandan keyin suvni to'kib, dazmolni vertikal holda saqlang."
  ],[
    "Очищайте подошву остывшей, влажной тканью или специальным средством; металлическую щётку не используйте.",
    "От накипи: если есть Self-clean — используйте; иначе раз в месяц средство по инструкции или вода + лимонная кислота.",
    "После использования слейте воду и храните утюг вертикально."
  ]], warn:[[
    "Ulangan dazmolni qarovsiz qoldirmang — yong'in va kuyish xavfi.",
    "Suvsiz bug' rejimini yoqmang.",
    "Kabel osilib yoki ilinib qolmasin — dazmol tushib ketishi mumkin.",
    "Kabel shikastlansa yoki dazmol tushib ketgan bo'lsa — ishlatmang, ustaga ko'rsating."
  ],[
    "Не оставляйте включённый утюг без присмотра — риск пожара и ожога.",
    "Не включайте паровой режим без воды.",
    "Следите, чтобы кабель не свисал и не цеплялся — утюг может упасть.",
    "Если кабель повреждён или утюг падал — не пользуйтесь, покажите мастеру."
  ]] };

  GD.vent = { new:[[
    "Qutidan chiqarib, komplektni tekshiring: pichoqlar (parraklar), himoya panjarasi, taglik/oyoq, vintlar.",
    "Qismlarda yoriq yoki egilish bo'lmasligi kerak — aylanayotganda titrash va shovqin beradi.",
    "Qo'llanmadagi sxema bo'yicha yig'ing; ba'zi modellarda parrak tekis o'rnatilmasa teng aylanmaydi."
  ],[
    "Достаньте из коробки и проверьте комплект: лопасти, защитная решётка, подставка/ножка, винты.",
    "На деталях не должно быть трещин и деформаций — иначе при вращении будет вибрация и шум.",
    "Собирайте по схеме из инструкции; лопасти должны быть установлены ровно, иначе вращение неравномерное."
  ]], install:[[
    "Tekis va barqaror yuzaga qo'ying (taglikli) yoki devorga/shiftga mustahkam mahkamlang.",
    "Himoya panjarasi vintlari qotirilgan bo'lsin — barmoq parrakka tegmasligi kerak.",
    "Kabel o'tish joyidan chetda bo'lsin — odam oyog'iga ilinmasin."
  ],[
    "Поставьте на ровную устойчивую поверхность (напольный) или надёжно закрепите на стене/потолке.",
    "Винты защитной решётки должны быть затянуты — пальцы не должны доставать до лопастей.",
    "Кабель не должен лежать на проходе — чтобы не зацепиться ногой."
  ]], start:[[
    "Ulab, eng past tezlikdan boshlang va ovoz/tebranishni tinglang.",
    "Burilish (oscillation) funksiyasi borligini tekshiring.",
    "Aylanish markazi kuchli titrasa — o'chirib, parrak va panjarani qayta o'rnating."
  ],[
    "Включите на минимальной скорости и прислушайтесь к шуму/вибрации.",
    "Проверьте работу поворота (осцилляции), если он есть.",
    "Если центр сильно вибрирует — выключите, переустановите лопасти и решётку."
  ]], use:[[
    "Ochiq oyna yoki eshik oldida ishlatsangiz, havo aylanishi yaxshilanadi.",
    "Yozda yotishdan oldin to'g'ridan-to'g'ri yuzga/tanaga qaratmang; taymerdan foydalaning.",
    "Uzoq vaqt to'xtovsiz ishlatmang — motor 6–8 soatdan keyin dam olishi kerak."
  ],[
    "У открытого окна или двери воздух циркулирует лучше.",
    "Летом на ночь не направляйте поток прямо на лицо/тело; используйте таймер.",
    "Не работайте непрерывно слишком долго — мотору нужен отдых после 6–8 часов."
  ]], care:[[
    "Oyda bir marta panjara va parraklarni ajratib, nam mato bilan arting.",
    "Motor teshiklarini changyutgich bilan tozalang.",
    "Ishlatmaydigan mavsumda qutiga yoki g'ilofga solib saqlang."
  ],[
    "Раз в месяц снимайте решётку и лопасти и протирайте влажной тканью.",
    "Очищайте вентиляционные отверстия мотора пылесосом.",
    "В несезон храните в коробке или чехле."
  ]], warn:[[
    "Ishlab turganda panjarani olmang va qo'lingizni tiqmang.",
    "Bolalar va uy hayvonlaridan uzoq tuting.",
    "Motordan hid, tutun, dag'al ovoz kelsa — darhol o'chiring."
  ],[
    "Не снимайте решётку и не суйте руки при работающем вентиляторе.",
    "Держите вдали от детей и животных.",
    "Запах, дым или грубый шум мотора — сразу выключайте."
  ]] };

  GD.stab = { new:[[
    "Quvvatni to'g'ri tanlang: ulaydigan barcha uskunalar quvvatini qo'shib, 30–50% zaxira qo'shing.",
    "Kompressorli uskunalar (xolodilnik, konditsioner, kir yuvish mashinasi) ishga tushishda 3–5 barobar ko'p tok oladi — buni hisobga oling.",
    "Rele turi (tez-tez «klik»), servo yoki elektron (simistor) stabilizator: servo aniqroq, rele arzon, elektron jim va tez.",
    "Komplektni tekshiring: ulash kabeli, qo'llanma, kafolat talon."
  ],[
    "Правильно выберите мощность: сложите мощность подключаемой техники и добавьте запас 30–50%.",
    "Компрессорная техника (холодильник, кондиционер, стиральная машина) при пуске потребляет в 3–5 раз больше — учитывайте это.",
    "Тип: релейный (щёлкает), сервоприводный или электронный (симисторный): серво точнее, реле дешевле, электронный тихий и быстрый.",
    "Проверьте комплект: кабель, инструкция, гарантийный талон."
  ]], install:[[
    "Quruq, shamollatiladigan joyga, devordan 10 sm masofada qo'ying; ustini yopmang.",
    "Vannaxona, hovli, nam yoki quyosh tushadigan joyga qo'ymang.",
    "Katta quvvatli stabilizatorni alohida avtomat orqali ulang (masalan, 5 kVA uchun 25–32 A).",
    "Erga ulangan rozetka/shina ishlating."
  ],[
    "Ставьте в сухом проветриваемом месте, в 10 см от стены; не накрывайте.",
    "Не ставьте в ванной, во дворе, во влажных и солнечных местах.",
    "Мощный стабилизатор подключайте через отдельный автомат (например, для 5 кВА — 25–32 А).",
    "Используйте заземлённую розетку/шину."
  ]], start:[[
    "Tartib: 1) Stabilizatorni yuksiz tarmoqqa ulang va yoqing; 2) 5–10 soniya kuting (kechikish); 3) chiqish kuchlanishi 220 V ga yaqin ekanini ko'ring; 4) keyin uskunani ulang.",
    "Uskunalarni birin-ketin ulang, barchasini bir vaqtda emas.",
    "O'chirishda avval uskunalarni, keyin stabilizatorni o'chiring."
  ],[
    "Порядок: 1) включите стабилизатор в сеть без нагрузки; 2) подождите 5–10 секунд (задержка); 3) убедитесь, что на выходе около 220 В; 4) затем подключайте технику.",
    "Подключайте технику по одной, а не всё сразу.",
    "При выключении сначала отключите технику, затем стабилизатор."
  ]], use:[[
    "Kirish kuchlanishi ruxsat etilgan chegarada bo'lsa (masalan 140–260 V) ishlaydi; undan past/baland bo'lsa, o'zi o'chadi.",
    "Dastlabki shovqin: rele «klik»i va past gumburlash — me'yor.",
    "Sezgir uskunalar (kompyuter, televizor) uchun UPS bilan birga ishlatish yaxshi."
  ],[
    "Работает, если входное напряжение в допустимых пределах (например 140–260 В); вне диапазона — сам отключится.",
    "Щелчки реле и тихий гул — норма.",
    "Для чувствительной техники (компьютер, телевизор) хорошо использовать вместе с ИБП."
  ]], care:[[
    "Havo teshiklarini 6 oyda bir marta changyutgich bilan tozalang.",
    "Yuklamani nominalning 80% dan oshirmang.",
    "Yozda qizib ketmasligi uchun ventilyatori ochiq ekanini ko'rib turing."
  ],[
    "Раз в 6 месяцев очищайте вентиляционные отверстия пылесосом.",
    "Не превышайте 80% номинальной нагрузки.",
    "Летом следите, чтобы вентилятор не был заблокирован — иначе перегрев."
  ]], warn:[[
    "Yuk quvvati stabilizator limitidan oshmasin — himoya o'chadi yoki issiqdan buziladi.",
    "Stabilizator ichini ochmang — ichida xavfli kuchlanish bor.",
    "Ho'l qo'l bilan tegmang; yonida suv qo'ymang."
  ],[
    "Мощность нагрузки не должна превышать лимит стабилизатора — сработает защита или он сгорит от перегрева.",
    "Не вскрывайте стабилизатор — внутри опасное напряжение.",
    "Не трогайте мокрыми руками; не ставьте рядом воду."
  ]] };

  GD.ups = { new:[[
    "UPS turini tanlang: Offline/Line-interactive (kompyuter, router uchun), Online (server, tibbiy, nozik uskuna).",
    "Quvvat (VA/Vt): kompyuter ~300–500 VA, router + modem ~100–150 VA; gaz qozon uchun maxsus sof sinusli (pure sine) UPS kerak.",
    "Akkumulyator yangi bo'lsa — qutidan chiqqach to'liq zaryad qiling.",
    "Komplektni tekshiring: tarmoq kabeli, USB kabeli, qo'llanma."
  ],[
    "Определитесь с типом ИБП: Offline/Line-interactive (компьютер, роутер), Online (сервер, медицина, чувствительная техника).",
    "Мощность (ВА/Вт): компьютер ~300–500 ВА, роутер + модем ~100–150 ВА; для газового котла нужен ИБП с чистой синусоидой (pure sine).",
    "Если аккумулятор новый — после распаковки полностью зарядите.",
    "Проверьте комплект: сетевой кабель, USB-кабель, инструкция."
  ]], install:[[
    "Quruq, salqin, shamollanadigan joyga qo'ying; quyosh va isitgichdan uzoq (ideal 20–25 °C).",
    "Yon va orqa tomonda 10 sm bo'sh joy qoldiring.",
    "Erga ulangan rozetkaga ulang, uzaytirgichsiz.",
    "Lazerli printer, konditsioner, nasos, kuchli isitgichni UPS ga ULAMANG — ular juda ko'p tok oladi va UPS ni buzadi."
  ],[
    "Ставьте в сухом, прохладном, проветриваемом месте; вдали от солнца и обогревателей (идеально 20–25 °C).",
    "Оставьте 10 см по бокам и сзади.",
    "Подключайте в заземлённую розетку, без удлинителя.",
    "НЕ подключайте лазерный принтер, кондиционер, насос, мощные обогреватели — они потребляют слишком много и выведут ИБП из строя."
  ]], start:[[
    "Ulang va 8–12 soat zaryad qiling; shundan keyin yukni ulang.",
    "Yukni ulang: avval eng muhim uskunalar (kompyuter, router).",
    "USB kabel bilan kompyuterga ulab, dasturini (Power Panel va sh.k.) o'rnating — tok o'chganda kompyuter o'zi saqlab o'chadi.",
    "Sinov: UPS ni tarmoqdan uzib, uskunalar ishlashda davom etayotganini tekshiring (bir daqiqaga)."
  ],[
    "Подключите и заряжайте 8–12 часов; затем подключайте нагрузку.",
    "Нагрузка: сначала самое важное (компьютер, роутер).",
    "Подключите по USB к компьютеру и установите ПО (Power Panel и т.п.) — при отключении питания компьютер сам сохранится и выключится.",
    "Тест: отключите ИБП от сети и проверьте, что техника продолжает работать (на минуту)."
  ]], use:[[
    "Tok o'chganda UPS 5–15 daqiqa ishlaydi — fayllarni saqlab, kompyuterni to'g'ri o'chirishga shuncha vaqt yetadi.",
    "Qisqa uzilishlarda router va modemni ishlatib turish uchun ham yaxshi.",
    "Signal tovushi: tok yo'q, batareya past yoki ortiqcha yuk haqida ogohlantiradi — qo'llanmadagi jadval bo'yicha o'qing."
  ],[
    "При пропадании света ИБП работает 5–15 минут — этого хватит, чтобы сохранить файлы и корректно выключить компьютер.",
    "Хорош и для работы роутера/модема при кратких отключениях.",
    "Звуковые сигналы предупреждают об отсутствии сети, низком заряде или перегрузке — читайте по таблице в инструкции."
  ]], care:[[
    "Akkumulyator 2–4 yilda eskiradi — vaqt-vaqti bilan sinab ko'ring va almashtiring (bir xil turdagisini oling).",
    "3–6 oyda UPS ni tarmoqdan uzib, batareya sinovini o'tkazing.",
    "Uzoq vaqt ishlatilmasa, har 3 oyda zaryad qilib turing — to'liq razryadlangan batareya tez o'ladi."
  ],[
    "Аккумулятор стареет за 2–4 года — периодически проверяйте и меняйте (берите такой же тип).",
    "Раз в 3–6 месяцев делайте тест батареи: отключите от сети.",
    "Если не используется долго — подзаряжайте каждые 3 месяца: полностью разряженная батарея быстро умирает."
  ]], warn:[[
    "UPS ichini ochmang — akkumulyator va yuqori kuchlanish xavfli.",
    "Nam joyga qo'ymang va uskunalar ustiga suyuqlik qo'ymang.",
    "Bo'shatilgan/shishgan akkumulyatorni ishlatmang — darhol almashtiring.",
    "Eski batareyalarni oddiy chiqindiga tashlamang — qabul punktiga topshiring."
  ],[
    "Не вскрывайте ИБП — аккумулятор и высокое напряжение опасны.",
    "Не ставьте во влажных местах и не ставьте жидкости на технику.",
    "Не используйте разряженный/вздувшийся аккумулятор — немедленно замените.",
    "Старые аккумуляторы не выбрасывайте в мусор — сдайте в пункт приёма."
  ]] };

  GD.printer = { new:[[
    "Qutidan oling va barcha transport lentalari, plyonkalari, stirofoamni (printer ichida ham) olib tashlang — ba'zilari rangli lenta bilan belgilangan.",
    "Kartrij ustidagi himoya plyonkasi/qopqoqni ham olib tashlang; purkagich printerda kartrij ustidagi lenta/qopqoq olinishi shart, aks holda bo'yoq chiqmaydi.",
    "Turini bilib oling: Lazerli (toner) — ko'p chop etish uchun, kam xarajat; Purkagichli (siyoh) — rangli rasm va hujjat; CISS (doimiy siyoh ta'minoti) — tejamkor.",
    "Komplekt: tarmoq kabeli, USB kabeli (ba'zida yo'q), starter kartrij (to'liq emas bo'lishi mumkin), disk/qo'llanma."
  ],[
    "Достаньте и снимите все транспортировочные ленты, плёнки, пенопласт (в том числе внутри принтера) — часть помечена цветной лентой.",
    "Снимите защитную плёнку/колпачок с картриджа; в струйном принтере лента/колпачок обязательно должны быть сняты, иначе чернила не пойдут.",
    "Узнайте тип: лазерный (тонер) — для большого объёма, дёшево в расходниках; струйный (чернила) — для цветных фото и документов; СНПЧ (система непрерывной подачи чернил) — экономичнее.",
    "Комплект: сетевой кабель, USB-кабель (иногда нет), стартовый картридж (может быть неполным), диск/инструкция."
  ]], install:[[
    "Printerni tekis, barqaror joyga qo'ying; atrofida 10 sm joy qoldiring, quyosh va issiq joydan uzoq.",
    "Kompyuterga USB, Wi-Fi yoki Ethernet orqali ulang.",
    "Drayverni faqat ishlab chiqaruvchining rasmiy saytidan yuklang (Canon, HP, Epson, Brother, Pantum va h.k.) — model nomini to'g'ri tanlang.",
    "Qog'oz lotokini o'rnating, qog'ozni qo'yib, yo'naltirgichlarni qog'oz kengligiga moslang."
  ],[
    "Поставьте принтер на ровное устойчивое место; оставьте 10 см вокруг, вдали от солнца и тепла.",
    "Подключите к компьютеру по USB, Wi-Fi или Ethernet.",
    "Драйвер скачивайте только на официальном сайте производителя (Canon, HP, Epson, Brother, Pantum и др.) — выбирайте точную модель.",
    "Установите лоток для бумаги, загрузите бумагу и подвиньте направляющие по ширине листа."
  ]], start:[[
    "Ulang va kartrijni o'rnating; purkagichda kallakni to'ldirish (initsializatsiya) 3–10 daqiqa davom etadi — bu vaqtda o'chirmang.",
    "Sinov sahifasini chop eting (printer tugmasi yoki drayver orqali): chiziqlar uzilmasligi kerak.",
    "Purkagichda kallakni to'g'rilash (alignment) dasturini ishga tushiring, kerak bo'lsa soplo tozalashni 1–2 marta bajaring.",
    "Wi-Fi printer: panelda tarmoqni tanlab parol kiriting yoki WPS tugmasini bosing; keyin kompyuter/telefondan qo'shing."
  ],[
    "Включите и установите картридж; в струйном принтере инициализация головки занимает 3–10 минут — не выключайте в это время.",
    "Распечатайте пробную страницу (кнопкой принтера или через драйвер): линии не должны прерываться.",
    "В струйном запустите выравнивание головки (alignment), при необходимости 1–2 раза прочистите сопла.",
    "Wi-Fi принтер: выберите сеть и введите пароль на панели или нажмите WPS; затем добавьте с компьютера/телефона."
  ]], use:[[
    "Printerni faqat o'z tugmasi bilan o'chiring — rozetkadan emas: kallak to'g'ri «parkovka» qilinadi.",
    "Purkagichli printer haftasiga kamida 1 marta chop etsin — siyoh va soplolar qurib qolmasin.",
    "Qog'oz 70–90 g/m² bo'lsin; nam, burilgan qog'ozdan foydalanmang; lazerli printerda qalin yoki yopishqoq qog'oz yaramaydi.",
    "Qayta to'ldirilgan yoki sertifikatsiz kartrij ishlatganda sifat va kafolat o'zgaradi — ishonchli joydan oling.",
    "Chop etishda «Qoralama» (Draft) rejimi siyoh/tonerni tejaydi."
  ],[
    "Выключайте принтер только его кнопкой — не из розетки: головка корректно «паркуется».",
    "Струйный принтер нужно использовать хотя бы раз в неделю — чтобы чернила и сопла не засохли.",
    "Бумага 70–90 г/м²; не используйте влажную, скрученную; в лазерном принтере не подходит слишком плотная или липкая.",
    "Заправленные или несертифицированные картриджи меняют качество и гарантию — берите в надёжном месте.",
    "Режим «Черновик» (Draft) экономит чернила/тонер."
  ]], care:[[
    "Lazerli: toner changini changyutgich bilan emas, quruq mato yoki maxsus changyutgich bilan oling; ichki rolik va linzalarni toza tuting.",
    "Purkagich: soplolar tiqilsa dasturdan «Kallak tozalash» ni ishga tushiring; 2–3 martadan ko'p emas, keyin tanaffus qiling.",
    "Qog'oz yo'lini va rolikni yumshoq nam mato bilan arting.",
    "Siyoh/toner tugamasdan oldin yangi kartrij tayyorlab qo'ying; bo'sh kartrijni uzoq qoldirmang."
  ],[
    "Лазерный: тонерную пыль не убирайте обычным пылесосом — только сухой тканью или специальным пылесосом; следите за чистотой роликов и линз.",
    "Струйный: при засохших соплах запустите «Прочистку головки» из драйвера; не более 2–3 раз подряд, затем перерыв.",
    "Протирайте тракт подачи бумаги и ролик мягкой влажной тканью.",
    "Заранее готовьте новый картридж до окончания чернил/тонера; пустой картридж не оставляйте надолго."
  ]], warn:[[
    "Qog'oz tiqilib qolsa — majburlab tortmang; qo'llanma bo'yicha yo'nalishda sekin torting.",
    "Lazerli printerning ichi (fuser/pech) qizigan — chop etgandan keyin darhol tegmang.",
    "Printerni to'g'ridan-to'g'ri tarmoqdan o'chirish, kartrijni ishlab turgan paytda olish kallak va drayverni buzadi.",
    "Siyoh va tonerni bolalardan uzoq tuting; kiyimdan ketmaydi, terini sovunli suv bilan yuving."
  ],[
    "При замятии бумаги не дёргайте силой; вытягивайте медленно по ходу движения, по инструкции.",
    "Внутри лазерного принтера печка (фьюзер) очень горячая — не трогайте сразу после печати.",
    "Выключение из розетки и снятие картриджа во время работы повреждают головку и драйвер.",
    "Держите чернила и тонер вдали от детей; с одежды не отстирываются, кожу мойте с мылом."
  ]] };

  // ============================================================
  //  📖 QO'LLANMA — yangi texnikani qanday olish, o'rnatish,
  //  ishga tushirish va foydalanish bo'yicha yo'riqnomalar
  // ============================================================
  var GD_SECS = [
    { k:'media',   ic:'🎬', uz:"Rasm va video",   ru:"Фото и видео" },
    { k:'new',     ic:'📦', uz:"Yangi olingach",  ru:"После покупки" },
    { k:'install', ic:'🔧', uz:"O'rnatish",       ru:"Установка" },
    { k:'start',   ic:'▶️', uz:"Ishga tushirish", ru:"Запуск" },
    { k:'use',     ic:'📖', uz:"Foydalanish",     ru:"Использование" },
    { k:'care',    ic:'🧹', uz:"Parvarish",       ru:"Уход" },
    { k:'warn',    ic:'⚠️', uz:"Ehtiyot bo'ling", ru:"Осторожно" }
  ];
  var gdDone = {};

  function gdIds(){
    var ids = ['gen'];
    CATS.slice().sort(function(a,b){ return (b.id === 'printer') - (a.id === 'printer'); })
      .forEach(function(c){ if (GD[c.id]) ids.push(c.id); });
    return ids;
  }
  function gdMeta(id){
    if (id === 'gen') return { icon:'📋', name:L('Har qanday yangi texnika','Любая новая техника') };
    var c = catById(id);
    return { icon:c ? c.icon : '📖', name:c ? pick(c, 'name') : id };
  }
  function gdLang(){ return state.lang === 'uz' ? 0 : 1; }
  function gdSteps(id, sec){
    var g = GD[id]; return (g && g[sec]) ? (g[sec][gdLang()] || g[sec][1] || []) : [];
  }
  function gdCount(id){
    var n = 0; GD_SECS.forEach(function(s){ n += gdSteps(id, s.k).length; }); return n;
  }
  function gdText(s){
    var m = /^([^:]{3,34}):\s+([\s\S]+)$/.exec(s);
    return m ? '<strong>' + esc(m[1]) + ':</strong> ' + esc(m[2]) : esc(s);
  }

  function renderGuide(){
    var q = (state.guideQuery || '').trim().toLowerCase();
    var ids = gdIds().filter(function(id){ return !q || gdMeta(id).name.toLowerCase().indexOf(q) > -1; });
    var items = ids.map(function(id, i){
      var m = gdMeta(id);
      var wide = id === 'gen' || id === 'printer' || (i === ids.length - 1 && (ids.length - (ids[0] === 'gen' ? 1 : 0)) % 2 === 1);
      return { pal: id === 'gen' ? 'g-sun' : palOf(id), wide:wide, icon:m.icon, title:m.name,
        count: L(gdCount(id) + " ta maslahat", gdCount(id) + " советов"), brand:L("Qo'llanma","Руководство"), gid:id };
    });
    mainView.innerHTML =
      '<div class="view"><div class="hero v2"><h1>' + L("Yangi texnika <em>qo'llanmasi</em>", "Руководство по <em>новой технике</em>") + '</h1>' +
      '<p>' + L("Qutidan chiqarishdan to ishga tushirish va parvarishgacha — barcha qadamlar bir joyda.",
                "От распаковки до запуска и ухода — все шаги в одном месте.") + '</p></div>' +
      '<div class="search-wrap"><span class="sic">🔎</span><input id="guideSearch" placeholder="' + t().searchPh + '" value="' + esc(state.guideQuery || '') + '"></div>' +
      (items.length ? '<div class="tiles">' + items.map(tileHTML).join('') + '</div>' : '<div class="empty">' + t().notFound + '</div>') + '</div>';
    var search = document.getElementById('guideSearch');
    search.addEventListener('input', function(){
      state.guideQuery = search.value; renderGuide(); search.focus(); search.setSelectionRange(search.value.length, search.value.length);
    });
    mainView.querySelectorAll('[data-ti]').forEach(function(btn){
      btn.addEventListener('click', function(){
        haptic('select');
        var it = items[parseInt(btn.getAttribute('data-ti'), 10)];
        push({ view:'guideTech', gid:it.gid, sec:'new', catId: it.gid === 'gen' ? null : it.gid });
      });
    });
  }

  function renderGuideTech(entry){
    var id = entry.gid, m = gdMeta(id), sec = entry.sec || 'new';
    var si = 0; GD_SECS.forEach(function(s, i){ if (s.k === sec) si = i; });
    var cur = GD_SECS[si];
    var steps = gdSteps(id, sec);
    var chips = GD_SECS.map(function(s){
      var n = gdSteps(id, s.k).length;
      return '<button type="button" class="gd-chip' + (s.k === sec ? ' on' : '') + (s.k === 'warn' ? ' warn' : '') + '" data-sec="' + s.k + '">' +
        '<span>' + s.ic + '</span> ' + L(s.uz, s.ru) + (s.k === 'media' ? '' : ' <i>' + n + '</i>') + '</button>';
    }).join('');
    var list = steps.map(function(s, i){
      var key = id + ':' + sec + ':' + i;
      return '<li class="gd-step' + (gdDone[key] ? ' done' : '') + (sec === 'warn' ? ' warn' : '') + '" data-k="' + key + '">' +
        '<span class="gd-num">' + (sec === 'warn' ? '!' : (i + 1)) + '</span><span class="gd-txt">' + gdText(s) + '</span></li>';
    }).join('');
    var prev = si > 0 ? GD_SECS[si - 1] : null, next = si < GD_SECS.length - 1 ? GD_SECS[si + 1] : null;
    var nav = '<div class="gd-nav">' +
      (prev ? '<button type="button" class="btn-ghost gd-nb" data-sec="' + prev.k + '">‹ ' + L(prev.uz, prev.ru) + '</button>' : '<span></span>') +
      (next ? '<button type="button" class="btn-primary gd-nb" data-sec="' + next.k + '">' + L(next.uz, next.ru) + ' ›</button>' : '<span></span>') + '</div>';
    var diag = (id !== 'gen' && catById(id)) ?
      '<button type="button" class="btn-ghost gd-diag" id="gdDiag">🛠 ' + L("Nosozlik bormi? Diagnostikaga o'tish", "Есть неисправность? Перейти к диагностике") + ' ›</button>' : '';
    mainView.innerHTML =
      '<div class="view"><div class="detail-head gd-head"><div class="gd-ico">' + m.icon + '</div>' +
      '<div><div class="eyebrow gd-eb">' + L("QO'LLANMA", 'РУКОВОДСТВО') + '</div><h2>' + esc(m.name) + '</h2></div></div>' +
      '<div class="gd-chips" id="gdChips">' + chips + '</div>' +
      '<div class="gd-sec-title"><span>' + cur.ic + '</span> ' + L(cur.uz, cur.ru) + '</div>' +
      (sec === 'media' ? gdMediaHTML(id) : '<ol class="gd-steps">' + list + '</ol>') +
      (sec === 'warn' || sec === 'media' ? '' : '<p class="gd-hint">' + L("Bajarilgan qadamni belgilash uchun ustiga bosing.", "Нажмите на пункт, чтобы отметить его выполненным.") + '</p>') +
      nav + diag + '</div>';
    mainView.querySelectorAll('[data-sec]').forEach(function(b){
      b.addEventListener('click', function(){
        haptic('select'); entry.sec = b.getAttribute('data-sec'); render();
      });
    });
    mainView.querySelectorAll('.gd-step').forEach(function(li){
      li.addEventListener('click', function(){
        var k = li.getAttribute('data-k'); gdDone[k] = !gdDone[k];
        li.classList.toggle('done', !!gdDone[k]); haptic('tap');
      });
    });
    var d = document.getElementById('gdDiag');
    if (d) d.addEventListener('click', function(){ haptic('select'); openCategory(id); });
    var on = mainView.querySelector('.gd-chip.on');
    if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline:'center', block:'nearest' }); } catch(e){} window.scrollTo(0,0); }
  }


  // ============================================================
  //  🎬 QO'LLANMA MEDIA — har bir texnika uchun rasm va uzun video
  //  VIDEO QO'SHISH: pastdagi GD_MEDIA ichiga texnika id'si bo'yicha
  //  havola yozing (YouTube yoki .mp4). Misol:
  //    printer: { videos:[ { uz:"Printerni o'rnatish (to'liq)", ru:"Установка принтера (полностью)",
  //                          url:"https://youtu.be/XXXXXXXXXXX" } ],
  //               images:[ { src:"https://.../printer1.jpg", uz:"Kartrijni o'rnatish", ru:"Установка картриджа" } ] }
  //  Texnika id'lari: gen (har qanday), printer, ... (CATS ichidagi id).
  // ============================================================
  var GD_MEDIA = {
    gen: { videos:[], images:[] }
  };

  function gdVideoEmbed(url){
    var u = String(url || '').trim(); if (!u) return '';
    var m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/.exec(u);
    if (m) return '<div class="gdm-vid"><iframe src="https://www.youtube.com/embed/' + m[1] + '?rel=0&playsinline=1" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return '<div class="gdm-vid"><video src="' + esc(u) + '" controls playsinline preload="metadata"></video></div>';
    return '<a class="btn-primary gdm-link" href="' + esc(u) + '" target="_blank" rel="noopener">▶ ' + L('Videoni ochish','Открыть видео') + '</a>';
  }

  function gdInjectCss(){
    if (document.getElementById('gdmCss')) return;
    var st = document.createElement('style'); st.id = 'gdmCss';
    st.textContent = [
      '.gdm-h{margin:16px 0 8px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}',
      '.gdm-vid{position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000;margin-bottom:6px}',
      '.gdm-vid iframe,.gdm-vid video{position:absolute;inset:0;width:100%;height:100%;border:0}',
      '.gdm-vt{font-size:13.5px;font-weight:600;margin:10px 0 6px}',
      '.gdm-link{display:block;text-align:center;padding:12px;border-radius:11px;text-decoration:none;margin-bottom:8px}',
      '.gdm-empty{padding:18px 14px;border-radius:14px;border:1px dashed var(--border,rgba(255,255,255,.2));text-align:center;font-size:13px;opacity:.8;line-height:1.5}',
      '.gdm-empty b{display:block;font-size:26px;margin-bottom:4px}',
      '.gdm-img{width:100%;border-radius:14px;display:block;margin-bottom:4px}',
      '.gdm-cap{font-size:12.5px;opacity:.8;margin:0 0 12px}',
      '.gdm-card{border-radius:16px;padding:14px;margin-bottom:12px;background:var(--bg-panel,#161b26);border:1px solid var(--border,rgba(255,255,255,.1))}',
      '.gdm-card.warn{border-color:rgba(255,90,90,.5)}',
      '.gdm-top{display:flex;align-items:center;gap:12px;margin-bottom:8px}',
      '.gdm-big{font-size:38px;line-height:1;width:58px;height:58px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.07)}',
      '.gdm-ct{font-weight:700;font-size:15px}',
      '.gdm-cs{font-size:12px;opacity:.7}',
      '.gdm-rules{margin:0;padding:0;list-style:none}',
      '.gdm-rules li{display:flex;gap:8px;font-size:13px;line-height:1.45;padding:5px 0;border-top:1px solid rgba(255,255,255,.07)}',
      '.gdm-rules li:first-child{border-top:0}',
      '.gdm-rules li i{font-style:normal;flex:none}',
      '.fb-types{display:flex;gap:8px;margin:12px 0}',
      '.fb-types button{flex:1;padding:12px 8px;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.15));background:transparent;color:inherit;font-weight:600;font-size:14px}',
      '.fb-types button.on{background:linear-gradient(135deg,#f5a524,#e67635);color:#191008;border-color:transparent}',
      '.fb-ta{width:100%;min-height:150px;border-radius:14px;padding:12px;font-size:14.5px;line-height:1.5;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,.06);color:inherit;border:1px solid var(--border,rgba(255,255,255,.15))}',
      '.fb-msg{min-height:20px;margin:8px 0;font-size:13px}',
      '.fb-msg.err{color:#ff7a7a}.fb-msg.ok{color:#5ee08a}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // Har bir bo'lim uchun qoidalar kartasi (rasm-plakat): matn mavjud GD ma'lumotidan olinadi
  function gdMediaHTML(id){
    gdInjectCss();
    var md = GD_MEDIA[id] || {};
    var vids = md.videos || [], imgs = md.images || [];
    var out = '<div class="gdm-h">🎬 ' + L("Video darslik","Видеоурок") + '</div>';
    if (vids.length) {
      out += vids.map(function(v){
        return (v.uz || v.ru ? '<div class="gdm-vt">' + esc(L(v.uz || v.ru, v.ru || v.uz)) + '</div>' : '') + gdVideoEmbed(v.url);
      }).join('');
    } else {
      out += '<div class="gdm-empty"><b>🎥</b>' + L("Bu texnika uchun to'liq video darslik tez orada qo'shiladi.","Полный видеоурок по этой технике скоро появится.") + '</div>';
    }
    if (imgs.length) {
      out += '<div class="gdm-h">📷 ' + L("Rasmlar","Фото") + '</div>' + imgs.map(function(im){
        return '<img class="gdm-img" loading="lazy" src="' + esc(im.src) + '" alt="">' +
          ((im.uz || im.ru) ? '<p class="gdm-cap">' + esc(L(im.uz || im.ru, im.ru || im.uz)) + '</p>' : '');
      }).join('');
    }
    out += '<div class="gdm-h">📐 ' + L("Qonun-qoidalar (qisqacha)","Правила (кратко)") + '</div>';
    GD_SECS.forEach(function(sc){
      if (sc.k === 'media') return;
      var st = gdSteps(id, sc.k); if (!st.length) return;
      out += '<div class="gdm-card' + (sc.k === 'warn' ? ' warn' : '') + '"><div class="gdm-top"><div class="gdm-big">' + sc.ic + '</div>' +
        '<div><div class="gdm-ct">' + L(sc.uz, sc.ru) + '</div><div class="gdm-cs">' + st.length + ' ' + L('ta qadam','шагов') + '</div></div></div>' +
        '<ul class="gdm-rules">' + st.slice(0, 3).map(function(x){ return '<li><i>' + (sc.k === 'warn' ? '⚠️' : '✔️') + '</i><span>' + gdText(x) + '</span></li>'; }).join('') + '</ul></div>';
    });
    return out;
  }

  // ================= TAKLIF VA E'TIROZLAR =================
  function renderFeedback(){
    gdInjectCss();
    var f = state.fb || (state.fb = { type:'taklif', text:'', sent:false });
    if (f.sent) {
      ihost().innerHTML = '<div class="view"><div class="detail-head"><h2>' + L("Rahmat!","Спасибо!") + '</h2></div>' +
        '<div class="panel"><p class="ptext" style="font-size:15px">✅ ' + L("Xabaringiz adminga yuborildi. Ko'rib chiqamiz.","Ваше сообщение отправлено администратору. Мы рассмотрим его.") + '</p></div>' +
        '<button class="btn-primary" id="fbBack" style="width:100%;padding:13px;border-radius:11px">' + L("Asosiy menyuga","В главное меню") + '</button></div>';
      document.getElementById('fbBack').addEventListener('click', function(){ haptic('select'); state.stack = [{ view:'mainMenu' }]; render(); });
      return;
    }
    ihost().innerHTML =
      '<div class="view"><div class="detail-head"><h2>💬 ' + L("Taklif va e'tirozlar","Предложения и претензии") + '</h2></div>' +
      '<p class="ptext">' + L("Ilovani yaxshilash uchun taklifingiz yoki e'tirozingiz bormi? Yozing — to'g'ridan-to'g'ri adminga boradi.","Есть идея или претензия? Напишите — это уйдёт напрямую администратору.") + '</p>' +
      '<div class="fb-types"><button type="button" data-ft="taklif" class="' + (f.type === 'taklif' ? 'on' : '') + '">💡 ' + L("Taklif","Предложение") + '</button>' +
      '<button type="button" data-ft="etiroz" class="' + (f.type === 'etiroz' ? 'on' : '') + '">⚠️ ' + L("E'tiroz","Претензия") + '</button></div>' +
      '<textarea class="fb-ta" id="fbText" maxlength="2000" placeholder="' + L("Fikringizni shu yerga yozing...","Напишите здесь...") + '">' + esc(f.text) + '</textarea>' +
      '<div class="fb-msg" id="fbMsg"></div>' +
      '<button class="btn-primary" id="fbSend" style="width:100%;padding:13px;border-radius:11px">📨 ' + L("Yuborish","Отправить") + '</button></div>';
    var ta = document.getElementById('fbText'), msg = document.getElementById('fbMsg'), btn = document.getElementById('fbSend');
    ta.addEventListener('input', function(){ f.text = ta.value; });
    ihost().querySelectorAll('[data-ft]').forEach(function(b){
      b.addEventListener('click', function(){
        haptic('select'); f.type = b.getAttribute('data-ft');
        ihost().querySelectorAll('[data-ft]').forEach(function(x){ x.classList.toggle('on', x === b); });
      });
    });
    btn.addEventListener('click', function(){
      var txt = (ta.value || '').trim();
      msg.className = 'fb-msg';
      if (txt.length < 5) { msg.className = 'fb-msg err'; msg.textContent = L("Matn juda qisqa (kamida 5 belgi).","Слишком короткий текст (минимум 5 символов)."); return; }
      if (!getInitData()) { msg.className = 'fb-msg err'; msg.textContent = L("Iltimos, ilovani Telegram ichidan oching.","Пожалуйста, откройте приложение внутри Telegram."); return; }
      btn.disabled = true; btn.textContent = L("Yuborilmoqda...","Отправка...");
      var tag = f.type === 'taklif' ? '[💡 TAKLIF] ' : "[⚠️ E'TIROZ] ";
      apiPost('/api/public/complaint/create', { init_data:getInitData(), matn: tag + txt, lang:srvLang() }).then(function(res){
        if (res.data && res.data.ok) { haptic('ok'); f.sent = true; f.text = ''; renderFeedback(); }
        else { btn.disabled = false; btn.textContent = '📨 ' + L("Yuborish","Отправить"); msg.className = 'fb-msg err'; msg.textContent = (res.data && res.data.error) || t().orderErrGeneric; }
      }).catch(function(){
        btn.disabled = false; btn.textContent = '📨 ' + L("Yuborish","Отправить"); msg.className = 'fb-msg err'; msg.textContent = t().orderErrGeneric;
      });
    });
  }


  // ============================================================
  //  ♻️ B/U TEXNIKA — foydalanuvchilar o'z texnikasini soladi
  //  E'lonlar ro'yxati + filtr (texnika/viloyat/tuman) + "＋" forma.
  //  Yuborilgan e'lon adminga boradi; tasdiqlansa darhol chiqadi.
  // ============================================================
  var BU_CATS = ['tv','kond','xolod','kir','suv','komp','dux','mikro','piles','dazmol','vent','stab','ups','printer'];
  var BU_MIN = 3, BU_MAX = 6;
  state.bu = { regions:null, f:{ cat:'', viloyat:'', tuman:'' }, items:null, loading:false, my:null, form:null };

  // ============================================================
  //  FOYDALI ILOVALAR — texnika bo'yicha tavsiya etilgan ilovalar
  //  Texnikalar va ilovalar admin paneldan (Foydali ilovalar tabi) to'ldiriladi.
  //  Ilova ichida filtr: «Texnika» tugmasi → texnikalar ro'yxati → tanlangan texnika ilovalari.
  // ============================================================
  state.fy = { data:null, sel:'', err:'' };

  function fyInjectCss(){
    if (document.getElementById('fyCss')) return;
    var st = document.createElement('style'); st.id = 'fyCss';
    st.textContent = [
      '.fy-filter{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;min-height:58px;padding:10px 16px;margin:4px 0 12px;border-radius:18px;border:1.5px solid var(--border,rgba(255,255,255,.2));background:rgba(255,255,255,.08);color:inherit;font-size:16px;font-weight:800;text-align:left;cursor:pointer}',
      '.fy-filter .fy-fi{font-size:26px;line-height:1}',
      '.fy-filter .fy-ft{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.fy-filter .fy-ft small{font-size:12px;font-weight:600;opacity:.65}',
      '.fy-filter .fy-ft b{font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.fy-filter .fy-fc{font-size:13px;opacity:.7}',
      '.fy-filter.on{border-color:#19e6a0;background:rgba(25,230,160,.12)}',
      '.fy-clear{margin:-4px 0 12px;padding:8px 14px;border-radius:14px;border:0;background:rgba(255,255,255,.08);color:inherit;font-size:13px;font-weight:700}',
      '.fy-cnt{font-size:13px;opacity:.7;margin:0 2px 10px}',
      '.fy-list{display:flex;flex-direction:column;gap:16px}',
      '.fy-card{display:flex;flex-direction:column;gap:14px;padding:18px;border-radius:24px;background:rgba(255,255,255,.07);border:1px solid var(--border,rgba(255,255,255,.14));box-shadow:0 8px 26px rgba(0,0,0,.22)}',
      '.fy-head{display:flex;gap:16px;align-items:center}',
      '.fy-ic{flex:0 0 88px;width:88px;height:88px;border-radius:24px;background:linear-gradient(135deg,#22e3c4,#0b7f9e) center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:44px;box-shadow:0 6px 18px rgba(0,0,0,.3)}',
      '.fy-inf{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}',
      '.fy-nm{font-size:20px;font-weight:800;line-height:1.2;word-break:break-word}',
      '.fy-tags{display:flex;flex-wrap:wrap;gap:6px}',
      '.fy-tag{padding:4px 10px;border-radius:12px;background:rgba(255,255,255,.1);font-size:12.5px;font-weight:700}',
      '.fy-tag.pf{background:rgba(25,230,160,.16)}',
      '.fy-ds{font-size:15px;line-height:1.5;opacity:.9;white-space:pre-line;word-break:break-word}',
      '.fy-go{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;min-height:54px;border:0;border-radius:16px;font-size:17px;font-weight:800;color:#06231a;background:linear-gradient(135deg,#19e6a0,#0aa37a);box-shadow:0 6px 18px rgba(25,230,160,.35);cursor:pointer;text-decoration:none}',
      '.fy-go.off{background:rgba(255,255,255,.1);color:inherit;box-shadow:none;opacity:.6}',
      '.fy-go:disabled{opacity:.7}',
      '.fy-msg{font-size:14.5px;line-height:1.45;font-weight:700}',
      '.fy-msg:empty{display:none}',
      '.fy-msg.ok{color:#19e6a0}',
      '.fy-msg.err{color:#ff8a80}',
      '.fy-chat{width:100%;box-sizing:border-box;min-height:48px;border-radius:14px;border:1.5px solid #19e6a0;background:transparent;color:#19e6a0;font-size:16px;font-weight:800}',
      '.fy-empty{text-align:center;padding:34px 18px;opacity:.85;font-size:15px;line-height:1.5}',
      '.fy-empty b{display:block;font-size:44px;margin-bottom:8px}',
      '.fy-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}',
      '.fy-sheet{width:100%;max-width:560px;max-height:82vh;overflow-y:auto;box-sizing:border-box;padding:18px 16px 26px;border-radius:26px 26px 0 0;background:var(--bg2,#14181f);color:#fff;box-shadow:0 -10px 40px rgba(0,0,0,.5)}',
      '.fy-sh-t{display:flex;align-items:center;justify-content:space-between;font-size:19px;font-weight:800;margin-bottom:12px}',
      '.fy-sh-x{width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:inherit;font-size:18px}',
      '.fy-opt{display:flex;align-items:center;gap:14px;width:100%;box-sizing:border-box;min-height:62px;padding:10px 14px;margin-bottom:8px;border-radius:16px;border:1.5px solid transparent;background:rgba(255,255,255,.07);color:inherit;font-size:17px;font-weight:700;text-align:left;cursor:pointer}',
      '.fy-opt .fy-oe{font-size:28px;line-height:1}',
      '.fy-opt .fy-on{flex:1}',
      '.fy-opt .fy-oc{min-width:30px;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,.12);font-size:13px;text-align:center}',
      '.fy-opt.sel{border-color:#19e6a0;background:rgba(25,230,160,.14)}'
    ].join('');
    document.head.appendChild(st);
  }

  function fyIconUrl(it){ return API_BASE + '/api/public/foyd/icon?id=' + it.id + '&v=' + (it.rasm_v || 0); }
  function fyTechName(tx){ return state.lang === 'uz' ? tx.nomi : (tx.nomi_ru || tx.nomi); }
  function fyItemName(it){ return state.lang === 'uz' ? it.nomi : (it.nomi_ru || it.nomi); }
  function fyItemDesc(it){ return state.lang === 'uz' ? it.tavsif : (it.tavsif_ru || it.tavsif); }
  function fyPlatLabel(p){
    var m = { android:'🤖 Android', ios:'🍎 iOS', web:'🌐 Web', pc:'💻 ' + L('Dastur','Программа'), boshqa:'📦 ' + L('Fayl','Файл') };
    return m[p] || m.boshqa;
  }
  function fyTechOf(key){
    var d = state.fy.data; if (!d) return null;
    for (var i = 0; i < d.texnikalar.length; i++) if (d.texnikalar[i].nomi.trim().toLowerCase() === key) return d.texnikalar[i];
    return null;
  }

  function foydOpen(){
    fyInjectCss();
    state.fy.data = null; state.fy.err = ''; state.fy.sel = '';
    push({ view:'foyd' });
  }

  function renderFoyd(){
    fyInjectCss();
    var D = state.fy.data;
    var head = '<div class="mk-title">🧩 ' + L('Foydali ilovalar','Полезные приложения') + '</div>';
    if (!D) {
      mainView.innerHTML = '<div class="view mk-view">' + head + '<div class="mk-skel"></div><div class="mk-skel"></div></div>';
      if (!API_BASE) { state.fy.err = L("Server ulanmagan",'Сервер не подключён'); }
      var p = API_BASE ? apiGet('/api/public/foyd') : Promise.reject(new Error('NO_API'));
      p.then(function(r){
        if (state.stack[state.stack.length-1].view !== 'foyd') return;
        if (r && r.ok) { state.fy.data = { texnikalar: r.texnikalar || [], items: r.items || [] }; state.fy.err = ''; }
        else { state.fy.data = { texnikalar:[], items:[] }; state.fy.err = (r && r.error) || L("Ilovalarni yuklab bo'lmadi",'Не удалось загрузить'); }
        renderFoyd();
      }).catch(function(){
        if (state.stack[state.stack.length-1].view !== 'foyd') return;
        state.fy.data = { texnikalar:[], items:[] };
        state.fy.err = L("Internetni tekshirib, qayta urinib ko'ring",'Проверьте интернет и повторите');
        renderFoyd();
      });
      return;
    }
    var sel = state.fy.sel;
    if (sel && !fyTechOf(sel)) sel = state.fy.sel = '';
    var tx = sel ? fyTechOf(sel) : null;
    var items = D.items.filter(function(it){ return !sel || it.tex_key === sel; });
    var filterHtml = '<button type="button" class="fy-filter' + (tx ? ' on' : '') + '" id="fyFilter">' +
      '<span class="fy-fi">' + (tx ? esc(tx.emoji || '📱') : '🔽') + '</span>' +
      '<span class="fy-ft"><small>' + L('Texnika bo\'yicha filtr','Фильтр по технике') + '</small>' +
      '<b>' + (tx ? esc(fyTechName(tx)) : L('Barcha texnikalar','Вся техника')) + '</b></span>' +
      '<span class="fy-fc">' + D.texnikalar.length + ' ▾</span></button>' +
      (tx ? '<button type="button" class="fy-clear" id="fyClear">✕ ' + L('Filtrni tozalash','Сбросить фильтр') + '</button>' : '');
    var body;
    if (state.fy.err) body = '<div class="fy-empty"><b>⚠️</b>' + esc(state.fy.err) + '</div>';
    else if (!items.length) body = '<div class="fy-empty"><b>🧩</b>' + L("Hozircha bu texnika uchun ilova qo'shilmagan.",'Для этой техники пока нет приложений.') + '</div>';
    else body = '<div class="fy-cnt">' + L('Ilovalar: ','Приложений: ') + items.length + '</div><div class="fy-list">' + items.map(fyCardHTML).join('') + '</div>';
    mainView.innerHTML = '<div class="view mk-view">' + head + (D.texnikalar.length ? filterHtml : '') + body + '</div>';

    var fb = document.getElementById('fyFilter');
    if (fb) fb.addEventListener('click', function(){ haptic('select'); fyOpenSheet(); });
    var cl = document.getElementById('fyClear');
    if (cl) cl.addEventListener('click', function(){ haptic('tap'); state.fy.sel = ''; renderFoyd(); });
    mainView.querySelectorAll('[data-fy]').forEach(function(b){
      b.addEventListener('click', function(){
        var it = items[parseInt(b.getAttribute('data-fy'), 10)];
        if (!it) return;
        haptic('select'); fySend(it, b);
      });
    });
  }

  // Tanlangan ilovani Telegram bot orqali foydalanuvchining shaxsiy chatiga yuboradi
  function fySend(it, btn){
    var card = btn.closest('.fy-card');
    var msg = card.querySelector('.fy-msg');
    var say = function(txt, kind){ msg.className = 'fy-msg ' + (kind || ''); msg.textContent = txt; };
    if (btn.disabled) return;
    if (!getInitData()) { say(L("Ilovani olish uchun mini appni Telegram ichida oching.",'Чтобы получить приложение, откройте мини-апп внутри Telegram.'), 'err'); return; }
    var label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '⏳ ' + L('Yuborilmoqda...','Отправляется...');
    say('', '');
    apiPost('/api/public/foyd/send', { init_data:getInitData(), lang:srvLang(), id:it.id }).then(function(res){
      btn.disabled = false; btn.innerHTML = label;
      if (res.data && res.data.ok) {
        haptic('success');
        say('✅ ' + L("Ilova botga yuborildi! Telegram chatidan oching.",'Приложение отправлено в бот! Откройте его в чате Telegram.'), 'ok');
        if (!card.querySelector('.fy-chat')) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'fy-chat';
          c.textContent = '💬 ' + L('Chatni ochish','Открыть чат');
          c.addEventListener('click', function(){ if (tg && tg.close) tg.close(); });
          msg.after(c);
        }
      } else {
        say('⚠️ ' + ((res.data && res.data.error) || L("Yuborib bo'lmadi",'Не удалось отправить')), 'err');
      }
    }).catch(function(){
      btn.disabled = false; btn.innerHTML = label;
      say('⚠️ ' + L("Internetni tekshirib, qayta urinib ko'ring",'Проверьте интернет и повторите'), 'err');
    });
  }

  function fyFmtSize(b){
    if (!b) return '';
    return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  }

  function fyCardHTML(it, idx){
    var tx = fyTechOf(it.tex_key);
    var ic = it.has_icon
      ? '<span class="fy-ic" style="background-image:url(\'' + esc(fyIconUrl(it)) + '\')"></span>'
      : '<span class="fy-ic">' + esc((tx && tx.emoji) || '📱') + '</span>';
    var ds = fyItemDesc(it);
    var sz = fyFmtSize(it.file_size);
    return '<div class="fy-card"><div class="fy-head">' + ic + '<div class="fy-inf"><div class="fy-nm">' + esc(fyItemName(it)) + '</div>' +
      '<div class="fy-tags"><span class="fy-tag">' + esc(tx ? ((tx.emoji || '') + ' ' + fyTechName(tx)) : it.texnika) + '</span>' +
      '<span class="fy-tag pf">' + fyPlatLabel(it.platforma) + '</span>' +
      (sz ? '<span class="fy-tag">💾 ' + sz + '</span>' : '') + '</div></div></div>' +
      (ds ? '<div class="fy-ds">' + esc(ds) + '</div>' : '') +
      '<button type="button" class="fy-go" data-fy="' + idx + '">📩 ' + L('Botga yuborish','Получить в боте') + '</button>' +
      '<div class="fy-msg"></div></div>';
  }

  function fyOpenSheet(){
    var D = state.fy.data; if (!D) return;
    var ov = document.createElement('div'); ov.className = 'fy-ov';
    var opts = '<button type="button" class="fy-opt' + (!state.fy.sel ? ' sel' : '') + '" data-k=""><span class="fy-oe">🧩</span><span class="fy-on">' +
      L('Barcha texnikalar','Вся техника') + '</span><span class="fy-oc">' + D.items.length + '</span></button>';
    D.texnikalar.forEach(function(tx){
      var k = tx.nomi.trim().toLowerCase();
      opts += '<button type="button" class="fy-opt' + (state.fy.sel === k ? ' sel' : '') + '" data-k="' + esc(k) + '"><span class="fy-oe">' + esc(tx.emoji || '📱') +
        '</span><span class="fy-on">' + esc(fyTechName(tx)) + '</span><span class="fy-oc">' + tx.soni + '</span></button>';
    });
    ov.innerHTML = '<div class="fy-sheet"><div class="fy-sh-t"><span>' + L('Texnikani tanlang','Выберите технику') + '</span><button type="button" class="fy-sh-x" aria-label="close">✕</button></div>' + opts + '</div>';
    document.body.appendChild(ov);
    var close = function(){ ov.remove(); };
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    ov.querySelector('.fy-sh-x').addEventListener('click', close);
    ov.querySelectorAll('[data-k]').forEach(function(b){
      b.addEventListener('click', function(){
        haptic('select'); state.fy.sel = b.getAttribute('data-k'); close(); renderFoyd(); window.scrollTo(0, 0);
      });
    });
  }

  function buInjectCss(){
    if (document.getElementById('buCss')) return;
    var st = document.createElement('style'); st.id = 'buCss';
    st.textContent = [
      '.bu-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}',
      '.bu-top .mk-title{margin:0}',
      '.bu-acts{display:flex;gap:8px;align-items:center}',
      '.bu-my{height:42px;padding:0 13px;border-radius:21px;border:1px solid var(--border,rgba(255,255,255,.18));background:rgba(255,255,255,.06);color:inherit;font-weight:700;font-size:13px}',
      '.bu-plus{width:46px;height:46px;border-radius:50%;border:0;font-size:28px;line-height:1;font-weight:700;color:#06231a;background:linear-gradient(135deg,#19e6a0,#0aa37a);box-shadow:0 6px 18px rgba(25,230,160,.4)}',
      '.bu-filter{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}',
      '.bu-filter .full{grid-column:1/-1}',
      '.bu-sel,.bu-in,.bu-ta{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;font-size:14.5px;color:inherit;background:rgba(255,255,255,.07);border:1px solid var(--border,rgba(255,255,255,.16));appearance:none;-webkit-appearance:none}',
      '.bu-sel{background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 18px) 52%,calc(100% - 12px) 52%;background-size:6px 6px;background-repeat:no-repeat;padding-right:32px}',
      '.bu-sel option{color:#111}',
      '.bu-sel:disabled{opacity:.45}',
      '.bu-ta{min-height:80px;resize:vertical}',
      '.bu-clear{grid-column:1/-1;padding:9px;border-radius:10px;border:1px dashed var(--border,rgba(255,255,255,.25));background:transparent;color:inherit;font-size:13px}',
      '.bu-count{font-size:12.5px;opacity:.75;margin:0 2px 8px}',
      '.bu-list{display:grid;grid-template-columns:1fr;gap:12px}',
      '.bu-card{display:flex;gap:12px;text-align:left;padding:10px;border-radius:16px;border:1px solid var(--border,rgba(255,255,255,.12));background:var(--bg-panel,#161b26);color:inherit;width:100%}',
      '.bu-ph{flex:none;width:104px;height:104px;border-radius:12px;background:#0b0e14 center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:30px;position:relative;overflow:hidden}',
      '.bu-ph i{position:absolute;right:5px;bottom:5px;font-style:normal;font-size:11px;font-weight:700;padding:2px 7px;border-radius:9px;background:rgba(0,0,0,.6);color:#fff}',
      '.bu-inf{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}',
      '.bu-mdl{font-weight:800;font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.bu-meta{font-size:12.5px;opacity:.75}',
      '.bu-prc{font-weight:800;font-size:16px;color:#19e6a0;margin-top:auto}',
      '.bu-empty{padding:26px 14px;text-align:center;border-radius:16px;border:1px dashed var(--border,rgba(255,255,255,.2));opacity:.85;line-height:1.5}',
      '.bu-empty b{display:block;font-size:34px;margin-bottom:6px}',
      '.bu-lbl{display:block;font-size:12.5px;font-weight:700;margin:12px 0 5px;opacity:.85}',
      '.bu-lbl em{font-style:normal;opacity:.6;font-weight:500}',
      '.bu-ups{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
      '.bu-up{position:relative;aspect-ratio:1;border-radius:12px;background:rgba(255,255,255,.07) center/cover no-repeat;border:1px dashed var(--border,rgba(255,255,255,.25));display:flex;align-items:center;justify-content:center;font-size:26px;color:inherit}',
      '.bu-up.has{border-style:solid}',
      '.bu-up button{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:13px}',
      '.bu-hint{font-size:12px;opacity:.7;margin:6px 0 0}',
      '.bu-err{color:#ff7a7a;font-size:13px;min-height:18px;margin:10px 0 4px}',
      '.bu-send{width:100%;padding:14px;border-radius:12px;font-size:15px;margin-top:6px}',
      '.bu-badge{display:inline-block;font-size:11px;font-weight:800;padding:3px 9px;border-radius:9px}',
      '.bu-badge.kutilmoqda{background:rgba(255,200,61,.18);color:#ffc83d}',
      '.bu-badge.tasdiqlandi{background:rgba(25,230,160,.18);color:#19e6a0}',
      '.bu-badge.rad{background:rgba(255,90,90,.18);color:#ff7a7a}',
      '.bu-del{margin-top:6px;align-self:flex-start;font-size:12px;padding:6px 10px;border-radius:9px;border:1px solid rgba(255,90,90,.5);background:transparent;color:#ff7a7a}',
      '.bu-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center}',
      '.bu-sheet{width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;background:var(--bg-panel,#161b26);color:var(--text-1,#fff);padding:0 0 18px}',
      '.bu-gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}',
      '.bu-gal img{flex:none;width:100%;aspect-ratio:4/3;object-fit:cover;scroll-snap-align:center;background:#0b0e14}',
      '.bu-dots{text-align:center;font-size:12px;opacity:.7;margin:6px 0}',
      '.bu-det{padding:4px 16px}',
      '.bu-det h3{margin:6px 0 2px;font-size:19px}',
      '.bu-det .bu-prc{font-size:22px;margin:4px 0 10px;display:block}',
      '.bu-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);font-size:14px}',
      '.bu-row span:first-child{opacity:.65}',
      '.bu-call{display:block;text-align:center;text-decoration:none;padding:14px;border-radius:12px;font-weight:800;margin:12px 16px 0;color:#06231a;background:linear-gradient(135deg,#19e6a0,#0aa37a)}',
      '.bu-x{position:sticky;top:0;float:right;margin:10px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:16px;z-index:2}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function buCatName(id){ var c = catById(id); return c ? c.icon + ' ' + pick(c, 'name') : id; }
  function buCatOptions(sel, withAll){
    var o = withAll ? '<option value="">' + L('Barcha texnikalar','Вся техника') + '</option>' : '<option value="">' + L('Texnikani tanlang','Выберите технику') + '</option>';
    CATS.filter(function(c){ return BU_CATS.indexOf(c.id) > -1; }).forEach(function(c){
      o += '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.icon + ' ' + pick(c, 'name')) + '</option>';
    });
    return o;
  }
  function buRegions(cb){
    if (state.bu.regions) { cb(state.bu.regions); return; }
    apiGet('/api/public/bu/regions').then(function(r){
      state.bu.regions = (r && r.regions) || []; cb(state.bu.regions);
    }).catch(function(){ cb([]); });
  }
  function buRegionOptions(sel, withAll){
    var o = '<option value="">' + (withAll ? L('Barcha viloyatlar','Все регионы') : L('Viloyatni tanlang','Выберите область')) + '</option>';
    (state.bu.regions || []).forEach(function(r){ o += '<option value="' + esc(r.v) + '"' + (r.v === sel ? ' selected' : '') + '>' + esc(r.nom) + '</option>'; });
    return o;
  }
  function buTumanOptions(viloyat, sel, withAll){
    var o = '<option value="">' + (withAll ? L('Barcha tumanlar','Все районы') : L('Tumanni tanlang','Выберите район')) + '</option>';
    var r = (state.bu.regions || []).filter(function(x){ return x.v === viloyat; })[0];
    ((r && r.tumanlar) || []).forEach(function(t){ o += '<option value="' + esc(t) + '"' + (t === sel ? ' selected' : '') + '>' + esc(t) + '</option>'; });
    return o;
  }
  function buPhoto(it, i){ return API_BASE + '/api/public/bu/photo?id=' + it.id + '&i=' + (i || 0); }

  function buOpen(){
    buInjectCss();
    state.bu.items = null;
    push({ view:'marketBu' });
  }

  function renderBu(){
    buInjectCss();
    var f = state.bu.f;
    mainView.innerHTML =
      '<div class="view mk-view">' +
        '<div class="bu-top"><div class="mk-title">♻️ ' + L('B/U texnika','Б/У техника') + '</div>' +
        '<div class="bu-acts"><button type="button" class="bu-my" id="buMyBtn">📋 ' + L("E'lonlarim","Мои") + '</button>' +
        '<button type="button" class="bu-plus" id="buAdd" aria-label="add">＋</button></div></div>' +
        '<div class="bu-filter">' +
          '<select class="bu-sel full" id="buFCat">' + buCatOptions(f.cat, true) + '</select>' +
          '<select class="bu-sel" id="buFVil">' + buRegionOptions(f.viloyat, true) + '</select>' +
          '<select class="bu-sel" id="buFTum"' + (f.viloyat ? '' : ' disabled') + '>' + buTumanOptions(f.viloyat, f.tuman, true) + '</select>' +
          ((f.cat || f.viloyat || f.tuman) ? '<button type="button" class="bu-clear" id="buFClr">✕ ' + L('Filtrni tozalash','Сбросить фильтр') + '</button>' : '') +
        '</div>' +
        '<div class="bu-count" id="buCnt"></div>' +
        '<div class="bu-list" id="buList"><div class="mk-skel"></div><div class="mk-skel"></div></div>' +
      '</div>';
    var cat = document.getElementById('buFCat'), vil = document.getElementById('buFVil'), tum = document.getElementById('buFTum');
    cat.addEventListener('change', function(){ f.cat = cat.value; haptic('select'); renderBu(); });
    vil.addEventListener('change', function(){ f.viloyat = vil.value; f.tuman = ''; haptic('select'); renderBu(); });
    tum.addEventListener('change', function(){ f.tuman = tum.value; haptic('select'); renderBu(); });
    var clr = document.getElementById('buFClr');
    if (clr) clr.addEventListener('click', function(){ f.cat = ''; f.viloyat = ''; f.tuman = ''; haptic('tap'); renderBu(); });
    document.getElementById('buAdd').addEventListener('click', function(){
      haptic('select'); state.bu.form = { photos:[], cat:f.cat || '', model:'', yil:'', telefon:'', viloyat:f.viloyat || '', tuman:f.tuman || '', narx:'', izoh:'', sent:false, busy:false };
      push({ view:'marketBuForm' });
    });
    document.getElementById('buMyBtn').addEventListener('click', function(){ haptic('select'); state.bu.my = null; push({ view:'marketBuMy' }); });

    if (!state.bu.regions) buRegions(function(){ if (state.stack[state.stack.length-1].view === 'marketBu') { var keep = JSON.stringify(f); if (JSON.stringify(state.bu.f) === keep) renderBu(); } });
    var qs = '?cat=' + encodeURIComponent(f.cat) + '&viloyat=' + encodeURIComponent(f.viloyat) + '&tuman=' + encodeURIComponent(f.tuman);
    var myF = JSON.stringify(f);
    apiGet('/api/public/bu/list' + qs).then(function(r){
      if (state.stack[state.stack.length-1].view !== 'marketBu' || JSON.stringify(state.bu.f) !== myF) return;
      drawBuList((r && r.items) || [], r && r.ok === false ? r.error : '');
    }).catch(function(){
      if (state.stack[state.stack.length-1].view !== 'marketBu') return;
      drawBuList([], L("Internetni tekshirib, qayta urinib ko'ring","Проверьте интернет и повторите"));
    });
  }

  function buCardHTML(it, idx){
    var ph = it.rasm_soni > 0 ? ' style="background-image:url(\'' + esc(buPhoto(it, 0)) + '\')"' : '';
    return '<button type="button" class="bu-card" data-bi="' + idx + '"><span class="bu-ph"' + ph + '>' + (it.rasm_soni > 0 ? '<i>📷 ' + it.rasm_soni + '</i>' : '🖼') + '</span>' +
      '<span class="bu-inf"><span class="bu-mdl">' + esc(it.model) + '</span>' +
      '<span class="bu-meta">' + esc(buCatName(it.cat_id)) + (it.yil ? ' · ' + it.yil : '') + '</span>' +
      '<span class="bu-meta">📍 ' + esc(it.viloyat_nom) + (it.tuman ? ', ' + esc(it.tuman) : '') + '</span>' +
      '<span class="bu-prc">' + mkFmt(it.narx) + ' ' + L("so'm","сум") + '</span></span></button>';
  }

  function drawBuList(items, err){
    state.bu.items = items;
    var list = document.getElementById('buList'), cnt = document.getElementById('buCnt');
    if (!list) return;
    if (err) { list.innerHTML = '<div class="bu-empty"><b>⚠️</b>' + esc(err) + '</div>'; return; }
    if (cnt) cnt.textContent = items.length ? (L("E'lonlar: ","Объявлений: ") + items.length) : '';
    if (!items.length) {
      list.innerHTML = '<div class="bu-empty"><b>♻️</b>' + L("Tanlangan filtr bo'yicha e'lon topilmadi. Birinchi bo'lib o'z texnikangizni soting — «＋» tugmasini bosing.","По выбранному фильтру объявлений нет. Станьте первым — нажмите «＋».") + '</div>';
      return;
    }
    list.innerHTML = items.map(buCardHTML).join('');
    list.querySelectorAll('[data-bi]').forEach(function(b){
      b.addEventListener('click', function(){ haptic('select'); buDetail(items[parseInt(b.getAttribute('data-bi'), 10)]); });
    });
  }

  function buDetail(it){
    var ov = document.createElement('div'); ov.className = 'bu-ov';
    var imgs = ''; for (var i = 0; i < it.rasm_soni; i++) imgs += '<img loading="lazy" alt="" src="' + esc(buPhoto(it, i)) + '">';
    var tel = String(it.telefon || '').replace(/[^\d+]/g, '');
    ov.innerHTML = '<div class="bu-sheet"><button type="button" class="bu-x" aria-label="close">✕</button>' +
      (imgs ? '<div class="bu-gal">' + imgs + '</div><div class="bu-dots">' + (it.rasm_soni > 1 ? '‹ ' + L("suring","листайте") + ' ›' : '') + '</div>' : '') +
      '<div class="bu-det"><h3>' + esc(it.model) + '</h3><span class="bu-prc">' + mkFmt(it.narx) + ' ' + L("so'm","сум") + '</span>' +
      '<div class="bu-row"><span>' + L('Texnika','Техника') + '</span><span>' + esc(buCatName(it.cat_id)) + '</span></div>' +
      (it.yil ? '<div class="bu-row"><span>' + L('Yili','Год') + '</span><span>' + it.yil + '</span></div>' : '') +
      '<div class="bu-row"><span>' + L('Manzil','Адрес') + '</span><span>' + esc(it.viloyat_nom) + (it.tuman ? ', ' + esc(it.tuman) : '') + '</span></div>' +
      '<div class="bu-row"><span>' + L('Telefon','Телефон') + '</span><span>' + esc(it.telefon) + '</span></div>' +
      (it.izoh ? '<div class="bu-row"><span>' + L('Izoh','Описание') + '</span><span style="text-align:right">' + esc(it.izoh) + '</span></div>' : '') +
      '</div><a class="bu-call" href="tel:' + esc(tel) + '">📞 ' + L("Sotuvchiga qo'ng'iroq","Позвонить продавцу") + '</a></div>';
    document.body.appendChild(ov);
    var close = function(){ ov.remove(); };
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    ov.querySelector('.bu-x').addEventListener('click', close);
  }

  // ---------- Rasmni siqish (telefon rasmlari katta bo'ladi) ----------
  function buCompress(file){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onerror = function(){ reject(new Error('read')); };
      fr.onload = function(){
        var img = new Image();
        img.onerror = function(){ reject(new Error('img')); };
        img.onload = function(){
          var max = 1100, w = img.width, h = img.height, sc = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          var q = 0.8, out = cv.toDataURL('image/jpeg', q);
          while (out.length > 900 * 1024 && q > 0.35) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); }
          resolve(out);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function renderBuForm(){
    buInjectCss();
    var F = state.bu.form || (state.bu.form = { photos:[], cat:'', model:'', yil:'', telefon:'', viloyat:'', tuman:'', narx:'', izoh:'', sent:false, busy:false });
    if (F.sent) {
      mainView.innerHTML = '<div class="view mk-view"><div class="bu-empty" style="margin-top:20px"><b>✅</b><div style="font-size:16px;font-weight:800;margin-bottom:6px">' + L("E'lon yuborildi!","Объявление отправлено!") + '</div>' +
        L("Admin tekshirib chiqadi. Tasdiqlansa e'loningiz darhol B/U texnika bo'limida ko'rinadi, natija haqida botdan xabar olasiz.","Администратор проверит его. После одобрения объявление сразу появится в разделе Б/У, а результат придёт в бот.") + '</div>' +
        '<button type="button" class="btn-primary bu-send" id="buDone">' + L("E'lonlarga qaytish","К объявлениям") + '</button></div>';
      document.getElementById('buDone').addEventListener('click', function(){ haptic('select'); state.bu.form = null; pop(); });
      return;
    }
    if (!state.bu.regions) { buRegions(function(){ if (state.stack[state.stack.length-1].view === 'marketBuForm') renderBuForm(); }); }
    var slots = '';
    for (var i = 0; i < F.photos.length; i++) slots += '<div class="bu-up has" style="background-image:url(\'' + F.photos[i] + '\')"><button type="button" data-rm="' + i + '">✕</button></div>';
    if (F.photos.length < BU_MAX) slots += '<button type="button" class="bu-up" id="buAddPh">📷<span style="font-size:11px;position:absolute;bottom:6px">' + L("Qo'shish","Добавить") + '</span></button>';
    mainView.innerHTML =
      '<div class="view mk-view"><div class="mk-title">＋ ' + L("Texnika sotish","Продать технику") + '</div>' +
      '<span class="bu-lbl">📷 ' + L("Rasmlar","Фото") + ' <em>(' + L("kamida ","минимум ") + BU_MIN + ')</em> — <span id="buPhN">' + F.photos.length + '/' + BU_MAX + '</span></span>' +
      '<div class="bu-ups">' + slots + '</div>' +
      '<input type="file" id="buFile" accept="image/*" multiple style="display:none">' +
      '<p class="bu-hint">' + L("Texnikaning turli tomonlaridan aniq rasmga oling.","Сфотографируйте технику с разных сторон.") + '</p>' +
      '<label class="bu-lbl">' + L("Texnika turi","Тип техники") + '</label><select class="bu-sel" id="buCat">' + buCatOptions(F.cat, false) + '</select>' +
      '<label class="bu-lbl">' + L("Modeli","Модель") + '</label><input class="bu-in" id="buModel" maxlength="80" placeholder="' + esc(L("Masalan: Samsung UE43T5300","Например: Samsung UE43T5300")) + '" value="' + esc(F.model) + '">' +
      '<label class="bu-lbl">' + L("Yili","Год") + ' <em>(' + L("ixtiyoriy","необязательно") + ')</em></label><input class="bu-in" id="buYil" inputmode="numeric" maxlength="4" placeholder="2020" value="' + esc(F.yil) + '">' +
      '<label class="bu-lbl">' + L("Telefon raqam","Номер телефона") + '</label><input class="bu-in" id="buTel" type="tel" inputmode="tel" maxlength="20" placeholder="+998 90 123 45 67" value="' + esc(F.telefon) + '">' +
      '<label class="bu-lbl">' + L("Viloyat","Область") + '</label><select class="bu-sel" id="buVil">' + buRegionOptions(F.viloyat, false) + '</select>' +
      '<label class="bu-lbl">' + L("Tuman","Район") + '</label><select class="bu-sel" id="buTum"' + (F.viloyat ? '' : ' disabled') + '>' + buTumanOptions(F.viloyat, F.tuman, false) + '</select>' +
      '<label class="bu-lbl">' + L("Narxi (so'm)","Цена (сум)") + '</label><input class="bu-in" id="buNarx" inputmode="numeric" placeholder="1 500 000" value="' + esc(F.narx) + '">' +
      '<label class="bu-lbl">' + L("Izoh","Описание") + ' <em>(' + L("ixtiyoriy","необязательно") + ')</em></label><textarea class="bu-ta" id="buIzoh" maxlength="500" placeholder="' + esc(L("Holati, nosozligi, komplekti...","Состояние, комплект...")) + '">' + esc(F.izoh) + '</textarea>' +
      '<div class="bu-err" id="buErr"></div>' +
      '<button type="button" class="btn-primary bu-send" id="buSend">📨 ' + L("Yuborish","Отправить") + '</button></div>';

    var $ = function(id){ return document.getElementById(id); };
    var err = function(m){ $('buErr').textContent = m || ''; };
    $('buCat').addEventListener('change', function(){ F.cat = this.value; });
    $('buModel').addEventListener('input', function(){ F.model = this.value; });
    $('buYil').addEventListener('input', function(){ this.value = this.value.replace(/\D/g, '').slice(0, 4); F.yil = this.value; });
    $('buTel').addEventListener('input', function(){ F.telefon = this.value; });
    $('buTel').addEventListener('focus', function(){ if (!this.value) { this.value = '+998 '; F.telefon = this.value; } });
    $('buNarx').addEventListener('input', function(){ var d = this.value.replace(/\D/g, '').slice(0, 11); this.value = d ? mkFmt(d) : ''; F.narx = this.value; });
    $('buIzoh').addEventListener('input', function(){ F.izoh = this.value; });
    $('buVil').addEventListener('change', function(){ F.viloyat = this.value; F.tuman = ''; $('buTum').innerHTML = buTumanOptions(F.viloyat, '', false); $('buTum').disabled = !F.viloyat; });
    $('buTum').addEventListener('change', function(){ F.tuman = this.value; });

    var addBtn = $('buAddPh'), fileIn = $('buFile');
    if (addBtn) addBtn.addEventListener('click', function(){ haptic('tap'); fileIn.click(); });
    fileIn.addEventListener('change', function(){
      var files = Array.prototype.slice.call(fileIn.files || [], 0, BU_MAX - F.photos.length);
      if (!files.length) return;
      err(L("Rasmlar tayyorlanmoqda...","Подготовка фото..."));
      var chain = Promise.resolve();
      files.forEach(function(fl){ chain = chain.then(function(){ return buCompress(fl).then(function(d){ F.photos.push(d); }).catch(function(){}); }); });
      chain.then(function(){ renderBuForm(); });
    });
    mainView.querySelectorAll('[data-rm]').forEach(function(b){
      b.addEventListener('click', function(){ haptic('tap'); F.photos.splice(parseInt(b.getAttribute('data-rm'), 10), 1); renderBuForm(); });
    });

    $('buSend').addEventListener('click', function(){
      if (F.busy) return;
      if (F.photos.length < BU_MIN) { err(L("Kamida " + BU_MIN + " ta rasm yuklang","Загрузите минимум " + BU_MIN + " фото")); return; }
      if (!F.cat) { err(L("Texnika turini tanlang","Выберите тип техники")); return; }
      if (F.model.trim().length < 2) { err(L("Model nomini kiriting","Введите модель")); return; }
      if (F.yil && (parseInt(F.yil, 10) < 1980 || parseInt(F.yil, 10) > new Date().getFullYear() + 1)) { err(L("Yilni to'g'ri kiriting","Неверный год")); return; }
      if (F.telefon.replace(/\D/g, '').length < 9) { err(L("Telefon raqamini to'liq kiriting","Введите номер полностью")); return; }
      if (!F.viloyat) { err(L("Viloyatni tanlang","Выберите область")); return; }
      if (!F.tuman) { err(L("Tumanni tanlang","Выберите район")); return; }
      if (!F.narx.replace(/\D/g, '')) { err(L("Narxni kiriting","Введите цену")); return; }
      if (!getInitData()) { err(L("Iltimos, ilovani Telegram ichidan oching.","Откройте приложение внутри Telegram.")); return; }
      err(''); F.busy = true;
      var btn = $('buSend'); btn.disabled = true; btn.textContent = L("Yuborilmoqda...","Отправка...");
      apiPost('/api/public/bu/create', {
        init_data:getInitData(), lang:srvLang(), cat_id:F.cat, model:F.model.trim(), yil:F.yil || null, telefon:F.telefon.trim(),
        viloyat:F.viloyat, tuman:F.tuman, narx:F.narx.replace(/\D/g, ''), izoh:F.izoh.trim(), photos:F.photos
      }).then(function(res){
        F.busy = false;
        if (res.data && res.data.ok) { haptic('ok'); F.sent = true; F.photos = []; renderBuForm(); }
        else { btn.disabled = false; btn.textContent = '📨 ' + L("Yuborish","Отправить"); err((res.data && res.data.error) || t().orderErrGeneric); }
      }).catch(function(){
        F.busy = false; btn.disabled = false; btn.textContent = '📨 ' + L("Yuborish","Отправить"); err(t().orderErrGeneric);
      });
    });
  }

  function renderBuMy(){
    buInjectCss();
    mainView.innerHTML = '<div class="view mk-view"><div class="mk-title">📋 ' + L("Mening e'lonlarim","Мои объявления") + '</div><div class="bu-list" id="buMyList"><div class="mk-skel"></div></div></div>';
    var list = document.getElementById('buMyList');
    if (!getInitData()) { list.innerHTML = '<div class="bu-empty"><b>⚠️</b>' + L("Ilovani Telegram ichidan oching.","Откройте приложение внутри Telegram.") + '</div>'; return; }
    apiGet('/api/public/bu/my?init_data=' + encodeURIComponent(getInitData())).then(function(r){
      if (state.stack[state.stack.length-1].view !== 'marketBuMy') return;
      var items = (r && r.items) || [];
      if (!items.length) { list.innerHTML = '<div class="bu-empty"><b>📭</b>' + L("Sizda hali e'lon yo'q.","У вас пока нет объявлений.") + '</div>'; return; }
      var lab = { kutilmoqda:L("⏳ Tekshiruvda","⏳ На проверке"), tasdiqlandi:L("✅ Faol","✅ Активно"), rad:L("❌ Rad etilgan","❌ Отклонено") };
      list.innerHTML = items.map(function(it){
        var ph = (it.status === 'tasdiqlandi' && it.rasm_soni > 0) ? ' style="background-image:url(\'' + esc(buPhoto(it, 0)) + '\')"' : '';
        return '<div class="bu-card"><span class="bu-ph"' + ph + '>' + (ph ? '' : '🖼') + '</span><span class="bu-inf"><span class="bu-mdl">' + esc(it.model) + '</span>' +
          '<span class="bu-meta">' + esc(buCatName(it.cat_id)) + '</span><span><span class="bu-badge ' + esc(it.status) + '">' + (lab[it.status] || esc(it.status)) + '</span></span>' +
          '<span class="bu-prc">' + mkFmt(it.narx) + ' ' + L("so'm","сум") + '</span>' +
          '<button type="button" class="bu-del" data-del="' + it.id + '">🗑 ' + L("O'chirish (sotildi)","Удалить (продано)") + '</button></span></div>';
      }).join('');
      list.querySelectorAll('[data-del]').forEach(function(b){
        b.addEventListener('click', function(){
          if (!confirm(L("E'lonni o'chirasizmi?","Удалить объявление?"))) return;
          haptic('tap');
          apiPost('/api/public/bu/delete', { init_data:getInitData(), id:parseInt(b.getAttribute('data-del'), 10) }).then(function(){ renderBuMy(); });
        });
      });
    }).catch(function(){ list.innerHTML = '<div class="bu-empty"><b>⚠️</b>' + t().orderErrGeneric + '</div>'; });
  }

  // ---------- Til tanlagich (bayroqli ochiladigan menyu) ----------
  (function(){
    var sw = document.getElementById('langSw');
    var cur = document.getElementById('langCur');
    var menu = document.getElementById('langMenu');
    if (!sw || !cur || !menu) return;
    function paint(){
      var m = langMeta(state.lang);
      cur.innerHTML = '<span class="lang-flag">' + m.f + '</span><span class="car">▼</span>';
      cur.title = m.n;
      menu.innerHTML = LANGS.map(function(l){
        return '<button type="button" role="menuitem" class="lang-opt' + (l.c === state.lang ? ' active' : '') + '" data-lang="' + l.c + '">' +
          '<span class="lang-flag">' + l.f + '</span><span class="nm">' + l.n + '</span><span class="ck">✓</span></button>';
      }).join('');
      document.documentElement.setAttribute('lang', state.lang);
    }
    function setOpen(o){ sw.classList.toggle('open', o); cur.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    cur.addEventListener('click', function(e){ e.stopPropagation(); haptic('tap'); setOpen(!sw.classList.contains('open')); });
    menu.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('.lang-opt') : null;
      if (!b) return;
      e.stopPropagation();
      var c = b.getAttribute('data-lang');
      setOpen(false);
      if (c === state.lang) return;
      state.lang = c;
      try { localStorage.setItem('cynet_lang', c); } catch(_){}
      paint();
      document.getElementById('brandSub').textContent = t().subtitle;
      haptic('select');
      render();
    });
    document.addEventListener('click', function(){ setOpen(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') setOpen(false); });
    paint();
    document.getElementById('brandSub').textContent = t().subtitle;
  })();


  // ---------- Obunachilar chipi (bayroq ostida) + ixcham ob-havo + "Biz haqimizda" bo'limi ----------
  (function(){
    var st = document.createElement('style'); st.id = 'infoUiCss';
    st.textContent = [
      '.lang-sw{display:flex;flex-direction:column;align-items:center;gap:3px}',
      '.subs-chip{display:inline-flex;align-items:center;gap:3px;height:16px;padding:0 6px 0 4px;border-radius:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font:600 10px/1 var(--font-mono,monospace);color:var(--text-2,#9aa4b5);font-variant-numeric:tabular-nums;white-space:nowrap;animation:subs-in .6s .4s both}',
      '.subs-chip .si{font-size:10px;line-height:1;filter:saturate(1.2)}',
      '.subs-chip b{font-weight:700;color:var(--text,#fff);letter-spacing:.2px}',
      '.subs-chip::after{content:"";width:5px;height:5px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:lv-pulse 1.8s infinite}',
      '@keyframes subs-in{from{opacity:0;transform:translateY(-4px) scale(.9)}to{opacity:1;transform:none}}',
      /* ixcham ob-havo */
      '.wx-card.cmp{margin:0 0 10px;padding:8px 12px;border-radius:14px}',
      '.wx-card.cmp .wx-main{margin-top:4px;gap:9px}',
      '.wx-card.cmp .wx-ic{font-size:26px}',
      '.wx-card.cmp .wx-temp{font-size:26px}',
      '.wx-card.cmp .wx-temp sup{font-size:11px}',
      '.wx-card.cmp .wx-desc{gap:2px}',
      '.wx-card.cmp .wx-desc b{font-size:12.5px}',
      '.wx-card.cmp .wx-desc span{font-size:11px}',
      '.wx-card.cmp .wx-meta{margin-top:4px;font-size:11px;gap:10px}',
      '.wx-card.cmp .wx-top select,.wx-card.cmp .wx-loc{padding:4px 9px;font-size:11.5px;border-radius:9px}',
      '.wx-card.cmp .wx-ask{gap:9px;padding:0}',
      '.wx-card.cmp .wx-ask-ic{font-size:24px}',
      '.wx-card.cmp .wx-ask-tx b{font-size:13px}',
      '.wx-card.cmp .wx-ask-tx span{font-size:11px;line-height:1.25}',
      /* Biz haqimizda / Bog'lanish / Taklif */
      '.info-hero{display:flex;align-items:center;gap:14px;margin:2px 0 14px;animation:info-rise .6s cubic-bezier(.2,.9,.3,1) both}',
      '.info-orb{position:relative;flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:27px;background:linear-gradient(145deg,#ffb52e,#ff5fa8);box-shadow:0 8px 26px rgba(255,150,60,.4);animation:info-pop .8s .1s cubic-bezier(.2,1.4,.3,1) both}',
      '.info-orb span{position:relative;z-index:1;animation:info-bob 3s 1s ease-in-out infinite}',
      '.info-orb i{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,181,46,.6);animation:info-ring 2.4s ease-out infinite}',
      '.info-orb i:nth-child(2){animation-delay:1.2s}',
      '.info-ht{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.info-ht b{font:800 21px/1.1 var(--f-big,var(--font-display,inherit));background:linear-gradient(100deg,#fff 30%,#ffe2b0 65%,#ffb52e);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.info-ht span{font-size:12.5px;color:var(--text-2,#9aa4b5)}',
      '.info-tabs{position:relative;display:grid;grid-template-columns:repeat(3,1fr);padding:4px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid var(--border,rgba(255,255,255,.12));margin-bottom:14px;animation:info-rise .6s .12s cubic-bezier(.2,.9,.3,1) both}',
      '.info-tabs u{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/3);border-radius:12px;background:linear-gradient(135deg,#ffb52e,#ff8a3d);box-shadow:0 4px 16px rgba(255,150,60,.4);transition:transform .42s cubic-bezier(.3,1.3,.5,1);transform:translateX(calc(var(--i,0) * 100%));text-decoration:none}',
      '.info-tabs[data-i="0"] u{--i:0}.info-tabs[data-i="1"] u{--i:1}.info-tabs[data-i="2"] u{--i:2}',
      '.info-tabs button{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px 7px;background:none;border:0;color:var(--text-2,#9aa4b5);font:700 11.5px/1.1 var(--font-body,inherit);cursor:pointer;transition:color .25s;-webkit-tap-highlight-color:transparent}',
      '.info-tabs button em{font-style:normal;font-size:17px;line-height:1;transition:transform .3s}',
      '.info-tabs button.on{color:#1d0f02}',
      '.info-tabs button.on em{transform:scale(1.18) translateY(-1px)}',
      '.info-tabs button span{white-space:nowrap}',
      '.info-body.swap .view>*{animation:info-rise .5s cubic-bezier(.2,.9,.3,1) both}',
      '.info-body.swap .view>*:nth-child(2){animation-delay:.08s}.info-body.swap .view>*:nth-child(3){animation-delay:.16s}.info-body.swap .view>*:nth-child(4){animation-delay:.24s}',
      '.info-body .detail-head{display:none}',
      '.info-body .view{padding:0}',
      '.info-body .panel{border-radius:16px}',
      '@keyframes info-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
      '@keyframes info-pop{from{opacity:0;transform:scale(.3) rotate(-30deg)}to{opacity:1;transform:none}}',
      '@keyframes info-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px) rotate(-5deg)}}',
      '@keyframes info-ring{from{transform:scale(1);opacity:.7}to{transform:scale(1.7);opacity:0}}',
      '@media (prefers-reduced-motion:reduce){.info-hero,.info-tabs,.info-orb,.info-orb span,.info-orb i,.info-body.swap .view>*,.subs-chip{animation:none!important}.info-tabs u{transition:none}}'
    ].join('\n');
    document.head.appendChild(st);
    var sw = document.getElementById('langSw');
    if (sw && !document.getElementById('subsChip')) {
      var c = document.createElement('div'); c.className = 'subs-chip'; c.id = 'subsChip';
      c.title = 'Obunachilar / Подписчики';
      c.innerHTML = '<span class="si">👥</span><b id="subsNum">—</b>';
      sw.appendChild(c);
      lvStart();
    }
  })();

  render();
  mkResumePending(false);
  (function(){
    if (mkQuery('go') !== 'market') return;
    try { history.replaceState(null, '', location.pathname); } catch(e){}
    var tp = state.stack[state.stack.length - 1] || {};
    if (tp.view === 'oferta') return;
    mkGoHomeMarket();
  })();
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) mkResumePending(true); });
})();
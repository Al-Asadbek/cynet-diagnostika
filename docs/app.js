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
    }
  };

  var state = {
    lang: localStorage.getItem('cynet_lang') || 'uz',
    stack: [{ view:'home' }]  // navigation stack
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
    state.stack = [{ view:'home' }];
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
    if (entry.view === 'home') return t().home;
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
    return null;
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

    if (entry.view === 'home') renderHome();
    else if (entry.view === 'category') renderCategory(entry);
    else if (entry.view === 'printerType') renderPrinterType(entry);
    else if (entry.view === 'brand') renderBrand(entry);
    else if (entry.view === 'brandCodesList') renderBrandCodesList(entry);
    else if (entry.view === 'codesBrand') renderCodesBrand(entry);
    else if (entry.view === 'issue') renderIssue(entry);
  }

  // init lang buttons to reflect stored pref
  document.querySelectorAll('.lang-toggle button').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-lang') === state.lang);
  });
  document.getElementById('brandSub').textContent = t().subtitle;

  render();
})();

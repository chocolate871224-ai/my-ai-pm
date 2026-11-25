/**
 * Wen's 工作台 · 貝果資料庫
 * Bound to the spreadsheet「Wen's 工作台 · 貝果資料庫」. The spreadsheet is the database:
 * each tab is one table, row 1 is the header. The web page (Index.html) calls getState / saveState.
 */
var SHEETS = {items: '品項', orders: '訂單', eaten: '吃掉紀錄', cats: '分類', sources: '來源', brands: '品牌'};
var COLS = {
  items:   [['id','id'],['name','品名'],['brand','店家'],['qty','剩幾顆'],['cat','分類'],['guess','分類是猜的'],['status','階段'],['order','訂單'],['home','放哪個冷凍庫'],['price','單價'],['added','放進冷凍庫日']],
  orders:  [['id','id'],['source','來源'],['seller','賣家'],['date','出貨日'],['pickup','取貨方式'],['plan','預計放'],['arrived','已到店'],['arrivedOn','到店日'],['platform','平台'],['fee','運費']],
  eaten:   [['d','日期'],['n','品名'],['b','店家'],['per','吃了多少'],['id','品項id'],['r','星等'],['note','心得'],['gift','送出'],['rebuy','回購'],['cat','分類'],['photo','照片']],
  cats:    [['id','id'],['label','名稱'],['emoji','emoji'],['color','顏色'],['per','一天的量'],['unit','單位']],
  sources: [['id','id'],['label','名稱'],['emoji','emoji']],
  brands:  [['name','品牌'],['ig','IG 帳號'],['url','網站'],['logo','logo']]
};
var NUM = {qty: 1, price: 1, per: 1, r: 1, fee: 1};
var BOOL = {guess: 1, arrived: 1, gift: 1};
var STATUS_ZH = {making: '製作中', shipping: '已抵達', arrived: '已抵達', fridge: '冷凍庫', done: '吃完'};
var STATUS_ID = {'製作中': 'making', '運送中': 'shipping', '已抵達': 'shipping', '冷凍庫': 'fridge', '吃完': 'done'};

/* The page and the first-run data live as files in Google Drive, so Claude can update the page
   without anyone pasting code or redeploying: to ship a new page, upload a new file with PAGE_TITLE;
   the newest one wins. seed.json = data copied from the old workspace, used once. */
var PAGE_TITLE = "Wen's 工作台 · 網頁（Index.html）";
var PAGE_FILE_ID = '1I7bRz-WRPyn9V5brmXII2vDFECXXseYM'; // fallback if no file with PAGE_TITLE is found
/* the newest page file id is remembered for 5 minutes, so opening the page skips the Drive search; ?fresh=1 skips the memory */
function pageHtml_(fresh) {
  var cache = CacheService.getScriptCache(), id = fresh ? null : cache.get('pageId');
  if (id) { try { return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'); } catch (e) {} }
  var it = DriveApp.getFilesByName(PAGE_TITLE), best = null;
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    if (!best || f.getDateCreated() > best.getDateCreated()) best = f;
  }
  best = best || DriveApp.getFileById(PAGE_FILE_ID);
  cache.put('pageId', best.getId(), 300);
  return best.getBlob().getDataAsString('UTF-8');
}
var SEED_FILE_ID = '1_aAi5_aFdY7Lf6YqULnJlj2p66zqSb4N';
function seed_() { return JSON.parse(DriveApp.getFileById(SEED_FILE_ID).getBlob().getDataAsString('UTF-8')); }

function doGet(e) {
  return HtmlService.createHtmlOutput(pageHtml_(e && e.parameter && e.parameter.fresh))
    .setTitle("Wen's 工作台")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ---------- read ---------- */
function getState() {
  ensureSheets_();
  var s = {v: 1};
  Object.keys(SHEETS).forEach(function (k) { s[k] = readTable_(k); });
  var orders = {};
  s.orders.forEach(function (o) { orders[o.id] = o; });
  s.orders = orders;
  var sources = {};
  s.sources.forEach(function (x) { sources[x.id] = {label: x.label, emoji: x.emoji}; });
  s.sources = sources;
  var brands = {};
  s.brands.forEach(function (x) { if (x.name) brands[x.name] = {ig: x.ig, url: x.url, logo: x.logo}; });
  s.brands = brands;
  var fix = function (b) { return /^yolon$/i.test(b || '') ? 'Yolan' : b; };
  s.items.forEach(function (it) { it.brand = fix(it.brand); });
  s.eaten.forEach(function (e) { e.b = fix(e.b); });
  return s;
}

function readTable_(key) {
  var sh = sheet_(key), cols = COLS[key], n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var rows = sh.getRange(2, 1, n, cols.length).getDisplayValues();
  return rows.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {};
    cols.forEach(function (c, i) {
      var f = c[0], v = r[i];
      if (NUM[f]) v = v === '' ? 0 : Number(v);
      else if (BOOL[f]) v = v === 'TRUE' || v === '是' || v === 'true';
      else if (f === 'status') v = STATUS_ID[v] || v;
      else if ((f === 'date' || f === 'home' || f === 'order' || f === 'arrivedOn') && v === '') v = null;
      o[f] = v;
    });
    return o;
  });
}

/* ---------- write ---------- */
function saveState(state) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    if (typeof state === 'string') state = JSON.parse(state);
    // a page that loaded nothing must never blank a tab that still has bagels in it
    if (!(state.items || []).length && sheet_('items').getLastRow() > 1) throw new Error('refused: page sent 0 items but the sheet still has items');
    var orders = Object.keys(state.orders || {}).map(function (k) { var o = state.orders[k]; o.id = o.id || k; return o; });
    var sources = Object.keys(state.sources || {}).filter(function (k) { return k; })
      .map(function (k) { return {id: k, label: state.sources[k].label, emoji: state.sources[k].emoji}; });
    writeTable_('items', state.items || []);
    writeTable_('orders', orders);
    writeTable_('eaten', state.eaten || []);
    writeTable_('cats', state.cats || []);
    writeTable_('sources', sources);
    var brands = Object.keys(state.brands || {}).filter(function (k) { return k; })
      .map(function (k) { var b = state.brands[k] || {}; return {name: k, ig: b.ig || '', url: b.url || '', logo: b.logo || ''}; });
    if (brands.length) writeTable_('brands', brands);
    return {ok: true, at: new Date().toISOString()};
  } finally {
    lock.releaseLock();
  }
}

/* Safe write: never clear first. Keep a copy of the old rows, write the new rows over them,
   then blank only the leftover rows. If anything fails, put the old rows back and rethrow,
   so a failed save can never leave a tab empty. */
function writeTable_(key, list) {
  var sh = sheet_(key), cols = COLS[key], old = Math.max(0, sh.getLastRow() - 1);
  var backup = old ? sh.getRange(2, 1, old, cols.length).getValues() : [];
  var rows = list.map(function (o) {
    return cols.map(function (c) {
      var f = c[0], v = o[f];
      if (v === null || v === undefined) return '';
      if (BOOL[f]) return v ? '是' : '';
      if (f === 'status') return STATUS_ZH[v] || v;
      return String(v);
    });
  });
  try {
    if (rows.length) {
      var rg = sh.getRange(2, 1, rows.length, cols.length);
      try { rg.setNumberFormat('@'); SpreadsheetApp.flush(); } catch (e) {} // typed columns (Sheets tables) refuse number formats; Sheets defers the error, so flush here to catch it and keep going
      rg.setValues(rows);
    }
    if (old > rows.length) sh.getRange(2 + rows.length, 1, old - rows.length, cols.length).clearContent();
  } catch (err) {
    if (backup.length) sh.getRange(2, 1, backup.length, cols.length).setValues(backup);
    throw err;
  }
}

/* ---------- 進貨單圖片 → 雲端硬碟 ---------- */
var RECEIPT_FOLDER = "Wen's 工作台 · 進貨單";
function saveReceipt(dataUrl, name) {
  var m = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('不是 PNG 圖片');
  var it = DriveApp.getFoldersByName(RECEIPT_FOLDER), folder = it.hasNext() ? it.next() : DriveApp.createFolder(RECEIPT_FOLDER);
  var safe = String(name || 'receipt.png').replace(/[\\\/:*?"<>|]+/g, '');
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', safe));
  return {id: f.getId(), url: f.getUrl(), name: safe};
}

/* ---------- tabs ---------- */
function sheet_(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEETS[key]) || makeSheet_(ss, key);
}

function makeSheet_(ss, key) {
  var sh = ss.insertSheet(SHEETS[key]);
  sh.getRange(1, 1, 1, COLS[key].length).setValues([COLS[key].map(function (c) { return c[1]; })]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

/* columns added later (e.g. 訂單 → 平台) get their header written into row 1 */
function fillHeaders_(key) {
  try {
    var sh = sheet_(key), cols = COLS[key], head = sh.getRange(1, 1, 1, cols.length).getDisplayValues()[0];
    cols.forEach(function (c, i) { if (head[i] === '' || (c[0] === 'price' && head[i] === '價格')) sh.getRange(1, i + 1).setValue(c[1]); });
    SpreadsheetApp.flush();
  } catch (e) {}
}

/* if 品項 → 階段 is a dropdown, make sure it accepts 已抵達 */
function allowStatus_() {
  try {
    var sh = sheet_('items'), col = 1 + COLS.items.map(function (c) { return c[0]; }).indexOf('status');
    var rg = sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1), rule = rg.getDataValidation();
    if (!rule || rule.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return;
    var v = rule.getCriteriaValues(), list = v[0];
    if (list.indexOf('已抵達') < 0) { rg.setDataValidation(rule.copy().requireValueInList(list.concat(['已抵達']), v[1]).build()); SpreadsheetApp.flush(); }
  } catch (e) {}
}

/* checking every tab and header costs a few seconds, so it runs at most once every 6 hours per schema version */
var SCHEMA_V = 'v12';
function ensureSheets_(force) {
  var cache = CacheService.getScriptCache();
  if (!force && cache.get('sheetsOk') === SCHEMA_V) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fresh = !ss.getSheetByName(SHEETS.items);
  Object.keys(SHEETS).forEach(function (k) { sheet_(k); fillHeaders_(k); });
  allowStatus_();
  ss.getSheets().forEach(function (sh) {
    var n = sh.getName();
    if ((n === '工作表1' || n === 'Sheet1') && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  var props = PropertiesService.getDocumentProperties();
  if (fresh && !props.getProperty('seeded')) {
    saveState(seed_());
    props.setProperty('seeded', new Date().toISOString());
  }
  cache.put('sheetsOk', SCHEMA_V, 21600);
}

/* ---------- 行程日曆 (Google Calendar) ---------- */
// k = key the page uses for colour; w = the page may add events to it
var CALS = [
  {id: 'iamsyuanyu.chen@gmail.com', k: 'work', label: '💼 Work', w: 1},
  {id: 'chocolate871224@gmail.com', k: 'me', label: '個人', w: 1},
  {id: 'zh.taiwan#holiday@group.v.calendar.google.com', k: 'holiday', label: '節假日', w: 0}
];
function calIso_(d) { return Utilities.formatDate(d, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm"); }
/* every calendar this account can see: the named ones in CALS first, then everything else in its
   calendar list (subscribed / shared calendars show up automatically once added to the list) */
function calList_() {
  var seen = {}, list = [];
  function add(cal, def) {
    var id = cal.getId();
    if (seen[id] || cal.isHidden && cal.isHidden()) return;
    seen[id] = 1;
    var col = '';
    try { col = cal.getColor() || ''; } catch (e) { col = ''; }
    var own = false;
    try { own = cal.isOwnedByMe(); } catch (e) { own = false; }
    var name = def ? def.label : cal.getName();
    list.push({cal: cal, id: id, k: def ? def.k : 'x' + list.length, label: name, w: def ? def.w : (own ? 1 : 0), color: col,
      live: /LIVE王/i.test(name) ? (/售票/.test(name) ? 'tix' : 'show') : ''});
  }
  CALS.forEach(function (c) {
    var cal = null;
    try { cal = CalendarApp.getCalendarById(c.id); } catch (e) { cal = null; }
    if (cal) add(cal, c);
  });
  var all = [];
  try { all = CalendarApp.getAllCalendars(); } catch (e) { all = []; }
  all.forEach(function (cal) { add(cal, null); });
  return list;
}
function calUrl_(e) {
  var t = '';
  try { t = (e.getDescription() || '') + ' ' + (e.getLocation() || ''); } catch (x) { t = ''; }
  var m = t.match(/https?:\/\/[^\s"'<>）)]+/);
  return m ? m[0].replace(/&amp;/g, '&') : '';
}
function calEv_(e, c) {
  return {t: e.getTitle(), s: calIso_(e.getStartTime()), e: calIso_(e.getEndTime()), all: e.isAllDayEvent(), k: c.k, loc: e.getLocation() || '', url: calUrl_(e), note: calNote_(e)};
}
/* event description for the hover card: plain text, first 300 characters */
function calNote_(e) {
  var d = '';
  try { d = e.getDescription() || ''; } catch (x) { return ''; }
  return d.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim().slice(0, 300);
}
function calInfo_(c) { return {k: c.k, label: c.label, id: c.id, w: c.w, color: c.color, live: c.live}; }
/* events of one month (y, m = 1-12), plus a week either side so the grid edges fill in */
function getEvents(y, m) {
  var start = new Date(y, m - 1, 1), end = new Date(y, m, 1);
  start.setDate(start.getDate() - 7); end.setDate(end.getDate() + 7);
  var out = [], cals = [];
  calList_().forEach(function (c) {
    var evs = [];
    try { evs = c.cal.getEvents(start, end); } catch (e) { return; }
    cals.push(calInfo_(c));
    evs.forEach(function (e) { out.push(calEv_(e, c)); });
  });
  return {events: out, cals: cals};
}
/* 近期節目: LIVE王 calendars from today on (default 90 days) */
function getUpcoming(days) {
  var start = new Date(); start.setHours(0, 0, 0, 0);
  var end = new Date(start); end.setDate(end.getDate() + (+days || 90));
  var out = [];
  calList_().forEach(function (c) {
    if (!c.live) return;
    var evs = [];
    try { evs = c.cal.getEvents(start, end); } catch (e) { return; }
    evs.forEach(function (e) { var o = calEv_(e, c); o.g = c.live; out.push(o); });
  });
  out.sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
  return {events: out};
}
/* o = {title, date: 'yyyy-MM-dd', time: 'HH:mm' or '', mins, cal} */
function addEvent(o) {
  var title = String(o && o.title || '').trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(o.date || '')) throw new Error('需要標題和日期');
  var c = calList_().filter(function (x) { return x.id === o.cal && x.w; })[0];
  var cal = c ? c.cal : CalendarApp.getCalendarById(CALS[0].id);
  if (!cal) throw new Error('找不到這個日曆');
  var p = o.date.split('-'), ev;
  if (o.time && /^\d{2}:\d{2}$/.test(o.time)) {
    var t = o.time.split(':'), st = new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]);
    ev = cal.createEvent(title, st, new Date(st.getTime() + (+o.mins || 60) * 60000));
  } else {
    ev = cal.createAllDayEvent(title, new Date(+p[0], +p[1] - 1, +p[2]));
  }
  return {ok: true, id: ev.getId()};
}
/* run once from the editor to approve calendar access */
function authorizeCalendar() { var d = new Date(); return getEvents(d.getFullYear(), d.getMonth() + 1).events.length; }

/* run from the editor: shows why each calendar in CALS can or cannot be read */
function checkCalendars() {
  try { var d = CalendarApp.getDefaultCalendar(); Logger.log('預設日曆：' + d.getId() + '（' + d.getName() + '）'); } catch (e) { Logger.log('預設日曆錯誤：' + e.message); }
  CALS.forEach(function (c) {
    try {
      var cal = CalendarApp.getCalendarById(c.id);
      if (!cal) { Logger.log(c.label + '（' + c.id + '）：找不到（沒有分享給這個帳號，或沒有加進日曆清單）'); return; }
      var n = cal.getEvents(new Date(2026, 10, 1), new Date(2026, 11, 1)).length;
      Logger.log(c.label + '（' + c.id + '）：讀得到，11 月有 ' + n + ' 個行程');
    } catch (e) { Logger.log(c.label + '（' + c.id + '）錯誤：' + e.message); }
  });
  try { Logger.log('這個帳號看得到的日曆：' + CalendarApp.getAllCalendars().map(function (x) { return x.getName() + ' = ' + x.getId(); }).join('；')); } catch (e) { Logger.log('列日曆錯誤：' + e.message); }
  var r = getEvents(2026, 11);
  Logger.log('getEvents(2026, 11)：' + r.cals.length + ' 個日曆、' + r.events.length + ' 個行程');
}

/* =====================================================================
 * 待辦・信件建議・工作日誌（2026-11-25）
 * Same spreadsheet, three more tabs. The page calls getDesk / saveDesk / setMailState / scanMail / compileWorklog.
 * Mail is read only: nothing here marks mail as read, archives, labels or replies.
 * Run setupDesk once from the editor: it asks for Gmail + trigger permission, then checks mail every 30 minutes
 * and compiles the work log every night at 23:00.
 * ===================================================================== */
SHEETS.todos = '待辦'; SHEETS.mails = '信件建議'; SHEETS.worklog = '工作日誌';
COLS.todos = [['id','id'],['t','待辦'],['due','期限'],['cat','分類'],['src','來源'],['mail','信件id'],['done','完成日']];
COLS.mails = [['id','id'],['from','寄件人'],['subj','主旨'],['d','日期'],['sum','摘要'],['sug','建議待辦'],['due','建議期限'],['cat','分類'],['st','狀態'],['cal','行事曆'],['why','備註'],['unread','未讀'],['cc','副本'],['url','連結']];
COLS.worklog = [['d','日期'],['s','狀態'],['t','內容'],['src','來源'],['key','自動key'],['edited','改過'],['hide','刪除']];
BOOL.unread = 1; BOOL.cc = 1; BOOL.edited = 1; BOOL.hide = 1;
var DESK_SEED = {"todos":[{"id":"t1","t":"貼上工作台新版後台（Code.gs）＋部署新版本","due":"2026-11-25","cat":"專案","src":"me","mail":"","done":""},{"id":"t2","t":"取崧鹿家麵包（蛋黃酥 ×10，11:00–19:00 自取）","due":"2026-11-26","cat":"生活","src":"cal","mail":"","done":""},{"id":"t3","t":"自取來口貝果（已付款，按門鈴報姓名）","due":"2026-11-27","cat":"生活","src":"cal","mail":"","done":""},{"id":"t4","t":"準備穩立企業二面（12/4 14:30・南港）","due":"2026-12-03","cat":"求職","src":"mail","mail":"","done":""},{"id":"t5","t":"CAPSULE 業務夥伴職缺投遞（研究報告已做好）","due":"","cat":"求職","src":"me","mail":"","done":""},{"id":"t6","t":"LINE 小助理貼上 forecast patch","due":"","cat":"專案","src":"me","mail":"","done":""},{"id":"d1","t":"回覆子皿：確認入帳 3,648 元","due":"2026-11-24","cat":"工作","src":"mail","mail":"","done":"2026-11-24"},{"id":"d2","t":"回傳穩立「人員資料表」Excel","due":"2026-11-16","cat":"求職","src":"mail","mail":"","done":"2026-11-13"}],"worklog":[{"d":"2026-11-25","s":"完成","t":"貝果頁 v5 上線：物理冷凍庫、心得筆記本、品牌 logo、進貨單存雲端","src":"desk","key":"","edited":false,"hide":false},{"d":"2026-11-25","s":"完成","t":"修好提示框不會消失、YOLON 改 Yolan","src":"desk","key":"","edited":false,"hide":false},{"d":"2026-11-24","s":"完成","t":"CAPSULE 面試功課（公司研究＋面試準備報告）","src":"me","key":"","edited":false,"hide":false},{"d":"2026-11-24","s":"完成","t":"回覆子皿：確認入帳 3,648 元","src":"mail","key":"","edited":false,"hide":false},{"d":"2026-11-24","s":"完成","t":"貝果頁新互動示意（冷凍庫、訂單卡、筆記本）","src":"desk","key":"","edited":false,"hide":false},{"d":"2026-11-24","s":"完成","t":"打給雞老二改時間","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-23","s":"完成","t":"工作台改用 Google 試算表當資料庫（部署第 7 版）","src":"desk","key":"","edited":false,"hide":false},{"d":"2026-11-23","s":"完成","t":"行程日曆接上 Google 日曆","src":"desk","key":"","edited":false,"hide":false},{"d":"2026-11-19","s":"完成","t":"Ticket & Seat 系統（Apps Script 第 29 版）","src":"desk","key":"","edited":false,"hide":false},{"d":"2026-11-19","s":"完成","t":"NTSO 交響派對結案封存","src":"me","key":"","edited":false,"hide":false},{"d":"2026-11-18","s":"完成","t":"LINE 小助理雙向版安裝","src":"me","key":"","edited":false,"hide":false},{"d":"2026-11-18","s":"延後","t":"LINE 小助理貼 forecast patch","src":"me","key":"","edited":false,"hide":false},{"d":"2026-11-17","s":"完成","t":"穩立企業面試（演唱會／展演活動專案執行）","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-13","s":"完成","t":"回傳穩立「人員資料表」","src":"mail","key":"","edited":false,"hide":false},{"d":"2026-11-13","s":"完成","t":"應徵 FREES「專案行政助理」","src":"mail","key":"","edited":false,"hide":false},{"d":"2026-11-12","s":"完成","t":"三創生活面試（展演空間場務人員）","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-09","s":"完成","t":"寄出三創「應徵資料表」Word 檔","src":"mail","key":"","edited":false,"hide":false},{"d":"2026-11-07","s":"完成","t":"NTSO 交響派對 演出日進場・跳彩・正式演出","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-06","s":"完成","t":"NTSO 交響派對 總彩排","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-06","s":"完成","t":"回覆三創面試邀約","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-05","s":"完成","t":"NTSO 交響派對 團練 Day2（台中霧峰）","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-04","s":"完成","t":"NTSO 交響派對 團練 Day1（台中霧峰）","src":"cal","key":"","edited":false,"hide":false},{"d":"2026-11-03","s":"完成","t":"回覆子皿：金音獎報價與建檔資料","src":"mail","key":"","edited":false,"hide":false}]};
var TZ = 'Asia/Taipei';

function getDesk() {
  ensureSheets_();
  var p = PropertiesService.getDocumentProperties();
  if (!p.getProperty('deskSeeded')) {
    if (!readTable_('todos').length) writeTable_('todos', DESK_SEED.todos);
    if (!readTable_('worklog').length) writeTable_('worklog', DESK_SEED.worklog);
    p.setProperty('deskSeeded', new Date().toISOString());
  }
  return {todos: readTable_('todos'), mails: readTable_('mails'), worklog: readTable_('worklog'),
    meta: {lastScan: p.getProperty('lastScan') || '', auto: deskAuto_()}};
}
function deskAuto_() {
  try { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'scanMail'; }); } catch (e) { return false; }
}

function saveDesk(json) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var s = typeof json === 'string' ? JSON.parse(json) : json;
    // same safety as the bagel tabs: a page that loaded nothing must never blank a full tab
    if (s.todos && !s.todos.length && sheet_('todos').getLastRow() > 4) throw new Error('refused: page sent 0 todos');
    if (s.worklog && !s.worklog.length && sheet_('worklog').getLastRow() > 4) throw new Error('refused: page sent 0 work log rows');
    if (s.todos) writeTable_('todos', s.todos);
    if (s.worklog) writeTable_('worklog', s.worklog);
    return {ok: true};
  } finally { lock.releaseLock(); }
}

function setMailState(id, st) {
  if (st === undefined && String(id).indexOf('|') > 0) { var q = String(id).split('|'); id = q[0]; st = q[1]; }
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var list = readTable_('mails');
    list.forEach(function (m) { if (m.id === id) { m.st = st; if (st === 'new') m.why = ''; } });
    writeTable_('mails', list);
    return {ok: true};
  } finally { lock.releaseLock(); }
}

/* ---------- 看信 ---------- */
var MAIL_SKIP = /Daily Forecast|商務英文|電子報|newsletter|unsubscribe|取消訂閱|廣告|優惠|折扣/i;
var MAIL_NOREPLY = /no-?reply|do-?not-?reply|notification|notify|mailer|newsletter|news@|service@|info@|support@/i;
var MAIL_KEY = /面試|邀約|邀請|請於|截止|期限|回覆|回信|確認|報價|合約|簽約|付款|匯款|入帳|繳費|發票|deadline|due|RSVP|請協助|麻煩您|麻煩你/i;
function addr_(s) { var m = /<([^>]+)>/.exec(s || ''); var a = (m ? m[1] : s || '').trim().toLowerCase(); var p = a.split('@'); return p[1] === 'gmail.com' ? p[0].replace(/\./g, '') + '@gmail.com' : a; }
function isMe_(from, me) { return addr_(from) === addr_(me); }
function fromName_(s) { var m = /^\s*"?([^"<]+?)"?\s*</.exec(s || ''); return m ? m[1].trim() : (s || '').replace(/@.*/, '').trim(); }
function cleanSubj_(s) { return String(s || '').replace(/^\s*((re|fwd?|回覆|轉寄)\s*[:：]\s*)+/i, '').trim(); }
function cut_(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function summary_(body) { return cut_(String(body || '').replace(/\s+/g, ' ').replace(/^(dear|hi|hello|您好|你好|嗨)[^，,。 ]*[，,。 ]*/i, '').trim(), 90); }
function sugText_(subj, name, text) {
  var s = cut_(cleanSubj_(subj), 28);
  if (/面試/.test(text)) return '回覆／準備面試：' + s;
  if (/付款|繳費|匯款|發票/.test(text)) return '處理付款：' + s;
  if (/確認|回覆|回信|報價|合約|簽約/.test(text)) return '回覆 ' + cut_(name, 10) + '：' + s;
  return '看一下 ' + cut_(name, 10) + ' 的信：' + s;
}
function dueFrom_(text, base) {
  var m = /(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?\s*(?:[（(][^）)]{1,4}[）)])?\s*(?:前|之前|以前|截止|內)/.exec(text || '');
  if (!m) return '';
  var d = new Date(base.getFullYear(), +m[1] - 1, +m[2]);
  if (d < new Date(base.getTime() - 30 * 864e5)) d.setFullYear(d.getFullYear() + 1);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}
function deskUpcoming_() {
  var out = [], now = new Date(), end = new Date(now.getTime() + 45 * 864e5);
  try {
    calList_().forEach(function (c) {
      if (!c.w || c.live) return;
      c.cal.getEvents(now, end).forEach(function (e) { out.push({t: e.getTitle(), s: e.getStartTime(), all: e.isAllDayEvent()}); });
    });
  } catch (e) {}
  return out;
}
function calMatch_(subj, name, ups) {
  var toks = [], m, re = /【([^】]+)】/g;
  while ((m = re.exec(subj))) toks.push(m[1]);
  toks.push(name);
  toks = toks.map(function (t) { return String(t || '').replace(/(股份)?有限公司|企業|公司|・.*$/g, '').trim(); }).filter(function (t) { return t.length >= 2; });
  for (var i = 0; i < ups.length; i++) for (var j = 0; j < toks.length; j++) if (ups[i].t.indexOf(toks[j]) >= 0) {
    var d = ups[i].s;
    return '行事曆已有：' + Utilities.formatDate(d, TZ, 'M/d') + '（' + '日一二三四五六'.charAt(+Utilities.formatDate(d, TZ, 'u') % 7) + '）' + (ups[i].all ? '' : Utilities.formatDate(d, TZ, 'HH:mm') + ' ') + ups[i].t;
  }
  return '';
}
function scanMail() {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    ensureSheets_();
    var me = Session.getEffectiveUser().getEmail();
    var old = readTable_('mails'), byId = {};
    old.forEach(function (m) { byId[m.id] = m; });
    var ups = deskUpcoming_();
    GmailApp.search('in:inbox newer_than:14d -category:promotions -category:social -category:forums', 0, 60).forEach(function (th) {
      var id = th.getId(), msgs = th.getMessages(), last = msgs[msgs.length - 1], lastMine = isMe_(last.getFrom(), me);
      var inc = msgs.filter(function (x) { return !isMe_(x.getFrom(), me); });
      if (!inc.length) return;
      var m = inc[inc.length - 1], subj = th.getFirstMessageSubject() || '', from = m.getFrom(), name = fromName_(from);
      if (MAIL_SKIP.test(subj) || MAIL_SKIP.test(name)) return;
      var body = m.getPlainBody() || '', text = subj + ' ' + body.slice(0, 1500);
      var ex = byId[id];
      if (ex) { ex.unread = th.isUnread(); if (lastMine && ex.st === 'new') { ex.st = 'done'; ex.why = '你已回信'; } return; }
      if (!MAIL_KEY.test(text) && MAIL_NOREPLY.test(from)) return;
      var to = m.getTo() || '', cc = m.getCc() || '';
      byId[id] = {id: id, from: name, subj: cleanSubj_(subj), d: Utilities.formatDate(m.getDate(), TZ, 'yyyy-MM-dd'), sum: summary_(body),
        sug: sugText_(subj, name, text), due: dueFrom_(text, m.getDate()), cat: /面試|履歷|應徵|職缺|人力銀行|徵才|求職/.test(text) ? '求職' : '工作',
        st: lastMine ? 'done' : 'new', cal: calMatch_(subj, name, ups), why: lastMine ? '你已回信' : '', unread: th.isUnread(),
        cc: addr_(cc).indexOf(addr_(me)) >= 0 || (cc.toLowerCase().indexOf(addr_(me).split('@')[0]) >= 0 && to.toLowerCase().indexOf(addr_(me).split('@')[0]) < 0), url: th.getPermalink()};
    });
    var list = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }).slice(0, 80);
    writeTable_('mails', list);
    PropertiesService.getDocumentProperties().setProperty('lastScan', Utilities.formatDate(new Date(), TZ, 'M/d HH:mm'));
  } finally { lock.releaseLock(); }
  return getDesk();
}

/* ---------- 工作日誌：從行事曆＋寄出的信彙整（改過或刪掉的不會被蓋回來） ---------- */
var WL_SKIP = /健身|晚餐|午餐|早餐|cafe|咖啡|聚餐|直播|迷信|Reservation|鍋物|鼎泰豐|高鐵|飯店|check ?(in|out)|🚗|🚄|🏨/i;
function compileWorklog(days) {
  days = Math.max(1, Math.min(31, +days || 1));
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    ensureSheets_();
    var rows = readTable_('worklog'), keys = {}, now = new Date(), me = Session.getEffectiveUser().getEmail();
    rows.forEach(function (r) { if (r.key) keys[r.key] = 1; });
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)), day = function (d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };
    calList_().forEach(function (c) {
      if (!c.w || c.live) return;
      c.cal.getEvents(start, now).forEach(function (e) {
        var t = e.getTitle(), d = day(e.getStartTime()), key = 'cal:' + e.getId() + ':' + d;
        if (keys[key] || WL_SKIP.test(t) || e.getEndTime() > now) return;
        rows.push({d: d, s: '完成', t: t, src: 'cal', key: key}); keys[key] = 1;
      });
    });
    GmailApp.search('in:sent after:' + Utilities.formatDate(start, TZ, 'yyyy/MM/dd'), 0, 60).forEach(function (th) {
      th.getMessages().forEach(function (m) {
        if (!isMe_(m.getFrom(), me) || m.getDate() < start) return;
        var subj = cleanSubj_(m.getSubject()), key = 'mail:' + m.getId();
        if (keys[key] || MAIL_SKIP.test(subj) || addr_(m.getTo()) === addr_(me)) return;
        rows.push({d: day(m.getDate()), s: '完成', t: '寄信給 ' + cut_(fromName_(m.getTo().split(',')[0]), 12) + '：' + cut_(subj, 40), src: 'mail', key: key}); keys[key] = 1;
      });
    });
    rows.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
    writeTable_('worklog', rows);
  } finally { lock.releaseLock(); }
  return getDesk();
}
function nightlyWorklog() { compileWorklog(1); }

/* run once from the editor: approve Gmail + triggers, start the 30-minute mail check and the 23:00 work log */
function setupDesk() {
  ensureSheets_(true);
  getDesk(); // creates every tab (品牌／待辦／信件建議／工作日誌) and seeds to-dos + work log right away
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['scanMail', 'nightlyWorklog'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('scanMail').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('nightlyWorklog').timeBased().atHour(23).everyDays(1).inTimezone(TZ).create();
  var r = scanMail();
  Logger.log('好了：信件建議 ' + r.mails.length + ' 封，之後每 30 分鐘看一次信、每晚 23:00 彙整工作日誌');
}

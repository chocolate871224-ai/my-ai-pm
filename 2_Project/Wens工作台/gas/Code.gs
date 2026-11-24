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
function pageHtml_() {
  var it = DriveApp.getFilesByName(PAGE_TITLE), best = null;
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    if (!best || f.getDateCreated() > best.getDateCreated()) best = f;
  }
  return (best || DriveApp.getFileById(PAGE_FILE_ID)).getBlob().getDataAsString('UTF-8');
}
var SEED_FILE_ID = '1_aAi5_aFdY7Lf6YqULnJlj2p66zqSb4N';
function seed_() { return JSON.parse(DriveApp.getFileById(SEED_FILE_ID).getBlob().getDataAsString('UTF-8')); }

function doGet() {
  ensureSheets_();
  return HtmlService.createHtmlOutput(pageHtml_())
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

function ensureSheets_() {
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
  return {t: e.getTitle(), s: calIso_(e.getStartTime()), e: calIso_(e.getEndTime()), all: e.isAllDayEvent(), k: c.k, loc: e.getLocation() || '', url: calUrl_(e)};
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

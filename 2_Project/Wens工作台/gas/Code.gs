/**
 * Wen's 工作台 · 貝果資料庫
 * Bound to the spreadsheet「Wen's 工作台 · 貝果資料庫」. The spreadsheet is the database:
 * each tab is one table, row 1 is the header. The web page (Index.html) calls getState / saveState.
 */
var SHEETS = {items: '品項', orders: '訂單', eaten: '吃掉紀錄', cats: '分類', sources: '來源'};
var COLS = {
  items:   [['id','id'],['name','品名'],['brand','店家'],['qty','剩幾顆'],['cat','分類'],['guess','分類是猜的'],['status','階段'],['order','訂單'],['home','放哪個冷凍庫'],['price','價格']],
  orders:  [['id','id'],['source','來源'],['seller','賣家'],['date','出貨日'],['pickup','取貨方式'],['plan','預計放'],['arrived','已到店'],['arrivedOn','到店日']],
  eaten:   [['d','日期'],['n','品名'],['b','店家'],['per','吃了多少'],['id','品項id'],['r','星等'],['note','心得'],['gift','送出']],
  cats:    [['id','id'],['label','名稱'],['emoji','emoji'],['color','顏色'],['per','一天的量'],['unit','單位']],
  sources: [['id','id'],['label','名稱'],['emoji','emoji']]
};
var NUM = {qty: 1, price: 1, per: 1, r: 1};
var BOOL = {guess: 1, arrived: 1, gift: 1};
var STATUS_ZH = {making: '製作中', shipping: '運送中', arrived: '運送中', fridge: '冷凍庫', done: '吃完'};
var STATUS_ID = {'製作中': 'making', '運送中': 'shipping', '冷凍庫': 'fridge', '吃完': 'done'};

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

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fresh = !ss.getSheetByName(SHEETS.items);
  Object.keys(SHEETS).forEach(function (k) { sheet_(k); });
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

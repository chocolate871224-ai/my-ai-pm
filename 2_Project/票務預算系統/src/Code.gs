/**
 * 票區規劃室 — Google 試算表後端
 * 貼到：試算表 ›「擴充功能」›「Apps Script」，取代原本的「程式碼.gs」內容
 *（原本的 countColoredCells 已包含在最下面，不用另外保留）
 */

// 座位圖統計公式的格式：=countcoloredcells(T77:HN260, E5)
var COUNT_FN = /countcoloredcells\s*\(\s*([A-Za-z]+\d+\s*:\s*[A-Za-z]+\d+)\s*,\s*([A-Za-z]+\d+)\s*(?:,\s*[^)]*)?\)/i;
// 這些註記的座位不算在可售張數裡（待確認照常算）
var NOT_FOR_SALE = ['撤位', '貴賓保留', '公關／贊助保留', '視線不良不賣'];
// 座位註記分類：存在試算表（DocumentProperties），所有人共用；style：x 叉叉／flag 角標／fill 換色（舊的 fade 淡化自動改成換色）
var TAG_DEFAULT = [
  { k: '撤位', sell: false, color: '#64748b', style: 'x', hint: '不設座，例如平面後排撤掉' },
  { k: '貴賓保留', sell: false, color: '#d97706', style: 'flag', hint: '留給主辦、藝人或貴賓' },
  { k: '公關／贊助保留', sell: false, color: '#16a34a', style: 'flag', hint: '贊助回饋、公關票' },
  { k: '待確認', sell: true, color: '#2563eb', style: 'flag', hint: '先標記，仍照常計入可售' }
];
function getTags_() {
  try { var v = PropertiesService.getDocumentProperties().getProperty('noteTags'); if (v) return JSON.parse(v); } catch (e) {}
  return TAG_DEFAULT;
}
/** 不售的分類名稱（數座位時排除）；舊的「視線不良不賣」保留相容 */
function notForSale_() {
  return getTags_().filter(function (t) { return !t.sell; }).map(function (t) { return t.k; }).concat(['視線不良不賣']);
}
/**
 * 儲存註記分類
 * tags: [{k, sell, color, style, hint}]；renames: [[舊名, 新名], ...]
 */
function saveTags(tags, renames) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error('有其他人正在儲存，請過幾秒再試一次');
  try {
    tags = (tags || []).map(function (t) {
      return { k: String(t.k || '').trim(), sell: !!t.sell, color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color.toLowerCase() : '#7c3aed', style: t.style === 'fade' ? 'fill' : ['x', 'flag', 'fill'].indexOf(t.style) >= 0 ? t.style : 'flag', hint: String(t.hint || '') };
    });
    var seen = {};
    tags.forEach(function (t) {
      if (!t.k) throw new Error('分類名稱不能空白');
      if (/[：:]/.test(t.k)) throw new Error('分類名稱不能有冒號：' + t.k);
      if (seen[t.k]) throw new Error('分類名稱重複：' + t.k);
      seen[t.k] = 1;
    });
    var map = {};
    (renames || []).forEach(function (r) { if (r[0] && r[1] && r[0] !== r[1]) map[r[0]] = r[1]; });
    // 刪掉的分類不能還有座位在用
    var ns = noteSheet_(false), rows = ns && ns.getLastRow() > 1 ? ns.getRange(2, 1, ns.getLastRow() - 1, NOTE_HEAD.length).getValues() : [];
    var inUse = {};
    rows.forEach(function (r) { var k = String(r[7] || ''); if (k) { k = map[k] || k; if (!seen[k]) inUse[k] = (inUse[k] || 0) + 1; } });
    var bad = Object.keys(inUse);
    if (bad.length) throw new Error('還有座位在用這些分類，不能刪：' + bad.map(function (k) { return k + '（' + inUse[k] + ' 席）'; }).join('、'));
    // 改名：座位註記分頁＋座位格子上的備註
    var touched = {};
    if (Object.keys(map).length && rows.length) {
      var ss = SpreadsheetApp.getActiveSpreadsheet(), byNote = {};
      rows.forEach(function (r) {
        var old = String(r[7] || '');
        if (!map[old]) return;
        r[7] = map[old];
        var label = r[7] + (r[8] ? '：' + r[8] : '');
        ((byNote[r[0]] = byNote[r[0]] || {})[label] = byNote[r[0]][label] || []).push(String(r[3]));
        touched[r[0]] = 1;
      });
      ns.getRange(2, 1, rows.length, NOTE_HEAD.length).setValues(rows);
      Object.keys(byNote).forEach(function (sheetName) {
        var sh = ss.getSheetByName(sheetName); if (!sh) return;
        Object.keys(byNote[sheetName]).forEach(function (label) {
          var list = byNote[sheetName][label];
          for (var i = 0; i < list.length; i += 400) sh.getRangeList(list.slice(i, i + 400)).setNote(label);
        });
      });
    }
    var before = JSON.stringify(getTags_());
    var oldColors = getTags_().map(function (t) { return t.color; });
    PropertiesService.getDocumentProperties().setProperty('noteTags', JSON.stringify(tags));
    // 可售／不售或名稱變了：用到註記的座位圖要重算張數
    if (before !== JSON.stringify(tags)) rows.forEach(function (r) { if (r[0]) touched[r[0]] = 1; });
    var ss2 = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(touched).forEach(function (n) { var sh = ss2.getSheetByName(n); if (sh) { paintTagCells_(sh, n, [], oldColors); recalc_(sh); bumpRev_(n, '註記分類'); } });
    log_('（全部）', '註記分類', tags.map(function (t) { return t.k + (t.sell ? '' : '（不售）'); }).join('、') + (Object.keys(map).length ? '；改名：' + Object.keys(map).map(function (k) { return k + '→' + map[k]; }).join('、') : ''));
    return getTags_();
  } finally { lock.releaseLock(); }
}
var LOG_SHEET = '規劃紀錄';

/* ---------- 網頁入口 ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Ticket & Seat')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- 活動名稱（存在這份試算表的設定裡，大家看到同一個） ---------- */
function getEventName() {
  return PropertiesService.getScriptProperties().getProperty('EVENT_NAME') || '';
}
function saveEventName(v) {
  v = String(v || '').trim().slice(0, 60);
  PropertiesService.getScriptProperties().setProperty('EVENT_NAME', v);
  return v;
}

/* 試算表上方會多一個「票區規劃」選單，可以直接開網頁 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('票區規劃')
    .addItem('開啟 Ticket & Seat', 'openPlanner')
    .addToUi();
}
function openPlanner() {
  var url = ScriptApp.getService().getUrl();
  var html = url
    ? '<p style="font-family:sans-serif">按下面連結開啟（會開新分頁）：</p><p><a href="' + url + '" target="_blank" style="font-family:sans-serif;font-size:16px">開啟 Ticket &amp; Seat</a></p>'
    : '<p style="font-family:sans-serif">還沒部署成網頁。請到 Apps Script 右上角「部署」›「新增部署作業」。</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(320).setHeight(140), 'Ticket & Seat');
}

/* ---------- 讀取 ---------- */

/** 列出有座位圖統計公式的分頁 */
function listVenues() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = [];
  var sheets = ss.getSheets();
  // 先只看名稱有「座位」的分頁，比較快；都沒有才全部檢查
  sheets = sheets.filter(function (sh) { return !sh.isSheetHidden(); }); // 隱藏的分頁不列入
  var named = sheets.filter(function (sh) { return /座位/.test(sh.getName()) && sh.getName() !== SALE_TAB; });
  var saleTab = '';
  (named.length ? named : sheets).forEach(function (sh) {
    if (sh.getName() === SALE_TAB) return;
    var f = headFormulas_(sh);
    var n = 0;
    f.forEach(function (row) { row.forEach(function (x) { if (x && COUNT_FN.test(x)) n++; }); });
    if (n) out.push({ name: sh.getName(), hidden: sh.isSheetHidden(), legend: n });
  });
  var st = ss.getSheetByName(SALE_TAB);
  if (st && headFormulas_(st).some(function (row) { return row.some(function (x) { return x && COUNT_FN.test(x); }); })) saleTab = SALE_TAB;
  return { spreadsheet: ss.getName(), venues: out, saleTab: saleTab, baseTab: ss.getSheetByName(BASE_TAB) ? BASE_TAB : '' };
}

function headFormulas_(sh) {
  var nr = Math.min(80, sh.getMaxRows()), nc = Math.min(30, sh.getMaxColumns());
  return sh.getRange(1, 1, nr, nc).getFormulas();
}

/** 讀取一個座位圖分頁：圖例（票價／顏色）、座位格、文字、試算表總計 */
function loadVenue(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('找不到分頁「' + name + '」');

  var nr = Math.min(80, sh.getMaxRows()), nc = Math.min(30, sh.getMaxColumns());
  var head = sh.getRange(1, 1, nr, nc);
  var F = head.getFormulas(), D = head.getDisplayValues(), V = head.getValues(), B = head.getBackgrounds();

  var mapA1 = null, legend = [], seen = {}, legendCol = -1;
  for (var i = 0; i < nr; i++) {
    for (var j = 0; j < nc; j++) {
      var m = F[i][j] && F[i][j].match(COUNT_FN);
      if (!m) continue;
      if (!mapA1) mapA1 = m[1].replace(/\s/g, '').toUpperCase();
      var ref = sh.getRange(m[2]);
      var rr = ref.getRow() - 1, rc = ref.getColumn() - 1;
      var color = String(rr < nr && rc < nc ? B[rr][rc] : ref.getBackground()).toLowerCase();
      legendCol = rc;
      if (!color || color === '#ffffff' || seen[color]) continue;
      seen[color] = 1;
      var refCol = ref.getColumn() - 1;
      // 價格：統計格右邊第一個像「$1,234」的格子
      var pc = -1;
      for (var k = j + 1; k < nc; k++) { if (/^\s*\$\s*-?[\d,]+/.test(D[i][k])) { pc = k; break; } }
      var price = null;
      if (pc >= 0) { price = typeof V[i][pc] === 'number' ? V[i][pc] : Number(String(D[i][pc]).replace(/[^\d.-]/g, '')) || 0; }
      legend.push({
        row: i + 1,
        color: color,
        area: textNear_(D, i, refCol, 1),
        floor: textNear_(D, i, 2, 0),
        price: price,
        priceA1: pc >= 0 ? sh.getRange(i + 1, pc + 1).getA1Notation() : null,
        countA1: sh.getRange(i + 1, j + 1).getA1Notation(),
        count: typeof V[i][j] === 'number' ? V[i][j] : 0
      });
    }
  }
  if (!mapA1) throw new Error('這個分頁沒有 countcoloredcells 公式，無法辨識座位圖');

  // 圖例欄裡有顏色、但沒有統計公式的列（例如：身障席、場館工作席、視線不良），也當成圖例
  if (legendCol >= 0) {
    var firstRow = Math.min.apply(null, legend.map(function (l) { return l.row - 1; }));
    for (var i2 = firstRow; i2 < nr; i2++) {
      var c2 = String(B[i2][legendCol]).toLowerCase();
      if (!c2 || c2 === '#ffffff' || seen[c2]) continue;
      var name2 = '';
      for (var k3 = legendCol - 1; k3 >= 1; k3--) { var t3 = String(D[i2][k3]).trim(); if (t3 && !/^[\d,$.\s]+$/.test(t3)) { name2 = t3; break; } }
      if (!name2) continue;
      seen[c2] = 1;
      var pc2 = -1;
      for (var k2 = legendCol + 1; k2 < nc; k2++) { if (/^\s*\$\s*[1-9][\d,]*/.test(D[i2][k2])) { pc2 = k2; break; } }
      legend.push({
        row: i2 + 1, color: c2, area: name2, floor: '',
        price: pc2 >= 0 ? (typeof V[i2][pc2] === 'number' ? V[i2][pc2] : Number(String(D[i2][pc2]).replace(/[^\d.-]/g, ''))) : null,
        priceA1: pc2 >= 0 ? sh.getRange(i2 + 1, pc2 + 1).getA1Notation() : null,
        countA1: null, count: null
      });
    }
    legend.sort(function (a, b) { return a.row - b.row; });
  }

  // 讀取範圍：統計範圍往上多讀 14 列、往左 3 欄（包含區名與排號）
  var mr = sh.getRange(mapA1);
  var top = Math.max(1, mr.getRow() - 14), left = Math.max(1, mr.getColumn() - 3);
  var bottom = Math.min(sh.getMaxRows(), mr.getLastRow() + 2), right = Math.min(sh.getMaxColumns(), mr.getLastColumn() + 1);
  var win = sh.getRange(top, left, bottom - top + 1, right - left + 1);
  var bg = win.getBackgrounds(), tx = win.getDisplayValues();
  // 銷售分頁：已售／鎖位的格子被改成狀態色，讀取時換回原本的票價色
  var orig = origColors_(name);
  Object.keys(orig).forEach(function (k) {
    var rc = k.split(','), rr = Number(rc[0]) - top, cc = Number(rc[1]) - left;
    if (rr >= 0 && rr < bg.length && cc >= 0 && cc < bg[rr].length) bg[rr][cc] = orig[k];
  });

  // 已分類的白色座位在試算表塗成分類顏色；讀回來仍當作「沒有票價」，由註記決定分類
  var notes = readNotes_(name), tagCol = {}, paintedAs = {};
  getTags_().forEach(function (t) { tagCol[t.k] = String(t.color).toLowerCase(); });
  notes.forEach(function (n) { if (tagCol[n[2]]) paintedAs[(n[0] - top) + ',' + (n[1] - left)] = tagCol[n[2]]; });
  var palette = [], pidx = {}, grid = [];
  for (var r = 0; r < bg.length; r++) {
    var s = '';
    for (var c = 0; c < bg[r].length; c++) {
      var col = String(bg[r][c]).toLowerCase();
      if (col === '#ffffff' || !col || (paintedAs[r + ',' + c] === col && !seen[col])) { s += ' '; continue; }
      if (!(col in pidx)) { pidx[col] = palette.length; palette.push(col); }
      s += String.fromCharCode(48 + pidx[col]);
    }
    grid.push(s);
  }
  var texts = [];
  for (r = 0; r < tx.length; r++) for (c = 0; c < tx[r].length; c++) if (tx[r][c] !== '') texts.push([r, c, tx[r][c]]);
  var merges = win.getMergedRanges().map(function (g) {
    return [g.getRow() - top, g.getColumn() - left, g.getNumRows(), g.getNumColumns()];
  });

  // 座位圖範圍內沒有隱藏列／欄，直接用試算表座標（逐格檢查隱藏會讓讀取變得很慢）
  var hiddenRowsBefore = 0, hiddenColsBefore = 0, rowsHidden = [], colsHidden = [];
  for (r = top; r <= bottom; r++) rowsHidden.push(0);
  for (c = left; c <= right; c++) colsHidden.push(0);

  return {
    spreadsheet: ss.getName(),
    sheet: name,
    sheetId: sh.getSheetId(),
    url: ss.getUrl() + '#gid=' + sh.getSheetId(),
    top: top, left: left,
    palette: palette, grid: grid, texts: texts, merges: merges,
    hiddenRowsBefore: hiddenRowsBefore, hiddenColsBefore: hiddenColsBefore,
    rowsHidden: rowsHidden.join(''), colsHidden: colsHidden.join(''),
    legend: legend,
    totals: sheetTotals_(D, V),
    loadedAt: new Date().toISOString(),
    user: Session.getActiveUser().getEmail() || '',
    notes: notes,
    rev: getRev(name),
    tags: getTags_(),
    sales: readSales_(name),
    daily: readDaily_(name),
    notices: readNotices_(name),
    today: today_()
  };
}

/** 往左（或往上）找最近的文字，用來當圖例名稱 */
function textNear_(D, i, col, minCol) {
  for (var up = 0; up <= 8 && i - up >= 0; up++) {
    var row = D[i - up];
    for (var k = Math.min(col - 1, row.length - 1); k >= minCol; k--) {
      var t = String(row[k]).trim();
      if (t && !/^[\d,$.\s]+$/.test(t)) return t;
    }
  }
  return '';
}

/** 試算表自己算的總票房／總座位數／平均票價，用來對帳 */
function sheetTotals_(D, V) {
  var want = { '總票房': 'revenue', '總座位數': 'seats', '可售座位數': 'sellable', '平均票價': 'avg' };
  var out = {};
  for (var i = 0; i < D.length; i++) for (var j = 0; j < D[i].length; j++) {
    var t = String(D[i][j]).trim().replace(/^[A-Z]\.\s*/, '');
    var key = null;
    Object.keys(want).forEach(function (w) { if (t.indexOf(w) === 0) key = want[w]; });
    if (!key || out[key] !== undefined) continue;
    for (var k = j + 1; k < D[i].length; k++) {
      if (D[i][k] !== '') { out[key] = typeof V[i][k] === 'number' ? V[i][k] : D[i][k]; break; }
    }
  }
  return out;
}

/* ---------- 預算（唯讀） ---------- */
var BUDGET_DETAIL = '預算明細', BUDGET_EVAL = '預算評估';

function num_(v, d) {
  if (typeof v === 'number') return v;
  var t = String(d !== undefined ? d : v).trim();
  if (!t || !/\d/.test(t)) return null;
  var neg = /^\(.*\)$/.test(t) || /^-/.test(t);
  var n = Number(t.replace(/[^\d.]/g, ''));
  return neg ? -n : n;
}

/** 讀「預算明細」＋「預算評估」，回傳儀表板用的預算資料 */
function loadBudget() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sd = ss.getSheetByName(BUDGET_DETAIL), se = ss.getSheetByName(BUDGET_EVAL);
  if (!sd) throw new Error('找不到分頁「' + BUDGET_DETAIL + '」');
  var R = sd.getDataRange(), D = R.getDisplayValues(), V = R.getValues();

  // 表頭：可售張數、平均票價
  var header = { venue: '', sellable: null, avg: null, name: '' };
  for (var i = 0; i < Math.min(12, D.length); i++) D[i].forEach(function (t) {
    t = String(t);
    var m;
    if ((m = t.match(/可售張數[^\d]*([\d,]+)/))) header.sellable = Number(m[1].replace(/,/g, ''));
    if ((m = t.match(/平均票價[^\d]*([\d,]+)/))) header.avg = Number(m[1].replace(/,/g, ''));
    if ((m = t.match(/演出地點[:：]\s*(.+)/))) header.venue = m[1].trim();
    if ((m = t.match(/活動名稱[:：]?\s*(.*)/))) header.name = m[1].trim();
  });

  // 明細：依欄位標題找欄位
  var items = [], sec = null, col = null;
  for (i = 0; i < D.length; i++) {
    var row = D[i], joined = row.join('|');
    if (/收入明細/.test(joined)) { sec = '收入'; continue; }
    if (/變動支出/.test(joined) && !/項目/.test(joined)) { sec = '變動支出'; continue; }
    if (/固定支出/.test(joined) && !/項目/.test(joined)) { sec = '固定支出'; continue; }
    if (row.some(function (x) { return String(x).trim() === '預算管理'; }) && row.some(function (x) { return String(x).trim() === '單價'; })) {
      col = {};
      row.forEach(function (h, j) {
        h = String(h).trim();
        if (h === '項') col.no = j; else if (h === '預算管理') col.cat = j; else if (h === '事件') col.event = j;
        else if (/項目$/.test(h) && col.item === undefined) col.item = j; else if (h === '單價') col.price = j;
        else if (h === '數量') col.qty = j; else if (h === '單位') col.unit = j; else if (h === '頻率') col.freq = j;
        else if (h === '未稅小計') col.net = j; else if (h === '稅額') col.tax = j; else if (/^總計/.test(h) && col.gross === undefined) col.gross = j;
      });
      continue;
    }
    if (!sec || !col || col.no === undefined || !/^\d+$/.test(String(row[col.no]).trim())) continue;
    var q = String(row[col.qty] || '').trim(), pct = /%$/.test(q);
    var it = {
      sec: sec, cat: String(row[col.cat] || '').trim(), event: String(row[col.event] || '').trim(),
      item: col.item !== undefined ? String(row[col.item] || '').trim() : '',
      price: num_(V[i][col.price], row[col.price]),
      qty: pct ? Number(q.replace('%', '')) / 100 : num_(V[i][col.qty], row[col.qty]),
      pct: pct, unit: String(row[col.unit] || '').trim(), freq: num_(V[i][col.freq], row[col.freq]),
      net: num_(V[i][col.net], row[col.net]) || 0, tax: num_(V[i][col.tax], row[col.tax]) || 0,
      gross: col.gross !== undefined ? (num_(V[i][col.gross], row[col.gross]) || 0) : 0
    };
    if (sec === '變動支出') {
      var txt = it.event + ' ' + it.item;
      if (/上限/.test(txt) && /抽成/.test(txt)) it.rule = ['cap', 0.08, it.net];
      else if (pct) it.rule = [/贊助/.test(txt) ? 'spon' : 'ticket', it.qty];
    }
    items.push(it);
  }

  // 情境：預算評估
  var ev = { ticketBase: null, sponBase: null, bizRate: 0.08, scen: [], sheet: {} };
  if (se) {
    var E = se.getDataRange().getDisplayValues(), EV = se.getDataRange().getValues();
    var sc = null;
    for (i = 0; i < E.length && !sc; i++) {
      var a = E[i].indexOf('保守'), b = E[i].indexOf('穩健'), c = E[i].indexOf('積極');
      if (a >= 0 && b >= 0 && c >= 0) sc = [['cons', '保守', a], ['mid', '穩健', b], ['agg', '積極', c]];
    }
    var rate = {};
    for (i = 0; i < E.length; i++) for (var j = 0; j < E[i].length - 3; j++) {
      var lab = String(E[i][j]).trim();
      if ((lab === '票房' || lab === '贊助') && /%$/.test(E[i][j + 1]) && /%$/.test(E[i][j + 2]) && /%$/.test(E[i][j + 3]))
        rate[lab] = [1, 2, 3].map(function (k) { return Number(String(E[i][j + k]).replace('%', '')) / 100; });
    }
    var want = { '票房': 'ticket', '贊助': 'spon', '收入合計': 'income', '成本合計': 'cost', '毛利': 'gross', '業務執行費': 'biz', '費用合計': 'net' };
    var vals = {};
    if (sc) for (i = 0; i < E.length; i++) {
      var key = null;
      for (j = 0; j < Math.min(4, E[i].length); j++) {
        var t2 = String(E[i][j]).trim();
        Object.keys(want).forEach(function (w) { if (t2.indexOf(w) === 0 && !key) key = want[w]; });
        if (key) { if (key === 'biz') { var m2 = t2.match(/([\d.]+)%/); if (m2) ev.bizRate = Number(m2[1]) / 100; } break; }
      }
      if (!key || vals[key]) continue;
      vals[key] = sc.map(function (x) { return num_(EV[i][x[2]], E[i][x[2]]); });
    }
    if (sc && rate['票房']) {
      ev.scen = sc.map(function (x, k) { return { k: x[0], name: x[1], t: rate['票房'][k], s: rate['贊助'] ? rate['贊助'][k] : 1 }; });
      sc.forEach(function (x, k) {
        ev.sheet[x[0]] = { income: vals.income ? vals.income[k] : null, cost: vals.cost ? vals.cost[k] : null, gross: vals.gross ? vals.gross[k] : null, biz: vals.biz ? vals.biz[k] : null, net: vals.net ? vals.net[k] : null };
        if (vals.ticket && vals.ticket[k] && rate['票房'][k] && !ev.ticketBase) ev.ticketBase = vals.ticket[k] / rate['票房'][k];
        if (vals.spon && vals.spon[k] && rate['贊助'] && rate['贊助'][k] && !ev.sponBase) ev.sponBase = vals.spon[k] / rate['贊助'][k];
      });
    }
  }
  if (!ev.scen.length) ev.scen = [{ k: 'cons', name: '保守', t: 0.5, s: 0.5 }, { k: 'mid', name: '穩健', t: 0.7, s: 0.8 }, { k: 'agg', name: '積極', t: 1, s: 1 }];
  if (!ev.ticketBase && header.sellable && header.avg) ev.ticketBase = header.sellable * header.avg;
  if (!ev.sponBase) { items.forEach(function (it) { if (it.sec === '收入' && it.cat === '贊助' && !ev.sponBase) ev.sponBase = it.net / (ev.scen[0].s || 1); }); }
  return { sheet: BUDGET_DETAIL, header: header, items: items, eval: ev, loadedAt: new Date().toISOString() };
}

/* ---------- 寫回 ---------- */

/**
 * 把座位顏色寫回試算表
 * changes: [[列, 欄, '#色碼'], ...]（試算表上的實際列欄，從 1 開始）
 */
function saveSeats(name, changes, note) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error('有其他人正在儲存，請過幾秒再試一次');
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sh) throw new Error('找不到分頁「' + name + '」');
    var byColor = {};
    changes = keepStatusColor_(name, changes);
    changes.forEach(function (ch) {
      var a1 = sh.getRange(ch[0], ch[1]).getA1Notation();
      (byColor[ch[2]] = byColor[ch[2]] || []).push(a1);
    });
    Object.keys(byColor).forEach(function (color) {
      var list = byColor[color];
      for (var i = 0; i < list.length; i += 400) sh.getRangeList(list.slice(i, i + 400)).setBackground(color);
    });
    recalc_(sh);
    log_(name, changes.length + ' 席改色', note || '');
    return loadVenue(name);
  } finally { lock.releaseLock(); }
}

/* ---------- 座位註記（撤位、貴賓保留、視線不良…） ---------- */
var NOTE_SHEET = '座位註記';
var NOTE_HEAD = ['座位圖分頁', '列', '欄', '儲存格', '區域', '排', '號', '註記', '說明', '更新者', '更新時間'];

function noteSheet_(create) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(NOTE_SHEET);
  if (!sh && create) { sh = ss.insertSheet(NOTE_SHEET); sh.appendRow(NOTE_HEAD); sh.setFrozenRows(1); }
  return sh;
}
/** 讀某個座位圖分頁的註記：[[列, 欄, 註記, 說明], ...] */
function readNotes_(name) {
  var sh = noteSheet_(false);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, NOTE_HEAD.length).getValues();
  return v.filter(function (r) { return r[0] === name && r[7]; }).map(function (r) { return [Number(r[1]), Number(r[2]), String(r[7]), String(r[8] || '')]; });
}

/**
 * 一次儲存：座位顏色＋座位註記
 * changes: [[列, 欄, '#色碼'], ...]
 * notes:   [[列, 欄, 註記(空白=清除), 說明, 區域, 排, 號], ...]
 */
function saveAll(name, changes, notes, summary, detail) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error('有其他人正在儲存，請過幾秒再試一次');
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sh) throw new Error('找不到分頁「' + name + '」');
    changes = keepStatusColor_(name, changes || []);
    if (changes && changes.length) {
      var byColor = {};
      changes.forEach(function (ch) { (byColor[ch[2]] = byColor[ch[2]] || []).push(sh.getRange(ch[0], ch[1]).getA1Notation()); });
      Object.keys(byColor).forEach(function (color) {
        var list = byColor[color];
        for (var i = 0; i < list.length; i += 400) sh.getRangeList(list.slice(i, i + 400)).setBackground(color);
      });
    }
    if (notes && notes.length) writeNotes_(sh, name, notes);
    // 已分類的白色座位塗成分類顏色、拿掉分類的改回白色
    if ((changes && changes.length) || (notes && notes.length)) paintTagCells_(sh, name, (notes || []).filter(function (n) { return !n[2]; }), []);
    // 顏色和不售註記都寫好之後，再讓圖例的張數重新計算
    if ((changes && changes.length) || (notes && notes.length)) recalc_(sh);
    log_(name, (changes ? changes.length : 0) + ' 席改票價、' + (notes ? notes.length : 0) + ' 席註記', summary || '', detail || []);
    return loadVenue(name);
  } finally { lock.releaseLock(); }
}

function writeNotes_(seatSheet, name, notes) {
  var ns = noteSheet_(true);
  var last = ns.getLastRow();
  var rows = last > 1 ? ns.getRange(2, 1, last - 1, NOTE_HEAD.length).getValues() : [];
  var idx = {};
  rows.forEach(function (r, i) { if (r[0] === name) idx[r[1] + ',' + r[2]] = i; });
  var who = Session.getActiveUser().getEmail() || '', now = new Date();
  var setBy = {}, clear = [];
  notes.forEach(function (n) {
    var key = n[0] + ',' + n[1], a1 = seatSheet.getRange(n[0], n[1]).getA1Notation();
    if (!n[2]) { if (key in idx) rows[idx[key]] = null; clear.push(a1); return; }
    var row = [name, n[0], n[1], a1, n[4] || '', n[5] || '', n[6] || '', n[2], n[3] || '', who, now];
    if (key in idx) rows[idx[key]] = row; else { idx[key] = rows.length; rows.push(row); }
    var label = n[2] + (n[3] ? '：' + n[3] : '');
    (setBy[label] = setBy[label] || []).push(a1);
  });
  rows = rows.filter(function (r) { return r; });
  if (last > 1) ns.getRange(2, 1, last - 1, NOTE_HEAD.length).clearContent();
  if (rows.length) ns.getRange(2, 1, rows.length, NOTE_HEAD.length).setValues(rows);
  // 座位圖上的格子也加上備註，在試算表裡滑過去就看得到
  for (var i = 0; i < clear.length; i += 400) seatSheet.getRangeList(clear.slice(i, i + 400)).clearNote();
  Object.keys(setBy).forEach(function (label) {
    var list = setBy[label];
    for (var k = 0; k < list.length; k += 400) seatSheet.getRangeList(list.slice(k, k + 400)).setNote(label);
  });
}

/* ---------- 已分類的白色座位：試算表上塗成分類顏色 ---------- */
/** 圖例用到的顏色（統計公式參考的顏色＋圖例欄所有底色），分類顏色撞到這些就不塗，免得被算成票價 */
function legendColors_(sh) {
  var nr = Math.min(80, sh.getMaxRows()), nc = Math.min(30, sh.getMaxColumns());
  var rg = sh.getRange(1, 1, nr, nc), F = rg.getFormulas(), B = rg.getBackgrounds(), out = {}, col = -1, mapTop = nr + 1;
  for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) {
    var m = F[i][j] && F[i][j].match(COUNT_FN);
    if (!m) continue;
    mapTop = Math.min(mapTop, Number((m[1].match(/\d+/) || [nr + 1])[0]));
    var ref = sh.getRange(m[2]);
    col = ref.getColumn() - 1;
    out[String(ref.getBackground()).toLowerCase()] = 1;
  }
  // 圖例欄只看座位圖上方那一段（座位圖本身不算）
  if (col >= 0) for (var r = 0; r < Math.min(nr, mapTop - 1); r++) out[String(B[r][col]).toLowerCase()] = 1;
  delete out['#ffffff']; delete out[''];
  return out;
}
/**
 * 有註記、原本沒有票價（白色）的座位，格子塗成分類顏色；拿掉註記就改回白色。
 * 已經有票價顏色的座位不動。cleared：這次拿掉註記的 [[列, 欄], ...]；oldColors：分類改色前的顏色
 */
function paintTagCells_(sh, name, cleared, oldColors) {
  var leg = legendColors_(sh), tc = {}, ours = {};
  getTags_().forEach(function (t) { var c = String(t.color).toLowerCase(); tc[t.k] = c; if (!leg[c]) ours[c] = 1; });
  (oldColors || []).forEach(function (c) { c = String(c).toLowerCase(); if (!leg[c]) ours[c] = 1; });
  var want = [];
  readNotes_(name).forEach(function (n) { var c = tc[n[2]]; want.push([n[0], n[1], c && !leg[c] ? c : '#ffffff']); });
  var noted = {};
  want.forEach(function (w) { noted[w[0] + ',' + w[1]] = 1; });
  (cleared || []).forEach(function (c) { if (!noted[c[0] + ',' + c[1]]) want.push([c[0], c[1], '#ffffff']); });
  if (!want.length) return 0;
  var r0 = Infinity, r1 = 0, c0 = Infinity, c1 = 0;
  want.forEach(function (w) { r0 = Math.min(r0, w[0]); r1 = Math.max(r1, w[0]); c0 = Math.min(c0, w[1]); c1 = Math.max(c1, w[1]); });
  var bg = sh.getRange(r0, c0, r1 - r0 + 1, c1 - c0 + 1).getBackgrounds(), byColor = {}, n = 0;
  want.forEach(function (w) {
    var cur = String(bg[w[0] - r0][w[1] - c0] || '').toLowerCase();
    var free = !cur || cur === '#ffffff' || ours[cur];  // 白色，或之前塗上的分類顏色
    if (!free || cur === w[2] || (cur === '' && w[2] === '#ffffff')) return;
    (byColor[w[2]] = byColor[w[2]] || []).push(sh.getRange(w[0], w[1]).getA1Notation());
    n++;
  });
  Object.keys(byColor).forEach(function (color) {
    var list = byColor[color];
    for (var i = 0; i < list.length; i += 400) sh.getRangeList(list.slice(i, i + 400)).setBackground(color);
  });
  return n;
}

/** 修改票價（寫入圖例那一列的票價格） */
function savePrice(name, priceA1, value) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error('有其他人正在儲存，請過幾秒再試一次');
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    var cell = sh.getRange(priceA1);
    var old = cell.getDisplayValue();
    cell.setValue(Number(value));
    log_(name, '票價 ' + priceA1, old + ' → ' + value);
    SpreadsheetApp.flush();
    return loadVenue(name);
  } finally { lock.releaseLock(); }
}

/** 改顏色不會讓自訂公式重算，所以把公式重寫一次（只調整空白，不改內容） */
function recalc_(sh) {
  // 自訂公式的結果會被 Google 暫存，所以每次都換一個新的第三個參數，強迫它重新計算
  var nonce = Date.now() % 1000000000;
  var nr = Math.min(80, sh.getMaxRows()), nc = Math.min(30, sh.getMaxColumns());
  var rg = sh.getRange(1, 1, nr, nc), F = rg.getFormulas();
  var re = new RegExp(COUNT_FN.source, 'ig');
  for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) {
    var f = F[i][j];
    if (!f || !COUNT_FN.test(f)) continue;
    var nf = f.replace(re, function (all, a, b) { return 'countcoloredcells(' + a.replace(/\s+/g, '') + ', ' + b + ', ' + nonce + ')'; });
    sh.getRange(i + 1, j + 1).setFormula(nf);
  }
  SpreadsheetApp.flush();
}

var LOG_HEAD = ['時間', '使用者', '分頁', '內容', '說明', '類型', '區域', '排', '號', '席數', '原本', '改成'];
function log_(sheet, what, detail, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lg = ss.getSheetByName(LOG_SHEET);
  if (!lg) { lg = ss.insertSheet(LOG_SHEET); lg.appendRow(LOG_HEAD); lg.setFrozenRows(1); }
  else if (lg.getLastColumn() < LOG_HEAD.length) lg.getRange(1, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]);
  // 用台灣時間的文字寫入，避免試算表時區不同或只顯示日期
  var now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss'), who = Session.getActiveUser().getEmail() || '';
  var out = [[now, who, sheet, what, detail, '', '', '', '', '', '', '']];
  (rows || []).forEach(function (r) {
    // r = [類型, 區域, 排, 號, 席數, 原本, 改成]
    var line = r[1] + (r[2] ? ' 第' + r[2] + '排' : '') + (r[3] ? ' ' + r[3] + '號' : '') + '：' + r[5] + ' → ' + r[6] + '（' + r[4] + ' 席）';
    out.push([now, who, sheet, '　└ ' + r[0], line, r[0], r[1], r[2], String(r[3]), r[4], r[5], r[6]]);
  });
  lg.getRange(lg.getLastRow() + 1, 1, out.length, LOG_HEAD.length).setValues(out);
  bumpRev_(sheet, what);
}

/* ---------- 多台裝置同步：每次儲存記下時間，網頁每 20 秒問一次 ---------- */
function bumpRev_(sheet, what) {
  PropertiesService.getDocumentProperties().setProperty('rev:' + sheet, JSON.stringify({ t: Date.now(), who: Session.getActiveUser().getEmail() || '', what: String(what || '') }));
}
/** 很輕的查詢：只回傳這個分頁最後一次儲存的時間 */
function getRev(name) {
  var v = PropertiesService.getDocumentProperties().getProperty('rev:' + name);
  return v ? JSON.parse(v) : { t: 0 };
}

/* ================= 銷售階段（開賣後） =================
 * 三個分頁，第一次儲存時自動建立，不會動到座位格子的顏色：
 *  銷售狀態：每個已售／策略鎖位／貴賓保留的座位一列（可售的座位不會出現）
 *  每日售出：每天、每個票價新賣幾張、退票幾張
 *  鎖位通知：每次鎖位、保留、釋出要通知售票窗口的紀錄
 */
var SALE_SHEET = '銷售狀態';
var SALE_HEAD = ['座位圖分頁', '列', '欄', '儲存格', '區域', '排', '號', '票價', '狀態', '對象', '日期', '更新者', '更新時間', '原本顏色'];
// 「票價座位」是規劃底稿，開賣後不動；實際銷售都記在「票券銷售及鎖位」，已售／鎖位／保留直接改格子底色
var BASE_TAB = '票價座位';
var SALE_TAB = '票券銷售及鎖位';
var STATUS_COLOR = { '已售': '#2e2d36', '策略鎖位': '#d9a92f', '貴賓保留': '#2ba36e' };
var SUM_HEAD = ['已售', '策略鎖位', '貴賓保留'];
var DAILY_SHEET = '每日售出';
var DAILY_HEAD = ['日期', '座位圖分頁', '票價', '新售', '退票', '淨增', '更新時間'];
var NOTICE_SHEET = '鎖位通知';
var NOTICE_HEAD = ['編號', '建立時間', '座位圖分頁', '類型', '對象', '位置', '席數', '狀態', '通知日期', '建立者'];
var SALE_STATES = ['已售', '策略鎖位', '貴賓保留'];

function today_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'); }
function dstr_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd') : String(v || ''); }
function sheetWith_(name, head, create) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh && create) {
    sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@'); // 全部當文字存，日期不會被自動轉換
  }
  return sh;
}
function rows_(sh, width) {
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
}

/** [[列, 欄, 狀態, 對象, 日期], ...] */
function readSales_(name) {
  return rows_(sheetWith_(SALE_SHEET, SALE_HEAD, false), SALE_HEAD.length)
    .filter(function (r) { return r[0] === name && SALE_STATES.indexOf(String(r[8])) >= 0; })
    .map(function (r) { return [Number(r[1]), Number(r[2]), String(r[8]), String(r[9] || ''), dstr_(r[10])]; });
}
/** {'列,欄': '#原本票價色'}：只有銷售分頁、而且格子被改成狀態色的座位 */
function origColors_(name) {
  var out = {};
  if (name !== SALE_TAB) return out;
  rows_(sheetWith_(SALE_SHEET, SALE_HEAD, false), SALE_HEAD.length).forEach(function (r) {
    if (r[0] === name && SALE_STATES.indexOf(String(r[8])) >= 0 && r[13]) out[Number(r[1]) + ',' + Number(r[2])] = String(r[13]).toLowerCase();
  });
  return out;
}
/** 銷售分頁上改票價時，已售／鎖位的座位不改底色，只更新記住的原本票價色 */
function keepStatusColor_(name, changes) {
  if (name !== SALE_TAB) return changes;
  var ss = sheetWith_(SALE_SHEET, SALE_HEAD, false);
  if (!ss || ss.getLastRow() < 2) return changes;
  var rg = ss.getRange(2, 1, ss.getLastRow() - 1, SALE_HEAD.length), v = rg.getValues(), idx = {}, hit = 0;
  v.forEach(function (r, i) { if (r[0] === name && SALE_STATES.indexOf(String(r[8])) >= 0) idx[Number(r[1]) + ',' + Number(r[2])] = i; });
  var keep = changes.filter(function (ch) {
    var k = ch[0] + ',' + ch[1];
    if (!(k in idx)) return true;
    v[idx[k]][13] = ch[2]; hit++;
    return false;
  });
  if (hit) rg.setValues(v);
  return keep;
}
/** 圖例「該區票房」右邊三欄寫入每個票價的已售／策略鎖位／貴賓保留張數（欄位是空的或本來就是這三欄才寫） */
function writeSaleSummary_(sh, rows) {
  var nr = Math.min(80, sh.getMaxRows()), nc = Math.min(30, sh.getMaxColumns());
  var rg = sh.getRange(1, 1, nr, nc), F = rg.getFormulas(), D = rg.getDisplayValues(), B = rg.getBackgrounds();
  var hr = -1, hc = -1;
  for (var i = 0; i < nr && hr < 0; i++) for (var j = 0; j < nc; j++) if (String(D[i][j]).trim() === '該區票房') { hr = i; hc = j; break; }
  if (hr < 0 || hc + 3 >= nc) return;
  for (var k = 0; k < 3; k++) { var t = String(D[hr][hc + 1 + k]).trim(); if (t && t !== SUM_HEAD[k]) return; }
  var cnt = {}; // 原本票價色 → [已售, 策略鎖位, 貴賓保留]
  rows.forEach(function (r) { var c = String(r[13] || '').toLowerCase(), k2 = SUM_HEAD.indexOf(String(r[8])); if (!c || k2 < 0) return; (cnt[c] = cnt[c] || [0, 0, 0])[k2]++; });
  sh.getRange(hr + 1, hc + 2, 1, 3).setValues([SUM_HEAD]);
  // 只寫有統計公式的圖例列，其他列不碰
  for (i = hr + 1; i < nr; i++) {
    var m = null;
    for (j = 0; j < nc && !m; j++) m = F[i][j] && F[i][j].match(COUNT_FN);
    if (!m) continue;
    var ref = sh.getRange(m[2]), rr = ref.getRow() - 1, rc = ref.getColumn() - 1;
    var col = String(rr < nr && rc < nc ? B[rr][rc] : ref.getBackground()).toLowerCase();
    var ok = true;
    for (k = 0; k < 3; k++) if (F[i][hc + 1 + k]) ok = false; // 那格是公式就不覆蓋
    if (ok) sh.getRange(i + 1, hc + 2, 1, 3).setValues([cnt[col] || [0, 0, 0]]);
  }
}

/** [[日期, 票價, 新售, 退票], ...] */
function readDaily_(name) {
  return rows_(sheetWith_(DAILY_SHEET, DAILY_HEAD, false), DAILY_HEAD.length)
    .filter(function (r) { return r[1] === name; })
    .map(function (r) { return [dstr_(r[0]), Number(r[2]) || 0, Number(r[3]) || 0, Number(r[4]) || 0]; });
}
/** [{id, time, type, who, where, n, status, sent}, ...] */
function readNotices_(name) {
  return rows_(sheetWith_(NOTICE_SHEET, NOTICE_HEAD, false), NOTICE_HEAD.length)
    .filter(function (r) { return r[2] === name; })
    .map(function (r) { return { id: String(r[0]), time: String(r[1]), type: String(r[3]), who: String(r[4] || ''), where: String(r[5] || ''), n: Number(r[6]) || 0, status: String(r[7] || ''), sent: dstr_(r[8]) }; });
}

/**
 * 儲存銷售狀態
 * changes: [[列, 欄, 狀態(''＝改回可售), 對象, 區域, 排, 號, 票價, 原本狀態], ...]
 * notices: [[類型, 對象, 位置, 席數], ...]  例：['策略鎖位', '推高票價', '207區 第5–12排', 920]
 */
function saveSales(name, changes, notices, summary, detail) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error('有其他人正在儲存，請過幾秒再試一次');
  try {
    var seat = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!seat) throw new Error('找不到分頁「' + name + '」');
    var day = today_(), now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
    var who = Session.getActiveUser().getEmail() || '';

    // 1. 銷售狀態：同一個座位只留一列
    var ss = sheetWith_(SALE_SHEET, SALE_HEAD, true);
    var last = ss.getLastRow();
    var rows = last > 1 ? ss.getRange(2, 1, last - 1, SALE_HEAD.length).getValues() : [];
    var idx = {};
    rows.forEach(function (r, i) { if (r[0] === name) idx[r[1] + ',' + r[2]] = i; });
    var flow = {}; // 票價 → [新售, 退票]
    var paintTab = name === SALE_TAB, paint = {};
    var cellBg = function (r, c) { return String(seat.getRange(r, c).getBackground()).toLowerCase(); };
    (changes || []).forEach(function (ch) {
      var key = ch[0] + ',' + ch[1], st = String(ch[2] || ''), prev = String(ch[8] || ''), price = Number(ch[7]) || 0;
      if (st && SALE_STATES.indexOf(st) < 0) throw new Error('不認得的狀態：' + st);
      // 已售的座位只能退票（改回可售），不能直接改成鎖位
      var cur = key in idx && rows[idx[key]] ? String(rows[idx[key]][8]) : '';
      if (cur === '已售' && st && st !== '已售') throw new Error(ch[4] + ' 第' + ch[5] + '排 ' + ch[6] + '號已售出，要先退票才能改');
      var had = key in idx && rows[idx[key]] ? rows[idx[key]] : null;
      var origColor = had && had[13] ? String(had[13]).toLowerCase() : (paintTab ? cellBg(ch[0], ch[1]) : '');
      var a1 = seat.getRange(ch[0], ch[1]).getA1Notation();
      if (paintTab) { var to = st ? STATUS_COLOR[st] : origColor; if (to) (paint[to] = paint[to] || []).push(a1); }
      if (!st) { if (key in idx) rows[idx[key]] = null; }
      else {
        var keepDate = cur === st && key in idx ? dstr_(rows[idx[key]][10]) : day;
        var row = [name, ch[0], ch[1], a1, ch[4] || '', ch[5] || '', String(ch[6] || ''), price, st, ch[3] || '', keepDate, who, now, origColor];
        if (key in idx && rows[idx[key]]) rows[idx[key]] = row; else { idx[key] = rows.length; rows.push(row); }
      }
      var f = flow[price] = flow[price] || [0, 0];
      if (st === '已售' && cur !== '已售') f[0]++;
      if (cur === '已售' && st !== '已售') f[1]++;
    });
    rows = rows.filter(function (r) { return r; }).map(function (r) { while (r.length < SALE_HEAD.length) r.push(''); return r; });
    ss.getRange(1, 1, 1, SALE_HEAD.length).setValues([SALE_HEAD]); // 舊的分頁補上「原本顏色」欄
    if (last > 1) ss.getRange(2, 1, last - 1, SALE_HEAD.length).clearContent();
    if (rows.length) ss.getRange(2, 1, rows.length, SALE_HEAD.length).setValues(rows);
    if (paintTab) {
      Object.keys(paint).forEach(function (color) {
        var list = paint[color];
        for (var i = 0; i < list.length; i += 400) seat.getRangeList(list.slice(i, i + 400)).setBackground(color);
      });
      writeSaleSummary_(seat, rows.filter(function (r) { return r[0] === name; }));
      recalc_(seat);
    }

    // 2. 每日售出：今天、這個票價累加
    var prices = Object.keys(flow).filter(function (p) { return flow[p][0] || flow[p][1]; });
    if (prices.length) {
      var ds = sheetWith_(DAILY_SHEET, DAILY_HEAD, true);
      var dl = ds.getLastRow();
      var drows = dl > 1 ? ds.getRange(2, 1, dl - 1, DAILY_HEAD.length).getValues() : [];
      prices.forEach(function (p) {
        var hit = -1;
        drows.forEach(function (r, i) { if (dstr_(r[0]) === day && r[1] === name && Number(r[2]) === Number(p)) hit = i; });
        if (hit < 0) { drows.push([day, name, Number(p), 0, 0, 0, now]); hit = drows.length - 1; }
        var r = drows[hit];
        r[3] = (Number(r[3]) || 0) + flow[p][0];
        r[4] = (Number(r[4]) || 0) + flow[p][1];
        r[5] = r[3] - r[4]; r[6] = now;
      });
      if (drows.length) ds.getRange(2, 1, drows.length, DAILY_HEAD.length).setValues(drows);
    }

    // 3. 鎖位通知：新增待通知
    if (notices && notices.length) {
      var ns = sheetWith_(NOTICE_SHEET, NOTICE_HEAD, true);
      var base = ns.getLastRow();
      var out = notices.map(function (n, k) { return ['N' + Date.now() + '-' + k, now, name, n[0], n[1] || '', n[2] || '', Number(n[3]) || 0, '待通知', '', who]; });
      ns.getRange(base + 1, 1, out.length, NOTICE_HEAD.length).setValues(out);
    }

    log_(name, '銷售：' + (changes ? changes.length : 0) + ' 席', summary || '', detail || []);
    return loadVenue(name);
  } finally { lock.releaseLock(); }
}

/** 把「待通知」標成「已通知」（匯出給售票窗口之後） */
function markNotified(name, ids) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error('有其他人正在儲存，請過幾秒再試一次');
  try {
    var ns = sheetWith_(NOTICE_SHEET, NOTICE_HEAD, false);
    if (ns && ns.getLastRow() > 1) {
      var want = {}; (ids || []).forEach(function (id) { want[id] = 1; });
      var rg = ns.getRange(2, 1, ns.getLastRow() - 1, NOTICE_HEAD.length), v = rg.getValues(), day = today_(), n = 0;
      v.forEach(function (r) { if (r[2] === name && want[String(r[0])] && r[7] === '待通知') { r[7] = '已通知'; r[8] = day; n++; } });
      rg.setValues(v);
      log_(name, '通知售票窗口', n + ' 筆鎖位紀錄標為已通知');
    }
    return loadVenue(name);
  } finally { lock.releaseLock(); }
}

/* ---------- 原本的數顏色公式（保留，座位圖統計會用到） ---------- */
function countColoredCells(countRange, colorRef) {
  // 用法：=countcoloredcells(座位範圍, 顏色參考格, [任意數字])
  // 第三個參數只是讓試算表重新計算用；標了「不售」註記的座位不會算進去
  var activeSht = SpreadsheetApp.getActiveSheet();
  var m = String(SpreadsheetApp.getActiveRange().getFormula()).match(COUNT_FN);
  if (!m) return 0;
  var rg = activeSht.getRange(m[1].replace(/\s+/g, ''));
  var bgs = rg.getBackgrounds(), notes = rg.getNotes();
  var color = activeSht.getRange(m[2]).getBackground();
  var NFS = NOT_FOR_SALE;
  try { NFS = notForSale_(); } catch (e) {}
  var n = 0;
  for (var i = 0; i < bgs.length; i++) for (var k = 0; k < bgs[i].length; k++) {
    if (bgs[i][k] != color) continue;
    var nt = notes[i][k];
    if (nt && NFS.some(function (t) { return nt === t || nt.indexOf(t + '：') === 0; })) continue;
    n++;
  }
  return n;
}

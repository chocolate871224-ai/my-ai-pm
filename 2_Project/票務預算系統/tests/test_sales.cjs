// Minimal SpreadsheetApp mock to exercise saveSales / origColors_ / writeSaleSummary_ / keepStatusColor_
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');

const colL = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const parseA1 = a => { const m = a.match(/^([A-Z]+)(\d+)$/); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [+m[2], c]; };

function makeSheet(name, R, C) {
  const bg = [...Array(R)].map(() => Array(C).fill('#ffffff'));
  const val = [...Array(R)].map(() => Array(C).fill(''));
  const fx = [...Array(R)].map(() => Array(C).fill(''));
  const sh = {
    name, bg, val, fx, frozen: 0,
    getName: () => name, getMaxRows: () => R, getMaxColumns: () => C,
    getLastColumn: () => C,
    getLastRow: () => { for (let r = R - 1; r >= 0; r--) if (val[r].some(v => v !== '')) return r + 1; return 0; },
    getRange(a, b, nr, nc) {
      let r, c;
      if (typeof a === 'string') { if (a === 'A:Z') return { setNumberFormat() {} }; [r, c] = parseA1(a); nr = nc = 1; }
      else { r = a; c = b; nr = nr || 1; nc = nc || 1; }
      const cells = f => [...Array(nr)].map((_, i) => [...Array(nc)].map((_, j) => f(r - 1 + i, c - 1 + j)));
      return {
        getRow: () => r, getColumn: () => c,
        getA1Notation: () => colL(c) + r,
        getBackground: () => bg[r - 1][c - 1],
        getBackgrounds: () => cells((i, j) => bg[i][j]),
        getValues: () => cells((i, j) => val[i][j]),
        getDisplayValues: () => cells((i, j) => String(val[i][j])),
        getFormulas: () => cells((i, j) => fx[i][j]),
        setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { val[r - 1 + i][c - 1 + j] = x; })); },
        clearContent() { cells((i, j) => { val[i][j] = ''; }); },
        setFormula(f) { fx[r - 1][c - 1] = f; },
      };
    },
    notes: {},
    getRangeList(list) { return { setBackground(col) { list.forEach(a => { const [r, c] = parseA1(a); bg[r - 1][c - 1] = col; }); }, setNote(t) { list.forEach(a => { sh.notes[a] = t; }); }, clearNote() { list.forEach(a => { delete sh.notes[a]; }); } }; },
    appendRow(h) { const r = sh.getLastRow(); h.forEach((x, j) => { val[r][j] = x; }); },
    setFrozenRows() {},
  };
  return sh;
}

const sheets = {};
const SS = {
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet(n, 200, 20)),
  getName: () => 'test',
};
global.SpreadsheetApp = { getActiveSpreadsheet: () => SS, flush() {} };
global.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock() {} }) };
global.Session = { getActiveUser: () => ({ getEmail: () => 'me@test' }) };
global.Utilities = { formatDate: (d, tz, f) => f === 'yyyy-MM-dd' ? '2026-11-13' : '2026/11/13 10:00:00' };
const PROPS = {};
const propStore = { getProperty: k => (k in PROPS ? PROPS[k] : null), setProperty: (k, v) => { PROPS[k] = v; } };
global.PropertiesService = { getScriptProperties: () => propStore, getDocumentProperties: () => propStore };
global.HtmlService = {};

// sales tab: legend header at row 1 (該區票房 in col F), two price rows with countcoloredcells, seat grid at rows 10-11
const tab = makeSheet('票券銷售及鎖位', 30, 30);
sheets[tab.name] = tab;
tab.val[0][5] = '該區票房';
tab.fx[1][3] = '=countcoloredcells(B10:E11, B2)'; tab.bg[1][1] = '#e06666'; tab.val[1][4] = '$5,680';
tab.fx[2][3] = '=countcoloredcells(B10:E11, B3)'; tab.bg[2][1] = '#4a86e8'; tab.val[2][4] = '$1,680';
tab.val[3][6] = 'KEEP'; // a non-legend row in the summary columns must stay untouched
for (let c = 1; c <= 4; c++) { tab.bg[9][c] = '#e06666'; tab.bg[10][c] = '#4a86e8'; }

const fn = new Function(src + '\nreturn {saveSales, origColors_, keepStatusColor_, saveAll};')();
let lastLoad = null;
global.loadVenue = n => (lastLoad = n, 'LOADED');
// override loadVenue inside the module scope by re-evaluating with a stub
const mod = new Function(src.replace(/function loadVenue\(name\) \{/, 'function loadVenue(name) { return "LOADED:" + name;') + '\nreturn {saveSales, origColors_, keepStatusColor_, saveAll, getRev, saveTags, getTags_, notForSale_};')();

const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)); process.exitCode = 1; } else console.log('ok  ', msg); };

// 1. sell B10, C10 (red $5680); lock B11 (blue $1680); vip C11
mod.saveSales('票券銷售及鎖位', [
  [10, 2, '已售', '', 'A', 1, 1, 5680, ''],
  [10, 3, '已售', '', 'A', 1, 2, 5680, ''],
  [11, 2, '策略鎖位', '推高票價', 'B', 2, 1, 1680, ''],
  [11, 3, '貴賓保留', '市政府', 'B', 2, 2, 1680, ''],
], [['策略鎖位', '推高票價', 'B 第2排', 1]], '', []);
eq([tab.bg[9][1], tab.bg[9][2], tab.bg[10][1], tab.bg[10][2], tab.bg[9][3]], ['#2e2d36', '#2e2d36', '#d9a92f', '#2ba36e', '#e06666'], 'cells painted with status colours, others untouched');
eq(mod.origColors_('票券銷售及鎖位'), { '10,2': '#e06666', '10,3': '#e06666', '11,2': '#4a86e8', '11,3': '#4a86e8' }, 'original colours remembered');
eq(mod.origColors_('票價座位'), {}, 'baseline tab has no overrides');
eq([tab.val[0][6], tab.val[0][7], tab.val[0][8]], ['已售', '策略鎖位', '貴賓保留'], 'summary header written');
eq([tab.val[1].slice(6, 9), tab.val[2].slice(6, 9)], [[2, 0, 0], [0, 1, 1]], 'summary counts per price');
eq(tab.val[3][6], 'KEEP', 'non-legend row untouched');
eq(sheets['每日售出'].val[1].slice(0, 6), ['2026-11-13', '票券銷售及鎖位', 5680, 2, 0, 2], 'daily sold recorded');

// 2. selling a sold seat again as lock must fail
let threw = false; try { mod.saveSales('票券銷售及鎖位', [[10, 2, '策略鎖位', 'x', 'A', 1, 1, 5680, '已售']], [], '', []); } catch (e) { threw = true; }
eq(threw, true, 'sold seat cannot be locked');

// 3. refund B10, release B11 -> colours restored, records removed
mod.saveSales('票券銷售及鎖位', [[10, 2, '', '', 'A', 1, 1, 5680, '已售'], [11, 2, '', '', 'B', 2, 1, 1680, '策略鎖位']], [['釋出', '改回可售', 'B', 1]], '', []);
eq([tab.bg[9][1], tab.bg[10][1]], ['#e06666', '#4a86e8'], 'refund/release restores price colour');
eq(Object.keys(mod.origColors_('票券銷售及鎖位')).sort(), ['10,3', '11,3'], 'records removed after refund/release');
eq([tab.val[1].slice(6, 9), tab.val[2].slice(6, 9)], [[1, 0, 0], [0, 0, 1]], 'summary updated');
eq(sheets['每日售出'].val[1].slice(3, 6), [2, 1, 1], 'refund counted in daily');

// 4. re-pricing on the sales tab: sold seat C10 keeps dark colour, its stored price colour changes; free seat D10 repainted
mod.saveAll('票券銷售及鎖位', [[10, 3, '#4a86e8'], [10, 4, '#4a86e8']], [], '', []);
eq([tab.bg[9][2], tab.bg[9][3]], ['#2e2d36', '#4a86e8'], 'sold seat keeps status colour, free seat repriced');
eq(mod.origColors_('票券銷售及鎖位')['10,3'], '#4a86e8', 'stored price colour updated');

// 5. baseline tab: sales do not paint
const base = makeSheet('票價座位', 30, 30); sheets[base.name] = base; base.bg[9][1] = '#e06666';
mod.saveSales('票價座位', [[10, 2, '已售', '', 'A', 1, 1, 5680, '']], [], '', []);
eq(base.bg[9][1], '#e06666', 'baseline tab colours never change');

// 6. every save stamps a revision for the tab it touched (used by the 20-second auto refresh)
const r1 = mod.getRev('票券銷售及鎖位');
eq(typeof r1.t === 'number' && r1.t > 0 && /席/.test(r1.what), true, 'save stamps a revision for that tab');
eq(mod.getRev('不存在的分頁'), { t: 0 }, 'untouched tab has no revision');

// 7. note categories: rename updates note rows + cell notes, in-use delete is refused, sell flag feeds the counter
const ns = makeSheet('座位註記', 30, 12); sheets[ns.name] = ns;
['座位圖分頁','列','欄','儲存格','區域','排','號','註記','說明','更新者','更新時間'].forEach((h, j) => { ns.val[0][j] = h; });
[['票券銷售及鎖位', 10, 2, 'B10', 'A', 1, 1, '貴賓保留', '主辦'], ['票券銷售及鎖位', 10, 3, 'C10', 'A', 1, 2, '撤位', '']].forEach((r, i) => r.forEach((v, j) => { ns.val[i + 1][j] = v; }));
eq(mod.getTags_().map(t => t.k), ['撤位', '貴賓保留', '公關／贊助保留', '待確認'], 'default categories');
const T = mod.getTags_().map(t => t.k === '貴賓保留' ? { ...t, k: '主辦貴賓' } : t);
mod.saveTags(T.concat([{ k: '攝影機位', sell: false, color: '#db2777', style: 'x' }]), [['貴賓保留', '主辦貴賓']]);
eq(ns.val[1][7], '主辦貴賓', 'rename updates the note row');
eq(tab.notes['B10'], '主辦貴賓：主辦', 'rename updates the cell note');
eq(mod.notForSale_().includes('攝影機位') && mod.notForSale_().includes('主辦貴賓'), true, 'new not-for-sale category counted');
let refused = false; try { mod.saveTags(mod.getTags_().filter(t => t.k !== '撤位'), []); } catch (e) { refused = /撤位/.test(e.message); }
eq(refused, true, 'deleting a category still in use is refused');
mod.saveTags(mod.getTags_().concat([{ k: '媒體高台', sell: true, color: '#e11d48', style: 'fade' }, { k: '貴賓高台', sell: true, color: '#eab308', style: 'fill' }]), []);
const sty = Object.fromEntries(mod.getTags_().map(t => [t.k, t.style]));
eq([sty['媒體高台'], sty['貴賓高台'], sty['撤位']], ['fill', 'fill', 'x'], 'old fade becomes fill, fill is kept');
// 已分類的白色座位：儲存時塗成分類顏色、拿掉分類改回白色；有票價的座位不動
tab.bg[11][1] = '#ffffff'; tab.bg[11][2] = '#ffffff';
mod.saveAll('票券銷售及鎖位', [], [[12, 2, '媒體高台', '', 'A', 3, 1], [12, 3, '貴賓高台', '', 'A', 3, 2], [10, 5, '媒體高台', '', 'A', 1, 4]]);
eq([tab.bg[11][1], tab.bg[11][2], tab.bg[9][4]], ['#e11d48', '#eab308', '#e06666'], 'white noted seats painted, priced seat kept');
mod.saveTags(mod.getTags_().map(t => t.k === '媒體高台' ? { ...t, color: '#be123c' } : t), []);
eq(tab.bg[11][1], '#be123c', 'category colour change repaints its seats');
mod.saveAll('票券銷售及鎖位', [], [[12, 2, '', '', 'A', 3, 1]]);
eq([tab.bg[11][1], tab.bg[11][2]], ['#ffffff', '#eab308'], 'clearing the note turns the seat white again');

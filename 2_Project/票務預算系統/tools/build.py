"""Build every deliverable from src/.

src/Index.html  one source for the front end (body only, includes demo data)
src/Code.gs     Apps Script backend

dist/gas/Index.html     -> paste into Apps Script (full page, demo data removed)
dist/gas/Code.gs        -> paste into Apps Script
dist/copy-page.html     -> publish to the "Apps Script 程式碼複製" artifact

Usage:  python3 -I tools/build.py ["note shown on the copy page"]
"""
import base64
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / 'src', ROOT / 'dist'

GAS_HEAD = (
    '<!DOCTYPE html>\n'
    '<html lang="zh-Hant"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);'
    'padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}'
    'body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}'
    'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n'
)
DEMO_TITLE = '<title>高雄巨蛋票區規劃</title>'
GAS_TITLE = '<title>Ticket &amp; Seat</title>'
DEMO_ONLY = ('const MOCK=', 'const BUDGET=')  # demo data lines, not needed inside Apps Script
DEFAULT_NOTE = ('Code.gs 和 Index.html 兩個檔案都要整份換掉。Code.gs 全選刪掉後貼上，開頭是 <code>/**</code>。'
                '存檔後到「管理部署作業」› 鉛筆 › 版本選「新版本」›「部署」。')


def main():
    index = (SRC / 'Index.html').read_text(encoding='utf-8')
    code = (SRC / 'Code.gs').read_text(encoding='utf-8')
    if not index.startswith(DEMO_TITLE):
        raise SystemExit('src/Index.html must start with ' + DEMO_TITLE)

    # syntax check: backend and the front-end script
    for name, js in (('Code.gs', code), ('Index.html script', index.rsplit('<script>', 1)[1].split('</script>')[0])):
        tmp = DIST / '_check.js'
        DIST.mkdir(exist_ok=True)
        tmp.write_text(js, encoding='utf-8')
        r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
        tmp.unlink()
        if r.returncode:
            raise SystemExit(f'syntax error in {name}:\n{r.stderr}')

    gas_index = GAS_HEAD + GAS_TITLE + index[len(DEMO_TITLE):]
    gas_index = '\n'.join(l for l in gas_index.split('\n') if not l.startswith(DEMO_ONLY))
    if not gas_index.rstrip().endswith('</body></html>'):
        gas_index = gas_index.rstrip('\n') + '\n</body></html>\n'

    gas = DIST / 'gas'
    gas.mkdir(parents=True, exist_ok=True)
    for old in gas.iterdir():  # clasp pushes everything in dist/gas, so leftovers would become extra script files
        if old.is_file():
            old.unlink()
    (gas / 'Index.html').write_text(gas_index, encoding='utf-8')
    (gas / '程式碼.gs').write_text(code, encoding='utf-8')  # same file name as in the Apps Script editor
    # clasp push needs the project manifest (web-app settings, scopes); it is pulled once from Apps Script
    manifest = SRC / 'appsscript.json'
    if manifest.exists():
        shutil.copyfile(manifest, DIST / 'gas' / 'appsscript.json')
    else:
        print('warning: src/appsscript.json missing, clasp push will not work until it is pulled')

    b64 = lambda t: base64.b64encode(t.encode('utf-8')).decode()
    page = (ROOT / 'tools' / 'copy-page.template.html').read_text(encoding='utf-8')
    note = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_NOTE
    page = page.replace('{{INDEX_B64}}', b64(gas_index)).replace('{{CODE_B64}}', b64(code)).replace('{{NOTE}}', note)
    (DIST / 'copy-page.html').write_text(page, encoding='utf-8')

    print(f'built dist/  gas Index {len(gas_index):,} | Code.gs {len(code):,}')


if __name__ == '__main__':
    main()

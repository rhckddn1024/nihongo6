"""Render every day's worksheet to app/pdf/day-NN.pdf (A4) with headless Chrome."""
import pathlib, sys
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).parent
src = (root / 'dist' / 'index.html').resolve()
out = root / 'app' / 'pdf'
out.mkdir(parents=True, exist_ok=True)
days = int(sys.argv[1]) if len(sys.argv) > 1 else 43

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for i in range(days):
        n = f'{i + 1:02d}'
        pg = b.new_page()
        pg.goto(f'{src.as_uri()}#ws=day-{i + 1}')
        pg.wait_for_selector('.ws')
        pg.evaluate('document.fonts.ready')
        pg.emulate_media(media='print')
        pg.pdf(path=str(out / f'day-{n}.pdf'), format='A4', print_background=True, prefer_css_page_size=True)
        pg.close()
    b.close()
print('ok', days)

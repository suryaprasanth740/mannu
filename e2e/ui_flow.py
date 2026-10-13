import os, struct, zlib, time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://localhost:5000')
OUT = os.environ.get('SHOTS_DIR', 'e2e-shots')
os.makedirs(OUT, exist_ok=True)

def png(path, w=240, h=180):
    raw = b''.join(b'\x00' + bytes([200, 60 + (y % 120), 40]) * w for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)

png('test-photo.png')  # generated sample image for the upload step
errors = []
uniq = str(int(time.time()))[-6:]

with sync_playwright() as p:
    b = p.chromium.launch()
    def page():
        c = b.new_context(viewport={'width': 1300, 'height': 900})
        pg = c.new_page()
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'TUNNEL' not in m.text and 'fonts' not in m.text else None)
        pg.on('dialog', lambda d: d.accept())
        return pg

    def login(pg, email):
        pg.goto(BASE + '/login'); pg.fill('#email', email); pg.fill('#password', 'Mannu@2026'); pg.click('form button.btn-primary'); pg.wait_for_timeout(800)
        pg.evaluate("localStorage.setItem('mannu_lang','en')"); pg.reload(); pg.wait_for_timeout(600)

    # 1. Farmer adds a product with a photo and bulk price
    f = page(); login(f, 'lakshmi@mannu.in')
    f.goto(BASE + '/farmer/products/new')
    f.click('text=Save product'); f.wait_for_timeout(300)
    assert f.locator('[role=alert]').count() > 0, 'validation message expected'
    f.fill('#pf-name', f'Okra {uniq}')
    f.select_option('#pf-cat', label='🥕 Vegetables')
    f.fill('#pf-price', '50'); f.fill('#pf-stock', '30'); f.fill('#pf-min', '0.5')
    f.click('text=Add a bulk price'); f.fill('#bt-q-0', '5'); f.fill('#bt-p-0', '44')
    f.set_input_files('input[type=file]', 'test-photo.png')
    f.click('text=Save product'); f.wait_for_timeout(1500)
    assert '/farmer/products' in f.url and 'new' not in f.url, f.url
    expect(f.locator(f'text=Okra {uniq}')).to_be_visible()
    src = f.locator('ul li img').first.get_attribute('src')
    assert src and src.startswith('/uploads/'), src
    print('farmer product + photo OK', src)

    # 2. Customer finds it, buys 6 kg (bulk price), picks pickup, places order
    c = page(); login(c, 'customer@mannu.in')
    c.goto(BASE + f'/shop?q=Okra%20{uniq}'); c.wait_for_timeout(800)
    c.click('article a >> nth=0'); c.wait_for_timeout(800)
    for _ in range(11): c.click('button[aria-label=Increase]')
    expect(c.locator('text=6 kg').first).to_be_visible()
    c.click('button:has-text("Add to cart")')
    c.goto(BASE + '/cart'); c.wait_for_timeout(800)
    expect(c.locator('text=Bulk price applied')).to_be_visible()
    c.click('button[role=radio]:has-text("Pickup")'); c.wait_for_timeout(700)
    c.click('button:has-text("Checkout")'); c.wait_for_timeout(1000)
    expect(c.locator('text=Pay at pickup')).to_be_visible()
    c.click('button:has-text("Place order")'); c.wait_for_timeout(1500)
    expect(c.locator('text=Order placed')).to_be_visible()
    print('customer checkout OK', c.locator('text=To pay').locator('..').inner_text().replace('\n', ' '))

    # 3. Farmer accepts → packed → ready → picked up → payment recorded
    f.goto(BASE + '/farmer/orders?view=new'); f.wait_for_timeout(800)
    card = f.locator('article', has_text=f'Okra {uniq}')
    card.locator('button:has-text("Accept order")').click(); f.wait_for_timeout(800)
    f.goto(BASE + '/farmer/orders?view=active'); f.wait_for_timeout(800)
    card = f.locator('article', has_text=f'Okra {uniq}')
    for label in ['Packed', 'Ready for pickup']:
        card.locator(f'button:has-text("Mark as {label}")').click(); f.wait_for_timeout(700)
    card.locator('button:has-text("I received the payment")').click(); f.wait_for_timeout(700)
    card.locator('button:has-text("Mark as Picked up")').click(); f.wait_for_timeout(700)
    f.goto(BASE + '/farmer/products'); f.wait_for_timeout(700)
    row = f.locator('li', has_text=f'Okra {uniq}')
    assert '24 kg' in row.inner_text(), row.inner_text()
    print('farmer fulfilment OK, stock now 24 kg')

    # 3b. Notifications reached both sides; farmer uploads a farm cover photo
    f.goto(BASE + '/farmer'); f.wait_for_timeout(600)
    f.click('button[aria-label^="Notifications"]'); f.wait_for_timeout(500)
    expect(f.locator('text=New order').first).to_be_visible()
    f.goto(BASE + '/farmer/farm'); f.wait_for_timeout(800)
    f.set_input_files('input[type=file] >> nth=0', 'test-photo.png'); f.wait_for_timeout(1200)
    cover = f.locator('section.panel img').first.get_attribute('src')
    assert cover and cover.startswith('/uploads/farms-'), cover
    print('notifications + farm cover OK')

    # 4. Customer was notified, rates it, and orders it again
    c.goto(BASE + '/'); c.wait_for_timeout(600)
    c.click('button[aria-label^="Notifications"]'); c.wait_for_timeout(500)
    expect(c.locator('text=Picked up').first).to_be_visible()
    c.goto(BASE + '/orders'); c.wait_for_timeout(1000)
    oc = c.locator('article', has_text=f'Okra {uniq}')
    expect(oc.locator('text=Picked up').first).to_be_visible()
    oc.locator('button:has-text("Rate")').click()
    c.click('button[role=radio][aria-label="5"]'); c.fill('#rv', 'Tender and fresh'); c.click('text=Save rating'); c.wait_for_timeout(800)
    expect(oc.locator('text=5/5')).to_be_visible()
    c.screenshot(path=f'{OUT}/19-orders-after.png', full_page=False)
    print('review OK')
    oc.locator('button:has-text("Order again")').click(); c.wait_for_timeout(1200)
    assert c.url.endswith('/cart'), c.url
    expect(c.locator(f'text=Okra {uniq}')).to_be_visible()
    print('order again OK')
    c.goto(BASE + '/season'); c.wait_for_timeout(800)
    expect(c.locator('h1')).to_contain_text('Harvest calendar')

    # 5. New farmer registers → pending; admin approves
    n = page()
    n.goto(BASE + '/register?role=farmer')
    n.fill('#r-name', 'Test Farmer'); n.fill('#r-email', f'tf{uniq}@example.com'); n.fill('#r-phone', '9123456780'); n.fill('#r-pass', 'abc')
    n.click('text=Create account'); n.wait_for_timeout(300)
    assert n.locator('text=At least 8 characters').count() >= 1
    n.fill('#r-pass', 'Harvest2026'); n.fill('#r-farm', f'Hosur Greens {uniq}'); n.fill('#r-village', 'Hosur'); n.fill('#r-district', 'Krishnagiri'); n.select_option('#r-state', 'Tamil Nadu'); n.fill('#r-pin', '635109')
    n.click('text=Create account'); n.wait_for_timeout(1500)
    expect(n.locator('text=Your farm is waiting for verification')).to_be_visible()
    a = page(); login(a, 'admin@mannu.in')
    a.goto(BASE + '/admin/farmers?status=pending'); a.wait_for_timeout(800)
    a.locator('li', has_text=f'Hosur Greens {uniq}').locator('button:has-text("Approve")').click(); a.wait_for_timeout(800)
    n.reload(); n.wait_for_timeout(1200)
    assert n.locator('text=Your farm is waiting for verification').count() == 0
    print('registration + verification OK')

    # 6. Language switch
    c.goto(BASE + '/')
    c.click('button[aria-label=Language]'); c.click('role=option[name="தமிழ்"]'); c.wait_for_timeout(500)
    expect(c.locator('h1')).to_contain_text('விவசாயி')
    print('language switch OK')
    b.close()

print('ERRORS:', errors)

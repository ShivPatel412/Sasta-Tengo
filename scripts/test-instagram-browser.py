"""Synthetic local browser check; receives a short-lived test session via environment."""
import os,io,zipfile,re
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    context.add_cookies([{'name':'shiv_admin','value':os.environ['STUDIO_TEST_SESSION'],'url':'http://localhost:3001','httpOnly':True,'sameSite':'Lax'}])
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://localhost:3001/dashboard/instagram')
    page.get_by_role('heading',name=re.compile('Your photos')).wait_for(timeout=20000)
    studio=page.get_by_role('region',name='Instagram AI Studio')
    assert studio.get_by_role('navigation',name='Instagram Studio sections').get_by_role('button').count()==8
    studio.get_by_role('button',name='Photo Library',exact=True).click()
    page.locator('.ig-photo').first.wait_for()
    assert page.locator('.ig-photo').count()>=2
    assert not studio.get_by_role('button',name='Google Drive · setup needed').is_enabled()
    # Repeat an existing synthetic test photo through the actual browser upload UI.
    path=Path('.local/studio-upload-test.png').resolve()
    page.locator('.ig-file input[type=file]').set_input_files(str(path))
    page.get_by_text('exact duplicate · reused',exact=True).wait_for(timeout=30000)
    studio.get_by_role('button',name='Drafts',exact=True).click()
    page.locator('.ig-draft').first.click()
    page.get_by_label('Caption',exact=True).wait_for()
    assert page.get_by_label('Caption',exact=True).input_value()=='New manual edit'
    page.get_by_label('Caption',exact=True).fill('Browser verified caption')
    studio.get_by_role('button',name='Save draft',exact=True).click()
    page.get_by_text('Draft saved privately. Nothing was published.',exact=True).wait_for()
    studio.get_by_role('button',name='Drafts',exact=True).click()
    page.locator('.ig-draft').first.click()
    assert page.get_by_label('Caption',exact=True).input_value()=='Browser verified caption'
    assert page.locator('.ig-sequence li').count()==2
    page.get_by_role('button',name='Move photo 2 earlier').click()
    assert page.get_by_role('button',name='Undo',exact=True).is_enabled()
    page.get_by_role('button',name='Undo',exact=True).click()
    sequence=page.locator('.ig-sequence li')
    first=sequence.first.locator('img').get_attribute('src')
    sequence.first.drag_to(sequence.nth(1))
    assert sequence.first.locator('img').get_attribute('src')!=first
    page.get_by_role('button',name='Undo',exact=True).click()
    with page.expect_download() as pending:
        page.get_by_role('button',name='Export images',exact=True).click()
    downloaded=pending.value.path()
    with zipfile.ZipFile(downloaded) as archive:
        assert archive.namelist()==['01.jpg','02.jpg']
        for name in archive.namelist():
            im=Image.open(io.BytesIO(archive.read(name)))
            assert im.format=='JPEG' and not im.getexif()
    page.screenshot(path='.local/instagram-studio-desktop.png',full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Phone layout overflows'
    page.screenshot(path='.local/instagram-studio-mobile.png',full_page=True)
    studio.get_by_role('button',name='Photo Library',exact=True).click()
    page.locator('.ig-file input[type=file]').set_input_files(str(path))
    page.get_by_text('exact duplicate · reused',exact=True).wait_for(timeout=30000)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    print('PASS: eight Studio sections, browser upload/dedupe, disabled unconfigured Drive, saved draft reopen, manual ordering/undo, ZIP JPEG export without EXIF, 390px layout and no browser errors. Phone layout is emulated, not a physical-device test.')
    browser.close()

"""Assemble current render + current rationales + the unchanged last 22 historical pages.
Works from the existing standalone v12 deliverable; never needs removed v11 sources.
"""
from pathlib import Path
import hashlib
import json
import fitz

root = Path(__file__).resolve().parent.parent
final = root / 'ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Source_Aligned.pdf'
core_path = root / 'work/Color-Play_v12_Current_Core.pdf'
notes_path = root / 'work/Color-Play_v12_Current_Rationales.pdf'
page_map = json.loads((root / 'work/rubric-page-map.json').read_text())

def fingerprints(doc, start):
    return [(p.get_text(), hashlib.sha256(p.get_pixmap(matrix=fitz.Matrix(.5, .5), alpha=False).samples).hexdigest()) for p in list(doc)[start:]]

with fitz.open(final) as previous, fitz.open(core_path) as core, fitz.open(notes_path) as notes:
    assert len(core) == page_map['corePages'] == 26
    assert len(notes) == page_map['rationalePages'] == 9
    before = fingerprints(previous, len(previous) - 22)
    merged = fitz.open()
    merged.insert_pdf(core)
    merged.insert_pdf(notes)
    historical_start = len(merged)
    merged.insert_pdf(previous, from_page=len(previous) - 22)
    toc = [[1, 'Current dossier · eight deliverables', 1]]
    toc += [[2, f"{p['label']} · {p['title']}", p['page']] for p in page_map['slides']]
    toc += [[1, 'Appendix G · Current decision rationales', len(core) + 1],
            [1, 'Appendix H · Historical sources (unchanged)', historical_start + 1],
            [1, 'Appendix I · Historical teacher feedback (unchanged)', historical_start + 21]]
    merged.set_toc(toc)
    merged.set_metadata({'title': 'Color-Play · Product Management Dossier v12 · Rubric-aligned',
                         'author': 'Nicolas Inostrosa · Valeria Ravanal · Rocio Torres',
                         'subject': 'Eight deliverables; current plan and assumption log; historical sources preserved'})
    temporary = final.with_suffix('.rubric-update.pdf')
    merged.save(temporary, garbage=4, deflate=True)
    merged.close()
with fitz.open(temporary) as check:
    assert len(check) == 57
    assert fingerprints(check, historical_start) == before, 'Historical text / rendering changed'
    assert 'One-Page Business Plan' in check[15].get_text()
    assert 'Apparel Merchandising / Buying' in check[15].get_text().replace('\n', ' ')
    assert 'Assumption Log' in check[16].get_text()
    assert 'Assumption Log' in check[17].get_text()
temporary.replace(final)
core_path.unlink()
notes_path.unlink()
print('PDF: 57 pages = 26 current + 9 rationales + 22 historical; historical text and rendered pixels unchanged.')

"""Replace the 22 current-presentation pages with the co-branded render.
Pages 23–52 are retained byte-for-byte as existing PDF pages, including rationale and historical material.
"""
from pathlib import Path
import fitz

root = Path(__file__).resolve().parent.parent
final = root / 'ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Source_Aligned.pdf'
core = root / 'work/Color-Play_v12_Logo_Core.pdf'
temporary = final.with_suffix('.logo-update.pdf')

current = fitz.open(final)
replacement = fitz.open(core)
assert replacement.page_count == 22, replacement.page_count
assert current.page_count == 52, current.page_count

merged = fitz.open()
merged.insert_pdf(replacement)
merged.insert_pdf(current, from_page=22)
assert merged.page_count == 52
merged.save(temporary, garbage=4, deflate=True)
merged.close()
replacement.close()
current.close()
temporary.replace(final)
print(f'Updated {final.name}: first 22 pages co-branded; pages 23–52 preserved.')

"""Replace the old Color—Play text mark in PDF rationale headers with the supplied Color logo."""
from pathlib import Path
import fitz

root = Path(__file__).resolve().parent.parent
pdf_path = root / 'ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Source_Aligned.pdf'
logo_path = root / 'ENTREGA_FINAL_v12/Logo_Color.png'
temporary = pdf_path.with_suffix('.rationale-logo-update.pdf')

pdf = fitz.open(pdf_path)
assert pdf.page_count == 52, pdf.page_count
# PDF pages 23–30 are Appendix G speaker rationales. Coordinates are in 16:9 PDF points.
for index in range(22, 30):
    page = pdf[index]
    page.draw_rect(fitz.Rect(1018, 25, 1110, 62), color=None, fill=(1, 1, 1), overlay=True)
    page.insert_image(fitz.Rect(1034, 35, 1104, 56), filename=logo_path, keep_proportion=True, overlay=True)
pdf.save(temporary, garbage=4, deflate=True)
pdf.close()
temporary.replace(pdf_path)
print('Replaced Color—Play text wordmarks on PDF rationale pages 23–30 with the supplied Color logo.')

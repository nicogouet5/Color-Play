"""Assemble current presentation + regenerated notes + unchanged historical source pages."""
from pathlib import Path
import fitz
import hashlib
import json
import re
import base64
import html

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'ENTREGA_FINAL_v12'
core=fitz.open(ROOT/'work/Color-Play_v12_Core.pdf')
notes=fitz.open(ROOT/'work/Color-Play_v12_Notes.pdf')
original=fitz.open(ROOT/'ENTREGA_FINAL_v11/Color-Play_Certamen_II_Dossier_v11_Source_Aligned.pdf')
assert len(core)==22 and len(notes)==8 and len(original)==48
final=fitz.open()
final.insert_pdf(core)
final.insert_pdf(notes)
# Original source intro, seven source PDFs, and feedback transcript; no changes to source artifacts.
final.insert_pdf(original,from_page=26,to_page=47)
final.set_metadata({'title':'Color-Play · Product Management Dossier v12','author':'Nicolas Inostrosa · Valeria Ravanal · Rocio Torres','subject':'Retail color guidance · Proposed apparel buyer / Makeup champion DMU · v12 visual redesign','keywords':'Color-Play, retail, colorimetry, DMU, Merchandising, Makeup, Product Management'})
toc=[]
current_html=(OUT/'Color-Play_Certamen_II_Dossier_v12_Standalone.html').read_text()
headings=re.findall(r'<h[12]>(.*?)</h[12]>',current_html,re.S)
for i,heading in enumerate(headings):
    heading=html.unescape(re.sub('<[^>]+>',' ',heading))
    heading=' '.join(heading.split())
    toc.append([1,f'{i+1:02d} · {heading}',i+1])
toc.extend([[1,'Appendix G · Current speaker rationales',23],[1,'Appendix H · Historical original sources (verbatim)',31],[1,'Appendix I · Teacher feedback (verbatim)',51]])
final.set_toc(toc)
path=OUT/'Color-Play_Certamen_II_Dossier_v12_Source_Aligned.pdf'
final.save(path,garbage=4,deflate=True)
final.close()

# Provenance: embedded source PDFs must be byte-identical to v11, not merely text equivalent.
a=(ROOT/'ENTREGA_FINAL_v11/Color-Play_Certamen_II_Dossier_v11_Standalone.html').read_text()
b=(OUT/'Color-Play_Certamen_II_Dossier_v12_Standalone.html').read_text()
def pdfs(s):
    return [hashlib.sha256(base64.b64decode(m)).hexdigest() for m in re.findall(r'data:application/pdf;base64,([A-Za-z0-9+/=]+)',s)]
assert pdfs(a)==pdfs(b), 'Embedded source PDFs changed'
with fitz.open(path) as check:
    assert len(check)==52
    for i in range(22):
        assert check[30+i].get_text()==original[26+i].get_text(), f'Original page {i} changed'
    texts=[p.get_text() for p in check]
    assert 'Apparel Merchandising' in texts[4] and 'Makeup / Beauty' in texts[4]
    core_text='\n'.join(texts[:22])
    assert 'CX / omnichannel buyer' not in core_text
    assert 'Buyer: CX' not in core_text
    assert '442,200' in core_text and '660,000' in core_text
    check[0].get_pixmap(matrix=fitz.Matrix(1,1)).save(OUT/'Vista_previa_portada.png')
    check[4].get_pixmap(matrix=fitz.Matrix(1,1)).save(OUT/'Vista_previa_DMU.png')
proof={'pdf_pages':52,'main_slides':16,'appendices_A_F':6,'speaker_rationale_pages':8,'historical_source_and_feedback_pages':22,'embedded_source_pdfs':len(pdfs(b)),'embedded_pdf_hashes_unchanged':True,'historical_pdf_text_unchanged':True,'original_html_sha256':hashlib.sha256(a.encode()).hexdigest(),'new_html_sha256':hashlib.sha256(b.encode()).hexdigest(),'pdf_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(ROOT/'work/provenance-v12.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof,indent=2))

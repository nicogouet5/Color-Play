"""Rebuild v12 from immutable v11. Standard-library only; keeps embedded source PDFs."""
from pathlib import Path
import base64
import html
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'ENTREGA_FINAL_v12'
OUT.mkdir(exist_ok=True)
source = (ROOT / 'ENTREGA_FINAL_v11/Color-Play_Certamen_II_Dossier_v11_Standalone.html').read_text()
sections = re.findall(r'<section\b.*?</section>', source, re.S)
assert len(sections) == 21
images = re.findall(r"url\('(data:image/[^']+)'\)", source)
assert len(images) >= 2
font = 'data:font/ttf;base64,' + base64.b64encode((ROOT / 'work/Manrope.ttf').read_bytes()).decode()
css = (ROOT / 'work/redesign.css').read_text().replace('__FONT__', font).replace('__PHOTO2__', images[1])
css += '\n' + (ROOT / 'work/border-motion.css').read_text()
js = (ROOT / 'work/redesign.js').read_text() + '\n' + (ROOT / 'work/border-motion.js').read_text()

replacements = {
 'Buyer: CX / omnichannel lead. Neither was surveyed.': 'Buyer: Apparel Merchandising / Buying. Champion: Makeup / Beauty. Neither division has been interviewed [A].',
 '<h3>CX / omnichannel lead</h3><p>Supported by CRM/marketing; requires IT, operations, privacy and procurement approval.</p>': '<h3>Apparel Merchandising / Buying</h3><p>Retail apparel buyers own the proposed commercial case and category scope. Makeup / Beauty champions the broader color-guidance opportunity; CX supports the experience. All roles remain [A].</p>',
 'not a beauty app, perfect diagnosis or autonomous forecast.': 'not a beauty-only app, perfect diagnosis or autonomous forecast. Makeup is a potential later application [A], not the first study.',
 '<b>Approvers:</b> Retail/CX; store ops; privacy/security; finance/procurement; color expert.': '<b>Approvers:</b> Apparel buyer + commercial sponsor; store ops; privacy/security; finance/procurement; color expert. Makeup champions the cross-category case [A].',
 '<b>Approvers:</b> Executive/CX; IT/data/security; privacy/legal; finance/procurement; ops/CRM/transaction owner.': '<b>Approvers:</b> Executive/commercial sponsor + apparel buyer; IT/data/security; privacy/legal; finance/procurement; ops/CRM/transaction owner.',
 'Discovery only; Buyer/CX is most disappointed because differentiation is weak.': 'Discovery only; apparel buyer is most disappointed because differentiation is weak.',
 'No buyer evidence yet.': 'No apparel-buyer or Makeup-champion evidence yet.',
 'No retailer has been interviewed or committed; commercial models remain hypotheses': 'No retailer, apparel buyer or Makeup champion has been interviewed or committed; all DMU roles and commercial models remain [A]',
}

for old in replacements:
    assert old in '\n'.join(sections), f'Missing expected source: {old}'

rebuilt = []
for section in sections:
    for old, new in replacements.items():
        section = section.replace(old,new)
    section = re.sub(r'<div class="eyebrow">.*?</div>', '', section, flags=re.S)
    section = section.replace('<button class="notes-btn">Why this decision?</button>', '<button class="notes-btn">Read rationale</button>')
    # Product wordmark owns the header. Existing team logo remains a quiet attribution.
    section = re.sub(r'(<div class="meta"><span>.*?</span>)(<img class="brand"[^>]*>)(</div>)', r'\1<div class="meta-right"><span class="wordmark">Color<span>—</span>Play</span>\2</div>\3', section)
    if 'id="s1"' in section:
        section = section.replace('<h3>', '<h2>').replace('</h3>', '</h2>')
        figure = f'<figure class="cover-visual"><img src="{images[0]}" alt="Illustrative fashion-store scene: a shopper comparing a fuchsia shirt at a clothing rack."><figcaption><span>Illustrative generated concept image</span><span class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></span></figcaption></figure>'
        section = section.replace('<div class="status">', figure + '<div class="status">',1)
    if 'id="s7"' in section:
        section = section.replace('Demo → scoped pilot → privacy/IT/operations review', 'Apparel buyer → scoped case + commercial sponsor → privacy/IT/operations review')
    if 'id="a2"' in section:
        section = re.sub(r'<h2>.*?</h2>', '<h2>One buying unit. <span class="pink">Different reasons to say yes.</span></h2>',section, count=1,flags=re.S)
        section = section.replace('Appendix B · Stakeholder table','Appendix B · Decision-making unit / stakeholder value')
        section = re.sub(r'<tbody>.*?</tbody>', '''<tbody>
<tr><td><b>Buyer · Apparel Merchandising / Buying [A]</b></td><td>Category performance, relevant stock and a credible pilot case.</td><td>Unproven return, margin pressure and poor merchandise fit.</td><td>Own proposed scope, merchandise shortlist and fee negotiation; confirm actual authority.</td></tr>
<tr><td><b>Champion · Makeup / Beauty [A]</b></td><td>Color guidance applicable to makeup and apparel; cross-category opportunity.</td><td>Being reduced to a beauty-only app or promising untested shade matching.</td><td>Advocate internally, connect beauty specialists and help test the expansion case; no presumed budget authority.</td></tr>
<tr><td><b>Decider · Commercial / category leadership [A]</b></td><td>Strategic fit and acceptable investment.</td><td>Competing priorities and insufficient proof.</td><td>Approve budget and go/no-go with finance; identify the retailer's actual signatory.</td></tr>
<tr><td><b>User · Shopper</b></td><td>Credible, optional guidance and available garments.</td><td>Pressure, unwanted appearance advice and retained personal data.</td><td>Permit rejection; explain uncertainty; separate capture and storage consent.</td></tr>
<tr><td><b>Operator · Store associates / operations [A]</b></td><td>A short, explainable service that fits store routines.</td><td>Added workload and low confidence explaining results.</td><td>Agree staffing, train, time the service and preserve a no-result route.</td></tr>
<tr><td><b>Influencers · CX / omnichannel + color experts [A]</b></td><td>Consistent experience and recommendation quality.</td><td>Misleading advice or a disconnected journey.</td><td>Shape the handoff and quality reference; CX is not the default buyer.</td></tr>
<tr><td><b>Gatekeepers · IT, privacy/legal, procurement [A]</b></td><td>Security, data minimisation and controlled contracting.</td><td>Data misuse, integration risk and vendor lock-in.</td><td>Review access, permissions and vendor terms; may block an unsafe rollout.</td></tr>
</tbody>''', section, count=1, flags=re.S)
        section = section.replace('Stakeholder expectations are planning assumptions pending retailer access','Proposed retailer DMU [A]; no role, budget owner, authority or makeup use case has been confirmed')
        section = re.sub(r'data-note="[^"]*"', 'data-note="The DMU is a proposed buying-group map, not retailer evidence. Apparel Merchandising / Buying is the buyer requested by the team; Makeup / Beauty is the champion because color guidance could extend beyond clothing. Commercial leadership is the proposed final decider, shoppers are beneficiaries/users, associates are operators, CX and experts influence design, and IT/privacy/legal/procurement govern access and contracting. A champion need not control budget. Confirm authority with each retailer. Makeup performance and cross-category demand remain untested [A]."',section,count=1)
    if 'id="a6"' in section:
        section = section.replace('<tr><td>CX / omnichannel discovery</td><td>One decision-maker</td><td>Priority problem, success metric, decision process and preferred commercial hypothesis.</td><td>Named owner and documented pilot objective.</td></tr>', '''<tr><td>Apparel-buyer discovery [A]</td><td>One apparel Merchandising / Buying lead</td><td>Category priority, scope, willingness to pay, buying authority and commercial sponsor.</td><td>Named buyer, actual budget signatory and documented pilot objective.</td></tr>
<tr><td>Makeup-champion discovery [A]</td><td>One Makeup / Beauty lead</td><td>Willingness to advocate, access to specialists and a plausible later makeup use case.</td><td>Explicit advocacy and a separate test plan; no assumed makeup validation or budget.</td></tr>''')
        section = section.replace('Same buying group','Apparel buyer + commercial sponsor + finance')
    if 'id="a3"' in section:
        section = section.replace('<h3>Open originals · PDF Appendix H</h3>','<h3>Historical originals · PDF Appendix H</h3>')
        section = section.replace('<b>Mapping:</b>', '<b>v12 DMU:</b> Current buyer = apparel Merchandising / Buying; champion = Makeup / Beauty [A]. Historical attachments below are retained verbatim and may describe the earlier CX-led hypothesis.<br><b>Mapping:</b>')
    rebuilt.append(section)

note = ('Proposed DMU [A], updated at the team\'s request: apparel Merchandising / Buying is the buyer, not CX. Makeup / Beauty is the internal champion because the color-guidance mechanism could extend to makeup, while apparel remains the first commercial scope. A champion advocates; it does not automatically control budget. Commercial or category leadership is the proposed final decider; shoppers use and benefit, associates operate, CX and experts influence, and IT/privacy/legal/procurement gate deployment. Confirm role names, budget authority and sponsorship with each retailer. No retailer interview, makeup validation or cross-category revenue is claimed.')
dmu = f'''<section class="slide" id="dmu" data-note="{html.escape(note,quote=True)}">
<div class="meta"><span>Part B · Retail decision-making unit · Proposed [A]</span><div class="meta-right"><span class="wordmark">Color<span>—</span>Play</span></div></div>
<h2>Apparel owns the purchase.<br><span class="pink">Makeup champions the opportunity.</span></h2>
<p class="sub">One color-guidance platform; clothing is the first use case, not the limit of the opportunity.</p>
<div class="dmu-primary">
<div class="dmu-role"><div class="role-name">Buyer [A] · Commercial ownership</div><h3>Apparel Merchandising<br>/ Buying</h3><p>Retail apparel buyers define the proposed category scope, assess the business case and negotiate the pilot. Confirm budget authority with each retailer.</p></div>
<div class="dmu-role champion"><div class="role-name">Champion [A] · Internal advocacy</div><h3>Makeup / Beauty<br>division</h3><p>Advocates for color guidance across apparel and makeup, connects specialists and helps build internal support. Advocacy is not final purchase authority.</p></div>
</div>
<div class="dmu-secondary">
<div><h3>Decider [A]</h3><p>Commercial / category leadership, with finance: approves budget and pilot go/no-go.</p></div>
<div><h3>Users &amp; operators</h3><p>Shopper: chooses freely. Store associates / operations: deliver and support the experience.</p></div>
<div><h3>Influencers [A]</h3><p>CX / omnichannel and color specialists: shape the journey, quality reference and explanation.</p></div>
<div><h3>Gatekeepers [A]</h3><p>IT / security, privacy / legal and procurement: control data, access and contracting.</p></div>
</div>
<p class="dmu-boundary"><strong>Scope guardrail:</strong> Makeup colorimetry is a potential later application [A]. The first study remains human-assisted clothing guidance; no shade-matching accuracy or cross-category demand is validated.</p>
<div class="status"><span class="tag a">Proposed roles, not confirmed stakeholder commitments · retailer interviews are the next gate</span><button class="notes-btn">Read rationale</button></div>
</section>'''
rebuilt.insert(4,dmu)

svg_prev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>'
svg_next = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>'
svg_print = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7z"/></svg>'
controls = f'''<nav class="toolbar" aria-label="Presentation controls"><button id="previous" aria-label="Previous slide" title="Previous slide">{svg_prev}</button><output id="slide-counter" aria-label="Current slide"></output><label for="slide-select" class="sr-only">Go to slide</label><select id="slide-select" aria-label="Go to slide"></select><button id="next" aria-label="Next slide" title="Next slide">{svg_next}</button><button id="print" title="Print presentation">{svg_print}<span class="control-label">Print</span></button><button id="motion-toggle" aria-label="Pause animated border" aria-pressed="false" title="Pause animated border"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><span class="control-label">Pause</span></button></nav><div class="progress" aria-hidden="true"><i></i></div>'''
css += '\n.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}'
head = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-play-package" content="Standalone: embedded images, font, original sources and feedback; no network dependency."><meta name="description" content="Color-Play: evidence-led retail color guidance, bounded research and proposed apparel-buyer / Makeup-champion DMU."><title>Color-Play · Product Management Dossier v12</title><style>{css}</style></head>'''
page = head + '<body><a class="skip-link" href="#s1">Skip to presentation</a><main id="presentation">' + '\n'.join(rebuilt) + '</main><canvas id="color-wave" aria-hidden="true"></canvas>' + controls + f'<script>{js}</script></body></html>'
(OUT / 'Color-Play_Certamen_II_Dossier_v12_Standalone.html').write_text(page)

# Speaker rationales accompany the PDF, not just the interactive controls.
notes = []
for i, section in enumerate(rebuilt):
    title = html.unescape(re.sub('<[^>]+>', '', re.search(r'<h[12]>(.*?)</h[12]>',section,re.S).group(1)))
    explanation = html.unescape(re.search(r'data-note="([^"]*)"', section).group(1))
    sid = re.search(r'id="([^"]+)"', section).group(1)
    label = f'{i+1} / 16' if i < 16 else 'Appendix ' + chr(65+i-16)
    notes.append(f'<article class="rationale-entry"><h3>{html.escape(label)} · {html.escape(title)}</h3><p>{html.escape(explanation)}</p></article>')
notes_sections = []
for i in range(0,len(notes),3):
    notes_sections.append(f'<section class="slide rationale-page"><div class="meta"><span>Appendix G · Speaker rationales · {i//3+1} / {(len(notes)+2)//3}</span><span class="wordmark">Color<span>—</span>Play</span></div><h2>Why we made <span class="pink">these decisions.</span></h2>' + ''.join(notes[i:i+3]) + '<div class="status"><span class="footer">v12 · Current DMU and scope · Planning roles remain [A]</span></div></section>')
(ROOT / 'work/Color-Play_v12_Rationales.html').write_text(head + '<body>' + ''.join(notes_sections) + '</body></html>')
shutil.copy(ROOT / 'work/Manrope-OFL.txt', OUT / 'Manrope-OFL.txt')
print(f'Built {len(rebuilt)} slides (16 main + 6 appendices), {(len(notes)+2)//3} rationale pages; HTML {len(page)/1024/1024:.2f} MiB')

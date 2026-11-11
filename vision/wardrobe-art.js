// Flat technical diagrams of generic garments. Not product photography or stock.
const paths = {
 tee:'M39 21 23 29 11 48 28 59 35 48 35 101 85 101 85 48 92 59 109 48 97 29 81 21Q60 36 39 21Z',
 shirt:'M43 19 24 29 13 83 30 88 38 51 38 102 82 102 82 51 90 88 107 83 96 29 77 19 60 29Z',
 knit:'M40 22 25 29 13 85 29 90 37 53 36 102 84 102 83 53 91 90 107 85 95 29 80 22Q60 37 40 22Z',
 hoodie:'M43 26Q40 6 60 6T77 26L96 35 109 88 92 93 83 58 84 106 36 106 37 58 28 93 11 88 24 35Z',
 pants:'M35 15 85 15 91 107 67 107 60 51 53 107 29 107Z',
 skirt:'M41 18 79 18 100 104 20 104Z',
 blazer:'M42 15 25 28 13 98 30 102 40 54 36 107 59 107 60 69 61 107 84 107 80 54 90 102 107 98 95 28 78 15 60 51Z',
 coat:'M42 11 25 25 13 93 30 98 39 52 32 113 88 113 81 52 90 98 107 93 95 25 78 11 60 39Z',
 sneakers:'M19 56 36 55 45 71 74 77 100 81Q111 87 107 97H15Q9 94 14 84Z',
 loafers:'M20 63 48 60 61 77 96 80Q111 84 108 96H13L14 80Z',
 boots:'M27 30 59 30 60 72 98 80Q111 87 107 100H20L19 77Z'
};
export function garmentDiagram(shape,color,label){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('role','img');svg.setAttribute('aria-label',label);
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[shape]||paths.tee);path.setAttribute('fill',color);path.setAttribute('stroke','#625B6B');path.setAttribute('stroke-width','1');path.setAttribute('stroke-linejoin','round');svg.append(path);
 const detail=document.createElementNS(svg.namespaceURI,'path');
 const lines={pants:'M35 24H85M60 24V49',shirt:'M60 29V102M43 19 50 38 60 29 70 38 77 19',knit:'M38 94H82',hoodie:'M48 79 43 94H77L72 79ZM43 26Q60 43 77 26',skirt:'M41 26H79M47 30 41 99M73 30 79 99',blazer:'M42 15 49 39 43 44 60 69 77 44 71 39 78 15',coat:'M42 11 49 29 43 35 60 59 77 35 71 29 78 11M59 59V111',sneakers:'M14 91H108M50 73 47 80M61 76 58 83M72 79 69 86',loafers:'M14 91H108M37 70 55 84',boots:'M20 93H108M28 38H57'};
 if(lines[shape]){detail.setAttribute('d',lines[shape]);detail.setAttribute('fill','none');detail.setAttribute('stroke','#201B27');detail.setAttribute('stroke-opacity','.4');detail.setAttribute('stroke-width','1');svg.append(detail);}return svg;
}

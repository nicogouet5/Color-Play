# Color-Play · Dossier v12 + In-Store Prototype

La entrega vigente está en [`ENTREGA_FINAL_v12/`](ENTREGA_FINAL_v12/) y el prototipo interactivo in-situ en tiendas está disponible en la raíz ([`index.html`](index.html)) para **GitHub Pages**:

- **Prototipo In-Situ en Tienda (TypeScript + CSS, Inglés):** [index.html](index.html) / [Color-Play_InStore_Prototype_Standalone.html](ENTREGA_FINAL_v12/Color-Play_InStore_Prototype_Standalone.html). Incluye comparador de etapas de despliegue (Fase 1 Estudio Portátil vs. Fase 2 Estación Diferenciada en Rack vs. Hipótesis Makeup Champion `[A]`), elevación arquitectónica 1:20 interactiva del mobiliario y simulador táctil de 12" con modo Kiosco en pantalla completa (`<dialog>`).
- **Stitch Canvas (Brand & Fixture Visualization):** Proyecto `5268539669621980793` (`https://stitch.google.com/projects/5268539669621980793`).
- **HTML interactivo del Dossier:** [Color-Play_Certamen_II_Dossier_v12_Standalone.html](ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Standalone.html). Abrir directamente en navegador; no requiere servidor ni conexión.
- **PDF de entrega:** [Color-Play_Certamen_II_Dossier_v12_Source_Aligned.pdf](ENTREGA_FINAL_v12/Color-Play_Certamen_II_Dossier_v12_Source_Aligned.pdf).
- **Cambios y controles:** [CAMBIOS_Y_REVISION_v12.md](ENTREGA_FINAL_v12/CAMBIOS_Y_REVISION_v12.md).

## Los ocho entregables
La segunda lámina del HTML es un índice con acceso directo a cada entregable. La numeración sigue la rúbrica; Integration es material de apoyo, no un entregable adicional.

| # | Entregable | Páginas PDF / láminas HTML |
|---|---|---|
| 1 | Value Proposition · WHO | 5; DMU en 6 |
| 2 | Competitive Landscape | 7 |
| 3 | Strategic Positioning Memo | 8 |
| 4 | Channel Management | 9; integración de apoyo en 10 |
| 5 | Customer Analysis | 11; evidencia y protocolos en anexos |
| 6 | Business Plan | 12–14: economía, alternativas y recomendación |
| 7 | BBBB · Build / Borrow / Buy / Bot | 15 |
| 8 | One-Page Business Plan + Assumption Log Template | 16–18 |

El One-Page Plan está actualizado; no depende del plan histórico. El Assumption Log contiene seis riesgos con evidencia, próximo test, responsable propuesto y criterio de decisión. Incluye una plantilla CSV reutilizable descargable desde el HTML, embebida y sin conexión.

## Identidad y contenido
Fucsia, Manrope embebida, fotografía retail y tono académico, refinados con Impeccable. El logo Color proporcionado aparece junto a Simple Tech en escritorio; en móvil se muestra únicamente Color, sin wordmark tipográfico.

**DMU [A]:** buyer = Apparel Merchandising / Buying; champion = Makeup / Beauty. Vestuario es el primer caso de uso; maquillaje y shade matching no están validados. Se distingue evidencia de encuesta [O] de propuestas e hipótesis [A]. No se realizó investigación nueva.

El estudio inicial no incluye fotos, perfiles, CRM, vínculo transaccional ni cobro. Los precios históricos y su escenario financiero fallido se conservan como hipótesis, no como ingresos del estudio inicial.

## Uso del HTML
- Flechas, Page Up / Page Down o espacio para navegar; Home / End para inicio/final.
- Selector de lámina y enlaces del índice para ir a un entregable.
- `N` abre el fundamento; Escape lo cierra.
- Fondo Canvas de bandas fucsia/lavanda, inspirado en muestras de vestuario, detrás de superficies de lectura opacas. Sin videos ni dependencias remotas.
- Pause / Resume conserva la preferencia. Movimiento reducido muestra una composición estática; pestañas ocultas e impresión detienen la animación.
- En móvil, la pausa sustituye a Print; las tablas anchas tienen desplazamiento interno.

**Print imprime las 26 láminas actuales.** El PDF preparado tiene **57 páginas**: 26 actuales, 9 de fundamentos y 22 de fuentes históricas/feedback. Las últimas 22 páginas mantienen su texto y apariencia; sus hipótesis anteriores no son la estrategia vigente.

## Verificación y reconstrucción
En `work/`:

```sh
npm ci --prefix work
npm --prefix work run check
npm --prefix work run audit
npm --prefix work run build
```

Requiere Node, Google Chrome y Python con PyMuPDF (`fitz`). `CHROME_PATH` permite especificar otro ejecutable de Chrome. La reconstrucción usa el **HTML final v12 como fuente actual** y las **últimas 22 páginas del PDF vigente como archivo histórico**; ya no depende de v11. Conserva ambos entregables para reconstruir. Los scripts antiguos se mantienen como referencia y no son los comandos vigentes.

Controles: 320/390/780/1024/1536px sin overflow horizontal; texto al 200% a 390px; 0 solicitudes externas y 0 errores JavaScript; pausa, persistencia, movimiento reducido e impresión comprobados; Axe WCAG A/AA con 0 violaciones automatizadas (2 comprobaciones requieren revisión humana). No es una certificación de accesibilidad.

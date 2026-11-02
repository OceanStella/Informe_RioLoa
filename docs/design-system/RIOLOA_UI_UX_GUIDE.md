# RIOLOA UI/UX Guide — Informe Diario de Operaciones (web)

**Fuente de verdad visual del producto web.** Describe el sistema **ya construido y aprobado**. No es una propuesta de rediseño.

Cualquier vista, dashboard, tabla, modal, historial, login o estado nuevo debe **copiar este lenguaje**, reutilizando tokens, clases y componentes existentes. Si una skill, tendencia o modelo sugiere otra estética, **gana esta guía y el CSS actual**.

| Campo | Valor |
| --- | --- |
| Producto | Informe Diario de Operaciones — RIOLOA / Área de Pozas · SQM |
| Superficie documentada | **Aplicación web** (React + CSS). El PDF es un sistema visual **aparte**. |
| Fecha de captura | 2026-11-01 |
| Stack UI | React 19, Vite, TypeScript, CSS custom properties, **sin Tailwind** |
| Iconos | `lucide-react` |
| Tipografía | Plus Jakarta Sans (`@fontsource`, pesos 400 / 500 / 600 / 700 / 800) |

**Contrato para otra IA**

1. No inventar paletas, radii, sombras ni tipografía.
2. Reutilizar `src/styles/tokens.css`, clases de `src/App.css` y componentes de `src/components/ui/`.
3. No introducir Tailwind, CSS-in-JS, shadcn, Material, ni librerías de charts con tema por defecto. Se permite `@base-ui/react` (headless, sin estilos propios): hoy lo usa `UserMenu`.
4. No “modernizar” ni “simplificar” el shell.
5. El PDF (`DailyReportPdf`, skill `pdf-report-aesthetics`) usa teal `#176D78`. **Ese valor no se usa en la web.** Web = `#195A64` / `#0091C7`.

**Referencias visuales**

| Archivo | Qué muestra |
| --- | --- |
| [references/desktop-1440.png](references/desktop-1440.png) | Shell completo ≥1200: sidebar + topbar + KPIs + formularios |
| [references/tablet-768.png](references/tablet-768.png) | Sin sidebar, topbar compacta, KPIs 2×2 |
| [references/mobile-390.png](references/mobile-390.png) | Título wrapping, pills icon-only, KPIs apilados internamente |
| [references/admin.png](references/admin.png) | Admin: tabs, tabla, sidebar `is-plain` |
| [references/modal.png](references/modal.png) | Overlay + `SendReportModal` |

Las capturas son anteriores al cambio de shell del 2026-11-01. Para el shell mandan la sección siguiente y el código.

## Cambios del 2026-11-01: shell simplificado

Pedido del titular. **Prevalece sobre §1.2, §8, §9, §10, §11, §12, §15, §20, §21, §22 y §26.1** donde se contradigan.

**Regla de la pantalla de informe:** solo lo necesario para generar el informe. Sin KPIs, sin fecha ni estado en la barra superior, sin un segundo "Generar informe": la acción vive en el panel final.

| Pieza | Ahora |
| --- | --- |
| Barra superior (`TopBar`) | Blanca y sólida, **idéntica en toda la app**: nada en ella depende de la ruta. Links centrados con la rejilla `1fr auto 1fr`. Logo y cuenta van en el margen `--frame-x`, el mismo de `.app-main`. Desde 1200 px ese margen centra el logo sobre el panel. Sin eyebrow ni título |
| Layout | `AppShell` es la ruta padre de `App.tsx` y no se desmonta al navegar. Las páginas solo rinden su `<main>`. El panel y la barra de avance del informe llegan por portal, con `useShellSlots` |
| Navegación | Dashboard, Historial y Generar informe, con subrayado teal de 2 px en la página activa. Un solo origen: `src/components/ui/navItems.ts` |
| Título de página | `PageHead` en el contenido: h1 de 28/700 (22 en ≤640) |
| Panel lateral | **Solo en `/report`**, bajo la barra: Avance y Secciones. Sin Turno, sin navegación, sin Admin. Dashboard, Historial y Admin van a ancho completo |
| Administrar parámetros | En el menú de cuenta (`UserMenu`). Es configuración, no una tarea del turno |
| `/review` | Sin navegación ni panel: el supervisor llega por correo y esa app no es suya |
| Secciones del informe | Título y, si aporta, una línea. Sin eyebrow "Paso N de 5", sin pozo de icono, sin índice "01" |
| Generar | Un solo "Agregar Actividad", al final de la lista. Panel oscuro sin eyebrow |

**Responsive:** desde 861 px los links van en la barra. En ≤860 pasan al cajón con el botón de menú. Entre 861 y 1199, `/report` abre sus secciones en ese cajón y conserva la barra de avance de 3 px, que en ≥1200 se oculta porque el panel ya muestra el avance.

**Dashboard:** primero la tarea y después los datos.

- Arriba, *Crear informe* (`src/data/reportTypes.ts`, una entrada por tipo) y *Últimos informes*, con su estado y lo que requiere acción.
- Debajo, gráficos con pesos desiguales en rejilla de 3 columnas: `ChartPanel hero` ocupa 2. Un solo color de serie, `--rio-teal`; el color de estado solo en `StatusBreakdown`.
- **No hay tarjetas de KPI** (`KpiStrip` se eliminó): cada cifra vive en la cabecera del gráfico que la explica. No volver a una rejilla de tarjetas iguales.
- Barras para cantidades por día: una línea con un solo punto no comunica nada.

**Carga:** `src/components/ui/Skeletons.tsx`, con la forma real del contenido para que nada salte. Prevalece sobre §7 y §26.7. Los botones que esperan siguen cambiando su texto.

**Controles:** lenguaje tipo shadcn, con los tokens de esta guía.

- **Botones:** relleno sólido, nunca gradiente, porque un gradiente no se puede animar y el hover parpadea (`background-image` desaparece de golpe y el color sube desde transparente). Sin `transform` en `:active`: mover el botón lo saca de debajo del cursor. Prevalece sobre §3.1 y §16.
- **Dropdowns:** `src/components/ui/Select.tsx`, sobre Base UI. No usar `<select>` nativo. El foco tras un error lo busca `scrollToField` en `button.select-trigger`.
- **Checkbox:** sigue siendo el `<input>` nativo, con `appearance: none`. Prevalece sobre §14.2.
- **Inputs numéricos:** sin flechas. El calendario de `type="date"` sigue siendo el nativo del navegador.

**Móvil (≤640):** la lista de equipos va en 2 columnas y sus códigos pasan a 2 líneas, nunca con puntos suspensivos. Inicial y final van lado a lado, con el calculado debajo. Las pestañas de Admin van en 1 columna. Historial no lleva panel alrededor de sus tarjetas.

**Reglas heredadas de OceanCar**

- Todo lo clicable muestra la mano: regla global en `src/App.css`. Se audita el `cursor` calculado.
- En pantallas táctiles los campos escriben a 16 px, porque iOS hace zoom bajo ese tamaño y no lo deshace.
- Se revisa a 390, ~1400 y 1920 px. Etiquetas y links no se parten; los iconos van centrados.
- Evitar lo que delata una interfaz genérica: eyebrows, tarjetas iguales de icono + título + texto, métricas decorativas e información repetida.

---

## Índice

1. [Identidad visual (logo y marca)](#1-identidad-visual)
2. [Paleta y tokens de color](#2-paleta-y-tokens-de-color)
3. [Filosofía visual](#3-filosofía-visual)
4. [Tipografía](#4-tipografía)
5. [Spacing](#5-spacing)
6. [Radii, bordes y sombras](#6-radii-bordes-y-sombras)
7. [Motion](#7-motion)
8. [Shell general](#8-shell-general)
9. [Sidebar](#9-sidebar)
10. [Topbar](#10-topbar)
11. [KPI cards](#11-kpi-cards)
12. [Section headers](#12-section-headers)
13. [Cards y formularios](#13-cards-y-formularios)
14. [Equipment UI](#14-equipment-ui)
15. [Actividades](#15-actividades)
16. [Botones](#16-botones)
17. [Status chips, pills y tags](#17-status-chips-pills-y-tags)
18. [Tablas](#18-tablas)
19. [Modales](#19-modales)
20. [Panel Generar (CTA oscuro)](#20-panel-generar)
21. [Admin](#21-admin)
22. [Dashboard futuro (derivación, no diseño libre)](#22-dashboard-futuro)
23. [Responsive](#23-responsive)
24. [Accesibilidad](#24-accesibilidad)
25. [Iconografía](#25-iconografía)
26. [Cómo extender este diseño](#26-cómo-extender-este-diseño)
27. [Do / Don’t](#27-do--dont)
28. [Referencias de código](#28-referencias-de-código)
29. [Límites de esta guía](#29-límites-de-esta-guía)

---

## 1. Identidad visual

**Implementación:** `src/assets/rioloa-logo.png`, `src/components/ui/AppSidebar.tsx`, `src/components/ui/TopBar.tsx`, `src/App.css` (`.logo-plate`, `.topbar-logo`).

### 1.1 Logo

Wordmark horizontal **RIOLOA**, sin isotipo, sin tagline, fondo transparente.

| Parte | Color observado | HEX |
| --- | --- | --- |
| **RIO** | teal oscuro | `#195A64` (`--rio-teal`) |
| **LOA** | cyan | `#0091C7` (`--rio-cyan`) |

- Archivo: `src/assets/rioloa-logo.png`
- Dimensión nativa: **800 × 256 px** (ratio ≈ 3.125 : 1)
- Peso: ~7.5 KB
- No existe SVG de marca en el producto. No reconstruir el wordmark con texto.

`src/assets/contours.svg` **no es el logo**. Es un motivo de curvas topográficas usado al 7–10 % de opacidad sobre superficies teal oscuras (sidebar y panel Generar).

`src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` **no se usan** en la UI. `public/favicon.svg` es el isotipo púrpura por defecto de Vite/Cursor (**no es RIOLOA**). No copiar ese púrpura a la interfaz.

### 1.2 Ubicaciones y tamaños reales

**A. Sidebar desktop (`min-width: 1200px`)**

- El logo vive en una **placa blanca** (`.logo-plate`):
  - 108 × 46 px
  - `border-radius: 12px` (`--radius-lg`)
  - fondo `#fff`
  - sombra `0 6px 18px -6px rgba(0, 0, 0, 0.35)`
- Imagen (`.logo-plate-img`): **width 80px**, height auto (~26 px)
- Clear space interno de la placa: ~14 px horizontales, ~10 px verticales
- A la derecha: stack de texto
  - “Operaciones” — 15 px / 700 / blanco
  - contexto (“Área de Pozas · SQM” o “Administración”) — 12 px / regular / blanco 62 %
- Gap placa–texto: 12 px
- Padding del brand: `24px 20px 20px`

**B. Topbar (`< 1200px`)**

- Logo **sin placa**, directo sobre el topbar claro
- `.topbar-logo`: height **20 px**, width auto (~66 px; el markup declara `width={66} height={20}`)
- En `≥ 1200px` con `.has-sidebar`: **el logo del topbar se oculta** (ya está en la sidebar)
- En `≤ 640px`: **también se oculta** (queda solo el título)

**C. Clear space operativo (no hay manual de marca aparte)**

Respetar los paddings ya usados. No pegar el wordmark al borde de un contenedor oscuro sin placa. No recortar letras.

### 1.3 Usos permitidos

| Superficie | Cómo |
| --- | --- |
| Sidebar teal oscuro | Siempre sobre placa blanca 108×46 |
| Topbar / fondos claros (`--bg`, `--surface`) | PNG directo, 20 px de alto |
| Favicon / PWA | Debería derivarse del wordmark o de `--rio-teal`; hoy el favicon **no** cumple esto |

### 1.4 Usos prohibidos

- Recolorear RIO o LOA
- Poner el PNG crudo sobre teal oscuro (ilegible: LOA cyan se pierde; RIO se funde)
- Añadir sombra, glow, outline o fondo de color al PNG
- Rotar, condensar, poner en vertical, o separar RIO / LOA
- Sustituir por texto “RIOLOA” en Plus Jakarta
- Usar el favicon púrpura como marca
- Usar el teal del PDF `#176D78` como color de marca web
- Convertirlo en hero, watermark gigante o fondo de página
- Acompañarlo con un isotipo inventado (montaña, gota, engranaje, etc.)

---

## 2. Paleta y tokens de color

**Implementación:** `src/styles/tokens.css`. Tones compartidos: `src/App.css` (`.tone-*`).

Nomenclatura: token CSS → HEX → uso real → no usar para.

### 2.1 Marca (inmutables)

| Token | HEX | Uso | No usar para |
| --- | --- | --- | --- |
| `--rio-teal` | `#195A64` | Marca, botones primary, selección de equipos, hardness selected, títulos de actividad, totales m³, subsection titles, borde inset de selected | Fondos de página enteros, texto sobre teal oscuro, gráficos rainbow |
| `--rio-cyan` | `#0091C7` | Segunda letra del logo, focus ring, borde focus de inputs, tramo del progress del topbar, gradiente del índice de actividad | Texto pequeño sobre blanco (usar `--rio-cyan-text`), botones primary (el primary es teal) |

### 2.2 Familia teal (estructura)

| Token | HEX | Uso | No usar para |
| --- | --- | --- | --- |
| `--rio-teal-dark` | `#0F3B42` | Hover primary, texto de botones secondary, título de actividad, código de equipo seleccionado, texto sobre btn-light | Fondos de workspace |
| `--rio-teal-deep` | `#0B2D33` | Extremo del gradiente de sidebar y generate-panel; tooltip; overlay base | Texto sobre `--bg` |
| `--rio-teal-hover` | `#134A53` | Inicio del gradiente de sidebar (`#134a53` hardcoded = este token) | Acentos de KPI |
| `--rio-teal-soft` | `#E3EFF0` | Icon wells tone-teal, highlight de calculados, generate totals, code-tokens | Botones |
| `--rio-teal-tint` | `#F0F7F7` | Hover secondary, selected equipment/hardness fill, header de modal | Texto |
| `--rio-teal-line` | `#BCD6D9` | Bordes de highlight, dashed add-activity, activity m³ total | Texto |
| `--rio-cyan-soft` | `#E5F4FB` | Icon wells tone-cyan, tag default, fila de tabla en edición | Error |
| `--rio-cyan-text` | `#00729D` | Texto sobre cyan-soft, tags, tone-cyan (iconos KPI/sección) | Fondos |

### 2.3 Complementarios de faena (pozas / desierto)

Usar **un tone por dominio**, no mezclar varios en el mismo control.

| Token | HEX | Uso actual | No usar para |
| --- | --- | --- | --- |
| `--aqua` | `#22A89A` | Progress topbar (junto a cyan), hover de photo-drop | Texto de 12 px sobre blanco |
| `--aqua-strong` | `#168276` | Eyebrow del topbar, tone-aqua, inherited text, iconos de categoría de equipo, inherited-hint | Fondos saturados de página |
| `--aqua-soft` | `#E1F5F1` | KPI/sección roster, inherited computed fields, photo-drop icon well, hover photo | Peligro |
| `--sand` | `#DD9A37` | (familia; el tone usa `--sand-strong` para la raya KPI) | Texto de UI |
| `--sand-strong` | `#9A6312` | Tone sand (KPI m³, resumen, tab Camiones) | Fondos |
| `--sand-soft` | `#FCF1DF` | Wells e iconos sand | Error |
| `--coral` | `#E0705C` | Asterisco required, icono PDF en modal | Marca, botones primary, títulos |
| `--coral-strong` | `#B44A37` | Tone coral (Admin maquinaria) | Texto sobre `--bg` sin well |
| `--coral-soft` | `#FDEBE7` | Wells coral | Success |
| `--indigo` | `#5468C6` | Tone indigo **definido, no asignado aún** a una pantalla | Sustituir teal de marca |
| `--indigo-soft` | `#ECEFFB` | Well indigo | |

**Regla de tones** (`.tone-teal | cyan | aqua | sand | coral | indigo`): cada bloque define `--tone` y `--tone-soft`. KPIs, section icons y admin tabs **siempre** pasan por esta paleta.

Mapeo de dominio actual:

| Dominio | Tone |
| --- | --- |
| Antecedentes generales | `cyan` |
| Dotación activa / personas | `aqua` |
| Actividades | `teal` |
| M³ camiones / resumen | `sand` |
| Watermaster / volumen agua | `cyan` |
| Admin pozas generales | `cyan` |
| Admin pozas de actividades | `aqua` |
| Admin camiones | `sand` |
| Admin maquinaria | `coral` |

### 2.4 Neutros

| Token | HEX | Uso | No usar para |
| --- | --- | --- | --- |
| `--bg` | `#EFF4F5` | Canvas de página (+ washes radiales, ver §3) | Cards, inputs, sidebar |
| `--surface` | `#FFFFFF` | Panels, cards, inputs, modal, tabs, KPI base | Sidebar |
| `--surface-soft` | `#F6F9F9` | Date chip, thead, panel-footer, modal-actions, equipment-picker, empty-state, photo-drop | Texto |
| `--surface-sunken` | `#EFF4F5` | Read-only / computed default, chip pending, tab counts | CTA |
| `--border` | `#DDE6E8` | Cards, KPI, tabs, date-chip, topbar bottom | Focus |
| `--border-subtle` | `#E8EEEF` | Divisiones internas, thead bottom más suave, picker | Controles |
| `--border-control` | `#CFDADD` | Inputs, selects, hardness idle | Cards grandes |
| `--border-control-hover` | `#A3B6BA` | Hover de input/option | Texto |

### 2.5 Texto

| Token | HEX | Uso | No usar para |
| --- | --- | --- | --- |
| `--text` | `#142226` | Títulos, valores KPI, input text | Texto sobre sidebar |
| `--text-label` | `#2B3E43` | Labels, date-chip, subsection values | Placeholder |
| `--text-muted` | `#5D6F74` | Helpers, KPI label/sub/unit, thead, ghost, meta | Títulos de página |
| `--text-subtle` | `#8A9A9E` | Eyebrow de sección, placeholder, empty table “—”, field-tag, meta vacía | Texto de datos |

Sobre sidebar / generate-panel el texto **no usa estos tokens**: usa blanco y blancos con alpha (`#fff`, `rgba(255,255,255,0.92|0.78|0.65|0.62|0.55|0.50)`).

### 2.6 Semántica

| Token | HEX | Uso | No usar para |
| --- | --- | --- | --- |
| `--success` | `#23966F` | Dot del chip ready, check del RosterReadyBadge | Fondos de página |
| `--success-text` | `#186F52` | Chip ready, pill ok, alert success | Texto sobre success sólido |
| `--success-soft` | `#E3F4ED` | Chip ready, pill ok, alert success | Warning |
| `--success-line` | `#B4DCCB` | Borde alert success | |
| `--warning` | `#D98E1F` | (token; la UI usa más `--warning-text/soft`) | Marca |
| `--warning-text` | `#87560B` | Pill warning, alert warning | Fondos |
| `--warning-soft` | `#FDF2DF` | Pill warning, alert warning | Error |
| `--warning-line` | `#F0D29F` | Borde alert warning | |
| `--danger` | `#D2504B` | Botón danger, borde input invalid | Marca, required (el * usa coral) |
| `--danger-text` | `#A8352F` | Chip error, danger-ghost, field-error, hover danger | Fondos saturados |
| `--danger-soft` | `#FCECEA` | Chip error, alert default, danger-ghost hover, tag-danger | Success |
| `--danger-line` | `#F0C2BE` | Borde alert default | |

### 2.7 Colores hardcoded (existen en CSS, no están en tokens)

Usarlos **solo en el mismo contexto** en que ya aparecen. No promoverlos a marca.

| HEX | Dónde | Rol |
| --- | --- | --- |
| `#4FD1C1` | Sidebar: anillo de progreso, step `done`, barra inset `active`, conector done | Acento mint **solo sobre teal oscuro** |
| `#F4B860` | Step `warning` marker | Alerta en sidebar |
| `#F4C886` | Step warning meta | |
| `#FFD79C` | Generate-panel warning pill text | |
| `#7FE0D4` | Generate eyebrow “Paso 5 de 5” | |
| `#1D6D78` | Extremo del gradiente `.btn-primary` | Hover no; el hover es `--rio-teal-dark` |
| `#FFFBFB` | Input `.field-invalid` background | |
| `#F7FBFB` | Hover de fila de tabla | |
| `#E9FBF8` | Hover `.btn-light` | |
| `#E9EFF0` | Fondo del preview de foto | |
| `#C4E8E1` | Borde computed inherited | |
| `#4FAE7F` / `#E0B23A` / `#E07F35` / `#C94C4C` | Escala dureza 25/50/75/100 | Solo hardness |

### 2.8 KPI / accent line

La raya inferior de 3 px de cada KPI usa `var(--tone)` al 80 % de opacidad. El wash de esquina usa `var(--tone-soft)`. No pintar la raya con un color fuera del tone del card.

---

## 3. Filosofía visual

**Qué es:** software operacional B2B para faena minera / evaporación de pozas. Se usa de pie, con datos densos, en turnos. Debe sentirse **limpio, profesional, fresco y usable**, no como landing ni como dashboard SaaS genérico.

**Alta densidad controlada:** mucha información, pero agrupada (sidebar de progreso + KPIs + secciones numeradas + cards). El vacío se rellena con jerarquía (eyebrow, icon well, raya de tone), no con decoración.

**Amigable ≠ informal:** Plus Jakarta, aqua/cyan suaves, mint `#4FD1C1` en sidebar. Sigue siendo un informe de operaciones, no un consumer app.

### 3.1 Lo que la UI actual *sí* hace (no negarlo)

La implementación **no es plana al 100 %**. Estos recursos están aprobados y deben repetirse con la misma dosis:

| Recurso | Dónde y cuánto |
| --- | --- |
| Washes radiales de marca en el body | Aqua 10 % y cyan 8 %, fijos, esquina superior. No más stops. |
| Gradiente de sidebar | 170° `#134A53` → teal-dark → teal-deep + radial cyan 28 % + contours 7 % |
| Frost ligero | Topbar `rgba(255,255,255,0.82)` + `blur(12px) saturate(160%)`. Sidebar-card 6 % blanco + `blur(6px)`. Overlay `blur(3px)`. |
| Gradiente de botón primary | 135° teal → `#1D6D78`, no un degradado arcoíris |
| Generate-panel oscuro | Única “hero card” del producto: es el **paso 5**, no un marketing hero |
| Índice de actividad | 140° teal → cyan, 40×40, peso 800 |
| Highlight de m³ | Gradiente 90° teal-soft → cyan-soft |

### 3.2 Anti-patterns (prohibidos porque romperían lo aprobado)

| NO | Por qué / qué hay en su lugar |
| --- | --- |
| Glassmorphism pesado (cards translúcidas sobre foto, blur >12 px en contenido) | Frost solo en chrome (topbar/sidebar-card/overlay) |
| Gradientes decorativos arbitrarios (morado→rosa, mesh, aurora) | Solo familia teal/cyan/aqua |
| Blobs, orbs, noise, grain, 3D | Contours.svg al 7–10 % sobre oscuro, nada más |
| Tarjetas flotantes innecesarias (card dentro de card con sombra fuerte) | Un `.panel` o `.activity-card` por bloque; equipment-card usa `--shadow-xs` |
| Exceso de pills | Pills: date, status topbar, StatusChip, tag, code-token. No pillificar labels |
| Sombras exageradas / neumorfismo | `--shadow-card` en superficies; `--shadow-pop` solo modal y tooltip |
| Animaciones gratuitas (Lottie, bounce, shimmer eterno) | 120–200 ms, `cubic-bezier(0.2,0,0,1)`; reveal 3 px; `prefers-reduced-motion` anula |
| Hero sections tipo landing (H1 48 px, ilustración, CTA gigante arriba) | Título 18 px en topbar; el CTA oscuro va **al final** |
| Colores sin relación RIOLOA (púrpura Vite, orange Material, Tailwind default) | Paleta de §2 |
| Inter, Roboto, Poppins, Space Grotesk | Plus Jakarta Sans |
| Dark mode de contenido | El canvas es claro. Oscuro = sidebar + generate-panel + tooltip + overlay |
| Bordes 2–4 px, radius 24–32 px en todo | Radius 8–16; inputs 10; generate/modal 20 |
| Emojis como iconografía | lucide-react |

---

## 4. Tipografía

**Implementación:** `src/main.tsx` importa `@fontsource/plus-jakarta-sans` latin 400/500/600/700/800. Token `--font-sans`. `body` usa `--fs-base` (0.875 rem = **14 px** a root 16) y `--lh-base` (1.5). Antialiased.

Números de datos: clase `.num` y `font-variant-numeric: tabular-nums` en KPI, horómetros, step markers, code.

No hay itálica de marca salvo `.activity-meta-empty` (italic para “Sin poza / área”).

### Escala

| Token | rem | px @16 |
| --- | --- | --- |
| `--fs-2xs` | 0.6875 | 11 |
| `--fs-xs` | 0.75 | 12 |
| `--fs-sm` | 0.8125 | 13 |
| `--fs-base` | 0.875 | 14 |
| `--fs-md` | 0.9375 | 15 |
| `--fs-lg` | 1.125 | 18 |
| `--fs-xl` | 1.375 | 22 |
| `--fs-2xl` | 1.75 | 28 |

### Tabla de elementos

| Elemento | Size | Weight | Line-height | Color | Extra |
| --- | --- | --- | --- | --- | --- |
| Topbar eyebrow | 11 px | 700 | — | `--aqua-strong` | uppercase, ls 0.08 em |
| Page title (topbar h1) | 18 px → 15 px ≤640 | 700 | 1.25 | `--text` | ls −0.01 em |
| Section eyebrow “Paso N de N” | 11 px | 700 | — | `--text-subtle` | uppercase, ls 0.08 em |
| Section title (h2) | 22 px → 18 px ≤640 | 700 | 1.3 | `--text` | ls −0.01 em |
| Section description | 13 px | 400 | 1.5 | `--text-muted` | max-width 68 ch |
| Subsection title | 12 px | 700 | — | `--rio-teal` | uppercase, ls 0.08 em + línea |
| Card / activity title | 15 px | 700 | 1.4 | `--rio-teal-dark` | |
| Activity index “01” | 13 px | 800 | — | `#fff` | tabular |
| KPI label | 12 px | 600 | — | `--text-muted` | |
| KPI number | 28 px → 22 px ≤640 | 700 | 1.1 | `--text` | ls −0.02 em, tabular |
| KPI unit | 13 px | 600 | — | `--text-muted` | |
| KPI helper | 12 px | 400 | — | `--text-muted` | |
| Label de campo | 13 px | 600 | 1.35 | `--text-label` | |
| Required `*` | inherit | — | — | `--coral` | |
| Field tag “Calculado” | 11 px | 600 | — | `--text-subtle` | uppercase, ls 0.04 em |
| Input / select / textarea | 14 px | 400 | 1.5 (textarea) | `--text` | |
| Placeholder | 14 px | 400 | — | `--text-subtle` | |
| Helper / hint | 12 px | 400 | — | `--text-muted` | |
| Field error | 13 px | 400 | 1.35 | `--danger-text` | icon 14 px |
| Sidebar app name | 15 px | 700 | 1.3 | `#fff` | |
| Sidebar context | 12 px | 400 | — | blanco 62 % | |
| Sidebar label (TURNO, SECCIONES) | 11 px | 700 | — | blanco 50 % | uppercase, ls 0.1 em |
| Turn date | 15 px | 700 | 1.35 | `#fff` | |
| Turn meta dt | 13 px | 400 | — | blanco 55 % | |
| Turn meta dd | 13 px | 600 | — | `#fff` | ellipsis |
| Progress title | 14 px | 700 | — | `#fff` | |
| Progress sub | 12 px | 400 | — | blanco 65 % | |
| Progress % | 13 px | 700 | — | `#fff` | tabular |
| Step label | 14 px | 600 | 1.35 | hereda | |
| Step meta | 12 px | 400 | — | blanco 55 % | |
| Step marker | 12 px | 700 | — | según estado | |
| Status chip | 12 px | 600 | — | según estado | height 24 |
| Status pill / date chip | 13 px | 600 | — | según estado | height 32 |
| Tag (Watermaster / Con errores) | 11 px | 700 | — | cyan-text / danger-text | uppercase, height 20 |
| Table header | 11 px | 700 | — | `--text-muted` | uppercase, ls 0.06 em |
| Table cell | 14 px | 400 | — | `--text` | empty: `--text-subtle` |
| Code token | 12 px | 700 | — | `--rio-teal-dark` | tabular |
| Modal title | 18 px | 700 | 1.35 | `--text` | |
| Modal subtitle | 13 px | 400 | — | `--text-muted` | |
| Generate title | 28 px → 22 px ≤640 | 700 | 1.2 | `#fff` | ls −0.02 em |
| Generate eyebrow | 11 px | 700 | — | `#7FE0D4` | uppercase, ls 0.1 em |
| Button | 14 px (sm 13, lg 15) | 600 | 1 | según variante | |
| Admin tab | 14 px | 600 | — | muted / text | |

No usar weight 900. 800 solo en activity-index y el strong del total m³ de actividad (`font-weight: 800`).

---

## 5. Spacing

**Implementación:** tokens `--space-1` … `--space-10` (escala 4 px) en `src/styles/tokens.css`.

| Token | px |
| --- | --- |
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |

Valores sueltos que se **repiten** y deben copiarse (no hay token):

| Valor | Dónde |
| --- | --- |
| 2 px | gap de `.step-list`, margin de progress-sub |
| 3 px | raya KPI, progress topbar, inset active sidebar |
| 5 px | gap field-error |
| 6 px | gap form-field label→control, photo-field, date-chip, status-chip, turn-meta |
| 10 px | padding vertical de step-link, modal-file |
| 80 px / 72 px | padding-bottom de `.app-main` (espacio al final del scroll) |

### Patrones de layout

| Contexto | Valor real |
| --- | --- |
| Sidebar width | `--sidebar-w: 292px` |
| Topbar height | `--topbar-h: 64px` (min-height; padding vertical 10 px) |
| Content max | `--content-max: 1120px` + padding `--space-8` a cada lado → max-width CSS `calc(1120px + 64px)` |
| Main column gap (secciones) | `--space-10` (40 px); `--space-8` bajo 860 px; Admin `--space-6` |
| KPI strip gap | `--space-4` (8 px en ≤640) |
| KPI strip margin-bottom | `−16 px` (se come parte del gap del main) |
| Section → panel | `--space-4` (`.report-section` gap) |
| Panel padding | `--space-6` (24 px); `--space-4` bajo 860 px |
| Panel flush | padding 0 |
| Form grid gap | `--space-4` |
| Form field gap (label/input/error) | **6 px** |
| Input padding | 0 12 px (altura 40) |
| Textarea padding | 10 px 12 px |
| Sidebar brand padding | `24px 20px 20px` |
| Sidebar body padding | `0 16px 16px`, gap 16 |
| Sidebar card padding | 16 |
| Sidebar footer padding | 16 |
| Modal header | `20px 20px 16px 24px` |
| Modal body | `20px 24px`, gap 16 |
| Modal footer | `12px 24px` |
| Activity header padding | `12px 12px 12px 16px` |
| Activity body | 24 px (16 bajo 860) |
| Equipment card header | min-height 50, padding `6px 8px 6px 16px` |
| Equipment card body | 16 |
| Equipment picker padding | 16 |
| Equipment checklist gap | 8, min column 148 px |
| Admin tabs padding interno | 4, gap 4 |
| Table cell | `12px 16px` |

No crear `--space-7` ni escala 8 pt. Si hace falta un valor intermedio, usar 6 / 10 px como ya está hecho.

---

## 6. Radii, bordes y sombras

### Radii

| Token / valor | px | Usar en | No usar en |
| --- | --- | --- | --- |
| `--radius-sm` | 6 | (disponible; poco usado) | Cards |
| `--radius` | 8 | `.btn-sm`, tooltip, tab-icon, sidebar-admin, hardness-grid container | Modal |
| `--radius-lg` | 12 | Logo plate, KPI icon, sidebar-card, step-link, alerts, picker, equipment-card, photo, empty-state, hardness, admin-tab | Page |
| `--radius-xl` | 16 | KPI card, panel, activity-card, admin-tabs, btn-dashed | Inputs |
| **10 px hardcoded** | 10 | Inputs, selects, textarea, computed, `.btn` default, equipment-option, hardness-btn | |
| **14 px hardcoded** | 14 | `.section-icon` | |
| **20 px hardcoded** | 20 | `.generate-panel`, `.modal-card` | Inputs, chips |
| `999px` | pill | Chips, pills, date, tags, code-token, step-marker, tab-count, generate-warning | Cards, inputs, botones (los botones son 10 px) |

### Bordes

- Ancho estándar: **1 px**
- Dashed 1.5 px: `.btn-dashed`, `.photo-drop`, `.empty-state`
- Inset 1 px extra: equipment-option / hardness **selected** (`box-shadow: inset 0 0 0 1px var(--rio-teal)` + border teal)
- Inset 3 px izquierdo: step activo (`box-shadow: inset 3px 0 0 #4fd1c1`)
- Inset 2 px inferior: admin-tab activo (`box-shadow: inset 0 -2px 0 var(--tone)`)
- Sidebar cards / footer / turn-meta: `rgba(255,255,255,0.08–0.10)`

### Focus

| Caso | Tratamiento |
| --- | --- |
| Global `:focus-visible` | `outline: 2px solid var(--rio-cyan); outline-offset: 2px` |
| Input / select / textarea `:focus` | `outline: none`; border `--rio-cyan`; `box-shadow: var(--focus-ring)` = `0 0 0 3px rgba(0, 145, 199, 0.2)` |
| Input invalid `:focus` | `--focus-ring-danger` = `0 0 0 3px rgba(210, 80, 75, 0.18)` |
| Checkbox | focus-visible outline cyan 2 px (no el ring de 3 px) |
| RosterReadyBadge | outline cyan 2 px, offset 1 px |

### Sombras

| Token | Valor | Usar |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px rgba(15,59,66,0.05)` | Secondary btn, equipment-card, option hover |
| `--shadow-card` | `0 1px 2px rgba(15,59,66,0.04), 0 6px 20px -8px rgba(15,59,66,0.1)` | KPI, panel, activity-card, admin-tabs |
| `--shadow-raised` | `0 2px 4px rgba(15,59,66,0.06), 0 12px 28px -10px rgba(15,59,66,0.18)` | Generate-panel |
| `--shadow-pop` | `0 20px 48px -12px rgba(11,45,51,0.35), 0 4px 12px rgba(11,45,51,0.1)` | Modal, tooltip |
| Primary extra | `0 4px 12px -4px rgba(25,90,100,0.5)` | Solo `.btn-primary` |
| Logo plate | `0 6px 18px -6px rgba(0,0,0,0.35)` | Solo placa del logo |
| Activity index | `0 4px 10px -4px rgba(0,145,199,0.6)` | Solo el badge 01/02 |
| `.btn-light` | `0 8px 20px -8px rgba(0,0,0,0.45)` | CTA sobre generate-panel |

No apilar `--shadow-pop` en cards de contenido.

---

## 7. Motion

| Token | Valor |
| --- | --- |
| `--dur-fast` | 120 ms (hover de botones, borders) |
| `--dur` | 200 ms (reveal, modal, overlay, chevron) |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` |
| Progress bar / ring | 400 ms mismo ease |
| `.btn:active` | `translateY(1px)` |
| `.reveal` | opacity 0 → 1, `translateY(-3px)` → 0 |
| Modal | opacity + `translateY(6px) scale(0.99)` |
| Overlay | fade |
| Chevron collapse | rotate −90° cuando `aria-expanded=false` |
| `prefers-reduced-motion` | transiciones y animaciones a 0; scroll-behavior auto |

No añadir loaders animados de marca. Los estados de espera son **texto en el botón**: “Generando…”, “Enviando…”, “Validando…”.

---

## 8. Shell general

**Implementación:** `src/App.tsx` (`.app-shell.has-sidebar`), `src/components/ui/AppSidebar.tsx`, `src/components/ui/TopBar.tsx`, `src/App.css`.

```
┌─ sidebar 292px (solo ≥1200) ─┬─ workspace ─────────────────────────────┐
│ logo plate + Operaciones     │ sticky topbar (frost)                    │
│ tarjeta Turno                │ progress 3px cyan→aqua                   │
│ tarjeta Avance + ring        │                                          │
│ Secciones del informe        │ main max ~1120+paddings                  │
│   1…5 steps                  │   KPI strip                              │
│ footer Admin                 │   alert-stack (si hay)                   │
│                              │   secciones 1–5                          │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### Desktop `≥ 1200px`

- Sidebar **fija** `position: fixed; inset: 0 auto 0 0; z-index: 60; width: 292px`
- Workspace `margin-left: 292px`
- Topbar sticky `z-index: 50`
- Topbar logo y `.topbar-admin` **ocultos**
- KPI strip 4 columnas
- Form grid 4 cols (antecedentes)

### `< 1200px`

- Sidebar `display: none`; el botón de menú del topbar la abre como drawer (misma pieza, `.sidebar.is-open`, con scrim teal-deep 55 %). Se cierra al navegar, con Escape o tocando el scrim
- Aparece logo en topbar + botón Admin icon-only (≤640 Admin solo en el footer del drawer)
- KPI 2 columnas
- Date-chip oculto
- Form 4-col → 2-col

### Jerarquía visual (de más a menos peso)

1. Sidebar oscura (ancla de marca) / en móvil el topbar + generate icon
2. Título de página 18/700
3. KPI numbers 28/700
4. Section titles 22/700 + icon well 44
5. Paneles blancos con `--shadow-card`
6. Labels 13/600 y controles 40 px
7. Meta, helpers, thead uppercase 11 px

El canvas `--bg` `#EFF4F5` con dos radiales fijos **nunca** se reemplaza por blanco puro ni por foto.

`scroll-margin-top` de secciones/cards/campos = `64px + 24px` para no quedar bajo el topbar sticky.

---

## 9. Sidebar

**Implementación:** `AppSidebar.tsx`, `StepNav.tsx`, `ProgressRing.tsx`, markup en `App.tsx` / `AdminPanel.tsx`, estilos `.sidebar*` `.step-*` `.progress-*` `.turn-*`.

Esta es la pieza más característica. Las vistas nuevas **reutilizan el mismo aside**, no inventan otra nav.

### 9.1 Fondo

- Gradiente 170°: `#134A53` 0 % → `--rio-teal-dark` 45 % → `--rio-teal-deep` 100 %
- `::before`: radial cyan `rgba(0,145,199,0.28)` 420×260 en 0% 0%
- `::after`: `contours.svg` 640×640, opacity **0.07**, anclado abajo-derecha
- Color de texto por defecto: blanco 92 %
- Overflow hidden; el body interno scrollea

### 9.2 Composición (informe)

De arriba a abajo, gap 16 px en `.sidebar-body`:

1. **Brand** (fuera del body, no scrollea con el footer)
2. **Tarjeta Turno** (`.sidebar-card.turn-card`)
3. **Tarjeta Avance** (`.sidebar-card.progress-card`)
4. **StepNav** “Secciones del informe”
5. **Footer** botón Admin

Admin sustituye 2–4 por una card de nota + lista `is-plain` de parámetros.

### 9.3 Tarjeta Turno

- Label uppercase “TURNO”
- Fecha 15/700 blanca (primera letra capitalizada por CSS)
- Separador 1 px blanco 10 %
- Filas Área / Supervisor / APR: dt muted, dd 600 derecha con ellipsis
- Si el dato está vacío: em dash “—”

### 9.4 Progreso

- `ProgressRing` default **56 px**, stroke 5, track blanco 12 %, value **`#4FD1C1`** cap round
- Label % centrado 13/700 blanco tabular
- Título “Avance del informe”
- Sub:
  - con errores: “N campos por revisar”
  - 100 %: “Listo para generar”
  - else: “Completa las secciones”
- El anillo **no** usa `--success`; el mint es exclusivo de sidebar/generate oscuro

### 9.5 StepNav — secciones del informe

`numbered={true}` (default).

Cada item: marker 28×28 circular + label 14/600 + meta 12 px.

Estados (`StepStatus`): `idle` | `done` | `warning` (+ clase `is-active` independiente).

| Estado | Marker | Conector vertical | Meta |
| --- | --- | --- | --- |
| idle | borde blanco 28 %, fill teal-dark, número | blanco 12 % | blanco 55 % |
| done | fill/borde `#4FD1C1`, icono Check 13 / stroke 3, color teal-deep | mint 55 % | normal |
| warning | borde `#F4B860`, fill naranja 16 %, TriangleAlert 12 | blanco 12 % | `#F4C886` |
| active (cualquiera) | fill blanco, color teal-dark, borde blanco; el **link** tiene fondo blanco 12 % + inset mint 3 px | — | — |

Hover de link: fondo blanco 6 %.

Conector: 2 px, `left: 25px`, de 40 px al −10 px del item siguiente. **Solo en listas numeradas**, no en `is-plain`.

Active se calcula con `useActiveSection` (offset 140 px; al fondo del documento fuerza el último id).

### 9.6 StepNav `is-plain` (Admin)

- Marker 10×10, sin borde, blanco 30 %
- Active: marker `#4FD1C1`
- Sin conectores
- El item se activa por tab, no por scroll
- Markup: `ol.step-list.is-plain` + `button.step-link` (no `<a href>`)

### 9.7 Botón Admin / footer

`.sidebar-admin`: width 100 %, height 40, radius 8, borde blanco 18 %, fondo blanco 6 %, texto blanco, 13/600, icon lucide 16. Hover: fondo 14 %, borde 30 %.

En informe: Settings + “Administrar parámetros”.  
En admin: ArrowLeft + “Volver al informe”.

Un solo control en el footer. No poner dos botones ni un menú.

### 9.8 Cómo agregar items a la sidebar **sin romperla**

**A. Nueva sección del informe (wizard)**

1. Crear `<section className="report-section" id="sec-…">` en el main.
2. Añadir un `StepNavItem` en el array de `App.tsx`: `{ id, label, meta, status }`.
3. Status debe salir de una heurística tipo `reportOverview.ts` (`done` / `warning` / `idle`).
4. No cambiar el ancho 292, no meter iconos lucide dentro del step (el marker **es** el icono).
5. Máximo razonable: 5–7 pasos. Si hay más, agrupar; no convertir la lista en un menú de 15 líneas.

**B. Nueva vista (Dashboard, Historial) — navegación de app**

- Reutilizar `AppSidebar` + `StepNav` con `numbered={false}` (lista `is-plain`), **o** una lista de `step-link` equivalente.
- El item activo: mismas clases `is-active` (fondo 12 % + inset mint).
- No usar tabs horizontales dentro de la sidebar.
- Brand y footer se quedan. Las cards Turno/Avance son **del informe**; en otras vistas se reemplazan por una `sidebar-card` de contexto (como hace Admin con “Configuración”).
- No clonar una sidebar clara. Oscura siempre.

**C. Qué no hacer**

- Recolorear a navy / charcoal / negro
- Poner el logo sin placa
- Sustituir steps por un accordion o por pills
- Añadir avatares, search, o notificaciones en el brand
- Usar `#4FD1C1` en el canvas claro

---

## 10. Topbar

**Implementación:** `TopBar.tsx` + bloque de actions en `App.tsx` / `AdminPanel.tsx`.

### Anatomía

```
[logo <1200] [eyebrow + h1] ………… [date-chip] [status-pill] [admin icon <1200] [Generar]
──────────────────────────────── progress 3px ────────────────────────────────
```

- Wrapper `.topbar-sticky { position: sticky; top: 0; z-index: 50 }`
- Barra: frost blanco 82 %, blur 12, saturate 160 %, borde inferior `--border`
- Inner: flex, `min-height: 64px`, gap 16, padding `10px 32px` (16 px bajo 860)
- max-width igual que el main

### Piezas

| Pieza | Spec |
| --- | --- |
| Eyebrow | “OPERACIONES · ÁREA DE POZAS” / Admin: “CONFIGURACIÓN”. Aqua-strong, 11/700, uppercase. Oculto ≤640 |
| Título | “Informe Diario de Operaciones” / “Administración de parámetros”. 18/700. ≤640: 15 px, puede wrapear 2 líneas (ver mobile-390.png) |
| Date chip | CalendarDays 15 + fecha larga. Height 32, radius 999, surface-soft, border. **Oculto &lt;1200** |
| Status pill | Height 32. `is-warning` (warning-soft/text + TriangleAlert 14 + “N pendientes”) o `is-ok` (success-soft/text + CircleCheck 14 + “Sin observaciones”). ≤640: 40×40, solo icono (`font-size: 0`) |
| Admin | `btn btn-ghost btn-icon-only topbar-admin`, Settings 18. Oculto ≥1200 |
| Generar | `btn btn-primary topbar-generate`, Send 15 + texto. ≤860: 40×40, se oculta el `<span>` |
| Progress | 3 px. Track `rgba(25,90,100,0.08)`. Fill `linear-gradient(90deg, --rio-cyan, --aqua)`, radio 0 3 3 0. En Admin **no hay** progress |

Admin topbar: un `btn btn-secondary btn-sm` “Volver al informe” (ArrowLeft 16). Sin pills ni generate.

---

## 11. KPI cards

**Implementación:** `src/components/ui/KpiStrip.tsx`.

### Layout

- Grid 4 cols ≥1200, 2 cols &lt;1200, mismas 2 cols en móvil pero cada card **columna** (icono arriba)
- Gap 16 (8 en ≤640)
- Card: padding `16px 20px` (móvil `12px 16px 16px`), radius 16, border `--border`, `--shadow-card`
- Fondo: `radial-gradient(160px 90px at 100% 0%, var(--tone-soft), transparent 70%)` sobre `--surface`
- Raya inferior: 3 px `var(--tone)` opacity 0.8, inset horizontal 20 px, radius 3 3 0 0

### Contenido

```
[icon 38×38 radius 12 tone-soft]  label 12/600 muted
                                  value 28/700 + unit 13/600
                                  sub 12 muted
```

Icono lucide **18** (el well es 38; en móvil well 32). Color `--tone`.

### Set actual

| Label | Tone | Icon |
| --- | --- | --- |
| Equipos en dotación | aqua | `UsersRound` |
| Actividades | teal | `Layers` |
| M³ transportados | sand | `Truck` |
| Volumen Watermaster | cyan | `Droplets` |

Unit “m³” va **junto al número**, no en el label. Sub es contexto (“Camiones tolva”), no una segunda métrica.

### Patrón reutilizable para dashboards

1. Instanciar `KpiStrip` con `KpiItem[]`.
2. Elegir `tone` del set de 6. No crear `tone-purple`.
3. 4 métricas por fila en desktop; si hay 8, dos strips, no una grilla de 8.
4. Value siempre string ya formateada (`formatMetric` para decimales).
5. No poner sparklines, deltas verdes/rojos tipo SaaS, ni menú ⋮ en el card.
6. No usar generate-panel como KPI.

---

## 12. Section headers

**Implementación:** `src/components/ui/SectionHeader.tsx`.

```
[icon 44×44 radius 14 tone-soft]  PASO N DE N     (si step != null)
                                  Título h2
                                  Descripción 13 muted, max 68ch
                                              [actions]
```

- Icon lucide **20**. Well 44 (38 en ≤640, radius 12). Inset highlight `inset 0 0 0 1px rgba(255,255,255,0.6)`
- Header flex, wrap; en `.summary-card` `flex-wrap: nowrap`
- Actions a la derecha (`margin-left: auto`): botones secondary, CollapseToggle
- Gap heading: 12 px. Gap header: 16 px
- Admin **omite** `step` (no dice “Paso N”)

Pasos actuales: 1 Antecedentes (cyan, Clipboard en uso vía GeneralInfoForm) · 2 Dotación (aqua, UsersRound) · 3 Actividades (teal, Layers) · 4 Resumen (sand, TableProperties) · 5 Generar (no usa SectionHeader; usa generate-panel).

---

## 13. Cards y formularios

**Implementación:** `.panel`, `.form-*`, inputs globales en `App.css`. Formularios: `GeneralInfoForm.tsx`, `ComputedField.tsx`, `ValidationMessage.tsx`.

### Containers

| Clase | Uso |
| --- | --- |
| `.report-section` | Sección ancla + gap 16 entre header y panel |
| `.panel` | Superficie blanca radius 16, padding 24, border + shadow-card |
| `.panel.panel-flush` | Tablas: padding 0, overflow hidden (thead/footer pegados) |
| `.subsection` | Bloque interno, margin-top 24 |
| `.equipment-picker` | Nido sunk: surface-soft, radius 12, padding 16, border-subtle |

No envolver un `.panel` dentro de otro `.panel`.

### Grids

| Clase | Desktop | ≤1199 | ≤1023 | ≤640 |
| --- | --- | --- | --- | --- |
| `.form-grid` | 2 | 2 | 2 | 1 |
| `.form-grid.cols-3` | 3 | 3 | 1 | 1 |
| `.form-grid.cols-4` | 4 | 2 | 2 | 1 |
| `.form-row-triple` / `.trips-row` | 3 | 3 | 1 | 1 |
| `.photos-row` | 2 | 2 | 2 | 1 |

`.form-field.full-width` → `grid-column: 1 / -1`.

### Controles

| Estado | Spec |
| --- | --- |
| Default | height 40 (`--control-h`), radius 10, border `--border-control`, bg surface, padding 0 12 |
| Hover (no focus, no readonly) | border `--border-control-hover` |
| Focus | border cyan + focus-ring; **sin** outline |
| Read-only / `.readonly-input` / `.computed-input` | bg `--surface-sunken`, border-subtle, cursor default |
| Inherited (`.computed-input.inherited`) | bg aqua-soft, border `#C4E8E1`, texto aqua-strong, weight 600 |
| Highlight (totales) | gradiente teal-soft→cyan-soft, border teal-line, texto teal, weight 700 |
| Invalid | border `--danger`, bg `#FFFBFB`; focus → focus-ring-danger |
| Disabled | no hay estilo específico de input disabled en el CSS actual; los botones sí (`opacity: 0.55`) |
| Placeholder | `--text-subtle` |
| Select | chevron SVG gris `%235f7075` a 11 px del borde derecho; `appearance: none` |
| Textarea | min-height 88, padding 10×12, resize vertical |
| Checkbox | 16×16, `accent-color: var(--rio-teal)` |
| Required | `span.required` coral, no “(obligatorio)” |

Label siempre visible (no material floating). Gap label–control 6 px. Error: `ValidationMessage` con `CircleAlert` 14 + texto, `role="alert"`.

Campo calculado: label + tag “Calculado” a la derecha. Campo inherited: **sin** tag “Calculado”; el color aqua ya significa “viene de Dotación”.

### Alertas de bloque

`.global-alert` radius 12, padding `12px 16px`, 14/500, icon 16.

| Clase | Semántica |
| --- | --- |
| `.global-alert` (default) | danger-soft / danger-text / danger-line |
| `.global-alert-warning` | warning |
| `.global-alert-success` | success |

`.alert-stack` gap 8. En el informe aparece bajo los KPIs.

---

## 14. Equipment UI

**Implementación:** `EquipmentOption.tsx`, `EquipmentSelector.tsx`, `ActiveRosterSection.tsx`, `RosterReadyBadge.tsx`, `TruckAssignmentCard.tsx`, `MachineryAssignmentCard.tsx`.

### 14.1 Picker (Dotación y por actividad)

- Contenedor `.equipment-picker`
- Grupos “Camiones Tolva” / “Maquinaria”: icon Truck/Tractor  (aqua-strong) + título 13/700 + contador “N de M seleccionados” 12 muted
- Grid `auto-fill, minmax(148px, 1fr)`, gap 8

### 14.2 EquipmentOption

Label 40 px height, radius 10, padding 0 12, border `--border`, bg surface.

| Estado | Spec |
| --- | --- |
| Idle | checkbox nativo 16 + código 14/600 tabular |
| Hover | border control-hover + shadow-xs |
| Selected `.is-selected` | border teal + inset 1 px teal, bg teal-tint, código teal-dark 700 |
| Ready | a la derecha, `RosterReadyBadge` (solo si hay tooltip) |

No sustituir el checkbox nativo por un custom check de 24 px. El accent-color teal es la marca.

### 14.3 Info+Check (`RosterReadyBadge`)

Patrón **aprobado y específico**; no reemplazar por un StatusChip en el picker.

- Hit area 28×28, `tabIndex={0}`, `role="img"`
- `Info` lucide 18, color `--rio-teal`
- Badge check 13×13 absolute, fill `--success`, Check 9 stroke 4, borde 1.5 surface
- Tooltip portal `position: fixed`, `translate(-50%, calc(-100% - 8px))`, min 180 max 280, teal-deep, blanco, 12 px, padding 8×10, radius 8, `--shadow-pop`, `z-index: 2000`, primera línea 600, `white-space: pre-line`
- Trigger: hover, focus, y **tap** (`pointerType` touch/pen en `pointerup`, toggle)
- En la leyenda del picker el badge tiene `cursor: default` (no es interactivo)

### 14.4 Equipment cards (fichas)

- Radius 12, border, surface, **shadow-xs** (más livianas que activity-card)
- Header: gradiente 90° surface-soft → surface, min-height 50, código 15/700 + tipo 12 muted + StatusChip + summary si collapsed
- Body padding 16
- Collapse con `CollapseToggle`
- Collapsed + error: el `ValidationMessage` queda bajo el header con padding

### 14.5 Datos inherited vs calculated

En la ficha de **actividad**, operador / zona / horómetros / km se pintan `variant="inherited"` (aqua). Horas de operación, KM recorridos, Total m³ se pintan calculated (sunken o highlight).

Hint: `.inherited-hint` con icono aqua-strong + texto muted (“Datos reutilizados desde Dotación activa”).

`trips-row` se separa con dashed `--border` superior.

Total de actividad: `.activity-m3-total` (no es un KPI strip): barra teal-line + gradiente soft, strong 18/800 teal.

---

## 15. Actividades

**Implementación:** `ActivityCard.tsx`, `.activity-*` en `App.css`. Lista: `.activities-list` gap 16.

### Header

- Fondo `linear-gradient(90deg, rgba(25,90,100,0.05), transparent 60%)`
- Index 40×40 (34 en móvil), radius 12 (10 móvil), gradiente 140° teal→cyan, blanco 13/800, sombra cyan
- Número visual `padStart(2,'0')` (“01”, “02”)
- Título “Actividad N” 15/700 teal-dark
- Tags: `.tag` cyan (“Watermaster”), `.tag.tag-danger` (“Con errores”)
- Meta: poza · tipo · “N equipos seleccionados”. Valores 600 `--text`; vacíos italic `--text-subtle`; separador “·” `--border-control`
- Actions: CollapseToggle +, si `canDelete` (index > 0), `btn-danger-ghost btn-sm` Trash2 15 + “Eliminar” (el label se oculta ≤640)

Collapsed: se oculta el body; el header pierde el border-bottom.

### Body

Padding 24. Campos: poza, tipo, descripción, equipment picker, fichas, fotos, (Watermaster si aplica), nota al pie.

Delete: `window.confirm` nativo (no modal custom).

Al agregar: `btn-secondary` en el header de sección **y** `.btn-dashed` al final de la lista (height 52, radius 16, dashed teal-line, texto teal). Las dos acciones llaman al mismo handler.

### Fotos

- Grid 2 cols (1 en ≤640)
- Vacío: `.photo-drop` dashed 1.5, min-height 72, icon well 40×40 aqua, título 600, hint 12. Hover: borde aqua, bg aqua-soft
- Con imagen: preview max-height 220 contain, bg `#E9EFF0`, acciones Reemplazar (ghost sm) / Eliminar (danger-ghost sm)

### Watermaster — dureza

4 botones 44 px, radius 10. Swatch 12×12 radius 4 con `--hardness-color`. Selected: mismo tratamiento que equipment-option (teal inset). Check lucide a la derecha.

No convertir la escala en un slider ni en pills.

---

## 16. Botones

**Implementación:** `.btn` y variantes en `App.css`.

Base: inline-flex, gap 6, height 40, padding 0 16, radius **10**, 14/600, transition 120 ms. SVG no se encoge. Active: `translateY(1px)`. Disabled: opacity 0.55, `not-allowed`.

| Variante | Clase | Fill | Border | Color | Hover | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| **Primary** | `.btn-primary` | gradiente 135° teal → `#1D6D78` | teal | `#fff` | fill/border `--rio-teal-dark` (sólido, sin gradiente) | sombra teal 50 % |
| **Secondary** | `.btn-secondary` | surface | `--border-control` | `--rio-teal-dark` | teal-tint / teal-line | shadow-xs |
| **Ghost / Tertiary** | `.btn-ghost` | transparent | transparent | `--text-muted` | bg `rgba(25,90,100,0.07)`, color `--text` | |
| **Danger** | `.btn-danger` | `--danger` | `--danger` | `#fff` | `--danger-text` | poco usado; el delete visible es ghost |
| **Danger ghost** | `.btn-danger-ghost` | transparent | transparent | `--danger-text` | `--danger-soft` | Eliminar actividad/fila/foto |
| **Dashed add** | `.btn-dashed` | blanco 50 % | 1.5 dashed teal-line, radius 16, height 52, width 100 % | teal | teal / teal-tint | “Agregar Actividad” |
| **Light (sobre oscuro)** | `.btn-light` | `#fff` | — | teal-dark | `#E9FBF8` | sombra fuerte; CTA del generate-panel |
| **On-dark** | `.btn-on-dark` | blanco 12 % | blanco 22 % | `#fff` | blanco 20 % | “Descargar PDF” |
| **On-dark ghost** | `.btn-on-dark-ghost` | transparent | transparent | blanco 85 % | blanco 10 %, color `#fff` | “Vista previa” |
| **Sidebar** | `.sidebar-admin` | ver §9.7 | | | | no usa `.btn` |

### Tamaños

| Clase | Height | Padding | Font | Radius |
| --- | --- | --- | --- | --- |
| default | 40 | 0 16 | 14 | 10 |
| `.btn-sm` | 32 (`--control-h-sm`) | 0 12 | 13 | 8 |
| `.btn-lg` | 46 | 0 22 | 15 | 10 (hereda) |
| `.btn-icon-only` | 40×40, padding 0 | | | |
| `.btn-sm.btn-icon-only` | 32×32 | | | |

Bajo **860 px**: `.btn-sm` `min-height: 40px`; collapse y icon-only **40×40** (touch).

### Iconos en botones

- Primary / generate: 15–16 px, a la **izquierda** del texto
- Table edit/delete: 14 px
- Nunca icono a la derecha salvo el chevron de CollapseToggle
- Icon-only **siempre** con `aria-label`

### CollapseToggle

`btn btn-ghost btn-sm collapse-toggle`. ChevronDown 16, rota −90° si collapsed. Texto “Minimizar” / “Expandir”. En ≤640 el texto se oculta (`.collapse-toggle-label { display: none }`) → queda icon-only 40×40.

### Footer de modal

Ghost “Cancelar” a la izquierda + Primary a la derecha. En ≤640 ambos `flex: 1`.

No crear un cuarto estilo “outline teal 2 px”. Secondary cubre ese rol.

---

## 17. Status chips, pills y tags

Hay **tres** familias. No mezclarlas.

### 17.1 `StatusChip` (fichas de equipo)

Componente `src/components/ui/StatusChip.tsx`. Height **24**, padding 0 10, radius 999, 12/600, gap 6.

| status | Clase | Fondo | Texto | Indicador |
| --- | --- | --- | --- | --- |
| `ready` | `.is-ready` | success-soft | success-text | círculo 14 success + Check 10 stroke 3.25 |
| `pending` | `.is-pending` | surface-sunken | text-muted | dot 6 px currentColor 70 % |
| `error` | `.is-error` | danger-soft | danger-text | mismo dot |

Labels actuales: “Completo”, “Pendiente”, “Revisar datos”, “Datos desde Dotación activa”, “Sin datos válidos”.

### 17.2 `status-pill` (topbar)

Height **32**, padding 0 12, gap 6, 13/600. Solo `is-ok` y `is-warning`. Icono lucide 14 **con texto**. En móvil: solo icono en 40×40.

No usar StatusChip en el topbar ni status-pill en una ficha.

### 17.3 `.tag`

Height 20, padding 0 8, 11/700 uppercase. Default cyan-soft/cyan-text. `.tag-danger` danger-soft/text. Uso: “Watermaster”, “Con errores”.

### 17.4 Cómo representar estados **futuros**

No crear una librería nueva de badges. Extender así:

| Semántica | Receta |
| --- | --- |
| **SUCCESS** | `StatusChip status="ready"` o, si es chrome de página, `status-pill is-ok` |
| **WARNING** | No existe StatusChip warning. Usar los tokens warning-soft / warning-text / warning-line **con la misma geometría del chip** (24 px, radius 999, 12/600, dot 6). Alternativa ya vista: `status-pill is-warning` en chrome |
| **DANGER** | `StatusChip status="error"` o `.tag.tag-danger` si es un marcador de título |
| **NEUTRAL** | `StatusChip status="pending"` o date-chip (surface-soft + border) si es metadato (fecha, id) |
| **INFO** | No hay chip info. Usar `.tag` (cyan) o `--rio-cyan-soft` / `--rio-cyan-text` con geometría de StatusChip. **No** usar indigo ni un azul Bootstrap |

Dot vs check: check **solo** en success. El resto, dot.

Historial de documentos (aprobar / rechazar / pendiente): SUCCESS / DANGER / NEUTRAL de esta tabla, no semáforos 3D ni switches.

---

## 18. Tablas

**Implementación:** `.data-table` + `.table-wrap`. Usos: `ActivitiesSummary.tsx` (resumen), `AdminPanel.tsx` (CRUD).

### Spec

- Wrapper: overflow-x auto, touch scrolling
- Tabla 100 %, collapse, 14 px
- Header: bg surface-soft, 11/700 uppercase ls 0.06 em, `--text-muted`, padding `12px 16px`, border-bottom `--border`
- Celdas: mismo padding, border-bottom `--border-subtle`, última fila sin borde
- Hover fila: `#F7FBFB`
- Fila en edición: `.row-editing td` → `--rio-cyan-soft`
- Vacío: `.is-empty` `--text-subtle`, em dash “—”
- Índice: `.col-index` 44 px, muted, 700, tabular
- Acciones: `.col-actions` width 1 %, right, nowrap. `.table-actions` gap 4
- Códigos de equipo: `.code-token` height 22, padding 0 8, radius 999, teal-soft / teal-dark 12/700
- Inputs dentro de td: height 32, min-width 120, max-width 280
- Admin: td `vertical-align: middle`
- Footer de panel flush: `.panel-footer` padding 12×16, border-top subtle, bg surface-soft, botón “+ Agregar”

### Acciones de fila (Admin)

Idle: ghost-sm Pencil 14 + “Editar” · danger-ghost-sm Trash2 14 + “Eliminar”.  
Editando: primary-sm “Guardar” · ghost-sm “Cancelar”.

Confirmaciones de delete: `window.confirm` nativo.

### Cómo debe verse una **tabla de historial** (aún no existe)

Derivación estricta:

1. `SectionHeader` + `.panel.panel-flush` + `.table-wrap` + `.data-table`
2. Thead uppercase muted, no header teal invertido (eso es del **PDF**, no de la web)
3. Columnas típicas: fecha, turno/área, supervisor, estado (StatusChip), acciones
4. Estado: chips del §17, no bolitas sueltas
5. Hover `#F7FBFB`, no elevación
6. Acciones a la derecha: ghost “Ver” / primary-sm si hay CTA fuerte / danger-ghost para rechazar
7. Empty: `.empty-state` dashed **dentro** del panel (o una fila única “No hay documentos”), no una ilustración
8. Responsive: el wrap ya hace scroll-x; en ≤640 no apilar a cards a menos que la tabla se vuelva ilegible. Si se apila, cada ítem debe ser `.equipment-card` / `.activity-card`, no un diseño nuevo
9. Paginación (si aparece): secondary/ghost 32–40 px, no infinite scroll tipo red social

---

## 19. Modales

**Implementación:** `SendReportModal.tsx`, `AdminPasswordModal.tsx`, `.modal-*`.

### Overlay

- `position: fixed; inset: 0; z-index: 1000`
- Flex center, padding 16
- Fondo `rgba(11, 45, 51, 0.55)` (= teal-deep 55 %)
- `backdrop-filter: blur(3px)`
- Click en overlay cierra (`role="presentation"`). Click en card `stopPropagation`
- Fade 200 ms

### Card

- Width `min(520px, 100%)`. Password: `.modal-card-sm` → `min(420px, 100%)`
- Max-height `calc(100vh - 32px)`, column flex, overflow hidden
- Surface, border `--border`, radius **20**, `--shadow-pop`
- Entrada: fade + 6 px up + scale 0.99

### Header

- Padding `20px 20px 16px 24px`
- Gradiente 90° teal-tint → surface
- Border-bottom subtle
- Título 18/700 + subtítulo 13 muted
- Close: `btn btn-ghost btn-sm btn-icon-only`, X 18, `aria-label="Cerrar"`

### Body

- Padding `20px 24px`, gap 16, scroll si hace falta
- Formularios estándar (§13)
- Archivo adjunto: `.modal-file` surface-soft, radius 12, FileText 16 **coral**, 13/label, word-break
- Destinatarios extra: `.modal-group-title` 13/600; filas flex + danger-ghost icon-only Trash 16
- “Agregar destinatario”: secondary sm
- Error de envío: `.global-alert.modal-send-error`

### Footer

- Padding `12px 24px`, border-top, **surface-soft**
- Flex end, gap 8
- Ghost Cancelar + Primary (icono Send 15 + texto / estado “Enviando…”)
- ≤640: los `.btn` del footer `flex: 1`

### Password (login de admin)

Misma anatomía, card 420, un campo password, primary “Entrar” / “Validando…”, disabled si vacío o submitting.

### Confirmaciones

Hoy: `window.confirm` / `alert` nativos (eliminar actividad, quitar equipo con datos, errores de PDF). Un **modal de aprobación/rechazo futuro** debe copiar `SendReportModal`, no el `window.confirm`. Footer: ghost “Cancelar” + primary “Aprobar” o danger “Rechazar”. Si hay comentario, textarea estándar en el body. No hay que inventar un split-button ni un stepper.

---

## 20. Panel Generar

Única superficie oscura de contenido (además de la sidebar). **No es un hero de marketing.** Es el paso 5.

- Radius 20, padding 32 (24 bajo 860)
- Fondo: radial cyan 45 % a la derecha + gradiente 135° teal → teal-dark → teal-deep
- Contours.svg 10 % a la derecha
- `--shadow-raised`
- Eyebrow mint `#7FE0D4` “Paso 5 de 5”
- Título 28/700 blanco
- Copy 13, blanco 75 %, max 56 ch
- Warning pill: fondo naranja 18 %, texto `#FFD79C`, radius 999, TriangleAlert 15
- Acciones: on-dark-ghost Vista previa · on-dark Descargar PDF · **btn-light btn-lg** Generar informe
- ≤860: acciones column-reverse stretch (el CTA queda arriba del stack visualmente al invertirse)

No repetir este panel en Dashboard ni en Historial. Si una vista necesita un CTA fuerte sobre claro, usar `.btn-primary`.

---

## 21. Admin

**Implementación:** `AdminPanel.tsx`.

Mismo shell. Sidebar context “Administración”. Card de nota + lista `is-plain`. Topbar “Administración de parámetros” + Volver secondary sm. **Sin** KPI strip ni progress.

### Tabs

`.admin-tabs`: grid 4 cols (2 bajo 860), padding 4, gap 4, radius 16, surface, border, shadow-card.

Cada tab height 46 (44 bajo 860): icon well 28×28 radius 8 tone-soft → **activo: well sólido `--tone`, icono blanco**; label 14/600; count pill 22 px height, sunken; activo: count blanco / color tone. Activo: bg tone-soft + inset inferior 2 px tone.

Tones: cyan / aqua / sand / coral (ver §2.3).

Debajo: `SectionHeader` (sin step) + `panel-flush` + tabla §18.

Esto es el patrón de **subnavegación de una vista**, no de la app. La app se navega por sidebar.

---

## 22. Dashboard futuro

**No diseñar el dashboard ahora.** Cuando exista, **derivarlo** así:

| Pieza | Receta |
| --- | --- |
| Shell | `app-shell has-sidebar` + `AppSidebar` + `TopBar`. Sidebar `is-plain` con ítems Dashboard / Informe / Historial / Admin |
| Eyebrow | “Operaciones · Área de Pozas” |
| Título | corto, 18/700 (“Dashboard”, “Resumen del turno”) |
| Actions | date-chip + filtros como `btn-secondary` / selects estándar. No segmented control iOS |
| KPIs | `KpiStrip` existente, mismos tones |
| Bloques | `.report-section` + `SectionHeader` (sin “Paso N”) + `.panel` |
| Tablas | §18 |
| Filtros | `.form-grid` dentro de un panel, no una barra glass |
| Charts | ver §22.1 |
| Empty | `.empty-state` |
| CTA de generar | botón primary en topbar, **no** generate-panel duplicado |

### 22.1 Gráficos

No hay charts en la web hoy. El PDF usa barras steel-blue `#2E75B6` — **no copiar ese azul a la web**.

Reglas:

- Paleta de series, en orden: `--rio-teal`, `--rio-cyan`, `--aqua`, `--sand`, `--coral`, `--indigo`
- Máximo 4–6 series. Nada de rainbow (Tableau 10, Spectral, Nivo default)
- Sin 3D, sin glow, sin gradient fill “gratis” (un fill sólido o un fill teal-soft basta)
- Grid: líneas `--border-subtle`, ticks `--text-muted` 11–12 px Plus Jakarta
- Axis labels 12/600 `--text-label`
- Tooltips: clonar `.roster-ready-tooltip` (teal-deep, blanco, radius 8, 12 px, shadow-pop)
- Fondos del chart: transparent o `--surface`, nunca negro
- Barras radius ≤ 4 px (no 16)
- Donut: un valor + resto muted; no 8 slices
- Leyenda: 12 px, dot 8, no recuadro con sombra

Librería: si se añade, **tema custom obligatorio** con estos tokens. Prohibido el tema default de Recharts/Chart.js/Nivo.

---

## 23. Responsive

### Breakpoints **reales del CSS**

| Media | Efecto |
| --- | --- |
| `min-width: 1200px` | Sidebar visible, workspace con margin-left 292, oculta topbar-logo y topbar-admin |
| `max-width: 1199px` | KPI 2 cols, date-chip hidden, form 4-col → 2 |
| `max-width: 1023px` | form 3-col, form-row-triple, trips-row → 1 col |
| `max-width: 860px` | padding compacto, generate icon-only, admin-tabs/hardness 2 cols, btn-sm touch 40, generate-actions column-reverse, hide collapse labels |
| `max-width: 640px` | 1 col forms/photos, oculta eyebrow y logo, título 15 px, status-pill icon-only, KPI stack interno, section-icon 38, activity-index 34, modal buttons flex 1, historial en cards |

No hay breakpoint 768 ni 1024 ni 1440 en el CSS. Los anchos de prueba se **mapean** a esos rangos.

### Comportamiento por ancho de prueba

| Ancho | Rango CSS | Sidebar | Topbar | KPIs | Forms | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| **1440** | ≥1200 | fija 292 | sin logo, con date-chip, Generar con texto | 4 | 4 cols antecedentes | Ver `desktop-1440.png` |
| **1280** | ≥1200 | igual | igual | 4 | 4 | Workspace más estrecho; content max 1120+padding se ajusta |
| **1024** | 861–1199 | no | logo + admin icon, sin date-chip, Generar con texto | 2 | 4→2; 3-col **se mantiene** (1024 > 1023) | |
| **768** | ≤860 y ≤1023 | no | padding 16, Generar icon-only | 2 | 3-col y triples → 1; 2-col se mantiene | Ver `tablet-768.png`. Equipment grid ~4 cols (minmax 148) |
| **430 / 390 / 375** | ≤640 | no | sin logo ni eyebrow, título wrap, pills 40×40 | 2 cols pero card en columna | todo 1 col | Ver `mobile-390.png`. Touch 40 px. Tooltips tap-toggle |

### Piezas

| Pieza | Responsive |
| --- | --- |
| Sidebar | desaparece &lt;1200 y se abre como drawer desde el menú del topbar. Admin: icono en topbar (641–1199) y footer del drawer |
| Topbar | sticky en todos los anchos |
| KPIs | 4 → 2; en ≤640 icono 32 y número 22 |
| Grids | ver tabla §13 |
| Activities | header se alinea arriba en móvil; index 34; “Eliminar”/“Minimizar” solo icono |
| Tables | scroll-x (`.table-wrap`) |
| Tooltips | hover+focus desktop; tap toggle en touch (`RosterReadyBadge`) |
| Modals | width 100 % menos 32 px; footer botones iguales en móvil |
| Touch targets | ≥40 px bajo 860 para sm / icon-only / collapse / status / generate |

---

## 24. Accesibilidad

| Tema | Qué hay hoy | Qué repetir |
| --- | --- | --- |
| Focus visible | Outline cyan 2/2 global; inputs usan ring 3 px y outline none | Nunca `outline: none` sin reemplazo |
| Contraste | Texto `#142226` sobre blanco/bg; blanco sobre teal oscuro; muted `#5D6F74` para meta (no para datos) | No usar `--text-subtle` para valores |
| Labels | `field-label` + `htmlFor`; adicionales en modal con `.sr-only` | Todo input con label |
| Keyboard | Step links `<a href="#id">`; tabs `role="tab"`; modal `role="dialog" aria-modal`; close button | Trap de foco **no** está implementado; no empeorar. Overlay click cierra |
| Touch | 40 px en compacto; badge tap | No bajar de 40 en móvil |
| Tooltip | hover, focus, tap; `role="tooltip"`; `aria-label` en el badge | No tooltip solo-hover |
| Disabled | opacity 0.55, cursor not-allowed; no quitar del tab order salvo que ya esté |
| Read-only | computed es `role="textbox" aria-readonly`, no `<input disabled>` | El usuario debe poder copiar visualmente el valor |
| Reduced motion | transiciones a 0 | |
| Live errors | `role="alert"` en field-error y global-alert | |
| Scroll a error | `data-field`, `scroll-margin-top` | Mantener el contrato DOM si se añaden campos |
| Idioma | `html lang="es"` | Copy en español, misma voz operativa |

Contraste no medido con laboratorio en esta auditoría; visualmente labels 600 sobre blanco y teals de marca sobre wells suaves. No poner `--rio-cyan` de 14 px sobre `--bg` (usar `--rio-cyan-text` o well).

---

## 25. Iconografía

**Librería:** `lucide-react` exclusively.

| Contexto | Size | Stroke (default lucide 2, salvo nota) |
| --- | --- | --- |
| KPI | 18 | default |
| Section header | 20 | |
| Admin tab | 16 | |
| Sidebar admin / back | 16 | |
| Botones default | 15–16 | |
| Botones sm / tabla | 14 | |
| Status pill | 14 | |
| Field error | 14 | |
| Global alert | 16 | |
| Photo drop | 18 | |
| Ready check (chip) | 10 / stroke **3.25** | |
| Ready check (badge) | 9 / stroke **4** | |
| Step done | 13 / stroke **3** | |
| Step warning | 12 / stroke **2.5** | |
| Collapse | 16 | |
| Close modal | 18 | |
| Info badge | 18 | |

### Cuándo acompañar texto

- Navegación, CTA, delete con consecuencias, tabs, steps: **icono + texto** (el texto se puede ocultar en compacto, no en desktop).
- Close, admin compacto, generate compacto, collapse compacto: **solo icono + aria-label**.

### Prohibido

- Emojis (✅ ⚠️ 📊) como iconos de producto
- Mix con Font Awesome / Heroicons / Material
- Iconos filled + outlined a la vez (lucide outlined)
- Iconos decorativos de 48 px en empty states (si se añade uno, 20–24 en well tone-soft, como section-icon)

Motivo de marca extra: `contours.svg` es **textura**, no icono.

---

## 26. Cómo extender este diseño

Reutilizar, no redibujar. Checklist por tipo de vista.

### 26.1 Dashboard

Ver §22. Shell + KpiStrip + panels + charts sobrios. Sidebar `is-plain`. Sin generate-panel.

### 26.2 Historial de documentos

- Shell + SectionHeader “Historial” (tone teal o cyan) + filtros en `.form-grid` dentro de un `.panel` compacto **o** controles en el topbar (selects height 40)
- Tabla §18
- Estado por fila: StatusChip
- Acciones: Ver (ghost), Descargar (ghost + Download), y si aplica Aprobar/Rechazar (primary / danger-ghost) abriendo el modal §19
- Empty: `.empty-state` “No hay informes registrados.”
- No kanban, no timeline vertical tipo redes, no cards masonry

### 26.3 Vista Generar informe

Ya existe (paso 5 + modal). Una vista dedicada debería **ser esa sección a full-page**, no un wizard con stepper horizontal tipo Shopify. La sidebar numerada **es** el stepper.

### 26.4 Modal de aprobación

Clonar `SendReportModal`:

- Título 18/700, subtítulo 13 muted
- Body: metadatos en `.modal-file` o computed inherited; comentario en textarea
- Footer: Cancelar ghost + Aprobar primary **o** Rechazar `btn-danger`
- No checkboxes de “no volver a mostrar”
- Width 520 (o 420 si es solo confirmación)

### 26.5 Login

No hay pantalla de login de usuario. El único auth visual es `AdminPasswordModal`.

Una pantalla de login futura:

- Mismo canvas `--bg` + washes
- **No** sidebar
- Card centrada = `.modal-card` (radius 20, shadow-pop) **o** un `.panel` 420–520 centrado verticalmente
- Logo: placa blanca innecesaria sobre fondo claro → PNG 80–120 px de ancho, centrado, mb 24
- Título 18/700, helper 13 muted
- Inputs estándar, primary width 100 % height 40–46
- Error: ValidationMessage / global-alert
- Prohibido: split-screen con foto de mina, glass card, gradient full-bleed, “Welcome back 👋”

### 26.6 Empty states

Ya existe `.empty-state`: dashed 1.5 `--border`, radius 12, padding 20, surface-soft, 13 muted, **centrado**. Usar esa clase. Texto corto en español. Opcional: icono lucide 20 en well 40 tone-soft encima del texto. Sin ilustraciones ni Lottie.

### 26.7 Loading states

No hay spinner ni skeleton. Patrón actual: **el botón cambia su label** y se `disabled`.

Para una vista que carga datos:

- Preferir el mismo truco en el CTA
- Si hace falta un bloque: panel blanco + texto 13 muted “Cargando…” (sin barra índigo)
- Si se añaden skeletons: radius 8, color `--rio-teal-soft`, sin shimmer arcoíris

### 26.8 Error states

- Campo: `.field-invalid` + ValidationMessage
- Página / API: `.global-alert` (danger) en `.alert-stack`
- Inline de envío: `.global-alert.modal-send-error`
- Config remota fallida: el contexto guarda un mensaje; no hay full-page error. No crear una 404 ilustrada.

---

## 27. Do / Don’t

### DO

- Importar tokens de `src/styles/tokens.css` y clases de `src/App.css`
- Usar `AppSidebar`, `TopBar`, `KpiStrip`, `SectionHeader`, `StatusChip`, `EquipmentOption`, `StepNav`
- Plus Jakarta 400–800, body 14/1.5
- Primary teal, focus cyan, inherited aqua, totales teal-cyan soft
- Cards blancas radius 16, inputs radius 10 height 40
- 1 px borders `--border` / `--border-control`
- lucide 14–20 junto a texto
- Sidebar 292 oscura con placa de logo 108×46
- Sticky topbar frost + progress 3 px
- Tablas thead uppercase muted, hover `#F7FBFB`
- Modales 520 radius 20 overlay teal-deep 55 %
- Touch ≥40 px bajo 860
- Copy en español, voz operativa (“Campos por revisar”, no “Oops!”)

### DON’T

- Tailwind, shadcn/ui, MUI, Chakra, Ant, Daisy, Flowbite
- Inter / Geist / Poppins / Roboto
- Dark mode del canvas
- Glass cards sobre el contenido
- Gradientes mesh, blobs, noise, 3D
- Sombras > `--shadow-pop` en listados
- Radius 24–32 en inputs o botones
- Pills para cada label
- Hero landing, ilustraciones, emojis de UI
- Rainbow charts, 3D charts, tema default de Recharts
- Teal del PDF `#176D78` en la web
- Favicon púrpura como color de producto
- Sidebar clara, sidebar &lt;240 px, sidebar &gt;320 px
- Una navegación móvil distinta de la sidebar (el drawer **es** la sidebar)
- Recolorear el logo
- Floating labels
- Botón primary cyan o coral
- `window.confirm` para flujos de aprobación (sí se usa hoy para deletes; el flujo nuevo de aprobar/rechazar va a modal)
- Animaciones &gt;200 ms salvo progress 400 ms
- Segunda fuente para números (usar tabular-nums de Jakarta)

---

## 28. Referencias de código

| Pieza | Archivos |
| --- | --- |
| Tokens | `src/styles/tokens.css` |
| Estilos de producto | `src/App.css` |
| Fonts / bootstrap CSS | `src/main.tsx` (`@fontsource/plus-jakarta-sans`, tokens, `index.css`) |
| Shell / KPIs / generate | `src/App.tsx` |
| Sidebar | `src/components/ui/AppSidebar.tsx` |
| Topbar | `src/components/ui/TopBar.tsx` |
| Steps | `src/components/ui/StepNav.tsx`, `src/components/ui/useActiveSection.ts` |
| Progress ring | `src/components/ui/ProgressRing.tsx` |
| KPIs | `src/components/ui/KpiStrip.tsx` |
| Section header | `src/components/ui/SectionHeader.tsx` |
| Status chip | `src/components/ui/StatusChip.tsx` |
| Equipment option | `src/components/ui/EquipmentOption.tsx` |
| Collapse | `src/components/ui/CollapseToggle.tsx` |
| Overview / step status | `src/components/reportOverview.ts` |
| Antecedentes | `src/components/GeneralInfoForm.tsx` |
| Dotación | `src/components/ActiveRosterSection.tsx` |
| Ready badge + tooltip | `src/components/RosterReadyBadge.tsx` |
| Actividad | `src/components/ActivityCard.tsx` |
| Fichas equipo | `src/components/TruckAssignmentCard.tsx`, `src/components/MachineryAssignmentCard.tsx`, `src/components/EquipmentSelector.tsx` |
| Watermaster | `src/components/WatermasterSection.tsx` |
| Fotos | `src/components/PhotoInput.tsx` |
| Calculados | `src/components/ComputedField.tsx` |
| Errores de campo | `src/components/ValidationMessage.tsx` |
| Resumen tabla | `src/components/ActivitiesSummary.tsx` |
| Modal envío | `src/components/SendReportModal.tsx` |
| Modal password | `src/components/AdminPasswordModal.tsx` |
| Admin | `src/components/AdminPanel.tsx` |
| Logo | `src/assets/rioloa-logo.png` |
| Textura | `src/assets/contours.svg` |
| PDF (otro sistema) | `.cursor/skills/pdf-report-aesthetics/SKILL.md`, componentes PDF bajo `src/` de reporte — **no gobierna la web** |

Contratos DOM a preservar (no son visuales, pero el scroll/validación depende de ellos): `data-field`, `id="activity-<id>"`, `id="roster-<equipmentId>"`, `.activity-card`, `button.hardness-btn`, `hardness-25/50/75/100`.

---

## 29. Límites de esta guía

Documentado desde código + app en `http://localhost:5173/` + screenshots del 2026-11-01.

**Fiel al diseño actual** en: paleta, type, spacing, shell, sidebar, topbar, KPIs, forms, equipment, activities, buttons, chips, tables, modals, admin, breakpoints CSS, iconografía.

**No determinado con certeza / fuera de alcance:**

- Ratios de contraste WCAG exactos (no se midió con analizador; se describen tokens).
- El favicon púrpura **no** forma parte de la identidad RIOLOA; está en el repo pero no debe replicarse.
- `src/assets/hero.png` no se usa; no se documenta como patrón.
- Dashboard, Historial, Login y Revisión ya existen (`src/pages/`), derivados de las secciones 22 y 26. Los textos "futuro" de esas secciones quedan como la regla con que se construyeron; para extenderlos, gana el código.
- Los charts usan Recharts con tema propio (§22.1): teal/sand/coral en el donut, un solo color por gráfico en el resto, tooltip `.chart-tooltip`. El donut tiene 3 segmentos de estado porque así se pidió; §22.1 sigue valiendo como regla general.
- Estados de informe: `ReportStatusChip`, sobre `StatusChip` (En revisión = pending, Aprobado = ready, Rechazado = error, Error de envío = warning, implementado con la receta de §17.4).
- Modo MVP sin login: `GuestProfileModal` copia `AdminPasswordModal` (card 420) y es obligatorio en la primera entrada, sin botón cerrar. El menú de usuario del topbar usa `.user-menu`, tanto para la sesión como para el perfil guest. `MvpAccessPage` reutiliza el patrón de login (§26.5); con `.is-overlay` cubre la app sin desmontarla.
- StatusChip no implementa `warning` ni `info`; la receta del §17.4 es una extensión **geométrica** de lo existente, no una clase ya mergeada.
- El PDF (`#176D78`, barras `#2E75B6`, headers teal invertidos) es otro sistema; no se unifica aquí.
- Clear space de marca: no hay manual corporativo aparte; se documentó el padding real de `.logo-plate` y `.topbar-logo`.
- `loading` en `ConfigContext` no tiene UI propia; el informe pinta con `default-config.json` mientras llega `/api/config`.
- Confirmaciones nativas del browser (`window.confirm` / `alert`) no siguen esta estética; no se “rediseñaron” en esta guía.

Si el CSS y esta guía divergen en el futuro, **gana el CSS en runtime**. Actualizar este archivo en la misma sesión en que se cambie el sistema visual. No al revés.

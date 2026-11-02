---
name: pdf-report-aesthetics
description: >-
  Visual system for Informe Diario de Operaciones PDFs built with @react-pdf/renderer.
  Use when editing DailyReportPdf, pdfStyles, pdfTheme, activity detail, antecedentes,
  charts, tables, headers, or any PDF layout/typography for this RIOLOA report.
---

# PDF report aesthetics (RIOLOA)

Brand teal: `#176D78` (teal) and `#155F68` (tealDark). Never use red for title, area, or date.

## Cover block

- Title `INFORME DIARIO DE OPERACIONES`: centered, bold, **20pt**, tealDark.
- `Área de Pozas` and `Fecha:`: centered, bold, **12pt**, same tealDark (not red).
- Keep logo + NOVANDINO header row.

## Sections (Antecedentes / Detalle)

Do not render as loose Word-like paragraphs.

- Section label: tealDark, 11–12pt, bold, letter-spacing, with a 3pt teal bar on the left.
- Antecedentes: light teal panel (`#F3F7F8`), 1pt `#D5E3E6` border, label/value rows (label muted/teal, value 10pt).
- Each activity: card with left teal accent, light fill, title `Actividad N` in tealDark. Description is last in the card (below Equipos), wrapped in double quotes, 10pt / 1.4 line-height, with ~10pt top margin so it separates from Equipos.
- Skip empty Watermaster activity 1; **renumber** remaining activities from 1.

## Charts

- Truck chart: one bar **per truck code** (sum M³ across activities).
- Title: `Total m³ por camión`.
- Excel-like: horizontal grid, Y ticks, X label `Camión`, steel-blue bars `#2E75B6`, no cluttered data labels.

## Tables

Keep teal header + white bold text. Body text centered and bold. Do not add Total M³ to the trucks table.

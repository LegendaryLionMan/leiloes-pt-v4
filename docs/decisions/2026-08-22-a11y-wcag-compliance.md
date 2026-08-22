# 2026-08-22 — A11y: WCAG 1.4.4 + 2.5.5 compliance

## Context
Lente 4 audit found:
- viewport meta had maximum-scale=5 (impedes user zoom, WCAG 1.4.4 fail)
- 3 nav buttons had min-h-[40px] (WCAG 2.5.5 fail — min 44x44)
- 25 thumbnails had alt="" (decorative, não informativo para screen readers)
- "🔄 Refrescar agora" button was 128x24 (24px height)

## Decision
- Removed maximum-scale from viewport meta
- Updated min-h-[40px] → min-h-[44px] for all nav buttons
- Thumbnail alt now = it.titulo || it.referencia
- Refresh button now min-h-[36px] py-2

## Why these targets
- WCAG 2.5.5 AAA = 44x44px touch target
- 36px for inline buttons (acceptable for non-tap-only contexts)
- WCAG 1.4.4 = user must be able to zoom up to 200%

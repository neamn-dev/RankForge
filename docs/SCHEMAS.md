# Shared Editing Model (v1)

This document defines the single source of truth that drives BOTH the browser
preview and the FFmpeg renderer. Preview and export must consume the same
document — never the exported MP4.

## Time representation

All timeline and source timestamps are **integer ticks**.

- `ticksPerSecond` is fixed at `fps * 100` (e.g. 3000 ticks/s at 30 fps).
- Source-media timestamps and timeline timestamps are separate fields.
- All arithmetic is integer; never accumulate float seconds.

## Template document

```json
{
  "schemaVersion": 1,
  "id": "uuid",
  "name": "My Template",
  "isDefault": false,
  "createdAt": "iso8601",
  "updatedAt": "iso8601",
  "canvas": { "width": 1080, "height": 1920, "fps": 30 },
  "header": {
    "enabled": true,
    "backgroundColor": "#0f0f14",
    "backgroundImageAssetId": null,
    "gradient": null,
    "heightPct": 18,
    "paddingPx": 24,
    "title": "TOP 10",
    "subtitle": "Best Moments",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontSizePx": 64,
    "fontWeight": 800,
    "letterSpacingPx": 2,
    "lineHeight": 1.2,
    "textColor": "#ffffff",
    "highlightedWords": ["10"],
    "highlightColor": "#facc15",
    "cornerRadiusPx": 0,
    "border": null,
    "entranceAnimation": "fade-down"
  },
  "ranking": {
    "count": 10,
    "order": "descending",
    "defaultColor": "#ffffff",
    "perRankColors": { "1": "#facc15", "2": "#e5e7eb", "3": "#d97706" },
    "fontFamily": "Inter",
    "fontSizePx": 120,
    "bold": true,
    "outlineColor": "#000000",
    "outlineWidthPx": 4,
    "shadow": { "color": "#000000", "blurPx": 8, "offsetPx": 4 },
    "badge": { "shape": "circle", "backgroundColor": "#1f2937", "paddingPx": 20 },
    "position": "top-left",
    "spacingPx": 8,
    "horizontalAlign": "left",
    "verticalAlign": "top",
    "animation": "pop-in",
    "highlightCurrent": true
  },
  "labels": {
    "enabled": true,
    "texts": {},
    "fontFamily": "Inter",
    "fontSizePx": 36,
    "color": "#ffffff",
    "align": "left",
    "backgroundColor": null,
    "emoji": null,
    "maxLines": 2,
    "position": "bottom",
    "paddingPx": 12,
    "animation": "fade-up",
    "visibleDurationTicks": null
  },
  "branding": {
    "logoAssetId": null,
    "watermarkText": null,
    "watermarkImageAssetId": null,
    "position": "bottom-right",
    "scale": 0.2,
    "opacity": 0.6,
    "introEnabled": false,
    "outroEnabled": false,
    "channelName": null
  }
}
```

`perRankColors` overrides never mutate the shared default; the generator
resolves rank N → `perRankColors[N] ?? defaultColor`.

## Project document

```json
{
  "schemaVersion": 1,
  "id": "uuid",
  "name": "Top 10 Funny Cats",
  "templateId": "uuid-or-null",
  "createdAt": "iso8601",
  "updatedAt": "iso8601",
  "timeline": {
    "width": 1080, "height": 1920, "fps": 30,
    "ticksPerSecond": 3000,
    "durationTicks": 90000
  },
  "assets": [
    {
      "id": "uuid", "kind": "video|audio|image",
      "originalName": "clip1.mp4",
      "storageKey": "media/ab12….mp4",
      "durationTicks": 15000, "width": 1920, "height": 1080,
      "fps": 30.0, "sizeBytes": 1234567, "hasAudio": true,
      "status": "ready|processing|failed"
    }
  ],
  "tracks": [
    {
      "id": "uuid", "type": "video|audio|text|graphics|effects",
      "name": "Video 1", "visible": true, "locked": false, "order": 0,
      "clips": [
        {
          "id": "uuid", "assetId": "uuid",
          "sourceInTicks": 0, "sourceOutTicks": 15000,
          "timelineStartTicks": 30000, "durationTicks": 15000,
          "transform": { "x": 0, "y": 0, "scale": 1.0, "rotation": 0,
                          "crop": null, "opacity": 1.0 },
          "volume": 1.0, "speed": 1.0,
          "fadeInTicks": 0, "fadeOutTicks": 0,
          "transitionIn": null, "transitionOut": null,
          "ranking": { "position": 3, "label": "Sleeping cat" },
          "keyframes": []
        }
      ]
    }
  ],
  "export": { "preset": "vertical-1080p", "width": 1080, "height": 1920,
              "fps": 30, "videoBitrateKbps": 8000, "audioBitrateKbps": 192 }
}
```

## Rules

1. UI code renders from this document; FFmpeg rendering plans are derived from it.
2. Reopening a project always restores this document — exports are not projects.
3. New fields must be additive and backward compatible; bump `schemaVersion`
   and write a migration when a breaking change is unavoidable.
4. Never store media binaries in these documents — only metadata + storage keys.

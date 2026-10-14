import type { CSSProperties } from "react";
import type { TemplateDocument } from "../../types/template";

/** CSS approximation of the final FFmpeg-rendered composition. */
export function TemplatePreview({ doc, sampleRank }: { doc: TemplateDocument; sampleRank: number }) {
  const { header, ranking, labels, branding, canvas } = doc;
  const rankColor = ranking.per_rank_colors[String(sampleRank)] ?? ranking.default_color;

  const numberStyle: CSSProperties = { position: "absolute" };
  if (ranking.position === "center") {
    numberStyle.top = "50%";
    numberStyle.left = "50%";
    numberStyle.transform = "translate(-50%, -50%)";
  } else {
    if (ranking.position.includes("left")) numberStyle.left = "4%";
    else numberStyle.right = "4%";
    if (ranking.position.includes("top")) numberStyle.top = `calc(${header.height_pct}% + 3%)`;
    if (ranking.position.includes("bottom")) numberStyle.bottom = "4%";
  }

  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="relative bg-black rounded-lg overflow-hidden border border-neutral-800"
           style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}>
        {/* Simulated footage area */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
          <span className="text-neutral-600 text-xs">video clip {sampleRank}</span>
        </div>

        {/* Header */}
        {header.enabled && (
          <div className="absolute left-0 right-0 top-0 flex flex-col justify-center"
               style={{
                 height: `${header.height_pct}%`,
                 background: header.background_color,
                 padding: header.padding_px / 6,
                 borderRadius: `0 0 ${header.corner_radius_px / 4}px ${header.corner_radius_px / 4}px`,
               }}>
            <div style={{
              textAlign: header.text_align,
              fontFamily: header.font_family,
              fontSize: header.font_size_px / 5,
              fontWeight: header.font_weight,
              letterSpacing: header.letter_spacing_px / 3,
              lineHeight: header.line_height,
              color: header.text_color,
            }}>
              <HighlightedText text={header.title} words={header.highlighted_words} color={header.highlight_color} />
              {header.subtitle && (
                <div style={{ fontSize: header.font_size_px / 9, fontWeight: 400, opacity: 0.85 }}>
                  {header.subtitle}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ranking number */}
        <div style={numberStyle}>
          <span style={{
            display: "inline-block",
            fontFamily: ranking.font_family,
            fontSize: ranking.font_size_px / 3.2,
            fontWeight: ranking.bold ? 900 : 400,
            color: rankColor,
            padding: ranking.badge.shape !== "none" ? ranking.badge.padding_px / 6 : 0,
            borderRadius: ranking.badge.shape === "circle" ? "9999px"
              : ranking.badge.shape === "rounded" ? "12px" : 0,
            background: ranking.badge.shape !== "none" ? ranking.badge.background_color : "transparent",
            WebkitTextStroke: `${ranking.outline_width_px / 6}px ${ranking.outline_color}`,
            textShadow: `0 ${ranking.shadow.offset_px / 4}px ${ranking.shadow.blur_px / 3}px ${ranking.shadow.color}`,
          }}>{sampleRank}</span>
          {labels.enabled && labels.texts[String(sampleRank)] && (
            <div style={{
              fontFamily: labels.font_family,
              fontSize: labels.font_size_px / 5,
              color: labels.color,
              background: labels.background_color ?? "transparent",
              padding: labels.padding_px / 8,
              marginTop: ranking.spacing_px / 4,
              borderRadius: 6,
            }}>{labels.emoji} {labels.texts[String(sampleRank)]}</div>
          )}
        </div>

        {/* Branding watermark */}
        {branding.watermark_text && (
          <div className="absolute text-[9px] text-neutral-400"
               style={{
                 [branding.position.includes("left") ? "left" : "right"]: "3%",
                 [branding.position.includes("top") ? "top" : "bottom"]: "2%",
                 opacity: branding.opacity,
                 fontSize: 16 * branding.scale + 6,
               }}>{branding.watermark_text}</div>
        )}
      </div>
    </div>
  );
}

function HighlightedText({ text, words, color }: { text: string; words: string[]; color: string }) {
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapeRe).join("|")})`, "gi");
  return <>{text.split(pattern).map((part, i) =>
    words.some((w) => w.toLowerCase() === part.toLowerCase())
      ? <span key={i} style={{ color }}>{part}</span>
      : <span key={i}>{part}</span>,
  )}</>;
}

function escapeRe(s: string) {
  return s.replace(new RegExp("[.*+?^${}()|[\\]\\\\]", "g"), "\\$&");
}

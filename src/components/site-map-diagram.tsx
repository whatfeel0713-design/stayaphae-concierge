interface SiteMapDiagramProps {
  highlight: "firepit" | "recycling";
}

/**
 * 실측 도면이 아닌 개략적인 간편 위치도. 손님이 파이어핏·장작창고·
 * 분리수거함의 대략적인 위치를 한눈에 파악하도록 돕는 용도이며, 실제
 * 배치와 다소 다를 수 있다는 점을 캡션으로 함께 안내한다.
 */
export function SiteMapDiagram({ highlight }: SiteMapDiagramProps) {
  const firepitOn = highlight === "firepit";
  const recyclingOn = highlight === "recycling";

  return (
    <svg viewBox="0 0 320 230" className="w-full" role="img" aria-label="스테이 압해 간편 위치도">
      <rect x="8" y="26" width="304" height="196" rx="4" fill="none" stroke="var(--line)" strokeWidth="1.5" />
      <text x="160" y="16" textAnchor="middle" fontSize="9" letterSpacing="2" fill="var(--stone)">
        입구 · 도로
      </text>

      {/* 본채 */}
      <rect x="34" y="50" width="108" height="86" fill="var(--cream-deep)" stroke="var(--ink)" strokeOpacity="0.25" />
      <text x="88" y="97" textAnchor="middle" fontSize="11" fill="var(--ink)">
        본채
      </text>

      {/* 마당 경계 */}
      <rect x="158" y="50" width="138" height="150" fill="none" stroke="var(--line)" strokeDasharray="4 3" />
      <text x="227" y="66" textAnchor="middle" fontSize="9" letterSpacing="1" fill="var(--stone)">
        마당
      </text>

      {/* 파이어핏 */}
      <g opacity={firepitOn ? 1 : 0.5}>
        <circle cx="215" cy="112" r={firepitOn ? 11 : 8} fill="var(--bronze)" />
        <text x="215" y="136" textAnchor="middle" fontSize="10" fontWeight={firepitOn ? 600 : 400} fill="var(--ink)">
          파이어핏
        </text>
        {firepitOn && (
          <circle cx="215" cy="112" r="11" fill="none" stroke="var(--bronze)" strokeWidth="1.5">
            <animate attributeName="r" values="11;22;11" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* 장작 창고 */}
      <g opacity={firepitOn ? 1 : 0.5}>
        <rect
          x="258"
          y="158"
          width="30"
          height="26"
          fill={firepitOn ? "var(--bronze)" : "var(--sand)"}
          stroke="var(--ink)"
          strokeOpacity="0.2"
        />
        <text x="273" y="199" textAnchor="middle" fontSize="9" fill="var(--ink)">
          장작 창고
        </text>
      </g>

      {/* 분리수거함 */}
      <g opacity={recyclingOn ? 1 : 0.5}>
        <rect
          x="176"
          y="166"
          width="30"
          height="24"
          fill={recyclingOn ? "var(--bronze)" : "var(--sand)"}
          stroke="var(--ink)"
          strokeOpacity="0.2"
        />
        <text x="191" y="204" textAnchor="middle" fontSize="9" fill="var(--ink)">
          분리수거함
        </text>
        {recyclingOn && (
          <circle cx="191" cy="178" r="11" fill="none" stroke="var(--bronze)" strokeWidth="1.5">
            <animate attributeName="r" values="11;22;11" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    </svg>
  );
}

/**
 * SVG color-vision-deficiency filters (server component — no JS).
 *
 * Each filter daltonizes by projecting through a clinically-used simulation
 * matrix, so it runs on the GPU as a single feColorMatrix. The matching CSS
 * classes in globals.css point at these ids:
 *   .a11y-cb-protanopia  -> url(#a11y-protanopia)   etc.
 * Game iframes get their own copy injected by the runtime bridge (an SVG
 * filter id cannot cross a document boundary).
 */
export function ColorblindFilters() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="a11y-protanopia">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-protanomaly">
          <feColorMatrix
            type="matrix"
            values="0.817 0.183 0 0 0  0.333 0.667 0 0 0  0 0.125 0.875 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-deuteranopia">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-deuteranomaly">
          <feColorMatrix
            type="matrix"
            values="0.8 0.2 0 0 0  0.258 0.742 0 0 0  0 0.142 0.858 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-tritanopia">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-tritanomaly">
          <feColorMatrix
            type="matrix"
            values="0.967 0.033 0 0 0  0 0.733 0.267 0 0  0 0.183 0.817 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="a11y-achromatopsia">
          <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
        </filter>
      </defs>
    </svg>
  );
}

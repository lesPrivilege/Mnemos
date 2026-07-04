/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Atoms — icons, brand mark, status bar
// ════════════════════════════════════════════════

const Icon = ({ name, size = 16, stroke = 1.5, ...rest }) => {
  const s = size;
  const sw = stroke;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", ...rest };
  switch (name) {
    case "back":      return <svg {...common}><path d="M15 18l-6-6 6-6"/></svg>;
    case "fwd":       return <svg {...common}><path d="M9 18l6-6-6-6"/></svg>;
    case "search":    return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case "settings":  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "plus":      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "minus":     return <svg {...common}><path d="M5 12h14"/></svg>;
    case "x":         return <svg {...common}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case "check":     return <svg {...common}><path d="M20 6L9 17l-5-5"/></svg>;
    case "import":    return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>;
    case "export":    return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>;
    case "cards":     return <svg {...common}><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg>;
    case "book":      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
    case "pen":       return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
    case "list":      return <svg {...common}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case "highlight": return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14 5l5 5"/></svg>;
    case "bookmark":  return <svg {...common}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
    case "more":      return <svg {...common}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
    case "menu":      return <svg {...common}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case "sun":       return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case "moon":      return <svg {...common}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case "star":      return <svg {...common}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case "starf":     return <svg {...common} fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case "edit":      return <svg {...common}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case "trash":     return <svg {...common}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
    case "stats":     return <svg {...common}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
    case "doc":       return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>;
    case "folder":    return <svg {...common}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
    case "play":      return <svg {...common}><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>;
    case "pause":     return <svg {...common}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
    case "rotate":    return <svg {...common}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 5.64 5.64L23 10"/></svg>;
    case "flame":     return <svg {...common}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.3-2.4-.5-4.5 2-6 .3 1.5 1 2.6 2 3 2 1 4 3 4 7a6 6 0 0 1-12 0c0-1 .3-2 .7-2.5.4 0 1 1 1.8 1z" fill="currentColor" stroke="none"/></svg>;
    case "eye":       return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "type":      return <svg {...common}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
    case "spacing":   return <svg {...common}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "margin":    return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>;
    case "info":      return <svg {...common}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
    case "circle":    return <svg {...common}><circle cx="12" cy="12" r="10"/></svg>;
    case "heart":     return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "tag":       return <svg {...common}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
    case "calendar":  return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    default: return null;
  }
};

// Brand mark — Mnemos M with foot serifs
const MnemosMark = ({ size = 22, stroke }) => {
  const c = stroke || "var(--ink)";
  return (
    <svg width={size} height={size * (24/28)} viewBox="0 0 28 24" fill="none">
      {/* M strokes */}
      <path d="M5 5 L5 20" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M5 5 L14 17" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14 17 L23 5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M23 5 L23 20" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      {/* foot serifs */}
      <path d="M2.5 20 L7.5 20" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M20.5 20 L25.5 20" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      {/* top serifs */}
      <path d="M3 5 L7 5" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <path d="M21 5 L25 5" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
};

// Status bar (iOS-style)
const StatusBar = ({ time = "9:41" }) => (
  <div className="sb">
    <span>{time}</span>
    <span className="sb-right">
      {/* signal */}
      <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="2.5" height="4" rx="0.5"/><rect x="3.5" y="4" width="2.5" height="6" rx="0.5"/><rect x="7" y="2" width="2.5" height="8" rx="0.5"/><rect x="10.5" y="0" width="2.5" height="10" rx="0.5"/></svg>
      {/* wifi */}
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 4.2 A9 9 0 0 1 13 4.2"/><path d="M3 6.4 A6 6 0 0 1 11 6.4"/><path d="M5 8.6 A3 3 0 0 1 9 8.6"/></svg>
      {/* battery */}
      <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="15" height="6" rx="1" fill="currentColor"/><rect x="19.5" y="3" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
    </span>
  </div>
);

// hash to spine class
const spineClass = (str) => {
  let h = 0; for (const c of str || "") h = (h * 31 + c.charCodeAt(0)) | 0;
  return `h${Math.abs(h) % 4}`;
};

// Topbar
const Topbar = ({ left, right, title, zh, onBack }) => (
  <div className="topbar">
    <div style={{display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1}}>
      {onBack && (
        <button className="tb-btn" onClick={onBack} aria-label="back"><Icon name="back" size={18}/></button>
      )}
      {left}
      {title && <h1 className={zh ? "zh" : ""}>{title}</h1>}
    </div>
    <div className="tb-actions">{right}</div>
  </div>
);

// Phone wrapper for canvas
const Phone = ({ label, num, theme, onTheme, children, screenLabel }) => (
  <div className="phone-wrap" data-screen-label={screenLabel}>
    <div className="phone-label-bar">
      <div className="phone-label">
        {num != null && <span className="num">{String(num).padStart(2,"0")}</span>}
        {label}
      </div>
      {onTheme && (
        <button className="phone-theme-btn" onClick={onTheme} aria-label="toggle theme">
          {theme === "dark" ? <Icon name="moon" size={13}/> : <Icon name="sun" size={13}/>}
        </button>
      )}
    </div>
    <div className={"phone " + (theme === "dark" ? "dark-host" : "")}>
      <div className={"phone-screen " + (theme === "dark" ? "dark" : "")}>
        <div className="phone-notch"><div className="phone-notch-dot"/></div>
        <div className="phone-screen-inner" style={theme === "dark" ? null : null}>
          {children}
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { Icon, MnemosMark, StatusBar, spineClass, Topbar, Phone });

# Fresh iOS Icons — One UI

Standalone minimalist Android icon pack in Mnemos branch build/classic-ios-fresh.
No dashboard framework, tracking, ads, account, permissions, or Launcher replacement.

## Design decisions
- Pinned colorful iOS 18 native artwork: SysAdminDoc/iOSIconPack v1.2.6.
- One 384 px superellipse output mask baked into all icons; transparency at
  original corners is reconstructed, not covered with an extra white tray.
- Strict application identity mapping only. Examples explicitly excluded:
  Microsoft Teams→Slack, Waze→Google Maps, Lyft→Uber.
- True system equivalents (Samsung Phone to iOS Phone) are intentional.
- WeChat, QQ and Weibo use transparent Simple Icons SVG marks (CC0)
  on curated brand-color trays: these are **reconstructed**, not Apple originals.
- Theme Park may leave unmatched app icons unchanged. Do not claim 100% coverage.
- Build delivers APK, verification, mapping audit, and a visual contact sheet.

## Install
GitHub Actions → Build Fresh iOS One UI APK → artifact Fresh-iOS-OneUI-APK.
Install APK; Good Lock → Theme Park → Icon → Icon Pack → Fresh iOS Icons.
Do not apply a second tray/shape adjustment. Manual app replacement where needed.

Personal use only. App artworks have separate rights; no commercial redistribution.

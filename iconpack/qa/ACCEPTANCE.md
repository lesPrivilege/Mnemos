# Acceptance checklist
- [ ] GitHub Actions build green on \`build/classic-ios-oneui\`
- [ ] Signed APK emitted, \`apksigner verify\` successful
- [ ] APK can install alongside (rather than overwrite) upstream iOSIconPack
- [ ] Good Lock / Theme Park discovers and applies pack on S25 Ultra
- [ ] No opaque phone square, double white tray or clipped brands
- [ ] Consistent optical sizing for Phone, QQ, Weibo, common Samsung/Google apps
- [ ] Test One UI Home, app drawer, folder, and dark/light wallpapers
- [ ] Mark unmatched app icons needing per-icon override
- [ ] Capture actual device screenshots; do not claim device verification from CI alone

# Classic iOS Icon Pack — One UI build branch

This is an **isolated compilation experiment on the Mnemos branch**
\`build/classic-ios-oneui\`. Do not merge it into \`main\`; Mnemos production
code is intentionally untouched.

## What gets built

- Upstream iOS icon pack: [SysAdminDoc/iOSIconPack](https://github.com/SysAdminDoc/iOSIconPack), pinned to **v1.2.6** commit \`a72ddebca3397674255aef72d13eb1c9351f123d\`.
- Default classic **iOS 18 colored** icons with upstream mappings.
- PNG/WebP outer alpha normalized with a supersampled continuous-curve / superellipse approximation (not Apple's exact mask), preventing the square-corner artifact shown in Samsung Theme Park.
- The APK's own icon is classic iOS Settings; package ID \`org.classicios.oneui.personal\` to avoid overwriting the upstream app.
- Android's automatic *debug signing* produces a sideloadable APK. No store or certificate purchase required.

## Compile on GitHub

Every push to this branch that modifies \`iconpack/**\` or the workflow starts
**Build Classic iOS One UI APK** in GitHub Actions. The workflow installs Android
SDK 36, clones upstream, runs Python icon normalizations, compiles Android, then
verifies the APK's signature.

When green, open **Actions → matching run → Artifacts → Classic-iOS-OneUI-APK**.
Inside is \`Classic-iOS-OneUI-debug.apk\` and signing/QA information.
Artifact expiry: 30 days.

## Samsung install

1. Install the debug APK on the Galaxy.
2. Install/open Good Lock → Theme Park → Icon → create theme.
3. Choose the icon pack. Prefer no extra shape/effect/tray over the pre-rounded icons.
4. Verify Phone, Settings, Camera, Browser, Messages, QQ/Weibo and installed
   third-party apps; manually replace unrecognized icons in Theme Park.
5. Confirm Home, app drawer, folders and wallpapers. You can revert via Theme Park.

**Limitations:** One UI's handling of icon masking and fallback differs by
Theme Park version. This is a build-time fix for shipped mapped icons, not
a guarantee that every unmatched app gets a custom icon. Only real Galaxy
screenshots can establish device visual acceptance.

## Provenance

This branch contains transformation/build scripts, not upstream raster assets.
The upstream project licenses its code under MIT; third-party art remains subject
to separate owner rights. Intended for personal use. Do not publish the APK.

## v2 semantic safety and fallback

The second pass **removes unsupported feature substitutions** (e.g. ChatGPT/Claude -> Settings, Slack -> Teams and Firefox -> Safari). Only explicitly vetted system-equivalent packages and exact same-brand icons remain in `appfilter.xml` and `appmap.xml`. For all other Android apps, their native icon is used; launchers implementing the ADW `iconback/iconmask` standard may additionally show that native icon on the iOS squircle tray. **Samsung Theme Park may ignore those fallback declarations**: the native icon remains native, and its Shape/Tray editor controls the fallback on One UI. No launcher, shortcuts or accessibility overlays are installed.

v2 package ID: `org.classicios.oneui.personal.v2` (side-by-side with v1). Debug key is per-run and cannot silently update an older signed APK. Android icon pack has no guarantee of automating Theme Park's system-generated tray.

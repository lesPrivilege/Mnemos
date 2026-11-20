#!/usr/bin/env python3
"""Keep only genuine system-equivalent and exact first-party brand mappings.

Unknown applications must retain their own app icons. No shortcuts, guessed
synonyms, 'similar function', third-party browser->Safari, or AI->Settings.

ADW/Nova fallback can present unmatched native icons on a common iOS-style
tray. Samsung Theme Park may choose its own fallback rendering; it cannot be
forced by static icon-pack resources.
"""
from __future__ import annotations
import json
import re
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

# Explicit OS function analogues only. Do NOT add general application categories.
SYSTEM = {
    "ios18_phone": """com.google.android.dialer com.android.dialer
      com.samsung.android.dialer com.samsung.android.app.contacts
      com.sec.android.app.dialertab com.oneplus.dialer com.miui.phone
      com.huawei.contacts com.lge.dialer com.motorola.phone""",
    "ios18_messages": """com.google.android.apps.messaging
      com.samsung.android.messaging com.android.mms com.huawei.message""",
    "ios18_camera": """com.google.android.GoogleCamera com.samsung.android.camera
      com.android.camera2 com.android.camera com.sec.android.app.camera
      com.miui.camera com.oneplus.camera net.oneplus.camera
      com.huawei.camera com.vivo.camera com.coloros.camera com.nothing.camera
      com.motorola.camera2 com.lge.camera""",
    "ios18_photos": """com.samsung.android.gallery com.sec.android.gallery3d
      com.miui.gallery com.oneplus.gallery com.huawei.photos
      com.coloros.gallery3d com.vivo.gallery""",
    "ios18_settings": """com.android.settings com.samsung.android.app.settings
      com.samsung.android.settings com.miui.settings com.oneplus.settings""",
    "ios18_clock": """com.google.android.deskclock com.android.deskclock
      com.sec.android.app.clockpackage com.samsung.android.alarmclocknew
      com.miui.clock com.oneplus.clock com.huawei.deskclock com.coloros.alarmclock""",
    "ios18_calendar": """com.samsung.android.calendar com.sec.android.calendar
      com.miui.calendar com.oneplus.calendar com.huawei.calendar
      com.coloros.calendar com.vivo.calendar""",
    "ios18_weather": """com.google.android.apps.weather
      com.samsung.android.weather com.samsung.android.app.weather
      com.miui.weather2 com.coloros.weather2 com.vivo.weather
      com.huawei.android.totemweather""",
    "ios18_notes": """com.samsung.android.app.notes com.miui.notes
      com.huawei.notepad com.coloros.note com.vivo.note""",
    "ios18_appstore": """com.android.vending com.sec.android.app.samsungapps
      com.huawei.appmarket""",
    "ios18_files": """com.google.android.apps.nbu.files
      com.samsung.android.app.myfiles com.sec.android.app.myfiles
      com.android.documentsui com.mi.android.globalFileexplorer
      com.huawei.hidisk com.coloros.filemanager com.vivo.filemanager""",
    "ios18_calculator": """com.google.android.calculator com.samsung.android.calculator
      com.android.calculator2 com.sec.android.app.popupcalculator
      com.miui.calculator com.oneplus.calculator com.huawei.calculator
      com.coloros.calculator com.vivo.calculator com.nothing.calculator""",
    "ios18_wallet": """com.google.android.apps.walletnfcrel com.samsung.android.spay""",
    "ios18_health": """com.samsung.android.shealth com.sec.android.app.shealth""",
    "ios18_music": """com.apple.android.music com.samsung.android.app.music""",
    "ios18_compass": """com.samsung.android.app.compass com.miui.compass
      com.huawei.compass com.coloros.compass2 com.vivo.compass""",
    "ios18_mail": """com.samsung.android.email.provider com.vivo.email""",
}
# For these companies, only their own Android package may receive their own
# first-party icon. Even other apps of the same company may have distinct icons.
BRAND = {
    "ios18_chrome": """com.android.chrome com.chrome.beta com.chrome.dev
      com.chrome.canary""",
    "ios18_google_photos": """com.google.android.apps.photos
      com.google.android.apps.photosgo""",
    "ios18_gmail": """com.google.android.gm""",
    "ios18_google_maps": """com.google.android.apps.maps""",
    "ios18_google_keep": """com.google.android.keep""",
    "ios18_google_calendar": """com.google.android.calendar""",
    "ios18_google_meet": """com.google.android.apps.tachyon
      com.google.android.apps.meetings""",
    "ios18_google_drive": """com.google.android.apps.docs""",
    "ios18_google_docs": """com.google.android.apps.docs.editors.docs""",
    "ios18_google_sheets": """com.google.android.apps.docs.editors.sheets""",
    "ios18_google_slides": """com.google.android.apps.docs.editors.slides""",
    "ios18_google_translate": """com.google.android.apps.translate""",
    "ios18_google_search": """com.google.android.googlequicksearchbox""",
    "ios18_google_classroom": """com.google.android.apps.classroom""",
    "ios18_google_one": """com.google.android.apps.subscriptions.red""",
    "ios18_youtube": """com.google.android.youtube""",
    "tp_zoom": """us.zoom.videomeetings""",
    "tp_spotify": """com.spotify.music com.spotify.music.free com.spotify.lite""",
    "tp_paypal": """com.paypal.android.p2pmobile""",
    "tp_venmo": """com.venmo""",
    "tp_strava": """com.strava""",
    "tp_instagram": """com.instagram.android com.instagram.lite""",
    "tp_whatsapp": """com.whatsapp""",
    "tp_telegram": """org.telegram.messenger org.telegram.messenger.beta""",
    "tp_discord": """com.discord""",
    "tp_facebook": """com.facebook.katana com.facebook.lite""",
    "tp_snapchat": """com.snapchat.android""",
    "tp_reddit": """com.reddit.frontpage""",
    "tp_pinterest": """com.pinterest""",
    "tp_tiktok": """com.zhiliaoapp.musically com.ss.android.ugc.trill""",
    "tp_slack": """com.Slack""",
    "tp_netflix": """com.netflix.mediaclient""",
    "tp_amazon": """com.amazon.mShop.android.shopping""",
    "tp_robinhood": """com.robinhood.android""",
    "tp_uber": """com.ubercab""",
    "tp_shazam": """com.shazam.android com.shazam.encore.android""",
}
def make_policy():
    policy = {}
    for kind, groups in (("system", SYSTEM), ("exact_brand", BRAND)):
        for drawable, packages in groups.items():
            for package in packages.split():
                if package in policy:
                    raise ValueError("Duplicate package in policy: " + package)
                policy[package] = (drawable, kind)
    return policy

POLICY = make_policy()
COMPONENT = re.compile(r"^ComponentInfo\{([A-Za-z0-9._]+)/([^}]+)\}$")
BANNED = ("com.openai.chatgpt", "com.anthropic.claude",
          "com.nordvpn.android", "com.wireguard.android",
          "com.x8bit.bitwarden", "com.teslacoilsw.launcher")


def apply(root: Path) -> dict:
    src = root / "app/src/main/res/xml/appfilter.xml"
    tree = ET.parse(src)
    old = tree.getroot()
    assert old.tag == "resources"
    original_items = old.findall("item")
    assert len(original_items) >= 600, "Unexpected upstream mapping count"
    kept = []
    removed_examples = []
    dedup = set()
    stats = Counter()
    for item in original_items:
        component = item.get("component", "")
        match = COMPONENT.fullmatch(component)
        if not match:
            stats["malformed_removed"] += 1
            continue
        package, activity = match.groups()
        entry = POLICY.get(package)
        if entry is None:
            stats["unsupported_removed"] += 1
            if len(removed_examples) < 80:
                removed_examples.append({"package": package, "old": item.get("drawable")})
            continue
        drawable, kind = entry
        if component in dedup:
            stats["duplicate_removed"] += 1
            continue
        dedup.add(component)
        if item.get("drawable") != drawable:
            stats["corrected_resource"] += 1
        kept.append((component, activity, drawable, kind))
        stats[kind + "_kept"] += 1
    assert 60 <= len(kept) <= 280, f"Unexpected strict coverage {len(kept)}"
    resources = ET.Element("resources")
    for component, _, drawable, _ in kept:
        ET.SubElement(resources, "item", component=component, drawable=drawable)
    # Launcher-standard fallback. One UI may ignore this and use its shape UI.
    ET.SubElement(resources, "iconback", img="oneui_ios_tray_back")
    ET.SubElement(resources, "iconmask", img="oneui_ios_tray_mask")
    ET.SubElement(resources, "scale", factor="1.0")
    ET.indent(resources, space="    ")
    content = ET.tostring(resources, encoding="unicode", xml_declaration=False)
    header = '<?xml version="1.0" encoding="utf-8"?>\n'
    header += '<!-- Strict exact/system mapping; unknown apps retain native artwork. -->\n'
    for dest in (
        src,
        root / "app/src/main/assets/appfilter.xml",
    ):
        dest.write_text(header + content + "\n", encoding="utf-8")
    appmap = ET.Element("appmap")
    for _, activity, drawable, _ in kept:
        ET.SubElement(appmap, "item", {"class": activity, "name": drawable})
    ET.indent(appmap, space="    ")
    (root / "app/src/main/res/xml/appmap.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        + ET.tostring(appmap, encoding="unicode") + "\n", encoding="utf-8"
    )
    mapped = {x[0] for x in kept}
    assert not any(any(b in comp for b in BANNED) for comp in mapped)
    assert src.read_bytes() == (root / "app/src/main/assets/appfilter.xml").read_bytes()
    assert len(list(ET.parse(src).iter("item"))) == len(kept)
    return {
        "original_mappings": len(original_items),
        "retained_mappings": len(kept),
        "removed_mappings": len(original_items) - len(kept),
        "stats": dict(stats),
        "mapped_resources": sorted(set(x[2] for x in kept)),
        "removed_examples": removed_examples,
        "strict_no_semantic_substitution": True,
        "generic_fallback_declarations": ["iconback", "iconmask", "scale"],
        "samsung_theme_park_fallback_verified": False,
    }

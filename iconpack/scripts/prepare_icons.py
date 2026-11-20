#!/usr/bin/env python3
"""Prepare pinned iOS icon pack for Samsung One UI.

Normalize the *default-mapped* raster icons' outer silhouettes, preserving
interior pixels and transparency, without introducing colored tray backgrounds.
The superellipse is an approximation, not an Apple-proprietary mask.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree
from PIL import Image, ImageChops, ImageDraw, ImageOps
from strict_mappings import apply as apply_strict_mappings

SUPERELLIPSE_N = 4.75


def squircle_mask(size: int) -> Image.Image:
    ss = 4
    dim = size * ss
    half = 0.4982 * dim
    middle = dim / 2
    points = []
    for i in range(1200):
        theta = 2 * math.pi * i / 1200
        c, s = math.cos(theta), math.sin(theta)
        points.append((
            middle + half * math.copysign(abs(c)**(2/SUPERELLIPSE_N), c),
            middle + half * math.copysign(abs(s)**(2/SUPERELLIPSE_N), s),
        ))
    mask = Image.new('L', (dim, dim), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def normalize(image: Image.Image, mask: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    rgba.putalpha(ImageChops.multiply(rgba.getchannel('A'), mask))
    return rgba


def brand(root: Path) -> None:
    build = root / 'app/build.gradle'
    data = build.read_text()
    token = 'applicationId MyApp.appId'
    assert data.count(token) == 1, 'unexpected upstream appId configuration'
    build.write_text(data.replace(token, 'applicationId "org.classicios.oneui.personal.v2"'))

    strings = root / 'app/src/main/res/values/strings.xml'
    data = strings.read_text()
    data, count = re.subn(
        r'(<string name="app_name"[^>]*>)[^<]*(</string>)',
        r'\1Classic iOS One UI v2\2', data,
    )
    assert count == 1, 'unexpected app_name'
    strings.write_text(data)

    icon = root / 'app/src/main/res/drawable-xxxhdpi/ios18_settings.png'
    assert icon.exists(), 'iOS 18 Settings app icon missing'
    manifest = root / 'app/src/main/AndroidManifest.xml'
    data = manifest.read_text()
    for old, new in [
        ('android:icon="@mipmap/ic_launcher"', 'android:icon="@drawable/ios18_settings"'),
        ('android:roundIcon="@mipmap/ic_launcher_round"', 'android:roundIcon="@drawable/ios18_settings"'),
    ]:
        assert data.count(old) == 1, f'Unexpected manifest: {old}'
        data = data.replace(old, new)
    manifest.write_text(data)


def prepare(root: Path, report_path: Path) -> dict:
    brand(root)
    mapping_report = apply_strict_mappings(root)
    # Fallback images are consumed by launchers that honor ADW iconback/iconmask.
    # Transparent inside the mask means KEEP, opaque black outside means ERASE.
    fallback_dir = root / 'app/src/main/res/drawable-xxxhdpi'
    tray_shape = squircle_mask(512)
    tray_back = Image.new('RGBA', (512, 512), 'white')
    tray_back.putalpha(tray_shape)
    tray_back.save(fallback_dir / 'oneui_ios_tray_back.png', optimize=True)
    tray_mask = Image.new('RGBA', (512, 512), 'black')
    tray_mask.putalpha(ImageOps.invert(tray_shape))
    tray_mask.save(fallback_dir / 'oneui_ios_tray_mask.png', optimize=True)
    assert tray_mask.getpixel((0, 0))[3] == 255
    assert tray_mask.getpixel((256, 256))[3] == 0
    appfilter = root / 'app/src/main/res/xml/appfilter.xml'
    mapping = ElementTree.parse(appfilter)
    ids = {x.get('drawable') for x in mapping.iter('item') if x.get('drawable')}
    mapped_files = [
        p for folder in (root/'app/src/main/res').glob('drawable*')
        if folder.is_dir()
        for p in folder.iterdir()
        if p.stem in ids and p.suffix.lower() in ('.png', '.webp')
    ]
    if not mapped_files:
        raise RuntimeError('No drawable raster files matched appfilter.xml')
    counts = Counter()
    notes = []
    masks = {}
    for path in sorted(mapped_files):
        with Image.open(path) as source:
            if source.width != source.height or not 64 <= source.width <= 2048:
                counts['nonstandard_size_skipped'] += 1
                notes.append({'file': path.name, 'status': 'size_skipped'})
                continue
            original = source.convert('RGBA')
        mask = masks.setdefault(original.width, squircle_mask(original.width))
        clipped = normalize(original, mask)
        if clipped.tobytes() == original.tobytes():
            counts['already_rounded'] += 1
        else:
            target = path.with_suffix('.png')
            clipped.save(target, optimize=True)
            if target != path:
                path.unlink()
            counts['clipped'] += 1
        bbox = original.getchannel('A').getbbox()
        if bbox and min((bbox[2]-bbox[0])/original.width,
                        (bbox[3]-bbox[1])/original.height) < .78:
            counts['optical_small_review'] += 1
            notes.append({'file': path.name, 'status': 'optical_small_review'})
    report = {
        'source': 'SysAdminDoc/iOSIconPack@v1.2.6',
        'mapped_drawables': len(ids),
        'processed_png_webp': len(mapped_files),
        'counts': dict(counts),
        'review': notes,
        'device_tested': False,
        'mapping_audit': mapping_report,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2))
    print(json.dumps({k: v for k, v in report.items() if k != 'review'}, indent=2))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.repo, args.out)

#!/usr/bin/env python3
"""Deterministic local regression check: no square corners or color shift."""
import tempfile
from pathlib import Path
from PIL import Image
from prepare_icons import normalize, squircle_mask

with tempfile.TemporaryDirectory() as d:
    source = Image.new('RGB', (128, 128), '#26dd5a')
    mask = squircle_mask(128)
    out = normalize(source, mask)
    assert out.getpixel((0, 0))[3] == 0
    assert out.getpixel((127, 127))[3] == 0
    assert out.getpixel((64, 64)) == (38, 221, 90, 255)
    source.save(Path(d) / 'square.png')
    with Image.open(Path(d) / 'square.png') as img:
        assert normalize(img, mask).getpixel((0, 0))[3] == 0
print('PASS: iOS-like rounded silhouette, preserved center color')

#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from generate import shape_mask,normalize,SIZE,ALLOW
m=shape_mask()
assert m.getpixel((0,0))==0
assert m.getpixel((SIZE//2,SIZE//2))==255
im=normalize(Image.new('RGBA',(192,192),(21,204,78,255)),m)
assert im.getpixel((0,0))[3]==0
assert im.getpixel((SIZE//2,SIZE//2))==(21,204,78,255)
assert 'com.microsoft.teams' not in ALLOW.get('tp_slack',set())
assert 'com.waze' not in ALLOW.get('ios18_google_maps',set())
assert 'com.lyft.android' not in ALLOW.get('tp_uber',set())
print('PASS: uniform shape / exact identity mapping')

#!/usr/bin/env python3
"""Deterministic fresh icon assets with only verified package identity mappings."""
from __future__ import annotations
import argparse, io, json, math, re
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw

SIZE=384
POWER=4.75
ALLOW={
 'ios18_phone':['com.google.android.dialer','com.android.dialer','com.samsung.android.dialer','com.sec.android.app.dialertab'],
 'ios18_messages':['com.google.android.apps.messaging','com.samsung.android.messaging','com.android.mms'],
 'ios18_camera':['com.google.android.GoogleCamera','com.samsung.android.camera','com.sec.android.app.camera','com.android.camera2','com.android.camera'],
 'ios18_settings':['com.android.settings','com.samsung.android.settings','com.samsung.android.app.settings'],
 'ios18_photos':['com.samsung.android.gallery','com.sec.android.gallery3d'],
 'ios18_clock':['com.google.android.deskclock','com.samsung.android.app.clockpack','com.sec.android.app.clockpackage','com.android.deskclock'],
 'ios18_calendar':['com.samsung.android.calendar','com.sec.android.calendar'],
 'ios18_notes':['com.samsung.android.app.notes'],
 'ios18_files':['com.samsung.android.app.myfiles','com.samsung.android.myfiles','com.google.android.apps.nbu.files','com.android.documentsui'],
 'ios18_calculator':['com.google.android.calculator','com.samsung.android.calculator','com.sec.android.app.popupcalculator','com.android.calculator2'],
 'ios18_safari':['com.samsung.android.app.sbrowser'],
 'ios18_mail':['com.samsung.android.email.provider'],
 'ios18_music':['com.samsung.android.app.music','com.apple.android.music'],
 'ios18_weather':['com.samsung.android.weather','com.sec.android.daemonapp','com.samsung.android.app.weather'],
 'ios18_wallet':['com.samsung.android.spay'],
 'ios18_chrome':['com.android.chrome','com.chrome.beta','com.chrome.dev','com.chrome.canary'],
 'ios18_google_drive':['com.google.android.apps.docs'],
 'ios18_google_docs':['com.google.android.apps.docs.editors.docs'],
 'ios18_google_translate':['com.google.android.apps.translate'],
 'ios18_youtube':['com.google.android.youtube'],
 'tp_whatsapp':['com.whatsapp','com.whatsapp.w4b'],
 'tp_telegram':['org.telegram.messenger','org.telegram.messenger.web'],
 'tp_spotify':['com.spotify.music'],
 'tp_instagram':['com.instagram.android'],
 'tp_discord':['com.discord'],
 'tp_zoom':['us.zoom.videomeetings'],
 'tp_netflix':['com.netflix.mediaclient'],
 'tp_slack':['com.Slack'],
}
ALLOW={k:set(v) for k,v in ALLOW.items()}
BRAND={
 'brand_wechat':('com.tencent.mm',['com.tencent.mm.ui.LauncherUI'],'wechat.svg','#07C160','#FFFFFF',.63),
 'brand_qq':('com.tencent.mobileqq',['com.tencent.mobileqq.activity.SplashActivity','com.tencent.mobileqq.activity.home.Conversation'],'qq.svg','#FFFFFF','#151515',.65),
 'brand_weibo':('com.sina.weibo',['com.sina.weibo.SplashActivity','com.sina.weibo.MainTabActivity'],'sinaweibo.svg','#FFD941','#DE251A',.67),
}

def shape_mask(size=SIZE):
    d=size*4; mid=d/2; radius=d*.499
    pts=[]
    for i in range(1600):
        angle=math.tau*i/1600; c=math.cos(angle);s=math.sin(angle)
        pts.append((mid+radius*math.copysign(abs(c)**(2/POWER),c),
                    mid+radius*math.copysign(abs(s)**(2/POWER),s)))
    m=Image.new('L',(d,d),0)
    ImageDraw.Draw(m).polygon(pts,fill=255)
    return m.resize((size,size),Image.Resampling.LANCZOS)

def normalize(src:Image.Image,alpha:Image.Image):
    src=src.convert('RGBA').resize(alpha.size,Image.Resampling.LANCZOS)
    pix=src.load(); target=alpha.load()
    result=Image.new('RGBA',src.size)
    out=result.load(); width,height=src.size
    for y in range(height):
        xs=[x for x in range(width) if pix[x,y][3]>=240]
        if not xs:continue
        left,right=xs[0],xs[-1]
        for x in range(width):
            if target[x,y]==0:continue
            color=pix[x,y]
            if color[3]<240 and (x<left or x>right):
                color=pix[left if x<left else right,y]
            out[x,y]=(*color[:3],target[x,y])
    return result

def render_brand(svg_path:Path, bg:str, fg:str, scale:float, alpha:Image.Image):
    import cairosvg
    source=svg_path.read_text().replace('<svg ','<svg fill="'+fg+'" ',1)
    n=int(SIZE*scale)
    svg_png=cairosvg.svg2png(bytestring=source.encode(),output_width=n,output_height=n)
    symbol=Image.open(io.BytesIO(svg_png)).convert('RGBA')
    tile=Image.new('RGBA',(SIZE,SIZE),bg)
    tile.alpha_composite(symbol,((SIZE-n)//2,(SIZE-n)//2))
    tile.putalpha(alpha)
    return tile

def render_settings(alpha:Image.Image):
    """iOS-style metallic gear, purpose-built so Settings is not mapped to Shortcuts."""
    size=SIZE
    im=Image.new('RGBA',(size,size))
    p=im.load()
    for y in range(size):
        for x in range(size):
            t=max(0,min(1,(x+y)/(2*size)))
            v=int(195-80*t)
            p[x,y]=(v,v+2,v+6,255)
    d=ImageDraw.Draw(im,'RGBA')
    mid=size/2
    points=[]
    # 12 metallic teeth, three radial samples per tooth.
    for i in range(12*4):
        ang=math.tau*i/(12*4)-math.pi/2
        radius=(142 if i%4 in (1,2) else 121)
        points.append((mid+math.cos(ang)*radius,mid+math.sin(ang)*radius))
    shadow=[(x+2,y+6) for x,y in points]
    d.polygon(shadow,fill=(39,45,51,84))
    d.polygon(points,fill=(233,236,238,255))
    d.ellipse((83,83,301,301),outline=(105,116,124,255),width=15)
    d.ellipse((102,102,282,282),fill=(166,175,184,255))
    d.ellipse((119,119,265,265),outline=(235,237,239,255),width=9)
    d.ellipse((151,151,233,233),fill=(83,94,105,255))
    d.ellipse((162,162,222,222),fill=(124,134,144,255))
    im.putalpha(alpha)
    return im

def generate(source:Path,project:Path):
    origin=source/'app/src/main'
    main=project/'app/src/main'
    target=main/'res/drawable-nodpi'
    for d in (target,main/'assets',main/'res/xml',project/'dist'):
        d.mkdir(parents=True,exist_ok=True)
    items=[];discarded=[];used=set()
    for node in ET.parse(origin/'assets/appfilter.xml').iter('item'):
        component=node.attrib.get('component','')
        drawable=node.attrib.get('drawable','')
        match=re.fullmatch(r'ComponentInfo\{([^/]+)/[^}]+\}',component)
        package=match.group(1) if match else ''
        if package in ALLOW.get(drawable,set()):
            items.append((component,drawable));used.add(drawable)
        elif drawable in ALLOW:
            discarded.append((package,drawable))
    for name,(package,activities,*_) in BRAND.items():
        used.add(name)
        for activity in activities:
            items.append((f'ComponentInfo{{{package}/{activity}}}',name))
    items=sorted(set(items))
    alpha=shape_mask()
    report={'upstream':'SysAdminDoc/iOSIconPack@v1.2.6',
      'iconCount':len(used),'mappedComponents':len(items),
      'discardedAmbiguousSourceMappings':len(discarded),
      'discardedSample':discarded[:20],
      'provenance':[],'deviceValidated':False}
    for name in sorted(used):
        if name == 'ios18_settings':
            image=render_settings(alpha)
            kind='reconstructed-system-settings'
        elif name in BRAND:
            _,_,svg,bg,fg,scale=BRAND[name]
            image=render_brand(project/'brand-icons'/svg,bg,fg,scale,alpha)
            kind='reconstructed-simpleicons'
        else:
            paths=list((origin/'res').glob('drawable*/'+name+'.png'))
            if len(paths)!=1:
                raise RuntimeError(f'{name}: expected one PNG in upstream, got {len(paths)}')
            with Image.open(paths[0]) as original:
                image=normalize(original,alpha)
            kind='upstream-source'
        assert image.getpixel((0,0))[3] == 0
        assert image.getpixel((SIZE//2,SIZE//2))[3] == 255
        image.save(target/(name+'.png'),optimize=True)
        report['provenance'].append({'name':name,'type':kind})
    appfilter=ET.Element('resources')
    for component,drawable in items:
        ET.SubElement(appfilter,'item',component=component,drawable=drawable)
    drawable=ET.Element('resources')
    ET.SubElement(drawable,'version').text='1'
    ET.SubElement(drawable,'category',title='Classic iOS / verified identity')
    for name in sorted(used):
        ET.SubElement(drawable,'item',drawable=name)
    for filename,root in (('appfilter.xml',appfilter),('drawable.xml',drawable)):
        for directory in (main/'assets',main/'res/xml'):
            ET.ElementTree(root).write(directory/filename,encoding='utf-8',xml_declaration=True)
    cols=8; step=130; rows=math.ceil(len(used)/cols)
    sheet=Image.new('RGB',(cols*step,rows*148),(242,243,246))
    draw=ImageDraw.Draw(sheet)
    for idx,name in enumerate(sorted(used)):
        tile=Image.open(target/(name+'.png')).convert('RGBA')
        tile=tile.resize((96,96),Image.Resampling.LANCZOS)
        x=(idx%cols)*step+17; y=(idx//cols)*148+12
        sheet.paste(tile,(x,y),tile)
        draw.text((x-14,y+106),name.replace('ios18_',''),fill=(30,30,30))
    sheet.save(project/'dist/preview-grid.png')
    (project/'dist/qa.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({k:v for k,v in report.items() if k not in ('provenance','discardedSample')},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--upstream',required=True,type=Path)
    p.add_argument('--project',required=True,type=Path)
    a=p.parse_args();generate(a.upstream,a.project)

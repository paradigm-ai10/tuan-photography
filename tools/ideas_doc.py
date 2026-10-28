#!/usr/bin/env python3
"""靈感整理產生器 — rebuilds ideas/靈感整理.docx from IDEAS.md.

IDEAS.md is the running list and the only place entries are typed. This turns it into a Word
file that can be scanned at a glance: one table per 類型, one row per entry, showing only
名稱, 重點, 狀態 and a link. An entry that belongs to two types names both, split by " / "
(類型: 網站靈感 / UI 介面靈感), and appears in both tables; it is still counted once. Everything else stays in IDEAS.md. Saved images follow the table of
the type they belong to. The Word file lives in ideas/, which is gitignored: it carries other
people's images and the repo is public.

Run from anywhere:  python3 tools/ideas_doc.py
The same layout serves the weekly web-design report. Give it a list written in the same format
and where to put the Word file:
                    python3 tools/ideas_doc.py ideas/weekly/2026-09-28.md ideas/weekly/2026-09-28.docx
The build list is made the same way. --progress puts a bar at the top: how many entries
have 狀態 完成, out of all of them.
                    python3 tools/ideas_doc.py TODO.md ideas/建置進度.docx --progress
The title of the Word file is the first "# " line of the list.
Safe to rerun — the Word file is overwritten. Never edit the Word file by hand; edit IDEAS.md.
Needs Pillow (pip install pillow). Writes the .docx directly, no Word library required.
"""
import io
import re
import sys
import zipfile
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'IDEAS.md'
IDEAS = ROOT / 'ideas'
OUT = IDEAS / '靈感整理.docx'

INK = '241D15'          # --ink
KODAK_RED = 'C22C1E'    # --kodak-red
MUTED = '7A6F62'        # --ink lightened; Word only
RULE = 'D9CFBF'         # --paper darkened; Word only
FRAME = '8C8174'        # table lines: dark enough to read as a drawn frame
HEAD = 'EFE7D8'         # header row fill

# A4 with 0.75" margins, in DXA (1440 = 1 inch).
PAGE_W, PAGE_H, MARGIN = 11906, 16838, 1080
CONTENT_W = PAGE_W - 2 * MARGIN
LABEL_W = 1900
EMU_PER_DXA = 635
IMAGE_W = CONTENT_W * EMU_PER_DXA

UNSORTED = '未分類'
# The order the tables appear in. A type not listed here follows, in the order it first appears.
ORDER = ['設計 Skill', '工具與連接', '網站靈感', 'UI 介面靈感', '攝影師網站', '攻略網站', '教學影片',
         '做法筆記', '互動效果',
         # the weekly report's own types
         'Skill 與外掛', 'AI 設計工具', '本週新聞', '靈感與資源']
# The one line shown for an entry: the first of these fields that has something to say.
POINT = ['重點', '喜歡它什麼', '想法', '這是什麼']
EMPTY = {'', '待補'}
DONE = '完成'
# The order the counts under the progress bar are given in.
STATES = ['進行中', '等你決定', '待做', '暫緩']

NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"')
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def parse(text):
    """IDEAS.md → list of entries: {title, section, fields: {label: value}}."""
    entries, section, entry = [], '', None
    for line in text.splitlines():
        if line.startswith('## '):
            section, entry = line[3:].strip(), None
        elif line.startswith('### '):
            entry = {'title': line[4:].strip(), 'section': section, 'fields': {}}
            entries.append(entry)
        elif entry is not None:
            field = re.match(r'-\s+(.+?)\s*[:：]\s*(.+)', line)
            if field:
                entry['fields'][field.group(1)] = field.group(2).strip()
    return entries


def kinds(entry):
    """The types an entry belongs to: one, or several split by ' / '."""
    return [k.strip() for k in entry['fields'].get('類型', UNSORTED).split(' / ') if k.strip()]


def by_type(entries):
    found = {}
    for entry in entries:
        for kind in kinds(entry):
            found.setdefault(kind, []).append(entry)
    return {kind: found[kind] for kind in ORDER + list(found) if kind in found}


def point(fields):
    return next((fields[name] for name in POINT if fields.get(name, '') not in EMPTY), '')


def url(fields):
    link = re.search(r'https?://\S+', fields.get('網址', ''))
    return link.group(0) if link else ''


class Doc:
    """Collects body XML plus the images and links it refers to."""

    def __init__(self):
        self.body, self.rels, self.media = [], [], []

    def rel(self, kind, target, external=False):
        rid = f'rId{len(self.rels) + 2}'          # rId1 is styles.xml
        mode = ' TargetMode="External"' if external else ''
        self.rels.append(f'<Relationship Id="{rid}" Type="{REL}/{kind}" '
                         f'Target={quoteattr(target)}{mode}/>')
        return rid

    def run(self, text, style=None):
        props = f'<w:rPr><w:rStyle w:val="{style}"/></w:rPr>' if style else ''
        return f'<w:r>{props}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'

    def text(self, value):
        """Runs for a value, turning any URL in it into a real link."""
        out = []
        for part in re.split(r'(https?://\S+)', value):
            if part.startswith('http'):
                rid = self.rel('hyperlink', part, external=True)
                out.append(f'<w:hyperlink r:id="{rid}">{self.run(part, "Link")}</w:hyperlink>')
            elif part:
                out.append(self.run(part))
        return ''.join(out)

    def link(self, target, label):
        if target.startswith('#'):          # a heading inside this file
            return (f'<w:hyperlink w:anchor={quoteattr(target[1:])} w:history="1">'
                    f'{self.run(label, "Link")}</w:hyperlink>')
        rid = self.rel('hyperlink', target, external=True)
        return f'<w:hyperlink r:id="{rid}">{self.run(label, "Link")}</w:hyperlink>'

    def heading(self, text, anchor, number):
        """A section heading that the list of contents can jump to."""
        self.body.append(
            '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
            f'<w:bookmarkStart w:id="{number}" w:name={quoteattr(anchor)}/>'
            f'{self.run(text)}<w:bookmarkEnd w:id="{number}"/></w:p>')

    def para(self, runs, style=None):
        props = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ''
        return f'<w:p>{props}{runs}</w:p>'

    def add(self, text, style=None):
        self.body.append(self.para(self.run(text), style))

    def table(self, rows, widths, header=False):
        grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths)
        out = [f'<w:tbl><w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/>'
               '<w:tblBorders>'
               + ''.join(f'<w:{side} w:val="single" w:sz="6" w:space="0" w:color="{FRAME}"/>'
                         for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
               + '</w:tblBorders><w:tblLayout w:type="fixed"/>'
               '<w:tblCellMar><w:top w:w="30" w:type="dxa"/>'
               '<w:left w:w="100" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/>'
               '<w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'
               f'<w:tblGrid>{grid}</w:tblGrid>']
        for i, row in enumerate(rows):
            out.append('<w:tr><w:trPr><w:cantSplit/></w:trPr>')
            for j, (cell, width) in enumerate(zip(row, widths)):
                shade = ''
                if header and i == 0:
                    content = self.para(self.run(cell), 'Label')
                    shade = f'<w:shd w:val="clear" w:color="auto" w:fill="{HEAD}"/>'
                elif isinstance(cell, tuple):          # (address, words to show)
                    content = self.para(self.link(*cell) if cell[0] else '', 'Cell')
                else:
                    content = self.para(self.text(cell), 'Name' if j == 0 else 'Cell')
                out.append(f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shade}</w:tcPr>'
                           f'{content}</w:tc>')
            out.append('</w:tr>')
        out.append('</w:tbl>')
        self.body.append(''.join(out))

    def bar(self, part, whole):
        """A flat bar, filled from the left for `part` out of `whole`."""
        filled = round(CONTENT_W * part / whole) if whole else 0
        cells = [(filled, INK), (CONTENT_W - filled, HEAD)]
        cells = [(width, fill) for width, fill in cells if width]

        def pad(width):
            # Word keeps to the widths given. Quick Look sizes a cell by what is in it, so
            # each cell carries blank spaces in proportion.
            spaces = '\u00a0' * max(1, round(120 * width / CONTENT_W))
            return ('<w:p><w:pPr><w:spacing w:after="0" w:line="180" w:lineRule="exact"/>'
                    f'</w:pPr><w:r><w:rPr><w:sz w:val="12"/></w:rPr><w:t xml:space="preserve">'
                    f'{spaces}</w:t></w:r></w:p>')

        self.body.append(
            f'<w:tbl><w:tblPr><w:tblW w:w="{CONTENT_W}" w:type="dxa"/><w:tblBorders>'
            + ''.join(f'<w:{side} w:val="single" w:sz="6" w:space="0" w:color="{FRAME}"/>'
                      for side in ('top', 'left', 'bottom', 'right'))
            + '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'
            + ''.join(f'<w:gridCol w:w="{width}"/>' for width, _ in cells)
            + '</w:tblGrid><w:tr><w:trPr><w:trHeight w:val="200" w:hRule="exact"/></w:trPr>'
            + ''.join(f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>'
                      f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>{pad(width)}'
                      '</w:tc>'
                      for width, fill in cells)
            + '</w:tr></w:tbl>')

    def image(self, path, alt, scale=1.0):
        # Word can't show WebP, and phone screenshots are huge — store a plain JPEG.
        picture = Image.open(path).convert('RGB')
        picture.thumbnail((1800, 1800))
        data = io.BytesIO()
        picture.save(data, 'JPEG', quality=82)
        name = f'image{len(self.media) + 1}.jpg'
        self.media.append((name, data.getvalue()))
        rid = self.rel('image', f'media/{name}')
        n = len(self.media)
        cx = round(IMAGE_W * scale)
        cy = round(cx * picture.height / picture.width)
        a = 'http://schemas.openxmlformats.org/drawingml/2006/main'
        pic = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
        self.body.append(
            '<w:p><w:pPr><w:pStyle w:val="Picture"/></w:pPr><w:r><w:drawing>'
            '<wp:inline distT="0" distB="0" distL="0" distR="0">'
            f'<wp:extent cx="{cx}" cy="{cy}"/>'
            f'<wp:docPr id="{n}" name="Picture {n}" descr={quoteattr(alt)}/>'
            f'<a:graphic xmlns:a="{a}"><a:graphicData uri="{pic}">'
            f'<pic:pic xmlns:pic="{pic}"><pic:nvPicPr>'
            f'<pic:cNvPr id="{n}" name={quoteattr(name)}/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch>'
            '</pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/>'
            f'<a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
            '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>')

    def document(self):
        return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                f'<w:document {NS}><w:body>{"".join(self.body)}'
                f'<w:sectPr><w:pgSz w:w="{PAGE_W}" w:h="{PAGE_H}"/>'
                f'<w:pgMar w:top="{MARGIN}" w:right="{MARGIN}" w:bottom="{MARGIN}" '
                f'w:left="{MARGIN}" w:header="708" w:footer="708" w:gutter="0"/>'
                '</w:sectPr></w:body></w:document>')


def style(style_id, name, kind='paragraph', based='Normal', para='', run=''):
    based = f'<w:basedOn w:val="{based}"/>' if based else ''
    follow = '<w:next w:val="Normal"/>' if kind == 'paragraph' else ''
    return (f'<w:style w:type="{kind}" w:styleId="{style_id}"><w:name w:val="{name}"/>'
            f'{based}{follow}<w:qFormat/><w:pPr>{para}</w:pPr><w:rPr>{run}</w:rPr></w:style>')


def styles():
    # Georgia + 宋體-繁: both ship with macOS, and keep the site's serif, printed-page feel.
    fonts = ('<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Songti TC" '
             'w:cs="Georgia"/>')
    mono = '<w:rFonts w:ascii="Menlo" w:hAnsi="Menlo" w:eastAsia="Songti TC"/>'
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr>{fonts}'
        f'<w:color w:val="{INK}"/><w:sz w:val="19"/><w:szCs w:val="19"/>'
        '<w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault>'
        '<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/>'
        '</w:pPr></w:pPrDefault></w:docDefaults>'
        + style('Normal', 'Normal', based=None)
        + style('Title', 'Title', para='<w:spacing w:after="20"/>',
                run='<w:sz w:val="40"/><w:szCs w:val="40"/>')
        + style('Meta', 'Meta', para='<w:spacing w:after="160"/>',
                run=f'{mono}<w:color w:val="{MUTED}"/><w:sz w:val="15"/>')
        + style('Heading1', 'heading 1',
                para='<w:keepNext/><w:spacing w:before="220" w:after="70"/>'
                     '<w:outlineLvl w:val="0"/>',
                run=f'<w:b/><w:color w:val="{KODAK_RED}"/><w:sz w:val="24"/><w:szCs w:val="24"/>')
        + style('Heading2', 'heading 2',
                para='<w:keepNext/><w:spacing w:before="360" w:after="40"/>'
                     '<w:outlineLvl w:val="1"/>',
                run='<w:sz w:val="28"/><w:szCs w:val="28"/>')
        + style('Label', 'Label', para='<w:spacing w:after="0"/>',
                run=f'{mono}<w:color w:val="{MUTED}"/><w:sz w:val="15"/>')
        + style('Cell', 'Cell', para='<w:spacing w:after="0"/>')
        + style('Name', 'Name', para='<w:spacing w:after="0"/>', run='<w:b/>')
        + style('Picture', 'Picture',
                para='<w:keepNext/><w:spacing w:before="160" w:after="200" w:line="240" '
                     'w:lineRule="auto"/>')
        + style('Link', 'Link', kind='character', based=None,
                run=f'<w:color w:val="{KODAK_RED}"/><w:u w:val="single"/>')
        + '</w:styles>')


def build(entries, title='靈感整理', source='IDEAS.md', progress=False):
    doc = Doc()
    groups = by_type(entries)
    doc.add(title, 'Title')
    doc.add(f'最後更新 {date.today().isoformat()}  ·  {len(entries)} 項  ·  '
            f'{len(groups)} 個類型  ·  來源 {source}', 'Meta')
    if progress:
        states = [e['fields'].get('狀態', '') for e in entries]
        done = states.count(DONE)
        share = round(100 * done / len(states)) if states else 0
        doc.add(f'完成 {done} / {len(states)} 項({share}%)', 'Name')
        doc.bar(done, len(states))
        doc.add('  ·  '.join(f'{state} {states.count(state)}'
                             for state in STATES if states.count(state)), 'Meta')
    anchors = {kind: f'type{n}' for n, kind in enumerate(groups, 1)}
    doc.table([['目錄(點類型跳到那張表)', '數量']]
              + [[(f'#{anchors[kind]}', kind), str(len(found))] for kind, found in groups.items()],
              [3400, 900], header=True)

    for n, (kind, found) in enumerate(groups.items(), 1):
        doc.heading(kind, anchors[kind], n)
        # a column appears only when some entry of this type has something to put in it
        status = any(e['fields'].get('狀態') for e in found)
        links = any(url(e['fields']) for e in found)
        name_w, status_w, link_w = 2900, 1100 * status, 800 * links
        widths = [name_w, CONTENT_W - name_w - status_w - link_w]
        head = ['名稱', '重點']
        if status:
            widths.append(status_w)
            head.append('狀態')
        if links:
            widths.append(link_w)
            head.append('連結')
        rows = [head]
        for entry in found:
            fields = entry['fields']
            row = [entry['title'], point(fields)]
            if status:
                row.append(fields.get('狀態', ''))
            if links:
                row.append((url(fields), '開啟'))
            rows.append(row)
        doc.table(rows, widths, header=True)
        for entry in found:
            picture = IDEAS / entry['fields'].get('圖片', '')
            # a saved image follows the first table its entry appears in, not every one
            if picture.is_file() and kinds(entry)[0] == kind:
                doc.add(entry['title'], 'Label')
                doc.image(picture, entry['title'], scale=0.6)
    return doc


def main(source=SOURCE, out=OUT, progress=False):
    text = source.read_text(encoding='utf-8')
    entries = parse(text)
    heading = re.search(r'^# (.+)$', text, re.M)
    title = '靈感整理' if source == SOURCE else (heading.group(1).strip() if heading else out.stem)
    doc = build(entries, title, source.name, progress)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType='
                   '"application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Default Extension="jpg" ContentType="image/jpeg"/>'
                   '<Override PartName="/word/document.xml" ContentType="application/'
                   'vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                   '<Override PartName="/word/styles.xml" ContentType="application/'
                   'vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                   '</Types>')
        z.writestr('_rels/.rels',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns='
                   '"http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{REL}/officeDocument" '
                   'Target="word/document.xml"/></Relationships>')
        z.writestr('word/_rels/document.xml.rels',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns='
                   '"http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{REL}/styles" Target="styles.xml"/>'
                   f'{"".join(doc.rels)}</Relationships>')
        z.writestr('word/document.xml', doc.document())
        z.writestr('word/styles.xml', styles())
        for name, data in doc.media:
            z.writestr(f'word/media/{name}', data)
    print(f'{out} — {len(entries)} 項, {len(by_type(entries))} 個類型')


if __name__ == '__main__':
    args = [arg for arg in sys.argv[1:] if arg != '--progress']
    progress = '--progress' in sys.argv
    if len(args) == 2:
        main(Path(args[0]).resolve(), Path(args[1]).resolve(), progress)
    elif not args:
        main(progress=progress)
    else:
        sys.exit('usage: python3 tools/ideas_doc.py [list.md output.docx] [--progress]')

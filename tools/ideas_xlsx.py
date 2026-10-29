#!/usr/bin/env python3
"""靈感整理 Excel — rebuilds ideas/靈感整理.xlsx from IDEAS.md (his call, 2026-10-29: "it's a list").

IDEAS.md is still the only place entries are typed; this reads it with the same parser as
tools/ideas_doc.py. Laid out as he asked after two tries the same day: one tab per type, so
each list can be sorted and updated on its own.

  總覽        each type with its count (click to open its tab), the states, how many entries
              still lack 喜歡它什麼, and how many moved to the Paradigm tool list.
  one tab per type  a real Excel table (filter and sort from the header, banded rows): 名稱 (click
              it to open the site), 重點, 喜歡它什麼, 狀態, 日期, newest first. An entry with two
              types (類型: A / B) appears on both tabs. Set-aside entries (已移除, 已放棄) are
              greyed; a missing 喜歡它什麼 shows as a grey 待補.

Tools and general web-design resources moved to the Paradigm tool list (a Google Sheet, his
call 2026-10-29); their entries stay in IDEAS.md with a `搬到` line and are left out here.

Run from anywhere:  python3 tools/ideas_xlsx.py   (python3 tools/ideas_doc.py with no arguments
does the same). Safe to rerun: the file is overwritten, so it is read-only in practice; changes
go into IDEAS.md. The build list (TODO.md) and the weekly reports still go to Word.
"""
import re
from collections import Counter
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.hyperlink import Hyperlink
from openpyxl.worksheet.table import Table, TableStyleInfo

from ideas_doc import (EMPTY, FRAME, HEAD, IDEAS, INK, KODAK_RED, MUTED, SOURCE, by_type,
                       kinds, parse, point, url)

OUT = IDEAS / '靈感整理.xlsx'
FONT = 'Arial'
GREY = 'A39A8F'
MOVED = '搬到'
# column title and width; 喜歡它什麼 is the only column that wraps
COLUMNS = [('名稱', 32), ('重點', 36), ('喜歡它什麼', 52), ('狀態', 10), ('日期', 12)]
WRAP = {'喜歡它什麼'}
SET_ASIDE = {'已移除', '已放棄'}
# a light fill on the 狀態 cell, so the states can be told apart at a glance
STATE_FILL = {'已採用': 'E3E8D2', '已安裝': 'DCE6EC', '已存檔': 'EFE7D8', '試作中': 'F6E3C8',
              '未註冊': 'EFE7D8'}

line = Side(style='thin', color=FRAME)
UNDER = Border(bottom=line)


def font(**kw):
    return Font(name=FONT, size=kw.pop('size', 10), color=kw.pop('color', INK), **kw)


def newest_first(entry):
    """Sort key: dated entries newest first, undated ones ('建站初期') after them."""
    found = re.match(r'\d{4}-\d{2}-\d{2}', entry['fields'].get('日期', ''))
    return (0, -int(found.group(0).replace('-', ''))) if found else (1, 0)


def type_sheet(ws, n, found):
    """One tab: a filterable Excel table of the entries of one type."""
    for col, (title, width) in enumerate(COLUMNS, 1):
        ws.cell(1, col, title).font = font(bold=True)
        ws.column_dimensions[get_column_letter(col)].width = width
    ws.row_dimensions[1].height = 22
    row = 2
    for entry in sorted(found, key=newest_first):
        fields = entry['fields']
        state = fields.get('狀態', '')
        liked = fields.get('喜歡它什麼', '')
        faded = state in SET_ASIDE
        values = [entry['title'], point(fields), liked or '待補', state, fields.get('日期', '')]
        for col, value in enumerate(values, 1):
            cell = ws.cell(row, col, value)
            cell.font = font(color=GREY if faded else INK)
            cell.alignment = Alignment(vertical='top', wrap_text=COLUMNS[col - 1][0] in WRAP)
        if url(fields):
            name = ws.cell(row, 1)
            name.hyperlink = url(fields)
            name.font = font(color=GREY if faded else KODAK_RED, underline='single')
        if liked in EMPTY:
            ws.cell(row, 3).value = '待補'
            ws.cell(row, 3).font = font(color=GREY, italic=True)
        if state in STATE_FILL and not faded:
            ws.cell(row, 4).fill = PatternFill('solid', fgColor=STATE_FILL[state])
        row += 1
    table = Table(displayName=f'T{n}', ref=f'A1:{get_column_letter(len(COLUMNS))}{row - 1}')
    table.tableStyleInfo = TableStyleInfo(name='TableStyleLight1', showRowStripes=True)
    ws.add_table(table)
    ws.freeze_panes = 'B2'
    ws.sheet_view.zoomScale = 120


def overview_sheet(ws, entries, moved, groups, source):
    ws.column_dimensions['A'].width = 24
    ws.column_dimensions['B'].width = 8
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 120

    ws['A1'] = '靈感整理'
    ws['A1'].font = font(size=18, bold=True)
    both = sum(len(kinds(e)) > 1 for e in entries)
    ws['A2'] = (f'{len(entries)} 項，{len(groups)} 類，一類一個分頁'
                + (f'（{both} 項同時屬兩類，兩邊都列）' if both else '')
                + f'  ·  最後更新 {date.today().isoformat()}')
    ws['A3'] = (f'這份是從 {source.name} 自動產生的，在這裡改的內容下次重做時會被蓋掉。'
                '要加或改，跟 Claude 說。')
    ws['A4'] = ('每個分頁：點名稱打開網站；標題列的箭頭可以篩選或排序。'
                f'工具和通用的網頁設計資源（{len(moved)} 項）已搬到 Paradigm 工具清單。')
    for ref in ('A2', 'A3', 'A4'):
        ws[ref].font = font(color=MUTED)

    def block(top, title, rows, link=False):
        for col, text in enumerate((title, '數量'), 1):
            cell = ws.cell(top, col, text)
            cell.font = font(bold=True)
            cell.fill = PatternFill('solid', fgColor=HEAD)
            cell.border = UNDER
        for n, (label, count) in enumerate(rows, top + 1):
            name, number = ws.cell(n, 1, label), ws.cell(n, 2, count)
            name.font = number.font = font()
            name.border = number.border = UNDER
            if link:
                name.hyperlink = Hyperlink(ref=name.coordinate, location=f"'{label}'!A1")
                name.font = font(color=KODAK_RED, underline='single')
        return top + len(rows) + 2

    top = block(6, '類型（點了打開分頁）', [(k, len(f)) for k, f in groups.items()], link=True)
    states = Counter(e['fields'].get('狀態') or '（沒寫）' for e in entries)
    top = block(top, '狀態', states.most_common())
    missing = sum(e['fields'].get('喜歡它什麼', '') in EMPTY for e in entries)
    block(top, '還沒寫', [('喜歡它什麼', missing)])


def main(source=SOURCE, out=OUT):
    every = parse(source.read_text(encoding='utf-8'))
    moved = [e for e in every if MOVED in e['fields']]
    entries = [e for e in every if MOVED not in e['fields']]
    groups = by_type(entries)
    wb = Workbook()
    overview = wb.active
    overview.title = '總覽'
    for n, (kind, found) in enumerate(groups.items(), 1):
        type_sheet(wb.create_sheet(kind), n, found)
    overview_sheet(overview, entries, moved, groups, source)
    out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out)
    print(f'{out} — {len(entries)} 項, {len(groups)} 個類型（另有 {len(moved)} 項已搬走）')


if __name__ == '__main__':
    main()

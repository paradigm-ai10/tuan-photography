/* Version Review kit: every word the kit shows, in English and 中文 (Traditional).
   A project's review-manifest.json can override any key under "words": {"en": {...}, "zh": {...}}.
   {n}, {total}, {p} are filled in by ReviewWords.t(). */
(() => {
  'use strict';
  const W = {
    en: {
      prev: 'Previous', next: 'Next',
      of: '{n} of {total}',
      all: 'All versions', notes: 'Notes', close: 'Close',
      scores: ['', 'Not for me', 'Weak', 'Fine', 'Good', 'Love it'],
      score: 'Score', unscored: 'Not scored',
      mark: 'Mark a spot', markHint: 'Click the spot. Esc to cancel',
      like: 'Like this', change: 'Change this', likeShort: 'Like', changeShort: 'Change', bare: 'A spot',
      text: 'A few words (optional)',
      save: 'Save', cancel: 'Cancel', remove: 'Remove', go: 'Go there',
      overall: 'Overall', overallHint: 'Only if you want to',
      saved: 'Saved. Claude can read it.', local: 'Saved in this browser only',
      marks: '{n} marks', mark1: '1 mark', noMarks: 'No marks yet',
      atPct: 'at {p}% down', earlierPin: 'An older note',
      notSeen: 'Not seen', main: 'Main',
      filters: ['All', 'Not seen', 'Liked', 'Put away'],
      sorts: ['List order', 'Score', 'Last noted'],
      filterLabel: 'Show', sortLabel: 'Order',
      open: 'Open', what: 'What it is', less: 'Less',
      compareTitle: 'Compare two: {a} / {b}',
      compare: 'Compare', compareTwo: 'Compare two', pickTwo: 'Choose two to compare', pickOne: 'Choose one more', pickCancel: 'Stop choosing',
      live: 'Live', still: 'Picture',
      keepL: 'Keep left', keepR: 'Keep right', cant: "Can't choose", kept: 'Kept', beats: 'kept over {list}',
      back: 'Back to the list',
      keeps: 'Keeps saying', keepsNone: 'Nothing yet. Marks you make on the pages are counted here.',
      keepsOn: 'on {tag}', clearFilter: 'Show all again',
      earlier: 'Earlier, removed', earlierNote: 'Versions no longer on the list. What you said is kept.',
      groupNote: 'A note on this group',
      versions: '{n} versions', version1: '1 version',
      refresh: 'Refresh stills: ask Claude, the pictures are made on the Mac',
      general: 'Anything else',
      keys: 'Keys: , . versions, 1 to 5 score, N notes, M mark, H hide marks, B list',
      keysHub: 'Keys: Esc shows all again',
      keysCompare: 'Keys: , . change the right one, Esc back to the list',
      hideMarks: 'Hide marks', showMarks: 'Show marks',
      noStill: 'No picture yet',
      nothingHere: 'Nothing here with this choice.',
      lastNoted: 'Last noted {when}',
    },
    zh: {
      prev: '上一版', next: '下一版',
      of: '第 {n} 版（共 {total}）',
      all: '所有版本', notes: '筆記', close: '關閉',
      scores: ['', '不要', '普通偏弱', '還可以', '喜歡', '超喜歡'],
      score: '分數', unscored: '還沒打分',
      mark: '標記一個地方', markHint: '點那個地方，Esc 取消',
      like: '喜歡這裡', change: '這裡要改', likeShort: '喜歡', changeShort: '要改', bare: '一個地方',
      text: '寫幾個字（可不寫）',
      save: '存', cancel: '取消', remove: '拿掉', go: '回到那裡',
      overall: '整體', overallHint: '想寫再寫',
      saved: '已存，Claude 讀得到。', local: '只存在這個瀏覽器',
      marks: '{n} 個記號', mark1: '1 個記號', noMarks: '還沒有記號',
      atPct: '在 {p}% 的位置', earlierPin: '先前的筆記',
      notSeen: '還沒看', main: '主要版本',
      filters: ['全部', '還沒看', '喜歡的', '收起的'],
      sorts: ['原本順序', '分數', '最近寫的'],
      filterLabel: '顯示', sortLabel: '排序',
      open: '打開', what: '這版是什麼', less: '收起說明',
      compareTitle: '比較兩版：{a} / {b}',
      compare: '比較', compareTwo: '比較兩版', pickTwo: '選兩版來比較', pickOne: '再選一版', pickCancel: '不比了',
      live: '實際頁面', still: '縮圖',
      keepL: '留左邊', keepR: '留右邊', cant: '選不出來', kept: '留下', beats: '比 {list} 好',
      back: '回到列表',
      keeps: '常說的', keepsNone: '還沒有。你在頁面上做的記號會在這裡統計。',
      keepsOn: '（{tag}）', clearFilter: '全部顯示',
      earlier: '先前的、已移除', earlierNote: '已經不在列表上的版本。你說過的話都留著。',
      groupNote: '這一組的筆記',
      versions: '{n} 版', version1: '1 版',
      refresh: '更新縮圖：請 Claude 做，縮圖在 Mac 上產生',
      general: '其他想法',
      keys: '按鍵：, . 換版、1 到 5 打分、N 筆記、M 標記、H 藏記號、B 列表',
      keysHub: '按鍵：Esc 全部顯示',
      keysCompare: '按鍵：, . 換右邊那版、Esc 回列表',
      hideMarks: '藏起記號', showMarks: '顯示記號',
      noStill: '還沒有縮圖',
      nothingHere: '這個選擇下沒有版本。',
      lastNoted: '最近寫於 {when}',
    },
  };

  let extra = { en: {}, zh: {} };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m));

  window.ReviewWords = {
    base: W,
    // manifest "words": {"en": {...}, "zh": {...}}
    extend(words) { if (words) extra = { en: words.en || {}, zh: words.zh || {} }; },
    t(lang, key, vars) {
      const L = lang === 'zh' ? 'zh' : 'en';
      const s = key in extra[L] ? extra[L][key] : key in W[L] ? W[L][key] : W.en[key];
      return Array.isArray(s) ? s : fill(s == null ? key : s, vars);
    },
    // a manifest text: {"en": "…", "zh": "…"} or a plain string
    pick(lang, v) { return v == null ? '' : typeof v === 'string' ? v : (lang === 'zh' ? v.zh || v.en : v.en || v.zh) || ''; },
  };
})();

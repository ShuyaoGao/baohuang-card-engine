/* 保皇的界面配置（GAME_UI）。依赖：CG、BaoHuang、UIC。 */
(function (root) {
  'use strict';
  var CG = root.CG, G = root.BaoHuang, U = root.UIC;
  var KIND_ZH = {set: '同点牌', pass: '过'};
  var seatPos = U.seatPos(5), ord = function (r) { return r; }, sortDesc = U.sortDesc(ord);
  function moveText(m) { return m.isPass ? '过' : m.length + ' 张 ' + CG.RANK_NAMES[m.main]; }
  var ROLE = {emperor: {text: '👑 皇帝', color: '#ffc94d'}, guard: {text: '🛡 保子', color: '#ff9f43'}, civilian: {text: '平民', color: '#4aa3ff'}};

  root.GAME_UI = {
    key: 'baohuang', title: '保皇', sub: '四副牌 · 五人 · 皇帝加保子对三个平民',
    repo: 'baohuang-card-engine', demoSeed: 20261013, hasBrain: false,
    kindZh: KIND_ZH, moveText: moveText, seatPos: seatPos, seatXY: U.seatXY, finishName: U.finishName,
    sortForDisplay: sortDesc, alarmAt: 5,
    fullDeck: function () { return CG.deck(4); }, counterRanks: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3],
    counterExtra: function (g, human, all) { if (human === g.emperor) all.subtract(CG.rankCounter(g.buried)); },
    kindNames: {random: '随机', greedy: '贪心'},
    presets: {
      novice: {name: '新手', desc: '随机：在所有合法出牌里随便挑一个。', kinds: function (n) { return new Array(n).fill('random'); }},
      normal: {name: '普通', desc: '贪心规则：自由出牌出张数最多的一手（张数相同出最小的），跟牌出最小能压的一手。', kinds: function (n) { return new Array(n).fill('greedy'); }},
      mixed: {name: '混搭', desc: '偶数号座位贪心、奇数号座位随机（我来玩时 0 号是你）——身份每局都变，看看贪心规则能帮哪一方。', kinds: function (n) { var k = []; for (var i = 0; i < n; i++) k.push(i % 2 === 0 ? 'greedy' : 'random'); return k; }}
    },
    defaultPreset: {watch: 'normal', play: 'normal'},
    roleOf: function (g, s) { var r = ROLE[g.position(s)]; return g.guard === null && s === g.emperor ? {text: '👑 皇帝（自保）', color: r.color} : r; },
    roleShort: function (g, s) { return {emperor: '皇帝', guard: '保子', civilian: '平民'}[g.position(s)]; },
    lastShown: function (g, seat, lastCards) { return U.lastShown(g, seat, lastCards, KIND_ZH, sortDesc); },
    startLog: function (g) {
      return ['皇帝 ' + seatPos(g.emperor) + '（亮牌 ' + CG.cardStr(g.markCard) + ' 落在他手里），' + (g.guard === null ? '皇帝有 ' + g.bigJokers[g.emperor] + ' 张大王：自保！' : '保子 ' + seatPos(g.guard) + '（明保：大王最多的人）')];
    },
    startExplain: function (g) {
      return '四副牌，每人 42 张。<b>' + seatPos(g.emperor) + '</b> 是皇帝（拿底牌、扣回最小的 6 张），' +
        (g.guard === null ? '他有 ≥3 张大王，<b>自保</b>：一个人对四个人，输赢翻倍。' : '<b>' + seatPos(g.guard) + '</b> 是保子（大王最多的人），和皇帝一伙。') +
        '只有一种牌型：N 张同点，同张数比点数。';
    },
    centerInfo: function (g) {
      var t = '皇帝 <b>' + g.emperor + ' 号</b> · ' + (g.guard === null ? '<b>自保</b>' : '保子 <b>' + g.guard + ' 号</b>') + '<br>';
      if (g.finished.length && !g.done) t += '已出完：' + g.finished.map(function (s, i) { return U.finishName(i, 5) + ' ' + s + '号'; }).join('、') + '<br>';
      if (g.done) return t + '本局结束';
      return t + (g.toBeat ? '要压：<b>' + moveText(g.toBeat) + '</b>（' + g.toBeat.length + ' 张、点数更大）' : '<b>自由出牌</b>');
    },
    humanHint: function (g, legal) {
      return '点牌选中（双击一张 = 选中同点数的全部），回车出牌，空格过，T 提示。' + (g.toBeat ? '要压 <b>' + moveText(g.toBeat) + '</b>：必须同样 ' + g.toBeat.length + ' 张、点数更大。' : '现在自由出牌。');
    },
    whyIllegal: function (g, cs) {
      var rs = cs.map(function (c) { return c.r; });
      if (rs.some(function (r) { return r !== rs[0]; })) return '保皇只有一种牌型：选的牌必须是同一个点数';
      return g.toBeat ? '要压 ' + moveText(g.toBeat) + '：必须同样 ' + g.toBeat.length + ' 张、点数更大' : '这一手现在不能出';
    },
    onHumanMove: function (g, m, task) {
      if (!m.isPass && m.length >= 4) task('set4');
      if (!m.isPass && m.main >= 16) task('joker');
    },
    galleryCheck: function (cards) {
      var g = new G(new root.PyRandom(1)).reset(), rk = cards.map(function (c) { return c.r; }).join(',');
      g.hands[0] = cards;
      return g.genMoves(0).some(function (m) { return m.ranks.join(',') === rk; });
    },
    resultText: function (g) {
      var team = g.guard === null ? '皇帝（自保）' : '皇帝和保子';
      return team + (g.empWin ? '胜' : '负') + '；名次 ' + g.finished.map(function (s, i) { return U.finishName(i, 5) + ' ' + s + '号'; }).join('、') + '；得分 ' +
        g.returns().map(function (v, s) { return s + '号' + (v > 0 ? '+' : '') + v; }).join(' / ');
    },
    rulesHTML: '四副牌 216 张，五人每人 42 张；“亮牌”落点定<b>皇帝</b>，皇帝拿 6 张底牌、扣回最小的 6 张。<br>' +
      '<b>保子</b>（明保简化）：非皇帝玩家里大王最多的人；皇帝自己有 ≥3 张大王则<b>自保</b>（1 打 4，输赢翻倍）。<br>' +
      '牌型只有一种：<b>N 张同点</b>（1~16 张），同张数比点数；大王 > 小王 > 2 > A > … > 3。<br>' +
      '打到只剩一人结束；皇帝方名次之和 <4 胜。计分（零和）：皇帝 ±2、保子 ±1、平民各 ∓1；自保局皇帝 ±4。',
    greedySteps: [
      {id: 'lead', text: '① 没人要压（自由出牌）→ 挑「张数最多」的一手，张数相同挑「点数最小」'},
      {id: 'follow', text: '② 要跟牌 → 在能压住的牌里挑「点数最小」，点数相同挑「张数最少」'},
      {id: 'pass', text: '③ 压不住 → 过'}
    ],
    rulesNote: '贪心规则（agents.GreedyAgent）：自由出牌时出张数最多的一手、张数相同出最小的；跟牌时出能压住的里面最小的一手。保皇没有炸弹，所以“手牌 ≤8 张才用炸弹”那条用不上。',
    tasks: [
      {id: 'types', text: '在「牌型图鉴」里点开 3 个例子'},
      {id: 'set4', text: '出一手 4 张以上的同点牌'},
      {id: 'joker', text: '出一手大王或小王'},
      {id: 'hint', text: '用一次 💡 提示，看贪心规则会怎么出'},
      {id: 'win_practice', text: '你这一方赢一局（对手：新手）'}
    ],
    gallery: [
      ['单张', [[9, '♠']], '1 张。'],
      ['两张', [[12, '♥'], [12, '♣']], '2 张同点。只能被 2 张更大的压。'],
      ['五张', [[7, '♠'], [7, '♥'], [7, '♣'], [7, '♦'], [7, '♠']], '四副牌，同点最多 16 张；张数必须一样才能比。'],
      ['三个大王', [[17, ''], [17, ''], [17, '']], '大王最大。皇帝手里有 ≥3 张大王就自保。']
    ],
    helpCards: [
      ['① 这是什么', '<p>四副牌、五个人的<b>保皇</b>：皇帝加保子对三个平民。发牌、定皇帝、定保子、出牌、名次和计分都在浏览器里运行，与 Python 版引擎逐步一致。</p><p>AI 是规则（贪心 / 随机），没有训练过的神经网络。</p>'],
      ['② 怎么看右边', '<p><b>规则依据</b>：这一步贪心规则命中了哪一条、在哪些候选里挑、挑了哪一手。</p><p>下面是<b>记牌器</b>：每个点数还剩几张没出（四副牌，每个点数 16 张、王各 4 张）。</p>'],
      ['③ 怎么玩', '<p>顶部切换「观战 / 我来玩 / 规则练习」。我来玩：你坐 0 号位，身份每局随机。点牌选中，<b>双击一张牌 = 选中同点数的全部</b>，<kbd>回车</kbd> 出牌，<kbd>空格</kbd> 过，<kbd>T</kbd> 提示。</p><p><kbd>P</kbd> 暂停 / 继续，<kbd>N</kbd> 单步，<kbd>H</kbd> 打开本说明。</p>']
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);

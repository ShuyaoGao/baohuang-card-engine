/* 保皇引擎，移植自 games/baohuang.py：5 人 4 副牌 216 张，皇帝 + 保子 vs 三平民。
 *   每人 42 张，6 张底牌归皇帝、皇帝扣回最小的 6 张；“亮牌”落点定皇帝（等价随机）。
 *   保子（明保简化）：非皇帝玩家里大王最多者；皇帝自己有 ≥3 张大王则“自保”（1 打 4，输赢翻倍）。
 *   牌型：N 张同点，同张数比点数；大王 > 小王 > 2 > A > … > 3。打到只剩一人结束，名次 0~4。
 *   胜负：皇帝方名次之和 <4 胜；计分（零和）：皇帝 ±2、保子 ±1、平民各 ∓1；自保局皇帝 ±4。
 * 依赖：CG（core.js）、PyRandom。
 */
(function (root) {
  'use strict';
  var CG = root.CG, BJ = CG.BIG_JOKER, Move = CG.Move;

  function BaoHuang(rng) { this.rng = rng || new root.PyRandom(); }
  CG.inherit(BaoHuang);
  BaoHuang.prototype.N = 5;
  BaoHuang.prototype.NAME = 'baohuang';
  BaoHuang.prototype.TITLE = '保皇';

  BaoHuang.prototype.deal = function () {
    var cards = CG.deck(4);
    this.rng.shuffle(cards);
    this.hands = [0, 1, 2, 3, 4].map(function (i) { return CG.sortCards(cards.slice(i * 42, (i + 1) * 42)); });
    var bottom = cards.slice(210), mark = this.rng.randrange(210);
    this.emperor = Math.floor(mark / 42);
    this.markCard = cards[mark];
    var hand = CG.sortCards(this.hands[this.emperor].concat(bottom));
    this.buried = hand.slice(0, 6);
    this.hands[this.emperor] = hand.slice(6);
    var bj = this.hands.map(function (h) { return h.filter(function (c) { return c.r === BJ; }).length; });
    this.bigJokers = bj;
    if (bj[this.emperor] >= 3) this.guard = null;
    else {
      var best = -1, E = this.emperor;
      for (var s = 0; s < 5; s++) if (s !== E) best = Math.max(best, bj[s]);
      this.guard = null;
      for (var d = 1; d < 5; d++) { var t = (E + d) % 5; if (t !== E && bj[t] === best) { this.guard = t; break; } }
    }
  };
  BaoHuang.prototype.firstSeat = function () { return this.emperor; };
  BaoHuang.prototype.emperorTeam = function () { return this.guard === null ? [this.emperor] : [this.emperor, this.guard]; };
  BaoHuang.prototype.position = function (seat) { return seat === this.emperor ? 'emperor' : seat === this.guard ? 'guard' : 'civilian'; };
  BaoHuang.prototype.positionsList = function () { return ['emperor', 'guard', 'civilian']; };
  BaoHuang.prototype.teams = function () { var t = this.emperorTeam(); return [0, 1, 2, 3, 4].map(function (s) { return t.indexOf(s) >= 0 ? 0 : 1; }); };
  BaoHuang.prototype.genMoves = function (seat) {
    var cnt = CG.rankCounter(this.hands[seat]), moves = [];
    CG.sortedNums(cnt.keys()).forEach(function (r) {
      for (var n = 1; n <= cnt.get(r); n++) moves.push(Move('set', r, n, new Array(n).fill(r)));
    });
    return moves;
  };
  BaoHuang.prototype.beats = function (m, last) { return m.length === last.length && m.main > last.main; };
  BaoHuang.prototype.isOver = function () { return this.finished.length >= 4; };
  BaoHuang.prototype.settle = function () {
    var pos = {}, self = this;
    this.finished.forEach(function (s, i) { pos[s] = i; });
    var empWin;
    if (this.guard === null) {
      empWin = pos[this.emperor] === 0;
      for (var s = 0; s < 5; s++) this.returns_[s] = s === this.emperor ? (empWin ? 4 : -4) : (empWin ? -1 : 1);
    } else {
      var s2 = 0;
      this.emperorTeam().forEach(function (x) { s2 += pos[x]; });
      empWin = s2 < 4;
      for (s = 0; s < 5; s++) this.returns_[s] = s === self.emperor ? (empWin ? 2 : -2) : s === self.guard ? (empWin ? 1 : -1) : (empWin ? -1 : 1);
    }
    this.empWin = empWin;
  };
  CG.GAMES.baohuang = BaoHuang;
  root.BaoHuang = BaoHuang;
})(typeof window !== 'undefined' ? window : globalThis);

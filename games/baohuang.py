# -*- coding: utf-8 -*-
"""保皇：5 人 4 副牌（216 张），皇帝+保子 vs 三平民。

实现的标准核心规则（变体点见注释与 README）：
  - 每人 42 张，6 张底牌归皇帝，皇帝扣回 6 张（启发式扣最小）
  - 定皇帝：发牌时随机指定一张"亮牌"，抓到者为皇帝（等价随机庄）
  - 定保子（明保简化）：非皇帝玩家中大王最多者为保子，并列取皇帝下家方向最近者；
    皇帝自己持有 ≥3 张大王则"自保"（1 打 4，输赢翻倍）
  - 牌型：N 张同点（1~16 张），同张数比点数；大王>小王>2>A>K>…>3
  - 打到只剩一人（大落）结束；名次 0~4
  - 胜负：皇帝方名次之和 <4 胜、>4 负、=4 平民胜（进攻方需优势）
  - 计分（零和）：普通局 皇帝±2 保子±1 平民各∓1；自保局 皇帝±4 平民各∓1
"""

from collections import Counter

from core.cards import deck, rank_counter, MultiHot, onehot, BIG_JOKER
from core.shed import ShedGame, Move


class BaoHuang(ShedGame):
    N = 5
    NAME = "baohuang"
    TITLE = "保皇"
    TEAM_DESC = "皇帝+保子 vs 三平民"
    ENC = MultiHot(range(3, 16), 16, 4)

    def deal(self):
        cards = deck(4)
        self.rng.shuffle(cards)
        self.hands = [sorted(cards[i * 42:(i + 1) * 42]) for i in range(5)]
        bottom = cards[210:]
        mark = self.rng.randrange(210)              # "亮牌"落点定皇帝
        self.emperor = mark // 42
        hand = sorted(self.hands[self.emperor] + bottom)
        self.buried = hand[:6]                      # 扣回最小的 6 张
        self.hands[self.emperor] = hand[6:]

        bj = [sum(1 for c in h if c[0] == BIG_JOKER) for h in self.hands]
        if bj[self.emperor] >= 3:
            self.guard = None                       # 自保
        else:
            cands = [(s, bj[s]) for s in range(5) if s != self.emperor]
            best = max(c[1] for c in cands)
            self.guard = next(s for d in range(1, 5)
                              for s in [(self.emperor + d) % 5]
                              if s != self.emperor and bj[s] == best)

    def first_seat(self):
        return self.emperor

    def emperor_team(self):
        return {self.emperor} if self.guard is None else {self.emperor, self.guard}

    def position(self, seat):
        if seat == self.emperor:
            return "emperor"
        if seat == self.guard:
            return "guard"
        return "civilian"

    def teams(self):
        return [0 if s in self.emperor_team() else 1 for s in range(5)]

    def gen_moves(self, seat, to_beat):
        cnt = rank_counter(self.hands[seat])
        moves = []
        for r in sorted(cnt):
            for n in range(1, cnt[r] + 1):
                moves.append(Move("set", r, n, (r,) * n))
        return moves

    def beats(self, m, last):
        return m.length == last.length and m.main > last.main

    def is_over(self):
        return len(self.finished) >= 4

    def settle(self):
        pos = {s: i for i, s in enumerate(self.finished)}   # 0=头游
        team = self.emperor_team()
        if self.guard is None:                               # 自保：皇帝须头游
            emp_win = pos[self.emperor] == 0
            for s in range(5):
                self.returns_[s] = (4 if emp_win else -4) if s == self.emperor \
                    else (-1 if emp_win else 1)
        else:
            s2 = sum(pos[s] for s in team)
            emp_win = s2 < 4
            for s in range(5):
                if s == self.emperor:
                    self.returns_[s] = 2 if emp_win else -2
                elif s == self.guard:
                    self.returns_[s] = 1 if emp_win else -1
                else:
                    self.returns_[s] = -1 if emp_win else 1
        self.emp_win = emp_win

    # ---------------- RL 编码 ----------------
    def encode_state(self, seat):
        E = self.ENC
        feats = []
        feats += E.encode(self.hands[seat])
        unseen = Counter(r for r, _ in deck(4))
        unseen.subtract(rank_counter(self.hands[seat]))
        unseen.subtract(rank_counter(self.buried) if seat == self.emperor else Counter())
        for p in self.played:
            unseen.subtract(rank_counter(p))
        feats += E.encode(list((+unseen).elements()))
        feats += E.encode(list(self.to_beat.ranks) if self.to_beat else [])
        for d in range(1, 5):
            a = self.last_action[(seat + d) % 5]
            feats += E.encode(list(a.ranks) if not a.is_pass else [])
        for d in range(1, 5):
            feats += onehot(min(len(self.hands[(seat + d) % 5]), 47), 48)
        feats += onehot((self.emperor - seat) % 5, 5)
        feats += onehot((self.guard - seat) % 5 if self.guard is not None else 5, 6)
        return feats

    @classmethod
    def encode_action(cls, move):
        return cls.ENC.encode([] if move.is_pass else list(move.ranks))

    def positions_list(self):
        return ["emperor", "guard", "civilian"]

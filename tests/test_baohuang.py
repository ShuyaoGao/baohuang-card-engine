# -*- coding: utf-8 -*-
"""保皇引擎测试（python -m pytest，或 python tests/test_baohuang.py）。"""

import random
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.cards import deck, SMALL_JOKER, BIG_JOKER  # noqa: E402,F401
from core.shed import Move, PASS  # noqa: E402,F401
from games import BaoHuang  # noqa: E402
from agents import RandomAgent, GreedyAgent  # noqa: E402,F401

PASSED = 0

def check(cond, name):
    global PASSED
    assert cond, f"测试失败: {name}"
    PASSED += 1
    print(f"  ✓ {name}")



def play_random(game, max_steps=3000):
    rng = random.Random(123)
    steps = 0
    while not game.done:
        game.step(rng.choice(game.legal_moves()))
        steps += 1
        assert steps < max_steps, "对局未终止"
    return steps



def find(moves, kind, **kw):
    return [m for m in moves if m.kind == kind
            and all(getattr(m, k) == v for k, v in kw.items())]



def test_baohuang():
    check(len(deck(4)) == 216, "四副牌 216 张")
    g = BaoHuang(random.Random(6)).reset()
    total = sum(len(h) for h in g.hands) + len(g.buried)
    check(total == 216, "保皇发牌 42×5 + 皇帝扣 6 守恒")
    check(len(g.hands[g.emperor]) == 42, "皇帝拿底扣回后 42 张")
    check(g.guard is None or g.guard != g.emperor, "保子不是皇帝")

    s1 = Move("set", 9, 3, (9,) * 3)
    s2 = Move("set", 11, 3, (11,) * 3)
    check(g.beats(s2, s1) and not g.beats(s1, s2), "同张数比点数")
    check(not g.beats(Move("set", 17, 2, (17,) * 2), s1), "张数不同不能压")

    for seed in range(8):
        g = BaoHuang(random.Random(seed)).reset()
        play_random(g)
        assert len(g.finished) == 5, "名次完整"
        assert abs(sum(g.returns())) < 1e-9, "保皇得分零和"
    check(True, "8 局随机保皇：终止 + 名次 + 零和")



def test_greedy_baohuang():
    greedy = GreedyAgent()
    for seed in range(5):
        g = BaoHuang(random.Random(99 + seed))
        g.reset()
        steps = 0
        while not g.done:
            g.step(greedy.act(g))
            steps += 1
            assert steps < 5000, "贪心对局未终止"
    check(True, "贪心智能体可完整打完 5 局")


if __name__ == "__main__":
    for fn in [test_baohuang, test_greedy_baohuang]:
        print(f"\n[{fn.__name__}]")
        fn()
    print(f"\n全部通过：共 {PASSED} 项断言 ✓")

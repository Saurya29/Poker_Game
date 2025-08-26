export const CATEGORY_NAMES = [
  'High Card','Pair','Two Pair','Three of a Kind','Straight',
  'Flush','Full House','Four of a Kind','Straight Flush',
]

function combinations(arr, k) {
  const res = []
  function helper(start, combo) {
    if (combo.length === k) { res.push(combo.slice()); return }
    for (let i = start; i < arr.length; i++) helper(i + 1, combo.concat([arr[i]]))
  }
  helper(0, [])
  return res
}

function pickTopNRanksExcluding(ranksDesc, exclude, n) {
  const res = []
  for (const r of ranksDesc) {
    if (!exclude.includes(r) && !res.includes(r)) {
      res.push(r); if (res.length === n) break
    }
  }
  return res
}

function scoreHand(category, tiebreakers) {
  const base = 15; let score = category
  for (const r of tiebreakers) score = score * base + r
  return { score, name: CATEGORY_NAMES[category], details: tiebreakers }
}

function evaluate5(cards) {
  const ranks = cards.map(c => c.r).sort((a,b) => b - a)
  const suits = cards.map(c => c.s)
  const counts = {}; for (const r of ranks) counts[r] = (counts[r]||0)+1
  const byCount = Object.entries(counts).map(([r,c]) => ({ r:Number(r), c }))
                    .sort((a,b) => b.c - a.c || b.r - a.r)
  const isFlush = new Set(suits).size === 1

  function straightHigh(rs) {
    const uniq = [...new Set(rs)].sort((a,b) => b - a)
    const expanded = uniq.includes(14) ? uniq.concat([1]) : uniq
    let run = 1
    for (let i = 0; i < expanded.length - 1; i++) {
      if (expanded[i] - 1 === expanded[i+1]) {
        run++; if (run >= 5) return expanded[i - 3]
      } else run = 1
    }
    return null
  }

  const straightHi = straightHigh(ranks)
  const isStraight = straightHi !== null

  if (isFlush && isStraight) return scoreHand(8, [straightHi])
  if (byCount[0].c === 4)    return scoreHand(7, [byCount[0].r, byCount[1].r])
  if (byCount[0].c === 3 && byCount[1].c === 2) return scoreHand(6, [byCount[0].r, byCount[1].r])
  if (isFlush)               return scoreHand(5, ranks)
  if (isStraight)            return scoreHand(4, [straightHi])
  if (byCount[0].c === 3) {
    const trips = byCount[0].r
    const top2 = pickTopNRanksExcluding(ranks, [trips], 2)
    return scoreHand(3, [trips, ...top2])
  }
  if (byCount[0].c === 2 && byCount[1].c === 2) {
    const pair1 = Math.max(byCount[0].r, byCount[1].r)
    const pair2 = Math.min(byCount[0].r, byCount[1].r)
    const kicker = pickTopNRanksExcluding(ranks, [pair1, pair2], 1)[0]
    return scoreHand(2, [pair1, pair2, kicker])
  }
  if (byCount[0].c === 2) {
    const pair = byCount[0].r
    const kickers = pickTopNRanksExcluding(ranks, [pair], 3)
    return scoreHand(1, [pair, ...kickers])
  }
  return scoreHand(0, ranks)
}

export function bestOf7(cards) {
  const fives = combinations(cards, 5)
  let best = null
  for (const five of fives) {
    const ev = evaluate5(five)
    if (!best || ev.score > best.score) best = ev
  }
  return best
}

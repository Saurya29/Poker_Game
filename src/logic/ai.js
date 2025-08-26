import { bestOf7 } from './handEval.js'


export function rate7(cards7) {
const b = bestOf7(cards7)
const cat = b.name
if (cat === 'Straight Flush' || cat === 'Four of a Kind') return 4
if (cat === 'Full House' || cat === 'Flush' || cat === 'Straight') return 3
if (cat === 'Three of a Kind') return 2
if (cat === 'Two Pair') return 1
return 0
}


export function preflopGrade(c1, c2) {
const ranks = [c1.r, c2.r].sort((a, b) => b - a)
const suited = c1.s === c2.s
const gap = Math.abs(c1.r - c2.r)
if (c1.r === c2.r) return c1.r >= 10 ? 3 : 2
if (ranks[0] >= 13 && ranks[1] >= 11) return 2
if (suited && gap <= 1 && ranks[0] >= 10) return 2
if (suited && ranks[0] >= 11 && ranks[1] >= 9) return 1
if (gap <= 1 && ranks[0] >= 10) return 1
return 0
}


export function aiChooseAction({ stage, ai, human, toCall, pot, community, raiseAvailable, bigBlind }) {
const stack = ai.chips
const minBet = Math.min(Math.max(bigBlind, toCall || bigBlind), stack)
if (stack <= 0) return { type: toCall > 0 ? 'call' : 'check' }


if (stage === 'preflop') {
const grade = preflopGrade(ai.hand[0], ai.hand[1])
if (toCall === 0) {
if (grade >= 2 && raiseAvailable) return { type: 'bet', amount: Math.min(stack, bigBlind * (2 + grade)) }
return { type: 'check' }
} else {
if (grade >= 2) {
if (raiseAvailable && Math.random() < 0.4) return { type: 'raise', amount: Math.min(stack, toCall + bigBlind * (1 + grade)) }
return { type: 'call' }
}
if (grade === 1 && toCall <= bigBlind * 2.5) return { type: 'call' }
return Math.random() < 0.2 ? { type: 'call' } : { type: 'fold' }
}
} else {
const strength = rate7([...ai.hand, ...community])
if (toCall === 0) {
if (strength >= 3 && raiseAvailable) return { type: 'bet', amount: Math.min(stack, Math.max(bigBlind * 2, Math.floor(pot * 0.6))) }
if (strength >= 2 && raiseAvailable && Math.random() < 0.4) return { type: 'bet', amount: Math.min(stack, Math.max(bigBlind * 2, Math.floor(pot * 0.4))) }
return { type: 'check' }
} else {
if (strength >= 3) {
if (raiseAvailable && Math.random() < 0.5) return { type: 'raise', amount: Math.min(stack, toCall + Math.max(bigBlind * 2, Math.floor(pot * 0.6))) }
return { type: 'call' }
}
if (strength === 2 && toCall <= Math.max(bigBlind * 3, Math.floor(pot * 0.4))) return { type: 'call' }
if (strength === 1 && toCall <= Math.max(bigBlind * 2, Math.floor(pot * 0.25))) return { type: 'call' }
return Math.random() < 0.15 ? { type: 'call' } : { type: 'fold' }
}
}
}
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
export const SUITS = ['♠', '♥', '♦', '♣']


export const rankLabel = (r) => (r <= 10 ? String(r) : { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r])


export function createDeck() {
const d = []
for (const s of SUITS) for (const r of RANKS) d.push({ r, s, id: `${r}${s}` })
return d
}


export function shuffle(arr) {
const a = arr.slice()
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1))
;[a[i], a[j]] = [a[j], a[i]]
}
return a
}
const Chip = ({ size = 16 }) => (
<div
className="rounded-full border-2 border-white/70 bg-gradient-to-b from-rose-500 to-rose-700 shadow-md"
style={{ width: size, height: size }}
/>
)


export default function ChipStack({ amount = 0 }) {
const chips = Math.max(1, Math.floor(amount / 50))
const stack = Math.min(6, chips)
return (
<div className="relative h-6 w-10">
{[...Array(stack)].map((_, i) => (
<div key={i} className="absolute" style={{ left: i * 4, top: (5 - i) * 2 }}>
<Chip size={16} />
</div>
))}
<div className="absolute -bottom-5 left-0 text-xs text-white/90">${amount}</div>
</div>
)
}
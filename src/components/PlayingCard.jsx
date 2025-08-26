import { motion } from 'framer-motion'
import { rankLabel } from '../logic/cards.js'


export default function PlayingCard({ card, faceUp = true, className = '' }) {
const isRed = card?.s === '♥' || card?.s === '♦'
return (
<motion.div
initial={{ rotateY: 180 }}
animate={{ rotateY: faceUp ? 0 : 180 }}
transition={{ duration: 0.4 }}
className={
'[transform-style:preserve-3d] relative h-24 w-16 rounded-xl shadow-xl ' + className
}
>
{/* Face */}
<div className="absolute inset-0 rounded-xl bg-white p-2 [backface-visibility:hidden]">
<div
className={`flex h-full w-full flex-col justify-between rounded-lg border border-zinc-200 p-1 ${
isRed ? 'text-rose-600' : 'text-zinc-800'
}`}
>
<div className="text-sm font-bold">
{rankLabel(card?.r)}
{card?.s}
</div>
<div className="flex items-center justify-center text-3xl font-semibold">{card?.s}</div>
<div className="self-end text-sm font-bold">
{rankLabel(card?.r)}
{card?.s}
</div>
</div>
</div>
{/* Back */}
<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 [transform:rotateY(180deg)] [backface-visibility:hidden]">
<div className="h-full w-full rounded-xl border-2 border-white/50 p-1">
<div className="h-full w-full rounded-lg border-2 border-white/40" />
</div>
</div>
</motion.div>
)
}
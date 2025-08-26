export default function ActionButton({ disabled, onClick, children }) {
return (
<button
disabled={disabled}
onClick={onClick}
className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-md transition active:scale-[.98] ${
disabled ? 'cursor-not-allowed bg-zinc-700/40 text-zinc-400' : 'bg-zinc-900 text-white hover:bg-zinc-800'
}`}
>
{children}
</button>
)
}
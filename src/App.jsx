import React, { useEffect, useRef, useState } from 'react'
import ActionButton from './components/ActionButton.jsx'
import ChipStack from './components/ChipStack.jsx'
import PlayingCard from './components/PlayingCard.jsx'
import { createDeck, shuffle } from './logic/cards.js'
import { bestOf7 } from './logic/handEval.js'
import { aiChooseAction } from './logic/ai.js'

// --- Config ---
const STARTING_STACK = 1000
const SMALL_BLIND = 10
const BIG_BLIND = 20 // heads-up blinds
const ACTION_DELAY_MS = 900 // AI think time

export default function App() {
  const [players, setPlayers] = useState(() => [
    { idx: 0, name: 'You',    chips: STARTING_STACK, bet: 0, hand: [], folded: false, isHuman: true,  allIn: false },
    { idx: 1, name: 'Dealer', chips: STARTING_STACK, bet: 0, hand: [], folded: false, isHuman: false, allIn: false },
  ])
  const [dealerBtn, setDealerBtn] = useState(0) // index of dealer button (0 = you, 1 = dealer)
  const [stage, setStage] = useState('init') // init|preflop|flop|turn|river|showdown|handOver
  const [community, setCommunity] = useState([])
  const [pot, setPot] = useState(0)
  const [currentBet, setCurrentBet] = useState(0) // bet to call on this street
  const [current, setCurrent] = useState(0) // whose turn (0 you / 1 dealer)
  const [messages, setMessages] = useState([])
  const [raiseAvailable, setRaiseAvailable] = useState(true) // single-raise-per-street
  const [actedThisStreet, setActedThisStreet] = useState(new Set())
  const [pendingAllInRunout, setPendingAllInRunout] = useState(false)

  const deckRef = useRef([]) // mutable deck
  const [raiseAmount, setRaiseAmount] = useState(BIG_BLIND * 2)

  function log(msg) {
    setMessages((m) => [msg, ...m].slice(0, 6))
  }

  function resetBets() {
    setPlayers((ps) => ps.map((p) => ({ ...p, bet: 0 })))
    setCurrentBet(0)
    setActedThisStreet(new Set())
    setRaiseAvailable(true)
  }

  function nextPlayerIndex(i) {
    return (i + 1) % players.length
  }

  function activePlayers(pl = players) {
    return pl.filter((p) => !p.folded && (p.chips > 0 || p.bet > 0 || p.allIn))
  }

  function postBlinds(newPlayers, btn) {
    // Heads-up: dealer is SB, other is BB
    const sbIdx = btn
    const bbIdx = nextPlayerIndex(btn)
    const p2 = newPlayers.map((p, i) => {
      if (i === sbIdx) {
        const blind = Math.min(SMALL_BLIND, p.chips)
        return { ...p, chips: p.chips - blind, bet: blind, allIn: p.chips - blind === 0 }
      }
      if (i === bbIdx) {
        const blind = Math.min(BIG_BLIND, p.chips)
        return { ...p, chips: p.chips - blind, bet: blind, allIn: p.chips - blind === 0 }
      }
      return p
    })
    setPlayers(p2)
    setCurrentBet(BIG_BLIND)
    setPot((pt) => pt + SMALL_BLIND + BIG_BLIND)
    setActedThisStreet(new Set())
    setRaiseAvailable(true)
    setCurrent(sbIdx) // preflop action starts on SB (dealer) in heads-up
  }

  // draw from top of deck
  function takeTop() {
    return deckRef.current.pop()
  }

  function dealNewHand() {
    const newBtn = 1 - dealerBtn
    setDealerBtn(newBtn)
    // fresh deck
    deckRef.current = shuffle(createDeck())
    // reset table
    setCommunity([])
    setPot(0)
    setStage('preflop')
    setMessages([])

    // reset players & deal two cards
    const base = players.map((p) => ({ ...p, bet: 0, hand: [], folded: false, allIn: false }))
    base.forEach((p) => (p.hand = [takeTop(), takeTop()]))
    setPlayers(base)
    // blinds & turn order
    postBlinds(base, newBtn)

    log('New hand started. Blinds 10/20.')
  }

  function burn() { takeTop() }
  function dealFlop()  { burn(); setCommunity([takeTop(), takeTop(), takeTop()]); log('Flop dealt.') }
  function dealTurn()  { burn(); setCommunity((c) => c.concat([takeTop()]));   log('Turn dealt.') }
  function dealRiver() { burn(); setCommunity((c) => c.concat([takeTop()]));   log('River dealt.') }

  function endStreetAdvance() {
    resetBets()
    if (stage === 'preflop') {
      dealFlop(); setStage('flop')
    } else if (stage === 'flop') {
      dealTurn(); setStage('turn')
    } else if (stage === 'turn') {
      dealRiver(); setStage('river')
    } else if (stage === 'river') {
      setStage('showdown')
      setTimeout(showdown, 500)
    }
    // postflop first action heads-up is the non-dealer (BB)
    const first = nextPlayerIndex(dealerBtn)
    setCurrent(first)
  }

  function settlePotTo(winnerIdx, reason = 'wins') {
    setPlayers((ps) => ps.map((p, i) => (i === winnerIdx ? { ...p, chips: p.chips + pot } : p)))
    log(`${players[winnerIdx].name} ${reason} ${pot} chips.`)
    setPot(0)
    setStage('handOver')
  }

  function showdown() {
    const alive = players.map((p, i) => ({ ...p, i })).filter((p) => !p.folded)
    const results = alive.map((p) => ({ idx: p.i, ev: bestOf7([...p.hand, ...community]) }))
    results.sort((a, b) => b.ev.score - a.ev.score)

    const best = results[0]
    const ties = results.filter((x) => x.ev.score === best.ev.score)

    if (ties.length > 1) {
      const portion = Math.floor(pot / ties.length)
      setPlayers((ps) => {
        const copy = ps.map((p) => ({ ...p }))
        for (const t of ties) copy[t.idx].chips += portion
        return copy
      })
      log(`Split pot: ${ties.map((t) => players[t.idx].name).join(' & ')} with ${best.ev.name}.`)
      setPot(0)
      setStage('handOver')
      return
    }

    const winner = best.idx
    settlePotTo(winner, `wins with ${best.ev.name}.`)
  }

  function isRoundComplete(nextIdx, newPlayers, newCurrentBet) {
    const alive = newPlayers.filter((p) => !p.folded)
    if (alive.length < 2) return true
    if (pendingAllInRunout) return true

    const acted = actedThisStreet
    if (acted.size >= alive.length) {
      const b0 = newPlayers[0].bet
      const b1 = newPlayers[1].bet
      if (b0 === b1) return true
    }
    return false
  }

  function afterActionAdvance(nextIdx) {
    const pl = players
    if (isRoundComplete(nextIdx, pl, currentBet)) {
      if (stage === 'river') {
        setStage('showdown')
        setTimeout(showdown, 500)
      } else {
        setTimeout(endStreetAdvance, 450)
      }
    } else {
      setCurrent(nextIdx)
    }
  }

  function doAction(playerIdx, action, amount = 0) {
    setPlayers((ps) => {
      const copy = ps.map((p) => ({ ...p }))
      const me = copy[playerIdx]
      const otherIdx = 1 - playerIdx

      if (action === 'fold') {
        me.folded = true
        log(`${me.name} folds.`)
        settlePotTo(otherIdx, 'wins by fold for')
        return copy
      }

      if (action === 'check') {
        log(`${me.name} checks.`)
        const acted = new Set(actedThisStreet)
        acted.add(playerIdx)
        setActedThisStreet(acted)
        return copy
      }

      if (action === 'call') {
        const toCall = Math.max(0, currentBet - me.bet)
        const pay = Math.min(me.chips, toCall)
        me.chips -= pay
        me.bet += pay
        if (me.chips === 0) me.allIn = true
        setPot((pt) => pt + pay)
        log(`${me.name} calls ${pay}.`)
        const acted = new Set(actedThisStreet)
        acted.add(playerIdx)
        setActedThisStreet(acted)
        return copy
      }

      if (action === 'bet' || action === 'raise') {
        // Simple sizing: at least (toCall + BB), at most your stack
        const toCall = Math.max(0, currentBet - me.bet)
        const want = Math.max(amount, toCall + BIG_BLIND)
        const pay = Math.min(me.chips, want)
        me.chips -= pay
        me.bet += pay
        if (me.chips === 0) me.allIn = true
        setPot((pt) => pt + pay)
        setCurrentBet(me.bet)
        setRaiseAvailable(false) // one raise per street
        setActedThisStreet(new Set([playerIdx])) // others must respond
        log(`${me.name} ${action === 'bet' ? 'bets' : 'raises to'} ${me.bet}.`)
        return copy
      }

      return copy
    })
  }

  // Derived convenience
  const me = players[0]
  const villain = players[1]
  const toCall = Math.max(0, currentBet - (players[current]?.bet || 0))
  const myTurn = current === 0 && !['init', 'handOver', 'showdown'].includes(stage)

  function onHuman(action) {
    if (!myTurn) return
    if (action === 'fold') { doAction(0, 'fold'); return }
    if (action === 'check') { doAction(0, 'check'); afterActionAdvance(1); return }
    if (action === 'call') { doAction(0, 'call'); afterActionAdvance(1); return }
    if (action === 'raise') { doAction(0, toCall === 0 ? 'bet' : 'raise', Math.floor(raiseAmount)); setTimeout(() => setCurrent(1), 200); return }
  }

  // AI turn
  useEffect(() => {
    const aiTurn = current === 1 && !['init', 'handOver', 'showdown'].includes(stage)
    if (!aiTurn) return

    const p = players[1]
    const h = players[0]
    const need = Math.max(0, currentBet - p.bet)

    // if either is all-in, prep quick runout
    const alive = activePlayers()
    if (alive.length === 2 && (players[0].allIn || players[1].allIn)) setPendingAllInRunout(true)

    const timeout = setTimeout(() => {
      if (p.folded) return
      if (p.allIn) {
        // already all-in: just advance
        const acted = new Set(actedThisStreet)
        acted.add(1)
        setActedThisStreet(acted)
        afterActionAdvance(0)
        return
      }
      const decision = aiChooseAction({
        stage,
        ai: p,
        human: h,
        toCall: need,
        pot,
        community,
        raiseAvailable,
        bigBlind: BIG_BLIND,
      })
      if (!decision) return
      if (decision.type === 'fold') { doAction(1, 'fold'); return }
      if (decision.type === 'check') { doAction(1, 'check'); afterActionAdvance(0); return }
      if (decision.type === 'call') { doAction(1, 'call'); afterActionAdvance(0); return }
      if (decision.type === 'bet' || decision.type === 'raise') { doAction(1, decision.type, decision.amount || 0); setTimeout(() => setCurrent(0), 250); return }
    }, ACTION_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [current, stage, players, community, currentBet, raiseAvailable, actedThisStreet, pot])

  // Auto-run remaining streets if someone is all-in
  useEffect(() => {
    if (pendingAllInRunout && stage !== 'handOver') {
      const alive = activePlayers()
      if (alive.length === 2) {
        const seq = async () => {
          if (stage === 'preflop') { await new Promise((r) => setTimeout(r, 400)); dealFlop(); setStage('flop') }
          if (stage === 'flop')   { await new Promise((r) => setTimeout(r, 400)); dealTurn(); setStage('turn') }
          if (stage === 'turn')   { await new Promise((r) => setTimeout(r, 400)); dealRiver(); setStage('river') }
          await new Promise((r) => setTimeout(r, 500))
          showdown()
          setPendingAllInRunout(false)
        }
        seq()
      }
    }
  }, [pendingAllInRunout, stage])

  // Kick off first hand on mount
  useEffect(() => { if (stage === 'init') dealNewHand() }, [stage])

  // Controls: availability & slider bounds
  const canCheck = myTurn && toCall === 0
  const canCall = myTurn && toCall > 0 && me.chips > 0
  const canRaise = myTurn && me.chips > 0 && (raiseAvailable || toCall === 0)

  const sliderMin = toCall === 0 ? BIG_BLIND * 2 : currentBet + BIG_BLIND
  const sliderMax = me.chips + (toCall || 0)
  useEffect(() => {
    const fallback = Math.min(sliderMax, Math.max(sliderMin, BIG_BLIND * 2))
    setRaiseAmount(fallback)
  }, [sliderMin, sliderMax])

  const gameOver = me.chips <= 0 || villain.chips <= 0

  const youShowCards = stage === 'showdown' || me.folded === false
  const dealerShowCards = stage === 'showdown' || villain.folded

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-950 to-black p-4 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Texas Hold&apos;em — Heads Up</h1>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <span>Blinds</span>
            <span className="rounded-lg bg-white/10 px-2 py-0.5">{SMALL_BLIND}/{BIG_BLIND}</span>
          </div>
        </header>

        {/* Table */}
        <div className="relative rounded-3xl border border-emerald-700/40 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.35),rgba(0,0,0,0.8))] p-6 shadow-2xl">
          {/* Pot */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="mb-1 text-xs uppercase text-white/70">Pot</div>
            <div className="text-xl font-bold">${pot}</div>
          </div>

          {/* Dealer (AI) */}
          <div className="mb-6 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="rounded-full bg-white/10 px-2 py-0.5">{villain.name}</span>
                {dealerBtn === 1 && <span className="rounded-full bg-yellow-500/90 px-2 py-0.5 text-xs font-bold text-black">D</span>}
              </div>
              <div className="flex gap-2">
                {villain.hand.map((c, i) => (
                  <PlayingCard key={i} card={c} faceUp={dealerShowCards} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <ChipStack amount={villain.chips} />
                {villain.bet > 0 && <span className="rounded-lg bg-white/10 px-2 py-0.5">Bet: ${villain.bet}</span>}
                {villain.allIn && <span className="rounded-lg bg-rose-600/80 px-2 py-0.5">ALL-IN</span>}
              </div>
            </div>
          </div>

          {/* Community cards */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {community.length === 0 && <div className="text-sm text-white/50">(Waiting for flop...)</div>}
            {community.map((c, i) => (
              <PlayingCard key={i} card={c} faceUp={true} />
            ))}
          </div>

          {/* Human (You) */}
          <div className="mt-2 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="rounded-full bg-white/10 px-2 py-0.5">{me.name}</span>
                {dealerBtn === 0 && <span className="rounded-full bg-yellow-500/90 px-2 py-0.5 text-xs font-bold text-black">D</span>}
              </div>
              <div className="flex gap-2">
                {me.hand.map((c, i) => (
                  <PlayingCard key={i} card={c} faceUp={youShowCards} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <ChipStack amount={me.chips} />
                {me.bet > 0 && <span className="rounded-lg bg-white/10 px-2 py-0.5">Bet: ${me.bet}</span>}
                {me.allIn && <span className="rounded-lg bg-rose-600/80 px-2 py-0.5">ALL-IN</span>}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 rounded-2xl bg-black/30 p-4">
            {gameOver ? (
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">
                  {me.chips <= 0 ? 'You busted. Dealer wins.' : 'You win! Dealer busted.'}
                </div>
                <ActionButton onClick={() => window.location.reload()}>
                  Restart
                </ActionButton>
              </div>
            ) : stage === 'handOver' ? (
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80">Hand complete.</div>
                <ActionButton onClick={dealNewHand}>Next Hand</ActionButton>
              </div>
            ) : stage === 'showdown' ? (
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80">Showdown…</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
                {/* Left: status */}
                <div className="text-sm opacity-90">
                  <div className="mb-1">Stage: <span className="font-semibold">{stage.toUpperCase()}</span></div>
                  <div>To {toCall === 0 ? 'act' : 'call'}: <span className="font-semibold">${toCall}</span></div>
                  <div>Turn: <span className="font-semibold">{current === 0 ? 'You' : 'Dealer'}</span></div>
                </div>

                {/* Middle: action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton disabled={!myTurn} onClick={() => onHuman('fold')}>Fold</ActionButton>
                  {toCall === 0 ? (
                    <ActionButton disabled={!canCheck} onClick={() => onHuman('check')}>Check</ActionButton>
                  ) : (
                    <ActionButton disabled={!canCall} onClick={() => onHuman('call')}>Call ${toCall}</ActionButton>
                  )}
                  <ActionButton disabled={!canRaise} onClick={() => onHuman('raise')}>
                    {toCall === 0 ? `Bet $${raiseAmount}` : `Raise to $${raiseAmount}`}
                  </ActionButton>
                </div>

                {/* Right: bet slider */}
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <input
                    type="range"
                    min={Math.max(1, sliderMin)}
                    max={Math.max(Math.max(1, sliderMin), sliderMax)}
                    step={1}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Number(e.target.value))}
                    className="w-full"
                    disabled={!canRaise}
                  />
                  <div className="min-w-[90px] text-right">${raiseAmount}</div>
                </div>
              </div>
            )}
          </div>

          {/* Log and Tips */}
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-white/60">Table Log</div>
              <div className="space-y-1 text-sm">
                {messages.length === 0 && <div className="text-white/50">—</div>}
                {messages.map((m, i) => (
                  <div key={i} className="text-white/80">• {m}</div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-white/60">Tips</div>
              <ul className="list-disc pl-5 text-sm text-white/80">
                <li>One raise per street keeps the pace brisk for heads-up play.</li>
                <li>Go all-in by dragging the slider to your max and clicking Raise.</li>
                <li>Cards flip at showdown; your cards are always face-up to you.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-white/60">Built with React + Tailwind + Framer Motion. Vite project.</div>
      </div>
    </div>
  )
}

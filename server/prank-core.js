// "Prank a friend" (weprize.net/spamfun/prank): pure helpers, no I/O. Tests: scripts/prank-core.test.mjs
// Flow: sender (verified email) picks a prank + friend's number -> friend gets an opt-in SMS -> only a YES
// reply places ONE short call. One ask per friend number, ever. STOP / no reply = nothing, number suppressed.

// Canadian area codes (867 = territories, excluded: ~11x the per-minute cost).
export const CA_NPA = new Set(('204 226 236 249 250 257 263 289 306 343 354 365 367 368 382 387 403 416 418 428 431 437 438 450 460 468 474 506 514 519 548 579 581 584 587 600 604 613 639 647 672 683 705 709 742 753 778 780 782 807 819 825 873 879 902 905').split(' '))
export function caMobile(e164) {
  const m = /^\+1([2-9]\d{2})[2-9]\d{6}$/.exec(String(e164 || ''))
  return !!m && CA_NPA.has(m[1])
}

const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
/** "+14165550123" -> "four one six, five five five, zero one two three" */
export function speakNumber(e164) {
  const d = String(e164 || '').replace(/\D/g, '').slice(-10)
  const w = (s) => [...s].map((c) => WORD[+c]).join(' ')
  return [w(d.slice(0, 3)), w(d.slice(3, 6)), w(d.slice(6))].join(', ')
}

export const OPT_IN_SMS = 'A friend wants to send you a harmless 60-second joke call from WePrize. The call may be recorded and shared with the friend who sent it. Reply YES to get it, or ignore this. Reply STOP and we will never text or call you.'
export const YES_REPLY = 'Great! Your joke call is coming in a few seconds.'

// Shared lines (every prank).
export const LINES = {
  ai: 'Ha, guilty, I\'m automated.',
  stop: 'So sorry to bother you. It was just a friend\'s joke. Bye!',
  revealTail: 'If you want to get them back, visit we prize dot net. Have a great day!',
}

export const PRANKS = {
  llama: {
    name: 'Lost Llama',
    opener: (n) => `Hi! This is Dana with Hoof and Hearth Pet Delivery. I'm calling about your llama, Kevin? He's in the van, he's very calm, and he's eaten most of a seat cushion. I just need to confirm your number. Is this ${n}?`,
    didnt: 'Oh no. The form says, quote, Kevin is a gift, he loves jazz. Are you sure? He\'s looking right at me.',
    who: 'It just says, from someone who loves you, and also llamas.',
    play: 'Amazing! Do you have a backyard, or should I leave him with the doorman? He\'s about six feet tall when he\'s excited.',
    silence: 'Kevin just sneezed. That\'s a good sign. It means he likes you.',
    reveal: 'Okay, I have to come clean. There\'s no Kevin. One of your friends sent you a harmless prank from WePrize. No llamas were harmed.',
  },
  pizza: {
    name: '40-foot pizza',
    opener: (n) => `Hi! This is Dana with Big Slice Pizza. Great news, your forty-foot pizza is ready! It's on a flatbed truck, and it's still warm. I just need to confirm your number. Is this ${n}?`,
    didnt: 'Hmm. The order says, extra cheese, and make it the size of a school bus. Are you sure? The driver is very proud of it.',
    who: 'It just says, from someone who thinks you deserve a really, really big pizza.',
    play: 'Wonderful! Will it fit through your door, or should we slide it in through a window? It\'s about forty feet, so, mostly window.',
    silence: 'Sorry, a pigeon just landed on the pepperoni. He seems happy. Anyway!',
    reveal: 'Okay, I have to come clean. There\'s no forty-foot pizza. One of your friends sent you a harmless prank from WePrize. No pizzas were harmed.',
  },
  socks: {
    name: 'Lifetime supply of left socks',
    opener: (n) => `Hi! This is Dana from the Left Sock Society. Congratulations! You've won a lifetime supply of left socks. Just the left ones. I just need to confirm your number. Is this ${n}?`,
    didnt: 'Oh, you don\'t have to enter. The socks find you. The form says, quote, they deserve only left socks. Are you sure you want to say no?',
    who: 'It just says, from someone who knows exactly where your missing socks went.',
    play: 'Fantastic! Do you want them delivered all at once, or one left sock a day for the rest of your life?',
    silence: 'Sorry, there\'s a lot of socks in here. It\'s very quiet and very cozy.',
    reveal: 'Okay, I have to come clean. There are no left socks. One of your friends sent you a harmless prank from WePrize. No socks were harmed.',
  },
}

/** What the friend said -> stop | ai | who | didnt | play | silence. Order matters: stop wins. */
export function classify(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ') + ' '
  if (!t.trim()) return 'silence'
  if (/\b(stop|hang up|go away|leave me alone|don'?t call|do not call|stop calling|f+u+c+k\w*|shit|piss off|harass\w*|police|cops|not funny|scared|upset|angry|i'?m busy|bugger off|screw you|take me off)\b/.test(t)) return 'stop'
  if (/\b(robot|bot|a ?i|artificial|automated|machine|computer|recording|recorded|real person|are you (a )?(real|human|person)|human)\b/.test(t)) return 'ai'
  if (/\b(who (sent|is this|are you|is calling|ordered|did)|who'?s (this|calling)|from who|from whom|who put you)\b/.test(t)) return 'who'
  if (/\b(no|nope|didn'?t|did not|wrong|don'?t (have|own|want|know)|not mine|never|what llama|what pizza|what socks|what are you talking|huh|what)\b/.test(t)) return 'didnt'
  if (/\b(yes|yeah|yep|yup|sure|ok|okay|great|cool|love|bring|backyard|doorman|awesome|perfect|that'?s me|correct|right|window|door|amazing|send)\b/.test(t)) return 'play'
  return 'silence'
}

export const ORDER = ['play', 'who', 'didnt', 'silence']
export const MAX_TURNS = 3, REVEAL_AFTER_SEC = 35, CALL_TIME_LIMIT_SEC = 75

/** Next move after the friend's turn `n` (1-based), given what they said, used lines, and seconds since answer. */
export function nextMove({ said, used = [], n = 1, elapsedSec = 0 }) {
  const k = classify(said)
  if (k === 'stop') return { kind: 'stop' }
  if (k === 'ai') return { kind: 'reveal', ai: true }
  if (n >= MAX_TURNS || elapsedSec >= REVEAL_AFTER_SEC) return { kind: 'reveal' }
  const pick = !used.includes(k) ? k : ORDER.find((x) => !used.includes(x))
  if (!pick) return { kind: 'reveal' }
  return { kind: 'line', line: pick }
}

// ---- cost (USD) ----
export const PRANK_RATES = { outPerMin: 0.014, smsSeg: 0.0083, speechPerGather: 0.02, recPerMin: 0.0025, ttsPerCall: 0.004 }
export const smsSegments = (s) => Math.ceil(String(s).length / (/[^\x00-\x7f]/.test(s) ? 67 : 153)) || 1
export function prankCallUsd(sec, gathers = MAX_TURNS) {
  const m = Math.max(1, Math.ceil((sec || 0) / 60))
  return Math.round((m * PRANK_RATES.outPerMin + m * PRANK_RATES.recPerMin + gathers * PRANK_RATES.speechPerGather + PRANK_RATES.ttsPerCall) * 1e5) / 1e5
}
export const PRANK_ASK_USD = smsSegments(OPT_IN_SMS) * PRANK_RATES.smsSeg
export const PRANK_WORST_USD = PRANK_ASK_USD + 2 * PRANK_RATES.smsSeg + prankCallUsd(CALL_TIME_LIMIT_SEC + 15)
// Same formula the Twilio screener gate uses for inbound screened calls.
export const screenedCallUsd = (sec) => Math.ceil(Math.max(sec, 1) / 60) * 0.0085 + (sec / 60) * 0.09

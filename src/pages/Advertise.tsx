import { BirchAdSlot } from '../components/BirchAdSlot'

const slots = [
  'home_hero_strip',
  'feed_right_rail',
  'feed_between_cards',
  'detail_mid',
  'pricing_footer',
  'exclusives_footer',
] as const

export function Advertise() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-navy-950">Advertise on WePrize</h1>
      <p className="text-slate-600 text-sm leading-relaxed">
        WePrize is Birch Reserve display inventory. High-intent Canada contester traffic. Tasteful branded placements, not junk banner hell. We do not sell user PII. Contest Bot keeps the board honest so inventory stays trustworthy.
      </p>
      <a
        href="https://birchreserve.net"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-flex px-5 py-2.5 text-sm"
      >
        Advertise here · birchreserve.net
      </a>
      <section>
        <h2 className="font-semibold text-navy-950 mb-3">Slot map (draft shells)</h2>
        <div className="space-y-3">
          {slots.map((id) => (
            <BirchAdSlot key={id} slotId={id} />
          ))}
        </div>
      </section>
    </div>
  )
}

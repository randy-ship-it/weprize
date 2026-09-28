/**
 * DIY sticker PDF sheets — QR → https://weprize.net/r/{code}
 * Layouts: 6 large / 15 medium / 30 small on US Letter.
 * Optional co-brand: WePrize + partner logo side by side.
 */
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { JINGLES, shareUrlFor } from './constants.js'

const LAYOUTS = {
  large: { cols: 2, rows: 3, label: '6× large' },
  medium: { cols: 3, rows: 5, label: '15× medium' },
  small: { cols: 5, rows: 6, label: '30× small' },
}

export function listLayouts() {
  return Object.entries(LAYOUTS).map(([id, v]) => ({ id, ...v }))
}

async function fetchLogoBuffer(logoUrl) {
  if (!logoUrl) return null
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(logoUrl, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('image') && !ct.includes('octet-stream')) return null
    const ab = await res.arrayBuffer()
    if (ab.byteLength > 1_500_000) return null
    return Buffer.from(ab)
  } catch {
    return null
  }
}

export async function buildStickerPdf(code, layoutId = 'medium', opts = {}) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.medium
  const url = shareUrlFor(code)
  const qrPng = await QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B1F3A', light: '#FFFFFF' },
  })
  const partnerLogo = await fetchLogoBuffer(opts.logoUrl)
  const brandName = opts.brandName || null
  const jingle = JINGLES[Math.abs(hash(code)) % JINGLES.length]

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width
    const pageH = doc.page.height
    const margin = 36
    const gap = 10
    const usableW = pageW - margin * 2
    const usableH = pageH - margin * 2 - 28
    const cellW = (usableW - gap * (layout.cols - 1)) / layout.cols
    const cellH = (usableH - gap * (layout.rows - 1)) / layout.rows

    doc.fillColor('#0B1F3A').fontSize(11).font('Helvetica-Bold')
    const header = brandName
      ? `WePrize × ${brandName} · ${jingle}`
      : `WePrize · ${jingle}`
    doc.text(header, margin, 18, { width: usableW, align: 'left' })
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
    doc.text(`Code ${code} · ${url}`, margin, 32, { width: usableW })

    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const x = margin + c * (cellW + gap)
        const y = margin + 28 + r * (cellH + gap)
        doc.save()
        doc.roundedRect(x, y, cellW, cellH, 6).strokeColor('#cbd5e1').lineWidth(0.8).stroke()

        const pad = 5
        const brandH = partnerLogo ? 16 : 12
        const footerH = 16
        const qrMax = Math.min(cellW - pad * 2, cellH - pad * 2 - brandH - footerH)
        const qrX = x + (cellW - qrMax) / 2
        const qrY = y + pad + brandH

        // Co-brand strip: WePrize + optional partner logo
        doc.fillColor('#0d9488').font('Helvetica-Bold').fontSize(Math.min(8, cellW / 9))
        if (partnerLogo) {
          const logoH = 12
          const logoW = Math.min(28, cellW * 0.28)
          try {
            doc.image(partnerLogo, x + pad, y + 3, { height: logoH, width: logoW, fit: [logoW, logoH] })
          } catch {
            /* ignore bad image */
          }
          doc.text('WePrize', x + pad + logoW + 4, y + 4, {
            width: cellW - pad * 2 - logoW - 4,
            align: 'left',
          })
        } else {
          doc.text('WePrize', x + pad, y + 4, { width: cellW - pad * 2, align: 'center' })
        }

        doc.image(qrPng, qrX, qrY, { width: qrMax, height: qrMax })

        doc.fillColor('#0B1F3A').font('Helvetica').fontSize(Math.min(7, cellW / 10))
        doc.text(code, x + pad, y + cellH - footerH, {
          width: cellW - pad * 2,
          align: 'center',
        })
        doc.fillColor('#64748b').fontSize(Math.min(5.5, cellW / 12))
        doc.text(jingle, x + pad, y + cellH - footerH + 8, {
          width: cellW - pad * 2,
          align: 'center',
          lineBreak: false,
          ellipsis: true,
        })
        doc.restore()
      }
    }

    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('Print on sticky paper · Cut boxes · Scan → weprize.net  ·  // BIRCH_RESERVE_AD_HOOK', margin, pageH - 28, {
        width: usableW,
        align: 'center',
      })

    doc.end()
  })
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

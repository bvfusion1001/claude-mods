export type FullItem = { isDone: boolean; text: string }
export type FullPhase = { title: string; items: FullItem[]; doneWhen?: string }
export type FullPlan = { title: string; intro: string; phases: FullPhase[]; parking: string[] }
export type ViewMeta = { name: string; path: string; updated: string }

const PARKING = /^parking lot$/i

// unlike the pane's parser, keeps whole items, done-when lines and the Parking Lot
export function parseFull(md: string): FullPlan {
  const plan: FullPlan = { title: '', intro: '', phases: [], parking: [] }
  let phase: FullPhase | undefined
  let inParking = false
  let last: { text: string } | undefined
  let introDone = false
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()
    const h1 = /^#\s+(.+)$/.exec(line)
    const h = /^#{2,3}\s+(.+)$/.exec(line)
    if (h1 && !plan.title) { plan.title = (h1[1] ?? '').trim(); continue }
    if (h) {
      introDone = true
      last = undefined
      const title = (h[1] ?? '').trim()
      inParking = PARKING.test(title)
      phase = inParking ? undefined : { title, items: [] }
      if (phase) plan.phases.push(phase)
      continue
    }
    const item = /^\s*- \[( |x|X)\]\s+(.+)$/.exec(line)
    if (item && phase) {
      last = { text: (item[2] ?? '').trim() }
      phase.items.push({ isDone: item[1] !== ' ', text: last.text })
      continue
    }
    const bullet = /^- (.+)$/.exec(line)
    if (bullet && inParking) {
      plan.parking.push((bullet[1] ?? '').trim())
      continue
    }
    if (inParking && plan.parking.length && /^\s{2,}\S/.test(raw)) {
      plan.parking[plan.parking.length - 1] += ` ${line.trim()}`
      continue
    }
    const done = /^\*\*Done when:\*\*\s*(.+)$/.exec(line)
    if (done && phase) { phase.doneWhen = (done[1] ?? '').trim(); last = undefined; continue }
    // an indented line continues the item above it
    if (last && phase && /^\s{2,}\S/.test(raw)) {
      const items = phase.items
      const it = items[items.length - 1]
      if (it) it.text = `${it.text} ${line.trim()}`
      continue
    }
    if (!line.trim()) { last = undefined; if (plan.intro) introDone = true; continue }
    // the first paragraph under the title, all its lines
    if (plan.title && !introDone) plan.intro = plan.intro ? `${plan.intro} ${line.trim()}` : line.trim()
  }
  plan.phases = plan.phases.filter((p) => p.items.length)
  return plan
}

export function addToParkingLot(md: string, text: string): string {
  const lines = md.replace(/\n+$/, '').split('\n')
  const at = lines.findIndex((l) => /^#{2,3}\s+parking lot\s*$/i.test(l.trim()))
  if (at < 0) return `${lines.join('\n')}\n\n## Parking Lot\n\n- ${text}\n`
  let end = lines.length
  for (let i = at + 1; i < lines.length; i++) if (/^#{1,3}\s/.test(lines[i] ?? '')) { end = i; break }
  let insert = at + 1
  for (let i = at + 1; i < end; i++) if ((lines[i] ?? '').trim()) insert = i + 1
  if (insert === at + 1) lines.splice(insert, 0, '', `- ${text}`)
  else lines.splice(insert, 0, `- ${text}`)
  return `${lines.join('\n')}\n`
}

// beside a _local plan; a committed plan's view goes to docs/_local so it never gets committed
export function fullViewPath(plan: string, root: string): string {
  return /\/_local\//.test(plan) ? plan.replace(/[^/]+$/, 'full-view.html') : `${root}/docs/_local/full-view.html`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label: string, href: string) =>
      /^\s*javascript:/i.test(href) ? all : `<a href="${href}" target="_blank" rel="noopener">${label}</a>`)
}

export function fullViewHtml(plan: FullPlan, meta: ViewMeta): string {
  const items = plan.phases.flatMap((p) => p.items)
  const done = items.filter((i) => i.isDone).length
  const total = items.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const at = Math.max(0, plan.phases.findIndex((p) => p.items.some((i) => !i.isDone)))
  const current = plan.phases.findIndex((p) => p.items.some((i) => !i.isDone)) < 0 ? -1 : at
  const ring = 2 * Math.PI * 26

  const phases = plan.phases.map((p, i) => {
    const pDone = p.items.filter((x) => x.isDone).length
    const state = current < 0 || i < current ? 'done' : i === current ? 'now' : 'later'
    const active = state === 'now' ? p.items.findIndex((x) => !x.isDone) : -1
    const rows = p.items.map((it, j) => {
      const cls = it.isDone ? 'item done' : j === active ? 'item active' : 'item'
      const mark = it.isDone ? '✓' : j === active ? '▶' : '○'
      return `<li class="${cls}" data-i="${j}"><span class="mark">${mark}</span><span>${inline(it.text)}</span></li>`
    }).join('')
    const when = p.doneWhen ? `<p class="when"><b>Done when:</b> ${inline(p.doneWhen)}</p>` : ''
    return `<details class="phase ${state}" data-k="${esc(p.title)}"${state === 'now' ? ' open' : ''}>`
      + `<summary><span class="ptitle">${inline(p.title)}</span><span class="count">${pDone}/${p.items.length}</span>`
      + `<span class="bar"><i style="width:${p.items.length ? (pDone / p.items.length) * 100 : 0}%"></i></span></summary>`
      + `<ul>${rows}</ul>${when}</details>`
  }).join('')

  const parking = plan.parking.length
    ? `<section class="parking"><h2>Parking Lot</h2><ul>${plan.parking.map((p) => `<li>${inline(p)}</li>`).join('')}</ul></section>`
    : ''

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(plan.title || meta.name)}</title>
<style>
:root{--bg:#f7f6f3;--card:#fff;--ink:#1c1c1a;--dim:#76746c;--line:#e4e1da;--chip:#efede7;--accent:#0e7490;--now:#0891b2;--active:#b45309;--activebg:#fef3c7;--green:#16a34a}
@media (prefers-color-scheme:dark){:root{--bg:#121211;--card:#1c1c1a;--ink:#ecebe6;--dim:#9b998f;--line:#302f2b;--chip:#272623;--accent:#22d3ee;--now:#22d3ee;--active:#fbbf24;--activebg:#3a2e0b;--green:#22c55e}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif}
main{max-width:520px;margin:0 auto;padding:16px 14px 48px}
header{display:flex;gap:14px;align-items:center;margin-bottom:6px}
header h1{font-size:17px;line-height:1.3;margin:0}
.meta{color:var(--dim);font-size:12px;word-break:break-all}
.intro{color:var(--dim);margin:6px 0 14px}
.ring{flex:none}
.ring text{fill:var(--ink);font:600 13px -apple-system,system-ui,sans-serif}
.phase{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:8px 0}
.phase summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:9px 12px}
.phase summary::-webkit-details-marker{display:none}
.ptitle{font-weight:600}
.count{color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums}
.bar{grid-column:1/-1;height:4px;border-radius:2px;background:var(--chip);overflow:hidden}
.bar i{display:block;height:100%;background:var(--green);border-radius:2px}
.phase.done{opacity:.6}
.phase.done .ptitle::before{content:"✓ ";color:var(--green)}
.phase.now{border:1.5px solid var(--now);box-shadow:0 1px 0 var(--line)}
.phase.now .ptitle{color:var(--now)}
.phase ul{list-style:none;margin:0;padding:0 12px 8px}
.item{display:grid;grid-template-columns:18px 1fr;gap:4px;padding:5px 6px;border-radius:6px}
.item .mark{color:var(--dim)}
.item.done{color:var(--dim)}
.item.done .mark{color:var(--green)}
.item.active{background:var(--activebg);font-weight:600}
.item.active .mark{color:var(--active)}
.when{margin:0 12px 10px;padding-top:8px;border-top:1px dashed var(--line);color:var(--dim);font-size:13px}
.parking{margin-top:20px}
.parking h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--dim);margin:0 0 6px}
.parking ul{margin:0;padding-left:18px;color:var(--dim)}
.parking li{margin:4px 0}
a{color:var(--accent)}
code{font:12px ui-monospace,Menlo,monospace;background:var(--chip);padding:1px 4px;border-radius:4px}
footer{color:var(--dim);font-size:11px;margin-top:24px;text-align:center}
</style></head>
<body><main>
<header>
<svg class="ring" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${done} of ${total} done">
<circle cx="32" cy="32" r="26" fill="none" stroke="var(--chip)" stroke-width="7"/>
<circle cx="32" cy="32" r="26" fill="none" stroke="var(--green)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${((pct / 100) * ring).toFixed(1)} ${ring.toFixed(1)}" transform="rotate(-90 32 32)"/>
<text x="32" y="37" text-anchor="middle">${pct}%</text></svg>
<div><h1>${inline(plan.title || meta.name)}</h1><div class="meta">${done} of ${total} done · ${esc(meta.path)}</div></div>
</header>
${plan.intro ? `<p class="intro">${inline(plan.intro)}</p>` : ''}
${phases}
${parking}
<footer>Updated ${esc(meta.updated)} · refreshes itself while the pane is open</footer>
</main>
<script>
// the pane rewrites this file when the plan changes; reload, keeping scroll and open phases
(function(){
  var K='fv:'+location.pathname;
  try{var s=JSON.parse(sessionStorage.getItem(K)||'null');if(s){scrollTo(0,s.y);document.querySelectorAll('details.phase').forEach(function(d){if(s.open.indexOf(d.dataset.k)>=0)d.open=true;else if(!d.classList.contains('now'))d.open=false;});}}catch(e){}
  setInterval(function(){try{sessionStorage.setItem(K,JSON.stringify({y:scrollY,open:[].map.call(document.querySelectorAll('details.phase[open]'),function(d){return d.dataset.k;})}));}catch(e){}location.reload();},4000);
})();
</script>
</body></html>
`
}

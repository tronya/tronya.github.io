import { PROJECTS } from './projects.js';

const KIND = { game: 'Game', project: 'Project' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card(p) {
  return `<article class="card">
    <span class="kind">${KIND[p.kind] || p.kind} · ${p.year}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.blurb)}</p>
    <div class="tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="actions">
      <a href="${p.url}">${p.kind === 'game' ? 'Play →' : p.url.includes('github.com') ? 'View on GitHub →' : 'Open →'}</a>
      ${p.repo ? `<a href="${p.repo}">Code</a>` : ''}
    </div>
  </article>`;
}

// Fills every [data-projects] element; data-kind narrows it to one kind.
for (const el of document.querySelectorAll('[data-projects]')) {
  const kind = el.dataset.kind;
  const list = PROJECTS.filter((p) => !kind || p.kind === kind);
  el.innerHTML = list.length ? list.map(card).join('') : '<p>Nothing here yet.</p>';
}

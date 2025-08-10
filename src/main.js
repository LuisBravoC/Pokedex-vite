import './styles/style.css';
import { apiGet, clearCache } from './js/api';
import { showRaw, renderPokemon } from './js/pokemon';

const el = id => document.getElementById(id);

// resources list (common ones + many endpoints left from original)
const resources = [
  'pokemon', 'ability', 'type', 'move', 'item', 'egg-group', 'pokemon-species',
  'evolution-chain', 'location', 'location-area', 'machine', 'characteristic',
  'stat', 'language', 'generation', 'version', 'version-group', 'item-attribute',
  'item-category', 'pokemon-habitat', 'pal-park-area'
];

el('resource-select').innerHTML = resources.map(r => `<option value="${r}">${r}</option>`).join('');

let allPokemon = [];
let acIndex = -1;

async function loadAllPokemon() {
  // try localStorage first
  try {
    const cached = localStorage.getItem('pokedex_all_pokemon_v1');
    if (cached) {
      allPokemon = JSON.parse(cached);
      return;
    }
  } catch (e) { }
  
  const data = await apiGet('pokemon?limit=2000');
  allPokemon = (data.results || []).map(r => ({ name: r.name, url: r.url }));
  try {
    localStorage.setItem('pokedex_all_pokemon_v1', JSON.stringify(allPokemon));
  } catch (e) { }
}

async function loadPokemon(identifier) {
  try {
    const slug = String(identifier).toLowerCase().trim();
    const data = await apiGet(`pokemon/${slug}`);
    await renderPokemon(data);
  } catch (e) {
    alert('Error al cargar Pokémon: ' + e.message);
  }
}

// Generic resource fetcher
async function fetchResource(resource, id) {
  try {
    const path = id ? `${resource}/${id}` : resource;
    const data = await apiGet(path);
    showRaw(data);
    if (resource === 'pokemon') renderPokemon(data);
    else if (resource === 'pokemon-species') {
      if (data.evolution_chain) {
        const c = await apiGet(data.evolution_chain.url);
        renderEvolutionChain(c);
      }
      el('species-card').innerHTML = `<pre style="max-height:320px;overflow:auto">${JSON.stringify(data, null, 2)}</pre>`;
    } else {
      el('species-card').innerHTML = `<pre style="max-height:320px;overflow:auto">${JSON.stringify(data, null, 2)}</pre>`;
    }
  } catch (e) {
    alert('Fetch failed: ' + e.message);
  }
}

// Listing with pagination
async function listResource(resource, url) {
  try {
    const path = url || `pokemon?limit=20&offset=0`;
    const data = await apiGet(path);
    showRaw(data);
    const results = data.results || [];
    const html = results.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.02)">
        <div>${r.name}</div>
        <div><button class="badge" data-url="${r.url}">Abrir</button></div>
      </div>
    `).join('');
    
    el('raw-json').innerHTML = html + `
      <div style="margin-top:8px">
        ${data.previous ? '<button id="prev-btn" class="badge">Anterior</button>' : ''}
        ${data.next ? '<button id="next-btn" class="badge">Siguiente</button>' : ''}
      </div>
    `;
    
    el('raw-json').querySelectorAll('button[data-url]').forEach(b =>
      b.addEventListener('click', async e => {
        const d = await apiGet(e.currentTarget.dataset.url);
        showRaw(d);
        if (d.sprites) renderPokemon(d);
      })
    );
    
    if (data.next) {
      el('next-btn').addEventListener('click', () => listResource(resource, data.next));
    }
    if (data.previous) {
      el('prev-btn').addEventListener('click', () => listResource(resource, data.previous));
    }
  } catch (e) {
    alert('List fetch failed: ' + e.message);
  }
}

function showAutocomplete(q) {
  const box = el('autocomplete');
  box.innerHTML = '';
  if (!q) {
    box.style.display = 'none';
    box.setAttribute('aria-hidden', 'true');
    return;
  }
  const v = q.toLowerCase();
  const matches = allPokemon.filter(p => p.name.includes(v)).slice(0, 12);
  if (matches.length === 0) {
    box.style.display = 'none';
    box.setAttribute('aria-hidden', 'true');
    return;
  }
  matches.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'item';
    d.textContent = m.name;
    d.dataset.name = m.name;
    d.addEventListener('click', () => {
      el('search-input').value = m.name;
      box.style.display = 'none';
      loadPokemon(m.name);
    });
    box.appendChild(d);
  });
  box.style.display = 'block';
  box.setAttribute('aria-hidden', 'false');
  acIndex = -1;
}

// Event Listeners
el('search-input').addEventListener('input', e => showAutocomplete(e.target.value));

el('search-input').addEventListener('keydown', e => {
  const box = el('autocomplete');
  if (box.style.display === 'none') return;
  const items = Array.from(box.querySelectorAll('.item'));
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    acIndex = Math.min(items.length - 1, acIndex + 1);
    items.forEach(it => it.classList.remove('active'));
    if (items[acIndex]) items[acIndex].classList.add('active');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    acIndex = Math.max(0, acIndex - 1);
    items.forEach(it => it.classList.remove('active'));
    if (items[acIndex]) items[acIndex].classList.add('active');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (acIndex >= 0 && items[acIndex]) {
      const name = items[acIndex].dataset.name;
      el('search-input').value = name;
      box.style.display = 'none';
      loadPokemon(name);
    } else {
      const v = el('search-input').value.trim();
      if (v) loadPokemon(v);
    }
  } else if (e.key === 'Escape') {
    box.style.display = 'none';
  }
});

// Button event listeners
el('search-btn').addEventListener('click', () => {
  const v = el('search-input').value.trim();
  if (v) loadPokemon(v);
});

el('fetch-btn').addEventListener('click', () => {
  const res = el('resource-select').value;
  const id = el('resource-id').value.trim();
  if (!id) {
    if (confirm('No id proporcionado. ¿Desea obtener la lista raíz? (Use List para paginar)')) {
      fetchResource(res, '');
    }
    return;
  }
  fetchResource(res, id);
});

el('list-btn').addEventListener('click', () => listResource(el('resource-select').value));

el('random-pokemon').addEventListener('click', () => {
  const rand = Math.floor(Math.random() * 1118) + 1;
  loadPokemon(rand);
});

el('first-151').addEventListener('click', () => listResource('pokemon', 'pokemon?limit=151&offset=0'));

el('raw-fetch').addEventListener('click', () => {
  const path = el('raw-path').value.trim();
  if (!path) return alert('Ingrese una ruta');
  apiGet(path).then(d => showRaw(d)).catch(e => alert('Fetch failed: ' + e.message));
});

el('raw-json-toggle').addEventListener('click', () => {
  const pre = el('raw-json');
  pre.style.whiteSpace = pre.style.whiteSpace === 'pre' ? 'normal' : 'pre';
});

// clear cache hotkey (ctrl+shift+c)
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
    clearCache();
    alert('Cache cleared');
  }
});

// Initial load
loadAllPokemon();
loadPokemon(1);

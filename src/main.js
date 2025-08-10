import './styles/style.css';
import PokemonController from './components/pokemon/PokemonController';
import PokemonView from './components/pokemon/PokemonView';
import PokeAPIService from './services/pokeapi';

// Función auxiliar para seleccionar elementos del DOM
const el = id => document.getElementById(id);

// Lista de recursos disponibles en la API
const resources = [
  'pokemon', 'ability', 'type', 'move', 'item', 'egg-group', 'pokemon-species',
  'evolution-chain', 'location', 'location-area', 'machine', 'characteristic',
  'stat', 'language', 'generation', 'version', 'version-group', 'item-attribute',
  'item-category', 'pokemon-habitat', 'pal-park-area'
];

// Inicializar la aplicación
let app;

// Configurar los event listeners para la exploración de recursos
function setupResourceExplorer() {
    el('resource-select').innerHTML = resources.map(r => `<option value="${r}">${r}</option>`).join('');

    el('fetch-btn')?.addEventListener('click', async () => {
        const resource = el('resource-select').value;
        const id = el('resource-id').value.trim();
        try {
            const path = id ? `${resource}/${id}` : resource;
            const data = await PokeAPIService.get(path);
            showRaw(data);

            if (resource === 'pokemon') {
                app.loadPokemon(id);
            } else if (resource === 'pokemon-species' && data.evolution_chain) {
                const chain = await PokeAPIService.get(data.evolution_chain.url);
                showEvolutionChain(chain);
            }
        } catch (e) {
            alert('Error al obtener el recurso: ' + e.message);
        }
    });

    el('list-btn')?.addEventListener('click', async () => {
        const resource = el('resource-select').value;
        try {
            const data = await PokeAPIService.get(`${resource}?limit=20&offset=0`);
            showListing(data, resource);
        } catch (e) {
            alert('Error al listar recursos: ' + e.message);
        }
    });

    el('first-151')?.addEventListener('click', async () => {
        try {
            const data = await PokeAPIService.get('pokemon?limit=151&offset=0');
            showListing(data, 'pokemon');
        } catch (e) {
            alert('Error al listar Pokémon: ' + e.message);
        }
    });
}

// Función para mostrar listado con paginación
function showListing(data, resource) {
    const results = data.results || [];
    const html = results.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.02)">
            <div>${r.name}</div>
            <div><button class="badge" data-url="${r.url}">Abrir</button></div>
        </div>
    `).join('');

    const paginationHtml = `
        <div style="margin-top:8px">
            ${data.previous ? '<button id="prev-btn" class="badge">Anterior</button>' : ''}
            ${data.next ? '<button id="next-btn" class="badge">Siguiente</button>' : ''}
        </div>
    `;

    const rawJson = el('raw-json');
    if (rawJson) {
        rawJson.innerHTML = html + paginationHtml;

        // Configurar event listeners para los botones
        rawJson.querySelectorAll('button[data-url]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const resourceData = await PokeAPIService.get(btn.dataset.url);
                    showRaw(resourceData);
                    if (resourceData.sprites) {
                        app.loadPokemon(resourceData.id);
                    }
                } catch (e) {
                    console.error('Error loading resource:', e);
                }
            });
        });

        if (data.next) {
            el('next-btn')?.addEventListener('click', async () => {
                try {
                    const nextData = await PokeAPIService.get(data.next);
                    showListing(nextData, resource);
                } catch (e) {
                    console.error('Error loading next page:', e);
                }
            });
        }
        if (data.previous) {
            el('prev-btn')?.addEventListener('click', async () => {
                try {
                    const prevData = await PokeAPIService.get(data.previous);
                    showListing(prevData, resource);
                } catch (e) {
                    console.error('Error loading previous page:', e);
                }
            });
        }
    }
}

// Función para mostrar datos en formato JSON
function showRaw(data) {
    const rawJson = el('raw-json');
    if (rawJson) {
        rawJson.innerHTML = `<pre class="json">${JSON.stringify(data, null, 2)}</pre>`;
    }
}

// Función para mostrar cadena de evolución
function showEvolutionChain(data) {
    const speciesCard = el('species-card');
    if (speciesCard) {
        speciesCard.innerHTML = `<pre style="max-height:320px;overflow:auto">${JSON.stringify(data, null, 2)}</pre>`;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    const view = new PokemonView(PokeAPIService);
    const controller = new PokemonController(view, PokeAPIService);
    app = controller;
    
    setupResourceExplorer();
    
    // Configurar hotkey para limpiar caché (ctrl+shift+c)
    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
            PokeAPIService.clearCache();
            localStorage.clear();
            alert('Cache limpiado');
        }
    });

    await controller.initialize();
});

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
  const btn = el('raw-json-toggle');
  isJsonView = !isJsonView;
  btn.querySelector('.btn-text').textContent = isJsonView ? 'Ver Estructurado' : 'Ver JSON';
  btn.querySelector('.btn-icon').textContent = isJsonView ? '📋' : '📝';
  
  // Re-mostrar los datos actuales en el nuevo formato
  const currentData = JSON.parse(el('raw-json').querySelector('pre')?.textContent || '{}');
  showRaw(currentData);
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

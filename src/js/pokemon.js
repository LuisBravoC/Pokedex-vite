import { apiGet } from './api';
import { capitalize, collectSprites, setMainSprite } from './utils';

import { formatName, getSpanishName } from './formatter';

let isJsonView = false;

export function showRaw(obj) {
  const rawJson = document.getElementById('raw-json');
  if (isJsonView) {
    rawJson.innerHTML = `<pre style="max-height:400px;overflow:auto">${JSON.stringify(obj, null, 2)}</pre>`;
  } else {
    // Mostrar versión estructurada
    const structuredView = createStructuredView(obj);
    rawJson.innerHTML = structuredView;
  }
}

function createStructuredView(data) {
  let html = '<div class="info-card">';
  
  if (data.id && data.name) {
    html += `
      <div class="info-title">${formatName(data.name)} #${data.id}</div>
      <div class="info-grid">`;
    
    // Mostrar propiedades relevantes
    if (data.height) html += createInfoRow('Altura', `${(data.height / 10).toFixed(1)}m`);
    if (data.weight) html += createInfoRow('Peso', `${(data.weight / 10).toFixed(1)}kg`);
    if (data.base_experience) html += createInfoRow('Exp. Base', data.base_experience);
    if (data.order) html += createInfoRow('Orden', `#${data.order}`);
    
    html += '</div></div>';
  }
  
  return html;
}

function createInfoRow(label, value) {
  return `
    <div class="info-label">${label}</div>
    <div class="info-value">${value}</div>
  `;
}

export async function loadSpecies(url) {
  try {
    const s = await apiGet(url);
    const speciesArea = document.getElementById('species-card');
    const flavor = (s.flavor_text_entries || []).find(ft => ft.language && ft.language.name === 'es') 
      || (s.flavor_text_entries || []).find(ft => ft.language && ft.language.name === 'en') 
      || (s.flavor_text_entries || [])[0];

    let html = `
    <div class="species-info">
      <div class="info-title">Información de Especie</div>
      
      <div class="info-grid">
        ${s.color ? `<div class="info-label">Color</div><div class="info-value">${formatName(s.color.name)}</div>` : ''}
        ${s.habitat ? `<div class="info-label">Hábitat</div><div class="info-value">${formatName(s.habitat.name)}</div>` : ''}
        ${s.shape ? `<div class="info-label">Forma</div><div class="info-value">${formatName(s.shape.name)}</div>` : ''}
        ${s.growth_rate ? `<div class="info-label">Crecimiento</div><div class="info-value">${formatName(s.growth_rate.name)}</div>` : ''}
      </div>

      ${flavor ? `
        <div class="flavor-text">
          ${flavor.flavor_text.replace(/\n|\f/g, ' ')}
        </div>
      ` : ''}`;

    if (s.genera && s.genera.length > 0) {
      const genus = s.genera.find(g => g.language.name === 'es')?.genus || 
                    s.genera.find(g => g.language.name === 'en')?.genus;
      if (genus) {
        html += `
          <div class="info-card">
            <div class="info-value" style="font-style:italic">${genus}</div>
          </div>`;
      }
    }

    html += '</div>';
    speciesArea.innerHTML = html;

    if (s.evolution_chain && s.evolution_chain.url) {
      const chain = await apiGet(s.evolution_chain.url);
      renderEvolutionChain(chain);
    }
  } catch (err) {
    console.warn(err);
  }
}

export async function loadEncounters(pathOrUrl) {
  try {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}/${pathOrUrl.replace(/^\//, '')}`;
    const list = await apiGet(url);
    
    if (!list || list.length === 0) {
      document.getElementById('encounters').innerHTML = `
        <div class="info-card">
          <div class="info-title">Sin encuentros</div>
          <div style="color:var(--muted)">Este Pokémon no se encuentra en estado salvaje.</div>
        </div>`;
      return;
    }

    const encountersHtml = list.map(location => {
      const locationName = formatName(location.location_area.name.replace('-area', ''));
      let html = `<div class="location-card">
        <div class="location-name">${locationName}</div>
        <div class="location-details">`;

      // Agrupar encuentros por método
      const methods = new Map();
      location.version_details.forEach(vd => {
        vd.encounter_details.forEach(ed => {
          const methodName = ed.method.name;
          if (!methods.has(methodName)) {
            methods.set(methodName, {
              levels: new Set(),
              chance: ed.chance,
              conditions: new Set()
            });
          }
          methods.get(methodName).levels.add(ed.min_level === ed.max_level ? 
            ed.min_level : 
            `${ed.min_level}-${ed.max_level}`);
          
          if (ed.condition_values) {
            ed.condition_values.forEach(cv => 
              methods.get(methodName).conditions.add(cv.name));
          }
        });
      });

      // Crear detalles para cada método
      methods.forEach((details, method) => {
        html += `
          <div class="location-detail encounter-method">
            ${formatName(method)}
          </div>
          <div class="location-detail encounter-level">
            Nivel <strong>${Array.from(details.levels).join(', ')}</strong>
          </div>
          <div class="location-detail encounter-chance">
            <strong>${details.chance}%</strong> de encuentro
          </div>`;
        
        if (details.conditions.size > 0) {
          html += `
            <div class="location-detail encounter-condition">
              <strong>${Array.from(details.conditions).map(formatName).join(', ')}</strong>
            </div>`;
        }
      });

      html += '</div></div>';
      return html;
    }).join('');

    document.getElementById('encounters').innerHTML = encountersHtml;
  } catch (e) {
    document.getElementById('encounters').innerHTML = `
      <div class="info-card">
        <div class="info-title">Error</div>
        <div style="color:var(--muted)">No se pudieron cargar los encuentros.</div>
      </div>`;
  }
}

export async function renderPokemon(p) {
  document.getElementById('pokemon-name').textContent = capitalize(p.name);
  document.getElementById('pokemon-id').textContent = `#${p.id}`;

  // types
  const typesEl = document.getElementById('pokemon-badges');
  typesEl.innerHTML = '';
  p.types.forEach(t => {
    const span = document.createElement('div');
    span.className = `type type-${t.type.name}`;
    span.textContent = t.type.name;
    span.title = capitalize(t.type.name);
    span.dataset.url = t.type.url;
    span.addEventListener('click', () => fetchAndShowResource(t.type.url));
    typesEl.appendChild(span);
  });

  document.getElementById('pokemon-basic').innerHTML = `
    <div>Altura: ${p.height} • Peso: ${p.weight} • Exp base: ${p.base_experience}</div>`;

  // sprites
  const sprites = collectSprites(p.sprites);
  const spriteList = document.getElementById('sprite-list');
  spriteList.innerHTML = '';
  Object.entries(sprites).forEach(([k, v]) => {
    const img = document.createElement('img');
    img.src = v;
    img.alt = k;
    img.title = k;
    img.loading = 'lazy';
    img.addEventListener('click', () => setMainSprite(v));
    spriteList.appendChild(img);
  });

  // set main sprite: choose animated or official-artwork or front_default
  const mainUrl = p.sprites.front_default || sprites['official-artwork'] || sprites['dream_world'] || Object.values(sprites)[0] || '';
  setMainSprite(mainUrl);

  // stats & abilities
  const sa = document.getElementById('stats-abilities');
  sa.innerHTML = '';
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats';
  
  // find max for scaling (use 255 typical max)
  const maxStat = 255;
  p.stats.forEach(s => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const name = document.createElement('div');
    name.className = 'stat-name';
    name.textContent = s.stat.name.replace('-', ' ');
    const barWrap = document.createElement('div');
    barWrap.className = 'stat-bar';
    const fill = document.createElement('div');
    fill.className = 'stat-fill';
    
    // choose class depending on stat
    const key = s.stat.name;
    if (key.includes('hp')) fill.classList.add('stat-hp');
    else if (key.includes('attack') && !key.includes('special')) fill.classList.add('stat-attack');
    else if (key.includes('defense') && !key.includes('special')) fill.classList.add('stat-defense');
    else if (key.includes('special-attack') || key === 'special-attack') fill.classList.add('stat-sp-attack');
    else if (key.includes('special-defense') || key === 'special-defense') fill.classList.add('stat-sp-defense');
    else if (key.includes('speed')) fill.classList.add('stat-speed');
    
    const percentage = Math.max(4, Math.round((s.base_stat / maxStat) * 100));
    fill.style.width = percentage + '%';
    fill.textContent = s.base_stat;
    barWrap.style.position = 'relative';
    barWrap.appendChild(fill);
    row.appendChild(name);
    row.appendChild(barWrap);
    statsDiv.appendChild(row);
  });
  sa.appendChild(statsDiv);

  // abilities
  const abDiv = document.createElement('div');
  abDiv.style.marginTop = '10px';
  abDiv.innerHTML = '<div style="font-weight:700;color:var(--accent);margin-bottom:6px">Habilidades</div>';
  const abilitiesDiv = document.createElement('div');
  abilitiesDiv.className = 'moves';
  p.abilities.forEach(a => {
    const b = document.createElement('div');
    b.className = 'move';
    b.style.cursor = 'pointer';
    b.dataset.url = a.ability.url;
    
    // Cargar el nombre en español
    getSpanishName(apiGet, 'ability', a.ability.name).then(spanishName => {
      b.textContent = spanishName + (a.is_hidden ? ' (oculta)' : '');
      b.title = `${formatName(a.ability.name)}${a.is_hidden ? ' (Hidden Ability)' : ''}`;
    });
    
    b.addEventListener('click', async () => {
      const d = await apiGet(a.ability.url);
      showRaw(d);
      document.getElementById('species-card').innerHTML = `
        <div style="font-weight:700;color:var(--accent);margin-bottom:6px">Habilidad: ${d.name}</div>
        <pre style="max-height:200px;overflow:auto">${JSON.stringify(d, null, 2)}</pre>`;
    });
    abilitiesDiv.appendChild(b);
  });
  abDiv.appendChild(abilitiesDiv);
  sa.appendChild(abDiv);

  // moves: show compact badges; clicking fetches move details (and caches)
  const movesEl = document.getElementById('moves');
  movesEl.innerHTML = '';
  // show top 40 moves to avoid spamming UI
  p.moves.slice(0, 40).forEach(m => {
    const mv = document.createElement('div');
    mv.className = 'move';
    mv.dataset.url = m.move.url;
    mv.title = 'Click para ver detalles';
    
    // Cargar el nombre en español
    getSpanishName(apiGet, 'move', m.move.name).then(spanishName => {
      mv.textContent = spanishName;
      mv.title = `${formatName(m.move.name)} - Click para ver detalles`;
    });
    
    mv.addEventListener('click', async () => {
      const d = await apiGet(m.move.url);
      showRaw(d);
      document.getElementById('species-card').innerHTML = `
        <div style="font-weight:700;color:var(--accent);margin-bottom:6px">Movimiento: ${d.name}</div>
        <div>Tipo: ${d.type?.name || '—'}</div>
        <div>Clase de daño: ${d.damage_class?.name || '—'}</div>
        <pre style="max-height:200px;overflow:auto">${JSON.stringify(d, null, 2)}</pre>`;
    });
    movesEl.appendChild(mv);
  });

  // species & evolution handled separately
  loadSpecies(p.species.url);

  // encounters
  loadEncounters(p.location_area_encounters);

  // show raw json by default
  showRaw(p);
}

export function renderEvolutionChain(chain) {
  const elc = document.createElement('div');
  elc.style.marginTop = '8px';
  elc.innerHTML = '<div style="font-weight:700;color:var(--accent);margin-top:8px">Cadena de Evolución</div>';
  const nodes = [];
  function walk(node, depth = 0) {
    nodes.push({ name: node.species.name, depth });
    node.evolves_to.forEach(n => walk(n, depth + 1));
  }
  walk(chain.chain);
  elc.innerHTML += nodes.map(n => `
    <button class="badge" style="margin:6px;" data-poke="${n.name}">${n.name}</button>
  `).join('');
  document.getElementById('species-card').appendChild(elc);
  document.getElementById('species-card').querySelectorAll('button[data-poke]').forEach(b =>
    b.addEventListener('click', e => loadPokemon(e.currentTarget.dataset.poke))
  );
}

const API_BASE = 'https://pokeapi.co/api/v2';
const cache = new Map();

export async function apiGet(path) {
  if (!path) throw new Error('Empty path');
  // Normalize paths to full URL
  const url = path.startsWith('http') ? path : (path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`);
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export function clearCache() {
  cache.clear();
  localStorage.removeItem('pokedex_all_pokemon_v1');
}

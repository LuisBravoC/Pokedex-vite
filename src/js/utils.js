export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

export function collectSprites(sprites) {
  const out = {};
  for (const k in sprites) {
    const v = sprites[k];
    if (typeof v === 'string' && v) out[k] = v;
    else if (v && typeof v === 'object') {
      for (const kk in v) if (typeof v[kk] === 'string' && v[kk]) out[`${k}.${kk}`] = v[kk];
    }
  }
  // official artwork fallback
  if (sprites.other && sprites.other['official-artwork'] && sprites.other['official-artwork'].front_default) {
    out['official-artwork'] = sprites.other['official-artwork'].front_default;
  }
  if (sprites.other && sprites.other['dream_world'] && sprites.other['dream_world'].front_default) {
    out['dream_world'] = sprites.other['dream_world'].front_default;
  }
  return out;
}

export function setMainSprite(url) {
  const container = document.getElementById('main-sprite');
  container.innerHTML = '';
  if (!url) {
    container.textContent = '—';
    return;
  }
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'sprite';
  container.appendChild(img);
}

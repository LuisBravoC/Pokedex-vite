export function formatName(name) {
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Cache para traducciones
const translationCache = new Map();

export async function getSpanishName(apiGet, type, name) {
    const cacheKey = `${type}:${name}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    try {
        const data = await apiGet(`${type}/${name}`);
        const spanishName = data.names?.find(n => n.language.name === 'es')?.name
            || data.effect_entries?.find(e => e.language.name === 'es')?.effect
            || formatName(name);
        
        translationCache.set(cacheKey, spanishName);
        return spanishName;
    } catch (e) {
        console.warn(`No se pudo obtener traducción para ${name}`, e);
        return formatName(name);
    }
}

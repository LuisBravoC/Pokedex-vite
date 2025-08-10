/**
 * Formatea un nombre para mostrar
 * @param {string} name - El nombre a formatear
 * @returns {string} El nombre formateado
 */
export function formatName(name) {
    if (!name) return '';
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Formatea un ID de Pokémon
 * @param {number} id - El ID a formatear
 * @returns {string} El ID formateado
 */
export function formatId(id) {
    return String(id).padStart(3, '0');
}

/**
 * Formatea medidas (altura/peso) de Pokémon
 * @param {number} value - El valor a formatear
 * @returns {string} El valor formateado
 */
export function formatMeasurement(value) {
    return (value / 10).toFixed(1);
}

/**
 * Cache para traducciones
 */
const translationCache = new Map();

/**
 * Obtiene el nombre en español de un recurso
 * @param {Function} apiGet - Función para hacer peticiones a la API
 * @param {string} type - Tipo de recurso (move, ability, etc)
 * @param {string} name - Nombre del recurso
 * @returns {Promise<string>} Nombre en español o nombre formateado
 */
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

/**
 * Formatea un método de encuentro
 * @param {string} method - Método de encuentro
 * @returns {string} Método formateado en español
 */
export function formatEncounterMethod(method) {
    const methods = {
        'walk': 'Caminando',
        'surf': 'Surfeando',
        'fishing': 'Pescando',
        'headbutt': 'Cabezazo',
        'rock-smash': 'Rompe Rocas',
        'gift': 'Regalo',
        'gift-egg': 'Huevo Regalo',
        'level-up': 'Nivel',
        'trade': 'Intercambio',
        'use-item': 'Usar Objeto',
        'shed': 'Mudar',
        'egg': 'Huevo'
    };
    return methods[method] || formatName(method);
}

/**
 * Limpia texto eliminando caracteres especiales
 * @param {string} text - Texto a limpiar
 * @returns {string} Texto limpio
 */
export function cleanText(text) {
    if (!text) return '';
    return text.replace(/[\n\f\r]/g, ' ').trim();
}

/**
 * Formatea estadísticas para mostrar en la UI
 * @param {Object} stats - Objeto con estadísticas
 * @returns {Object} Objeto con etiquetas en español
 */
export function formatStats(stats) {
    const labels = {
        'hp': 'PS',
        'attack': 'Ataque',
        'defense': 'Defensa',
        'special-attack': 'Ataque Esp.',
        'special-defense': 'Defensa Esp.',
        'speed': 'Velocidad'
    };
    
    return Object.entries(stats).reduce((acc, [key, value]) => {
        acc[labels[key] || formatName(key)] = value;
        return acc;
    }, {});
}

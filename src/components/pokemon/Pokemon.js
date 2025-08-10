import { formatName, formatMeasurement } from '../../utils/formatter';

/**
 * Clase que representa un Pokémon y sus datos
 */
class Pokemon {
    constructor(data) {
        if (!data || !data.id) {
            throw new Error('Invalid Pokemon data');
        }
        
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.types = data.types || [];
        this.stats = data.stats || [];
        this.abilities = data.abilities || [];
        this.moves = data.moves || [];
        this.sprites = data.sprites || {};
        this.height = data.height || 0;
        this.weight = data.weight || 0;
        this.base_experience = data.base_experience;
        this.species = data.species;
    }

    /**
     * Obtiene la URL para la información de especies
     * @returns {string|null} URL de la especie o null si no está disponible
     */
    getSpeciesUrl() {
        return this.species?.url || null;
    }

    /**
     * Obtiene la URL para la información de encuentros
     * @returns {string} URL de los encuentros
     */
    getEncountersUrl() {
        return `https://pokeapi.co/api/v2/pokemon/${this.id}/encounters`;
    }

    /**
     * Obtiene una vista estructurada de los datos del Pokémon
     * @returns {Object} Vista estructurada con datos formateados
     */
    getStructuredView() {
        return {
            id: this.id,
            name: this.name,
            number: String(this.id).padStart(3, '0'),
            types: this.types.map(t => ({
                name: t.type.name,
                url: t.type.url
            })),
            sprites: {
                main: this.getMainSprite(),
                default: this.sprites.front_default,
                shiny: this.sprites.front_shiny,
                artwork: this.sprites.other?.['official-artwork']?.front_default,
                dream_world: this.sprites.other?.dream_world?.front_default
            },
            stats: this.stats.reduce((acc, stat) => {
                acc[stat.stat.name] = {
                    base: stat.base_stat,
                    effort: stat.effort,
                    name: stat.stat.name
                };
                return acc;
            }, {}),
            height: this.height / 10, // convertir a metros
            weight: this.weight / 10, // convertir a kilogramos
            abilities: this.abilities.map(a => ({
                name: a.ability.name,
                url: a.ability.url,
                is_hidden: a.is_hidden,
                slot: a.slot
            })),
            moves: this.moves.map(m => ({
                name: m.move.name,
                url: m.move.url,
                learn_methods: m.version_group_details.map(vg => ({
                    method: vg.move_learn_method.name,
                    version: vg.version_group.name,
                    level: vg.level_learned_at
                }))
            })),
            base_experience: this.base_experience,
            species_url: this.getSpeciesUrl(),
            encounters_url: this.getEncountersUrl()
        };
    }

    /**
     * Obtiene la URL del sprite principal
     */
    getMainSprite() {
        return this.data.sprites.other['official-artwork']?.front_default || 
               this.data.sprites.other['dream_world']?.front_default ||
               this.data.sprites.front_default;
    }

    /**
     * Recopila todos los sprites disponibles
     */
    getAllSprites() {
        const sprites = {};
        for (const [key, value] of Object.entries(this.data.sprites)) {
            if (typeof value === 'string' && value) {
                sprites[key] = value;
            } else if (value && typeof value === 'object') {
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (typeof subValue === 'string' && subValue) {
                        sprites[`${key}.${subKey}`] = subValue;
                    }
                }
            }
        }
        return sprites;
    }

    /**
     * Obtiene las estadísticas formateadas
     */
    getStats() {
        return this.stats.map(s => ({
            name: s.stat.name,
            value: s.base_stat,
            max: 255 // Valor máximo posible para stats de Pokémon
        }));
    }

    /**
     * Formatea el ID del Pokémon
     */
    getFormattedId() {
        return `#${String(this.id).padStart(3, '0')}`;
    }

    /**
     * Obtiene el nombre formateado
     */
    getFormattedName() {
        return formatName(this.name);
    }

    /**
     * Obtiene la información básica formateada
     */
    getBasicInfo() {
        const height = formatMeasurement(this.height);
        const weight = formatMeasurement(this.weight);
        return `${height}m, ${weight}kg`;
    }
}

export default Pokemon;

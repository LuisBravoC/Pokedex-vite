import { formatName, formatMeasurement, formatEncounterMethod, cleanText } from '../../utils/formatter';
import Pokemon from './Pokemon';

/**
 * Clase responsable de la visualización de un Pokémon
 */
class PokemonView {
    constructor(service) {
        this.service = service;
        this.setupElements();
    }

    /**
     * Inicializa las referencias a elementos del DOM
     */
    setupElements() {
        this.elements = {
            name: document.getElementById('pokemon-name'),
            id: document.getElementById('pokemon-id'),
            mainSprite: document.getElementById('main-sprite'),
            types: document.getElementById('pokemon-badges'),
            basicInfo: document.getElementById('pokemon-basic'),
            spriteList: document.getElementById('sprite-list'),
            stats: document.getElementById('stats-abilities'),
            moves: document.getElementById('moves'),
            speciesCard: document.getElementById('species-card'),
            encounters: document.getElementById('encounters'),
            rawJson: document.getElementById('raw-json')
        };
    }

    /**
     * Actualiza la vista con los datos de un Pokémon
     */
    updateView(pokemon) {
        if (!pokemon) return;
        this.currentPokemon = pokemon;
        console.log('Updating view with pokemon:', pokemon);

        // Información básica
        this.elements.name.textContent = pokemon.getFormattedName();
        this.elements.id.textContent = pokemon.getFormattedId();
        this.elements.mainSprite.innerHTML = `
            <img src="${pokemon.getMainSprite()}" alt="${pokemon.getFormattedName()}" />
        `;
        
        // Se implementarán los demás métodos de renderizado
        this.renderTypes(pokemon);
        this.renderBasicInfo(pokemon);
        this.renderSprites(pokemon);
        this.renderStats(pokemon);
        this.renderMoves(pokemon);

        // Cargar datos adicionales
        this.loadSpecies(pokemon);
        this.loadEncounters(pokemon);

        // Mostrar vista estructurada por defecto
        this.showRaw(pokemon);
    }

    /**
     * Muestra los datos en formato JSON o estructurado (idéntico al original)
     */
    showRaw(pokemon) {
        if (!this.elements.rawJson || !pokemon) return;
        this.elements.rawJson.innerHTML = this.createStructuredView(pokemon);
    }

    /**
     * Crea una vista estructurada de los datos (idéntica al original)
     */
    createStructuredView(pokemon) {
        let html = '<div class="info-card">';
        if (pokemon.id && pokemon.name) {
            html += `
                <div class="info-title">${formatName(pokemon.name)} #${pokemon.id}</div>
                <div class="info-grid">`;
            if (pokemon.height) html += this.createInfoRow('Altura', `${(pokemon.height / 10).toFixed(1)}m`);
            if (pokemon.weight) html += this.createInfoRow('Peso', `${(pokemon.weight / 10).toFixed(1)}kg`);
            if (pokemon.base_experience) html += this.createInfoRow('Exp. Base', pokemon.base_experience);
            if (pokemon.order) html += this.createInfoRow('Orden', `#${pokemon.order}`);
            html += '</div></div>';
        }
        return html;
    }

    createInfoRow(label, value) {
        return `
            <div class="info-label">${label}</div>
            <div class="info-value">${value}</div>
        `;
    }

    /**
     * Carga y muestra la información de especies
     */
    async loadSpecies(pokemon) {
        const url = pokemon.getSpeciesUrl();
        if (!url || !this.elements.speciesCard) return;

        try {
            const species = await this.service.get(url);
            // Buscar primero texto en español, luego en inglés como respaldo
            const flavor = species.flavor_text_entries?.find(ft => ft.language.name === 'es') || 
                         species.flavor_text_entries?.find(ft => ft.language.name === 'en') ||
                         species.flavor_text_entries?.[0];

            let html = `
            <div class="species-info">
                <div class="info-title">Información de Especie</div>
                
                <div class="info-grid">
                    ${species.color ? `<div class="info-label">Color</div><div class="info-value">${formatName(species.color.name)}</div>` : ''}
                    ${species.habitat ? `<div class="info-label">Hábitat</div><div class="info-value">${formatName(species.habitat.name)}</div>` : ''}
                    ${species.shape ? `<div class="info-label">Forma</div><div class="info-value">${formatName(species.shape.name)}</div>` : ''}
                    ${species.growth_rate ? `<div class="info-label">Crecimiento</div><div class="info-value">${formatName(species.growth_rate.name)}</div>` : ''}
                </div>

                ${flavor ? `
                    <div class="flavor-text">
                        ${flavor.flavor_text.replace(/\n|\f/g, ' ')}
                    </div>
                ` : ''}`;

            if (species.genera && species.genera.length > 0) {
                const genus = species.genera.find(g => g.language.name === 'es')?.genus || 
                            species.genera.find(g => g.language.name === 'en')?.genus;
                if (genus) {
                    html += `
                        <div class="info-card">
                            <div class="info-value" style="font-style:italic">${genus}</div>
                        </div>`;
                }
            }

            html += '</div>';
            this.elements.speciesCard.innerHTML = html;

            // Cargar cadena evolutiva si está disponible
            if (species.evolution_chain?.url) {
                const chain = await this.service.get(species.evolution_chain.url);
                this.renderEvolutionChain(chain);
            }
        } catch (err) {
            console.warn('Error loading species:', err);
            if (this.elements.speciesCard) {
                this.elements.speciesCard.innerHTML = `
                    <div class="info-card">
                        <div class="info-title">Error</div>
                        <div class="info-value">No se pudo cargar la información de especie</div>
                    </div>`;
            }
        }
    }

    /**
     * Carga y muestra la información de encuentros
     */
    async loadEncounters(pokemon) {
        const url = pokemon.getEncountersUrl();
        if (!url || !this.elements.encounters) return;

        try {
            const encounters = await this.service.get(url);
            
            if (!encounters || encounters.length === 0) {
                this.elements.encounters.innerHTML = `
                    <div class="info-card">
                        <div class="info-title">Sin encuentros</div>
                        <div class="info-value">Este Pokémon no se encuentra en estado salvaje.</div>
                    </div>`;
                return;
            }

            const locationCards = await Promise.all(encounters.map(async e => {
                try {
                    const locationName = await this.getLocationName(e.location_area.url);

                    // Agrupar encuentros por método
                    const methods = new Map();
                    e.version_details.forEach(vd => {
                        vd.encounter_details.forEach(ed => {
                            const methodName = ed.method.name;
                            if (!methods.has(methodName)) {
                                methods.set(methodName, {
                                    levels: new Set(),
                                    chances: new Set(),
                                    conditions: new Set()
                                });
                            }
                            const info = methods.get(methodName);
                            info.levels.add(ed.min_level === ed.max_level ? 
                                ed.min_level : 
                                `${ed.min_level}-${ed.max_level}`);
                            info.chances.add(ed.chance);
                            if (ed.condition_values) {
                                ed.condition_values.forEach(cv => 
                                    info.conditions.add(cv.name));
                            }
                        });
                    });

                    return `
                        <div class="location-card">
                            <div class="location-name">${locationName}</div>
                            <div class="location-details">
                                ${Array.from(methods.entries()).map(([method, info]) => `
                                    <div class="location-detail encounter-method">
                                        ${formatEncounterMethod(method)}
                                    </div>
                                    <div class="location-detail encounter-level">
                                        Nv. <strong>${Array.from(info.levels).join(', ')}</strong>
                                    </div>
                                    <div class="location-detail encounter-chance">
                                        <strong>${Array.from(info.chances).reduce((a, b) => a + b, 0)}%</strong> prob.
                                    </div>
                                    ${info.conditions.size > 0 ? `
                                        <div class="location-detail encounter-condition">
                                            <strong>${Array.from(info.conditions).map(formatName).join(', ')}</strong>
                                        </div>
                                    ` : ''}
                                `).join('')}
                            </div>
                        </div>
                    `;
                } catch (err) {
                    console.warn('Error processing location:', err);
                    return `
                        <div class="location-card">
                            <div class="location-name">Error al cargar ubicación</div>
                        </div>
                    `;
                }
            }));

            this.elements.encounters.innerHTML = locationCards.join('');
        } catch (err) {
            console.warn('Error loading encounters:', err);
            this.elements.encounters.innerHTML = `
                <div class="info-card">
                    <div class="info-value">Error al cargar encuentros</div>
                </div>`;
        }
    }

    /**
     * Obtiene el nombre de una ubicación
     */
    async getLocationName(url) {
        try {
            const location = await this.service.get(url);
            return location.names?.find(n => n.language.name === 'es')?.name || 
                   formatName(location.name);
        } catch (err) {
            console.warn('Error getting location name:', err);
            return 'Ubicación desconocida';
        }
    }

    /**
     * Renderiza la cadena evolutiva
     */
    renderEvolutionChain(chain) {
        if (!this.elements.speciesCard) return;

        const elc = document.createElement('div');
        elc.style.marginTop = '8px';
        elc.innerHTML = '<div style="font-weight:700;color:var(--accent);margin-top:8px">Cadena de Evolución</div>';
        
        const nodes = [];
        function walk(node, depth = 0) {
            nodes.push({ 
                name: node.species.name, 
                url: node.species.url,
                depth 
            });
            node.evolves_to.forEach(n => walk(n, depth + 1));
        }
        walk(chain.chain);
        
        elc.innerHTML += nodes.map(n => `
            <button class="badge" style="margin:6px" data-url="${n.url}">
                ${formatName(n.name)}
            </button>
        `).join('');

        this.elements.speciesCard.appendChild(elc);

        // Agregar event listeners a los botones
        elc.querySelectorAll('button[data-url]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const speciesData = await this.service.get(btn.dataset.url);
                    if (speciesData.varieties && speciesData.varieties[0]?.pokemon) {
                        const pokemonData = await this.service.get(speciesData.varieties[0].pokemon.url);
                        const pokemon = new Pokemon(pokemonData);
                        this.updateView(pokemon);
                    }
                } catch (error) {
                    console.error('Error loading evolution:', error);
                }
            });
        });
    }

    /**
     * Renderiza los tipos del Pokémon
     */
    renderTypes(pokemon) {
        if (!this.elements.types) return;
        
        const typeElements = pokemon.types.map(t => `
            <button class="badge type-${t.type.name}" data-url="${t.type.url}">
                ${formatName(t.type.name)}
            </button>
        `);
        
        this.elements.types.innerHTML = typeElements.join('');
    }

    /**
     * Renderiza la información básica
     */
    renderBasicInfo(pokemon) {
        if (!this.elements.basicInfo) return;
        this.elements.basicInfo.textContent = pokemon.getBasicInfo();
    }

    /**
     * Renderiza la lista de sprites
     */
    renderSprites(pokemon) {
        if (!this.elements.spriteList) return;
        
        const sprites = pokemon.getAllSprites();
        this.elements.spriteList.innerHTML = `
            <div class="thumbs">
                ${Object.entries(sprites).map(([key, url]) => `
                    <img src="${url}" 
                         alt="${key}" 
                         title="${key}"
                         loading="lazy"
                         data-sprite="${key}" />
                `).join('')}
            </div>
        `;

        // Agregar event listeners para los sprites
        this.elements.spriteList.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', () => {
                const mainImage = this.elements.mainSprite.querySelector('img');
                if (mainImage) {
                    mainImage.src = img.src;
                }
            });
        });
    }

    /**
     * Renderiza las estadísticas
     */
    renderStats(pokemon) {
        if (!this.elements.stats) return;

        const getStatClass = (statName) => {
            const classes = {
                'hp': 'stat-hp',
                'attack': 'stat-attack',
                'defense': 'stat-defense',
                'special-attack': 'stat-sp-attack',
                'special-defense': 'stat-sp-defense',
                'speed': 'stat-speed'
            };
            return classes[statName] || '';
        };

        const stats = pokemon.getStats().map(stat => `
            <div class="stat-row">
                <div class="stat-name">${formatName(stat.name)}</div>
                <div class="stat-bar">
                    <div class="stat-fill ${getStatClass(stat.name)}" 
                         style="width:${Math.min(100, (stat.value / stat.max) * 100)}%">
                        ${stat.value}
                    </div>
                </div>
            </div>
        `).join('');

        const abilities = pokemon.abilities.map(a => `
            <button class="badge" 
                    data-url="${a.ability.url}" 
                    title="${a.is_hidden ? 'Habilidad oculta' : ''}">
                ${formatName(a.ability.name)}${a.is_hidden ? ' (H)' : ''}
            </button>
        `).join('');

        this.elements.stats.innerHTML = `
            <div class="abilities">${abilities}</div>
            <div class="stats">${stats}</div>
        `;
    }

    /**
     * Renderiza los movimientos
     */
    renderMoves(pokemon) {
        if (!this.elements.moves) return;
        
        const moveElements = pokemon.moves.slice(0, 12).map(m => `
            <div class="move" data-url="${m.move.url}">
                ${formatName(m.move.name)}
            </div>
        `).join('');

        this.elements.moves.innerHTML = `<div class="moves">${moveElements}</div>`;
    }
}

export default PokemonView;

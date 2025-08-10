import Pokemon from './Pokemon';

/**
 * Controlador principal de la aplicación Pokédex
 */
class PokemonController {
    constructor(view, service) {
        this.view = view;
        this.service = service;
        this.state = {
            currentPokemon: null,
            allPokemon: [],
            searchResults: [],
            acIndex: -1
        };
    }

    /**
     * Inicializa el controlador
     */
    async initialize() {
        await this.loadAllPokemon();
        this.setupEventListeners();
        await this.loadPokemon(1); // Cargar el primer Pokémon por defecto
    }

    /**
     * Carga la lista completa de Pokémon
     */
    async loadAllPokemon() {
        try {
            // Intentar cargar desde caché local
            const cached = localStorage.getItem('pokedex_all_pokemon_v1');
            if (cached) {
                this.state.allPokemon = JSON.parse(cached);
                return;
            }

            // Si no hay caché, cargar desde la API
            const data = await this.service.get('pokemon?limit=2000');
            if (data && data.results) {
                this.state.allPokemon = data.results.map(p => ({
                    name: p.name,
                    url: p.url
                }));

                // Guardar en caché local
                try {
                    localStorage.setItem('pokedex_all_pokemon_v1', 
                        JSON.stringify(this.state.allPokemon)
                    );
                } catch (e) {
                    console.warn('Could not save to localStorage:', e);
                }
            }
        } catch (error) {
            console.error('Error loading all pokemon:', error);
        }
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-btn');
        const autocomplete = document.getElementById('autocomplete');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const value = searchInput?.value.trim();
                if (value) this.loadPokemon(value);
            });
        }

        // Botón aleatorio
        const randomButton = document.getElementById('random-pokemon');
        if (randomButton) {
            randomButton.addEventListener('click', () => {
                const randomId = Math.floor(Math.random() * 898) + 1;
                this.loadPokemon(randomId);
            });
        }

        // Click en elementos con data-url
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-url]');
            if (target) {
                try {
                    const data = await this.service.get(target.dataset.url);
                    const rawJson = document.getElementById('raw-json');
                    if (rawJson) {
                        rawJson.innerHTML = `<pre class="json">${JSON.stringify(data, null, 2)}</pre>`;
                    }
                } catch (error) {
                    console.error('Error fetching details:', error);
                }
            }
        });
    }

    /**
     * Carga un Pokémon específico
     */
    async loadPokemon(identifier) {
        if (!identifier) {
            console.error('Invalid identifier provided');
            return;
        }

        try {
            console.log('Loading pokemon:', identifier);
            const normalized = identifier.toString().toLowerCase().trim();
            const data = await this.service.get(`pokemon/${normalized}`);
            
            console.log('Pokemon data received:', data);
            if (!data || !data.id) {
                throw new Error('Invalid data received from API');
            }

            this.state.currentPokemon = new Pokemon(data);
            this.view.updateView(this.state.currentPokemon);
            
            // Mostrar datos en el panel de detalles
            const rawJson = document.getElementById('raw-json');
            if (rawJson) {
                rawJson.innerHTML = `<pre class="json">${JSON.stringify(data, null, 2)}</pre>`;
            }
        } catch (error) {
            console.error('Error loading pokemon:', error);
            alert('No se pudo cargar el Pokémon. Verifica el nombre o ID.');
        }
    }

    /**
     * Maneja la búsqueda y autocompletado
     */
    handleSearch(query) {
        const box = document.getElementById('autocomplete');
        if (!box) return;

        if (!query) {
            box.style.display = 'none';
            box.setAttribute('aria-hidden', 'true');
            return;
        }

        const matches = this.state.allPokemon
            .filter(p => p.name.includes(query.toLowerCase()))
            .slice(0, 12);

        if (matches.length === 0) {
            box.style.display = 'none';
            box.setAttribute('aria-hidden', 'true');
            return;
        }

        box.innerHTML = matches.map((p, i) => `
            <div class="item" data-name="${p.name}">
                ${p.name}
            </div>
        `).join('');

        box.style.display = 'block';
        box.setAttribute('aria-hidden', 'false');
        this.state.acIndex = -1;

        // Agregar event listeners a los items
        box.querySelectorAll('.item').forEach(item => {
            item.addEventListener('click', () => {
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = item.dataset.name;
                box.style.display = 'none';
                this.loadPokemon(item.dataset.name);
            });
        });
    }

    /**
     * Maneja las teclas en el campo de búsqueda
     */
    handleSearchKeydown(e) {
        const box = document.getElementById('autocomplete');
        if (!box || box.style.display === 'none') return;

        const items = Array.from(box.querySelectorAll('.item'));
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.state.acIndex = Math.min(items.length - 1, this.state.acIndex + 1);
                this.updateAutocompleteSelection(items);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.state.acIndex = Math.max(0, this.state.acIndex - 1);
                this.updateAutocompleteSelection(items);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.state.acIndex >= 0 && items[this.state.acIndex]) {
                    const name = items[this.state.acIndex].dataset.name;
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.value = name;
                    box.style.display = 'none';
                    this.loadPokemon(name);
                } else {
                    const searchInput = document.getElementById('search-input');
                    const value = searchInput?.value.trim();
                    if (value) this.loadPokemon(value);
                }
                break;

            case 'Escape':
                box.style.display = 'none';
                break;
        }
    }

    /**
     * Actualiza la selección visual en el autocompletado
     */
    updateAutocompleteSelection(items) {
        items.forEach(it => it.classList.remove('active'));
        if (items[this.state.acIndex]) {
            items[this.state.acIndex].classList.add('active');
        }
    }
}

export default PokemonController;

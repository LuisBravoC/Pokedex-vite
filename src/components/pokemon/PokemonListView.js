import PokeAPIService from '../../services/pokeapi';
import { formatName } from '../../utils/formatter';

export default class PokemonListView {
    constructor(container, onSelect) {
        this.container = container;
        this.onSelect = onSelect;
        this.currentPage = 0;
        this.limit = 20;
        this.total = 0;
        this.data = [];
    }

    async loadPage(page = 0) {
        this.currentPage = page;
        const offset = page * this.limit;
        const data = await PokeAPIService.get(`pokemon?limit=${this.limit}&offset=${offset}`);
        this.total = data.count;
        this.data = data.results;
        await this.render();
    }

    async render() {
        if (!this.container) return;
        const pokemonDetails = await Promise.all(
            this.data.map(async (p) => {
                const pokeData = await PokeAPIService.get(p.url);
                return {
                    name: formatName(pokeData.name),
                    id: pokeData.id,
                    sprite: pokeData.sprites?.front_default,
                    types: pokeData.types.map(t => formatName(t.type.name)).join(', '),
                    exp: pokeData.base_experience,
                };
            })
        );
        this.container.innerHTML = `
            <div class="pokemon-list">
                ${pokemonDetails.map(p => `
                    <div class="pokemon-list-item" data-id="${p.id}">
                        <img src="${p.sprite}" alt="${p.name}" />
                        <div class="poke-list-info">
                            <div><strong>${p.name}</strong> #${p.id}</div>
                            <div>Tipo: ${p.types}</div>
                            <div>Exp: ${p.exp}</div>
                        </div>
                        <button class="poke-list-view-btn" data-id="${p.id}">Ver</button>
                    </div>
                `).join('')}
            </div>
            <div class="pagination">
                <button id="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}>Anterior</button>
                <span>Página ${this.currentPage + 1} de ${Math.ceil(this.total / this.limit)}</span>
                <button id="next-page" ${(this.currentPage + 1) * this.limit >= this.total ? 'disabled' : ''}>Siguiente</button>
            </div>
        `;
        this.container.querySelectorAll('.poke-list-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (this.onSelect) this.onSelect(id);
            });
        });
        this.container.querySelectorAll('.pokemon-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Solo si no se hizo click en el botón
                if (e.target.classList.contains('poke-list-view-btn')) return;
                const id = item.getAttribute('data-id');
                if (this.onSelect) this.onSelect(id);
            });
        });
        this.container.querySelector('#prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 0) this.loadPage(this.currentPage - 1);
        });
        this.container.querySelector('#next-page')?.addEventListener('click', () => {
            if ((this.currentPage + 1) * this.limit < this.total) this.loadPage(this.currentPage + 1);
        });
    }
}

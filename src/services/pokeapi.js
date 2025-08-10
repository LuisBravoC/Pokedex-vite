/**
 * Servicio para interactuar con la PokeAPI
 */
class PokeAPIService {
    static BASE_URL = 'https://pokeapi.co/api/v2';
    static cache = new Map();

    /**
     * Realiza una petición GET a la PokeAPI
     * @param {string} endpoint - El endpoint a consultar
     * @returns {Promise<any>} Los datos de la respuesta
     */
    static async get(endpoint) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.BASE_URL}/${endpoint.replace(/^\//, '')}`;
        
        // Revisar caché primero
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Guardar en caché
            this.cache.set(url, data);
            return data;
        } catch (error) {
            console.error('Error fetching from PokeAPI:', error);
            throw error;
        }
    }

    /**
     * Limpia la caché del servicio
     */
    static clearCache() {
        this.cache.clear();
    }
}

export default PokeAPIService;

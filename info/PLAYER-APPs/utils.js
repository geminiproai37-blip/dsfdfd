import { allGods } from './serverNames.js';

let godNameCounter = 0;

export const getNextServerName = () => {
    const name = allGods[godNameCounter % allGods.length];
    godNameCounter++;
    return name;
};

// --- ANISKIP & MYANIMELIST API LOGIC ---

export const getAbsoluteEpisodeNumber = async () => {
    const contentTypeSelect = document.getElementById('content-type');
    const type = contentTypeSelect.value;
    if (type !== 'tv') {
        return 1; // For movies, episode is always 1
    }

    const id = document.getElementById('tmdb-id').value;
    const seasonNum = parseInt(document.getElementById('tmdb-season').value, 10);
    const episodeNum = parseInt(document.getElementById('tmdb-episode').value, 10);

    if (isNaN(episodeNum)) {
        return null;
    }

    // If no ID, no valid season number, or it's season 1, the relative episode number is the absolute one.
    // This avoids unnecessary API calls.
    if (!id || isNaN(seasonNum) || seasonNum <= 1) {
        return episodeNum;
    }

    const TMDB_API_KEY = 'b619bab44d405bb6c49b14dfc7365b51';

    try {
        // First, get the list of all seasons for the series.
        const seriesResponse = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=es-ES`);
        if (!seriesResponse.ok) {
            console.error("TMDB API Error: Could not fetch series season list. Falling back to relative episode number.");
            return episodeNum;
        }
        const seriesData = await seriesResponse.json();

        if (!seriesData || !Array.isArray(seriesData.seasons)) {
            console.error("TMDB Data Error: Invalid season data. Falling back to relative episode number.");
            return episodeNum;
        }

        // Find all seasons that came before the current one.
        // Exclude "specials" (season 0) and seasons with no episodes.
        const previousSeasons = seriesData.seasons
            .filter(s => s.season_number > 0 && s.season_number < seasonNum && s.episode_count > 0)
            .sort((a, b) => a.season_number - b.season_number);

        if (previousSeasons.length === 0) {
            return episodeNum;
        }

        let totalEpisodesInPreviousSeasons = 0;

        // To get an accurate count, we must fetch details for each previous season.
        // This is slower but more reliable than the 'episode_count' from the main series endpoint.
        for (const season of previousSeasons) {
            try {
                const seasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${season.season_number}?api_key=${TMDB_API_KEY}`);
                if (!seasonResponse.ok) {
                    // If a season detail fetch fails, fall back to the less reliable count.
                    console.warn(`Could not fetch details for season ${season.season_number}. Using overview episode_count as fallback.`);
                    totalEpisodesInPreviousSeasons += season.episode_count || 0;
                    continue;
                }
                const seasonData = await seasonResponse.json();
                if (seasonData && Array.isArray(seasonData.episodes)) {
                    // Count only episodes with a positive episode number, as '0' is often a special.
                    const regularEpisodes = seasonData.episodes.filter(e => e.episode_number > 0);
                    totalEpisodesInPreviousSeasons += regularEpisodes.length;
                } else {
                    totalEpisodesInPreviousSeasons += season.episode_count || 0;
                }
            } catch (seasonError) {
                console.warn(`Error fetching season ${season.season_number} details. Using fallback count.`, seasonError);
                totalEpisodesInPreviousSeasons += season.episode_count || 0;
            }
        }

        return totalEpisodesInPreviousSeasons + episodeNum;

    } catch (error) {
        console.error("An unexpected error occurred while calculating the absolute episode number. Falling back to relative number.", error);
        return episodeNum;
    }
};


export const fetchMALData = async () => {
    const malId = document.getElementById('mal-id').value;
    if (!malId) return;

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        if (!response.ok) {
            throw new Error(`Error fetching MAL data: ${response.statusText}`);
        }
        const data = await response.json();
        updatePreview(data.data);
    } catch (error) {
        console.error("Error fetching MyAnimeList data:", error);
        alert('No se pudo obtener la información de MyAnimeList.');
    }
};

export const updatePreview = (data) => {
    const previewContainer = document.getElementById('preview-view');
    if (!data) {
        previewContainer.innerHTML = '<p>No se encontró información.</p>';
        return;
    }

    const imageUrl = data.images?.jpg?.large_image_url || '';
    const title = data.title || 'Título no disponible';
    const year = data.year || 'Año no disponible';

    let details = '';
    if (data.type === 'TV') {
        const episodes = data.episodes || 'No disponible';
        const season = data.season || 'No disponible';
        const episode = data.episode || 'No disponible';
        details = `
            <p class="text-sm text-gray-400">Episodios Totales: ${episodes}</p>
            <p class="text-sm text-gray-400">Temporada: ${season}</p>
            <p class="text-sm text-gray-400">Episodio: ${episode}</p>
        `;
    }

    previewContainer.innerHTML = `
        <h2 class="text-2xl font-bold mb-5 border-l-4 border-orange-500 pl-4 text-white">Vista Previa</h2>
        <div class="text-center">
            <img src="${imageUrl}" alt="Poster de ${title}" class="mx-auto rounded-lg shadow-lg" style="max-width: 200px;">
            <h3 class="text-xl font-bold mt-4">${title}</h3>
            ${details}
            <p class="text-sm text-gray-400">Año: ${year}</p>
        </div>
    `;
};

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
        return 1;
    }

    const id = document.getElementById('tmdb-id').value;
    const seasonNum = parseInt(document.getElementById('tmdb-season').value, 10);
    const episodeNum = parseInt(document.getElementById('tmdb-episode').value, 10);

    if (isNaN(episodeNum)) {
        return null;
    }
    
    if (!id && !isNaN(episodeNum)) {
        return episodeNum;
    }

    if (!id || isNaN(seasonNum)) {
        return episodeNum;
    }

    const TMDB_API_KEY = 'b619bab44d405bb6c49b14dfc7365b51';
    const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=es-ES`);
    if (!response.ok) {
        console.error("No se pudo obtener la información de las temporadas de TMDB. Usando número de episodio relativo.");
        return episodeNum;
    }
    const seriesData = await response.json();
    
    if (!seriesData || !seriesData.seasons) {
        console.error("No se pudo obtener la información de las temporadas de TMDB. Usando número de episodio relativo.");
        return episodeNum;
    }

    let absoluteEpisode = 0;
    const sortedSeasons = seriesData.seasons.sort((a, b) => a.season_number - b.season_number);

    for (const season of sortedSeasons) {
        if (season.season_number > 0 && season.season_number < seasonNum) {
            absoluteEpisode += season.episode_count;
        }
    }

    absoluteEpisode += episodeNum;
    return absoluteEpisode;
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
    const introStartTime = data.introStartTime ? `${Math.floor(data.introStartTime)}:${Math.floor((data.introStartTime % 1) * 60).toString().padStart(2, '0')}` : 'No disponible';
    const introEndTime = data.introEndTime ? `${Math.floor(data.introEndTime)}:${Math.floor((data.introEndTime % 1) * 60).toString().padStart(2, '0')}` : 'No disponible';
    const endingStartTime = data.endingStartTime ? `${Math.floor(data.endingStartTime)}:${Math.floor((data.endingStartTime % 1) * 60).toString().padStart(2, '0')}` : 'No disponible';
    const endingEndTime = data.endingEndTime ? `${Math.floor(data.endingEndTime)}:${Math.floor((data.endingEndTime % 1) * 60).toString().padStart(2, '0')}` : 'No disponible';

    let details = '';
    if (data.type === 'TV') {
        const episodes = data.episodes || 'No disponible';
        details = `
            <p class="text-sm text-gray-400">Episodios: ${episodes}</p>
            <p class="text-sm text-gray-400">Inicio de Intro: ${introStartTime}</p>
            <p class="text-sm text-gray-400">Fin de Intro: ${introEndTime}</p>
            <p class="text-sm text-gray-400">Inicio de Ending: ${endingStartTime}</p>
            <p class="text-sm text-gray-400">Fin de Ending: ${endingEndTime}</p>
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

import { getAbsoluteEpisodeNumber } from './utils.js';

export const fetchAniskipData = async () => {
    // Referencias a los elementos del DOM
    const malIdInput = document.getElementById('mal-id');
    const episodeLengthInput = document.getElementById('episode-length');
    const fetchButton = document.getElementById('fetch-mal-button');
    const introStartTimeInput = document.getElementById('content-introStartTime');
    const introEndTimeInput = document.getElementById('content-introEndTime');
    const endingStartTimeInput = document.getElementById('content-endingStartTime');

    // Validación del ID de MyAnimeList
    const malId = parseInt(malIdInput.value.trim(), 10);
    if (isNaN(malId) || malId <= 0) {
        alert('Por favor, introduce un ID de MyAnimeList válido (solo números positivos).');
        malIdInput.focus();
        return;
    }

    // Validación de la duración del episodio
    const episodeLength = parseFloat(episodeLengthInput?.value.trim());
    if (isNaN(episodeLength) || episodeLength <= 0) {
        alert('No se pudo obtener la duración del episodio. Asegúrate de haber buscado primero la información del contenido desde TMDB.');
        document.getElementById('fetch-tmdb-button').focus();
        return;
    }

    // Gestionar el estado de carga del botón
    const originalButtonContent = fetchButton.innerHTML;
    fetchButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    fetchButton.disabled = true;

    try {
        // Obtener el número de episodio absoluto
        const absoluteEpisodeNum = await getAbsoluteEpisodeNumber();
        if (isNaN(absoluteEpisodeNum) || absoluteEpisodeNum <= 0) {
            throw new Error("Número de episodio absoluto no válido. Verifica los datos de TMDB.");
        }

        // Construir la URL de la API de Aniskip
        const apiUrl = new URL(`https://api.aniskip.com/v2/skip-times/${malId}/${absoluteEpisodeNum}`);
        apiUrl.searchParams.append('types[]', 'op'); // Opening
        apiUrl.searchParams.append('types[]', 'ed'); // Ending
        apiUrl.searchParams.append('episodeLength', episodeLength);

        // Realizar la petición a la API
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); 
            throw new Error(
                `Error en la API de Aniskip: ${response.status} ${response.statusText}` +
                (errorData.message ? ` - ${errorData.message}` : '')
            );
        }

        const data = await response.json();

        if (!data.found || !Array.isArray(data.results) || data.results.length === 0) {
            throw new Error("No se encontraron datos de skip times para este episodio.");
        }

        // Limpiar valores antes de asignar
        introStartTimeInput.value = '';
        introEndTimeInput.value = '';
        endingStartTimeInput.value = '';

        // Obtener candidatos de opening y ending
        const openingCandidates = data.results.filter(r => r.skipType === 'op' && r.interval);
        const endingCandidates = data.results.filter(r => r.skipType === 'ed' && r.interval);

        // Elegir el opening más largo
        const openingResult = openingCandidates.sort(
            (a, b) => (b.interval.endTime - b.interval.startTime) - (a.interval.endTime - a.interval.startTime)
        )[0];

        // Elegir el ending más largo
        const endingResult = endingCandidates.sort(
            (a, b) => (b.interval.endTime - b.interval.startTime) - (a.interval.endTime - a.interval.startTime)
        )[0];

        if (openingResult && openingResult.interval.endTime <= episodeLength) {
            introStartTimeInput.value = openingResult.interval.startTime;
            introEndTimeInput.value = openingResult.interval.endTime;
        }

        if (endingResult && endingResult.interval.startTime <= episodeLength) {
            endingStartTimeInput.value = endingResult.interval.startTime;
        }

        if (!openingResult && !endingResult) {
            alert("Aniskip encontró resultados para este episodio, pero no contienen tiempos para la intro (op) o el final (ed).");
        }

    } catch (error) {
        console.error('Error al obtener datos de Aniskip:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Restaurar el estado del botón
        fetchButton.innerHTML = originalButtonContent;
        fetchButton.disabled = false;
    }
};

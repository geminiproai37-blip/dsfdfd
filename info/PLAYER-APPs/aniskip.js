import { getAbsoluteEpisodeNumber } from './utils.js';

export const fetchAniskipData = async () => {
    // Referencias a elementos del DOM
    const elements = {
        malIdInput: document.getElementById('mal-id'),
        episodeLengthInput: document.getElementById('episode-length'),
        fetchButton: document.getElementById('fetch-mal-button'),
        introStartTimeMinutesInput: document.getElementById('content-introStartTime-minutes'),
        introStartTimeSecondsInput: document.getElementById('content-introStartTime-seconds'),
        introEndTimeMinutesInput: document.getElementById('content-introEndTime-minutes'),
        introEndTimeSecondsInput: document.getElementById('content-introEndTime-seconds'),
        endingStartTimeMinutesInput: document.getElementById('content-endingStartTime-minutes'),
        endingStartTimeSecondsInput: document.getElementById('content-endingStartTime-seconds'),
        tmdbFetchButton: document.getElementById('fetch-tmdb-button')
    };

    // Validaciones iniciales
    const malId = parseInt(elements.malIdInput.value.trim(), 10);
    if (isNaN(malId) || malId <= 0) {
        showError('Por favor, introduce un ID de MyAnimeList válido (solo números positivos).');
        elements.malIdInput.focus();
        return;
    }

    const episodeLength = parseFloat(elements.episodeLengthInput?.value.trim());
    if (isNaN(episodeLength) || episodeLength <= 0) {
        showError('No se pudo obtener la duración del episodio. Asegúrate de haber buscado primero la información del contenido desde TMDB.');
        elements.tmdbFetchButton.focus();
        return;
    }

    // Configuración de estado de carga
    const originalButtonContent = elements.fetchButton.innerHTML;
    setLoadingState(elements.fetchButton, true);

    try {
        // Obtener número de episodio absoluto
        const absoluteEpisodeNum = await getAbsoluteEpisodeNumber();
        if (isNaN(absoluteEpisodeNum) || absoluteEpisodeNum <= 0) {
            throw new Error("Número de episodio absoluto no válido. Verifica los datos de TMDB.");
        }

        // Construir y ejecutar petición a Aniskip
        const apiUrl = buildAniskipApiUrl(malId, absoluteEpisodeNum, episodeLength);
        const data = await fetchAniskipDataFromApi(apiUrl);

        // Procesar resultados
        processAniskipResults(data, elements, episodeLength);

    } catch (error) {
        console.error('Error en Aniskip:', error);
        showError(`Error: ${error.message}`);
    } finally {
        setLoadingState(elements.fetchButton, false, originalButtonContent);
    }
};

// Funciones auxiliares
function showError(message) {
    alert(message);
}

function assignMinutesAndSeconds(minutesInput, secondsInput, totalSeconds) {
    if (minutesInput && secondsInput) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.round(totalSeconds % 60);
        minutesInput.value = minutes;
        secondsInput.value = seconds;
    }
}

function setLoadingState(button, isLoading, originalContent = null) {
    button.innerHTML = isLoading
        ? `<i class="fas fa-spinner fa-spin"></i>`
        : originalContent;
    button.disabled = isLoading;
}

function buildAniskipApiUrl(malId, episodeNum, episodeLength) {
    const url = new URL(`https://api.aniskip.com/v2/skip-times/${malId}/${episodeNum}`);
    url.searchParams.append('types[]', 'op');
    url.searchParams.append('types[]', 'ed');
    url.searchParams.append('episodeLength', episodeLength);
    return url;
}

async function fetchAniskipDataFromApi(url) {
    const response = await fetch(url);

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

    return data;
}

function processAniskipResults(data, elements, episodeLength) {
    // Limpiar valores previos
    clearTimeInputs(elements);

    // Filtrar y ordenar resultados
    const { openingResult, endingResult } = filterAndSortResults(data.results, episodeLength);

    // Asignar valores si existen
    if (openingResult) {
        assignMinutesAndSeconds(
            elements.introStartTimeMinutesInput,
            elements.introStartTimeSecondsInput,
            openingResult.interval.startTime
        );
        assignMinutesAndSeconds(
            elements.introEndTimeMinutesInput,
            elements.introEndTimeSecondsInput,
            openingResult.interval.endTime
        );
    }

    if (endingResult) {
        assignMinutesAndSeconds(
            elements.endingStartTimeMinutesInput,
            elements.endingStartTimeSecondsInput,
            endingResult.interval.startTime
        );
    }

    if (!openingResult && !endingResult) {
        showError("Aniskip encontró resultados para este episodio, pero no contienen tiempos válidos para intro/ending.");
    }
}

function clearTimeInputs({
    introStartTimeMinutesInput, introStartTimeSecondsInput,
    introEndTimeMinutesInput, introEndTimeSecondsInput,
    endingStartTimeMinutesInput, endingStartTimeSecondsInput
}) {
    if (introStartTimeMinutesInput) introStartTimeMinutesInput.value = '0';
    if (introStartTimeSecondsInput) introStartTimeSecondsInput.value = '0';
    if (introEndTimeMinutesInput) introEndTimeMinutesInput.value = '0';
    if (introEndTimeSecondsInput) introEndTimeSecondsInput.value = '0';
    if (endingStartTimeMinutesInput) endingStartTimeMinutesInput.value = '0';
    if (endingStartTimeSecondsInput) endingStartTimeSecondsInput.value = '0';
}

function filterAndSortResults(results, episodeLength) {
    const openingCandidates = results
        .filter(r => r.skipType === 'op' && r.interval)
        .sort((a, b) => getDuration(b.interval) - getDuration(a.interval));

    const endingCandidates = results
        .filter(r => r.skipType === 'ed' && r.interval)
        .sort((a, b) => getDuration(b.interval) - getDuration(a.interval));

    return {
        openingResult: findBestCandidate(openingCandidates, episodeLength, 'endTime'),
        endingResult: findBestCandidate(endingCandidates, episodeLength, 'startTime')
    };
}

function getDuration(interval) {
    return interval.endTime - interval.startTime;
}

function findBestCandidate(candidates, episodeLength, timeProperty) {
    if (!candidates.length) return null;

    // Filtrar candidatos válidos (que no excedan la duración del episodio)
    const validCandidates = candidates.filter(c =>
        c.interval[timeProperty] <= episodeLength
    );

    return validCandidates.length ? validCandidates[0] : null;
}

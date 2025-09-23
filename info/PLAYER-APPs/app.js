import { getNextServerName, updatePreview } from './utils.js';
import { fetchAniskipData } from './aniskip.js';
import { languages } from './languages.js';

// --- INITIALIZATION & DOM ELEMENTS ---
const TMDB_API_KEY = '4ca9f3b2b92afe069f1145bf132b1edf';
const contentTypeSelect = document.getElementById('content-type');

// --- API & DATA FETCHING ---
const fetchTMDBData = async (url, errorMessage) => {
     try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${errorMessage}. Código: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching TMDB data:", error);
        alert(`Error: ${error.message}`);
        return null;
    }
};

const searchTMDBByTitle = async (type, title) => {
    if (!type || !title) return null;
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=es-ES`;
    const searchData = await fetchTMDBData(url, 'Error al buscar en TMDB.');
    if (searchData && searchData.results && searchData.results.length > 0) {
        return searchData.results[0].id;
    }
    console.warn(`No se encontraron resultados en TMDB para: "${title}"`);
    return null;
};

const searchMALByTitle = async (title) => {
    if (!title) return null;
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error al buscar en Jikan API. Código: ${response.status}`);
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            return data.data[0].mal_id;
        }
    } catch (error) {
        console.error("Error fetching Jikan data:", error);
    }
    console.warn(`No se encontraron resultados en MyAnimeList para: "${title}"`);
    return null;
};

// --- UI & FORM LOGIC ---
const toggleSeriesFields = () => {
    const isTV = contentTypeSelect.value === 'tv';
    document.querySelectorAll('.series-only').forEach(el => el.style.display = isTV ? 'block' : 'none');

    const playbackControlsSection = document.getElementById('playback-controls-section');
    if (playbackControlsSection) {
        playbackControlsSection.style.display = isTV ? 'block' : 'none';
    }

    // Hide or show intro/ending time fields based on content type
    document.getElementById('intro-start-time-group').style.display = isTV ? 'block' : 'none';
    document.getElementById('intro-end-time-group').style.display = isTV ? 'block' : 'none';
    document.getElementById('ending-start-time-group').style.display = isTV ? 'block' : 'none';
};

const fetchAndFillTMDB = async () => {
    const type = contentTypeSelect.value;
    const id = document.getElementById('tmdb-id').value;
    if (!id) return;
    
    const mainData = await fetchTMDBData(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`, 'No se encontró el contenido.');
    if (!mainData) {
        document.getElementById('tmdb-id').value = ''; // Clear invalid ID
        return;
    }

    if (type === 'tv' && mainData.episode_run_time && mainData.episode_run_time.length > 0) {
        document.getElementById('episode-length').value = mainData.episode_run_time[0] * 60;
    } else if (type === 'movie' && mainData.runtime) {
        document.getElementById('episode-length').value = mainData.runtime * 60;
    }

    const previewData = {
        images: {
            jpg: {
                large_image_url: mainData.poster_path ? `https://image.tmdb.org/t/p/w500${mainData.poster_path}` : ''
            }
        },
        title: mainData.title || mainData.name,
        year: type === 'movie' ? mainData.release_date?.substring(0, 4) : mainData.first_air_date?.substring(0, 4),
        type: type === 'tv' ? 'TV' : 'Movie',
        episodes: type === 'tv' ? mainData.number_of_episodes : undefined,
        season: type === 'tv' ? document.getElementById('tmdb-season').value : undefined,
        episode: type === 'tv' ? document.getElementById('tmdb-episode').value : undefined
    };
    updatePreview(previewData);

    document.getElementById('content-title').value = mainData.title || mainData.name || '';
    document.getElementById('content-synopsis').value = mainData.overview || '';

    let posterUrl = mainData.poster_path ? `https://image.tmdb.org/t/p/original${mainData.poster_path}` : '';
    const reportPosterUrl = mainData.poster_path ? `https://image.tmdb.org/t/p/original${mainData.poster_path}` : ''; // Always series poster

    if (type === 'tv') {
        document.getElementById('content-seriesName').value = mainData.name || '';
        const seasonNum = document.getElementById('tmdb-season').value;
        const episodeNum = document.getElementById('tmdb-episode').value;

        if (seasonNum && episodeNum) {
            const episodeData = await fetchTMDBData(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNum}/episode/${episodeNum}?api_key=${TMDB_API_KEY}&language=es-ES`, 'No se encontró el episodio.');
            if (episodeData) {
                document.getElementById('content-chapterName').value = episodeData.name || '';
                if (episodeData.still_path) {
                    posterUrl = `https://image.tmdb.org/t/p/original${episodeData.still_path}`;
                }
            }
        }
    }
    document.getElementById('content-posterUrl').value = posterUrl;
    document.getElementById('content-reportPosterUrl').value = reportPosterUrl;
};

// --- EVENT LISTENERS ---
contentTypeSelect.addEventListener('change', () => {
    toggleSeriesFields();
    loadedHtmlContentForModification = null; // Reset loaded HTML when type changes
});
document.getElementById('fetch-tmdb-button').addEventListener('click', fetchAndFillTMDB);
document.getElementById('fetch-mal-button').addEventListener('click', fetchAniskipData);

// --- INITIALIZATION ---
toggleSeriesFields();

// --- TAB MANAGEMENT ---

class TabManager {
    constructor(containerId, type) {
        this.container = document.getElementById(containerId);
        this.tabList = this.container.querySelector('.tab-list');
        this.tabContent = this.container.querySelector('.tab-content');
        this.type = type; // 'video' or 'download'
        this.langCounter = 0;
    }

    addTab(langCode = '', servers = []) {
        this.langCounter++;
        const tabId = `${this.type}-lang-${this.langCounter}`;
        
        // Create Tab Button
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button flex items-center gap-2';
        tabButton.dataset.tab = tabId;

        const languageOptions = Object.entries(languages).map(([code, name]) => `<option value="${code}" ${code === langCode ? 'selected' : ''}>${name}</option>`).join('');

        tabButton.innerHTML = `
            <select class="language-code bg-transparent focus:bg-slate-700 rounded px-1 py-0.5 w-40 outline-none">
                ${languageOptions}
            </select>
            <span class="delete-tab-btn text-gray-500 hover:text-red-400 text-xs"><i class="fas fa-times"></i></span>
        `;
        this.tabList.appendChild(tabButton);

        // Create Tab Panel
        const tabPanel = document.createElement('div');
        tabPanel.id = tabId;
        tabPanel.className = 'tab-panel';
        tabPanel.innerHTML = `
            <div class="servers-list space-y-3"></div>
            <button class="add-server-btn mt-4 w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-2 rounded-md text-sm flex items-center justify-center gap-1">
                <i class="fas fa-plus-circle"></i> Añadir Servidor
            </button>
        `;
        this.tabContent.appendChild(tabPanel);
        
        const serversList = tabPanel.querySelector('.servers-list');
        if (servers.length > 0) {
            servers.forEach(server => this.createServerItem(serversList, server));
        } else {
            this.createServerItem(serversList); // Add one empty server by default
        }

        // Event Listeners
        tabButton.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                this.activateTab(tabButton);
            }
        });
        
        tabButton.querySelector('.language-code').addEventListener('click', (e) => e.stopPropagation());

        tabButton.querySelector('.delete-tab-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmation('¿Seguro que quieres eliminar este idioma y todos sus servidores?', () => this.deleteTab(tabButton));
        });

        tabPanel.querySelector('.add-server-btn').addEventListener('click', () => {
            this.createServerItem(serversList);
        });

        this.activateTab(tabButton);
        return {tabButton, tabPanel};
    }

    createServerItem(container, data = {}) {
        if (this.type === 'video') {
            createVideoServerItem(container, data);
        } else {
            createDownloadServerItem(container, data);
        }
    }

    activateTab(tabToActivate) {
        this.tabList.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        tabToActivate.classList.add('active');

        this.tabContent.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(tabToActivate.dataset.tab).classList.add('active');
        
        tabToActivate.querySelector('.language-code').focus();
    }

    deleteTab(tabToDelete) {
        const panelId = tabToDelete.dataset.tab;
        const panelToDelete = document.getElementById(panelId);
        
        const wasActive = tabToDelete.classList.contains('active');
        const prevSibling = tabToDelete.previousElementSibling;
        const nextSibling = tabToDelete.nextElementSibling;

        tabToDelete.remove();
        panelToDelete.remove();

        if (wasActive) {
            this.activateTab(prevSibling || nextSibling || this.tabList.querySelector('.tab-button'));
        }
    }
    
    clear() {
        this.tabList.innerHTML = '';
        this.tabContent.innerHTML = '';
        this.langCounter = 0;
    }
}

// --- Server Item Creation (Moved outside class for reusability) ---
const createVideoServerItem = (container, data = {}) => {
    const item = document.createElement('div');
    item.className = 'server-item bg-slate-900/50 p-3 rounded-md grid grid-cols-1 md:grid-cols-3 gap-3 items-center';
    const serverName = data.name || (container.children.length === 0 ? 'Yamilat (Principal)' : getNextServerName());
    item.innerHTML = `
        <input type="text" class="server-name form-input p-2 rounded-md text-sm col-span-3 md:col-span-1" placeholder="Nombre del Servidor" value="${serverName}">
        <input type="url" class="server-url form-input p-2 rounded-md text-sm col-span-3 md:col-span-2" placeholder="URL del Video" value="${data.url || ''}">
        <div class="col-span-3 flex items-center justify-between">
            <select class="server-type form-select p-2 rounded-md text-sm">
                <option value="other">Otro</option>
                <option value="hls" ${data.hls ? 'selected' : ''}>HLS (.m3u8)</option>
                <option value="mp4" ${data.mp4 ? 'selected' : ''}>MP4 (Enlace Directo)</option>
                <option value="gdrive" ${data.gdrive ? 'selected' : ''}>Google Drive</option>
                <option value="yandex" ${data.yandex ? 'selected' : ''}>Yandex</option>
            </select>
            <button class="delete-server-btn text-red-400 hover:text-red-300 ml-4"><i class="fas fa-times"></i></button>
        </div>
    `;
    container.appendChild(item);
    item.querySelector('.delete-server-btn').addEventListener('click', () => {
        showConfirmation('¿Seguro que quieres eliminar este servidor?', () => item.remove());
    });
};

const createDownloadServerItem = (container, data = {}) => {
    const item = document.createElement('div');
    item.className = 'server-item bg-slate-900/50 p-3 rounded-md grid grid-cols-1 md:grid-cols-3 gap-3 items-center';
    const serverName = data.name || (container.children.length === 0 ? 'Yamilat (Principal)' : getNextServerName());
    item.innerHTML = `
        <input type="text" class="download-name form-input p-2 rounded-md text-sm col-span-3 md:col-span-1" placeholder="Nombre del Servidor" value="${serverName}">
        <input type="url" class="download-url form-input p-2 rounded-md text-sm col-span-3 md:col-span-2" placeholder="URL de Descarga" value="${data.url || ''}">
        <div class="col-span-3 flex items-center justify-between">
            <select class="download-type form-select p-2 rounded-md text-sm">
                <option value="external" ${data.type === 'external' ? 'selected' : ''}>Externa (Mega, Drive, etc.)</option>
                <option value="mp4" ${data.type === 'mp4' ? 'selected' : ''}>Directa (MP4)</option>
            </select>
            <button class="delete-server-btn text-red-400 hover:text-red-300 ml-4"><i class="fas fa-times"></i></button>
        </div>
    `;
    container.appendChild(item);
    item.querySelector('.delete-server-btn').addEventListener('click', () => {
        showConfirmation('¿Seguro que quieres eliminar este servidor?', () => item.remove());
    });
};

// --- Main Logic (Generation, Loading, Event Listeners) ---
const generateButton = document.getElementById('generate-button');
const videoTabManager = new TabManager('video-tabs-container', 'video');
const downloadTabManager = new TabManager('download-tabs-container', 'download');

const buildConfigObjects = () => {
    const contentConfig = {};
    document.querySelectorAll('[id^="content-"]').forEach(el => {
        // Skip the minute/second specific inputs as they are handled separately below
        if (el.id.endsWith('-minutes') || el.id.endsWith('-seconds')) return;
        
        const key = el.id.replace('content-', '');
        if (el.closest('.series-only') && contentTypeSelect.value !== 'tv') return;
        
        contentConfig[key] = el.type === 'checkbox' ? el.checked : el.value;
    });

    // Explicitly handle time inputs (intro/ending start/end times) only for TV content
    if (contentTypeSelect.value === 'tv') {
        const timeFields = ['introStartTime', 'introEndTime', 'endingStartTime'];
        timeFields.forEach(key => {
            const minutesId = `content-${key}-minutes`;
            const secondsId = `content-${key}-seconds`;
            const minutesEl = document.getElementById(minutesId);
            const secondsEl = document.getElementById(secondsId);

            if (minutesEl && secondsEl) {
                const minutes = parseFloat(minutesEl.value) || 0;
                const seconds = parseFloat(secondsEl.value) || 0;
                contentConfig[key] = (minutes * 60) + seconds; // Store as total seconds
            } else {
                contentConfig[key] = 0; // Default to 0 if elements are not found
            }
        });

        contentConfig.season = document.getElementById('tmdb-season').value;
        contentConfig.episode = document.getElementById('tmdb-episode').value;
    }
    
    contentConfig.theme = document.getElementById('advanced-theme').value;
    contentConfig.backUrl = document.getElementById('content-back-url').value;
    contentConfig.goBackId = "";
    contentConfig.reportPosterUrl = document.getElementById('content-reportPosterUrl').value;

    const languageServers = {};
    videoTabManager.tabContent.querySelectorAll('.tab-panel').forEach(panel => {
        const tabButton = videoTabManager.tabList.querySelector(`[data-tab="${panel.id}"]`);
        const lang = tabButton.querySelector('.language-code').value.trim();
        if (!lang) return;
        languageServers[lang] = [];
        panel.querySelectorAll('.server-item').forEach(item => {
            const server = {
                name: item.querySelector('.server-name').value,
                url: item.querySelector('.server-url').value
            };
            const type = item.querySelector('.server-type').value;
            if (type !== 'other') server[type] = true;
            if (server.name && server.url) languageServers[lang].push(server);
        });
    });

    const downloadServers = {};
    downloadTabManager.tabContent.querySelectorAll('.tab-panel').forEach(panel => {
        const tabButton = downloadTabManager.tabList.querySelector(`[data-tab="${panel.id}"]`);
        const lang = tabButton.querySelector('.language-code').value.trim();
        if (!lang) return;
        downloadServers[lang] = [];
        panel.querySelectorAll('.server-item').forEach(item => {
            const server = {
                name: item.querySelector('.download-name').value,
                url: item.querySelector('.download-url').value,
                type: item.querySelector('.download-type').value
            };
            if (server.name && server.url) downloadServers[lang].push(server);
        });
    });

    const GOOGLE_API_KEY = document.getElementById('advanced-google-api-key').value;
    return { contentConfig, languageServers, downloadServers, GOOGLE_API_KEY };
};

const generateFinalHTML = async ({ contentConfig, languageServers, downloadServers, GOOGLE_API_KEY }) => {
    const theme = contentConfig.theme || 'orange';
    delete contentConfig.theme;

    // Fetch the player template HTML
    let playerTemplateHtml = '';
    let debugInfo = '';
    try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/info/PLAYER-APPs/player_template.html');
        if (!response.ok) throw new Error(`Error al cargar player_template.html. Código: ${response.status}`);
        playerTemplateHtml = await response.text();
        debugInfo += `<!-- DEBUG: playerTemplateHtml fetched successfully (first 200 chars): ${playerTemplateHtml.substring(0, 200).replace(/-->/g, '-->')} -->\n`;
    } catch (error) {
        console.error("Error fetching player_template.html:", error);
        alert(`Error: ${error.message}`);
        return '';
    }

    // Replace placeholders with dynamic content
    let finalHtml = playerTemplateHtml;
    finalHtml = finalHtml.replaceAll('"${theme}"', `"${theme}"`);
    finalHtml = finalHtml.replaceAll('"${GOOGLE_API_KEY}"', `"${GOOGLE_API_KEY}"`);
    finalHtml = finalHtml.replaceAll('${escapedContentConfig}', JSON.stringify(contentConfig));
    finalHtml = finalHtml.replaceAll('${escapedLanguageServers}', JSON.stringify(languageServers));
    finalHtml = finalHtml.replaceAll('${escapedDownloadServers}', JSON.stringify(downloadServers));

    debugInfo += `<!-- DEBUG: Generated finalHtml (first 500 chars): ${finalHtml.substring(0, 500).replace(/-->/g, '-->')} -->\n`;

    return debugInfo + finalHtml;
};

const loadFromConfig = (configs) => {
    videoTabManager.clear();
    downloadTabManager.clear();

    document.getElementById('advanced-google-api-key').value = configs.GOOGLE_API_KEY || '';

    for (const key in configs.contentConfig) {
        // Handle time inputs (intro/ending start/end times) only for TV content
        if (contentTypeSelect.value === 'tv' && ['introStartTime', 'introEndTime', 'endingStartTime'].includes(key)) {
            const totalSeconds = parseFloat(configs.contentConfig[key]) || 0;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.round(totalSeconds % 60);
            
            const minutesEl = document.getElementById(`content-${key}-minutes`);
            const secondsEl = document.getElementById(`content-${key}-seconds`);

            if (minutesEl) { // Check for minutes element
                minutesEl.value = minutes;
            }
            if (secondsEl) { // Check for seconds element
                secondsEl.value = seconds;
            }
        } else {
            // Handle other content fields
            const el = document.getElementById(`content-${key}`) || document.getElementById(`advanced-${key}`);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = configs.contentConfig[key];
                } else {
                    el.value = configs.contentConfig[key] || '';
                }
            }
        }
    }
    // Handle season and episode separately only for TV content
    if (contentTypeSelect.value === 'tv') {
        if (configs.contentConfig.season) {
            document.getElementById('tmdb-season').value = configs.contentConfig.season;
        }
        if (configs.contentConfig.episode) {
            document.getElementById('tmdb-episode').value = configs.contentConfig.episode;
        }
    }
    
    const videoLangs = Object.keys(configs.languageServers);
    if (videoLangs.length > 0) {
        videoLangs.forEach(lang => videoTabManager.addTab(lang, configs.languageServers[lang]));
    } else {
        videoTabManager.addTab('Español');
    }

    const downloadLangs = Object.keys(configs.downloadServers);
    if (downloadLangs.length > 0) {
        downloadLangs.forEach(lang => downloadTabManager.addTab(lang, configs.downloadServers[lang]));
    } else {
        downloadTabManager.addTab('Español');
    }
    
    toggleSeriesFields();
};

const parseAndLoad = async (htmlContent) => {
    try {
        // Extract theme from data-theme attribute
        const themeMatch = htmlContent.match(/<html lang="es" data-theme="([^"]*)">/);
        const theme = themeMatch ? themeMatch[1] : 'orange'; // Default to orange if not found

        const contentConfigMatch = htmlContent.match(/window\.contentConfig = (\{[\s\S]*?\});/);
        const languageServersMatch = htmlContent.match(/window\.languageServers = (\{[\s\S]*?\});/);
        const downloadServersMatch = htmlContent.match(/window\.downloadServers = (\{[\s\S]*?\});/);
        const googleApiKeyMatch = htmlContent.match(/window\.GOOGLE_API_KEY = "([^"]*)";/);

        if (!contentConfigMatch || !languageServersMatch || !downloadServersMatch) {
            throw new Error("No se pudieron encontrar todos los objetos de configuración en el HTML.");
        }

        const configs = {
            contentConfig: JSON.parse(contentConfigMatch[1]),
            languageServers: JSON.parse(languageServersMatch[1]),
            downloadServers: JSON.parse(downloadServersMatch[1]),
            GOOGLE_API_KEY: googleApiKeyMatch ? googleApiKeyMatch[1] : ''
        };

        // Manually set the theme in contentConfig for consistency with form data
        configs.contentConfig.theme = theme;

        loadFromConfig(configs);

        const type = configs.contentConfig.type;
        const title = configs.contentConfig.seriesName || configs.contentConfig.title;

        if (type && title) {
            const tmdbId = await searchTMDBByTitle(type, title);
            if (tmdbId) {
                document.getElementById('tmdb-id').value = tmdbId;
                await fetchAndFillTMDB();
            }
        }

        if (type === 'tv' && title) {
            const malId = await searchMALByTitle(title);
            if (malId) {
                document.getElementById('mal-id').value = malId;
                // Automatically trigger aniskip fetch if episode length is available
                if (document.getElementById('episode-length').value) {
                    fetchAniskipData();
                }
            }
        }
        
    } catch (e) {
        alert("Error al analizar el código HTML. Asegúrate de que el formato es correcto.");
        console.error("Parse error:", e);
    }
};

// --- Event Listeners & Initializers ---
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const viewSections = document.querySelectorAll('.view-section');

sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        
        // Ocultar todas las secciones principales
        document.querySelectorAll('.view-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Mostrar la sección objetivo
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Actualizar el estado activo del enlace
        sidebarLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Mostrar u ocultar la vista previa
        const previewContainer = document.getElementById('preview-container');
        if (targetId === 'info-view') {
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
    });
});

// Disparar un clic en el primer enlace para establecer el estado inicial correcto
document.querySelector('.sidebar-link[href="#info-view"]').click();

const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});

const loadModal = document.getElementById('load-modal');
const codeModal = document.getElementById('code-modal');
const confirmationModal = document.getElementById('confirmation-modal');
const loadModalContent = document.getElementById('load-modal-content');
const codeModalContent = document.getElementById('code-modal-content');
const confirmationModalContent = document.getElementById('confirmation-modal-content');
const confirmationMessage = document.getElementById('confirmation-message');
let onConfirmAction = null;

const toggleModal = (modal, content, show) => {
     if(show) {
        modal.classList.remove('hidden');
        setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
    } else {
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); }, 300);
    }
};
const toggleLoadModal = (show) => toggleModal(loadModal, loadModalContent, show);
const toggleCodeModal = (show) => toggleModal(codeModal, codeModalContent, show);
const toggleConfirmationModal = (show) => {
    if(!show) onConfirmAction = null;
    toggleModal(confirmationModal, confirmationModalContent, show);
};

window.showConfirmation = (message, onConfirm) => {
    confirmationMessage.textContent = message || 'Esta acción no se puede deshacer.';
    onConfirmAction = onConfirm;
    toggleConfirmationModal(true);
};

generateButton.addEventListener('click', async () => {
    const configs = buildConfigObjects();
    const finalHtml = await generateFinalHTML(configs); // Always generate fresh HTML from current form state

    document.getElementById('html-output').value = finalHtml;
    toggleCodeModal(true);
});

document.getElementById('add-video-language-btn').addEventListener('click', () => videoTabManager.addTab(''));
document.getElementById('add-download-language-btn').addEventListener('click', () => downloadTabManager.addTab(''));

document.getElementById('show-load-modal-button').addEventListener('click', () => toggleLoadModal(true));
document.getElementById('close-load-modal-button').addEventListener('click', () => toggleLoadModal(false));
document.getElementById('cancel-load-button').addEventListener('click', () => toggleLoadModal(false));

const loadTabs = document.querySelectorAll('.load-tab');
const loadTabPanels = document.querySelectorAll('.load-tab-panel');
loadTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        loadTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetPanelId = tab.dataset.tab + '-panel';
        loadTabPanels.forEach(panel => {
            panel.style.display = panel.id === targetPanelId ? 'block' : 'none';
        });
    });
});

const handleLoadFromURL = async () => {
    const url = document.getElementById('load-url-input').value;
    if (!url) {
        alert('Por favor, ingresa una URL válida.');
        return;
    }

    try {
        // Using a CORS proxy to bypass potential cross-origin restrictions
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Error al cargar desde URL (Proxy): ${response.status}`);
        }
        const data = await response.json();
        if (!data || !data.contents) {
            throw new Error('No se pudo obtener el contenido a través del proxy.');
        }
        const htmlContent = data.contents;
        await parseAndLoad(htmlContent);
        toggleLoadModal(false);
    } catch (error) {
        console.error("Error loading from URL:", error);
        alert(`Error: ${error.message}. Esto puede deberse a restricciones CORS o a que la URL no es accesible.`);
    }
};

document.getElementById('confirm-load-button').addEventListener('click', async () => {
    const activeTab = document.querySelector('.load-tab.active').dataset.tab;
    if (activeTab === 'from-text') {
        await parseAndLoad(document.getElementById('load-html-input').value);
        toggleLoadModal(false);
    } else if (activeTab === 'from-url') {
        await handleLoadFromURL();
    }
});

document.getElementById('close-code-modal-button').addEventListener('click', () => toggleCodeModal(false));
document.getElementById('done-code-button').addEventListener('click', () => toggleCodeModal(false));
document.getElementById('copy-button').addEventListener('click', () => {
    const output = document.getElementById('html-output');
    const copyTextEl = document.getElementById('copy-text');
    const textToCopy = output.value;

    if (navigator.clipboard && window.isSecureContext) {
        // Modern async method
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyTextEl.textContent = '¡Copiado!';
            setTimeout(() => { copyTextEl.textContent = 'Copiar'; }, 2000);
        }).catch(err => {
            console.error('Error al copiar con Clipboard API: ', err);
            alert('No se pudo copiar el texto.');
        });
    } else {
        // Fallback for older browsers or insecure contexts
        output.select();
        try {
            document.execCommand('copy');
            copyTextEl.textContent = '¡Copiado!';
            setTimeout(() => { copyTextEl.textContent = 'Copiar'; }, 2000);
        } catch (err) {
            console.error('Error al copiar con execCommand: ', err);
            alert('No se pudo copiar el texto.');
        }
        output.blur();
    }
});

document.getElementById('cancel-confirmation-button').addEventListener('click', () => toggleConfirmationModal(false));
document.getElementById('confirm-delete-button').addEventListener('click', () => {
    if (typeof onConfirmAction === 'function') {
        onConfirmAction();
    }
    toggleConfirmationModal(false);
});

const saveAdvancedSettings = () => {
    const theme = document.getElementById('advanced-theme').value;
    const googleApiKey = document.getElementById('advanced-google-api-key').value;
    localStorage.setItem('advancedSettings', JSON.stringify({ theme, googleApiKey }));
    alert('Ajustes avanzados guardados correctamente.');
};

const loadAdvancedSettings = () => {
    const savedSettings = localStorage.getItem('advancedSettings');
    if (savedSettings) {
        const { theme, googleApiKey } = JSON.parse(savedSettings);
        document.getElementById('advanced-theme').value = theme || 'orange';
        document.getElementById('advanced-google-api-key').value = googleApiKey || '';
    }
};

document.getElementById('save-advanced-settings-button').addEventListener('click', saveAdvancedSettings);

// Load advanced settings on initialization
loadAdvancedSettings();

// Initialize default tabs if no languages are loaded (this is handled in loadFromConfig)
// If loadFromConfig is not called or returns empty, addTab('Español') will be called.
// This ensures only one default language is added if no config is present.
if (videoTabManager.langCounter === 0) {
    videoTabManager.addTab('es'); // Use 'es' for Spanish
}
if (downloadTabManager.langCounter === 0) {
    downloadTabManager.addTab('es'); // Use 'es' for Spanish
}

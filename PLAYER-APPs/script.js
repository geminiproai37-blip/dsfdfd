import { getNextServerName, updatePreview } from './utils.js';
import { fetchAniskipData } from './aniskip.js';
import { languages } from './languages.js';

// --- INITIALIZATION & DOM ELEMENTS ---
const TMDB_API_KEY = 'b619bab44d405bb6c49b14dfc7365b51';
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

// --- UI & FORM LOGIC ---
const toggleSeriesFields = () => {
    const isTV = contentTypeSelect.value === 'tv';
    document.querySelectorAll('.series-only').forEach(el => el.style.display = isTV ? 'block' : 'none');
};

const fetchAndFillTMDB = async () => {
    const type = contentTypeSelect.value;
    const id = document.getElementById('tmdb-id').value;
    if (!id) return;
    
    const mainData = await fetchTMDBData(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`, 'No se encontró el contenido.');
    if (!mainData) return;

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
        episodes: type === 'tv' ? mainData.number_of_episodes : undefined
    };
    updatePreview(previewData);

    document.getElementById('content-title').value = mainData.title || mainData.name || '';
    document.getElementById('content-posterUrl').value = mainData.poster_path ? `https://image.tmdb.org/t/p/original${mainData.poster_path}` : '';
    document.getElementById('content-synopsis').value = mainData.overview || '';

    if (type === 'tv') {
        document.getElementById('content-seriesName').value = mainData.name || '';
        const seasonNum = document.getElementById('tmdb-season').value;
        const episodeNum = document.getElementById('tmdb-episode').value;

        if (seasonNum && episodeNum) {
            const episodeData = await fetchTMDBData(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNum}/episode/${episodeNum}?api_key=${TMDB_API_KEY}&language=es-ES`, 'No se encontró el episodio.');
            if (episodeData) {
                document.getElementById('content-chapterName').value = episodeData.name || '';
            }
        }
    }
};

// --- EVENT LISTENERS ---
contentTypeSelect.addEventListener('change', toggleSeriesFields);
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
    item.querySelector('.delete-server-btn').addEventListener('click', () => item.remove());
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
    item.querySelector('.delete-server-btn').addEventListener('click', () => item.remove());
};

// --- Main Logic (Generation, Loading, Event Listeners) ---
const generateButton = document.getElementById('generate-button');
const videoTabManager = new TabManager('video-tabs-container', 'video');
const downloadTabManager = new TabManager('download-tabs-container', 'download');

const buildConfigObjects = () => {
    const contentConfig = {};
    document.querySelectorAll('[id^="content-"]').forEach(el => {
        const key = el.id.replace('content-', '');
        if (el.closest('.series-only') && contentTypeSelect.value !== 'tv') return;
        
        // Asegurarse de que los valores de tiempo se guarden como números
        if (['introStartTime', 'introEndTime', 'endingStartTime', 'endingEndTime'].includes(key)) {
            const minutesId = `content-${key}-minutes`;
            const secondsId = `content-${key}-seconds`;
            const minutesEl = document.getElementById(minutesId);
            const secondsEl = document.getElementById(secondsId);

            if (minutesEl && secondsEl) {
                const minutes = parseFloat(minutesEl.value) || 0;
                const seconds = parseFloat(secondsEl.value) || 0;
                contentConfig[key] = minutes + (seconds / 60);
            } else {
                const parsedValue = parseFloat(el.value) / 60;
                contentConfig[key] = isNaN(parsedValue) ? 0 : parsedValue;
            }
        } else {
            contentConfig[key] = el.type === 'checkbox' ? el.checked : el.value;
        }
    });

    if (contentTypeSelect.value === 'tv') {
        contentConfig.season = document.getElementById('tmdb-season').value;
        contentConfig.episode = document.getElementById('tmdb-episode').value;
    }
    
    contentConfig.theme = document.getElementById('advanced-theme').value;
    contentConfig.backUrl = document.getElementById('content-back-url').value;
    contentConfig.goBackId = "";

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

const generateFinalHTML = ({ contentConfig, languageServers, downloadServers, GOOGLE_API_KEY }) => {
    const theme = contentConfig.theme || 'orange'; 
    delete contentConfig.theme;

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, user-scalable=no"
    />
    <title>Reproductor de Video</title>
    <script defer>
      // Función para obtener parámetros de la URL
      function getUrlParameter(name) {
        name = name.replace(/[\\[]/, "\\\\[").replace(/[\\]]/, "\\\\]");
        var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(location.search);
        return results === null
          ? ""
          : decodeURIComponent(results[1].replace(/\\+/g, " "));
      }

      // Obtener el parámetro 'theme' de la URL y aplicarlo
      const themeFromUrl = getUrlParameter("theme");
      if (themeFromUrl) {
        document.documentElement.setAttribute("data-theme", themeFromUrl);
      } else {
            // Si no se especifica el parámetro 'theme' en la URL, la web se cargará con el tema "purple" por defecto.
            document.documentElement.setAttribute("data-theme", "${theme}");
          }
          // Para cargar la web con un tema específico, usa la URL: index.html?theme=nombre_del_tema (ej: index.html?theme=purple)
    <\/script>

        <!-- Iconos de Google y Tipografía -->
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <!-- Preload Google Fonts for faster loading -->
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap"
          as="style"
          onload="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap"
            rel="stylesheet"
          />
        </noscript>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <!-- Font Awesome for close icons -->
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          xintegrity="sha512-Fo3rlrZj/k7ujTnHg4CGR2D7kSs0v4LLanw2qksYuRlEzO+tcaEPQogQ0KaoGN26/zrn20ImR1DfuLWnOo7aBA=="
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/reproductor-app-yami/style.css" />
        <script defer>
           window.contentConfig = ${JSON.stringify(contentConfig, null, 4)};
           window.languageServers = ${JSON.stringify(languageServers, null, 4)};
           window.downloadServers = ${JSON.stringify(downloadServers, null, 4)};
          // IMPORTANT: Replace with your actual Google API Key.
          // Be aware of the security implications of exposing this key in client-side code.
          window.GOOGLE_API_KEY = "${GOOGLE_API_KEY}";
        <\/script>
        <!-- HLS.js library for M3U8 playback -->
        <!-- Video.js library for broader video format support -->
        <script src="https://vjs.zencdn.net/8.10.0/video.min.js" defer><\/script>
        <!-- HLS.js library for M3U8 playback -->
        <script
          src="https://cdn.jsdelivr.net/npm/hls.js@latest"
          defer
        ><\/script>
        <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/reproductor-app-yami/dom_builder.js" defer><\/script>
        <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/reproductor-app-yami/external_handler.js" defer><\/script>
        <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/reproductor-app-yami/continueWatchingModal.js" defer><\/script>
        <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/reproductor-app-yami/anime_loader.js" defer><\/script>
        <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/dsfdfd@main/reproductor-app-yami/apps.js" defer><\/script>
      </head>
     <body>
    <div id="player-container"></div>
    <!-- Nuevo contenedor para el menú vertical -->
    <div id="vertical-menu-container" class="vertical-menu-container">
      <!-- Los elementos del menú vertical se insertarán aquí dinámicamente por dom_builder.js -->
    </div>

    <!-- Contenedor para los botones del menú lateral en orientación vertical -->
    <div id="side-menu-buttons">
      <!-- Los botones se insertarán aquí dinámicamente por dom_builder.js -->
    </div>

    <!-- Report Confirmation Modal -->
    <div id="report-confirmation-modal" class="popup hidden">
      <div class="popup-header">
        <h3>Reporte Enviado</h3>
        <button class="close-popup-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="popup-content report-confirmation-content">
        <img
          src="https://i.pinimg.com/originals/f2/1f/0a/f21f0a529006c607222141022020812f.gif"
          alt="Reporte Enviado"
          class="report-confirmation-gif"
        />
        <p>¡Gracias por tu reporte! Lo revisaremos pronto.</p>
        <button id="report-confirmation-ok-btn" class="btn-primary">
          Aceptar
        </button>
      </div>
    </div>
  </body>
</html>`;
};

const loadFromConfig = (configs) => {
    videoTabManager.clear();
    downloadTabManager.clear();

    document.getElementById('advanced-google-api-key').value = configs.GOOGLE_API_KEY || '';

    for (const key in configs.contentConfig) {
        const el = document.getElementById(`content-${key}`) || document.getElementById(`advanced-${key}`);
        if (el) {
            if (el.type === 'checkbox') el.checked = configs.contentConfig[key];
            else el.value = configs.contentConfig[key] || '';
        }
    }
    // Handle season and episode separately
    if (configs.contentConfig.season) {
        document.getElementById('tmdb-season').value = configs.contentConfig.season;
    }
    if (configs.contentConfig.episode) {
        document.getElementById('tmdb-episode').value = configs.contentConfig.episode;
    }
    if (configs.contentConfig.introStartTime) {
        document.getElementById('content-introStartTime').value = configs.contentConfig.introStartTime;
    }
    if (configs.contentConfig.introEndTime) {
        document.getElementById('content-introEndTime').value = configs.contentConfig.introEndTime;
    }
    if (configs.contentConfig.endingStartTime) {
        document.getElementById('content-endingStartTime').value = configs.contentConfig.endingStartTime;
    }
    if (configs.contentConfig.endingEndTime) {
        document.getElementById('content-endingEndTime').value = configs.contentConfig.endingEndTime;
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

const parseAndLoad = (htmlContent) => {
    try {
        const contentConfigMatch = htmlContent.match(/window\.contentConfig = ({[\s\S]*?});/);
        const langServersMatch = htmlContent.match(/window\.languageServers = ({[\s\S]*?});/);
        const dlServersMatch = htmlContent.match(/window\.downloadServers = ({[\s\S]*?});/);
        const apiKeyMatch = htmlContent.match(/window\.GOOGLE_API_KEY = "([^"]*)";/);
        
        if (!contentConfigMatch || !langServersMatch || !dlServersMatch) {
            throw new Error("No se pudieron encontrar todos los objetos de configuración en el HTML.");
        }

        const configs = {
            contentConfig: JSON.parse(contentConfigMatch[1]),
            languageServers: JSON.parse(langServersMatch[1]),
            downloadServers: JSON.parse(dlServersMatch[1]),
            GOOGLE_API_KEY: apiKeyMatch ? apiKeyMatch[1] : '',
            introStartTime: JSON.parse(contentConfigMatch[1]).introStartTime,
            introEndTime: JSON.parse(contentConfigMatch[1]).introEndTime,
            endingStartTime: JSON.parse(contentConfigMatch[1]).endingStartTime,
            endingEndTime: JSON.parse(contentConfigMatch[1]).endingEndTime
        };

        loadFromConfig(configs);

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

generateButton.addEventListener('click', () => {
    const configs = buildConfigObjects();
    const finalHtml = generateFinalHTML(configs);
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

document.getElementById('confirm-load-button').addEventListener('click', async () => {
    const activeTab = document.querySelector('.load-tab.active').dataset.tab;
    if (activeTab === 'from-text') {
        parseAndLoad(document.getElementById('load-html-input').value)
        toggleLoadModal(false);
    } else if (activeTab === 'from-url') {
        // This function needs to be defined if you want to use it
        // await handleLoadFromURL(); 
        alert('Cargar desde URL no está implementado aún.');
    }
});

document.getElementById('close-code-modal-button').addEventListener('click', () => toggleCodeModal(false));
document.getElementById('done-code-button').addEventListener('click', () => toggleCodeModal(false));
document.getElementById('copy-button').addEventListener('click', () => {
    const output = document.getElementById('html-output');
    const copyTextEl = document.getElementById('copy-text');
    output.select();
    document.execCommand('copy');
    copyTextEl.textContent = '¡Copiado!';
    setTimeout(() => { copyTextEl.textContent = 'Copiar'; }, 2000);
});

document.getElementById('cancel-confirmation-button').addEventListener('click', () => toggleConfirmationModal(false));
document.getElementById('confirm-delete-button').addEventListener('click', () => {
    if (typeof onConfirmAction === 'function') {
        onConfirmAction();
    }
    toggleConfirmationModal(false);
});

// Initialize default tabs
videoTabManager.addTab('Español');
downloadTabManager.addTab('Español');

document.getElementById('advanced-google-api-key').value = "AIzaSyA7v5KhMnwDwoFSGda7q8jrk0lkPhBUtoo";

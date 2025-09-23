document.addEventListener('DOMContentLoaded', () => {
    // --- Check for config variables ---
    if (typeof TMDB_API_KEY === 'undefined' || typeof DEFAULT_HTML_URL === 'undefined') {
        document.body.innerHTML = '<div style="color: red; font-size: 20px; text-align: center; padding: 50px;">Error: El archivo de configuración (config.js) no se cargó correctamente o faltan variables.</div>';
        return;
    }

    const PREDEFINED_CATEGORIES = ['series', 'peliculas', 'anime', 'fantasia', 'drama', 'ciencia ficcion', 'accion', 'aventura', 'comedia', 'terror', 'Hentai'];

    // --- Responsive Elements ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const headerTitle = document.getElementById('headerTitle');
    const globalSearchContainer = document.getElementById('globalSearchContainer');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const logoSuffix = document.getElementById('logo-suffix');
    const modeNormalBtn = document.getElementById('modeNormalBtn');
    const modeAdultBtn = document.getElementById('modeAdultBtn');
    
    // Elementos del DOM
    const openLoadModalBtn = document.getElementById('openLoadModalBtn');
    const loadHtmlModal = document.getElementById('loadHtmlModal');
    const cancelLoadBtn = document.getElementById('cancelLoadBtn');
    const processHtmlBtn = document.getElementById('processHtmlBtn');
    const htmlInput = document.getElementById('htmlInput');
    const htmlUrlInput = document.getElementById('htmlUrlInput');
    const generateHtmlBtn = document.getElementById('generateHtmlBtn');
    const adminPanel = document.getElementById('adminPanel');
    const adminPanelPlaceholder = document.getElementById('adminPanelPlaceholder');
    const sidebarNav = document.getElementById('sidebar-nav');
    
    const modal = document.getElementById('editModal');
    const modalBackBtn = document.querySelector('#editModal .modal-back-btn');
    const editForm = document.getElementById('editForm');
    const cancelBtn = document.getElementById('cancelBtn');
    
    const tabCode = document.getElementById('tab-code');
    const tabUrl = document.getElementById('tab-url');
    const contentCode = document.getElementById('content-code');
    const contentUrl = document.getElementById('content-url');
    let activeTab = 'code';

    const generateHtmlModal = document.getElementById('generateHtmlModal');
    const closeGeneratedHtmlBtn = document.getElementById('closeGeneratedHtmlBtn');
    const copyGeneratedHtmlBtn = document.getElementById('copyGeneratedHtmlBtn');

    const confirmationModal = document.getElementById('confirmationModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    let dataStore = {};
    let augmentedDataStore = {};
    let paginationState = {};
    const ITEMS_PER_PAGE = 12;
    let htmlTemplateBase = ''; // Stores the HTML content without the data declarations

    const sectionTemplates = {
        explosivoContent: { title: 'Contenido Destacado', icon: 'fa-star', isSingle: true, isFeaturedCard: true, source: 'explosivoContent' },
        secicondEdestacadoContent: { title: 'Contenido Destacado +18', icon: 'fa-fire', isSingle: true, isFeaturedCard: true, isAdultSection: true, source: 'secicondEdestacadoContent' },
        latestEpisodes: { title: 'Últimos Capítulos', icon: 'fa-clapperboard', isSingle: false, isEpisodeCard: true, source: 'latestEpisodes', filter: item => !item.isAdult },
        latestEpisodes18: { title: 'Últimos Capítulos +18', icon: 'fa-clapperboard', isSingle: false, isEpisodeCard: true, isAdultSection: true, source: 'latestEpisodes', filter: item => item.isAdult },
        peliculas: { title: 'Películas', icon: 'fa-film', isSingle: false, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'movie' && !item.isAdult },
        series: { title: 'Series', icon: 'fa-tv', isSingle: false, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'tv' && !item.isAdult },
        peliculas18: { title: 'Películas +18', icon: 'fa-film', isSingle: false, isAdultSection: true, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'movie' && item.isAdult },
        series18: { title: 'Series +18', icon: 'fa-tv', isSingle: false, isAdultSection: true, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'tv' && item.isAdult }
    };

    // --- Setup Inicial ---
    const initializeCategoryCheckboxes = () => {
        const container = document.getElementById('predefined-categories-grid');
        container.innerHTML = PREDEFINED_CATEGORIES.map(cat => `
            <label class="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" name="predefined_category" value="${cat}" class="h-4 w-4 text-primary bg-dark-border border-dark-border rounded focus:ring-primary">
                <span class="capitalize">${cat}</span>
            </label>
        `).join('');
    };
    
    const initializeApp = () => {
        htmlUrlInput.value = DEFAULT_HTML_URL;
        initializeCategoryCheckboxes();
        setupEventListeners();
        setMode(false); // Start in normal mode
    };

    // --- Lógica de Menú Móvil y Cambio de Modo ---
    const setMode = (isAdultMode) => {
        document.body.classList.toggle('theme-adult', isAdultMode);
        document.body.classList.toggle('mode-adult', isAdultMode);
        document.body.classList.toggle('mode-normal', !isAdultMode);
        
        logoSuffix.textContent = isAdultMode ? 'H' : 'Lat';

        // Update button styles
        modeNormalBtn.classList.toggle('bg-primary', !isAdultMode);
        modeNormalBtn.classList.toggle('bg-dark-border', isAdultMode);
        modeNormalBtn.classList.toggle('hover:bg-slate-600', isAdultMode);

        modeAdultBtn.classList.toggle('bg-primary', isAdultMode);
        modeAdultBtn.classList.toggle('bg-dark-border', !isAdultMode);
        modeAdultBtn.classList.toggle('hover:bg-slate-600', !isAdultMode);

        // If the currently selected sidebar link is now hidden, switch to dashboard
        const activeLink = sidebarNav.querySelector('.sidebar-link.active');
        if (activeLink && activeLink.dataset.key !== 'all') {
            const isLinkAdult = activeLink.classList.contains('adult-content-section');
            if (isAdultMode ? !isLinkAdult : isLinkAdult) {
                sidebarNav.querySelector('.sidebar-link[data-key="all"]')?.click();
            }
        }
    };

    const toggleSidebar = () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    };

    // --- Lógica de Modales y Pestañas ---
    const openModal = (modalElement) => modalElement.classList.remove('hidden');
    const closeModal = (modalElement) => modalElement.classList.add('hidden');

    const switchTab = (tabName) => {
        activeTab = tabName;
        const isCodeTab = tabName === 'code';
        contentCode.classList.toggle('hidden', !isCodeTab);
        contentUrl.classList.toggle('hidden', isCodeTab);
        tabCode.classList.toggle('border-primary', isCodeTab);
        tabCode.classList.toggle('text-white', isCodeTab);
        tabCode.classList.toggle('border-transparent', !isCodeTab);
        tabCode.classList.toggle('text-gray-400', !isCodeTab);
        tabUrl.classList.toggle('border-primary', !isCodeTab);
        tabUrl.classList.toggle('text-white', !isCodeTab);
        tabUrl.classList.toggle('border-transparent', isCodeTab);
        tabUrl.classList.toggle('text-gray-400', isCodeTab);
    };

    // --- Lógica Principal de Carga y Procesamiento ---
    const processHtml = async () => {
        if (!getApiKey()) return;

        let htmlContent = '';
        if (activeTab === 'code') {
            htmlContent = htmlInput.value;
            if (!htmlContent.trim()) return showToast('El campo de HTML está vacío.', true);
        } else {
            const url = htmlUrlInput.value;
            if (!url.trim()) return showToast('El campo de URL está vacío.', true);
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&_=${new Date().getTime()}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Error al cargar la URL: ${response.statusText}`);
                htmlContent = await response.text();
                htmlInput.value = htmlContent; // Keep htmlInput.value as the raw input
            } catch (error) {
                console.error('Error fetching URL:', error);
                return showToast(`No se pudo cargar el HTML desde la URL. ${error.message}`, true);
            }
        }

        try {
            const regexMap = {
                explosivoContent: /window\.explosivoContent\s*=\s*(\{[\s\S]*?\});/,
                secicondEdestacadoContent: /window\.secicondEdestacadoContent\s*=\s*(\{[\s\S]*?\});/,
                contentDefinitionsFromDb: /window\.contentDefinitionsFromDb\s*=\s*(\[[\s\S]*?\]);/,
                latestEpisodes: /window\.latestEpisodes\s*=\s*(\[[\s\S]*?\]);/
            };
            dataStore = {};
            Object.keys(regexMap).forEach(key => {
                const match = htmlContent.match(regexMap[key]);
                if (match && match[1]) dataStore[key] = new Function(`return ${match[1]}`)();
            });
            
            if (Object.keys(dataStore).length === 0) {
                showToast('No se encontraron bases de datos válidas.', true);
                // If no data found, still set htmlTemplateBase to allow generating original HTML
                htmlTemplateBase = htmlContent;
                return;
            }

            // Create htmlTemplateBase by removing data declarations from the original content
            const dataDeclarationRegex = /window\.(explosivoContent|secicondEdestacadoContent|contentDefinitionsFromDb|latestEpisodes)\s*=\s*(?:\{[\s\S]*?\}|\[[\s\S]*?\]);/g;
            htmlTemplateBase = htmlContent.replace(dataDeclarationRegex, '');

            renderAdminPanel();
            renderSidebarNav();
            showToast('Panel cargado con éxito.');
            closeModal(loadHtmlModal);
        } catch (error) {
            console.error('Error al parsear el HTML:', error);
            showToast('Error al parsear el HTML.', true);
        }
    };

    // --- Funciones de Utilidad ---
    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast');
        toast.firstElementChild.textContent = message;
        toast.className = `fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg text-sm z-50 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    };

    const getApiKey = () => {
        if (!TMDB_API_KEY || TMDB_API_KEY === 'REEMPLAZA_CON_TU_API_KEY') {
            showToast('Añade tu API Key en la variable TMDB_API_KEY del archivo config.js.', true);
            return null;
        }
        return TMDB_API_KEY;
    };

    const fetchTMDBData = async (id, type) => {
        const apiKey = getApiKey();
        if (!apiKey) return null;
        try {
            const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=es-ES`);
            if (!response.ok) throw new Error('Contenido no encontrado en TMDB.');
            return await response.json();
        } catch (error) {
            console.error('Error fetching TMDB data:', error);
            showToast(error.message, true);
            return null;
        }
    };

    const fetchTMDBEpisodeData = async (tvId, season, episode) => {
        const apiKey = getApiKey();
        if (!apiKey) return null;
        try {
            const response = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${season}/episode/${episode}?api_key=${apiKey}&language=es-ES`);
             if (!response.ok) throw new Error('Episodio no encontrado en TMDB.');
            return await response.json();
        } catch (error) {
            console.error('Error fetching episode data:', error);
            showToast(error.message, true);
            return null;
        }
    };

    // --- Lógica de Renderizado ---
    const createFeaturedCardHTML = (item, arrayName, index, tmdbData) => {
        if (!item || !tmdbData) return '';
        const title = tmdbData.title || tmdbData.name;
        const backdropPath = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : 'https://placehold.co/1280x720/0f172a/334155?text=No+Imagen';

        return `
            <div class="w-full h-80 bg-cover bg-center rounded-2xl shadow-lg relative flex flex-col justify-end p-8 text-white card" style="background-image: url('${backdropPath}')">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-2xl"></div>
                <div class="relative z-10">
                    <span class="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block"><i class="fas fa-star mr-1"></i> Estreno Destacado</span>
                    <h3 class="text-4xl font-bold text-shadow-lg">${title}</h3>
                    <div class="mt-4 flex items-center gap-3">
                         <button class="edit-btn text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-2"></i> Editar</button>
                         <a href="${item.customUrl || '#'}" target="_blank" class="text-sm bg-slate-700/80 hover:bg-slate-600/80 text-white font-semibold py-2 px-4 rounded-lg backdrop-blur-sm"><i class="fas fa-info-circle mr-2"></i> Más Información</a>
                    </div>
                </div>
            </div>`;
    };
    
    const createEpisodeCardHTML = (item, arrayName, index, episodeData, seriesData) => {
        if (!item) return '';
        const episodeTitle = episodeData ? `T${item.season}:E${item.episode} - ${episodeData.name}` : `T${item.season}:E${item.episode}`;
        const seriesTitle = seriesData ? seriesData.name : `ID: ${item.id}`;
        const stillPath = episodeData?.still_path ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}` : 'https://placehold.co/1920x1080/1e293b/94a3b8?text=No+Img';
        
        const imageHtml = item.isAdult ? `
            <div class="sensitive-content-container w-full h-full">
                <img src="${stillPath}" alt="${episodeTitle}" class="w-full h-full object-cover blurred" onerror="this.src='https://placehold.co/1920x1080/1e293b/94a3b8?text=Error'">
                <button class="toggle-visibility-btn"><i class="fas fa-eye"></i></button>
            </div>
        ` : `
            <img src="${stillPath}" alt="${episodeTitle}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/1920x1080/1e293b/94a3b8?text=Error'">
        `;

        return `
            <div class="bg-dark-card rounded-lg overflow-hidden shadow-lg relative card episode-card">
                <div class="aspect-video relative">
                     ${imageHtml}
                     <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                     <div class="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center space-y-2 opacity-0 overlay transition-opacity duration-300 p-2">
                        <button class="edit-btn text-xs bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-1"></i> Editar</button>
                        <button class="delete-btn text-xs bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-trash-alt mr-1"></i> Borrar</button>
                    </div>
                </div>
                <div class="p-2.5">
                    <h4 class="text-sm font-semibold truncate text-white" title="${episodeTitle}">${episodeTitle}</h4>
                    <p class="text-xs text-gray-400 truncate" title="${seriesTitle}">${seriesTitle}</p>
                </div>
            </div>`;
    };
    
    const createStandardCardHTML = (item, arrayName, index, tmdbData) => {
        if (!item) return '';
        const isArray = Array.isArray(dataStore[arrayName]);
        const title = tmdbData ? (tmdbData.title || tmdbData.name) : `ID: ${item.id}`;
        const posterPath = tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : 'https://placehold.co/500x750/1e293b/94a3b8?text=No+Img';
        
        const imageHtml = item.isAdult ? `
            <div class="sensitive-content-container aspect-[2/3]">
                <img src="${posterPath}" alt="${title}" class="w-full h-full object-cover blurred" onerror="this.src='https://placehold.co/500x750/1e293b/94a3b8?text=Error'">
                <button class="toggle-visibility-btn"><i class="fas fa-eye"></i></button>
            </div>
        ` : `
            <img src="${posterPath}" alt="${title}" class="w-full h-auto object-cover aspect-[2/3]" onerror="this.src='https://placehold.co/500x750/1e293b/94a3b8?text=Error'">
        `;

        return `
            <div class="bg-dark-card rounded-lg overflow-hidden shadow-lg relative card">
                ${imageHtml}
                <div class="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center space-y-2 opacity-0 overlay transition-opacity duration-300">
                    <button class="edit-btn text-xs bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-1"></i> Editar</button>
                    ${isArray ? `<button class="delete-btn text-xs bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-trash-alt mr-1"></i> Borrar</button>` : ''}
                </div>
                <div class="p-2.5">
                    <h4 class="text-sm font-semibold truncate text-white">${title}</h4>
                </div>
            </div>`;
    };

    const rerenderSection = (key) => {
        const sectionInfo = sectionTemplates[key];
        const augmentedData = augmentedDataStore[key];
        if (!augmentedData) return;
        renderSectionContent(key, augmentedData, sectionInfo.source, sectionInfo.isEpisodeCard, sectionInfo.isFeaturedCard);
    };

    const renderPaginationControls = (key, totalItems) => {
        const container = document.getElementById(`pagination-${key}`);
        if (!container) return;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const currentPage = paginationState[key] || 1;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <button class="pagination-btn bg-dark-border hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed" data-section-key="${key}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="text-white font-semibold">${currentPage} / ${totalPages}</span>
            <button class="pagination-btn bg-dark-border hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed" data-section-key="${key}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    };

    const renderAdminPanel = async () => {
        adminPanel.innerHTML = '';
        adminPanel.appendChild(adminPanelPlaceholder);
        // paginationState = {}; // No reiniciar la paginación en el renderizado completo para mantener la página del usuario

        const sectionPromises = Object.keys(sectionTemplates).map(async (key) => {
            const sectionInfo = sectionTemplates[key];
            const sourceArrayName = sectionInfo.source;
            if (!dataStore[sourceArrayName]) return;

            let dataForSection;
            if (sectionInfo.isSingle) {
                dataForSection = [{ item: dataStore[sourceArrayName], originalIndex: 0 }];
            } else {
                dataForSection = dataStore[sourceArrayName]
                    .map((item, index) => ({ item, originalIndex: index }))
                    .filter(entry => sectionInfo.filter(entry.item));
            }

            const augmentedData = await Promise.all(dataForSection.map(async (entry) => {
                let tmdbData, episodeData, seriesData;
                if (sectionInfo.isEpisodeCard) {
                    [episodeData, seriesData] = await Promise.all([
                        fetchTMDBEpisodeData(entry.item.id, entry.item.season, entry.item.episode),
                        fetchTMDBData(entry.item.id, entry.item.tipo)
                    ]);
                } else {
                    tmdbData = await fetchTMDBData(entry.item.id, entry.item.tipo);
                }
                const title = tmdbData ? (tmdbData.title || tmdbData.name) : (seriesData ? seriesData.name : '');
                const episodeTitle = episodeData ? `T${entry.item.season}:E${entry.item.episode} - ${episodeData.name}` : '';
                return { ...entry, tmdbData, episodeData, seriesData, title, episodeTitle };
            }));
            augmentedDataStore[key] = augmentedData;

            const section = document.createElement('section');
            section.id = `section-${key}`;
            section.style.display = 'none';
            section.classList.add(sectionInfo.isAdultSection ? 'adult-content-section' : 'normal-content-section');
            section.classList.add('p-4', 'sm:p-6', 'lg:p-8');
            
            const isAddable = !sectionInfo.isSingle;
            section.innerHTML = `
                <div class="section-header">
                    <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 class="text-xl sm:text-2xl font-bold text-white flex items-center gap-3"><i class="fas ${sectionInfo.icon} text-primary"></i> ${sectionInfo.title}</h3>
                        ${isAddable ? `<button class="add-btn text-sm bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-lg w-full sm:w-auto flex-shrink-0" data-section-key="${key}"><i class="fas fa-plus mr-2"></i> Añadir</button>` : ''}
                    </div>
                </div>
                <div id="container-${key}" class="card-grid min-h-[300px]"></div>
                <div id="pagination-${key}" class="flex justify-center items-center mt-6 space-x-2"></div>`;
            
            adminPanel.appendChild(section);
            renderSectionContent(key, augmentedData, sourceArrayName, sectionInfo.isEpisodeCard, sectionInfo.isFeaturedCard);
        });

        await Promise.all(sectionPromises);
    };

    const renderSectionContent = (key, data, sourceArrayName, isEpisodeCard = false, isFeaturedCard = false) => {
        const container = document.getElementById(`container-${key}`);
        if (isFeaturedCard) {
            container.classList.remove('card-grid');
            container.classList.add('featured-container');
        } else {
            container.classList.add('card-grid');
            container.classList.remove('featured-container');
        }
        const searchTerm = globalSearchInput.value.toLowerCase();

        const filteredData = searchTerm
            ? data.filter(entry =>
                (entry.title && entry.title.toLowerCase().includes(searchTerm)) ||
                (entry.episodeTitle && entry.episodeTitle.toLowerCase().includes(searchTerm))
              )
            : data;

        const paginationContainer = document.getElementById(`pagination-${key}`);
        if (!filteredData || filteredData.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-sm col-span-full text-center">No hay contenido que coincida con la búsqueda.</p>`;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
        let currentPage = paginationState[key] || 1;
        if (currentPage > totalPages) {
            currentPage = totalPages;
            paginationState[key] = currentPage;
        }
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        container.innerHTML = paginatedData.map(entry => {
            if (isFeaturedCard) return createFeaturedCardHTML(entry.item, sourceArrayName, entry.originalIndex, entry.tmdbData);
            if (isEpisodeCard) return createEpisodeCardHTML(entry.item, sourceArrayName, entry.originalIndex, entry.episodeData, entry.seriesData);
            return createStandardCardHTML(entry.item, sourceArrayName, entry.originalIndex, entry.tmdbData);
        }).join('');

        renderPaginationControls(key, filteredData.length);
    };

    const renderSidebarNav = () => {
        sidebarNav.innerHTML = '';
        const dashboardLink = document.createElement('a');
        dashboardLink.dataset.key = 'all';
        dashboardLink.className = 'sidebar-link flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition active cursor-pointer';
        dashboardLink.innerHTML = `<i class="fas fa-tachometer-alt w-5 text-center text-gray-400"></i><span>Dashboard</span>`;
        sidebarNav.appendChild(dashboardLink);

        Object.keys(sectionTemplates).forEach(key => {
             if(dataStore[sectionTemplates[key].source] || !sectionTemplates[key].isSingle) {
                const info = sectionTemplates[key];
                const link = document.createElement('a');
                link.dataset.key = key;
                link.className = 'sidebar-link flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition cursor-pointer';
                if (info.isAdultSection) {
                   link.classList.add('adult-content-section');
                } else {
                   link.classList.add('normal-content-section');
                }
                link.innerHTML = `<i class="fas ${info.icon} w-5 text-center text-gray-400"></i><span>${info.title}</span>`;
                sidebarNav.appendChild(link);
             }
        });
    };
    
    const activateSidebarSection = (keyToShow) => {
        sidebarNav.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const linkToActivate = sidebarNav.querySelector(`.sidebar-link[data-key="${keyToShow}"]`);
        if (linkToActivate) {
            linkToActivate.classList.add('active');
        }

        if (keyToShow === 'all') {
            headerTitle.textContent = 'Dashboard';
            globalSearchContainer.classList.add('hidden');
            adminPanelPlaceholder.style.display = 'block';
            adminPanel.querySelectorAll('section').forEach(section => section.style.display = 'none');
        } else {
            headerTitle.textContent = linkToActivate ? linkToActivate.querySelector('span').textContent : '';
            globalSearchContainer.classList.remove('hidden');
            const sectionInfo = sectionTemplates[keyToShow];
            globalSearchInput.placeholder = `Buscar en ${sectionInfo.title}...`;
            adminPanelPlaceholder.style.display = 'none';
            adminPanel.querySelectorAll('section').forEach(section => {
                section.style.display = section.id === `section-${keyToShow}` ? 'block' : 'none';
            });
        }
        globalSearchInput.value = '';
        rerenderSection(keyToShow);
    };

    const handleSidebarClick = (e) => {
        const link = e.target.closest('.sidebar-link');
        if (!link) return;
        
        if (window.innerWidth < 768) { // md breakpoint
            toggleSidebar();
        }
        activateSidebarSection(link.dataset.key);
    };

    // --- Lógica de Edición y CRUD ---
    const handleGlobalSearch = () => {
        const activeLink = sidebarNav.querySelector('.sidebar-link.active');
        if (activeLink) {
            const key = activeLink.dataset.key;
            if (key && key !== 'all') {
                paginationState[key] = 1; // Reset to first page on search
                rerenderSection(key);
            }
        }
    };

    const openDeleteModal = (arrayName, index) => {
        confirmDeleteBtn.dataset.arrayName = arrayName;
        confirmDeleteBtn.dataset.index = index;
        openModal(confirmationModal);
    };

    const handleDeleteConfirmation = async () => {
        const { arrayName, index } = confirmDeleteBtn.dataset;
        if (arrayName && index !== undefined) {
            const numericIndex = parseInt(index);
            if (Array.isArray(dataStore[arrayName])) {
                dataStore[arrayName].splice(numericIndex, 1);

                const activeLink = sidebarNav.querySelector('.sidebar-link.active');
                if (activeLink) {
                    const key = activeLink.dataset.key;
                    if (key && key !== 'all') {
                        // Re-augment and re-render only the current section to keep the user on the same page
                        const sectionInfo = sectionTemplates[key];
                        const sourceArrayName = sectionInfo.source;
                        
                        const dataForSection = dataStore[sourceArrayName]
                            .map((item, i) => ({ item, originalIndex: i }))
                            .filter(entry => sectionInfo.filter(entry.item));

                        const augmentedData = await Promise.all(dataForSection.map(async (entry) => {
                            let tmdbData, episodeData, seriesData;
                            if (sectionInfo.isEpisodeCard) {
                                [episodeData, seriesData] = await Promise.all([
                                    fetchTMDBEpisodeData(entry.item.id, entry.item.season, entry.item.episode),
                                    fetchTMDBData(entry.item.id, entry.item.tipo)
                                ]);
                            } else {
                                tmdbData = await fetchTMDBData(entry.item.id, entry.item.tipo);
                            }
                            const title = tmdbData ? (tmdbData.title || tmdbData.name) : (seriesData ? seriesData.name : '');
                            const episodeTitle = episodeData ? `T${entry.item.season}:E${entry.item.episode} - ${episodeData.name}` : '';
                            return { ...entry, tmdbData, episodeData, seriesData, title, episodeTitle };
                        }));
                        augmentedDataStore[key] = augmentedData;
                        
                        rerenderSection(key);
                    }
                }
                
                updateHtmlOutput();
                showToast('Elemento eliminado.');
            }
            closeModal(confirmationModal);
        }
    };

    const handleAdminPanelClick = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('toggle-visibility-btn')) {
            const container = btn.closest('.sensitive-content-container');
            if (container) {
                const img = container.querySelector('img');
                img.classList.toggle('blurred');
                btn.innerHTML = img.classList.contains('blurred') ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            }
            return;
        }

        // Handle pagination clicks
        if (btn.classList.contains('pagination-btn')) {
            const { sectionKey, page } = btn.dataset;
            paginationState[sectionKey] = parseInt(page);
            rerenderSection(sectionKey);
            return;
        }

        // Handle CRUD clicks
        const { arrayName, index, sectionKey } = btn.dataset;
        if (btn.classList.contains('add-btn')) openEditModal(sectionKey);
        if (btn.classList.contains('edit-btn')) openEditModal(arrayName, parseInt(index));
        if (btn.classList.contains('delete-btn')) {
            openDeleteModal(arrayName, parseInt(index));
        }
    };

    const openEditModal = (sectionKeyOrArrayName, index = -1) => {
        editForm.reset();
        const isNew = index === -1;
        let arrayName, data = {};
        const modalEpisodeDetails = document.getElementById('modal-episode-details');

        document.querySelectorAll('input[name="predefined_category"]').forEach(cb => cb.checked = false);
        document.getElementById('modal-categoria-custom').value = '';
        document.getElementById('modal-tipo').disabled = false;
        document.getElementById('modal-isAdult').disabled = false;
        modalEpisodeDetails.classList.add('hidden');

        if (isNew) {
            const sectionKey = sectionKeyOrArrayName;
            const sectionInfo = sectionTemplates[sectionKey];
            document.getElementById('modalTitle').textContent = `Añadir a ${sectionInfo.title}`;

            if (sectionKey === 'latestEpisodes') {
                arrayName = 'latestEpisodes';
                data = { tipo: 'tv', isAdult: false };
                modalEpisodeDetails.classList.remove('hidden');
                document.getElementById('modal-tipo').value = 'tv';
                document.getElementById('modal-tipo').disabled = true;
                document.getElementById('modal-isAdult').checked = false;
                document.getElementById('modal-isAdult').disabled = true;
            } else if (sectionKey === 'latestEpisodes18') {
                arrayName = 'latestEpisodes';
                data = { tipo: 'tv', isAdult: true };
                modalEpisodeDetails.classList.remove('hidden');
                document.getElementById('modal-tipo').value = 'tv';
                document.getElementById('modal-tipo').disabled = true;
                document.getElementById('modal-isAdult').checked = true;
                document.getElementById('modal-isAdult').disabled = true;
            } else {
                arrayName = 'contentDefinitionsFromDb';
                if (sectionKey === 'peliculas') data = { tipo: 'movie', isAdult: false, categoria: ['home'] };
                else if (sectionKey === 'series') data = { tipo: 'tv', isAdult: false, categoria: ['home'] };
                else if (sectionKey === 'peliculas18') data = { tipo: 'movie', isAdult: true, categoria: ['home'] };
                else if (sectionKey === 'series18') data = { tipo: 'tv', isAdult: true, categoria: ['home'] };
                else data = { categoria: ['home'] }; // Default for other new content
                document.getElementById('modal-tipo').disabled = true;
                document.getElementById('modal-isAdult').disabled = true;
            }
        } else {
            arrayName = sectionKeyOrArrayName;
            data = Array.isArray(dataStore[arrayName]) ? dataStore[arrayName][index] : dataStore[arrayName];
            document.getElementById('modalTitle').textContent = 'Editar Contenido';
            if (arrayName === 'latestEpisodes') {
                modalEpisodeDetails.classList.remove('hidden');
            }
        }
        
        document.getElementById('modal-array-name').value = arrayName;
        document.getElementById('modal-index').value = index;
        
        Object.keys(data).forEach(key => {
            const el = document.getElementById(`modal-${key}`);
            if (el) {
                if (el.type === 'checkbox') el.checked = data[key];
                else el.value = data[key];
            }
        });

        if (data.categoria && Array.isArray(data.categoria)) {
            const customCategories = [];
            data.categoria.forEach(cat => {
                const checkbox = document.querySelector(`input[name="predefined_category"][value="${cat}"]`);
                if (checkbox) checkbox.checked = true;
                else customCategories.push(cat);
            });
            document.getElementById('modal-categoria-custom').value = customCategories.join(', ');
            // Ensure 'home' checkbox is checked if it's in the categories for a new item
            if (isNew && data.categoria.includes('home')) {
                const homeCheckbox = document.querySelector(`input[name="predefined_category"][value="home"]`);
                if (homeCheckbox) homeCheckbox.checked = true;
            }
        }
        
        document.getElementById('modal-customUrl').value = data.customUrl || data.url || data.watchUrl || data.infoUrl || '';
        openModal(modal);
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        let selectedCategories = Array.from(document.querySelectorAll('input[name="predefined_category"]:checked')).map(cb => cb.value);
        const customCategories = document.getElementById('modal-categoria-custom').value.split(',').map(s => s.trim()).filter(Boolean);
        let finalCategories = [...new Set([...selectedCategories, ...customCategories])];
        
        const arrayName = document.getElementById('modal-array-name').value;
        const index = parseInt(document.getElementById('modal-index').value);
        const isNew = index === -1;

        let item = {
            id: parseInt(document.getElementById('modal-id').value),
            tipo: document.getElementById('modal-tipo').value,
            isAdult: document.getElementById('modal-isAdult').checked,
            customUrl: document.getElementById('modal-customUrl').value,
            categoria: finalCategories
        };

        if (arrayName === 'latestEpisodes') {
            item.season = parseInt(document.getElementById('modal-season').value);
            item.episode = parseInt(document.getElementById('modal-episode').value);
            item.tipo = 'tv';
        }
        
        if (item.id && !await fetchTMDBData(item.id, item.tipo)) {
            return; // fetchTMDBData already shows a toast on error
        }

        if (isNew) { 
            if (!dataStore[arrayName]) dataStore[arrayName] = [];
            dataStore[arrayName].push(item);
        } else {
             if (Array.isArray(dataStore[arrayName])) { 
                dataStore[arrayName][index] = item;
             } else {
                // This case is for single-item objects like 'explosivoContent'
                dataStore[arrayName] = { ...dataStore[arrayName], ...item };
                const obj = dataStore[arrayName];
                if (obj.hasOwnProperty('url')) obj.url = item.customUrl;
                if (obj.hasOwnProperty('watchUrl')) obj.watchUrl = item.customUrl;
                if (obj.hasOwnProperty('infoUrl')) obj.infoUrl = item.customUrl;
                delete obj.customUrl;
             }
        }
        
        closeModal(modal);
        
        // Get the currently active sidebar link's key before re-rendering
        const activeLinkBeforeSave = sidebarNav.querySelector('.sidebar-link.active');
        const activeKeyBeforeSave = activeLinkBeforeSave ? activeLinkBeforeSave.dataset.key : 'all';

        await renderAdminPanel(); // Await the full re-rendering and data augmentation
        renderSidebarNav(); // Re-render sidebar nav to ensure it's up-to-date
        updateHtmlOutput();
        showToast('Contenido guardado.');

        // Re-activate the previously active sidebar link to stay on the same section
        activateSidebarSection(activeKeyBeforeSave);
    };
    
    // --- Generación y Copia de HTML Final ---
    const updateHtmlOutput = () => {
        if (!htmlTemplateBase) {
            showToast('No se ha cargado un HTML base para generar.', true);
            return '';
        }

        let generatedHtml = htmlTemplateBase;
        let scriptToInject = '';

        Object.keys(dataStore).forEach(key => {
            if(dataStore[key]) {
                const dataString = JSON.stringify(dataStore[key], null, 4);
                scriptToInject += `\n    window.${key} = ${dataString};`;
            }
        });

        if (scriptToInject) {
            // Inject the script before the closing </body> tag
            const scriptBlock = `<script>${scriptToInject}\n</script>`;
            const bodyEndIndex = generatedHtml.lastIndexOf('</body>');
            if (bodyEndIndex !== -1) {
                generatedHtml = generatedHtml.substring(0, bodyEndIndex) + scriptBlock + '\n' + generatedHtml.substring(bodyEndIndex);
            } else {
                // Fallback if </body> not found, append to end
                generatedHtml += scriptBlock;
            }
        }
        return generatedHtml;
    };

    const generateAndShowHtml = () => {
        const finalHtml = updateHtmlOutput(); // Get the dynamically generated HTML
        if (!finalHtml) return; // updateHtmlOutput will show toast if no template
        document.getElementById('generatedHtmlOutput').value = finalHtml;
        openModal(generateHtmlModal);
    };
    
    const copyGeneratedHtml = () => {
        const output = document.getElementById('generatedHtmlOutput');
        output.focus();
        output.select();
        output.setSelectionRange(0, output.value.length);

        const onCopySuccess = () => {
            showToast('¡Código copiado al portapapeles!');
            copyGeneratedHtmlBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copiado!';
            copyGeneratedHtmlBtn.disabled = true;
            setTimeout(() => {
                copyGeneratedHtmlBtn.innerHTML = '<i class="fas fa-copy mr-2"></i>Copiar al Portapapeles';
                copyGeneratedHtmlBtn.disabled = false;
            }, 2000);
        };

        const onCopyError = (err) => {
            showToast('Error al copiar el código.', true);
            console.error('Error al copiar:', err);
        };

        if (navigator.clipboard) {
            navigator.clipboard.writeText(output.value).then(onCopySuccess).catch(onCopyError);
        } else {
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    onCopySuccess();
                } else {
                    onCopyError('document.execCommand failed');
                }
            } catch (err) {
                onCopyError(err);
            }
        }
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        modeNormalBtn.addEventListener('click', () => setMode(false));
        modeAdultBtn.addEventListener('click', () => setMode(true));
        mobileMenuBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        openLoadModalBtn.addEventListener('click', () => openModal(loadHtmlModal));
        cancelLoadBtn.addEventListener('click', () => closeModal(loadHtmlModal));
        closeGeneratedHtmlBtn.addEventListener('click', () => closeModal(generateHtmlModal));
        tabCode.addEventListener('click', () => switchTab('code'));
        tabUrl.addEventListener('click', () => switchTab('url'));
        processHtmlBtn.addEventListener('click', processHtml);
        sidebarNav.addEventListener('click', handleSidebarClick);
        adminPanel.addEventListener('click', handleAdminPanelClick);
        globalSearchInput.addEventListener('input', handleGlobalSearch);
        cancelBtn.addEventListener('click', () => closeModal(modal));
        modalBackBtn.addEventListener('click', () => closeModal(modal));
        editForm.addEventListener('submit', handleFormSubmit);
        generateHtmlBtn.addEventListener('click', generateAndShowHtml);
        copyGeneratedHtmlBtn.addEventListener('click', copyGeneratedHtml);

        // Delete confirmation modal
        cancelDeleteBtn.addEventListener('click', () => closeModal(confirmationModal));
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
    };

    // --- Initialize ---
    initializeApp();
});

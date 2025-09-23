// DOM Elements
        const mediaIdInput = document.getElementById('media-id');
        const seasonNumberInput = document.getElementById('season-number');
        const episodeNumberInput = document.getElementById('episode-number');
        const themeSelectInput = document.getElementById('theme-select');
        const previewContainer = document.getElementById('preview-container');
        const generateButton = document.getElementById('generate-button');
        const fetchSeriesButton = document.getElementById('fetch-series-button');
        const seasonsManagerContainer = document.getElementById('seasons-manager-container');
        const episodesManagerContainer = document.getElementById('episodes-manager-container');
        const addSeasonBtn = document.getElementById('add-season-btn');
        
        // --- DATA STORE ---
        const TMDB_API_KEY = '4ca9f3b2b92afe069f1145bf132b1edf';
        
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
        const fetchTMDBSeriesData = (id) => fetchTMDBData(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=es-ES`, 'No se encontró la serie');
        const fetchTMDBEpisodeData = (seriesId, seasonNum, episodeNum) => fetchTMDBData(`https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNum}/episode/${episodeNum}?api_key=${TMDB_API_KEY}&language=es-ES`, 'No se encontró el episodio');

        // --- UI RENDERING ---
        const updateSeriesInfoPanel = (data) => {
            if (!data) return;
            const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://placehold.co/500x750/1e293b/475569?text=Sin+Póster';
            const year = data.first_air_date ? data.first_air_date.split('-')[0] : 'N/D';
            previewContainer.innerHTML = `
                <div class="text-center w-full">
                    <img src="${posterUrl}" alt="Póster de ${data.name}" class="rounded-lg shadow-lg mx-auto mb-4 max-h-60">
                    <h3 class="text-xl font-bold text-white">${data.name} (${year})</h3>
                </div>`;
        };
        
        const createEpisodeCard = (container, episodeData = null) => {
             const card = document.createElement('div');
             card.className = 'episode-card bg-slate-900/50 rounded-lg p-3 space-y-3';
             const episodeNumber = episodeData?.episode_number || '';
             card.innerHTML = `
                <div class="flex items-center gap-2 border-b border-slate-700 pb-3">
                    <label class="text-sm font-semibold">Episodio #${episodeNumber}</label>
                    <input type="hidden" class="episode-number-input" value="${episodeNumber}">
                    <button class="refetch-episode-btn bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded-md ml-auto" aria-label="Refrescar Datos"><i class="fas fa-sync-alt"></i></button>
                    <button class="delete-episode-btn text-red-400 hover:text-red-300"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="episode-details-container min-h-[50px] flex items-center justify-center text-slate-500">
                    <i class="fas fa-spinner fa-spin text-2xl"></i>
                </div>
             `;
             container.appendChild(card);
             
             const fetchAndUpdateDetails = async () => {
                 const seriesId = mediaIdInput.value;
                 const seasonNum = card.closest('.episode-season-panel').dataset.seasonNumber;
                 const episodeNum = episodeData.episode_number;

                 if (seriesId && seasonNum && episodeNum) {
                     const data = await fetchTMDBEpisodeData(seriesId, seasonNum, episodeNum);
                     if (data) {
                         // Preserve the original URL
                         data.url = episodeData.url;
                         updateEpisodeCardDetails(card, data);
                     } else {
                         card.querySelector('.episode-details-container').textContent = 'No se encontraron datos.';
                     }
                 }
             };

             card.querySelector('.delete-episode-btn').addEventListener('click', () => {
                showConfirmation('¿Seguro que quieres eliminar este episodio?', () => card.remove());
             });
             card.querySelector('.refetch-episode-btn').addEventListener('click', fetchAndUpdateDetails);

             if(episodeData) {
                 fetchAndUpdateDetails();
             }
        };

        const updateEpisodeCardDetails = (cardElement, data) => {
            const detailsContainer = cardElement.querySelector('.episode-details-container');
            const stillPath = data.still_path ? `https://image.tmdb.org/t/p/w300${data.still_path}` : 'https://placehold.co/300x169/1e293b/475569?text=Sin+Imagen';
            
            detailsContainer.innerHTML = `
                 <div class="flex flex-col md:flex-row gap-4 w-full">
                    <img src="${stillPath}" alt="Miniatura" class="w-full md:w-40 h-auto rounded-md object-cover">
                    <div class="flex-grow space-y-2">
                        <h4 class="font-bold text-white">${data.episode_number}. ${data.name || 'Episodio sin título'}</h4>
                        <input type="text" class="episode-url-input form-input w-full p-2 rounded-md text-sm" placeholder="URL del episodio (ej: go:...)" value="${data.url || ''}">
                    </div>
                </div>
            `;
            cardElement.dataset.episodeData = JSON.stringify(data);
        };

        const createSeasonBlockForSeasonsView = (seasonNumber = '') => {
             const block = document.createElement('div');
             block.className = 'season-block-for-season-view bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between transition-all hover:border-orange-500';
             block.innerHTML = `
                <div class="flex items-center gap-3">
                     <i class="fas fa-layer-group text-slate-400"></i>
                     <label class="font-bold text-white">Temporada #</label>
                     <input type="number" min="0" class="season-number-input form-input w-24 p-2 rounded-md text-sm" value="${seasonNumber}">
                </div>
                <button class="delete-season-btn text-red-400 hover:text-red-300 transition-colors"><i class="fas fa-trash-alt fa-lg"></i></button>
             `;
             seasonsManagerContainer.appendChild(block);
             block.querySelector('.delete-season-btn').addEventListener('click', () => {
                showConfirmation('¿Seguro que quieres eliminar esta temporada y todos sus episodios?', () => block.remove());
             });
        };

        const createSeasonTabAndPanel = (seasonNumber) => {
            if (!seasonNumber) return;
            // Create Tab
            const tabButton = document.createElement('button');
            tabButton.className = 'season-tab whitespace-nowrap flex-1 md:flex-none text-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-slate-700 hover:text-white transition-colors';
            tabButton.textContent = `Temporada ${seasonNumber}`;
            tabButton.dataset.seasonNumber = seasonNumber;
            document.getElementById('episode-season-tabs').appendChild(tabButton);

            // Create Panel
            const panel = document.createElement('div');
            panel.className = 'episode-season-panel hidden';
            panel.dataset.seasonNumber = seasonNumber;
            panel.innerHTML = `
                <div class="episodes-list-container grid grid-cols-1 xl:grid-cols-2 gap-4"></div>
                <button class="add-episode-btn mt-4 w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-2 rounded-md text-sm flex items-center justify-center gap-1 transition-colors">
                    <i class="fas fa-plus-circle"></i> Añadir Episodio
                </button>
            `;
            document.getElementById('episode-season-panels').appendChild(panel);
            
            panel.querySelector('.add-episode-btn').addEventListener('click', () => {
                showAddEpisodeModal(seasonNumber);
            });
            
            tabButton.addEventListener('click', () => {
                document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.episode-season-panel').forEach(p => p.classList.add('hidden'));
                tabButton.classList.add('active');
                panel.classList.remove('hidden');
            });

            return panel;
        };
        
        // --- DATA COMPILATION & GENERATION ---
        const buildJsonFromDOM = () => {
             const mediaId = mediaIdInput.value || '0';
             
             const seasonsData = {};
             document.querySelectorAll('.episode-season-panel').forEach(panelEl => {
                 const seasonNum = panelEl.dataset.seasonNumber;
                 if (!seasonNum) return;
                 
                 const episodesData = [];
                 panelEl.querySelectorAll('.episode-card').forEach(cardEl => {
                     const episodeNumInput = cardEl.querySelector('.episode-number-input');
                     const urlInput = cardEl.querySelector('.episode-url-input');
                     if (episodeNumInput && urlInput && episodeNumInput.value && urlInput.value) {
                         episodesData.push({
                             episode_number: parseInt(episodeNumInput.value, 10),
                             episode_type: "regular",
                             url: urlInput.value
                         });
                     }
                 });
                 if (episodesData.length > 0) {
                     seasonsData[seasonNum] = episodesData.sort((a,b) => a.episode_number - b.episode_number);
                 }
             });
             
             const finalObject = { [mediaId]: seasonsData };
             return JSON.stringify(finalObject, null, 2);
        };

        const generateFinalHTML = (mediaId, season, episode, episodesJson, theme) => {
            return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cargando...</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-900 text-white">
  <script type="module">
    const indexHtmlContent = \`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yami Lat - Tu Guía de Anime</title>
  <script src="https://cdn.tailwindcss.com"><\\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/geminiproai37-blip/adsdsdsds@main/series/style.css" />
</head>
<body class="bg-gray-900 text-white" data-default-theme="${theme}">
  <div id="fb-root"></div>
  <script>
    window.fbAsyncInit = function() {
      FB.init({
        appId: "1320266426121861",
        xfml: true,
        version: "v18.0"
      });
      FB.AppEvents.logPageView();
    };
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if(d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/es_LA/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  <\\/script>

  <div id="local-media-data" data-media-type="tv" data-media-id="${mediaId}" data-season-number="${season}" data-episode-number="${episode}" data-episode-type="regular" class="hidden"></div>

  <script id="local-episodes-db" type="application/json">
  ${episodesJson}
  <\\/script>

  <div id="app-root"></div>
  <div id="notification-container" class="fixed bottom-4 right-4 z-50"></div>

  <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/adsdsdsds@main/series/main.js"><\\/script>
  <script src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/adsdsdsds@main/series/lazy-loader.js"><\\/script>
  <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/adsdsdsds@main/series/script.js"><\\/script>
</body>
</html>
\`;
    document.open();
    document.write(indexHtmlContent);
    document.close();
  <\/script>
</body>
</html>`;
        };
        
        // --- EVENT HANDLERS ---
        const handleFetchSeries = async () => {
             const seriesData = await fetchTMDBSeriesData(mediaIdInput.value);
             updateSeriesInfoPanel(seriesData);
        };
        
        const handleGenerate = () => {
            updateEpisodesView();
            const mediaId = mediaIdInput.value || '0';
            const season = seasonNumberInput.value || '1';
            const episode = episodeNumberInput.value || '1';
            const theme = themeSelectInput.value || 'orange';
            const episodesJson = buildJsonFromDOM();
            
            const finalHTML = generateFinalHTML(mediaId, season, episode, episodesJson, theme);
            document.getElementById('html-output').value = finalHTML;
            toggleCodeModal(true);
        };
        
        const handleLoadFromURL = async () => {
          const urlInput = document.getElementById('load-url-input');
          const url = urlInput.value.trim();
          if (!url) {
              throw new Error('Por favor, introduce una URL.');
          }
          // Using a CORS proxy to fetch content
          const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          if (!response.ok) {
              throw new Error(`Error al cargar la URL: ${response.statusText}`);
          }
          const htmlContent = await response.text();
          await handleLoadFromCode(htmlContent);
        };

        const handleLoadFromCode = async (content) => {
            const mainContentRegex = /const indexHtmlContent = \s*\`([\s\S]*?)\`;/;
            const mainContentMatch = content.match(mainContentRegex);
            
            if (!mainContentMatch || !mainContentMatch[1]) {
                throw new Error("No se pudo encontrar el contenido principal en el código HTML. Asegúrate de pegar el código completo y válido.");
            }
            
            const innerHtml = mainContentMatch[1];

            const mediaIdMatch = innerHtml.match(/data-media-id="([^"]+)"/);
            const seasonNumMatch = innerHtml.match(/data-season-number="([^"]+)"/);
            const episodeNumMatch = innerHtml.match(/data-episode-number="([^"]+)"/);
            const themeMatch = innerHtml.match(/data-default-theme="([^"]+)"/);
            const jsonRegex = /<script id="local-episodes-db"[^>]*>\s*([\s\S]*?)\s*<\\\/script>/;
            const jsonMatch = innerHtml.match(jsonRegex);

            if (mediaIdMatch) mediaIdInput.value = mediaIdMatch[1];
            if (seasonNumMatch) seasonNumberInput.value = seasonNumMatch[1];
            if (episodeNumMatch) episodeNumberInput.value = episodeNumMatch[1];
            if (themeMatch) themeSelectInput.value = themeMatch[1];

            await handleFetchSeries();

            if (jsonMatch && jsonMatch[1]) {
                try {
                    const data = JSON.parse(jsonMatch[1].trim());
                    const seriesId = Object.keys(data)[0];
                    if (seriesId && seriesId !== mediaIdInput.value) {
                         mediaIdInput.value = seriesId;
                         await handleFetchSeries();
                    }

                    // Limpiar la UI antes de cargar nuevos datos
                    seasonsManagerContainer.innerHTML = '';
                    document.getElementById('episode-season-tabs').innerHTML = '';
                    document.getElementById('episode-season-panels').innerHTML = '';
                    
                    const seasons = data[seriesId] || {};
                    const seasonKeys = Object.keys(seasons);

                    if (seasonKeys.length === 0) {
                        alert("Advertencia: Se cargó el archivo, pero no se encontraron datos de temporadas o episodios en él.");
                    }

                    seasonKeys.forEach(sNum => createSeasonBlockForSeasonsView(sNum));

                    updateEpisodesView();

                    seasonKeys.forEach(sNum => {
                        const panel = document.querySelector(`.episode-season-panel[data-season-number="${sNum}"]`);
                        if(panel) {
                            const container = panel.querySelector('.episodes-list-container');
                            seasons[sNum].forEach(ep => {
                                createEpisodeCard(container, ep);
                            });
                        }
                    });
                } catch(e) {
                    console.error("JSON Parse Error:", e);
                    console.log("Failed to parse:", jsonMatch[1]);
                    throw new Error('Error al analizar el JSON del código HTML. Asegúrate de copiar el código completo y sin modificaciones.');
                }
            } else {
                 alert("No se pudo encontrar la base de datos de episodios en el código HTML. La información de temporadas y episodios no será cargada.");
            }
        };
        
        // --- NAVIGATION & VIEW SWITCHING ---
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const viewSections = document.querySelectorAll('.view-section');

        const updateEpisodesView = () => {
            const seasonInputs = seasonsManagerContainer.querySelectorAll('.season-number-input');
            const targetSeasonNumbers = new Set();
            seasonInputs.forEach(input => {
                if (input.value) targetSeasonNumbers.add(input.value);
            });

            const tabsContainer = document.getElementById('episode-season-tabs');
            const panelsContainer = document.getElementById('episode-season-panels');
            const currentTabs = new Map();
            tabsContainer.querySelectorAll('.season-tab').forEach(t => currentTabs.set(t.dataset.seasonNumber, t));
            
            targetSeasonNumbers.forEach(sNum => {
                if (!currentTabs.has(sNum)) {
                    createSeasonTabAndPanel(sNum);
                }
                currentTabs.delete(sNum);
            });
            
            currentTabs.forEach((tab, sNum) => {
                tab.remove();
                panelsContainer.querySelector(`.episode-season-panel[data-season-number="${sNum}"]`)?.remove();
            });

            const firstTab = tabsContainer.querySelector('.season-tab:first-child');
            if(firstTab && !tabsContainer.querySelector('.season-tab.active')) {
                firstTab.click();
            }
            
            if (tabsContainer.children.length === 0) {
                 panelsContainer.innerHTML = `<p class="text-center text-slate-400">Añade al menos una temporada en la sección "Temporadas" para empezar a gestionar episodios.</p>`;
            }
        };


        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                
                if (targetId === 'episodes-view') {
                    updateEpisodesView();
                }

                viewSections.forEach(section => {
                    section.classList.add('hidden');
                });
                document.getElementById(targetId).classList.remove('hidden');

                sidebarLinks.forEach(l => l.classList.remove('active'));
                document.querySelectorAll(`.sidebar-link[href="#${targetId}"]`).forEach(activeLink => {
                    activeLink.classList.add('active');
                });
            });
        });

        // Mobile sidebar toggle
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
        
        // --- MODAL CONTROLS ---
        const loadModal = document.getElementById('load-modal');
        const codeModal = document.getElementById('code-modal');
        const confirmationModal = document.getElementById('confirmation-modal');
        const addEpisodeModal = document.getElementById('add-episode-modal');
        const loadModalContent = document.getElementById('load-modal-content');
        const codeModalContent = document.getElementById('code-modal-content');
        const confirmationModalContent = document.getElementById('confirmation-modal-content');
        const addEpisodeModalContent = document.getElementById('add-episode-modal-content');
        const confirmationMessage = document.getElementById('confirmation-message');
        let onConfirmAction = null;
        let currentSeasonForAdd = null;

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
        const toggleAddEpisodeModal = (show) => {
            if (!show) currentSeasonForAdd = null;
            toggleModal(addEpisodeModal, addEpisodeModalContent, show);
        }
        const showConfirmation = (message, onConfirm) => {
            confirmationMessage.textContent = message || 'Esta acción no se puede deshacer.';
            onConfirmAction = onConfirm;
            toggleConfirmationModal(true);
        };
        const showAddEpisodeModal = (seasonNumber) => {
            currentSeasonForAdd = seasonNumber;
            document.getElementById('new-episode-number').value = '';
            document.getElementById('new-episode-url').value = '';
            toggleAddEpisodeModal(true);
        }


        const handleEpisodeSearch = (event) => {
            const searchTerm = event.target.value.toLowerCase();
            document.querySelectorAll('.episode-card').forEach(card => {
                const episodeName = card.querySelector('h4')?.textContent.toLowerCase() || '';
                const episodeNumber = card.querySelector('.episode-number-input')?.value || '';
                
                const nameMatches = episodeName.includes(searchTerm);
                const numberMatches = episodeNumber.includes(searchTerm);

                if (nameMatches || numberMatches) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        };

        // --- INITIALIZATION ---
        document.getElementById('episode-search-input').addEventListener('input', handleEpisodeSearch);
        fetchSeriesButton.addEventListener('click', handleFetchSeries);
        addSeasonBtn.addEventListener('click', () => createSeasonBlockForSeasonsView());
        generateButton.addEventListener('click', handleGenerate);
        document.addEventListener('DOMContentLoaded', handleFetchSeries);

        // Modal Listeners
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
                    if (panel.id === targetPanelId) {
                        panel.classList.remove('hidden');
                    } else {
                        panel.classList.add('hidden');
                    }
                });
            });
        });

        document.getElementById('confirm-load-button').addEventListener('click', async () => {
            const activeTab = document.querySelector('.load-tab.active').dataset.tab;
            const loadBtn = document.getElementById('confirm-load-button');
            const originalText = loadBtn.querySelector('span').textContent;
            
            loadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Cargando...</span>`;
            loadBtn.disabled = true;

            try {
                if (activeTab === 'from-text') {
                    const code = document.getElementById('load-html-input').value;
                    if (!code.trim()) {
                        throw new Error("El campo de texto está vacío.");
                    }
                    await handleLoadFromCode(code);
                } else if (activeTab === 'from-url') {
                    await handleLoadFromURL();
                }
                toggleLoadModal(false);
            } catch (error) {
                alert(`No se pudo cargar el contenido. Error: ${error.message}`);
                console.error(error);
            } finally {
                loadBtn.innerHTML = `<i class="fas fa-cloud-download-alt"></i> <span>${originalText}</span>`;
                loadBtn.disabled = false;
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
        document.getElementById('close-add-episode-modal-button').addEventListener('click', () => toggleAddEpisodeModal(false));
        document.getElementById('cancel-add-episode-button').addEventListener('click', () => toggleAddEpisodeModal(false));
        document.getElementById('confirm-add-episode-button').addEventListener('click', () => {
            const episodeNumber = document.getElementById('new-episode-number').value;
            const episodeUrl = document.getElementById('new-episode-url').value;
            if(currentSeasonForAdd && episodeNumber && episodeUrl) {
                const panel = document.querySelector(`.episode-season-panel[data-season-number="${currentSeasonForAdd}"]`);
                if(panel) {
                    const container = panel.querySelector('.episodes-list-container');
                    createEpisodeCard(container, { episode_number: episodeNumber, url: episodeUrl });
                }
                toggleAddEpisodeModal(false);
            } else {
                alert('Por favor, completa el número y la URL del episodio.');
            }
        });

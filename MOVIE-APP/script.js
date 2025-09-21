// DOM Elements
const backButtonLink = document.getElementById('back-button-link');
const mediaIdInput = document.getElementById('media-id');
const playUrlInput = document.getElementById('play-url');
const themeSelectInput = document.getElementById('theme-select');
const previewContainer = document.getElementById('preview-container');
const generateButton = document.getElementById('generate-button');
const generateButtonText = document.getElementById('generate-button-text');
const fetchPreviewButton = document.getElementById('fetch-preview-button');

// Load Modal Elements
const loadModal = document.getElementById('load-modal');
const loadModalContent = document.getElementById('load-modal-content');
const showLoadModalButton = document.getElementById('show-load-modal-button');
const closeLoadModalButton = document.getElementById('close-load-modal-button');
const cancelLoadButton = document.getElementById('cancel-load-button');
const confirmLoadButton = document.getElementById('confirm-load-button');
const loadHtmlInput = document.getElementById('load-html-input');
const loadUrlInput = document.getElementById('load-url-input');
const tabPaste = document.getElementById('tab-paste');
const tabUrl = document.getElementById('tab-url');
const tabContentPaste = document.getElementById('tab-content-paste');
const tabContentUrl = document.getElementById('tab-content-url');

// Code Modal Elements
const codeModal = document.getElementById('code-modal');
const codeModalContent = document.getElementById('code-modal-content');
const closeCodeModalButton = document.getElementById('close-code-modal-button');
const doneCodeButton = document.getElementById('done-code-button');
const copyButton = document.getElementById('copy-button');
const copyText = document.getElementById('copy-text');
const htmlOutput = document.getElementById('html-output');

// --- API & DATA ---
const TMDB_API_KEY = 'b619bab44d405bb6c49b14dfc7365b51';

const fetchTMDBData = async (id) => {
    if (!TMDB_API_KEY) {
        alert('Error de Configuración: Falta la clave de API de TMDB.');
        return null;
    }
    if (!id) {
        alert('Por favor, introduce un ID de TMDB.');
        return null;
    }
    const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=es-ES`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`No se encontró la película. Código: ${response.status}`);
        const data = await response.json();
        return { 
            title: data.title || data.name, 
            posterPath: data.poster_path,
            year: data.release_date ? data.release_date.split('-')[0] : 'N/D'
        };
    } catch (error) {
        console.error("Error al obtener datos de TMDB:", error);
        alert(`Error al cargar datos de TMDB: ${error.message}`);
        return null;
    }
};

const updatePreview = (data) => {
    if (data && data.posterPath) {
        const posterUrl = `https://image.tmdb.org/t/p/w500${data.posterPath}`;
        previewContainer.innerHTML = `
            <div class="text-center w-full">
                <img src="${posterUrl}" alt="Póster de ${data.title}" class="rounded-lg shadow-lg mx-auto mb-4 max-h-80">
                <h3 class="text-xl font-bold text-white">${data.title} (${data.year})</h3>
            </div>`;
    } else if (data) {
         previewContainer.innerHTML = `
            <div class="text-center w-full">
                <div class="w-48 h-72 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-image text-5xl text-slate-500"></i>
                </div>
                <h3 class="text-xl font-bold text-white">${data.title} (${data.year})</h3>
                <p class="text-sm text-yellow-400">No se encontró póster.</p>
            </div>`;
    } else {
         previewContainer.innerHTML = `<div class="text-center text-gray-500"><i class="fas fa-film text-4xl mb-2"></i><p>Busca un ID para ver la vista previa</p></div>`;
    }
};

const generateHTML = (mediaType, mediaId, playUrl, theme) => {
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
    // Parámetros definidos dinámicamente
    const mediaId = "${mediaId}";
    const mediaType = "${mediaType}";
    const playUrl = "${playUrl}";
    const themeParam = "${theme}";

    const indexHtmlContent = \`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yami Lat - Tu Guía de Anime</title>
  <script src="https://cdn.tailwindcss.com"><\\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/geminiproai37-blip/y4m1@latest/movie_app_/style.css"/>
</head>
<body class="bg-gray-900 text-white \${themeParam}-theme">
  <div id="fb-root"></div>
  <script type="module">
    import { fbAppId } from "https://cdn.jsdelivr.net/gh/geminiproai37-blip/y4m1@latest/movie_app_/config.js";
    const fbSdkScript = document.createElement("script");
    fbSdkScript.async = true; fbSdkScript.defer = true; fbSdkScript.crossOrigin = "anonymous";
    fbSdkScript.src = \\\`https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v18.0&appId=\\\${fbAppId}\\\`;
    fbSdkScript.nonce = crypto.randomUUID(); document.head.appendChild(fbSdkScript);
  <\\/script>
  <div id="local-media-data" data-media-type="\${mediaType}" data-media-id="\${mediaId}" data-play-url-template="\${playUrl}" class="hidden"></div>
  <div id="app-root"></div>
  <div id="notification-container" class="fixed bottom-4 right-4 z-50"></div>
  <script type="module" src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/y4m1@latest/movie_app_/main.js" defer><\\/script>
  <script src="https://cdn.jsdelivr.net/gh/geminiproai37-blip/y4m1@latest/movie_app_/lazy-loader.js" defer><\\/script>
<script>
    function updateAdultContentButtonVisibility() {
      const adultContentEnabled = localStorage.getItem("adultContentEnabled") === "true";
      const adultContentNavLink = document.querySelector('a[data-section="adult-content"]');
      if (adultContentNavLink) { adultContentNavLink.style.display = adultContentEnabled ? 'flex' : 'none'; }
    }
    document.addEventListener("DOMContentLoaded", () => {
      updateAdultContentButtonVisibility();
      const urlParams = new URLSearchParams(window.location.search);
      const themeFromUrl = urlParams.get("theme"); const defaultTheme = "${theme}";
      let themeToApply = (themeFromUrl && themeFromUrl !== "default") ? themeFromUrl : defaultTheme;
      document.body.classList.remove('purple-theme', 'orange-theme');
      document.body.classList.add(themeToApply + "-theme");
    });
    window.addEventListener("storage", updateAdultContentButtonVisibility);
<\\/script>
  <nav class="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 flex justify-around p-2 z-50">
      <a href="#" aria-label="Inicio" data-section="home" class="nav-link flex flex-col items-center text-gray-400 w-1/4 py-1 rounded-lg"><i class="fas fa-home text-lg"></i><span class="text-xs">Inicio</span></a>
      <a href="#" aria-label="Explorar" data-section="explorar" class="nav-link flex flex-col items-center text-gray-400 w-1/4 py-1 rounded-lg"><i class="fas fa-compass text-lg"></i><span class="text-xs">Explorar</span></a>
      <a href="#" aria-label="Favoritos" data-section="favoritos" class="nav-link flex flex-col items-center text-gray-400 w-1/4 py-1 rounded-lg"><i class="fas fa-heart text-lg"></i><span class="text-xs">Favoritos</span></a>
      <a href="#" aria-label="+18" data-section="adult-content" class="nav-link flex flex-col items-center text-gray-400 w-1/4 py-1 rounded-lg"><i class="fas fa-fire text-lg"></i><span class="text-xs">+18</span></a>
      <a href="#" aria-label="Config" data-section="configuracion" class="nav-link flex flex-col items-center text-gray-400 w-1/4 py-1 rounded-lg"><i class="fas fa-cog text-lg"></i><span class="text-xs">Config</span></a>
    </nav>
</body>
</html>\`;
    document.open(); document.write(indexHtmlContent); document.close();
  <\/script>
</body>
</html>`;
};

// --- EVENT HANDLERS ---
const handleFetchPreview = async () => {
     const tmdbData = await fetchTMDBData(mediaIdInput.value);
     updatePreview(tmdbData);
};

const handleGenerate = async () => {
    generateButton.disabled = true;
    generateButtonText.textContent = "Generando...";

    const mediaType = 'movie';
    const mediaId = mediaIdInput.value;
    const playUrl = playUrlInput.value;
    const theme = themeSelectInput.value;
    
    const tmdbData = await fetchTMDBData(mediaId);
    if (!tmdbData) {
        generateButton.disabled = false;
        generateButtonText.textContent = "Generar HTML";
        return;
    }

    const generatedHtml = generateHTML(mediaType, mediaId, playUrl, theme);
    htmlOutput.value = generatedHtml;
    toggleCodeModal(true);
    
    generateButton.disabled = false;
    generateButtonText.textContent = "Generar HTML";
};

const handleLoadFromCode = () => {
    const content = loadHtmlInput.value;
    if (!content) { alert("Pega el código en el área de texto primero."); return; }
    try {
        const mediaIdMatch = content.match(/const mediaId = "([^"]+)"/);
        const playUrlMatch = content.match(/const playUrl = "([^"]+)"/);
        const themeMatch = content.match(/const themeParam = "([^"]+)"/);
        if (!mediaIdMatch || !playUrlMatch || !themeMatch) throw new Error("No se pudieron encontrar todos los parámetros.");

        mediaIdInput.value = mediaIdMatch[1];
        playUrlInput.value = playUrlMatch[1];
        themeSelectInput.value = themeMatch[1];

        handleFetchPreview();
        toggleLoadModal(false);
    } catch (error) {
        alert("Error al cargar: " + error.message);
    }
};

const handleLoadFromURL = async () => {
    const url = loadUrlInput.value;
    if (!url) {
        alert("Por favor, ingresa una URL.");
        return;
    }

    try {
        // Usar un proxy para evitar problemas de CORS si es necesario
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`No se pudo obtener el contenido de la URL. Estado: ${response.status}`);
        const content = await response.text();
        
        // Reutilizar la lógica de parseo
        const mediaIdMatch = content.match(/const mediaId = "([^"]+)"/);
        const playUrlMatch = content.match(/const playUrl = "([^"]+)"/);
        const themeMatch = content.match(/const themeParam = "([^"]+)"/);

        if (!mediaIdMatch || !playUrlMatch || !themeMatch) throw new Error("El contenido de la URL no tiene el formato esperado.");

        mediaIdInput.value = mediaIdMatch[1];
        playUrlInput.value = playUrlMatch[1];
        themeSelectInput.value = themeMatch[1];

        await handleFetchPreview();
        toggleLoadModal(false);

    } catch (error) {
        console.error("Error al cargar desde URL:", error);
        alert("Error al cargar desde URL: " + error.message);
    }
};

// --- MODAL CONTROLS ---
const toggleLoadModal = (show) => {
    if(show) {
        loadModal.classList.remove('hidden');
        setTimeout(() => { loadModalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    } else {
        loadModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { loadModal.classList.add('hidden'); }, 300);
    }
}

 const toggleCodeModal = (show) => {
    if(show) {
        codeModal.classList.remove('hidden');
        setTimeout(() => { codeModalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    } else {
        codeModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { codeModal.classList.add('hidden'); }, 300);
    }
}

// --- EVENT LISTENERS ---
generateButton.addEventListener('click', handleGenerate);
fetchPreviewButton.addEventListener('click', handleFetchPreview);

backButtonLink.addEventListener('click', (e) => {
    // **IMPORTANTE**: Cambia esta URL por la que necesites
    const returnUrl = "../index.html";
    e.preventDefault(); 
    window.location.href = returnUrl;
});

copyButton.addEventListener('click', () => {
    htmlOutput.select();
    document.execCommand('copy');
    copyText.textContent = '¡Copiado!';
    copyButton.classList.add('bg-green-600');
    setTimeout(() => {
        copyText.textContent = 'Copiar';
        copyButton.classList.remove('bg-green-600');
    }, 2000);
});

// Load Modal Listeners
showLoadModalButton.addEventListener('click', () => toggleLoadModal(true));
closeLoadModalButton.addEventListener('click', () => toggleLoadModal(false));
cancelLoadButton.addEventListener('click', () => toggleLoadModal(false));
confirmLoadButton.addEventListener('click', () => {
    if (!tabContentPaste.classList.contains('hidden')) {
        handleLoadFromCode();
    } else {
        handleLoadFromURL();
    }
});

tabPaste.addEventListener('click', () => {
    tabContentPaste.classList.remove('hidden');
    tabContentUrl.classList.add('hidden');
    tabPaste.classList.add('text-orange-500', 'border-orange-500');
    tabUrl.classList.remove('text-orange-500', 'border-orange-500');
    tabUrl.classList.add('text-gray-400', 'hover:text-white', 'hover:border-gray-300');
});

tabUrl.addEventListener('click', () => {
    tabContentUrl.classList.remove('hidden');
    tabContentPaste.classList.add('hidden');
    tabUrl.classList.add('text-orange-500', 'border-orange-500');
    tabPaste.classList.remove('text-orange-500', 'border-orange-500');
    tabPaste.classList.add('text-gray-400', 'hover:text-white', 'hover:border-gray-300');
});


// Code Modal Listeners
closeCodeModalButton.addEventListener('click', () => toggleCodeModal(false));
doneCodeButton.addEventListener('click', () => toggleCodeModal(false));

// Initial preview fetch on load
document.addEventListener('DOMContentLoaded', handleFetchPreview);

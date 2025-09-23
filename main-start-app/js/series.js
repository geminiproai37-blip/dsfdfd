// This script will handle the dynamic content for the series section.

// Keep track of media posters that have already been loaded across page views.
const loadedMediaIds = new Set();

// Expose a function to initialize the series page content
window.initSeriesPageContent = (
  appMainContentElement, // Changed to appMainContentElement
  allMediaDetails,
  imageBaseUrl
) => {
  // Add styles for the new Hentai sub-category filter
  const style = document.createElement('style');
  style.textContent = `
    .hentai-category-filter {
        background-color: #2d2d3a;
        border: 1px solid #4c2a85;
        color: #d1c4e9;
        border-radius: 9999px;
    }
    .hentai-category-filter.active {
        background-color: #673ab7;
        color: white;
        font-weight: bold;
        box-shadow: 0 0 10px rgba(103, 58, 183, 0.7);
    }
  `;
  appMainContentElement.prepend(style);

  console.log("initSeriesPageContent called.");
  console.log("appMainContentElement:", appMainContentElement);
  console.log("allMediaDetails (passed):", allMediaDetails);

  // Append the main content structure from the template first
  const mainContent = document.createElement("main");
  mainContent.id = "main-content";
  mainContent.className = "pt-4"; // Added padding-top to create space below sticky header/category filter
  mainContent.innerHTML = document.getElementById("series-template").innerHTML;

  const mediaData = allMediaDetails; // Use all media, not just series
  console.log("mediaData (all media):", mediaData);
  console.log("Number of media items found:", mediaData.length);

  // Extract unique categories from ALL media, not just series
  const uniqueCategories = new Set();
  allMediaDetails.forEach((item) => {
    if (item.categoria) {
      item.categoria.forEach((cat) => {
        // Exclude categories that are handled manually or should be hidden
        if (cat !== "movie" && cat !== "tv" && cat !== "home" && cat !== "peliculas" && cat !== "series" && cat !== "buscador") {
          uniqueCategories.add(cat);
        }
      });
    }
  });

  // Add static filters first, then dynamic categories
  let categories = ["all"];
  if (window.isAdultContentActive && window.isAdultContentActive()) {
    categories.push("hentai");
  }
  categories.push("movie", "tv");
  categories = [...categories, ...Array.from(uniqueCategories).sort()];

  const categoryLabels = {
    all: "Todas",
    movie: "Películas",
    tv: "Series",
    hentai: "Hentai",
    ...Array.from(uniqueCategories).reduce((acc, cat) => {
      acc[cat] = cat.charAt(0).toUpperCase() + cat.slice(1); // Capitalize for display
      return acc;
    }, {}),
  };

  // Create the category filter section and append it directly to appMainContentElement
  const categoryFilterSection = document.createElement("section");
  categoryFilterSection.className =
    "category-filter-section bg-gray-900 py-2"; // Reduced vertical padding
  categoryFilterSection.innerHTML = `
        <div class="slider-wrapper overflow-x-auto whitespace-nowrap custom-scrollbar w-full max-w-screen-xl mx-auto px-4"> <!-- Added horizontal padding -->
            <div class="slider-track inline-flex gap-2"> <!-- Reduced gap -->
                ${categories
                  .map(
                    (category) => {
                      if (category === 'hentai') {
                        return `<span class="category-filter text-sm px-4 py-1 cursor-pointer shadow-md transition-all duration-300" data-category="${category}"><i class="fas fa-fire"></i> ${
                          categoryLabels[category]
                        } (<span class="category-count">0</span>)</span>`
                      }
                      return `
                        <span class="category-filter text-sm px-4 py-1 cursor-pointer shadow-md transition-all duration-300" data-category="${category}">${
                      categoryLabels[category]
                    } (<span class="category-count">0</span>)</span>
                    `
                    }
                  )
                  .join("")}
            </div>
        </div>
        `;
  appMainContentElement.appendChild(categoryFilterSection); // Insert filters first

  // Create and append the Hentai sub-category filter section if adult content is active
  if (window.isAdultContentActive && window.isAdultContentActive()) {
    const adultMedia = allMediaDetails.filter(item => item.isAdult);
    const uniqueHentaiCategories = new Set();
    adultMedia.forEach((item) => {
        if (item.categoria) {
            item.categoria.forEach((cat) => {
                if (!['hentai', 'movie', 'tv', 'home', 'peliculas', 'series', 'buscador', 'destacado'].includes(cat)) {
                    uniqueHentaiCategories.add(cat);
                }
            });
        }
    });
    const hentaiCategories = Array.from(uniqueHentaiCategories).sort();

    if (hentaiCategories.length > 0) {
        const hentaiCategoryFilterSection = document.createElement("section");
        hentaiCategoryFilterSection.className = 'hentai-category-filter-section bg-gray-900 hidden py-1'; // Initially hidden
        hentaiCategoryFilterSection.innerHTML = `
            <div class="slider-wrapper overflow-x-auto whitespace-nowrap custom-scrollbar w-full max-w-screen-xl mx-auto px-4">
                <div class="slider-track inline-flex gap-2">
                    ${hentaiCategories.map(category => `
                        <span class="hentai-category-filter text-xs px-3 py-1 cursor-pointer shadow-md transition-all duration-300" data-category="${category}">${
                          category.charAt(0).toUpperCase() + category.slice(1)
                        } (<span class="category-count">0</span>)</span>
                    `).join("")}
                </div>
            </div>
        `;
        appMainContentElement.appendChild(hentaiCategoryFilterSection);
    }
  }

  appMainContentElement.appendChild(mainContent); // Then append the main content

  const seriesSectionElement = mainContent.querySelector("#series-section");
  if (!seriesSectionElement) {
    console.error("Could not find #series-section within the series template.");
    return;
  }

  // Create the series posters grid section
  const seriesPostersSection = document.createElement("section");
  seriesPostersSection.className = "series-posters";
  seriesPostersSection.innerHTML = `
            <div id="series-grid" class="grid grid-cols-3 gap-3 md:gap-4">
                </div>
        `;
  seriesSectionElement.appendChild(seriesPostersSection);

  console.log("Series section content appended.");

  function renderMedia(filteredMedia) { // Renamed from renderSeries
    console.log("renderMedia called with filteredMedia:", filteredMedia);
    console.log("Number of filtered media to render:", filteredMedia.length); // Added log
    const mediaGrid = seriesSectionElement.querySelector("#series-grid"); // Keep using series-grid for now to avoid breaking HTML
    if (!mediaGrid) {
      console.error("Media grid element not found."); // Added log
      return;
    }

    mediaGrid.innerHTML = ""; // Clear previous content

    if (filteredMedia.length === 0) {
      mediaGrid.innerHTML =
        "<p class='text-center text-gray-400 col-span-full py-8'>No se encontraron resultados para esta categoría.</p>";
      console.log("No media found for this category, displaying message."); // Added log
      return;
    }
    
    const loadPoster = (entries, observer) => {
        const intersectingEntries = entries.filter((e) => e.isIntersecting);

        intersectingEntries.forEach((entry, index) => {
            observer.unobserve(entry.target);
            
            setTimeout(() => {
                const placeholder = entry.target;
                const mediaData = JSON.parse(placeholder.dataset.media); // Renamed dataset
                
                // Add the ID to the set of loaded media
                if(mediaData.id) loadedMediaIds.add(mediaData.id); // Renamed set
                
                console.log("Loading poster for:", mediaData.name);

                const posterFragment = window.createSeriesGrid(imageBaseUrl, [mediaData]); // Assuming this function is generic
                const posterElement = posterFragment.firstChild;

                if (posterElement) {
                    const textElements = posterElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
                    textElements.forEach(el => {
                        if (el.classList.contains('text-2xl')) {
                            el.classList.remove('text-2xl'); el.classList.add('text-xl');
                        } else if (el.classList.contains('text-xl')) {
                            el.classList.remove('text-xl'); el.classList.add('text-lg');
                        } else if (el.classList.contains('text-lg')) {
                            el.classList.remove('text-lg'); el.classList.add('text-base');
                        } else if (el.classList.contains('text-base')) {
                            el.classList.remove('text-base'); el.classList.add('text-sm');
                        } else if (el.classList.contains('text-sm')) {
                            el.classList.remove('text-sm'); el.classList.add('text-xs');
                        }
                    });

                    posterElement.classList.add('opacity-0', 'transition-opacity', 'duration-500', 'ease-in-out');
                    placeholder.replaceWith(posterElement);

                    requestAnimationFrame(() => {
                        posterElement.classList.remove('opacity-0');
                    });
                } else {
                    console.warn("posterElement was null or undefined for mediaData:", mediaData);
                }
            }, index * 150);
        });
    };

    const observer = new IntersectionObserver(loadPoster, {
      rootMargin: "0px 0px 200px 0px",
      threshold: 0.01,
    });

    // --- MODIFICATION START ---
    // Now, we check if a media item has been loaded before. If so, render it directly.
    // Otherwise, create a placeholder to be lazy-loaded.
    filteredMedia.forEach((media) => { // Renamed
      // Assumes each media item has a unique 'id' property.
      if (media.id && loadedMediaIds.has(media.id)) { // Renamed
        // This media item was already loaded, create the poster directly
        const posterFragment = window.createSeriesGrid(imageBaseUrl, [media]); // Renamed
        const posterElement = posterFragment.firstChild;
        if (posterElement) {
            // Apply the same text size modification
            const textElements = posterElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
            textElements.forEach(el => {
                if (el.classList.contains('text-2xl')) {
                    el.classList.remove('text-2xl'); el.classList.add('text-xl');
                } else if (el.classList.contains('text-xl')) {
                    el.classList.remove('text-xl'); el.classList.add('text-lg');
                } else if (el.classList.contains('text-lg')) {
                    el.classList.remove('text-lg'); el.classList.add('text-base');
                } else if (el.classList.contains('text-base')) {
                    el.classList.remove('text-base'); el.classList.add('text-sm');
                } else if (el.classList.contains('text-sm')) {
                    el.classList.remove('text-sm'); el.classList.add('text-xs');
                }
            });
            mediaGrid.appendChild(posterElement);
        }
      } else {
        // This media item is new, create a placeholder and observe it
        const placeholder = document.createElement("div");
        placeholder.className =
          "poster-placeholder aspect-[2/3] bg-gray-800 rounded-lg animate-pulse border border-gray-700 relative"; // Added relative for badge positioning
        placeholder.dataset.media = JSON.stringify(media); // Renamed
        
        mediaGrid.appendChild(placeholder); // Renamed
        observer.observe(placeholder);
      }
    });
    // --- MODIFICATION END ---
  }

  function filterMedia(category) {
    console.log("filterMedia called with category:", category);
    const mainFilterSpans = appMainContentElement.querySelectorAll(".category-filter");
    const hentaiFilterSpans = appMainContentElement.querySelectorAll(".hentai-category-filter");
    const hentaiFilterSection = appMainContentElement.querySelector('.hentai-category-filter-section');

    // Show/hide hentai sub-filters
    const isHentaiSubCategory = Array.from(hentaiFilterSpans).some(span => span.dataset.category === category);
    if (category === 'hentai' || isHentaiSubCategory) {
        if (hentaiFilterSection) hentaiFilterSection.classList.remove('hidden');
    } else {
        if (hentaiFilterSection) hentaiFilterSection.classList.add('hidden');
    }

    // Handle active states for both bars
    mainFilterSpans.forEach((span) => span.classList.remove("active"));
    hentaiFilterSpans.forEach((span) => span.classList.remove("active"));

    const activeMainSpan = appMainContentElement.querySelector(`.category-filter[data-category="${category}"]`);
    const activeHentaiSpan = appMainContentElement.querySelector(`.hentai-category-filter[data-category="${category}"]`);

    if (activeMainSpan) activeMainSpan.classList.add("active");
    if (activeHentaiSpan) {
        activeHentaiSpan.classList.add("active");
        // Also keep the main 'Hentai' tab active
        const mainHentaiTab = appMainContentElement.querySelector('.category-filter[data-category="hentai"]');
        if (mainHentaiTab) mainHentaiTab.classList.add('active');
    }

    let filteredMedia;
    if (category === "all") {
      filteredMedia = mediaData;
    } else if (category === "movie") {
      filteredMedia = mediaData.filter((item) => item.type === "movie");
    } else if (category === "tv") {
      filteredMedia = mediaData.filter((item) => item.type === "tv");
    } else if (category === "hentai") {
      // When main hentai category is clicked, show all adult content
      filteredMedia = mediaData.filter((item) => item.isAdult);
    } else {
      // This handles both regular categories and hentai sub-categories
      filteredMedia = mediaData.filter(
        (item) => item.categoria && item.categoria.includes(category)
      );
    }
    console.log("Filtered media:", filteredMedia);
    renderMedia(filteredMedia);
  }

  function addFilterEventListeners() {
    const allFilterSpans = appMainContentElement.querySelectorAll(".category-filter, .hentai-category-filter");

    const categoryCounts = { all: mediaData.length };
    
    // Calculate counts for main categories
    categoryCounts.movie = mediaData.filter(item => item.type === 'movie').length;
    categoryCounts.tv = mediaData.filter(item => item.type === 'tv').length;
    if (window.isAdultContentActive && window.isAdultContentActive()) {
        categoryCounts.hentai = mediaData.filter(item => item.isAdult).length;
    }

    // Calculate counts for dynamic categories (both main and sub)
    mediaData.forEach((item) => {
      if (item.categoria) {
        item.categoria.forEach((cat) => {
          if (categoryCounts[cat]) {
            categoryCounts[cat]++;
          } else {
            categoryCounts[cat] = 1;
          }
        });
      }
    });

    allFilterSpans.forEach((span) => {
      const category = span.dataset.category;
      const countElement = span.querySelector(".category-count");
      if (countElement) {
        countElement.textContent = categoryCounts[category] || 0;
      }

      span.addEventListener("click", (event) => {
        const selectedCategory = event.currentTarget.dataset.category;
        filterMedia(selectedCategory);
      });
    });
  }

  // Initial render with all media and add event listeners
  console.log("Performing initial render for all media.");
    filterMedia("all"); // This will also set the initial 'active' class
    addFilterEventListeners(); // Call after initial filter to populate counts

    // Add scroll event listener to synchronize slider and category filter
    const sliderWrapper = categoryFilterSection.querySelector(".slider-wrapper");
    const sliderTrack = categoryFilterSection.querySelector(".slider-track");
    const categoryFilters = categoryFilterSection.querySelectorAll(".category-filter");

    // Remove the previous scroll event listener from sliderWrapper as it's not the intended target
    // (No need to explicitly remove if it's being replaced or if the element is re-created)

    // Add scroll event listener to the main content area to synchronize category filter
    let seriesScrollTimeout;
    appMainContentElement.addEventListener("scroll", () => { // Listen on the main content element
        clearTimeout(seriesScrollTimeout);
        seriesScrollTimeout = setTimeout(() => {
            const seriesPosters = seriesSectionElement.querySelectorAll(".poster-placeholder, .series-grid-item");
            let currentVisibleCategory = "all";
            let minDistanceFromTop = Infinity;

            // Find the category of the media poster closest to the top of the viewport
            for (let i = 0; i < seriesPosters.length; i++) {
                const poster = seriesPosters[i];
                const rect = poster.getBoundingClientRect();

                // Check if the poster is in the viewport
                if (rect.top >= 0 && rect.top < window.innerHeight) {
                    // Get media data from placeholder or actual poster
                    const mediaData = poster.dataset.media ? JSON.parse(poster.dataset.media) : null;
                    if (!mediaData && poster.classList.contains('series-grid-item')) {
                        // If it's a fully loaded item, try to get data from its child elements if available
                        const titleElement = poster.querySelector('.text-lg, .text-base, .text-sm, .text-xs');
                        if (titleElement) {
                            // This is a fallback, ideally mediaData should be available
                            // For now, we'll assume the first visible media determines the category
                            // A more robust solution would involve storing category data on the rendered poster
                            // For this task, we'll rely on the original mediaData to find the category
                            const mediaName = titleElement.textContent;
                            const originalMedia = mediaData.find(s => s.name === mediaName);
                            if (originalMedia && originalMedia.categoria && originalMedia.categoria.length > 0) {
                                currentVisibleCategory = originalMedia.categoria[0]; // Take the first category
                                if (currentVisibleCategory === "series") currentVisibleCategory = "all"; // Handle generic "series"
                            }
                        }
                    } else if (mediaData && mediaData.categoria && mediaData.categoria.length > 0) {
                        currentVisibleCategory = mediaData.categoria[0]; // Take the first category
                        if (currentVisibleCategory === "series") currentVisibleCategory = "all"; // Handle generic "series"
                    }

                    // If this poster is closer to the top, update the category
                    if (rect.top < minDistanceFromTop) {
                        minDistanceFromTop = rect.top;
                        // We already set currentVisibleCategory above
                    }
                    // Break after finding the first visible media to determine the category
                    break;
                }
            }
            // Only update if a new category is detected
            const currentActiveFilter = appMainContentElement.querySelector(".category-filter.active");
            if (!currentActiveFilter || currentActiveFilter.dataset.category !== currentVisibleCategory) {
                filterMedia(currentVisibleCategory);
            }

            // Also, scroll the category filter slider to make the active category visible
            const activeCategoryFilterSpan = categoryFilterSection.querySelector(`[data-category="${currentVisibleCategory}"]`);
            if (activeCategoryFilterSpan) {
                const sliderWrapperRect = sliderWrapper.getBoundingClientRect();
                const activeFilterRect = activeCategoryFilterSpan.getBoundingClientRect();

                // Calculate if the active filter is out of view to the left or right
                if (activeFilterRect.left < sliderWrapperRect.left) {
                    sliderWrapper.scrollLeft += activeFilterRect.left - sliderWrapperRect.left - 20; // Scroll left, add some padding
                } else if (activeFilterRect.right > sliderWrapperRect.right) {
                    sliderWrapper.scrollLeft += activeFilterRect.right - sliderWrapperRect.right + 20; // Scroll right, add some padding
                }
            }

        }, 200); // Debounce scroll event for series content
    });

    console.log("Series section initialization complete.");
};

// Expose a function to update series categories externally
window.updateSeriesCategories = (appMainContentElement, allMediaDetails, imageBaseUrl) => {
  console.log("updateSeriesCategories called to refresh categories.");

  // Remove existing category filter section and main content to re-render
  const existingCategoryFilterSection = appMainContentElement.querySelector(".category-filter-section");
  if (existingCategoryFilterSection) {
    existingCategoryFilterSection.remove();
  }
  const existingMainContent = appMainContentElement.querySelector("#main-content");
  if (existingMainContent) {
    existingMainContent.remove();
  }

  // Re-initialize the series page content, which will re-create categories
  window.initSeriesPageContent(appMainContentElement, allMediaDetails, imageBaseUrl);
};

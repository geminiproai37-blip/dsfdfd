import {
  buildHeader,
  buildMainContent,
  buildNavigationBar,
  buildMovieDetailPage,
} from "./dom-builder.js";
import { fetchMediaDetails, encryptDataForUrl, getDecryptedUrlParams } from "./script.js";

// Helper function to create an encrypted URL
// This function will be exposed globally for use in dom-builder.js
window.createEncryptedUrl = (baseUrl, params) => {
  const encryptedParams = encryptDataForUrl(params);
  if (encryptedParams) {
    // Assuming baseUrl might already have a '?' or not.
    // If it's a 'go:' URL, it won't have a '?' initially.
    // We'll append '?data=' for the encrypted payload.
    return `${baseUrl}?data=${encodeURIComponent(encryptedParams)}`;
  }
  return baseUrl; // Fallback if encryption fails
};

// Expose decryptData globally for use in other modules if needed
window.decryptUrlParams = () => {
  return getDecryptedUrlParams();
};

// Global function to set adult content preference and dispatch event
window.setAdultContentEnabled = (isEnabled) => {
  localStorage.setItem("adultContentEnabled", isEnabled ? "true" : "false");
  window.dispatchEvent(new Event("adultContentSettingChanged"));
  console.log("Adult content setting changed to:", isEnabled);
};

document.addEventListener("DOMContentLoaded", async () => {
  const apiBaseUrl = "https://api.themoviedb.org/3";
  const imageBaseUrl = "https://image.tmdb.org/t/p/w500";
  const backdropBaseUrl = "https://image.tmdb.org/t/p/w780";

  const appRoot = document.getElementById("app-root");
  // Determine theme from body's data-default-theme attribute
  const bodyElement = document.body;
  const isPurpleTheme = bodyElement.dataset.defaultTheme === "purple";
  console.log("Theme detected:", isPurpleTheme ? "Purple" : "Default");

  appRoot.appendChild(buildHeader(null, isPurpleTheme)); // Pass isPurpleTheme to buildHeader
  appRoot.appendChild(buildMainContent());

  const movieDetailSection = document.getElementById("movie-detail-section");
  const navContainer = document.createElement("div"); // Create a container for the navigation bar
  navContainer.id = "nav-bar-container";
  appRoot.appendChild(navContainer);

  const renderNavigationBar = () => {
    console.log("renderNavigationBar called.");
    const adultContentEnabled = localStorage.getItem("adultContentEnabled") === "true";
    console.log("adultContentEnabled from localStorage:", adultContentEnabled);
    const adultContentLink = navContainer.querySelector("#nav-link-favoritos"); // Corrected ID to match dom-builder.js

    if (adultContentLink) {
      console.log("adult-content-nav-link found.");
      if (adultContentEnabled) {
        adultContentLink.classList.remove("hidden"); // Show the link
        console.log("Removed 'hidden' class. Current classes:", adultContentLink.classList.value);
      } else {
        adultContentLink.classList.add("hidden"); // Hide the link
        console.log("Added 'hidden' class. Current classes:", adultContentLink.classList.value);
      }
    } else {
      console.log("adult-content-nav-link NOT found.");
    }
  };

  // Initial render of the navigation bar, passing the theme
  // The buildNavigationBar function now always includes the link,
  // and its initial visibility is set by the 'hidden' class based on adultContentEnabled.
  navContainer.appendChild(buildNavigationBar(localStorage.getItem("adultContentEnabled") === "true", isPurpleTheme));

  // Listen for custom event to update navigation bar visibility
  window.addEventListener("adultContentSettingChanged", renderNavigationBar);

  const path = window.location.pathname;
  const pathParts = path.split("/").filter(Boolean); // Remove empty strings

  let mediaId = null;
  let mediaType = null;
  let seasonNumber = null;
  let episodeNumber = null;
  let episodeType = null; // New variable for episode type

  // Function to parse URL query parameters, now handling encryption
  const getQueryParams = () => {
    const params = {};
    const decrypted = getDecryptedUrlParams();
    if (decrypted) {
      Object.assign(params, decrypted); // Merge decrypted parameters
    } else {
      // Fallback for unencrypted parameters (for backward compatibility or if 'data' param is not used)
      const urlParams = new URLSearchParams(window.location.search);
      for (const [key, value] of urlParams.entries()) {
        params[key] = value;
      }
    }
    return params;
  };

  const queryParams = getQueryParams();

  // Check if it's the home route (go:home#home)
  const isHomeRoute =
    window.location.hash === "#home" &&
    pathParts.length >= 1 &&
    pathParts[0] === "go";

  if (isHomeRoute) {
    // Clear the movie detail section and ensure main content is visible
    movieDetailSection.innerHTML = "";
    // Optionally, you might want to load specific "home" content here
    // For now, just ensuring the movie detail section is empty and not showing an error.
  } else {
    // Read mediaType and mediaId from URL query parameters (decrypted or not)
    mediaType = queryParams.mediaType || null;
    mediaId = queryParams.mediaId || null;

    // Override season, episode, and episodeType with URL query parameters if present
    seasonNumber = queryParams.seasonNumber ? parseInt(queryParams.seasonNumber) : null;
    episodeNumber = queryParams.episodeNumber ? parseInt(queryParams.episodeNumber) : null;
    episodeType = queryParams.episodeType || null;

    // The local-media-data div is no longer the primary source for mediaType and mediaId.
    // However, if it still exists and query parameters are not present, it can act as a fallback for season/episode.
    const localMediaDataElement = document.getElementById("local-media-data");
    if (localMediaDataElement) {
      if (!mediaType && localMediaDataElement.dataset.mediaType) {
        mediaType = localMediaDataElement.dataset.mediaType;
      }
      if (!mediaId && localMediaDataElement.dataset.mediaId) {
        mediaId = localMediaDataElement.dataset.mediaId;
      }
      if (!seasonNumber && localMediaDataElement.dataset.seasonNumber) {
        seasonNumber = parseInt(localMediaDataElement.dataset.seasonNumber);
      }
      if (!episodeNumber && localMediaDataElement.dataset.episodeNumber) {
        episodeNumber = parseInt(localMediaDataElement.dataset.episodeNumber);
      }
      if (!episodeType && localMediaDataElement.dataset.episodeType) {
        episodeType = localMediaDataElement.dataset.episodeType;
      }
    }

    // Existing logic to override season and episode with URL path parameters if present,
    // but query parameters take precedence.
    if (pathParts.length >= 2 && pathParts[0] === "go") {
      const seasonIndex = pathParts.indexOf("season");
      const episodeIndex = pathParts.indexOf("episode");

      // Only apply path parameters if query parameters haven't already set them
      if (seasonIndex !== -1 && pathParts[seasonIndex + 1] && !queryParams.seasonNumber) {
        seasonNumber = parseInt(pathParts[seasonIndex + 1]);
      }
      if (episodeIndex !== -1 && pathParts[episodeIndex + 1] && !queryParams.episodeNumber) {
        episodeNumber = parseInt(pathParts[episodeIndex + 1]);
      }
    }
    let localEpisodesDb = queryParams.episodesDb || {};
    // Fallback to reading from Inicio.html if not in URL (for backward compatibility or if the script tag is still there)
    if (Object.keys(localEpisodesDb).length === 0) {
      const localEpisodesDbScript = document.getElementById("local-episodes-db");
      if (localEpisodesDbScript && localEpisodesDbScript.textContent) {
        try {
          localEpisodesDb = JSON.parse(localEpisodesDbScript.textContent);
        } catch (e) {
          console.error("Error parsing local-episodes-db from script tag:", e);
        }
      }
    }

    const mediaDetails = await fetchMediaDetails(
      apiBaseUrl,
      mediaType,
      mediaId,
      seasonNumber,
      episodeNumber,
      episodeType // Pass the new episodeType
    );

    if (mediaDetails) {
      const mediaDetailPageElement = await buildMovieDetailPage(
        apiBaseUrl,
        backdropBaseUrl,
        imageBaseUrl,
        mediaDetails,
        mediaType,
        mediaId,
        seasonNumber,
        episodeNumber,
        episodeType, // Pass the new episodeType
        localEpisodesDb, // Pass the local episodes database
        isPurpleTheme // Pass the theme to buildMovieDetailPage
      );
      movieDetailSection.appendChild(mediaDetailPageElement);
    } else {
      movieDetailSection.innerHTML =
        "<p class='text-center text-red-500'>No se pudo cargar la información del contenido.</p>";
    }
  }
});

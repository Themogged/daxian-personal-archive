(() => {
  "use strict";

  const body = document.body;
  const header = document.getElementById("site-header");
  const audio = document.getElementById("archive-audio");
  const player = document.getElementById("music-player");
  const progress = document.getElementById("audio-progress");
  const toast = document.getElementById("toast");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const photoItems = Array.from(document.querySelectorAll("[data-photo]"));
  const searchDialog = document.getElementById("search-dialog");
  const menuDialog = document.getElementById("menu-dialog");
  const searchInput = document.getElementById("archive-search");
  const searchResults = document.getElementById("search-results");

  let activeOverlay = null;
  let lastTrigger = null;
  let activePhotoIndex = 0;
  let toastTimer = null;
  let touchStartX = 0;

  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }

  function setPlayerPlaying(isPlaying) {
    body.classList.toggle("audio-playing", isPlaying);
    document.querySelectorAll("[data-toggle-audio]").forEach((button) => {
      const icon = button.querySelector("span");
      button.setAttribute("aria-label", isPlaying ? "Pause archive track" : "Play archive track");
      if (icon) icon.textContent = isPlaying ? "Ⅱ" : "▶";
    });
  }

  async function startAudio() {
    if (!audio) return;
    audio.volume = 0.5;
    try {
      await audio.play();
    } catch (_) {
      // Some browsers block audible autoplay. The persistent player remains available.
    }
  }

  function toggleAudio() {
    if (player.classList.contains("is-minimized")) {
      player.classList.remove("is-minimized");
      document.querySelector("[data-minimize-player]").setAttribute("aria-label", "Minimize music player");
      return;
    }
    if (audio.paused) startAudio();
    else audio.pause();
  }

  function openOverlay(overlay, trigger) {
    if (!overlay) return;
    if (activeOverlay && activeOverlay !== overlay) closeOverlay(activeOverlay, false);
    lastTrigger = trigger || document.activeElement;
    activeOverlay = overlay;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    body.classList.add("dialog-open");
    const firstFocusable = overlay.querySelector(focusableSelector);
    window.setTimeout(() => firstFocusable?.focus(), 30);
  }

  function closeOverlay(overlay = activeOverlay, restoreFocus = true) {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (activeOverlay === overlay) activeOverlay = null;
    if (!activeOverlay) body.classList.remove("dialog-open");
    if (restoreFocus && lastTrigger instanceof HTMLElement) lastTrigger.focus();
  }

  function trapFocus(event) {
    if (!activeOverlay || event.key !== "Tab") return;
    const focusable = Array.from(activeOverlay.querySelectorAll(focusableSelector));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function getVisiblePhotos() {
    return photoItems.filter((photo) => !photo.hidden);
  }

  function openLightbox(photo, trigger) {
    const photos = getVisiblePhotos();
    activePhotoIndex = Math.max(0, photos.indexOf(photo));
    lastTrigger = trigger || photo.querySelector("button");
    renderLightbox();
    openOverlay(lightbox, lastTrigger);
  }

  function renderLightbox() {
    const photos = getVisiblePhotos();
    if (!photos.length) return;
    if (activePhotoIndex >= photos.length) activePhotoIndex = 0;
    const photo = photos[activePhotoIndex];
    const image = photo.querySelector("img");
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = photo.dataset.caption || photo.dataset.title || image.alt;
  }

  function moveLightbox(direction) {
    const photos = getVisiblePhotos();
    if (!photos.length) return;
    activePhotoIndex = (activePhotoIndex + direction + photos.length) % photos.length;
    renderLightbox();
  }

  function applyFilter(filter) {
    photoItems.forEach((photo) => {
      const categories = (photo.dataset.category || "").split(/\s+/);
      photo.hidden = filter !== "all" && !categories.includes(filter);
    });
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.filter === filter);
      button.setAttribute("aria-pressed", button.dataset.filter === filter ? "true" : "false");
    });
  }

  function getSearchEntries() {
    const entries = [];
    document.querySelectorAll("[data-searchable]").forEach((item) => {
      const title = item.dataset.title;
      if (!title || entries.some((entry) => entry.title === title)) return;
      let target = "#journal";
      if (item.closest(".archive")) target = "#archive";
      if ((item.dataset.category || "").includes("music")) target = "#soundtrack";
      entries.push({ title, category: item.dataset.category || "archive", target });
    });
    photoItems.forEach((item) => {
      const title = item.dataset.title;
      if (!title || entries.some((entry) => entry.title === title)) return;
      entries.push({ title, category: item.dataset.category || "photography", target: "#photography" });
    });
    return entries;
  }

  const searchEntries = getSearchEntries();

  function renderSearch(query = "") {
    searchResults.replaceChildren();
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      const helper = document.createElement("p");
      helper.className = "search-hint";
      helper.textContent = "Search the journal, photographs and sound archive.";
      searchResults.append(helper);
      return;
    }
    const matches = searchEntries.filter((entry) => `${entry.title} ${entry.category}`.toLocaleLowerCase().includes(normalizedQuery));
    if (!matches.length) {
      const noResults = document.createElement("p");
      noResults.className = "search-hint";
      noResults.textContent = "Nothing here yet. 아직 기록이 없습니다.";
      searchResults.append(noResults);
      return;
    }
    matches.slice(0, 8).forEach((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.dataset.target = entry.target;
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const category = document.createElement("em");
      category.textContent = entry.category.toUpperCase();
      button.append(number, title, category);
      searchResults.append(button);
    });
  }

  startAudio();

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  document.querySelectorAll("[data-open-menu]").forEach((button) => button.addEventListener("click", () => openOverlay(menuDialog, button)));
  document.querySelectorAll("[data-open-search]").forEach((button) => button.addEventListener("click", () => {
    openOverlay(searchDialog, button);
    renderSearch();
    window.setTimeout(() => searchInput.focus(), 40);
  }));
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => closeOverlay()));
  menuDialog.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeOverlay(menuDialog, false)));

  searchInput.addEventListener("input", (event) => renderSearch(event.target.value));
  searchResults.addEventListener("click", (event) => {
    const button = event.target.closest(".search-result");
    if (!button) return;
    closeOverlay(searchDialog, false);
    document.querySelector(button.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });
  photoItems.forEach((photo) => photo.querySelector(".photo-trigger").addEventListener("click", (event) => openLightbox(photo, event.currentTarget)));
  document.querySelector("[data-close-lightbox]").addEventListener("click", () => closeOverlay(lightbox));
  document.querySelector("[data-lightbox-previous]").addEventListener("click", () => moveLightbox(-1));
  document.querySelector("[data-lightbox-next]").addEventListener("click", () => moveLightbox(1));
  lightbox.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener("touchend", (event) => {
    const distance = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(distance) > 50) moveLightbox(distance > 0 ? -1 : 1);
  }, { passive: true });

  document.querySelectorAll("[data-toggle-audio]").forEach((button) => button.addEventListener("click", toggleAudio));
  document.querySelector("[data-minimize-player]").addEventListener("click", () => {
    player.classList.add("is-minimized");
    player.querySelector("[data-toggle-audio]").setAttribute("aria-label", "Expand music player");
  });
  audio.addEventListener("play", () => setPlayerPlaying(true));
  audio.addEventListener("pause", () => setPlayerPlaying(false));
  audio.addEventListener("ended", () => { progress.style.width = "0"; });
  audio.addEventListener("timeupdate", () => {
    const percentage = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.style.width = `${percentage}%`;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeOverlay) {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (activeOverlay === lightbox && event.key === "ArrowLeft") { event.preventDefault(); moveLightbox(-1); }
    if (activeOverlay === lightbox && event.key === "ArrowRight") { event.preventDefault(); moveLightbox(1); }
    trapFocus(event);
  });
})();

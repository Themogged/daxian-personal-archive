(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const body = document.body;
  const header = document.getElementById("site-header");
  const footer = document.querySelector(".site-footer");
  const skipLink = document.querySelector(".skip-link");
  const main = document.getElementById("main-content");
  const pageProgress = document.getElementById("page-progress-bar");
  const audio = document.getElementById("archive-audio");
  const player = document.getElementById("music-player");
  const audioSeek = document.getElementById("audio-seek");
  const audioTime = document.getElementById("audio-time");
  const audioButtons = Array.from(document.querySelectorAll("[data-toggle-audio]"));
  const minimizeButton = document.querySelector("[data-minimize-player]");
  const menuDialog = document.getElementById("menu-dialog");
  const menuButtons = Array.from(document.querySelectorAll("[data-open-menu]"));
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const photoItems = Array.from(document.querySelectorAll("[data-photo]"));
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  const navLinks = Array.from(document.querySelectorAll("[data-section-link]"));
  const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  const portrait = document.querySelector("[data-portrait]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeOverlay = null;
  let lastTrigger = null;
  let activePhotoIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let pendingPlay = null;
  let unlockListenersAttached = false;
  let volumeAnimation = null;
  let scrollFrame = null;
  let portraitFrame = null;
  let playerCollapseTimer = null;
  let activeNavIndex = -1;

  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const unlockEvents = ["pointerdown", "touchstart", "keydown"];
  const pageShell = [skipLink, header, main, footer, player].filter(Boolean);

  function setInert(element, isInert) {
    if (!element) return;
    if (isInert) element.setAttribute("inert", "");
    else element.removeAttribute("inert");
  }

  function setPageInert(isInert) {
    pageShell.forEach((element) => setInert(element, isInert));
  }

  function updateHeaderAndProgress() {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);

    if (pageProgress) {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
      pageProgress.style.transform = `scaleX(${percentage / 100})`;
    }

    if (navLinks.length) {
      const marker = window.innerHeight * 0.38;
      let nextActiveIndex = 0;
      navSections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= marker) nextActiveIndex = index;
      });
      if (nextActiveIndex !== activeNavIndex) {
        activeNavIndex = nextActiveIndex;
        navLinks.forEach((link, index) => {
          const isActive = index === activeNavIndex;
          link.classList.toggle("is-active", isActive);
          if (isActive) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }
    }
  }

  function requestScrollUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      updateHeaderAndProgress();
      scrollFrame = null;
    });
  }

  function updateAudioInterface(state) {
    if (!player) return;

    const isPlaying = state === "playing";
    player.dataset.audioState = state;
    body.classList.toggle("audio-playing", isPlaying);

    const labels = {
      starting: "STARTING SOFTLY",
      playing: "PLAYING FOR DAXIAN",
      paused: "PAUSED / TAP TO PLAY",
      blocked: "TAP ONCE TO HEAR IT",
      error: "SONG UNAVAILABLE",
    };
    const kicker = player.querySelector("[data-audio-kicker]");
    if (kicker) kicker.textContent = labels[state] || labels.paused;

    audioButtons.forEach((button) => {
      const icon = button.querySelector("[aria-hidden='true']");
      button.setAttribute("aria-label", isPlaying ? "Pause our song" : "Play our song");
      button.setAttribute("aria-pressed", String(isPlaying));
      if (icon) icon.textContent = isPlaying ? "Ⅱ" : "▶";
    });
  }

  function fadeAudioVolume(target = 0.4, duration = 1600) {
    if (!audio) return;
    if (volumeAnimation) window.cancelAnimationFrame(volumeAnimation);
    if (reduceMotion.matches) {
      audio.volume = target;
      return;
    }

    const startVolume = audio.volume;
    const startedAt = performance.now();
    const step = (now) => {
      const elapsed = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - elapsed) ** 3);
      audio.volume = Math.min(1, startVolume + ((target - startVolume) * eased));
      if (elapsed < 1) volumeAnimation = window.requestAnimationFrame(step);
      else volumeAnimation = null;
    };
    volumeAnimation = window.requestAnimationFrame(step);
  }

  function stopVolumeAnimation() {
    if (!volumeAnimation) return;
    window.cancelAnimationFrame(volumeAnimation);
    volumeAnimation = null;
  }

  function detachAudioUnlock() {
    if (!unlockListenersAttached) return;
    unlockEvents.forEach((eventName) => document.removeEventListener(eventName, unlockAudio, true));
    unlockListenersAttached = false;
  }

  function attachAudioUnlock() {
    if (unlockListenersAttached) return;
    unlockEvents.forEach((eventName) => document.addEventListener(eventName, unlockAudio, {
      capture: true,
      passive: eventName !== "keydown",
    }));
    unlockListenersAttached = true;
  }

  function schedulePlayerCollapse() {
    window.clearTimeout(playerCollapseTimer);
    if (!window.matchMedia("(max-width: 520px)").matches || !player) return;
    playerCollapseTimer = window.setTimeout(() => {
      player.classList.add("is-minimized");
      if (minimizeButton) {
        minimizeButton.textContent = "+";
        minimizeButton.setAttribute("aria-label", "Expand music player");
        minimizeButton.setAttribute("aria-expanded", "false");
      }
    }, 6000);
  }

  async function startAudio() {
    if (!audio) return false;
    if (!audio.paused) {
      updateAudioInterface("playing");
      fadeAudioVolume(0.4, 900);
      detachAudioUnlock();
      schedulePlayerCollapse();
      return true;
    }
    if (pendingPlay) return pendingPlay;

    audio.volume = 0;
    updateAudioInterface("starting");
    pendingPlay = audio.play()
      .then(() => {
        fadeAudioVolume(0.4);
        updateAudioInterface("playing");
        detachAudioUnlock();
        schedulePlayerCollapse();
        return true;
      })
      .catch(() => {
        updateAudioInterface("blocked");
        attachAudioUnlock();
        return false;
      })
      .finally(() => {
        pendingPlay = null;
      });

    return pendingPlay;
  }

  function unlockAudio(event) {
    if (!audio?.paused) {
      detachAudioUnlock();
      return;
    }
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Escape" || event.ctrlKey || event.metaKey || event.altKey)) return;
    if (event.target instanceof Element && event.target.closest("[data-toggle-audio]")) return;
    startAudio();
  }

  function toggleAudio() {
    if (!audio) return;
    if (audio.paused) startAudio();
    else audio.pause();
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  }

  function updateAudioProgress() {
    if (!audio) return;
    const percentage = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    if (audioSeek) {
      audioSeek.value = String(percentage);
      audioSeek.style.setProperty("--audio-progress", `${percentage}%`);
      audioSeek.setAttribute("aria-valuetext", `${formatTime(audio.currentTime)} of ${formatTime(audio.duration)}`);
    }
    if (audioTime) audioTime.textContent = formatTime(audio.currentTime);
  }

  function updateMenuButtonState(isOpen) {
    menuButtons.forEach((button) => button.setAttribute("aria-expanded", String(isOpen)));
  }

  function openOverlay(overlay, trigger) {
    if (!overlay) return;
    if (activeOverlay && activeOverlay !== overlay) closeOverlay(activeOverlay, false);
    lastTrigger = trigger || document.activeElement;
    activeOverlay = overlay;
    setPageInert(true);
    setInert(overlay, false);
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    body.classList.add("dialog-open");
    updateMenuButtonState(overlay === menuDialog);
    const firstFocusable = overlay.querySelector(focusableSelector);
    window.setTimeout(() => {
      if (activeOverlay === overlay && overlay.classList.contains("is-open")) firstFocusable?.focus();
    }, 30);
  }

  function closeOverlay(overlay = activeOverlay, restoreFocus = true) {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    if (activeOverlay === overlay) activeOverlay = null;
    if (!activeOverlay) {
      body.classList.remove("dialog-open");
      setPageInert(false);
    }
    updateMenuButtonState(false);
    if (restoreFocus && lastTrigger instanceof HTMLElement) lastTrigger.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setInert(overlay, true);
    overlay.setAttribute("aria-hidden", "true");
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

  function preloadNeighbor(index) {
    const item = photoItems[(index + photoItems.length) % photoItems.length];
    const sourceImage = item?.querySelector("img");
    const source = sourceImage?.currentSrc || sourceImage?.src;
    if (!source) return;
    const image = new Image();
    image.src = source;
  }

  function renderLightbox() {
    if (!photoItems.length || !lightboxImage || !lightboxCaption || !lightboxTitle || !lightboxCounter) return;
    activePhotoIndex = (activePhotoIndex + photoItems.length) % photoItems.length;
    const photo = photoItems[activePhotoIndex];
    const image = photo.querySelector("img");
    const isHandwritten = photo.classList.contains("handwritten__frame");
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxTitle.textContent = photo.dataset.title || "A kept moment";
    lightboxCaption.textContent = photo.dataset.caption || image.alt;
    lightboxCounter.textContent = isHandwritten
      ? `SPECIAL PAGE · ${String(activePhotoIndex + 1).padStart(2, "0")} / ${String(photoItems.length).padStart(2, "0")}`
      : `${String(activePhotoIndex + 1).padStart(2, "0")} / ${String(photoItems.length).padStart(2, "0")}`;
    preloadNeighbor(activePhotoIndex - 1);
    preloadNeighbor(activePhotoIndex + 1);
  }

  function openLightbox(photo, trigger) {
    activePhotoIndex = Math.max(0, photoItems.indexOf(photo));
    renderLightbox();
    openOverlay(lightbox, trigger);
  }

  function moveLightbox(direction) {
    activePhotoIndex += direction;
    renderLightbox();
  }

  function initializeReveals() {
    if (!revealItems.length) return;

    document.querySelectorAll(".keepsake-grid, .photo-grid").forEach((group) => {
      Array.from(group.querySelectorAll(":scope > .reveal")).forEach((item, index) => {
        item.style.setProperty("--reveal-delay", `${(index % 3) * 90}ms`);
      });
    });

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7%", threshold: 0.07 });

    revealItems.forEach((item) => observer.observe(item));
  }

  function initializePortraitMotion() {
    if (!portrait || reduceMotion.matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    portrait.addEventListener("pointermove", (event) => {
      const bounds = portrait.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * -7;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -7;
      if (portraitFrame) window.cancelAnimationFrame(portraitFrame);
      portraitFrame = window.requestAnimationFrame(() => {
        portrait.style.setProperty("--portrait-x", `${x}px`);
        portrait.style.setProperty("--portrait-y", `${y}px`);
        portraitFrame = null;
      });
    });
    portrait.addEventListener("pointerleave", () => {
      if (portraitFrame) window.cancelAnimationFrame(portraitFrame);
      portrait.style.setProperty("--portrait-x", "0px");
      portrait.style.setProperty("--portrait-y", "0px");
      portraitFrame = null;
    });
  }

  if (menuDialog) setInert(menuDialog, true);
  if (lightbox) setInert(lightbox, true);
  updateHeaderAndProgress();
  initializeReveals();
  initializePortraitMotion();
  window.requestAnimationFrame(() => body.classList.add("is-ready"));

  if (audio) audio.volume = 0;
  startAudio();
  window.addEventListener("load", () => {
    if (audio?.paused) startAudio();
  }, { once: true });
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", () => {
    requestScrollUpdate();
    if (!audio?.paused) schedulePlayerCollapse();
  }, { passive: true });

  audioButtons.forEach((button) => button.addEventListener("click", toggleAudio));
  minimizeButton?.addEventListener("click", () => {
    window.clearTimeout(playerCollapseTimer);
    const isMinimized = player?.classList.toggle("is-minimized") || false;
    minimizeButton.textContent = isMinimized ? "+" : "−";
    minimizeButton.setAttribute("aria-label", isMinimized ? "Expand music player" : "Minimize music player");
    minimizeButton.setAttribute("aria-expanded", String(!isMinimized));
  });

  audio?.addEventListener("play", () => updateAudioInterface("playing"));
  audio?.addEventListener("pause", () => {
    stopVolumeAnimation();
    updateAudioInterface("paused");
  });
  audio?.addEventListener("ended", () => {
    stopVolumeAnimation();
    if (audioSeek) {
      audioSeek.value = "0";
      audioSeek.style.setProperty("--audio-progress", "0%");
    }
    if (audioTime) audioTime.textContent = "0:00";
    updateAudioInterface("paused");
  });
  audio?.addEventListener("timeupdate", updateAudioProgress);
  audio?.addEventListener("loadedmetadata", updateAudioProgress);
  audio?.addEventListener("error", () => {
    stopVolumeAnimation();
    detachAudioUnlock();
    updateAudioInterface("error");
  });
  audioSeek?.addEventListener("input", () => {
    if (!audio?.duration) return;
    const percentage = Number(audioSeek.value);
    audio.currentTime = (percentage / 100) * audio.duration;
    audioSeek.style.setProperty("--audio-progress", `${percentage}%`);
    audioSeek.setAttribute("aria-valuetext", `${formatTime(audio.currentTime)} of ${formatTime(audio.duration)}`);
  });

  menuButtons.forEach((button) => {
    button.addEventListener("click", () => openOverlay(menuDialog, button));
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeOverlay());
  });
  menuDialog?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.querySelector(link.getAttribute("href"));
      closeOverlay(menuDialog, false);
      window.setTimeout(() => {
        if (!(target instanceof HTMLElement)) return;
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }, 0);
    });
  });
  menuDialog?.addEventListener("click", (event) => {
    if (event.target === menuDialog) closeOverlay(menuDialog);
  });

  photoItems.forEach((photo) => {
    const trigger = photo.querySelector(".photo-trigger");
    if (!trigger) return;
    if (!trigger.hasAttribute("aria-label")) trigger.setAttribute("aria-label", `Open image: ${photo.dataset.title || "kept moment"}`);
    trigger.addEventListener("click", () => openLightbox(photo, trigger));
  });
  document.querySelector("[data-close-lightbox]")?.addEventListener("click", () => closeOverlay(lightbox));
  document.querySelector("[data-lightbox-previous]")?.addEventListener("click", () => moveLightbox(-1));
  document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => moveLightbox(1));
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeOverlay(lightbox);
  });
  lightbox?.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
  }, { passive: true });
  lightbox?.addEventListener("touchend", (event) => {
    const distanceX = event.changedTouches[0].screenX - touchStartX;
    const distanceY = event.changedTouches[0].screenY - touchStartY;
    if (Math.abs(distanceX) > 50 && Math.abs(distanceX) > Math.abs(distanceY)) moveLightbox(distanceX > 0 ? -1 : 1);
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeOverlay) {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (activeOverlay === lightbox && event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    }
    if (activeOverlay === lightbox && event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    }
    trapFocus(event);
  });
})();

(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const body = document.body;
  const header = document.getElementById("site-header");
  const audio = document.getElementById("archive-audio");
  const player = document.getElementById("music-player");
  const progress = document.getElementById("audio-progress");
  const audioButtons = Array.from(document.querySelectorAll("[data-toggle-audio]"));
  const menuDialog = document.getElementById("menu-dialog");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const photoItems = Array.from(document.querySelectorAll("#photography [data-photo]"));
  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  let activeOverlay = null;
  let lastTrigger = null;
  let activePhotoIndex = 0;
  let touchStartX = 0;
  let pendingPlay = null;
  let unlockListenersAttached = false;

  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const unlockEvents = ["pointerdown", "touchstart", "keydown"];

  function updateHeader() {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
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
    };
    const kicker = player.querySelector("[data-audio-kicker]");
    if (kicker) kicker.textContent = labels[state] || labels.paused;

    audioButtons.forEach((button) => {
      const icon = button.querySelector("[aria-hidden='true']");
      button.setAttribute("aria-label", isPlaying ? "Pause our song" : "Play our song");
      if (icon) icon.textContent = isPlaying ? "Ⅱ" : "▶";
    });
  }

  function detachAudioUnlock() {
    if (!unlockListenersAttached) return;
    unlockEvents.forEach((eventName) => document.removeEventListener(eventName, unlockAudio, true));
    unlockListenersAttached = false;
  }

  function attachAudioUnlock() {
    if (unlockListenersAttached) return;
    unlockEvents.forEach((eventName) => document.addEventListener(eventName, unlockAudio, { capture: true, passive: eventName !== "keydown" }));
    unlockListenersAttached = true;
  }

  async function startAudio() {
    if (!audio) return false;
    if (!audio.paused) {
      updateAudioInterface("playing");
      detachAudioUnlock();
      return true;
    }
    if (pendingPlay) return pendingPlay;

    audio.volume = 0.4;
    updateAudioInterface("starting");
    pendingPlay = audio.play()
      .then(() => {
        updateAudioInterface("playing");
        detachAudioUnlock();
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

  function renderLightbox() {
    if (!photoItems.length || !lightboxImage || !lightboxCaption) return;
    activePhotoIndex = (activePhotoIndex + photoItems.length) % photoItems.length;
    const photo = photoItems[activePhotoIndex];
    const image = photo.querySelector("img");
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = photo.dataset.caption || photo.dataset.title || image.alt;
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    revealItems.forEach((item) => observer.observe(item));
  }

  updateHeader();
  initializeReveals();
  startAudio();
  window.addEventListener("load", () => {
    if (audio?.paused) startAudio();
  }, { once: true });
  window.addEventListener("scroll", updateHeader, { passive: true });

  audioButtons.forEach((button) => button.addEventListener("click", toggleAudio));
  document.querySelector("[data-minimize-player]")?.addEventListener("click", () => {
    player?.classList.add("is-minimized");
  });

  audio?.addEventListener("play", () => updateAudioInterface("playing"));
  audio?.addEventListener("pause", () => updateAudioInterface("paused"));
  audio?.addEventListener("ended", () => {
    if (progress) progress.style.width = "0";
    updateAudioInterface("paused");
  });
  audio?.addEventListener("timeupdate", () => {
    if (!progress) return;
    const percentage = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.style.width = `${percentage}%`;
  });

  document.querySelectorAll("[data-open-menu]").forEach((button) => {
    button.addEventListener("click", () => openOverlay(menuDialog, button));
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeOverlay());
  });
  menuDialog?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeOverlay(menuDialog, false));
  });

  photoItems.forEach((photo) => {
    const trigger = photo.querySelector(".photo-trigger");
    trigger?.addEventListener("click", () => openLightbox(photo, trigger));
  });
  document.querySelector("[data-close-lightbox]")?.addEventListener("click", () => closeOverlay(lightbox));
  document.querySelector("[data-lightbox-previous]")?.addEventListener("click", () => moveLightbox(-1));
  document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => moveLightbox(1));
  lightbox?.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  lightbox?.addEventListener("touchend", (event) => {
    const distance = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(distance) > 50) moveLightbox(distance > 0 ? -1 : 1);
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

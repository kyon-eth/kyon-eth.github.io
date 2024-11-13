function gridCellDimensions() {
    const element = document.createElement("div");
    element.style.position = "fixed";
    element.style.height = "var(--line-height)";
    element.style.width = "1ch";
    document.body.appendChild(element);
    const rect = element.getBoundingClientRect();
    document.body.removeChild(element);
    return { width: rect.width, height: rect.height };
  }
  
  // Add padding to each media to maintain grid.
  function adjustMediaPadding() {
    const cell = gridCellDimensions();
  
    function setHeightFromRatio(media, ratio) {
      const rect = media.getBoundingClientRect();
      const realHeight = rect.width / ratio;
      const diff = cell.height - (realHeight % cell.height);
      media.style.setProperty("padding-bottom", `${diff}px`);
    }
  
    function setFallbackHeight(media) {
      const rect = media.getBoundingClientRect();
      const height = Math.round((rect.width / 2) / cell.height) * cell.height;
      media.style.setProperty("height", `${height}px`);
    }
  
    function onMediaLoaded(media) {
      var width, height;
      switch (media.tagName) {
        case "IMG":
          width = media.naturalWidth;
          height = media.naturalHeight;
          break;
        case "VIDEO":
          width = media.videoWidth;
          height = media.videoHeight;
          break;
      }
      if (width > 0 && height > 0) {
        setHeightFromRatio(media, width / height);
      } else {
        setFallbackHeight(media);
      }
    }
  
    function setupLazyLoading(media) {
      // Store the original source
      const originalSrc = media.tagName === 'IMG' ? media.getAttribute('src') : media.getAttribute('src');
      const originalSrcset = media.getAttribute('srcset');
      
      // Remove src/srcset to prevent immediate loading
      media.removeAttribute('src');
      if (originalSrcset) media.removeAttribute('srcset');
      
      // Store original sources as data attributes
      media.dataset.src = originalSrc;
      if (originalSrcset) media.dataset.srcset = originalSrcset;
      
      // Add loading="lazy" attribute
      media.setAttribute('loading', 'lazy');
      
      return { originalSrc, originalSrcset };
    }
  
    function loadMedia(media, { originalSrc, originalSrcset }) {
      if (media.tagName === 'IMG') {
        if (originalSrcset) media.setAttribute('srcset', originalSrcset);
        media.setAttribute('src', originalSrc);
      } else if (media.tagName === 'VIDEO') {
        media.setAttribute('src', originalSrc);
        media.load(); // Required for videos to load the new source
      }
    }
  
    // Initialize Intersection Observer
    const observerOptions = {
      root: null,
      rootMargin: '50px 0px', // Start loading slightly before the media enters viewport
      threshold: 0.01
    };
  
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const media = entry.target;
          const originalSources = {
            originalSrc: media.dataset.src,
            originalSrcset: media.dataset.srcset
          };
          
          loadMedia(media, originalSources);
          observer.unobserve(media); // Stop observing once loaded
        }
      });
    }, observerOptions);
  
    const medias = document.querySelectorAll("img, video");
    for (const media of medias) {
      const originalSources = setupLazyLoading(media);
  
      switch (media.tagName) {
        case "IMG":
          media.addEventListener("load", () => onMediaLoaded(media));
          media.addEventListener("error", () => setFallbackHeight(media));
          break;
        case "VIDEO":
          media.addEventListener("loadeddata", () => onMediaLoaded(media));
          media.addEventListener("error", () => setFallbackHeight(media));
          break;
      }
  
      // Start observing the media element
      observer.observe(media);
    }
  }
  
  // Initialize on DOM content loaded and handle dynamic updates
  document.addEventListener('DOMContentLoaded', adjustMediaPadding);
  window.addEventListener("load", adjustMediaPadding);
  window.addEventListener("resize", adjustMediaPadding);
  
  function checkOffsets() {
    const ignoredTagNames = new Set([
      "THEAD",
      "TBODY",
      "TFOOT",
      "TR",
      "TD",
      "TH",
    ]);
    const cell = gridCellDimensions();
    const elements = document.querySelectorAll("body :not(.debug-grid, .debug-toggle)");
    for (const element of elements) {
      if (ignoredTagNames.has(element.tagName)) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }
      const top = rect.top + window.scrollY;
      const left = rect.left + window.scrollX;
      const offset = top % (cell.height / 2);
      if(offset > 0) {
        element.classList.add("off-grid");
        console.error("Incorrect vertical offset for", element, "with remainder", top % cell.height, "when expecting divisible by", cell.height / 2);
      } else {
        element.classList.remove("off-grid");
      }
    }
  }
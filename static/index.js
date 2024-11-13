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
  
  function adjustMediaPadding() {
    const cell = gridCellDimensions();
  
    function setHeightFromRatio(media, ratio) {
      const rect = media.getBoundingClientRect();
      const realHeight = rect.width / ratio;
      const diff = cell.height - (realHeight % cell.height);
    //   media.style.setProperty("padding-bottom", `${diff}px`);
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
      // Check if the media already has data attributes set
      if (media.dataset.src || media.dataset.srcset) {
        console.debug('Media already setup for lazy loading:', media);
        return {
          originalSrc: media.dataset.src,
          originalSrcset: media.dataset.srcset
        };
      }
  
      // Get current sources before modifying
      const originalSrc = media.tagName === 'IMG' ? 
        (media.getAttribute('src') || media.currentSrc) : 
        media.getAttribute('src');
      const originalSrcset = media.getAttribute('srcset');
  
      // Validate sources
      if (!originalSrc) {
        console.warn('No source found for media:', media);
        return null;
      }
  
      // Store original sources as data attributes
      media.dataset.src = originalSrc;
      if (originalSrcset) media.dataset.srcset = originalSrcset;
  
      // Remove src/srcset after storing them
      media.removeAttribute('src');
      if (originalSrcset) media.removeAttribute('srcset');
  
      // Add loading="lazy" attribute
      media.setAttribute('loading', 'lazy');
  
      // Add placeholder styles
      media.style.minHeight = '50px';
    //   media.style.background = '#f0f0f0';
  
      return { originalSrc, originalSrcset };
    }
  
    function loadMedia(media, originalSources) {
      if (!originalSources) return;
  
      const loadPromise = new Promise((resolve, reject) => {
        const onSuccess = () => {
          console.debug('Successfully loaded media:', media.dataset.src);
          resolve(media);
        };
  
        const onError = (error) => {
          console.error('Failed to load media:', media.dataset.src, error);
          reject(error);
        };
  
        if (media.tagName === 'IMG') {
          media.addEventListener('load', onSuccess, { once: true });
          media.addEventListener('error', onError, { once: true });
  
          if (originalSources.originalSrcset) {
            media.setAttribute('srcset', originalSources.originalSrcset);
          }
          media.setAttribute('src', originalSources.originalSrc);
        } else if (media.tagName === 'VIDEO') {
          media.addEventListener('loadeddata', onSuccess, { once: true });
          media.addEventListener('error', onError, { once: true });
          
          media.setAttribute('src', originalSources.originalSrc);
          media.load();
        }
      });
  
      return loadPromise.catch(error => {
        // If loading fails, try loading directly without lazy loading
        console.warn('Retrying media load without lazy loading:', media.dataset.src);
        media.setAttribute('src', originalSources.originalSrc);
        setFallbackHeight(media);
      });
    }
  
    // Initialize Intersection Observer
    const observerOptions = {
      root: null,
      rootMargin: '50px 0px',
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
  
          loadMedia(media, originalSources).then(() => {
            onMediaLoaded(media);
            observer.unobserve(media);
          });
        }
      });
    }, observerOptions);
  
    // Process all media elements
    const medias = document.querySelectorAll("img, video");
    for (const media of medias) {
      const originalSources = setupLazyLoading(media);
      
      if (originalSources) {
        observer.observe(media);
      } else {
        // If setup failed, load directly
        console.warn('Falling back to direct loading for:', media);
        media.setAttribute('src', media.dataset.src || '');
        setFallbackHeight(media);
      }
    }
  }
  
  // Initialize and handle events
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
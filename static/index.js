// Analytics initialization
const ANALYTICS_ID = 'G-HGLY59697K';
let analyticsLoaded = false;
const analyticsQueue = [];
let isProcessing = false;

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

function processAnalyticsQueue() {
  if (isProcessing || !analyticsLoaded || analyticsQueue.length === 0) return;
  
  isProcessing = true;
  const batch = analyticsQueue.splice(0, 10);
  
  requestIdleCallback(() => {
    batch.forEach(event => gtag(...event));
    isProcessing = false;
    
    if (analyticsQueue.length > 0) {
      processAnalyticsQueue();
    }
  }, { timeout: 2000 });
}

function queueAnalyticsEvent(...args) {
  analyticsQueue.push(args);
  if (!isProcessing && analyticsLoaded) {
    processAnalyticsQueue();
  }
}

function loadAnalytics() {
  gtag('js', new Date());
  gtag('config', ANALYTICS_ID, {
    'send_page_view': false,
    'transport_type': 'beacon'
  });

  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
  script.async = true;
  
  script.onload = () => {
    analyticsLoaded = true;
    processAnalyticsQueue();
  };

  requestIdleCallback(() => {
    document.head.appendChild(script);
  }, { timeout: 5000 });
}

// Grid and media handling utilities
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

function handleMediaDimensions(media, cell) {
  function setHeightFromRatio(media, ratio) {
    const rect = media.getBoundingClientRect();
    const realHeight = rect.width / ratio;
    const diff = cell.height - (realHeight % cell.height);
  }

  function setFallbackHeight(media) {
    const rect = media.getBoundingClientRect();
    const height = Math.round((rect.width / 2) / cell.height) * cell.height;
    media.style.setProperty("height", `${height}px`);
  }

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

// Lazy loading implementation
function setupLazyLoading(media) {
  if (media.dataset.src || media.dataset.srcset) {
    return {
      originalSrc: media.dataset.src,
      originalSrcset: media.dataset.srcset
    };
  }

  const originalSrc = media.tagName === 'IMG' ? 
    (media.getAttribute('src') || media.currentSrc) : 
    media.getAttribute('src');
  const originalSrcset = media.getAttribute('srcset');

  if (!originalSrc) {
    console.warn('No source found for media:', media);
    return null;
  }

  media.dataset.src = originalSrc;
  if (originalSrcset) media.dataset.srcset = originalSrcset;

  media.removeAttribute('src');
  if (originalSrcset) media.removeAttribute('srcset');
  media.setAttribute('loading', 'lazy');
  media.style.minHeight = '50px';

  return { originalSrc, originalSrcset };
}

function loadMedia(media, originalSources, cell) {
  if (!originalSources) return Promise.reject('No sources provided');

  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      handleMediaDimensions(media, cell);
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
}

// Main initialization function
function initializePage() {
  const cell = gridCellDimensions();
  
  // Setup intersection observer for media
  const observerOptions = {
    root: null,
    rootMargin: '50px 0px',
    threshold: 0.01
  };

  const mediaObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const media = entry.target;
        const originalSources = {
          originalSrc: media.dataset.src,
          originalSrcset: media.dataset.srcset
        };

        loadMedia(media, originalSources, cell)
          .catch(() => {
            media.setAttribute('src', originalSources.originalSrc);
            handleMediaDimensions(media, cell);
          })
          .finally(() => {
            observer.unobserve(media);
          });
      }
    });
  }, observerOptions);

  // Process all media elements
  const medias = document.querySelectorAll("img, video");
  medias.forEach(media => {
    const originalSources = setupLazyLoading(media);
    if (originalSources) {
      mediaObserver.observe(media);
    } else {
      media.setAttribute('src', media.dataset.src || '');
      handleMediaDimensions(media, cell);
    }
  });

  // Clean up URL
  if (window.location.pathname.length > 1 && window.location.pathname.endsWith('/')) {
    const newPath = window.location.pathname.slice(0, -1);
    window.history.replaceState(null, '', newPath + window.location.search + window.location.hash);
  }

  // Initialize analytics after content is loaded
  requestIdleCallback(() => {
    loadAnalytics();
  }, { timeout: 3000 });
}

// Grid offset checking utility
function checkOffsets() {
  const ignoredTagNames = new Set([
    "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH"
  ]);
  
  const cell = gridCellDimensions();
  const elements = document.querySelectorAll("body :not(.debug-grid, .debug-toggle)");
  
  requestAnimationFrame(() => {
    elements.forEach(element => {
      if (ignoredTagNames.has(element.tagName)) return;
      
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      
      const top = rect.top + window.scrollY;
      const offset = top % (cell.height / 2);
      
      if (offset > 0) {
        element.classList.add("off-grid");
        console.error("Incorrect vertical offset for", element, "with remainder", top % cell.height, "when expecting divisible by", cell.height / 2);
      } else {
        element.classList.remove("off-grid");
      }
    });
  });
}

// Event listeners with debouncing
let resizeTimeout;
window.addEventListener('resize', () => {
  if (resizeTimeout) {
    cancelAnimationFrame(resizeTimeout);
  }
  resizeTimeout = requestAnimationFrame(() => {
    initializePage();
    checkOffsets();
  });
}, { passive: true });

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  requestIdleCallback(() => {
    initializePage();
    checkOffsets();
  }, { timeout: 1000 });
}, { passive: true });


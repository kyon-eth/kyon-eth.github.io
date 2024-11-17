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
  if (analyticsLoaded) return;
  
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

// Grid calculation utilities
function getComputedLineHeight() {
  const body = document.body;
  const computedStyle = window.getComputedStyle(body);
  return parseFloat(computedStyle.getPropertyValue('--line-height')) || 1.5;
}

function gridCellDimensions() {
  const testElement = document.createElement("div");
  testElement.style.cssText = `
    position: absolute;
    height: var(--line-height);
    width: 1ch;
    visibility: hidden;
    pointer-events: none;
  `;
  document.body.appendChild(testElement);
  
  const rect = testElement.getBoundingClientRect();
  const dimensions = {
    width: Math.round(rect.width * 100) / 100,
    height: Math.round(rect.height * 100) / 100,
    lineHeight: getComputedLineHeight()
  };
  
  document.body.removeChild(testElement);
  return dimensions;
}

function handleMediaDimensions(media, gridDims) {
  function setHeightFromRatio(element, ratio) {
    const rect = element.getBoundingClientRect();
    const targetHeight = rect.width / ratio;
    const gridLines = Math.round(targetHeight / gridDims.height);
    const adjustedHeight = gridLines * gridDims.height;
    element.style.height = `${adjustedHeight}px`;
  }

  function setFallbackHeight(element) {
    const rect = element.getBoundingClientRect();
    const gridLines = Math.round((rect.width / 2) / gridDims.height);
    element.style.height = `${gridLines * gridDims.height}px`;
  }

  let width, height;
  if (media.tagName === "IMG") {
    width = media.naturalWidth;
    height = media.naturalHeight;
  } else if (media.tagName === "VIDEO") {
    width = media.videoWidth;
    height = media.videoHeight;
  }

  if (width && height) {
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

  if (!originalSrc) return null;

  media.dataset.src = originalSrc;
  if (originalSrcset) media.dataset.srcset = originalSrcset;

  media.removeAttribute('src');
  if (originalSrcset) media.removeAttribute('srcset');
  media.setAttribute('loading', 'lazy');
  media.style.minHeight = '50px';

  return { originalSrc, originalSrcset };
}

function loadMedia(media, originalSources, gridDims) {
  if (!originalSources) return Promise.reject('No sources provided');

  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      handleMediaDimensions(media, gridDims);
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

// Grid alignment checking
function checkOffsets() {
  const ignoredTagNames = new Set([
    "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH",
    "SCRIPT", "STYLE", "META", "LINK", "BR", "HR"
  ]);
  
  const gridDims = gridCellDimensions();
  const halfGridHeight = gridDims.height / 2;
  
  requestAnimationFrame(() => {
    const elements = document.querySelectorAll("body *:not(.debug-grid, .debug-toggle)");
    
    elements.forEach(element => {
      if (ignoredTagNames.has(element.tagName)) return;
      
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const top = Math.round((rect.top + window.scrollY) * 100) / 100;
      const remainder = top % halfGridHeight;
      
      // Use a small threshold for floating point precision
      const threshold = 0.1;
      if (remainder > threshold && remainder < (halfGridHeight - threshold)) {
        element.classList.add("off-grid");
        if (!element.hasAttribute('data-off-grid-logged')) {
          console.debug(
            "Grid offset:",
            element.tagName.toLowerCase() + 
            (element.className ? '.' + element.className.split(' ').join('.') : ''),
            `\nExpected multiple of ${halfGridHeight.toFixed(2)}, got remainder ${remainder.toFixed(2)}`,
            `\nActual top: ${top.toFixed(2)}`
          );
          element.setAttribute('data-off-grid-logged', 'true');
        }
      } else {
        element.classList.remove("off-grid");
      }
    });
  });
}

// Main initialization
function initializePage() {
  const gridDims = gridCellDimensions();
  
  // Setup intersection observer
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

        loadMedia(media, originalSources, gridDims)
          .catch(() => {
            media.setAttribute('src', originalSources.originalSrc);
            handleMediaDimensions(media, gridDims);
          })
          .finally(() => {
            observer.unobserve(media);
          });
      }
    });
  }, observerOptions);

  // Process media elements
  document.querySelectorAll("img, video").forEach(media => {
    const originalSources = setupLazyLoading(media);
    if (originalSources) {
      mediaObserver.observe(media);
    } else {
      media.setAttribute('src', media.dataset.src || '');
      handleMediaDimensions(media, gridDims);
    }
  });

  // Clean URLs
  if (window.location.pathname.length > 1 && window.location.pathname.endsWith('/')) {
    const newPath = window.location.pathname.slice(0, -1);
    window.history.replaceState(null, '', newPath + window.location.search + window.location.hash);
  }

  // Load analytics
  requestIdleCallback(() => {
    loadAnalytics();
  }, { timeout: 3000 });
}

// Event handlers
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

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    requestIdleCallback(() => {
      initializePage();
      checkOffsets();
    }, { timeout: 1000 });
  }, { passive: true });
} else {
  requestIdleCallback(() => {
    initializePage();
    checkOffsets();
  }, { timeout: 1000 });
}
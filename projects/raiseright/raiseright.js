/* ============================================================
   RaiseRight Case Study — page-specific JS
   - Sticky process nav active-state via IntersectionObserver
   - PDF embeds (inline thumbnail + fullscreen modal viewer)
   - Lazy-loads pdf.js only when an embed enters viewport
   ============================================================ */
(function () {
  "use strict";

  // ---- Hide site header when process nav goes sticky ----------
  var processSection = document.getElementById("process");
  if (processSection) {
    var sentinel = document.createElement("div");
    sentinel.style.cssText = "height:1px;pointer-events:none;";
    processSection.parentNode.insertBefore(sentinel, processSection);

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          document.body.classList.add("process-sticky");
        } else {
          document.body.classList.remove("process-sticky");
        }
      });
    }, { threshold: 0 }).observe(sentinel);
  }

  // ---- Sticky process nav active state ------------------------
  var processLinks = document.querySelectorAll(".process-link");
  var watchedSections = [];

  processLinks.forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    var el = document.getElementById(href.slice(1));
    if (el) watchedSections.push({ el: el, link: link });
  });

  if (watchedSections.length) {
    var setActive = function (id) {
      processLinks.forEach(function (l) {
        var isActive = l.getAttribute("href") === "#" + id;
        l.classList.toggle("active", isActive);
        if (isActive) l.setAttribute("aria-current", "location");
        else l.removeAttribute("aria-current");
      });
    };

    var processObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    watchedSections.forEach(function (s) { processObserver.observe(s.el); });
  }

  // ---- PDF.js lazy loader -------------------------------------
  var PDFJS_SRC = "../../scripts/pdfjs/pdf.min.js";
  var PDFJS_WORKER = "../../scripts/pdfjs/pdf.worker.min.js";
  var pdfjsPromise = null;

  function loadPdfJs() {
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise(function (resolve, reject) {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
        return;
      }
      var s = document.createElement("script");
      s.src = PDFJS_SRC;
      s.async = true;
      s.onload = function () {
        if (!window.pdfjsLib) return reject(new Error("pdfjsLib missing after load"));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { reject(new Error("Failed to load pdf.js")); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }

  // ---- PDF inline embeds --------------------------------------
  var embeds = document.querySelectorAll(".pdf-embed");
  if (embeds.length) {
    var renderEmbed = function (btn) {
      var src = btn.dataset.pdfSrc;
      if (!src || btn.dataset.rendered === "1") return;
      btn.dataset.rendered = "1";
      loadPdfJs().then(function (pdfjsLib) {
        return pdfjsLib.getDocument(src).promise;
      }).then(function (doc) {
        return doc.getPage(1).then(function (page) {
          var canvas = document.createElement("canvas");
          var ctx = canvas.getContext("2d");
          var containerWidth = btn.clientWidth || 800;
          var unscaled = page.getViewport({ scale: 1 });
          var scale = Math.min(containerWidth / unscaled.width, 2);
          var viewport = page.getViewport({ scale: scale });
          var dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          var skeleton = btn.querySelector(".pdf-skeleton");
          if (skeleton) skeleton.remove();
          btn.insertBefore(canvas, btn.firstChild);
          return page.render({
            canvasContext: ctx,
            viewport: viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
          }).promise;
        });
      }).catch(function (err) {
        console.warn("PDF embed render failed:", src, err);
        var skeleton = btn.querySelector(".pdf-skeleton");
        if (skeleton) skeleton.textContent = "Could not load PDF. Click to open in viewer.";
      });
    };

    var embedObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            renderEmbed(entry.target);
            embedObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px 0px" }
    );

    embeds.forEach(function (btn) {
      embedObserver.observe(btn);
      btn.addEventListener("click", function () { openModal(btn.dataset.pdfSrc, btn.dataset.pdfTitle, btn); });
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(btn.dataset.pdfSrc, btn.dataset.pdfTitle, btn);
        }
      });
    });
  }

  // ---- Modal viewer -------------------------------------------
  var modal = document.getElementById("pdfModal");
  var modalCanvas = modal && modal.querySelector(".pdf-modal-canvas");
  var modalTitle = modal && modal.querySelector(".pdf-modal-title");
  var pageCounter = modal && modal.querySelector(".pdf-page-counter");
  var prevBtn = modal && modal.querySelector('[data-action="prev"]');
  var nextBtn = modal && modal.querySelector('[data-action="next"]');
  var zoomInBtn = modal && modal.querySelector('[data-action="zoom-in"]');
  var zoomOutBtn = modal && modal.querySelector('[data-action="zoom-out"]');
  var fitWidthBtn = modal && modal.querySelector('[data-action="fit-width"]');
  var fitPageBtn = modal && modal.querySelector('[data-action="fit-page"]');
  var closeBtn = modal && modal.querySelector('[data-action="close"]');

  var currentDoc = null;
  var currentPage = 1;
  var fitMode = "width"; // "width" | "page" | "manual"
  var manualScale = 1;
  var lastTrigger = null;

  function openModal(src, title, trigger) {
    if (!modal || !src) return;
    lastTrigger = trigger || null;
    modal.classList.add("open");
    modal.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    if (modalTitle) modalTitle.textContent = title || "";
    currentPage = 1;
    fitMode = "width";
    loadPdfJs().then(function (pdfjsLib) {
      return pdfjsLib.getDocument(src).promise;
    }).then(function (doc) {
      currentDoc = doc;
      renderModalPage();
      if (closeBtn) closeBtn.focus();
    }).catch(function (err) {
      console.warn("Modal load failed:", src, err);
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    currentDoc = null;
    if (lastTrigger) lastTrigger.focus();
  }

  function renderModalPage() {
    if (!currentDoc || !modalCanvas) return;
    currentDoc.getPage(currentPage).then(function (page) {
      var viewport = page.getViewport({ scale: 1 });
      var viewportEl = modal.querySelector(".pdf-modal-viewport");
      var padding = 48;
      var availW = viewportEl.clientWidth - padding;
      var availH = viewportEl.clientHeight - padding;
      var scale;
      if (fitMode === "width") scale = availW / viewport.width;
      else if (fitMode === "page") scale = Math.min(availW / viewport.width, availH / viewport.height);
      else scale = manualScale;
      var dpr = window.devicePixelRatio || 1;
      var scaledViewport = page.getViewport({ scale: scale });
      modalCanvas.width = Math.floor(scaledViewport.width * dpr);
      modalCanvas.height = Math.floor(scaledViewport.height * dpr);
      modalCanvas.style.width = scaledViewport.width + "px";
      modalCanvas.style.height = scaledViewport.height + "px";
      var ctx = modalCanvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
      return page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      }).promise.then(function () {
        if (pageCounter) pageCounter.textContent = currentPage + " of " + currentDoc.numPages;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= currentDoc.numPages;
        manualScale = scale;
      });
    });
  }

  if (modal) {
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (prevBtn) prevBtn.addEventListener("click", function () {
      if (currentDoc && currentPage > 1) { currentPage--; renderModalPage(); }
    });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (currentDoc && currentPage < currentDoc.numPages) { currentPage++; renderModalPage(); }
    });
    if (zoomInBtn) zoomInBtn.addEventListener("click", function () {
      fitMode = "manual"; manualScale = Math.min(manualScale * 1.25, 6); renderModalPage();
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () {
      fitMode = "manual"; manualScale = Math.max(manualScale / 1.25, 0.25); renderModalPage();
    });
    if (fitWidthBtn) fitWidthBtn.addEventListener("click", function () { fitMode = "width"; renderModalPage(); });
    if (fitPageBtn) fitPageBtn.addEventListener("click", function () { fitMode = "page"; renderModalPage(); });

    // Click backdrop closes
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });

    // Keyboard handling
    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("open")) return;
      if (e.key === "Escape") { e.preventDefault(); closeModal(); }
      else if (e.key === "ArrowRight" && nextBtn && !nextBtn.disabled) { nextBtn.click(); }
      else if (e.key === "ArrowLeft" && prevBtn && !prevBtn.disabled) { prevBtn.click(); }
      else if (e.key === "Tab") {
        // Simple focus trap inside the toolbar
        var focusable = modal.querySelectorAll('button:not(:disabled)');
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Re-render on resize (debounced) for fit modes
    var resizeTimer;
    window.addEventListener("resize", function () {
      if (!modal.classList.contains("open") || !currentDoc) return;
      if (fitMode === "manual") return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderModalPage, 120);
    });
  }
})();

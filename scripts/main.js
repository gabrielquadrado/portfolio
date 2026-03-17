(function () {
  "use strict";

  // ── Feather icons ──────────────────────────────────────────────
  feather.replace();

  // ── Mobile hamburger toggle ────────────────────────────────────
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.querySelector("nav");

  function closeMobileMenu() {
    if (nav && nav.classList.contains("open")) {
      nav.classList.remove("open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      this.setAttribute("aria-expanded", String(isOpen));
      this.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });
  }

  // Close mobile menu on any nav link click
  document.querySelectorAll("nav a").forEach(function (link) {
    link.addEventListener("click", closeMobileMenu);
  });

  // ── Active nav link on scroll (index page only) ────────────────
  var sections = document.querySelectorAll("section[id], footer[id]");
  var navItems = document.querySelectorAll(".nav-item");

  if (sections.length > 1 && navItems.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            navItems.forEach(function (link) {
              link.classList.remove("active");
              var href = link.getAttribute("href");
              if (href === "#" + id || (href === "#" && id === "intro")) {
                link.classList.add("active");
              }
            });
          }
        });
      },
      { rootMargin: "-30% 0px -70% 0px" }
    );

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  // ── Scroll animations (fade-in on enter) ───────────────────────
  var animateSelectors = [
    ".section-title",
    ".job-item",
    ".education-item",
    ".project-featured-grid > .project-item",
    ".project-grid > .project-item",
    "#project-hero .container",
    ".details-item",
    "footer .right-container"
  ];

  var animateEls = document.querySelectorAll(animateSelectors.join(", "));

  animateEls.forEach(function (el) {
    el.classList.add("fade-in");
  });

  var fadeObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  animateEls.forEach(function (el) {
    fadeObserver.observe(el);
  });

  // ── Dark mode toggle ──────────────────────────────────────────
  var themeToggle = document.querySelector(".theme-toggle");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
})();

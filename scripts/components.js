(function () {
  "use strict";

  // Determine base path from the data-base attribute on the script tag,
  // or default to "" (root level).
  var script = document.currentScript;
  var base = (script && script.getAttribute("data-base")) || "";

  function loadComponent(selector, file) {
    var target = document.querySelector(selector);
    if (!target) return;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", base + "components/" + file, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        // Replace {{BASE}} placeholder with the actual base path
        var html = xhr.responseText.replace(/\{\{BASE\}\}/g, base);
        target.outerHTML = html;

        // Re-run feather icons on the new DOM nodes
        if (typeof feather !== "undefined") feather.replace();

        // Re-bind mobile menu toggle for the new header
        bindMobileMenu();
        bindThemeToggle();
      }
    };
    xhr.send();
  }

  function bindMobileMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector("nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      this.setAttribute("aria-expanded", String(isOpen));
      this.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    document.querySelectorAll("nav a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Open menu");
        }
      });
    });
  }

  function bindThemeToggle() {
    var themeToggle = document.querySelector(".theme-toggle");
    if (!themeToggle) return;

    themeToggle.addEventListener("click", function () {
      var isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  // Load components into placeholder elements
  loadComponent("header-component", "header.html");
  loadComponent("footer-component", "footer.html");
})();

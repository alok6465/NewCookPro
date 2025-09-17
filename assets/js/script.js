// =======================
// Preloader
// =======================
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add("hidden"); // fade out
    }, 500); // small delay for smoothness
  }
});


// Load hero image animation
window.addEventListener("load", () => {
  const heroImg = document.querySelector(".hero-img");
  if (heroImg) heroImg.classList.add("loaded");

  updateArrowVisibility(); // Check arrows for category carousel
});

// Toggle menu for mobile
function toggleMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("active");
}

// Navbar scroll shrink effect
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;
  if (window.scrollY > 50) {
    navbar.style.padding = "10px 50px";
    navbar.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
  } else {
    navbar.style.padding = "20px 50px";
    navbar.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
  }
});

// Smooth scroll to section & close mobile menu
const navLinks = document.querySelectorAll(".nav-links a");
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    const nav = document.getElementById("navLinks");
    if (nav) nav.classList.remove("active");
  });
});

// Highlight Active Nav Link on Scroll
const sections = document.querySelectorAll("section");
window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 120;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") && link.getAttribute("href").includes(`#${current}`)) {
      link.classList.add("active");
    }
  });
});

// Category Scroll Buttons
function scrollCategory(direction) {
  const row = document.getElementById("categoryCarousel");
  if (!row) return;
  const scrollAmount = 300;
  row.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
}

// Show/hide scroll arrows based on overflow
function updateArrowVisibility() {
  const carousel = document.getElementById("categoryCarousel");
  const leftBtn = document.querySelector(".scroll-btn.left");
  const rightBtn = document.querySelector(".scroll-btn.right");
  if (!carousel || !leftBtn || !rightBtn) return;

  if (carousel.scrollWidth > carousel.clientWidth) {
    leftBtn.style.display = "block";
    rightBtn.style.display = "block";
  } else {
    leftBtn.style.display = "none";
    rightBtn.style.display = "none";
  }
}
window.addEventListener("resize", updateArrowVisibility);

// Falling Foods Animation
const foodImages = ["🍕","🍔","🍟","🥗","🍩","🍉","🍇","🍌","🥑","🍪"];

function triggerFoodRain(duration = 3000) {
  const container = document.querySelector('.falling-foods');
  if (!container) return;

  let drops = 0;
  const maxDrops = 20; // Limit per rain cycle

  const interval = setInterval(() => {
    if (drops >= maxDrops) return;
    const food = document.createElement('div');
    food.classList.add('falling-food');
    food.textContent = foodImages[Math.floor(Math.random() * foodImages.length)];
    food.style.left = Math.random() * window.innerWidth + 'px';
    food.style.animationDuration = (Math.random() * 2 + 2) + 's';
    container.appendChild(food);
    drops++;

    setTimeout(() => food.remove(), 4000);
  }, 150);

  setTimeout(() => clearInterval(interval), duration);
}

const logo = document.querySelector(".logo");
if (logo) {
  logo.addEventListener("click", () => {
    const home = document.getElementById("home");
    if (home) home.scrollIntoView({ behavior: "smooth" });
    triggerFoodRain(3000);
  });
}

// Initialize AOS (optimized)
AOS.init({
  duration: 1000,
  once: false,
  mirror: true
});
window.addEventListener("resize", () => AOS.refresh());

// ============================
// Category Popup Functionality
// ============================
const popup = document.getElementById("categoryPopup");
const iframe = document.getElementById("categoryIframe");

if (popup && iframe) {
  // Open popup instead of redirect
  document.querySelectorAll(".category-link").forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      const pageURL = this.getAttribute("href");
      iframe.src = pageURL;
      popup.style.display = "flex";
    });
  });

  // Close when clicking X
  const closeBtn = document.querySelector(".close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closePopup);

  // Close when clicking outside popup content
  popup.addEventListener("click", function(e) {
    if (e.target === popup) closePopup();
  });

  // Close with Esc key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
  });

  function closePopup() {
    popup.style.display = "none";
    iframe.src = ""; // stop page load
  }
}

let recipes = [];
let fuse;

async function loadRecipes() {
  try {
    const res = await fetch("assets/data/recipes.json");
    recipes = await res.json();

    // Add searchIndex for better fuzzy matching
    recipes.forEach(recipe => {
      const combined = [
        recipe.name,
        ...(recipe.ingredients || [])
      ].join(" ").toLowerCase().replace(/[^\w\s]/g, "");
      recipe.searchIndex = combined;
    });

    fuse = new Fuse(recipes, {
      keys: ["searchIndex"],
      threshold: 0.35,
      distance: 300,
      minMatchCharLength: 2,
      includeScore: true,
      ignoreLocation: true,
    });

    // Check URL param for shared recipe
    const params = new URLSearchParams(window.location.search);
    const recipeSlug = params.get("recipe");
    if (recipeSlug) {
      const found = recipes.find(r =>
        r.name.toLowerCase().replace(/\s+/g, '-') === recipeSlug
      );
      if (found) {
        showRecipeModal(found, false);
      }
    }

    // Render some initial recipes (first page) so page isn't empty and search feels responsive
    // Intentionally do not render initial thumbnails here.
    // Thumbnails will be shown only when the user performs a search.
    // This avoids crowding the page with all recipes by default.

  } catch (err) {
    console.error("❌ Failed to load recipes:", err);
  }
}

function handleSearch() {
  const inputEl = document.getElementById("searchInput");
  if (!inputEl) return;
  const raw = (inputEl.value || '').trim().toLowerCase();

  // If empty, show initial set for responsiveness
  if (!raw) {
    // If the user cleared the search, don't show all thumbnails by default.
    // Show a small placeholder prompt instead. Thumbnails only appear after a search.
    clearSeeMore();
    const container = document.getElementById('recipeResults');
    if (container) {
      container.innerHTML = '<p class="search-placeholder">Start typing to search recipes...</p>';
    }
    return;
  }

  const cleanedInput = raw.replace(/[^\w\s]/g, "");
  let results = [];

  // Prefer Fuse if ready, otherwise fallback to a simple substring search
  if (fuse) {
    try {
      results = fuse.search(cleanedInput);
    } catch (e) {
      // defensive: if fuse throws, fall back to simple search
      results = recipes
        .map(r => ({ item: r, score: r.searchIndex && r.searchIndex.includes(cleanedInput) ? 0 : 1 }))
        .filter(x => x.score === 0);
    }
  } else {
    // fallback: match recipe name or ingredients using precomputed searchIndex
    results = recipes
      .map(r => ({ item: r, score: r.searchIndex && r.searchIndex.includes(cleanedInput) ? 0 : 1 }))
      .filter(x => x.score === 0);
  }

  // If we have too few results, broaden search safely.
  if ((results && results.length < 3) && fuse) {
    const words = cleanedInput.split(/\s+/).filter(Boolean);
    const matchMap = new Map();
    words.forEach(word => {
      try {
        fuse.search(word).forEach(({ item, score }) => {
          if (!matchMap.has(item)) matchMap.set(item, score);
          else matchMap.set(item, Math.min(matchMap.get(item), score));
        });
      } catch (e) { /* ignore per-word errors */ }
    });
    if (matchMap.size) results = Array.from(matchMap.entries()).map(([item, score]) => ({ item, score }));
  } else if ((results && results.length < 3) && !fuse) {
    // widen: match if any word present in searchIndex
    const words = cleanedInput.split(/\s+/).filter(Boolean);
    const matchSet = new Set();
    words.forEach(word => {
      recipes.forEach(r => { if (r.searchIndex && r.searchIndex.includes(word)) matchSet.add(r); });
    });
    if (matchSet.size) results = Array.from(matchSet).map(item => ({ item, score: 0 }));
  }

  // Normalize results array into objects { item, score }
  const normalized = (results || []).map(r => (r && r.item) ? r : ({ item: r, score: (r && r.score) || 0 }));
  const sorted = normalized.sort((a, b) => (a.score || 0) - (b.score || 0)).map(x => x.item);

  // If there are more than 10, render first 10 and show 'See more'
  if (sorted.length > 10) {
    renderRecipes(sorted.slice(0, 10));
    renderSeeMore(sorted.slice(10));
  } else {
    clearSeeMore();
    renderRecipes(sorted);
  }
}

// Render 'See more' button and attach behavior to reveal remaining results
function renderSeeMore(extraResults) {
  clearSeeMore();
  const container = document.getElementById('recipeResults');
  if (!container || !extraResults || !extraResults.length) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'see-more-wrapper';
  const btn = document.createElement('button');
  btn.className = 'see-more-btn';
  btn.textContent = `See ${extraResults.length} more`;
  btn.onclick = () => {
    // append remaining cards
    extraResults.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.name}" />
        <div class="content">
          <h3 class="title">${recipe.name}</h3>
          <div class="time-likes">
            <span>⏱ ${recipe.time}</span>
            <span>❤️ ${recipe.likes || 100}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => showRecipeModal(recipe));
      container.appendChild(card);
    });
    wrapper.remove();
  };
  wrapper.appendChild(btn);
  container.appendChild(wrapper);
}

function clearSeeMore(){
  const existing = document.querySelector('.see-more-wrapper');
  if (existing) existing.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  if (input) {
    // Enter to search
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
    // Live search with small debounce for UX
    let _deb;
    input.addEventListener('input', () => {
      clearTimeout(_deb);
      _deb = setTimeout(handleSearch, 220);
    });
  }

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", handleSearch);
  }

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("recipeModal");
    if (e.target === modal) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Handle back button closing modal
  window.addEventListener("popstate", () => {
    const modal = document.getElementById("recipeModal");
    if (modal && modal.style.display === "flex") {
      closeModal();
    }
  });
});

function renderRecipes(recipesToShow) {
  const container = document.getElementById("recipeResults");
  container.innerHTML = "";

  if (!recipesToShow.length) {
    container.innerHTML = `<p>No matching recipes found.</p>`;
    return;
  }

  recipesToShow.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <img src="${recipe.image}" alt="${recipe.name}" />
      <div class="content">
        <h3 class="title">${recipe.name}</h3>
        <div class="time-likes">
          <span>⏱ ${recipe.time}</span>
          <span>❤️ ${recipe.likes || 100}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => showRecipeModal(recipe));
    container.appendChild(card);
  });
}

function extractYoutubeID(url) {
  const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function showRecipeModal(recipe, pushUrl = true) {
  // Title & basic
  document.getElementById("modalTitle").textContent = recipe.name;
  document.getElementById("modalTime").textContent = recipe.time;
  document.getElementById("modalDescription").textContent = recipe.description || "No description available.";

  // Ingredients as list
  const ingredientsContainer = document.getElementById("modalIngredients");
  ingredientsContainer.innerHTML = "";
  (recipe.ingredients || []).forEach(ing => {
    const li = document.createElement("li");
    li.textContent = ing;
    ingredientsContainer.appendChild(li);
  });

  // Benefits
  const benefitsContainer = document.getElementById("modalBenefits");
  benefitsContainer.innerHTML = "";
  (recipe.benefits || ["No listed benefits."]).forEach(benefit => {
    const li = document.createElement("li");
    li.textContent = benefit;
    benefitsContainer.appendChild(li);
  });

  // Steps
  const stepsContainer = document.getElementById("modalSteps");
  stepsContainer.innerHTML = "";
  (recipe.steps || []).forEach((step, i) => {
    const li = document.createElement("li");
    li.textContent = step.replace(/^\d+\.\s*/, '');
    stepsContainer.appendChild(li);
  });

  // YouTube video
  const videoId = extractYoutubeID(recipe.youtube || "");
  const youtubeFrame = document.getElementById("modalYoutube");
  if (videoId) {
    youtubeFrame.src = `https://www.youtube.com/embed/${videoId}`;
    youtubeFrame.style.display = "block";
  } else {
    youtubeFrame.src = "";
    youtubeFrame.style.display = "none";
  }

  // PDF download & Grocery
  document.getElementById("downloadBtn").onclick = () => downloadRecipeAsPDF(recipe);
  document.getElementById("groceryBtn").href = "https://blinkit.com/";
  document.getElementById("recipeModal").style.display = "flex";

  // ✅ Push slug to URL
  if (pushUrl) {
    const slug = recipe.name.toLowerCase().replace(/\s+/g, '-');
    history.pushState({ recipeId: slug }, "", `?recipe=${slug}`);
  }

  // ✅ Share options
  const shareBtn = document.getElementById("shareBtn");
  const shareOptions = document.getElementById("shareOptions");
  if (shareBtn && shareOptions) {
    const shareURL = `${window.location.origin}${window.location.pathname}?recipe=${recipe.name.toLowerCase().replace(/\s+/g, '-')}`;

    shareBtn.onclick = () => {
      shareOptions.style.display = shareOptions.style.display === "block" ? "none" : "block";
    };

    document.getElementById("copyLink").onclick = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(shareURL).then(() => alert("🔗 Link copied!"));
    };

    document.getElementById("whatsappShare").href = `https://wa.me/?text=${encodeURIComponent("Check this recipe on CookPro: " + shareURL)}`;
    document.getElementById("emailShare").href = `mailto:?subject=Check out this recipe&body=${encodeURIComponent("Look at this recipe: " + shareURL)}`;
    document.getElementById("facebookShare").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareURL)}`;
    document.getElementById("twitterShare").href = `https://twitter.com/intent/tweet?text=${encodeURIComponent("Try this recipe: " + shareURL)}`;
    document.getElementById("telegramShare").href = `https://t.me/share/url?url=${encodeURIComponent(shareURL)}&text=Check this CookPro recipe!`;
  }

  // Initialize comments for this recipe (if comments module available)
  try {
    if (window.CookProComments && typeof window.CookProComments.initForRecipe === 'function') {
      window.CookProComments.initForRecipe(recipe.name);
    }
  } catch (err) {
    console.warn('Comments init failed', err);
  }
}

function downloadRecipeAsPDF(recipe) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text(recipe.name, 10, y);
  y += 10;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Time: ${recipe.time}`, 10, y);
  y += 10;

  doc.text("Ingredients:", 10, y); y += 7;
  (recipe.ingredients || []).forEach(item => {
    doc.text(`• ${item}`, 14, y);
    y += 6;
  });

  y += 5;
  doc.text("Description:", 10, y); y += 7;
  const descLines = doc.splitTextToSize(recipe.description || "N/A", 180);
  descLines.forEach(line => {
    doc.text(line, 14, y);
    y += 6;
  });

  y += 5;
  doc.text("Benefits:", 10, y); y += 7;
  (recipe.benefits || ["No benefits listed"]).forEach(benefit => {
    const lines = doc.splitTextToSize(benefit, 180);
    lines.forEach(line => {
      doc.text(`• ${line}`, 14, y);
      y += 6;
    });
  });

  y += 5;
  doc.text("Steps:", 10, y); y += 7;
  (recipe.steps || []).forEach((step, i) => {
    const stepText = `${i + 1}. ${step.replace(/^\d+\.\s*/, '')}`;
    const lines = doc.splitTextToSize(stepText, 180);
    lines.forEach(line => {
      doc.text(line, 14, y);
      y += 6;
    });

    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  doc.save(`${recipe.name.replace(/\s+/g, "_")}.pdf`);
}

function closeModal() {
  document.getElementById("recipeModal").style.display = "none";
  document.getElementById("modalYoutube").src = "";
  const shareOptions = document.getElementById("shareOptions");
  if (shareOptions) shareOptions.style.display = "none";
  history.replaceState({}, "", window.location.pathname); // clear ?recipe= from URL
}

loadRecipes();


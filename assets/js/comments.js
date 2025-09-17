// comments.js - lightweight comment system using localStorage
// Responsibilities:
// - store comments per recipe slug
// - render reviews list and global "Top Comments Today"
// - support likes, image attachments (dataURL), persistent top-comments toggle, and toast feedback

(function(){
  // helpers
  function slugify(name){
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  function nowISO(){ return new Date().toISOString(); }

  function readStore(){
    try { return JSON.parse(localStorage.getItem('cookpro_comments')||'{}'); }
    catch(e){ return {}; }
  }
  function writeStore(obj){ localStorage.setItem('cookpro_comments', JSON.stringify(obj)); }

  // Toast helper (small unobtrusive feedback)
  function showToast(text, type='success', timeout=2800){
    try{
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const t = document.createElement('div');
      t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
      t.textContent = text;
      container.appendChild(t);
      setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, timeout);
    }catch(e){/* ignore */}
  }

  // Render a single comment card
  function renderCommentCard(comment){
    const card = document.createElement('div');
    card.className = 'review-card';

    const imgWrap = document.createElement('div');
    if (comment.image) {
      const img = document.createElement('img');
      img.src = comment.image;
      img.className = 'small-img';
      imgWrap.appendChild(img);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.style.fontWeight = '700';
    name.textContent = comment.name || 'Anonymous';

    const time = document.createElement('div');
    time.style.fontSize = '0.8rem';
    time.style.color = '#666';
    const d = new Date(comment.createdAt);
    time.textContent = d.toLocaleString();

    const text = document.createElement('div');
    text.textContent = comment.text;
    text.style.marginTop = '6px';

    const controls = document.createElement('div');
    controls.className = 'controls';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'like-btn';
    likeBtn.textContent = `❤ ${comment.likes||0}`;
    likeBtn.onclick = () => {
      comment.likes = (comment.likes||0) + 1;
      saveComment(comment);
      likeBtn.textContent = `❤ ${comment.likes}`;
      // re-render per-recipe and global lists
      renderTopToday(currentSlug);
      try{ renderGlobalTopComments(); }catch(e){}
      showToast('Thanks — you liked a comment');
    };

    controls.appendChild(likeBtn);

    meta.appendChild(name);
    meta.appendChild(time);
    meta.appendChild(text);
    meta.appendChild(controls);

    if (imgWrap.children.length) card.appendChild(imgWrap);
    card.appendChild(meta);

    return card;
  }

  // Save/update a single comment
  function saveComment(comment){
    const store = readStore();
    const per = store[comment.recipe] || [];
    const idx = per.findIndex(c=>c.id===comment.id);
    if (idx>=0) per[idx]=comment; else per.unshift(comment);
    store[comment.recipe]=per;
    writeStore(store);
  }

  // Create a new comment
  function createComment(recipeSlug, name, text, imageDataURL){
    const comment = {
      id: 'c_' + Math.random().toString(36).slice(2,9),
      recipe: recipeSlug,
      name: name || 'Anonymous',
      text: text || '',
      image: imageDataURL || null,
      likes: 0,
      createdAt: nowISO()
    };
    saveComment(comment);
    try{ renderGlobalTopComments(); }catch(e){}
    return comment;
  }

  // Render list for a recipe
  let currentSlug = null;
  function renderReviews(recipeName){
    currentSlug = slugify(recipeName||'');
    const store = readStore();
    const list = (store[currentSlug]||[]).slice(); // clone

    // Sort: newest first
    list.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));

    const container = document.getElementById('reviewsList');
    if (!container) return;
    container.innerHTML='';

    if (!list.length) {
      container.innerHTML = '<div style="color:#666">No comments yet. Be the first to comment!</div>';
      renderTopToday(currentSlug);
      return;
    }

    list.forEach(c=> container.appendChild(renderCommentCard(c)));
    renderTopToday(currentSlug);
  }

  // Compute Top Today (by likes and within today) - per recipe
  function renderTopToday(recipeSlug){
    const store = readStore();
    const all = (store[recipeSlug]||[]).slice();
    const today = new Date();
    today.setHours(0,0,0,0);
    const top = all.filter(c => new Date(c.createdAt) >= today)
                   .sort((a,b)=> (b.likes||0)-(a.likes||0))
                   .slice(0,3);

    const el = document.getElementById('topTodayList');
    if (!el) return;
    el.innerHTML='';
    if (!top.length) {
      el.innerHTML = '<div style="color:#666; font-size:0.9rem;">No top comments for today</div>';
      return;
    }

    top.forEach(c=>{
      const t = document.createElement('div');
      t.className = 'top-comment';
      const name = document.createElement('div'); name.className='name'; name.textContent = c.name;
      const txt = document.createElement('div'); txt.className='text'; txt.textContent = c.text.length>60? c.text.slice(0,60)+'...': c.text;
      const likes = document.createElement('div'); likes.style.fontSize='0.85rem'; likes.style.color='#ff6347'; likes.textContent = `❤ ${c.likes||0}`;
      t.appendChild(name); t.appendChild(txt); t.appendChild(likes);
      el.appendChild(t);
    });
  }

  // Wire up form
  function initForRecipe(recipeName){
    if (!recipeName) return;
    currentSlug = slugify(recipeName);

    const submit = document.getElementById('submitReview');
    const nameInput = document.getElementById('reviewName');
    const textInput = document.getElementById('reviewText');
    const imageInput = document.getElementById('reviewImage');

    if (submit) {
      submit.onclick = () => {
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  if (!text) { showToast('Please write a comment', 'error'); return; }

        // handle image file -> dataURL
        const file = imageInput.files && imageInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e){
            const data = e.target.result;
            createComment(currentSlug, name, text, data);
            // clear
            nameInput.value=''; textInput.value=''; imageInput.value='';
            renderReviews(recipeName);
            showToast('Comment posted successfully');
          };
          reader.readAsDataURL(file);
        } else {
          createComment(currentSlug, name, text, null);
          nameInput.value=''; textInput.value='';
          renderReviews(recipeName);
          showToast('Comment posted successfully');
        }
      };
    }

    // initial render
    renderReviews(recipeName);
  }

  // Render global top comments across all recipes (today)
  function renderGlobalTopComments(){
    const store = readStore();
    const today = new Date(); today.setHours(0,0,0,0);
    const flat = [];
    Object.keys(store).forEach(recipe => {
      (store[recipe]||[]).forEach(c => {
        if (new Date(c.createdAt) >= today) flat.push(c);
      });
    });
    flat.sort((a,b)=> (b.likes||0)-(a.likes||0));
    const top = flat.slice(0,10); // show more on main page

    const el = document.getElementById('globalTopCommentsList');
    if (!el) return;
    el.innerHTML = '';
    if (!top.length){
      el.innerHTML = '<div style="color:#666">No top comments today</div>';
      return;
    }

    top.forEach(c => {
      const item = document.createElement('div');
      item.className = 'global-top-item';
      const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = c.name + ' — ' + c.recipe.replace(/-/g,' ');
      const txt = document.createElement('div'); txt.style.marginTop='6px'; txt.textContent = c.text;
      const meta = document.createElement('div'); meta.style.marginTop='6px'; meta.style.color='#ff6347'; meta.textContent = `❤ ${c.likes||0}`;
      item.appendChild(title); item.appendChild(txt); item.appendChild(meta);
      el.appendChild(item);
    });
  }

  // Toggle button binding (pill) with persistence
  function bindGlobalToggle(){
    const btn = document.getElementById('toggleTopCommentsBtn');
    const container = document.getElementById('globalTopComments');
    if (!btn || !container) return;
    // restore preference
    const hidden = localStorage.getItem('cookpro_top_comments_hidden') === '1';
    if (hidden) {
      container.classList.add('hidden-top-comments');
      btn.classList.remove('active');
      const label = btn.querySelector('.toggle-label'); if (label) label.textContent = 'Show';
    } else {
      btn.classList.add('active');
      const label = btn.querySelector('.toggle-label'); if (label) label.textContent = 'Hide';
    }

    btn.onclick = () => {
      const nowHidden = container.classList.toggle('hidden-top-comments');
      btn.classList.toggle('active', !nowHidden);
      const label = btn.querySelector('.toggle-label'); if (label) label.textContent = nowHidden ? 'Show' : 'Hide';
      localStorage.setItem('cookpro_top_comments_hidden', nowHidden ? '1' : '0');
    };
  }

  // Expose to global
  window.CookProComments = {
    initForRecipe
  };

  // Auto-init global top comments on page load
  document.addEventListener('DOMContentLoaded', ()=>{
    try{ renderGlobalTopComments(); bindGlobalToggle(); }catch(e){/* ignore */}
  });

})();

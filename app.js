/**
 * Gen1Recomp & Gen2Recomp Mod Browser - Interactive Controller
 * Supports bryanthaboi/gen1recomp-mod-index & Discord Forum Sources
 */

(function () {
  'use strict';

  const GUILD_ID = '1019387038820216882';
  const FORUM_CHANNEL_ID = '1529474711376105542';

  // Application State
  const state = {
    dataSource: 'github', // 'github' (109 mods) | 'discord' (83 mods) | 'all' (192 mods)
    searchQuery: '',
    selectedGen: 'all',
    selectedCategories: new Set(),
    selectedStatus: 'all',
    sortBy: 'relevance',
    viewMode: 'grid',
    theme: 'redblue',
    soundEnabled: true,
    scanlinesEnabled: true,
    favorites: new Set(),
    exportScope: 'favs',
    exportFormat: 'markdown'
  };

  // Load Saved Preferences
  try {
    const savedFavs = localStorage.getItem('gen1recomp_favs');
    if (savedFavs) {
      state.favorites = new Set(JSON.parse(savedFavs));
    }
    const savedTheme = localStorage.getItem('gen1recomp_theme');
    if (savedTheme) {
      state.theme = savedTheme;
    }
    const savedSound = localStorage.getItem('gen1recomp_sound');
    if (savedSound !== null) {
      state.soundEnabled = savedSound === 'true';
    }
    const savedScanlines = localStorage.getItem('gen1recomp_scanlines');
    if (savedScanlines !== null) {
      state.scanlinesEnabled = savedScanlines === 'true';
    }
    const savedSource = localStorage.getItem('gen1recomp_source');
    if (savedSource && ['github', 'discord', 'all'].includes(savedSource)) {
      state.dataSource = savedSource;
    }
  } catch (e) {
    console.error('LocalStorage load error:', e);
  }

  // 8-Bit Web Audio Synthesizer for Authentic Game Boy Sound Effects
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const SFX = {
    cursor() {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch (e) {}
    },
    select() {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.04);
        osc.frequency.setValueAtTime(783.99, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } catch (e) {}
    },
    back() {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(440.0, now + 0.05);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {}
    },
    bookmark() {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.00, now + 0.06);
        osc.frequency.setValueAtTime(1174.66, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } catch (e) {}
    }
  };

  // Get active dataset based on selected source
  function getActiveRawMods() {
    const ghMods = (typeof window !== 'undefined' && Array.isArray(window.GITHUB_MODS_DATA) && window.GITHUB_MODS_DATA.length > 0)
      ? window.GITHUB_MODS_DATA
      : ((typeof GITHUB_MODS_DATA !== 'undefined' && Array.isArray(GITHUB_MODS_DATA)) ? GITHUB_MODS_DATA : []);

    const discMods = (typeof window !== 'undefined' && Array.isArray(window.MODS_DATA) && window.MODS_DATA.length > 0)
      ? window.MODS_DATA
      : ((typeof MODS_DATA !== 'undefined' && Array.isArray(MODS_DATA)) ? MODS_DATA : []);

    if (state.dataSource === 'github') {
      return ghMods.length > 0 ? ghMods : discMods;
    } else if (state.dataSource === 'discord') {
      return discMods.length > 0 ? discMods : ghMods;
    } else {
      return [...ghMods, ...discMods];
    }
  }

  // Get full combined dataset with Pokédex index numbers
  function getAllMods() {
    const raw = getActiveRawMods();
    return raw.map((m, idx) => ({
      ...m,
      dexNo: `No. ${String(idx + 1).padStart(3, '0')}`
    }));
  }

  // DOM Elements
  const elements = {
    siteSubtitle: document.getElementById('siteSubtitle'),
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    toggleAdvancedBtn: document.getElementById('toggleAdvancedBtn'),
    activeFilterBadge: document.getElementById('activeFilterBadge'),
    advancedPanel: document.getElementById('advancedPanel'),
    categoryChipsContainer: document.getElementById('categoryChipsContainer'),
    genTabs: document.querySelectorAll('[data-gen]'),
    sourceTabs: document.querySelectorAll('[data-source]'),
    sourceGithubCount: document.getElementById('sourceGithubCount'),
    sourceDiscordCount: document.getElementById('sourceDiscordCount'),
    sourceAllCount: document.getElementById('sourceAllCount'),
    statusTabs: document.querySelectorAll('[data-status]'),
    sortSelect: document.getElementById('sortSelect'),
    themeSelect: document.getElementById('themeSelect'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    scanlinesToggleBtn: document.getElementById('scanlinesToggleBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    resultsCountNum: document.getElementById('resultsCountNum'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    modsGrid: document.getElementById('modsGrid'),
    modsTableWrapper: document.getElementById('modsTableWrapper'),
    modsTableBody: document.getElementById('modsTableBody'),
    emptyState: document.getElementById('emptyState'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),

    // Stats
    statTotalCount: document.getElementById('statTotalCount'),
    statGen1Count: document.getElementById('statGen1Count'),
    statGen2Count: document.getElementById('statGen2Count'),
    statThumbnailCount: document.getElementById('statThumbnailCount'),
    statFavCount: document.getElementById('statFavCount'),
    favCountBadge: document.getElementById('favCountBadge'),

    // Mod Detail Modal
    modDetailModal: document.getElementById('modDetailModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalDexNo: document.getElementById('modalDexNo'),
    modalGenBadge: document.getElementById('modalGenBadge'),
    modalCatBadge: document.getElementById('modalCatBadge'),
    modalVersionBadge: document.getElementById('modalVersionBadge'),
    modalStatusBadge: document.getElementById('modalStatusBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalAuthor: document.getElementById('modalAuthor'),
    modalThumbnailContainer: document.getElementById('modalThumbnailContainer'),
    modalThumbnailImg: document.getElementById('modalThumbnailImg'),
    modalDesc: document.getElementById('modalDesc'),
    modalTags: document.getElementById('modalTags'),
    modalThreadId: document.getElementById('modalThreadId'),
    modalThreadDate: document.getElementById('modalThreadDate'),
    modalRepoLink: document.getElementById('modalRepoLink'),
    modalWebLink: document.getElementById('modalWebLink'),
    modalAppLink: document.getElementById('modalAppLink'),
    modalCopyLinkBtn: document.getElementById('modalCopyLinkBtn'),
    modalFavToggleBtn: document.getElementById('modalFavToggleBtn'),
    modalRelatedList: document.getElementById('modalRelatedList'),

    // Export Modal
    exportModal: document.getElementById('exportModal'),
    exportModalBtn: document.getElementById('exportModalBtn'),
    exportCloseBtn: document.getElementById('exportCloseBtn'),
    favoritesModalBtn: document.getElementById('favoritesModalBtn'),
    exportFavCount: document.getElementById('exportFavCount'),
    exportTextArea: document.getElementById('exportTextArea'),
    copyExportBtn: document.getElementById('copyExportBtn'),
    downloadExportBtn: document.getElementById('downloadExportBtn'),
    exportScopeFavs: document.getElementById('exportScopeFavs'),
    exportScopeFiltered: document.getElementById('exportScopeFiltered'),
    exportScopeAll: document.getElementById('exportScopeAll'),
    exportFmtMarkdown: document.getElementById('exportFmtMarkdown'),
    exportFmtText: document.getElementById('exportFmtText'),
    exportFmtJSON: document.getElementById('exportFmtJSON'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // Categories list
  const CATEGORIES = [
    { name: 'Quality of Life', icon: '🛠️' },
    { name: 'Visuals & 3D', icon: '🎨' },
    { name: 'Gameplay & Overhauls', icon: '⚔️' },
    { name: 'UI & HUD', icon: '📱' },
    { name: 'Audio & Music', icon: '🎵' },
    { name: 'Multiplayer & Online', icon: '🌐' },
    { name: 'Translations', icon: '🌍' },
    { name: 'Tools & Utilities', icon: '🧰' },
    { name: 'Guides & Community', icon: '📖' }
  ];

  // Update Source Counts
  function updateSourceCounts() {
    const ghCount = (typeof GITHUB_MODS_DATA !== 'undefined') ? GITHUB_MODS_DATA.length : 0;
    const discCount = (typeof MODS_DATA !== 'undefined') ? MODS_DATA.length : 0;
    if (elements.sourceGithubCount) elements.sourceGithubCount.textContent = ghCount;
    if (elements.sourceDiscordCount) elements.sourceDiscordCount.textContent = discCount;
    if (elements.sourceAllCount) elements.sourceAllCount.textContent = ghCount + discCount;

    if (elements.siteSubtitle) {
      if (state.dataSource === 'github') {
        elements.siteSubtitle.textContent = `POKéMON MOD ARCHIVE // ${ghCount} GITHUB INDEX ENTRIES (BY BRYANTHABOI)`;
      } else if (state.dataSource === 'discord') {
        elements.siteSubtitle.textContent = `POKéMON MOD ARCHIVE // ${discCount} DISCORD COMMUNITY ENTRIES`;
      } else {
        elements.siteSubtitle.textContent = `POKéMON MOD ARCHIVE // ${ghCount + discCount} COMBINED ENTRIES`;
      }
    }
  }

  // Update Statistics
  function updateStats() {
    const allMods = getAllMods();
    const gen1 = allMods.filter(m => m.generation === 'Gen 1').length;
    const gen2 = allMods.filter(m => m.generation === 'Gen 2' || m.generation === 'Gen 1+2').length;
    const thumbs = allMods.filter(m => m.hasThumbnail || m.thumbnailUrl).length;

    elements.statTotalCount.textContent = allMods.length;
    elements.statGen1Count.textContent = gen1;
    elements.statGen2Count.textContent = gen2;
    elements.statThumbnailCount.textContent = thumbs;
    elements.statFavCount.textContent = state.favorites.size;
    elements.favCountBadge.textContent = state.favorites.size;
    elements.exportFavCount.textContent = state.favorites.size;
  }

  // Render Category Chips
  function renderCategoryChips() {
    const allMods = getAllMods();
    const counts = {};
    allMods.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });

    elements.categoryChipsContainer.innerHTML = '';

    // "ALL" Category Chip
    const allBtn = document.createElement('button');
    allBtn.className = `cat-btn ${state.selectedCategories.size === 0 ? 'active' : ''}`;
    allBtn.innerHTML = `<span>✨ ALL CATEGORIES</span> <span class="cat-num">${allMods.length}</span>`;
    allBtn.addEventListener('click', () => {
      SFX.cursor();
      state.selectedCategories.clear();
      updateCategoryChipClasses();
      updateActiveFilterBadge();
      render();
      updateUrlParams();
    });
    elements.categoryChipsContainer.appendChild(allBtn);

    CATEGORIES.forEach(cat => {
      const count = counts[cat.name] || 0;
      if (count === 0) return;
      const btn = document.createElement('button');
      const isSelected = state.selectedCategories.has(cat.name);
      btn.className = `cat-btn ${isSelected ? 'active' : ''}`;
      btn.setAttribute('data-category-name', cat.name);
      btn.innerHTML = `<span>${cat.icon} ${cat.name}</span> <span class="cat-num">${count}</span>`;
      btn.addEventListener('click', () => {
        SFX.cursor();
        if (state.selectedCategories.has(cat.name)) {
          state.selectedCategories.delete(cat.name);
        } else {
          state.selectedCategories.add(cat.name);
        }
        updateCategoryChipClasses();
        updateActiveFilterBadge();
        render();
        updateUrlParams();
      });
      elements.categoryChipsContainer.appendChild(btn);
    });
  }

  function updateCategoryChipClasses() {
    const chips = elements.categoryChipsContainer.querySelectorAll('.cat-btn');
    chips.forEach(chip => {
      const catName = chip.getAttribute('data-category-name');
      if (!catName) {
        chip.classList.toggle('active', state.selectedCategories.size === 0);
      } else {
        chip.classList.toggle('active', state.selectedCategories.has(catName));
      }
    });
  }

  function updateActiveFilterBadge() {
    let count = 0;
    if (state.selectedCategories.size > 0) count += state.selectedCategories.size;
    if (state.selectedStatus !== 'all') count += 1;

    if (count > 0) {
      elements.activeFilterBadge.textContent = count;
      elements.activeFilterBadge.style.display = 'inline-block';
    } else {
      elements.activeFilterBadge.style.display = 'none';
    }
  }

  // Calculate Weighted Relevance Score for Searching
  function calculateSearchScore(mod, q) {
    if (!q) return 0;
    const query = q.toLowerCase();
    const title = (mod.title || '').toLowerCase();
    const desc = (mod.description || '').toLowerCase();
    const author = (mod.author || '').toLowerCase();
    const cat = (mod.category || '').toLowerCase();
    const tags = Array.isArray(mod.tags) ? mod.tags.map(t => String(t).toLowerCase()) : [];
    const id = String(mod.id || '').toLowerCase();

    let score = 0;

    // 1. Title Direct Match
    if (title === query) {
      score += 2500;
    } else if (title.startsWith(query)) {
      score += 1500;
    } else {
      const titleWords = title.split(/[\s\-_[\]()]+/);
      const isWordPrefix = titleWords.some(w => w.startsWith(query));
      if (isWordPrefix) {
        score += 1000;
      } else if (title.includes(query)) {
        score += 500;
      }
    }

    // 2. Author Match
    if (author === query) {
      score += 1800;
    } else if (author.startsWith(query)) {
      score += 900;
    } else if (author.includes(query)) {
      score += 400;
    }

    // 3. Tag Matches
    if (tags.includes(query)) {
      score += 300;
    } else if (tags.some(t => t.startsWith(query))) {
      score += 180;
    } else if (tags.some(t => t.includes(query))) {
      score += 90;
    }

    // 4. Category Match
    if (cat === query) {
      score += 200;
    } else if (cat.includes(query)) {
      score += 80;
    }

    // 5. Description Matches
    if (desc.includes(query)) {
      const descWords = desc.split(/\s+/);
      const isDescWord = descWords.some(w => w === query);
      score += isDescWord ? 60 : 25;
    }

    // 6. ID Match
    if (id.includes(query)) {
      score += 100;
    }

    return score;
  }

  // Filter and Sort Mods
  function getFilteredMods() {
    const allMods = getAllMods();
    const query = state.searchQuery.trim().toLowerCase();

    // 1. Filter
    const filtered = allMods.filter(mod => {
      // Generation filter
      if (state.selectedGen !== 'all') {
        if (state.selectedGen === 'Gen 1' && mod.generation !== 'Gen 1') return false;
        if (state.selectedGen === 'Gen 2' && mod.generation !== 'Gen 2' && mod.generation !== 'Gen 1+2') return false;
        if (state.selectedGen === 'Gen 1+2' && mod.generation !== 'Gen 1+2') return false;
      }

      // Category filter
      if (state.selectedCategories.size > 0 && !state.selectedCategories.has(mod.category)) {
        return false;
      }

      // Status / Bookmarks filter
      if (state.selectedStatus === 'active' && mod.status !== 'active') return false;
      if (state.selectedStatus === 'archived' && mod.status !== 'archived') return false;
      if (state.selectedStatus === 'favorites' && !state.favorites.has(mod.id)) return false;

      // Text Search Query
      if (query) {
        const score = calculateSearchScore(mod, query);
        mod._searchScore = score;
        return score > 0;
      }

      mod._searchScore = 0;
      return true;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      // If there is an active search query and sort is 'relevance', sort by weighted score
      if (query && (state.sortBy === 'relevance' || !state.sortBy)) {
        const scoreDiff = (b._searchScore || 0) - (a._searchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Tie-breaker: active status first, then timestamp
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      }

      switch (state.sortBy) {
        case 'newest':
          return (b.timestamp || 0) - (a.timestamp || 0);
        case 'oldest':
          return (a.timestamp || 0) - (b.timestamp || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'relevance':
        default:
          return (b.timestamp || 0) - (a.timestamp || 0);
      }
    });
  }

  // Highlight matching text helper
  function highlightText(text, query) {
    if (!query || !text) return escapeHTML(text);
    const escapedText = escapeHTML(text);
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escapedText.replace(regex, '<mark class="highlight">$1</mark>');
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Render Grid & Table
  function render() {
    const filtered = getFilteredMods();
    const query = state.searchQuery.trim();

    // Results Counter
    elements.resultsCountNum.textContent = `${filtered.length} / ${getAllMods().length}`;

    if (filtered.length === 0) {
      elements.modsGrid.style.display = 'none';
      elements.modsTableWrapper.style.display = 'none';
      elements.emptyState.style.display = 'block';
      return;
    }

    elements.emptyState.style.display = 'none';

    if (state.viewMode === 'grid') {
      elements.modsGrid.style.display = 'grid';
      elements.modsTableWrapper.style.display = 'none';
      renderGrid(filtered, query);
    } else {
      elements.modsGrid.style.display = 'none';
      elements.modsTableWrapper.style.display = 'block';
      renderTable(filtered, query);
    }
  }

  function renderGrid(mods, query) {
    elements.modsGrid.innerHTML = '';

    mods.forEach(mod => {
      const isFav = state.favorites.has(mod.id);
      const isActive = mod.status.toLowerCase() === 'active';
      const genClass = mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual';
      const isGh = mod.source === 'github_index';

      const card = document.createElement('article');
      card.className = 'dex-card';

      // Thumbnail Image Frame HTML
      const thumbHtml = (mod.thumbnailUrl)
        ? `<div class="mod-thumbnail-frame" data-mod-id="${mod.id}" style="cursor:pointer;">
             <img class="mod-thumbnail-img" src="${mod.thumbnailUrl}" alt="${escapeHTML(mod.title)}" loading="lazy" onerror="this.parentElement.style.display='none';">
           </div>`
        : '';

      const authorHtml = mod.author
        ? `<div class="mod-author-tag">👤 by ${highlightText(mod.author, query)} ${mod.version ? `<span class="poke-tag tag-version" style="font-size:0.65rem;padding:1px 4px;margin-left:4px;">v${mod.version}</span>` : ''}</div>`
        : '';

      const primaryActionBtn = isGh
        ? `<a href="${mod.repoUrl}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm poke-btn-github" title="View Source on GitHub">GITHUB ↗</a>`
        : `<a href="${mod.discordWebUrl}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm poke-btn-discord" title="Open Thread in Web Browser">WEB ↗</a>`;

      card.innerHTML = `
        <div>
          <div class="dex-card-top">
            <span class="dex-index-num">${mod.dexNo}</span>
            <div class="dex-top-tags">
              <span class="poke-tag ${genClass}">${mod.generation}</span>
              <span class="poke-tag">${mod.categoryIcon || '📦'} ${mod.category}</span>
              <button class="poke-btn poke-btn-sm btn-favorite" data-mod-id="${mod.id}" title="${isFav ? 'Remove Bookmark' : 'Bookmark Mod'}">
                ${isFav ? '★' : '☆'}
              </button>
            </div>
          </div>

          ${thumbHtml}

          <div class="dex-card-body">
            ${authorHtml}
            <h3 class="dex-mod-title" data-mod-id="${mod.id}">${highlightText(mod.title, query)}</h3>
            <p class="dex-mod-desc">${highlightText(mod.description, query)}</p>

            <div class="dex-tags-list">
              ${(mod.tags || []).slice(0, 4).map(t => `<span class="mini-tag" data-tag="${escapeHTML(t)}">#${highlightText(t, query)}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="dex-card-footer">
          <div class="card-meta-row">
            <div class="hp-gauge-wrapper">
              <span>HP:</span>
              <div class="hp-bar-outer">
                <div class="hp-bar-inner ${isActive ? '' : 'archived'}"></div>
              </div>
              <span>${isActive ? 'ACTIVE' : 'ARCHIVED'}</span>
            </div>
            <span>${mod.dateCreated || 'Recent'}</span>
          </div>

          <div class="card-actions-row">
            ${primaryActionBtn}
            <button class="poke-btn poke-btn-sm btn-copy-link" data-mod-id="${mod.id}" title="Copy Link">🔗 COPY</button>
            <button class="poke-btn poke-btn-sm btn-details" data-mod-id="${mod.id}">INFO</button>
          </div>
        </div>
      `;

      // Event listeners on card
      const titleEl = card.querySelector('.dex-mod-title');
      if (titleEl) titleEl.addEventListener('click', () => openDetailModal(mod));

      const thumbEl = card.querySelector('.mod-thumbnail-frame');
      if (thumbEl) thumbEl.addEventListener('click', () => openDetailModal(mod));

      const detailsBtn = card.querySelector('.btn-details');
      if (detailsBtn) detailsBtn.addEventListener('click', () => openDetailModal(mod));

      const favBtn = card.querySelector('.btn-favorite');
      if (favBtn) {
        favBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(mod.id);
        });
      }

      const copyBtn = card.querySelector('.btn-copy-link');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const link = mod.repoUrl || mod.discordWebUrl;
          copyToClipboard(link, 'LINK COPIED TO CLIPBOARD!');
        });
      }

      const tagEls = card.querySelectorAll('.mini-tag');
      tagEls.forEach(tagEl => {
        tagEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const tag = tagEl.getAttribute('data-tag');
          elements.searchInput.value = tag;
          state.searchQuery = tag;
          elements.searchClearBtn.style.display = 'block';
          SFX.cursor();
          render();
          updateUrlParams();
        });
      });

      elements.modsGrid.appendChild(card);
    });
  }

  function renderTable(mods, query) {
    elements.modsTableBody.innerHTML = '';

    mods.forEach(mod => {
      const isFav = state.favorites.has(mod.id);
      const isGh = mod.source === 'github_index';
      const row = document.createElement('tr');

      const thumbImg = mod.thumbnailUrl
        ? `<img src="${mod.thumbnailUrl}" alt="" style="width:40px;height:40px;object-fit:cover;border:1px solid var(--border-color);" onerror="this.style.display='none';">`
        : `<span style="font-size:1.2rem;">${mod.categoryIcon || '📦'}</span>`;

      const primaryLink = mod.repoUrl || mod.discordWebUrl;

      row.innerHTML = `
        <td style="font-family:var(--font-mono);font-size:0.78rem;font-weight:700;">${mod.dexNo}</td>
        <td>${thumbImg}</td>
        <td>
          <div style="font-family:var(--font-retro-title);font-size:0.95rem;font-weight:700;cursor:pointer;" class="table-title-click">
            ${highlightText(mod.title, query)}
          </div>
          ${mod.author ? `<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--poke-blue);">by ${escapeHTML(mod.author)}</div>` : ''}
        </td>
        <td><span class="poke-tag ${mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual'}">${mod.generation}</span></td>
        <td><span class="poke-tag">${mod.categoryIcon || '📦'} ${mod.category}</span></td>
        <td style="font-family:var(--font-mono);font-size:0.75rem;">${mod.dateCreated || 'Recent'}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex;gap:4px;">
            <button class="poke-btn poke-btn-sm btn-favorite" data-mod-id="${mod.id}">${isFav ? '★' : '☆'}</button>
            <a href="${primaryLink}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm ${isGh ? 'poke-btn-github' : 'poke-btn-discord'}">${isGh ? 'GH ↗' : 'WEB ↗'}</a>
            <button class="poke-btn poke-btn-sm btn-details" data-mod-id="${mod.id}">INFO</button>
          </div>
        </td>
      `;

      row.querySelector('.table-title-click').addEventListener('click', () => openDetailModal(mod));
      row.querySelector('.btn-details').addEventListener('click', () => openDetailModal(mod));
      row.querySelector('.btn-favorite').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(mod.id);
      });

      elements.modsTableBody.appendChild(row);
    });
  }

  // Toggle Bookmark
  function toggleFavorite(modId) {
    if (state.favorites.has(modId)) {
      state.favorites.delete(modId);
      SFX.back();
      showToast('BOOKMARK REMOVED', 'info');
    } else {
      state.favorites.add(modId);
      SFX.bookmark();
      showToast('MOD BOOKMARKED TO SAVED LIST! ★', 'success');
    }

    try {
      localStorage.setItem('gen1recomp_favs', JSON.stringify([...state.favorites]));
    } catch (e) {}

    updateStats();
    render();

    // If modal is open, update button
    if (elements.modDetailModal.classList.contains('open')) {
      const isFav = state.favorites.has(modId);
      elements.modalFavToggleBtn.textContent = isFav ? '★ SAVED' : '☆ BOOKMARK';
    }
  }

  // Open Detail Modal
  function openDetailModal(mod) {
    SFX.select();
    const isFav = state.favorites.has(mod.id);
    const isGh = mod.source === 'github_index';

    elements.modalDexNo.textContent = mod.dexNo;
    elements.modalGenBadge.textContent = mod.generation;
    elements.modalGenBadge.className = `poke-tag ${mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual'}`;
    elements.modalCatBadge.textContent = `${mod.categoryIcon || '📦'} ${mod.category}`;

    if (mod.version) {
      elements.modalVersionBadge.textContent = `v${mod.version}`;
      elements.modalVersionBadge.style.display = 'inline-block';
    } else {
      elements.modalVersionBadge.style.display = 'none';
    }

    elements.modalStatusBadge.textContent = (mod.status || 'active').toUpperCase();
    elements.modalTitle.textContent = mod.title;

    if (mod.author) {
      elements.modalAuthor.textContent = `Author: ${mod.author}`;
      elements.modalAuthor.style.display = 'block';
    } else {
      elements.modalAuthor.style.display = 'none';
    }

    // Thumbnail in modal
    if (mod.thumbnailUrl) {
      elements.modalThumbnailImg.src = mod.thumbnailUrl;
      elements.modalThumbnailContainer.style.display = 'block';
    } else {
      elements.modalThumbnailContainer.style.display = 'none';
    }

    elements.modalDesc.textContent = mod.description;
    elements.modalTags.innerHTML = (mod.tags || []).map(t => `<span class="mini-tag">#${escapeHTML(t)}</span>`).join('');
    elements.modalThreadId.textContent = mod.id;
    elements.modalThreadDate.textContent = mod.dateCreated || 'Recent';

    // Action links
    if (isGh && mod.repoUrl) {
      elements.modalRepoLink.href = mod.repoUrl;
      elements.modalRepoLink.style.display = 'inline-flex';
      elements.modalWebLink.href = mod.githubIndexUrl || mod.repoUrl;
      elements.modalWebLink.textContent = 'INDEX FILE ↗';
      elements.modalAppLink.style.display = 'none';
    } else {
      elements.modalRepoLink.style.display = 'none';
      elements.modalWebLink.href = mod.discordWebUrl || `https://discord.com/channels/${GUILD_ID}/${mod.id}`;
      elements.modalWebLink.textContent = 'DISCORD WEB ↗';
      elements.modalAppLink.href = mod.discordAppUrl || `discord://discord.com/channels/${GUILD_ID}/${mod.id}`;
      elements.modalAppLink.style.display = 'inline-flex';
    }

    elements.modalFavToggleBtn.textContent = isFav ? '★ SAVED' : '☆ BOOKMARK';
    elements.modalFavToggleBtn.onclick = () => toggleFavorite(mod.id);

    elements.modalCopyLinkBtn.onclick = () => {
      const link = mod.repoUrl || mod.discordWebUrl || `https://discord.com/channels/${GUILD_ID}/${mod.id}`;
      copyToClipboard(link, 'LINK COPIED TO CLIPBOARD!');
    };

    // Related mods
    const allMods = getAllMods();
    const related = allMods.filter(m => m.id !== mod.id && m.category === mod.category).slice(0, 5);
    elements.modalRelatedList.innerHTML = '';
    if (related.length === 0) {
      elements.modalRelatedList.innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted);">No similar category entries.</span>';
    } else {
      related.forEach(rel => {
        const btn = document.createElement('button');
        btn.className = 'poke-btn poke-btn-sm';
        btn.textContent = rel.title;
        btn.addEventListener('click', () => openDetailModal(rel));
        elements.modalRelatedList.appendChild(btn);
      });
    }

    elements.modDetailModal.classList.add('open');
  }

  // Bind Event Listeners
  function initEventListeners() {
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
      render();
      updateUrlParams();
    });

    // Clear search
    elements.searchClearBtn.addEventListener('click', () => {
      SFX.back();
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.searchClearBtn.style.display = 'none';
      elements.searchInput.focus();
      render();
      updateUrlParams();
    });

    // Keyboard shortcut "/" to search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== elements.searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
        SFX.cursor();
      } else if (e.key === 'Escape') {
        closeAllModals();
      }
    });

    // Toggle Advanced Drawer
    elements.toggleAdvancedBtn.addEventListener('click', () => {
      SFX.cursor();
      elements.advancedPanel.classList.toggle('open');
    });

    // Source Selector Tabs
    elements.sourceTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        SFX.select();
        elements.sourceTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.dataSource = tab.getAttribute('data-source');
        try {
          localStorage.setItem('gen1recomp_source', state.dataSource);
        } catch (e) {}
        updateSourceCounts();
        updateStats();
        renderCategoryChips();
        render();
        updateUrlParams();
        showToast(`SOURCE SWITCHED: ${state.dataSource.toUpperCase()}`, 'info');
      });
    });

    // Gen Tabs
    elements.genTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        SFX.cursor();
        elements.genTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedGen = tab.getAttribute('data-gen');
        render();
        updateUrlParams();
      });
    });

    // Status Tabs
    elements.statusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        SFX.cursor();
        elements.statusTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedStatus = tab.getAttribute('data-status');
        updateActiveFilterBadge();
        render();
        updateUrlParams();
      });
    });

    // Sort select
    elements.sortSelect.addEventListener('change', (e) => {
      SFX.cursor();
      state.sortBy = e.target.value;
      render();
      updateUrlParams();
    });

    // Theme select
    elements.themeSelect.addEventListener('change', (e) => {
      SFX.cursor();
      state.theme = e.target.value;
      document.body.setAttribute('data-theme', state.theme);
      try {
        localStorage.setItem('gen1recomp_theme', state.theme);
      } catch (err) {}
      showToast(`THEME: ${state.theme.toUpperCase()}`, 'info');
    });

    // Sound toggle
    elements.soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      elements.soundToggleBtn.textContent = `🔊 SOUND: ${state.soundEnabled ? 'ON' : 'OFF'}`;
      try {
        localStorage.setItem('gen1recomp_sound', state.soundEnabled);
      } catch (err) {}
      if (state.soundEnabled) SFX.select();
      showToast(`AUDIO EFFECTS ${state.soundEnabled ? 'ENABLED' : 'MUTED'}`, 'info');
    });

    // CRT Scanlines toggle
    elements.scanlinesToggleBtn.addEventListener('click', () => {
      SFX.cursor();
      state.scanlinesEnabled = !state.scanlinesEnabled;
      elements.scanlinesToggleBtn.textContent = `📺 CRT: ${state.scanlinesEnabled ? 'ON' : 'OFF'}`;
      document.body.classList.toggle('scanlines-on', state.scanlinesEnabled);
      try {
        localStorage.setItem('gen1recomp_scanlines', state.scanlinesEnabled);
      } catch (err) {}
    });

    // Reset all filters
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
    elements.emptyResetBtn.addEventListener('click', resetAllFilters);

    // View mode switchers
    elements.viewGridBtn.addEventListener('click', () => {
      SFX.cursor();
      state.viewMode = 'grid';
      elements.viewGridBtn.classList.add('active');
      elements.viewTableBtn.classList.remove('active');
      render();
    });

    elements.viewTableBtn.addEventListener('click', () => {
      SFX.cursor();
      state.viewMode = 'table';
      elements.viewTableBtn.classList.add('active');
      elements.viewGridBtn.classList.remove('active');
      render();
    });

    // Modal close buttons
    elements.modalCloseBtn.addEventListener('click', () => {
      SFX.back();
      elements.modDetailModal.classList.remove('open');
    });
    elements.exportCloseBtn.addEventListener('click', () => {
      SFX.back();
      elements.exportModal.classList.remove('open');
    });

    // Modal background click to close
    [elements.modDetailModal, elements.exportModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          SFX.back();
          modal.classList.remove('open');
        }
      });
    });

    // Open Export / Favorites Modal
    elements.exportModalBtn.addEventListener('click', () => {
      SFX.select();
      elements.exportScopeAll.click();
      elements.exportModal.classList.add('open');
    });

    elements.favoritesModalBtn.addEventListener('click', () => {
      SFX.select();
      elements.exportScopeFavs.click();
      elements.exportModal.classList.add('open');
    });

    // Export scope tabs
    elements.exportScopeFavs.addEventListener('click', () => {
      SFX.select();
      setExportScope('favs', elements.exportScopeFavs);
    });
    elements.exportScopeFiltered.addEventListener('click', () => {
      SFX.select();
      setExportScope('filtered', elements.exportScopeFiltered);
    });
    elements.exportScopeAll.addEventListener('click', () => {
      SFX.select();
      setExportScope('all', elements.exportScopeAll);
    });

    // Export format tabs
    elements.exportFmtMarkdown.addEventListener('click', () => {
      SFX.select();
      setExportFormat('markdown', elements.exportFmtMarkdown);
    });
    elements.exportFmtText.addEventListener('click', () => {
      SFX.select();
      setExportFormat('text', elements.exportFmtText);
    });
    elements.exportFmtJSON.addEventListener('click', () => {
      SFX.select();
      setExportFormat('json', elements.exportFmtJSON);
    });

    // Copy Export
    elements.copyExportBtn.addEventListener('click', () => {
      SFX.select();
      copyToClipboard(elements.exportTextArea.value, 'MOD LIST COPIED TO CLIPBOARD!');
    });

    // Download Export
    elements.downloadExportBtn.addEventListener('click', () => {
      SFX.select();
      const ext = state.exportFormat === 'json' ? 'json' : state.exportFormat === 'markdown' ? 'md' : 'txt';
      const blob = new Blob([elements.exportTextArea.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pokemon-mods-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('FILE DOWNLOAD STARTED!', 'success');
    });
  }

  function setExportScope(scope, activeBtn) {
    state.exportScope = scope;
    [elements.exportScopeFavs, elements.exportScopeFiltered, elements.exportScopeAll].forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
    updateExportView();
  }

  function setExportFormat(fmt, activeBtn) {
    state.exportFormat = fmt;
    [elements.exportFmtMarkdown, elements.exportFmtText, elements.exportFmtJSON].forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
    updateExportView();
  }

  function updateExportView() {
    let modsToExport = [];
    const allMods = getAllMods();

    if (state.exportScope === 'favs') {
      modsToExport = allMods.filter(m => state.favorites.has(m.id));
    } else if (state.exportScope === 'filtered') {
      modsToExport = getFilteredMods();
    } else {
      modsToExport = allMods;
    }

    let output = '';

    if (state.exportFormat === 'markdown') {
      output += `# Pokémon Gen1Recomp & Gen2Recomp Modpack (${modsToExport.length} Mods)\n\n`;
      output += `| No. | Mod Title | Author | Gen | Category | Link |\n`;
      output += `| --- | --------- | ------ | --- | -------- | ---- |\n`;
      modsToExport.forEach(m => {
        const link = m.repoUrl || m.discordWebUrl || `https://discord.com/channels/${GUILD_ID}/${m.id}`;
        output += `| ${m.dexNo} | ${m.title} | ${m.author || 'Community'} | ${m.generation} | ${m.category} | [View](${link}) |\n`;
      });
    } else if (state.exportFormat === 'text') {
      output += `POKÉMON GEN1RECOMP MODPACK EXPORT\nTotal: ${modsToExport.length} Mods\n=========================================\n\n`;
      modsToExport.forEach(m => {
        const link = m.repoUrl || m.discordWebUrl || `https://discord.com/channels/${GUILD_ID}/${m.id}`;
        output += `[${m.dexNo}] ${m.title} (${m.generation} - ${m.category})\n`;
        if (m.author) output += `Author: ${m.author}\n`;
        output += `Link: ${link}\n`;
        output += `-----------------------------------------\n`;
      });
    } else if (state.exportFormat === 'json') {
      output = JSON.stringify(modsToExport, null, 2);
    }

    elements.exportTextArea.value = output;
  }

  function resetAllFilters() {
    SFX.back();
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClearBtn.style.display = 'none';

    state.selectedGen = 'all';
    elements.genTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-gen') === 'all'));

    state.selectedStatus = 'all';
    elements.statusTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-status') === 'all'));

    state.selectedCategories.clear();
    updateCategoryChipClasses();
    updateActiveFilterBadge();

    state.sortBy = 'relevance';
    elements.sortSelect.value = 'relevance';

    render();
    updateUrlParams();
    showToast('POKéDEX FILTERS RESET', 'info');
  }

  function closeAllModals() {
    [elements.modDetailModal, elements.exportModal].forEach(m => m && m.classList.remove('open'));
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'retro-toast';
    const icon = type === 'success' ? '★' : '▶';
    toast.innerHTML = `<span style="color:var(--poke-red);">${icon}</span> <span>${escapeHTML(message)}</span>`;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // Clipboard Helper
  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'success');
      }).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (err) {
      showToast('UNABLE TO COPY AUTOMATICALLY', 'info');
    }
    document.body.removeChild(ta);
  }

  // URL Parameter Sync
  function loadUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      state.searchQuery = q;
      elements.searchInput.value = q;
      elements.searchClearBtn.style.display = 'block';
    }

    const gen = params.get('gen');
    if (gen && ['all', 'Gen 1', 'Gen 2', 'Gen 1+2'].includes(gen)) {
      state.selectedGen = gen;
      elements.genTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-gen') === gen));
    }

    const src = params.get('source');
    if (src && ['github', 'discord', 'all'].includes(src)) {
      state.dataSource = src;
      elements.sourceTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-source') === src));
    }

    const cat = params.get('cat');
    if (cat) {
      state.selectedCategories = new Set(cat.split(','));
    }

    const modId = params.get('mod');
    if (modId) {
      const allMods = getAllMods();
      const target = allMods.find(m => m.id === modId);
      if (target) {
        setTimeout(() => openDetailModal(target), 300);
      }
    }
  }

  function updateUrlParams() {
    const params = new URLSearchParams();
    if (state.searchQuery.trim()) params.set('q', state.searchQuery.trim());
    if (state.selectedGen !== 'all') params.set('gen', state.selectedGen);
    if (state.dataSource !== 'github') params.set('source', state.dataSource);
    if (state.selectedCategories.size > 0) params.set('cat', Array.from(state.selectedCategories).join(','));

    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState({}, '', newUrl);
  }

  // Initialization
  function init() {
    // Apply initial settings
    document.body.setAttribute('data-theme', state.theme);
    elements.themeSelect.value = state.theme;

    document.body.classList.toggle('scanlines-on', state.scanlinesEnabled);
    elements.scanlinesToggleBtn.textContent = `📺 CRT: ${state.scanlinesEnabled ? 'ON' : 'OFF'}`;
    elements.soundToggleBtn.textContent = `🔊 SOUND: ${state.soundEnabled ? 'ON' : 'OFF'}`;

    // Apply active source button
    elements.sourceTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-source') === state.dataSource));

    updateSourceCounts();
    loadUrlParams();
    updateStats();
    renderCategoryChips();
    updateActiveFilterBadge();
    initEventListeners();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

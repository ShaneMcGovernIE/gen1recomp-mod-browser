/**
 * Gen1Recomp & Gen2Recomp Mod Browser
 * Weighted Relevance Search Engine + Streamlined UI
 */

(function () {
  'use strict';

  const GUILD_ID = '1019387038820216882';

  // State
  const state = {
    searchQuery: '',
    selectedGen: 'all',
    selectedStatus: 'all',
    selectedCategories: new Set(),
    sortBy: 'relevance',
    viewMode: 'grid',
    advancedPanelOpen: false,
    soundEnabled: localStorage.getItem('gen1recomp_sound') !== 'false',
    scanlinesEnabled: localStorage.getItem('gen1recomp_scanlines') !== 'false',
    favorites: new Set(JSON.parse(localStorage.getItem('gen1recomp_favorites') || '[]')),
    customMods: JSON.parse(localStorage.getItem('gen1recomp_custom_mods') || '[]'),
    theme: localStorage.getItem('gen1recomp_theme') || 'redblue',
    exportScope: 'favs',
    exportFormat: 'markdown'
  };

  // Web Audio Synthesizer
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

  function playTone(freq, type = 'square', duration = 0.05, gainValue = 0.08) {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  const SFX = {
    cursor: () => playTone(440, 'square', 0.03, 0.06),
    select: () => {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {}
    },
    back: () => {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(220, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {}
    },
    bookmark: () => {
      if (!state.soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [587.33, 659.25, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.08, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.08);
        });
      } catch (e) {}
    }
  };

  // Helper: Snowflake timestamp calculator
  function snowflakeToTimestamp(sfStr) {
    try {
      const sf = BigInt(sfStr);
      const tsMs = Number((sf >> 22n) + 1420070400000n);
      const date = new Date(tsMs);
      return {
        timestamp: tsMs,
        dateDisplay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    } catch (e) {
      return {
        timestamp: Date.now(),
        dateDisplay: 'Recent'
      };
    }
  }

  // Get full combined dataset with Pokédex index numbers
  function getAllMods() {
    const baseMods = typeof MODS_DATA !== 'undefined' ? MODS_DATA : [];
    const all = [...baseMods, ...state.customMods];
    return all.map((m, idx) => ({
      ...m,
      dexNo: `No. ${String(idx + 1).padStart(3, '0')}`
    }));
  }

  // DOM Elements
  const elements = {
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    toggleAdvancedBtn: document.getElementById('toggleAdvancedBtn'),
    activeFilterBadge: document.getElementById('activeFilterBadge'),
    advancedPanel: document.getElementById('advancedPanel'),
    categoryChipsContainer: document.getElementById('categoryChipsContainer'),
    modsGrid: document.getElementById('modsGrid'),
    modsTableWrapper: document.getElementById('modsTableWrapper'),
    modsTableBody: document.getElementById('modsTableBody'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),
    resultsCountNum: document.getElementById('resultsCountNum'),
    sortSelect: document.getElementById('sortSelect'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewListBtn: document.getElementById('viewListBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),
    favCountBadge: document.getElementById('favCountBadge'),
    themeSelect: document.getElementById('themeSelect'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    scanlinesToggleBtn: document.getElementById('scanlinesToggleBtn'),

    // Stats
    totalModsCount: document.getElementById('totalModsCount'),
    activeModsCount: document.getElementById('activeModsCount'),
    archivedModsCount: document.getElementById('archivedModsCount'),
    voxelModsCount: document.getElementById('voxelModsCount'),
    multiplayerModsCount: document.getElementById('multiplayerModsCount'),
    statsStrip: document.getElementById('statsStrip'),

    // Mod Detail Modal
    modDetailModal: document.getElementById('modDetailModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalBadges: document.getElementById('modalBadges'),
    modalTitle: document.getElementById('modalTitle'),
    modalDesc: document.getElementById('modalDesc'),
    modalTags: document.getElementById('modalTags'),
    modalThreadId: document.getElementById('modalThreadId'),
    modalCopyIdBtn: document.getElementById('modalCopyIdBtn'),
    modalThreadDate: document.getElementById('modalThreadDate'),
    modalStatusText: document.getElementById('modalStatusText'),
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

  let currentDetailMod = null;

  // Initialize
  function init() {
    applyTheme(state.theme);
    applyScanlines(state.scanlinesEnabled);
    updateSoundButton();
    loadUrlParams();
    updateStats();
    renderCategoryChips();
    updateActiveFilterBadge();
    bindEvents();
    render();
  }

  // Theme Management
  function applyTheme(themeName) {
    state.theme = themeName;
    if (themeName === 'redblue') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
    }
    elements.themeSelect.value = themeName;
    localStorage.setItem('gen1recomp_theme', themeName);
  }

  function applyScanlines(enabled) {
    state.scanlinesEnabled = enabled;
    if (enabled) {
      document.body.classList.add('scanlines-on');
      elements.scanlinesToggleBtn.textContent = '📺 CRT: ON';
    } else {
      document.body.classList.remove('scanlines-on');
      elements.scanlinesToggleBtn.textContent = '📺 CRT: OFF';
    }
    localStorage.setItem('gen1recomp_scanlines', enabled);
  }

  function updateSoundButton() {
    elements.soundToggleBtn.textContent = state.soundEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    localStorage.setItem('gen1recomp_sound', state.soundEnabled);
  }

  function updateActiveFilterBadge() {
    let count = 0;
    if (state.selectedStatus !== 'all') count++;
    if (state.selectedCategories.size > 0) count += state.selectedCategories.size;

    if (count > 0) {
      elements.activeFilterBadge.textContent = count;
      elements.activeFilterBadge.style.display = 'inline-block';
    } else {
      elements.activeFilterBadge.style.display = 'none';
    }
  }

  // Stats calculation
  function updateStats() {
    const allMods = getAllMods();
    const total = allMods.length;
    const active = allMods.filter(m => m.status.toLowerCase() === 'active').length;
    const archived = allMods.filter(m => m.status.toLowerCase() === 'archived').length;
    const visuals = allMods.filter(m => m.category === 'Visuals & 3D').length;
    const multiplayer = allMods.filter(m => m.category === 'Multiplayer & Online').length;

    elements.totalModsCount.textContent = total;
    elements.activeModsCount.textContent = active;
    elements.archivedModsCount.textContent = archived;
    elements.voxelModsCount.textContent = visuals;
    elements.multiplayerModsCount.textContent = multiplayer;
    elements.favCountBadge.textContent = state.favorites.size;
    elements.exportFavCount.textContent = state.favorites.size;
  }

  // Dynamic Category Chips
  function renderCategoryChips() {
    const allMods = getAllMods();
    const catCounts = {};
    allMods.forEach(m => {
      catCounts[m.category] = (catCounts[m.category] || 0) + 1;
    });

    const sortedCats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    elements.categoryChipsContainer.innerHTML = '';
    sortedCats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `cat-btn ${state.selectedCategories.has(cat) ? 'active' : ''}`;
      btn.dataset.category = cat;
      btn.innerHTML = `${escapeHTML(cat)} <span class="cat-num">${catCounts[cat]}</span>`;
      btn.addEventListener('click', () => {
        SFX.select();
        toggleCategory(cat);
      });
      elements.categoryChipsContainer.appendChild(btn);
    });
  }

  function toggleCategory(category) {
    if (state.selectedCategories.has(category)) {
      state.selectedCategories.delete(category);
    } else {
      state.selectedCategories.add(category);
    }
    updateCategoryChipClasses();
    updateActiveFilterBadge();
    render();
    updateUrlParams();
  }

  function updateCategoryChipClasses() {
    const chips = elements.categoryChipsContainer.querySelectorAll('.cat-btn');
    chips.forEach(chip => {
      const cat = chip.dataset.category;
      if (state.selectedCategories.has(cat)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  // Weighted Relevance Calculation Engine
  function calculateSearchScore(mod, query) {
    if (!query) return 0;
    const q = query.toLowerCase().trim();
    const title = mod.title.toLowerCase();
    const desc = (mod.description || '').toLowerCase();
    const tags = (mod.tags || []).map(t => t.toLowerCase());
    const cat = mod.category.toLowerCase();
    const id = mod.id;
    const dexNo = (mod.dexNo || '').toLowerCase();

    let score = 0;

    // 1. Exact Title Match
    if (title === q) {
      score += 2500;
    } 
    // 2. Title Starts With query (e.g. "QoL Toggles..." when searching "QoL")
    else if (title.startsWith(q)) {
      score += 1500;
    }
    // 3. Whole Word Boundary Match in Title (e.g. " QoL " or "[QoL]")
    else if (new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegExp(q)}(?:$|[^a-zA-Z0-9])`, 'i').test(title)) {
      score += 1000;
    }
    // 4. Substring in Title
    else if (title.includes(q)) {
      score += 500;
    }

    // 5. Tags Match
    if (tags.some(t => t === q)) {
      score += 300;
    } else if (tags.some(t => t.startsWith(q))) {
      score += 180;
    } else if (tags.some(t => t.includes(q))) {
      score += 90;
    }

    // 6. Category Match
    if (cat === q) {
      score += 200;
    } else if (cat.includes(q)) {
      score += 80;
    }

    // 7. Pokédex Index or Thread ID
    if (dexNo.includes(q)) {
      score += 400;
    }
    if (id === q) {
      score += 500;
    } else if (id.includes(q)) {
      score += 50;
    }

    // 8. Description Match
    if (new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegExp(q)}(?:$|[^a-zA-Z0-9])`, 'i').test(desc)) {
      score += 60;
    } else if (desc.includes(q)) {
      score += 25;
    }

    return score;
  }

  // Filter and Sort Engine
  function getFilteredMods() {
    const allMods = getAllMods();
    const query = state.searchQuery.trim();

    // Compute search scores and filter
    const scoredMods = [];

    for (const mod of allMods) {
      let score = 0;
      if (query) {
        score = calculateSearchScore(mod, query);
        if (score === 0) {
          // No match in title, desc, tags, category, or ID
          continue;
        }
      }

      // Generation filter
      if (state.selectedGen !== 'all') {
        if (mod.generation !== state.selectedGen) {
          continue;
        }
      }

      // Status & Favorites filter
      if (state.selectedStatus === 'active') {
        if (mod.status.toLowerCase() !== 'active') continue;
      } else if (state.selectedStatus === 'archived') {
        if (mod.status.toLowerCase() !== 'archived') continue;
      } else if (state.selectedStatus === 'favorites') {
        if (!state.favorites.has(mod.id)) continue;
      }

      // Category multi-select
      if (state.selectedCategories.size > 0) {
        if (!state.selectedCategories.has(mod.category)) continue;
      }

      scoredMods.push({
        ...mod,
        _searchScore: score
      });
    }

    // Sort
    return scoredMods.sort((a, b) => {
      switch (state.sortBy) {
        case 'relevance':
          if (query) {
            // High search score first!
            if (b._searchScore !== a._searchScore) {
              return b._searchScore - a._searchScore;
            }
          }
          // Secondary: Active first, then newest
          if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
          }
          return (b.timestamp || 0) - (a.timestamp || 0);

        case 'newest':
          return (b.timestamp || 0) - (a.timestamp || 0);
        case 'oldest':
          return (a.timestamp || 0) - (b.timestamp || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'category':
          return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
        case 'status':
          if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
          }
          return (b.timestamp || 0) - (a.timestamp || 0);
        default:
          return 0;
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

      const card = document.createElement('article');
      card.className = 'dex-card';
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

          <div class="dex-card-body">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div class="hp-gauge-wrapper">
                <span>STATUS:</span>
                <div class="hp-bar-outer">
                  <div class="hp-bar-inner ${isActive ? '' : 'archived'}"></div>
                </div>
                <span>${mod.status.toUpperCase()}</span>
              </div>
            </div>

            <h3 class="dex-mod-title btn-details" data-mod-id="${mod.id}">
              ${highlightText(mod.title, query)}
            </h3>

            <p class="dex-mod-desc">
              ${highlightText(mod.description || '', query)}
            </p>

            <div class="dex-tags-list">
              ${(mod.tags || []).map(tag => `<span class="mini-tag" data-tag="${escapeHTML(tag)}">#${highlightText(tag, query)}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="dex-card-footer">
          <div class="card-meta-row">
            <span>ID: ${mod.id.slice(0, 10)}...</span>
            <span>${mod.dateCreated || 'Recent'}</span>
          </div>
          <div class="card-actions-row">
            <a href="${mod.discordWebUrl}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm poke-btn-discord" title="Open thread in browser">
              WEB ↗
            </a>
            <a href="${mod.discordAppUrl}" class="poke-btn poke-btn-sm poke-btn-blue" title="Open in Discord App">
              APP 🚀
            </a>
            <button class="poke-btn poke-btn-sm btn-copy-link" data-url="${mod.discordWebUrl}" title="Copy Link">
              🔗 COPY
            </button>
            <button class="poke-btn poke-btn-sm btn-details" data-mod-id="${mod.id}" title="View Details">
              INFO
            </button>
          </div>
        </div>
      `;

      elements.modsGrid.appendChild(card);
    });

    bindCardEvents(elements.modsGrid);
  }

  function renderTable(mods, query) {
    elements.modsTableBody.innerHTML = '';

    mods.forEach(mod => {
      const isFav = state.favorites.has(mod.id);
      const isActive = mod.status.toLowerCase() === 'active';
      const genClass = mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-family:var(--font-pixel-heading);font-size:0.62rem;">${mod.dexNo}</td>
        <td>
          <div class="hp-gauge-wrapper">
            <div class="hp-bar-outer" style="width:40px;height:7px;">
              <div class="hp-bar-inner ${isActive ? '' : 'archived'}"></div>
            </div>
            <span style="font-size:0.6rem;">${mod.status.toUpperCase()}</span>
          </div>
        </td>
        <td><span class="poke-tag ${genClass}">${mod.generation}</span></td>
        <td><span class="poke-tag">${mod.categoryIcon || '📦'} ${mod.category}</span></td>
        <td>
          <div style="cursor:pointer;font-weight:700;" data-mod-id="${mod.id}" class="btn-details">
            ${highlightText(mod.title, query)}
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">
            ${highlightText(mod.description ? mod.description.slice(0, 80) + '...' : '', query)}
          </div>
        </td>
        <td style="font-size:0.72rem;white-space:nowrap;">
          ${mod.dateCreated || 'Recent'}
        </td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="poke-btn poke-btn-sm btn-favorite" data-mod-id="${mod.id}" title="Bookmark">
              ${isFav ? '★' : '☆'}
            </button>
            <a href="${mod.discordWebUrl}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm poke-btn-discord">
              WEB
            </a>
            <button class="poke-btn poke-btn-sm btn-copy-link" data-url="${mod.discordWebUrl}">
              🔗
            </button>
          </div>
        </td>
      `;

      elements.modsTableBody.appendChild(row);
    });

    bindCardEvents(elements.modsTableBody);
  }

  function bindCardEvents(container) {
    // Favorite toggle
    container.querySelectorAll('.btn-favorite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modId = btn.dataset.modId;
        toggleFavorite(modId);
      });
    });

    // Tag chip click -> quick search
    container.querySelectorAll('.mini-tag').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        SFX.select();
        const tag = chip.dataset.tag;
        state.searchQuery = tag;
        elements.searchInput.value = tag;
        elements.searchClearBtn.style.display = 'block';
        render();
        updateUrlParams();
      });
    });

    // Copy link button
    container.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        SFX.select();
        const url = btn.dataset.url;
        copyToClipboard(url, 'DISCORD THREAD LINK COPIED!');
      });
    });

    // Open detail modal
    container.querySelectorAll('.dex-mod-title, .btn-details').forEach(el => {
      el.addEventListener('click', (e) => {
        const modId = el.dataset.modId;
        if (modId) {
          SFX.select();
          openModDetail(modId);
        }
      });
    });
  }

  // Favorite toggle
  function toggleFavorite(modId) {
    if (state.favorites.has(modId)) {
      state.favorites.delete(modId);
      SFX.back();
      showToast('REMOVED FROM BOOKMARKS', 'info');
    } else {
      state.favorites.add(modId);
      SFX.bookmark();
      showToast('SAVED TO POKéDEX BOOKMARKS! ★', 'success');
    }
    localStorage.setItem('gen1recomp_favorites', JSON.stringify(Array.from(state.favorites)));
    updateStats();
    render();

    if (currentDetailMod && currentDetailMod.id === modId) {
      updateModalFavButton();
    }
  }

  // Open Mod Detail Modal
  function openModDetail(modId) {
    const mod = getAllMods().find(m => m.id === modId);
    if (!mod) return;

    currentDetailMod = mod;
    const isActive = mod.status.toLowerCase() === 'active';
    const genClass = mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual';

    elements.modalBadges.innerHTML = `
      <span class="dex-index-num" style="margin-right:6px;">${mod.dexNo}</span>
      <span class="poke-tag ${genClass}">${mod.generation}</span>
      <span class="poke-tag">${mod.categoryIcon || '📦'} ${mod.category}</span>
      <span class="poke-tag">${isActive ? '🟢 ACTIVE' : '📁 ARCHIVED'}</span>
    `;

    elements.modalTitle.textContent = mod.title;
    elements.modalDesc.textContent = mod.description || 'No detailed description recorded in Pokédex.';

    elements.modalTags.innerHTML = (mod.tags || []).map(tag => 
      `<span class="mini-tag" style="cursor:default;">#${escapeHTML(tag)}</span>`
    ).join('');

    elements.modalThreadId.textContent = `THREAD ID: ${mod.id}`;
    elements.modalThreadDate.textContent = `CREATED: ${mod.dateCreated || 'UNKNOWN'}`;
    elements.modalStatusText.textContent = `STATUS: ${mod.status.toUpperCase()}`;

    elements.modalWebLink.href = mod.discordWebUrl;
    elements.modalAppLink.href = mod.discordAppUrl;

    updateModalFavButton();

    // Copy handlers
    elements.modalCopyIdBtn.onclick = () => {
      SFX.select();
      copyToClipboard(mod.id, 'THREAD ID COPIED!');
    };

    elements.modalCopyLinkBtn.onclick = () => {
      SFX.select();
      copyToClipboard(mod.discordWebUrl, 'DISCORD THREAD LINK COPIED!');
    };

    elements.modalFavToggleBtn.onclick = () => {
      toggleFavorite(mod.id);
    };

    // Related mods
    const related = getAllMods()
      .filter(m => m.category === mod.category && m.id !== mod.id)
      .slice(0, 4);

    if (related.length > 0) {
      elements.modalRelatedList.innerHTML = related.map(rel => `
        <div class="dialog-subbox" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:8px 10px;" onclick="window.gen1recompOpenDetail('${rel.id}')">
          <span style="font-size:0.82rem;font-weight:700;">▶ ${escapeHTML(rel.title)}</span>
          <span class="poke-tag ${rel.generation === 'Gen 1' ? 'tag-red' : rel.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual'}">${rel.generation}</span>
        </div>
      `).join('');
    } else {
      elements.modalRelatedList.innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);">No other entries in this category.</p>';
    }

    elements.modDetailModal.classList.add('open');
  }

  window.gen1recompOpenDetail = openModDetail;

  function updateModalFavButton() {
    if (!currentDetailMod) return;
    const isFav = state.favorites.has(currentDetailMod.id);
    elements.modalFavToggleBtn.innerHTML = isFav ? '★ BOOKMARKED' : '☆ BOOKMARK';
    elements.modalFavToggleBtn.className = `poke-btn ${isFav ? 'poke-btn-primary' : ''}`;
  }

  // Export / Modpack Generation
  function generateExportContent() {
    let modsToExport = [];
    if (state.exportScope === 'favs') {
      modsToExport = getAllMods().filter(m => state.favorites.has(m.id));
    } else if (state.exportScope === 'filtered') {
      modsToExport = getFilteredMods();
    } else {
      modsToExport = getAllMods();
    }

    if (state.exportFormat === 'markdown') {
      let md = `# Pokémon Gen1Recomp & Gen2Recomp Mod List\n`;
      md += `*Total Entries: ${modsToExport.length} | Exported: ${new Date().toLocaleDateString()}*\n\n`;
      md += `| No. | Generation | Mod Name | Category | Status | Discord Thread |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      modsToExport.forEach(m => {
        md += `| ${m.dexNo} | ${m.generation} | ${m.title.replace(/\|/g, '\\|')} | ${m.category} | ${m.status} | [View Thread](${m.discordWebUrl}) |\n`;
      });
      return md;
    } else if (state.exportFormat === 'text') {
      let txt = `Gen1Recomp Mods Archive (${modsToExport.length} entries)\n\n`;
      modsToExport.forEach((m, idx) => {
        txt += `${m.dexNo} [${m.generation}] ${m.title} (${m.status})\n`;
        txt += `   Type: ${m.category}\n`;
        txt += `   Thread: ${m.discordWebUrl}\n\n`;
      });
      return txt;
    } else if (state.exportFormat === 'json') {
      return JSON.stringify(modsToExport, null, 2);
    }
    return '';
  }

  function updateExportView() {
    elements.exportTextArea.value = generateExportContent();
  }

  // Event Listeners
  function bindEvents() {
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      SFX.cursor();
      state.searchQuery = e.target.value;
      elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
      render();
      updateUrlParams();
    });

    elements.searchClearBtn.addEventListener('click', () => {
      SFX.back();
      state.searchQuery = '';
      elements.searchInput.value = '';
      elements.searchClearBtn.style.display = 'none';
      elements.searchInput.focus();
      render();
      updateUrlParams();
    });

    // Toggle Advanced Panel
    elements.toggleAdvancedBtn.addEventListener('click', () => {
      SFX.select();
      state.advancedPanelOpen = !state.advancedPanelOpen;
      elements.advancedPanel.classList.toggle('open', state.advancedPanelOpen);
      elements.toggleAdvancedBtn.classList.toggle('active', state.advancedPanelOpen);
    });

    // Keyboard shortcut (/)
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== elements.searchInput && !document.querySelector('.modal-screen.open')) {
        e.preventDefault();
        SFX.cursor();
        elements.searchInput.focus();
      } else if (e.key === 'Escape') {
        SFX.back();
        closeAllModals();
        if (elements.searchInput.value) {
          elements.searchClearBtn.click();
        }
      }
    });

    // Sound toggle
    elements.soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateSoundButton();
      if (state.soundEnabled) {
        SFX.select();
      }
    });

    // Scanlines CRT toggle
    elements.scanlinesToggleBtn.addEventListener('click', () => {
      SFX.select();
      applyScanlines(!state.scanlinesEnabled);
    });

    // Theme selector
    elements.themeSelect.addEventListener('change', (e) => {
      SFX.select();
      applyTheme(e.target.value);
    });

    // Generation tabs
    document.querySelectorAll('.gen-tab-group [data-gen]').forEach(tab => {
      tab.addEventListener('click', () => {
        SFX.select();
        document.querySelectorAll('.gen-tab-group [data-gen]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedGen = tab.dataset.gen;
        render();
        updateUrlParams();
      });
    });

    // Status tabs in advanced panel
    document.querySelectorAll('.adv-row [data-status]').forEach(tab => {
      tab.addEventListener('click', () => {
        SFX.select();
        document.querySelectorAll('.adv-row [data-status]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedStatus = tab.dataset.status;
        updateActiveFilterBadge();
        render();
        updateUrlParams();
      });
    });

    // Stats strip quick filters
    elements.statsStrip.addEventListener('click', (e) => {
      const chip = e.target.closest('.stat-chip');
      if (!chip) return;
      SFX.select();
      const stat = chip.dataset.stat;
      if (stat === 'all') {
        resetAllFilters();
      } else if (stat === 'active') {
        selectStatusTab('active');
      } else if (stat === 'archived') {
        selectStatusTab('archived');
      } else if (stat === 'visuals') {
        state.selectedCategories.clear();
        state.selectedCategories.add('Visuals & 3D');
        updateCategoryChipClasses();
        updateActiveFilterBadge();
        render();
      } else if (stat === 'multiplayer') {
        state.selectedCategories.clear();
        state.selectedCategories.add('Multiplayer & Online');
        updateCategoryChipClasses();
        updateActiveFilterBadge();
        render();
      }
    });

    // Sort select
    elements.sortSelect.addEventListener('change', (e) => {
      SFX.select();
      state.sortBy = e.target.value;
      render();
      updateUrlParams();
    });

    // View mode toggle
    elements.viewGridBtn.addEventListener('click', () => {
      SFX.select();
      state.viewMode = 'grid';
      elements.viewGridBtn.classList.add('active');
      elements.viewListBtn.classList.remove('active');
      render();
    });

    elements.viewListBtn.addEventListener('click', () => {
      SFX.select();
      state.viewMode = 'list';
      elements.viewListBtn.classList.add('active');
      elements.viewGridBtn.classList.remove('active');
      render();
    });

    // Reset filters
    elements.resetFiltersBtn.addEventListener('click', () => {
      SFX.back();
      resetAllFilters();
    });
    elements.emptyResetBtn.addEventListener('click', () => {
      SFX.back();
      resetAllFilters();
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

  function selectStatusTab(status) {
    document.querySelectorAll('.adv-row [data-status]').forEach(t => {
      if (t.dataset.status === status) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    state.selectedStatus = status;
    updateActiveFilterBadge();
    render();
    updateUrlParams();
  }

  function resetAllFilters() {
    state.searchQuery = '';
    elements.searchInput.value = '';
    elements.searchClearBtn.style.display = 'none';

    state.selectedGen = 'all';
    document.querySelectorAll('.gen-tab-group [data-gen]').forEach(t => {
      t.classList.toggle('active', t.dataset.gen === 'all');
    });

    state.selectedStatus = 'all';
    document.querySelectorAll('.adv-row [data-status]').forEach(t => {
      t.classList.toggle('active', t.dataset.status === 'all');
    });

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
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (err) {
      showToast('FAILED TO COPY', 'info');
    }
    document.body.removeChild(textArea);
  }

  // URL Query Parameters Sync
  function loadUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('q')) {
      state.searchQuery = params.get('q');
      elements.searchInput.value = state.searchQuery;
      elements.searchClearBtn.style.display = 'block';
    }
    if (params.has('gen')) {
      state.selectedGen = params.get('gen');
      document.querySelectorAll('.gen-tab-group [data-gen]').forEach(t => {
        t.classList.toggle('active', t.dataset.gen === state.selectedGen);
      });
    }
    if (params.has('status')) {
      state.selectedStatus = params.get('status');
      document.querySelectorAll('.adv-row [data-status]').forEach(t => {
        t.classList.toggle('active', t.dataset.status === state.selectedStatus);
      });
    }
    if (params.has('cat')) {
      const cats = params.get('cat').split(',');
      cats.forEach(c => state.selectedCategories.add(c));
    }
    if (params.has('sort')) {
      state.sortBy = params.get('sort');
      elements.sortSelect.value = state.sortBy;
    }
  }

  function updateUrlParams() {
    const params = new URLSearchParams();
    if (state.searchQuery) params.set('q', state.searchQuery);
    if (state.selectedGen !== 'all') params.set('gen', state.selectedGen);
    if (state.selectedStatus !== 'all') params.set('status', state.selectedStatus);
    if (state.selectedCategories.size > 0) params.set('cat', Array.from(state.selectedCategories).join(','));
    if (state.sortBy !== 'relevance') params.set('sort', state.sortBy);

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

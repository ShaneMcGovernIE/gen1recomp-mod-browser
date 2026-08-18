/**
 * Gen1Recomp & Gen2Recomp Mod Browser - Interactive Controller
 * Supports bryanthaboi/gen1recomp-mod-index & Discord Forum Sources
 * Ranked by Total Downloads Across All Releases
 * Enhanced Performance, UX, Keyboard Controls & Mobile Responsiveness
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
    selectedPreset: 'all', // 'all' | 'top10' | 'recent' | 'thumbnails' | 'bookmarks'
    sortBy: 'downloads', // Default to Most Popular!
    viewMode: 'grid',
    theme: 'redblue',
    soundEnabled: true,
    scanlinesEnabled: true,
    favorites: new Set(),
    exportScope: 'favs',
    exportFormat: 'markdown',
    pageSize: 36,
    currentPage: 1,
    focusedCardIndex: -1
  };

  // Helper to format download numbers (e.g. 55.7K, 1.2M)
  function formatDownloads(num) {
    if (!num || isNaN(num) || num <= 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
  }

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
    presetPills: document.querySelectorAll('[data-preset]'),
    activeFiltersBar: document.getElementById('activeFiltersBar'),
    activeFiltersPills: document.getElementById('activeFiltersPills'),
    clearAllBreadcrumbsBtn: document.getElementById('clearAllBreadcrumbsBtn'),
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
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    loadMoreCount: document.getElementById('loadMoreCount'),
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
    modalDownloadsBadge: document.getElementById('modalDownloadsBadge'),
    modalStarsBadge: document.getElementById('modalStarsBadge'),
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
    modalDownloadZipBtn: document.getElementById('modalDownloadZipBtn'),
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
    { name: 'Quality of Life' },
    { name: 'Visuals & 3D' },
    { name: 'Gameplay & Overhauls' },
    { name: 'UI & HUD' },
    { name: 'Audio & Music' },
    { name: 'Multiplayer & Online' },
    { name: 'Translations' },
    { name: 'Tools & Utilities' },
    { name: 'Guides & Community' }
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
        elements.siteSubtitle.textContent = `POKéMON MOD ARCHIVE // ${ghCount} GITHUB INDEX ENTRIES`;
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

  // Dynamic Category Counts based on active Generation / Source
  function renderCategoryChips() {
    const allMods = getAllMods();
    
    // Calculate dynamic counts based on generation
    const counts = {};
    allMods.forEach(m => {
      if (state.selectedGen !== 'all') {
        if (state.selectedGen === 'Gen 1' && m.generation !== 'Gen 1') return;
        if (state.selectedGen === 'Gen 2' && m.generation !== 'Gen 2' && m.generation !== 'Gen 1+2') return;
        if (state.selectedGen === 'Gen 1+2' && m.generation !== 'Gen 1+2') return;
      }
      counts[m.category] = (counts[m.category] || 0) + 1;
    });

    const totalMatchingGen = Object.values(counts).reduce((a, b) => a + b, 0);

    elements.categoryChipsContainer.innerHTML = '';

    // "ALL" Category Chip
    const allBtn = document.createElement('button');
    allBtn.className = `cat-btn ${state.selectedCategories.size === 0 ? 'active' : ''}`;
    allBtn.innerHTML = `<span>ALL CATEGORIES</span> <span class="cat-num">${totalMatchingGen}</span>`;
    allBtn.addEventListener('click', () => {
      SFX.cursor();
      state.selectedCategories.clear();
      state.currentPage = 1;
      updateCategoryChipClasses();
      updateActiveFilterBadge();
      render();
      renderActiveBreadcrumbs();
      updateUrlParams();
    });
    elements.categoryChipsContainer.appendChild(allBtn);

    CATEGORIES.forEach(cat => {
      const count = counts[cat.name] || 0;
      if (count === 0 && state.selectedCategories.size === 0) return;
      const btn = document.createElement('button');
      const isSelected = state.selectedCategories.has(cat.name);
      btn.className = `cat-btn ${isSelected ? 'active' : ''}`;
      btn.setAttribute('data-category-name', cat.name);
      btn.innerHTML = `<span>${cat.name}</span> <span class="cat-num">${count}</span>`;
      btn.addEventListener('click', () => {
        SFX.cursor();
        if (state.selectedCategories.has(cat.name)) {
          state.selectedCategories.delete(cat.name);
        } else {
          state.selectedCategories.add(cat.name);
        }
        state.currentPage = 1;
        updateCategoryChipClasses();
        updateActiveFilterBadge();
        render();
        renderActiveBreadcrumbs();
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
    if (state.selectedPreset !== 'all') count += 1;

    if (count > 0) {
      elements.activeFilterBadge.textContent = count;
      elements.activeFilterBadge.style.display = 'inline-block';
    } else {
      elements.activeFilterBadge.style.display = 'none';
    }
  }

  // Render Active Filter Breadcrumbs Bar
  function renderActiveBreadcrumbs() {
    if (!elements.activeFiltersBar || !elements.activeFiltersPills) return;

    const chips = [];

    if (state.searchQuery.trim()) {
      chips.push({
        label: `SEARCH: "${state.searchQuery.trim()}"`,
        clear: () => {
          state.searchQuery = '';
          elements.searchInput.value = '';
          elements.searchClearBtn.style.display = 'none';
        }
      });
    }

    if (state.selectedGen !== 'all') {
      chips.push({
        label: `GEN: ${state.selectedGen}`,
        clear: () => {
          state.selectedGen = 'all';
          elements.genTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-gen') === 'all'));
        }
      });
    }

    if (state.selectedPreset !== 'all') {
      const pLabel = {
        top10: 'TOP 10',
        recent: 'RECENT (<14d)',
        thumbnails: 'WITH PREVIEWS',
        bookmarks: 'BOOKMARKS'
      }[state.selectedPreset] || state.selectedPreset;
      chips.push({
        label: `PRESET: ${pLabel}`,
        clear: () => {
          setPresetFilter('all');
        }
      });
    }

    if (state.selectedCategories.size > 0) {
      state.selectedCategories.forEach(cat => {
        chips.push({
          label: `CAT: ${cat}`,
          clear: () => {
            state.selectedCategories.delete(cat);
            updateCategoryChipClasses();
          }
        });
      });
    }

    if (state.selectedStatus !== 'all') {
      chips.push({
        label: `STATUS: ${state.selectedStatus.toUpperCase()}`,
        clear: () => {
          state.selectedStatus = 'all';
          elements.statusTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-status') === 'all'));
        }
      });
    }

    if (chips.length === 0) {
      elements.activeFiltersBar.style.display = 'none';
      elements.activeFiltersPills.innerHTML = '';
      return;
    }

    elements.activeFiltersBar.style.display = 'flex';
    elements.activeFiltersPills.innerHTML = '';

    chips.forEach(c => {
      const chipBtn = document.createElement('button');
      chipBtn.className = 'filter-breadcrumb-chip';
      chipBtn.innerHTML = `<span>${escapeHTML(c.label)}</span> <span>✕</span>`;
      chipBtn.addEventListener('click', () => {
        SFX.back();
        c.clear();
        state.currentPage = 1;
        updateActiveFilterBadge();
        renderCategoryChips();
        render();
        renderActiveBreadcrumbs();
        updateUrlParams();
      });
      elements.activeFiltersPills.appendChild(chipBtn);
    });
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

      // Presets
      if (state.selectedPreset === 'bookmarks' && !state.favorites.has(mod.id)) return false;
      if (state.selectedPreset === 'thumbnails' && !mod.thumbnailUrl && !mod.hasThumbnail) return false;
      if (state.selectedPreset === 'recent') {
        const hpInfo = calculateModHP(mod);
        if (hpInfo.hp < 8) return false;
      }

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
    const sorted = filtered.sort((a, b) => {
      // If there is an active search query, weighted relevance is primary
      if (query) {
        const scoreDiff = (b._searchScore || 0) - (a._searchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Tie-breaker: most popular downloads first!
        const dlDiff = (b.downloads || 0) - (a.downloads || 0);
        if (dlDiff !== 0) return dlDiff;
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      }

      switch (state.sortBy) {
        case 'downloads':
          const dlDiff = (b.downloads || 0) - (a.downloads || 0);
          if (dlDiff !== 0) return dlDiff;
          return (b.timestamp || 0) - (a.timestamp || 0);
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
          const defaultDl = (b.downloads || 0) - (a.downloads || 0);
          if (defaultDl !== 0) return defaultDl;
          return (b.timestamp || 0) - (a.timestamp || 0);
      }
    });

    if (state.selectedPreset === 'top10') {
      return sorted.slice(0, 10);
    }

    return sorted;
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

  // Candidate Logo URLs helper for GitHub repos
  function getCandidateLogos(repoUrl) {
    if (!repoUrl) return [];
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
    if (!match) return [];
    const owner = match[1];
    const repo = match[2];
    return [
      `https://raw.githubusercontent.com/${owner}/${repo}/main/Logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/Logo.PNG`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/logo.PNG`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/Logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/assets/logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/assets/Logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/images/logo.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/icon.png`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/preview.png`
    ];
  }

  // Global Image Fallback Handler for GitHub Logos
  window.handleImageFallback = function(img) {
    try {
      const rawFallbacks = img.getAttribute('data-fallbacks');
      if (!rawFallbacks) {
        if (img.parentElement && img.parentElement.classList.contains('mod-thumbnail-frame')) {
          img.parentElement.style.display = 'none';
        }
        return;
      }
      const fallbacks = JSON.parse(rawFallbacks);
      let idx = parseInt(img.getAttribute('data-fallback-idx') || '0', 10);
      idx++;
      if (idx < fallbacks.length) {
        img.setAttribute('data-fallback-idx', idx);
        img.src = fallbacks[idx];
      } else {
        if (img.parentElement && img.parentElement.classList.contains('mod-thumbnail-frame')) {
          img.parentElement.style.display = 'none';
        }
      }
    } catch (e) {
      if (img.parentElement) img.parentElement.style.display = 'none';
    }
  };

  // Calculate 10-segment HP based on weeks since last update (-1 HP per week)
  // Color smoothly transitions: Green (10-9) -> Lime (8-7) -> Yellow (6-5) -> Orange (4-3) -> Red (2-1)
  function calculateModHP(mod) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const updateTs = mod.lastUpdated || mod.timestamp || now;
    const ageMs = Math.max(0, now - updateTs);
    const weeksOld = Math.floor(ageMs / msPerWeek);
    const daysOld = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const hp = Math.max(0, Math.min(10, 10 - weeksOld));
    
    let hpClass = 'hp-green';
    let tagClass = 'tag-green';

    if (hp <= 2) {
      hpClass = 'hp-red';
      tagClass = 'tag-red';
    } else if (hp <= 4) {
      hpClass = 'hp-orange';
      tagClass = 'tag-orange';
    } else if (hp <= 6) {
      hpClass = 'hp-yellow';
      tagClass = 'tag-yellow';
    } else if (hp <= 8) {
      hpClass = 'hp-lime';
      tagClass = 'tag-green';
    } else {
      hpClass = 'hp-green';
      tagClass = 'tag-green';
    }

    return {
      hp,
      maxHp: 10,
      weeksOld,
      daysOld,
      hpClass,
      tagClass,
      tooltip: `Updated ${daysOld === 0 ? 'Today' : `${daysOld}d ago (${weeksOld}w)`} — ${hp}/10 HP`
    };
  }

  function renderHPBar(hpInfo) {
    const colors = {
      'hp-green': '#22c55e',
      'hp-lime': '#84cc16',
      'hp-yellow': '#eab308',
      'hp-orange': '#f97316',
      'hp-red': '#ef4444',
      'hp-depleted': '#374151'
    };

    const segments = [];
    for (let i = 0; i < 10; i++) {
      const isFilled = i < hpInfo.hp;
      const color = isFilled ? colors[hpInfo.hpClass] : colors['hp-depleted'];
      const opacity = isFilled ? '1' : '0.35';
      segments.push(`<span class="hp-segment ${isFilled ? hpInfo.hpClass : 'hp-depleted'}" style="display:inline-block;width:5px;height:8px;background:${color};opacity:${opacity};border-radius:1px;flex-shrink:0;"></span>`);
    }
    return `
      <div class="hp-gauge-wrapper" style="display:inline-flex;align-items:center;gap:6px;" title="${escapeHTML(hpInfo.tooltip)}">
        <span class="hp-label" style="font-family:var(--font-retro-title);font-size:0.7rem;color:var(--text-muted);">HP:</span>
        <div class="hp-meter-10" style="display:inline-flex;align-items:center;gap:2px;background:#111827;padding:3px 4px;border:2px solid var(--border-color);border-radius:2px;box-shadow:1px 1px 0px var(--shadow-color);height:14px;box-sizing:border-box;">${segments.join('')}</div>
        <span class="hp-num" style="font-family:var(--font-mono);font-size:0.72rem;font-weight:700;color:var(--text-main);">${hpInfo.hp}/10</span>
      </div>
    `;
  }

  // Filter by Author helper
  function filterByAuthor(authorName) {
    if (!authorName) return;
    SFX.select();
    elements.searchInput.value = authorName;
    state.searchQuery = authorName;
    state.currentPage = 1;
    elements.searchClearBtn.style.display = 'block';
    renderCategoryChips();
    render();
    renderActiveBreadcrumbs();
    updateUrlParams();
    window.scrollTo({ top: elements.modsGrid.offsetTop - 120, behavior: 'smooth' });
    showToast(`FILTERED BY AUTHOR: ${authorName.toUpperCase()}`, 'info');
  }

  // Render Grid & Table using DocumentFragment Batching
  function render() {
    const filtered = getFilteredMods();
    const query = state.searchQuery.trim();

    // Results Counter
    elements.resultsCountNum.textContent = `${filtered.length} / ${getAllMods().length}`;

    if (filtered.length === 0) {
      elements.modsGrid.style.display = 'none';
      elements.modsTableWrapper.style.display = 'none';
      if (elements.loadMoreContainer) elements.loadMoreContainer.style.display = 'none';
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
    const maxItems = state.currentPage * state.pageSize;
    const visibleMods = mods.slice(0, maxItems);
    const remaining = mods.length - visibleMods.length;

    // Build DOM inside a DocumentFragment for 60fps performance
    const fragment = document.createDocumentFragment();

    visibleMods.forEach((mod, idx) => {
      const isFav = state.favorites.has(mod.id);
      const isActive = mod.status.toLowerCase() === 'active';
      const genClass = mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual';
      const isGh = mod.source === 'github_index';
      const hpInfo = calculateModHP(mod);
      const hpBarHtml = renderHPBar(hpInfo);

      const card = document.createElement('article');
      card.className = `dex-card ${idx === state.focusedCardIndex ? 'card-focused' : ''}`;
      card.setAttribute('data-card-index', idx);
      card.tabIndex = 0;

      // Thumbnail Image Frame HTML with dynamic Logo.PNG fallback chain
      const candidateLogos = getCandidateLogos(mod.repoUrl);
      const allImages = mod.thumbnailUrl ? [mod.thumbnailUrl, ...candidateLogos] : candidateLogos;
      const initialImg = allImages.length > 0 ? allImages[0] : '';
      const candidatesJson = escapeHTML(JSON.stringify(allImages));

      const thumbHtml = initialImg
        ? `<div class="mod-thumbnail-frame" data-mod-id="${mod.id}" style="cursor:pointer;">
             <img class="mod-thumbnail-img" 
                  src="${initialImg}" 
                  alt="${escapeHTML(mod.title)}" 
                  loading="lazy" 
                  data-fallbacks='${candidatesJson}' 
                  data-fallback-idx="0" 
                  onerror="handleImageFallback(this)">
           </div>`
        : '';

      const authorHtml = mod.author
        ? `<div class="mod-author-tag"><span class="author-clickable" data-author="${escapeHTML(mod.author)}" title="Filter mods by ${escapeHTML(mod.author)}">by ${highlightText(mod.author, query)}</span> ${mod.version ? `<span class="poke-tag tag-version" style="font-size:0.65rem;padding:1px 4px;margin-left:4px;">v${mod.version}</span>` : ''}</div>`
        : '';

      const downloadsBadge = (mod.downloads && mod.downloads > 0)
        ? `<span class="poke-tag tag-downloads" title="${mod.downloads.toLocaleString()} Total GitHub Downloads">DL: ${formatDownloads(mod.downloads)}</span>`
        : '';

      const starsBadge = (mod.stars && mod.stars > 0)
        ? `<span class="poke-tag tag-stars" title="${mod.stars} GitHub Stars">★ ${mod.stars}</span>`
        : '';

      const primaryActionBtn = isGh
        ? `<a href="${mod.repoUrl}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm poke-btn-github" title="View Source on GitHub">GITHUB ↗</a>`
        : `<a href="${mod.discordWebUrl}" target="_blank" rel="noopener noreferrer" class="poke-btn poke-btn-sm poke-btn-discord" title="Open Thread in Web Browser">WEB ↗</a>`;

      card.innerHTML = `
        <div>
          <div class="dex-card-top">
            <span class="dex-index-num">${mod.dexNo}</span>
            <div class="dex-top-tags">
              ${downloadsBadge}
              ${starsBadge}
              <span class="poke-tag ${genClass}">${mod.generation}</span>
              <span class="poke-tag">${mod.category}</span>
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
            ${hpBarHtml}
            <span>${mod.downloads ? `${mod.downloads.toLocaleString()} DLs` : (mod.dateCreated || 'Recent')}</span>
          </div>

          <div class="card-actions-row">
            ${primaryActionBtn}
            <button class="poke-btn poke-btn-sm btn-copy-link" data-mod-id="${mod.id}" title="Copy Link">COPY</button>
            <button class="poke-btn poke-btn-sm btn-details" data-mod-id="${mod.id}">INFO</button>
          </div>
        </div>
      `;

      // Event listeners
      const titleEl = card.querySelector('.dex-mod-title');
      if (titleEl) titleEl.addEventListener('click', () => openDetailModal(mod));

      const thumbEl = card.querySelector('.mod-thumbnail-frame');
      if (thumbEl) thumbEl.addEventListener('click', () => openDetailModal(mod));

      const detailsBtn = card.querySelector('.btn-details');
      if (detailsBtn) detailsBtn.addEventListener('click', () => openDetailModal(mod));

      const authorEl = card.querySelector('.author-clickable');
      if (authorEl) {
        authorEl.addEventListener('click', (e) => {
          e.stopPropagation();
          filterByAuthor(mod.author);
        });
      }

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
          state.currentPage = 1;
          elements.searchClearBtn.style.display = 'block';
          SFX.cursor();
          renderCategoryChips();
          render();
          renderActiveBreadcrumbs();
          updateUrlParams();
        });
      });

      card.addEventListener('focus', () => {
        setFocusedCard(idx);
      });

      fragment.appendChild(card);
    });

    elements.modsGrid.innerHTML = '';
    elements.modsGrid.appendChild(fragment);

    // Update Load More Container
    if (elements.loadMoreContainer) {
      if (remaining > 0) {
        elements.loadMoreContainer.style.display = 'flex';
        elements.loadMoreCount.textContent = remaining;
      } else {
        elements.loadMoreContainer.style.display = 'none';
      }
    }
  }

  function renderTable(mods, query) {
    const fragment = document.createDocumentFragment();

    mods.forEach(mod => {
      const isFav = state.favorites.has(mod.id);
      const isGh = mod.source === 'github_index';
      const hpInfo = calculateModHP(mod);
      const hpBarHtml = renderHPBar(hpInfo);
      const row = document.createElement('tr');

      const thumbImg = mod.thumbnailUrl
        ? `<img src="${mod.thumbnailUrl}" alt="" style="width:40px;height:40px;object-fit:cover;border:1px solid var(--border-color);" onerror="this.style.display='none';">`
        : `<span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);">[MOD]</span>`;

      const primaryLink = mod.repoUrl || mod.discordWebUrl;

      row.innerHTML = `
        <td style="font-family:var(--font-mono);font-size:0.78rem;font-weight:700;">${mod.dexNo}</td>
        <td>${thumbImg}</td>
        <td>
          <div style="font-family:var(--font-retro-title);font-size:0.95rem;font-weight:700;cursor:pointer;" class="table-title-click">
            ${highlightText(mod.title, query)}
          </div>
          ${mod.author ? `<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--poke-blue);cursor:pointer;" class="table-author-click">by ${escapeHTML(mod.author)}</div>` : ''}
        </td>
        <td><span class="poke-tag ${mod.generation === 'Gen 1' ? 'tag-red' : mod.generation === 'Gen 2' ? 'tag-blue' : 'tag-dual'}">${mod.generation}</span></td>
        <td><span class="poke-tag">${mod.category}</span></td>
        <td><span class="poke-tag tag-downloads" title="${(mod.downloads || 0).toLocaleString()} Downloads">DL: ${formatDownloads(mod.downloads || 0)}</span></td>
        <td>${hpBarHtml}</td>
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

      const authorBtn = row.querySelector('.table-author-click');
      if (authorBtn) {
        authorBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          filterByAuthor(mod.author);
        });
      }

      row.querySelector('.btn-favorite').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(mod.id);
      });

      fragment.appendChild(row);
    });

    elements.modsTableBody.innerHTML = '';
    elements.modsTableBody.appendChild(fragment);

    if (elements.loadMoreContainer) {
      elements.loadMoreContainer.style.display = 'none';
    }
  }

  // Keyboard navigation focus handler
  function setFocusedCard(index) {
    const cards = elements.modsGrid.querySelectorAll('.dex-card');
    if (cards.length === 0) return;
    
    cards.forEach(c => c.classList.remove('card-focused'));
    
    if (index >= 0 && index < cards.length) {
      state.focusedCardIndex = index;
      cards[index].classList.add('card-focused');
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
    renderActiveBreadcrumbs();

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
    elements.modalCatBadge.textContent = mod.category;

    if (mod.downloads && mod.downloads > 0) {
      elements.modalDownloadsBadge.textContent = `${mod.downloads.toLocaleString()} DLs`;
      elements.modalDownloadsBadge.style.display = 'inline-block';
    } else {
      elements.modalDownloadsBadge.style.display = 'none';
    }

    if (mod.stars && mod.stars > 0) {
      elements.modalStarsBadge.textContent = `★ ${mod.stars}`;
      elements.modalStarsBadge.style.display = 'inline-block';
    } else {
      elements.modalStarsBadge.style.display = 'none';
    }

    if (mod.version) {
      elements.modalVersionBadge.textContent = `v${mod.version}`;
      elements.modalVersionBadge.style.display = 'inline-block';
    } else {
      elements.modalVersionBadge.style.display = 'none';
    }

    const hpInfo = calculateModHP(mod);
    elements.modalStatusBadge.textContent = `HP: ${hpInfo.hp}/10`;
    elements.modalStatusBadge.className = `poke-tag ${hpInfo.tagClass}`;
    elements.modalStatusBadge.title = hpInfo.tooltip;
    elements.modalTitle.textContent = mod.title;

    if (mod.author) {
      elements.modalAuthor.innerHTML = `Author: <span class="author-clickable" title="Filter mods by ${escapeHTML(mod.author)}">${escapeHTML(mod.author)}</span>`;
      elements.modalAuthor.style.display = 'block';
      const authorEl = elements.modalAuthor.querySelector('.author-clickable');
      if (authorEl) {
        authorEl.onclick = () => {
          closeAllModals();
          filterByAuthor(mod.author);
        };
      }
    } else {
      elements.modalAuthor.style.display = 'none';
    }

    // Thumbnail in modal with fallback support
    const candidateLogos = getCandidateLogos(mod.repoUrl);
    const allImages = mod.thumbnailUrl ? [mod.thumbnailUrl, ...candidateLogos] : candidateLogos;
    if (allImages.length > 0) {
      elements.modalThumbnailImg.src = allImages[0];
      elements.modalThumbnailImg.setAttribute('data-fallbacks', JSON.stringify(allImages));
      elements.modalThumbnailImg.setAttribute('data-fallback-idx', '0');
      elements.modalThumbnailImg.onerror = function() {
        handleImageFallback(this);
      };
      elements.modalThumbnailContainer.style.display = 'block';
    } else {
      elements.modalThumbnailContainer.style.display = 'none';
    }

    elements.modalDesc.textContent = mod.description;
    elements.modalTags.innerHTML = (mod.tags || []).map(t => `<span class="mini-tag">#${escapeHTML(t)}</span>`).join('');
    elements.modalThreadId.textContent = mod.id;
    elements.modalThreadDate.textContent = mod.downloads ? `${mod.downloads.toLocaleString()} Total Downloads` : (mod.dateCreated || 'Recent');

    // Direct Release Download Button
    if (isGh && mod.repoUrl) {
      elements.modalDownloadZipBtn.href = `${mod.repoUrl}/releases/latest`;
      elements.modalDownloadZipBtn.style.display = 'inline-flex';
      elements.modalRepoLink.href = mod.repoUrl;
      elements.modalRepoLink.style.display = 'inline-flex';
      elements.modalWebLink.href = mod.githubIndexUrl || mod.repoUrl;
      elements.modalWebLink.textContent = 'INDEX FILE ↗';
      elements.modalAppLink.style.display = 'none';
    } else {
      elements.modalDownloadZipBtn.style.display = 'none';
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

  // Preset Filters
  function setPresetFilter(preset) {
    state.selectedPreset = preset;
    state.currentPage = 1;
    elements.presetPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-preset') === preset));
    updateActiveFilterBadge();
    render();
    renderActiveBreadcrumbs();
  }

  // Bind Event Listeners
  function initEventListeners() {
    // Debounced Search Input (100ms) with requestAnimationFrame
    let searchDebounceTimer = null;
    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.searchQuery = val;
        state.currentPage = 1;
        elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
        requestAnimationFrame(() => {
          renderCategoryChips();
          render();
          renderActiveBreadcrumbs();
          updateUrlParams();
        });
      }, 100);
    });

    // Clear search
    elements.searchClearBtn.addEventListener('click', () => {
      SFX.back();
      elements.searchInput.value = '';
      state.searchQuery = '';
      state.currentPage = 1;
      elements.searchClearBtn.style.display = 'none';
      elements.searchInput.focus();
      renderCategoryChips();
      render();
      renderActiveBreadcrumbs();
      updateUrlParams();
    });

    // Presets
    elements.presetPills.forEach(p => {
      p.addEventListener('click', () => {
        SFX.cursor();
        const preset = p.getAttribute('data-preset');
        setPresetFilter(preset);
      });
    });

    // Clear All Breadcrumbs button
    if (elements.clearAllBreadcrumbsBtn) {
      elements.clearAllBreadcrumbsBtn.addEventListener('click', resetAllFilters);
    }

    // Load More Button
    if (elements.loadMoreBtn) {
      elements.loadMoreBtn.addEventListener('click', () => {
        SFX.select();
        state.currentPage += 1;
        render();
      });
    }

    // Keyboard Shortcuts & Navigation Controls
    document.addEventListener('keydown', (e) => {
      const isInputActive = document.activeElement === elements.searchInput || 
                            document.activeElement.tagName === 'INPUT' || 
                            document.activeElement.tagName === 'TEXTAREA';

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
        SFX.cursor();
        return;
      }

      if (e.key === 'Escape') {
        if (elements.modDetailModal.classList.contains('open') || elements.exportModal.classList.contains('open')) {
          closeAllModals();
        } else if (state.searchQuery) {
          elements.searchClearBtn.click();
        }
        return;
      }

      // Card navigation when modal is not open
      if (!isInputActive && !elements.modDetailModal.classList.contains('open') && !elements.exportModal.classList.contains('open')) {
        const visibleCards = elements.modsGrid.querySelectorAll('.dex-card');
        const count = visibleCards.length;

        if (count > 0) {
          if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
            e.preventDefault();
            SFX.cursor();
            const nextIdx = state.focusedCardIndex < count - 1 ? state.focusedCardIndex + 1 : 0;
            setFocusedCard(nextIdx);
          } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            SFX.cursor();
            const prevIdx = state.focusedCardIndex > 0 ? state.focusedCardIndex - 1 : count - 1;
            setFocusedCard(prevIdx);
          } else if (e.key === 'Enter' || e.key === ' ') {
            if (state.focusedCardIndex >= 0 && state.focusedCardIndex < count) {
              e.preventDefault();
              const filtered = getFilteredMods();
              const targetMod = filtered[state.focusedCardIndex];
              if (targetMod) openDetailModal(targetMod);
            }
          } else if (e.key === 'b' || e.key === 'B') {
            if (state.focusedCardIndex >= 0 && state.focusedCardIndex < count) {
              e.preventDefault();
              const filtered = getFilteredMods();
              const targetMod = filtered[state.focusedCardIndex];
              if (targetMod) toggleFavorite(targetMod.id);
            }
          } else if (e.key === 'c' || e.key === 'C') {
            if (state.focusedCardIndex >= 0 && state.focusedCardIndex < count) {
              e.preventDefault();
              const filtered = getFilteredMods();
              const targetMod = filtered[state.focusedCardIndex];
              if (targetMod) {
                const link = targetMod.repoUrl || targetMod.discordWebUrl;
                copyToClipboard(link, 'LINK COPIED TO CLIPBOARD!');
              }
            }
          }
        }
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
        state.currentPage = 1;
        try {
          localStorage.setItem('gen1recomp_source', state.dataSource);
        } catch (e) {}
        updateSourceCounts();
        updateStats();
        renderCategoryChips();
        render();
        renderActiveBreadcrumbs();
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
        state.currentPage = 1;
        renderCategoryChips();
        render();
        renderActiveBreadcrumbs();
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
        state.currentPage = 1;
        updateActiveFilterBadge();
        render();
        renderActiveBreadcrumbs();
        updateUrlParams();
      });
    });

    // Sort select
    elements.sortSelect.addEventListener('change', (e) => {
      SFX.cursor();
      state.sortBy = e.target.value;
      state.currentPage = 1;
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
      elements.soundToggleBtn.textContent = `SOUND: ${state.soundEnabled ? 'ON' : 'OFF'}`;
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
      elements.scanlinesToggleBtn.textContent = `CRT: ${state.scanlinesEnabled ? 'ON' : 'OFF'}`;
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
      output += `| No. | Mod Title | Author | Gen | Category | Downloads | Link |\n`;
      output += `| --- | --------- | ------ | --- | -------- | --------- | ---- |\n`;
      modsToExport.forEach(m => {
        const link = m.repoUrl || m.discordWebUrl || `https://discord.com/channels/${GUILD_ID}/${m.id}`;
        output += `| ${m.dexNo} | ${m.title} | ${m.author || 'Community'} | ${m.generation} | ${m.category} | ${m.downloads ? m.downloads.toLocaleString() : '-'} | [View](${link}) |\n`;
      });
    } else if (state.exportFormat === 'text') {
      output += `POKÉMON GEN1RECOMP MODPACK EXPORT\nTotal: ${modsToExport.length} Mods\n=========================================\n\n`;
      modsToExport.forEach(m => {
        const link = m.repoUrl || m.discordWebUrl || `https://discord.com/channels/${GUILD_ID}/${mod.id}`;
        output += `[${m.dexNo}] ${m.title} (${m.generation} - ${m.category})\n`;
        if (m.author) output += `Author: ${m.author}\n`;
        if (m.downloads) output += `Downloads: ${m.downloads.toLocaleString()}\n`;
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
    state.currentPage = 1;
    elements.searchClearBtn.style.display = 'none';

    state.selectedGen = 'all';
    elements.genTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-gen') === 'all'));

    state.selectedStatus = 'all';
    elements.statusTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-status') === 'all'));

    state.selectedPreset = 'all';
    elements.presetPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-preset') === 'all'));

    state.selectedCategories.clear();
    updateCategoryChipClasses();
    updateActiveFilterBadge();

    state.sortBy = 'downloads';
    elements.sortSelect.value = 'downloads';

    renderCategoryChips();
    render();
    renderActiveBreadcrumbs();
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

    const sort = params.get('sort');
    if (sort && ['downloads', 'relevance', 'newest', 'oldest', 'title-asc', 'title-desc', 'author', 'category'].includes(sort)) {
      state.sortBy = sort;
      elements.sortSelect.value = sort;
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
    if (state.sortBy !== 'downloads') params.set('sort', state.sortBy);
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
    elements.scanlinesToggleBtn.textContent = `CRT: ${state.scanlinesEnabled ? 'ON' : 'OFF'}`;
    elements.soundToggleBtn.textContent = `SOUND: ${state.soundEnabled ? 'ON' : 'OFF'}`;

    // Apply active source button
    elements.sourceTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-source') === state.dataSource));

    updateSourceCounts();
    loadUrlParams();
    updateStats();
    renderCategoryChips();
    updateActiveFilterBadge();
    initEventListeners();
    render();
    renderActiveBreadcrumbs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

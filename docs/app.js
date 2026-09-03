(function () {
  const POPULAR_COUNT = 5;
  const SEARCH_RESULT_LIMIT = 8;

  const popularContainer = document.getElementById('popular-pills');
  const bucketGridContainer = document.getElementById('bucket-grid');
  const treeContainer = document.getElementById('link-tree');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  const clicksApiUrl =
    typeof CLICKS_API_URL === 'string' &&
    CLICKS_API_URL.indexOf('PASTE_YOUR') !== 0
      ? CLICKS_API_URL
      : null;

  let sectionsData = [];
  let clickCounts = {};

  init();

  async function init() {
    let data = null;

    // Real link data is served from the Apps Script backend so it never has
    // to live in this (public) repo. ./data/links.json is only a placeholder
    // fallback for local development when CLICKS_API_URL isn't configured.
    if (clicksApiUrl) {
      try {
        const res = await fetch(`${clicksApiUrl}?type=links`);
        data = await res.json();
      } catch {
        data = null;
      }
    }

    if (!data || !data.sections) {
      try {
        const res = await fetch('./data/links.json');
        data = await res.json();
      } catch {
        data = null;
      }
    }

    sectionsData = (data && data.sections) || [];

    if (clicksApiUrl) {
      try {
        const res = await fetch(clicksApiUrl);
        clickCounts = await res.json();
      } catch {
        clickCounts = {};
      }
    }

    renderPopular();
    renderBucketCards();
    renderTree();
    setupSearch();
  }

  function flattenLinks(sections, trail) {
    let out = [];
    for (const node of sections) {
      const path = trail.concat(node.title);
      if (node.links) {
        for (const link of node.links) {
          out.push(
            Object.assign({}, link, { path, clicks: clickCounts[link.id] || 0 })
          );
        }
      }
      if (node.children) {
        out = out.concat(flattenLinks(node.children, path));
      }
    }
    return out;
  }

  function flattenAll() {
    return flattenLinks(sectionsData, []);
  }

  function recordClick(id) {
    if (!clicksApiUrl) return;
    // text/plain avoids a CORS preflight, which Apps Script web apps don't handle.
    fetch(clicksApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  function attachClickTracking(anchor, id) {
    anchor.addEventListener('click', () => recordClick(id));
    // Middle-click ("open in new tab") fires auxclick instead of click.
    anchor.addEventListener('auxclick', (e) => {
      if (e.button === 1) recordClick(id);
    });
  }

  function makeLinkAnchor(link, className) {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = className;
    a.textContent = link.title;
    attachClickTracking(a, link.id);
    return a;
  }

  function renderPopular() {
    const allLinks = flattenAll();
    const popular = allLinks
      .slice()
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.title.localeCompare(b.title))
      .filter((link) => (link.clicks || 0) > 0)
      .slice(0, POPULAR_COUNT);

    popularContainer.innerHTML = '';

    if (!popular.length) {
      const note = document.createElement('p');
      note.className = 'empty-note';
      note.textContent = 'No link activity yet.';
      popularContainer.appendChild(note);
      return;
    }

    for (const link of popular) {
      popularContainer.appendChild(makeLinkAnchor(link, 'pill-link'));
    }
  }

  function renderBucketCards() {
    bucketGridContainer.innerHTML = '';
    for (const node of sectionsData) {
      const card = document.createElement('div');
      card.className = 'bucket-card';
      card.textContent = node.title;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');

      const jump = () => {
        const target = document.getElementById(`section-${node.id}`);
        if (target) {
          target.open = true;
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      card.addEventListener('click', jump);
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          jump();
        }
      });

      bucketGridContainer.appendChild(card);
    }
  }

  function renderTree() {
    treeContainer.innerHTML = '';
    for (const node of sectionsData) {
      treeContainer.appendChild(renderNode(node));
    }
  }

  // Brand rule: headings/titles keep the heading color, except a trademarked
  // term inside them, which renders in navy italics.
  const TM_TERM_PATTERN = /(Opportunity Culture®)/g;

  function renderHeadingText(container, text) {
    const parts = text.split(TM_TERM_PATTERN);
    for (const part of parts) {
      if (!part) continue;
      if (TM_TERM_PATTERN.test(part)) {
        TM_TERM_PATTERN.lastIndex = 0;
        const span = document.createElement('span');
        span.className = 'tm-term';
        span.textContent = part;
        container.appendChild(span);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    }
  }

  function makeChevron() {
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'tree-chevron');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', 'M9 6l6 6-6 6');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  function renderNode(node) {
    return node.plain ? renderPlainNode(node) : renderCollapsibleNode(node);
  }

  function renderPlainNode(node) {
    const container = document.createElement('div');
    container.id = `section-${node.id}`;
    container.className = 'tree-group';

    const heading = document.createElement('p');
    heading.className = 'category-title tree-group-label';
    renderHeadingText(heading, node.title);
    container.appendChild(heading);

    appendNodeBody(container, node);

    return container;
  }

  function renderCollapsibleNode(node) {
    const details = document.createElement('details');
    details.id = `section-${node.id}`;

    const summary = document.createElement('summary');
    summary.className = 'category-title';
    const summaryLabel = document.createElement('span');
    summaryLabel.className = 'summary-label';
    renderHeadingText(summaryLabel, node.title);
    summary.appendChild(summaryLabel);
    summary.appendChild(makeChevron());
    details.appendChild(summary);

    appendNodeBody(details, node);

    return details;
  }

  function appendNodeBody(container, node) {
    const hasLinks = node.links && node.links.length;
    const hasChildren = node.children && node.children.length;

    if (hasLinks) {
      const ul = document.createElement('ul');
      ul.className = 'link-list';
      for (const link of node.links) {
        const li = document.createElement('li');
        li.appendChild(makeLinkAnchor(link, ''));
        ul.appendChild(li);
      }
      container.appendChild(ul);
    }

    if (hasChildren) {
      for (const child of node.children) {
        container.appendChild(renderNode(child));
      }
    }

    if (!hasLinks && !hasChildren) {
      const note = document.createElement('p');
      note.className = 'empty-note';
      note.textContent = 'No links yet.';
      container.appendChild(note);
    }
  }

  function scoreMatch(query, title) {
    const q = query.toLowerCase().trim();
    const t = title.toLowerCase();
    if (!q) return -1;
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;

    let ti = 0;
    for (const ch of q) {
      ti = t.indexOf(ch, ti);
      if (ti === -1) return -1;
      ti++;
    }
    return 30;
  }

  function setupSearch() {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value;
      if (!query.trim()) {
        hideResults();
        return;
      }
      const allLinks = flattenAll();
      const scored = allLinks
        .map((link) => ({ link, score: scoreMatch(query, link.title) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.link.title.localeCompare(b.link.title))
        .slice(0, SEARCH_RESULT_LIMIT);

      showResults(scored.map((entry) => entry.link));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) {
        hideResults();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        hideResults();
      }
    });
  }

  function showResults(links) {
    searchResults.innerHTML = '';

    if (!links.length) {
      const empty = document.createElement('div');
      empty.className = 'search-no-results';
      empty.textContent = 'No matching links found.';
      searchResults.appendChild(empty);
      searchResults.hidden = false;
      return;
    }

    for (const link of links) {
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'search-result-item';
      attachClickTracking(a, link.id);

      const title = document.createElement('span');
      title.textContent = link.title;
      a.appendChild(title);

      const pathEl = document.createElement('span');
      pathEl.className = 'search-result-path';
      pathEl.textContent = link.path.join(' / ');
      a.appendChild(pathEl);

      searchResults.appendChild(a);
    }

    searchResults.hidden = false;
  }

  function hideResults() {
    searchResults.hidden = true;
    searchResults.innerHTML = '';
  }
})();

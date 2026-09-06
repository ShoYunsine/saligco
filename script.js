function reorderSmoothly(container, updateOrderCallback) {
  const items = Array.from(container.children);

  const firstPositions = items.map(el => el.getBoundingClientRect());

  updateOrderCallback();

  items.forEach((el, i) => {
    const first = firstPositions[i];
    const last = el.getBoundingClientRect();
    const deltaX = (first.left - last.left) * 0.35;
    const deltaY = (first.top - last.top) * 0.35;

    el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    el.style.transition = 'transform 0s';
  });

  requestAnimationFrame(() => {
    items.forEach(el => {
      el.style.transform = '';
      el.style.transition = 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navRight = document.querySelector('.nav-right');

  if (navToggle && navRight) {
    navToggle.addEventListener('click', () => {
      navRight.classList.toggle('nav-open');
      const isOpen = navRight.classList.contains('nav-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
      if (!navRight.contains(event.target)) {
        navRight.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    navRight.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navRight.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const heroVideo = document.querySelector('.hero-video');
  const heroSection = document.querySelector('.hero');
  const aboutSection = document.getElementById('about');
  const videoWrap = document.querySelector('.video-hero-about');

  let videoStateTimeout;
  let lastVideoState = null;

  function syncVideoState() {
    if (!heroVideo || !heroSection || !aboutSection || !videoWrap) return;

    const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
    const aboutTop = aboutSection.offsetTop;
    const scrollY = window.scrollY;
    const viewportBottom = scrollY + window.innerHeight;

    // Simplified logic: show video while in hero section and shortly into about section
    const inHero = scrollY < heroBottom;
    const inAbout = viewportBottom > aboutTop && scrollY < aboutTop + (aboutSection.offsetHeight * 0.75);
    const shouldShowVideo = inHero || inAbout;

    // Prevent rapid toggling with throttling
    if (lastVideoState === shouldShowVideo) return;

    clearTimeout(videoStateTimeout);
    videoStateTimeout = setTimeout(() => {
      lastVideoState = shouldShowVideo;
      videoWrap.classList.toggle('video-active', shouldShowVideo);

      if (shouldShowVideo) {
        if (heroVideo.paused) {
          heroVideo.play().catch(() => { });
        }
      } else {
        heroVideo.pause();
      }
    }, 50); // 50ms debounce to prevent rapid toggling on mobile
  }

  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.play().catch(() => { });
    heroVideo.addEventListener('loadeddata', () => {
      heroVideo.play().catch(() => { });
    });
  }

  const orgChart = document.getElementById('orgChart');
  if (orgChart) {
    const peopleSearch = document.getElementById('peopleSearch');
    const departmentFilter = document.getElementById('departmentFilter');
    console.log('Fetching people.json for organizational chart...');
    console.log('People Search Input:', peopleSearch);
    console.log('Department Filter Select:', departmentFilter.value);
    fetch('people.json')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(organization => {
        const departmentNames = new Set();

        const collectDepartments = (node, path = []) => {
          const nextPath = node.type === 'department' ? [...path, node.name] : path;
          if (node.type === 'department') departmentNames.add(nextPath.join(' / '));
          (node.children || []).forEach(child => collectDepartments(child, nextPath));
        };
        collectDepartments(organization);
        departmentNames.forEach(department => {
          const option = document.createElement('option');
          option.value = department;
          option.textContent = department;
          departmentFilter.appendChild(option);
        });

        const renderNode = (node, departmentPath = []) => {
          const isPerson = node.type !== 'department';
          const currentDepartmentPath = node.type === 'department' ? [...departmentPath, node.name] : departmentPath;
          const nodeContent = isPerson ? `
              <article class="person-card" tabindex="0">
                <div class="person-card-main">
                  <img class="person-image" src="${node.image}" alt="${node.name}">
                  <div class="person-summary">
                    <span class="person-rank">${node.rank}</span>
                    <span class="person-role">${node.role}</span>
                    <h3>${node.name}</h3>
                    <span class="person-department"><i class="fa-solid fa-sitemap" aria-hidden="true"></i> ${currentDepartmentPath.join(' / ') || 'Executive Management'}</span>
                    <span class="person-hint">View credentials <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></span>
                  </div>
                </div>
                <div class="person-credentials">
                  <p>${node.bio}</p>
                  <h4>Credentials</h4>
                  <ul>${node.credentials.map(credential => `<li>${credential}</li>`).join('')}</ul>
                  ${node.experience?.length ? `<h4>Professional Experience</h4><ul>${node.experience.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
                  <h4>Current Role</h4>
                  <p>${node.currentRole}</p>
                </div>
              </article>` : `
              <div class="department-card">
                <span class="person-rank">${node.rank}</span>
                <h3>${node.name}</h3>
                <span>${node.role}</span>
              </div>`;

          if (!node.children || node.children.length === 0) {
            return `<div class="org-node org-leaf">${nodeContent}</div>`;
          }

          return `<div class="org-node">
              ${nodeContent}
              <div class="org-children">${node.children.map(child => renderNode(child, currentDepartmentPath)).join('')}</div>
            </div>`;
        };

        const nodeText = node => {
          const name = node.name || '';
          const role = node.role || '';
          const rank = node.rank || '';
          const credentials = Array.isArray(node.credentials) ? node.credentials.join(' ') : '';
          const bio = node.bio || '';
          return `${name} ${role} ${rank} ${credentials} ${bio}`.toLowerCase();
        };

        const filterTree = (node, searchTerm, selectedDepartment, departmentPath = []) => {
          if (!node) return null;

          const currentDepartmentPath = node.type === 'department'
            ? [...departmentPath, node.name]
            : departmentPath;

          const departmentPathText = currentDepartmentPath.join(' / ');

          // Check Department Filter
          const matchesDepartment = selectedDepartment === 'all'
            || departmentPathText === selectedDepartment
            || departmentPathText.startsWith(`${selectedDepartment} / `)
            || selectedDepartment.startsWith(departmentPathText); // Allows root parent to pass through to matching children

          // Process Children Recursively
          const children = (node.children || [])
            .map(child => filterTree(child, searchTerm, selectedDepartment, currentDepartmentPath))
            .filter(Boolean);

          const isPerson = node.type !== 'department';
          const matchesSearch = !searchTerm || nodeText(node).includes(searchTerm);

          // Return full tree if no search/filter is active
          if (!searchTerm && selectedDepartment === 'all') return node;

          // Include Person if both search and department match
          if (isPerson) {
            return ((matchesSearch && matchesDepartment) || children.length > 0)
              ? { ...node, children }
              : null;
          }

          // Include Department if it has matching children OR the department itself matches search
          if (children.length > 0 || (matchesSearch && matchesDepartment)) {
            return { ...node, children };
          }

          return null;
        };

        const applyFilters = () => {
          const searchTerm = peopleSearch.value.trim().toLowerCase();
          console.log('Search Term:', searchTerm);
          const selectedDepartment = departmentFilter.value;
          const filteredOrganization = filterTree(organization, searchTerm, selectedDepartment);
          console.log('Filtered Organization:', filteredOrganization);
          orgChart.innerHTML = filteredOrganization
            ? renderNode(filteredOrganization)
            : '<p class="org-message">No personnel match your search.</p>';
        };

        peopleSearch.addEventListener('input', applyFilters);
        departmentFilter.addEventListener('change', applyFilters);
        applyFilters();
      })
      .catch(() => {
        orgChart.innerHTML = '<p class="org-message">Personnel details are currently unavailable.</p>';
      });
  }

  window.addEventListener('scroll', syncVideoState, { passive: true });
  window.addEventListener('resize', syncVideoState);
  syncVideoState();

  const heroCtas = document.querySelectorAll('.hero-cta');
  heroCtas.forEach((heroCta) => {
    const ctaText = heroCta.querySelector('.cta-text');
    const ctaArrow = heroCta.querySelector('.cta-arrow');

    if (!ctaText || !ctaArrow) return;

    const setDefaultOrder = () => {
      heroCta.appendChild(ctaText);
      heroCta.appendChild(ctaArrow);
    };

    const setSwappedOrder = () => {
      heroCta.appendChild(ctaArrow);
      heroCta.appendChild(ctaText);
    };

    heroCta.addEventListener('mouseenter', () => {
      reorderSmoothly(heroCta, setSwappedOrder);
    });

    heroCta.addEventListener('mouseleave', () => {
      reorderSmoothly(heroCta, setDefaultOrder);
    });
  });

  const updatePanel = document.querySelector('.hero-updates');
  if (updatePanel) {
    const image = updatePanel.querySelector('.update-image');
    const kicker = updatePanel.querySelector('.update-kicker');
    const title = updatePanel.querySelector('.update-title');
    const description = updatePanel.querySelector('.update-description');
    const current = updatePanel.querySelector('.update-current');
    const total = updatePanel.querySelector('.update-total');
    const nextButton = updatePanel.querySelector('.update-arrow');
    const fallbackUpdates = [{
      image: image.src,
      alt: image.alt,
      kicker: kicker.textContent,
      title: title.textContent,
      description: description.textContent
    }];

    fetch('updates.json')
      .then(response => response.ok ? response.json() : Promise.reject())
      .catch(() => fallbackUpdates)
      .then(updates => {
        if (!Array.isArray(updates) || updates.length === 0) return;

        let updateIndex = 0;
        let updateTimer;
        const updateInterval = 6000;
        total.textContent = String(updates.length).padStart(2, '0');

        function showUpdate(index) {
          updateIndex = (index + updates.length) % updates.length;
          const update = updates[updateIndex];
          updatePanel.classList.add('is-changing');
          window.setTimeout(() => {
            image.src = update.image;
            image.alt = update.alt;
            kicker.textContent = update.kicker;
            title.textContent = update.title;
            description.textContent = update.description;
            current.textContent = String(updateIndex + 1).padStart(2, '0');
            updatePanel.classList.remove('is-changing');
            updatePanel.classList.remove('is-running');
            void updatePanel.offsetWidth;
            updatePanel.classList.add('is-running');
          }, 180);
        }

        function startUpdates() {
          window.clearInterval(updateTimer);
          updatePanel.classList.add('is-running');
          updateTimer = window.setInterval(() => showUpdate(updateIndex + 1), updateInterval);
        }

        nextButton.addEventListener('click', () => {
          showUpdate(updateIndex + 1);
          startUpdates();
        });
        updatePanel.addEventListener('mouseenter', () => window.clearInterval(updateTimer));
        updatePanel.addEventListener('mouseleave', startUpdates);
        startUpdates();
      });
  }

  // Simple Project Gallery Filtering
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        if (filterValue === 'all' || card.classList.contains(filterValue)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Basic Form Submission Handler
  const form = document.getElementById('quoteForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you! Your quote request has been submitted.');
    form.reset();
  });
}); document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  const heroSection = document.querySelector('.hero');

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const heroHeight = heroSection ? heroSection.offsetHeight / 2 : 300;

    // Only enable auto-hide once scrolled past the top portion of the hero section
    if (currentScrollY > heroHeight) {
      if (currentScrollY > lastScrollY) {
        // Scrolling DOWN -> Hide navbar
        navbar.classList.add('navbar--hidden');
      } else {
        // Scrolling UP -> Reveal navbar
        navbar.classList.remove('navbar--hidden');
      }
    } else {
      // Always show navbar when near the top/hero section
      navbar.classList.remove('navbar--hidden');
    }

    lastScrollY = currentScrollY;
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.asymmetric-grid .card');
  const dots = document.querySelectorAll('#aboutIndicators .indicator-dot');
  const aboutSection = document.getElementById('about');

  let currentIndex = 0;
  let timer = null;
  let isHovered = false;
  let isVisible = false;
  const INTERVAL_TIME = 4000; // 4 seconds per card

  function setActiveCard(index) {
    currentIndex = index;

    // Reset all cards and indicator dots
    cards.forEach(card => card.classList.remove('auto-active'));
    dots.forEach(dot => {
      dot.classList.remove('active', 'running', 'paused');
      const fill = dot.querySelector('.progress-fill');
      if (fill) {
        fill.style.animation = ''; // <-- FIX: Clears inline override so CSS rule can take over!
      }
    });

    // Target current active card and dot
    const activeCard = cards[index];
    const activeDot = dots[index];

    if (activeCard) activeCard.classList.add('auto-active');

    if (activeDot) {
      activeDot.classList.add('active');

      if (isHovered) {
        // When hovered, pause state
        activeDot.classList.add('paused');
      } else if (isVisible) {
        // Force reflow so the browser restarts the animation loop
        const fill = activeDot.querySelector('.progress-fill');
        if (fill) {
          void fill.offsetWidth;
        }
        activeDot.classList.add('running');
      }
    }
  }

  function startCycle() {
    stopCycle();
    if (isHovered || !isVisible) return;

    auto.active = true;
    setActiveCard(currentIndex);
    timer = setInterval(() => {
      currentIndex = (currentIndex + 1) % cards.length;
      setActiveCard(currentIndex);
    }, INTERVAL_TIME);
  }

  function stopCycle() {
    if (timer) clearInterval(timer);
    auto.active = false;
  }

  // Hover handlers for cards
  cards.forEach((card, idx) => {
    card.addEventListener('mouseenter', () => {
      isHovered = true;
      stopCycle();
      setActiveCard(idx);
    });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
      startCycle();
    });
  });

  // Hover and Click handlers for indicator dots
  dots.forEach((dot, idx) => {
    dot.addEventListener('mouseenter', () => {
      isHovered = true;
      stopCycle();
      setActiveCard(idx);
    });

    dot.addEventListener('mouseleave', () => {
      isHovered = false;
      startCycle();
    });

    dot.addEventListener('click', () => {
      currentIndex = idx;
      setActiveCard(idx);
    });
  });

  const aboutGrid = document.querySelector('.asymmetric-grid');
  const sharedCanvas = document.querySelector('.about-grid-canvas');
  if (!aboutGrid || !sharedCanvas) return;

  const ctx = sharedCanvas.getContext('2d');
  const pointer = { x: 0, y: 0, active: false };
  const focus = { x: 0, y: 0 };
  const auto = { x: 0, y: 0, phase: 0, active: false };
  const FOLLOW_DELAY = 0.08; // lower = faster follow, higher = slower / more delayed

  function syncCanvasSize() {
    const rect = aboutGrid.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = rect.width * 1.8;
    const canvasHeight = rect.height * 1.8;

    sharedCanvas.width = Math.round(canvasWidth * dpr);
    sharedCanvas.height = Math.round(canvasHeight * dpr);
    sharedCanvas.style.width = `${canvasWidth}px`;
    sharedCanvas.style.height = `${canvasHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getTargetPoint() {
    const rect = aboutGrid.getBoundingClientRect();
    const canvasOriginX = (sharedCanvas.clientWidth - rect.width) / 2;
    const canvasOriginY = (sharedCanvas.clientHeight - rect.height) / 2;
    let targetCard = null;

    for (const card of cards) {
      if (card.classList.contains('auto-active')) {
        targetCard = card;
        break;
      }
    }

    if (pointer.active) {
      return {
        x: pointer.x + canvasOriginX,
        y: pointer.y + canvasOriginY
      };
    }

    if (targetCard && auto.active) {
      return {
        x: targetCard.getBoundingClientRect().left - rect.left + targetCard.offsetWidth / 2 + canvasOriginX,
        y: targetCard.getBoundingClientRect().top - rect.top + targetCard.offsetHeight / 2 + canvasOriginY
      };
    }

    return {
      x: rect.width * 0.5 + canvasOriginX,
      y: rect.height * 0.5 + canvasOriginY
    };
  }

  function drawSharedGlow() {
    const rect = aboutGrid.getBoundingClientRect();
    const width = sharedCanvas.clientWidth || rect.width * 0.25;
    const height = sharedCanvas.clientHeight || rect.height * 0.25;
    const target = getTargetPoint();

    // Smooth follow easing. Increase this to make it lag more; decrease to make it react faster.
    focus.x += (target.x - focus.x) * FOLLOW_DELAY;
    focus.y += (target.y - focus.y) * FOLLOW_DELAY;

    ctx.clearRect(0, 0, width, height);

    const spacing = 28;
    const maxRadius = Math.min(width, height) * 0.18;
    const dotSpread = 70;

    for (let row = -Math.ceil(height / spacing); row <= Math.ceil(height / spacing); row++) {
      for (let col = -Math.ceil(width / spacing); col <= Math.ceil(width / spacing); col++) {
        const px = col * spacing;
        const py = row * spacing;
        const dx = px - focus.x;
        const dy = py - focus.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius + dotSpread) continue;

        const falloff = 1 - (distance / (maxRadius + dotSpread));
        const dotSize = 2 + falloff * 5;
        const alpha = 0.12 + falloff * 0.9;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const glow = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, maxRadius);
    glow.addColorStop(0, 'rgba(255,255,255,0.18)');
    glow.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(focus.x - maxRadius, focus.y - maxRadius, maxRadius * 2, maxRadius * 2);
  }

  function animateSharedCanvas() {
    drawSharedGlow();
    requestAnimationFrame(animateSharedCanvas);
  }

  aboutGrid.addEventListener('pointermove', (event) => {
    const rect = aboutGrid.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  });

  aboutGrid.addEventListener('pointerleave', () => {
    pointer.active = false;
  });

  window.addEventListener('resize', syncCanvasSize);
  syncCanvasSize();
  animateSharedCanvas();

  // Start timer ONLY when the About section is scrolled into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        isVisible = true;
        startCycle();
      } else {
        isVisible = false;
        stopCycle();
      }
    });
  }, { threshold: 0.2 });

  if (aboutSection) {
    observer.observe(aboutSection);
  }
});
import assetDatabase from './assets_db.js';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let activeCategory   = null;
let vinylIndex       = 0;
let galleryMedia     = [];
let lightboxIndex    = 0;
let rafPending       = false;

// ─────────────────────────────────────────────
// DOM refs
// ─────────────────────────────────────────────
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const homeView    = $('home-view');
const projectView = $('project-view');
const aboutView   = $('about-view');
const contactView = $('contact-view');

const vinylOverlay    = $('vinyl-overlay');
const vinylBackdrop   = $('vinyl-backdrop');
const vinylStack      = $('vinyl-stack');
const vinylCatLabel   = $('vinyl-cat-label');
const vinylCounter    = $('vinyl-counter');
const vinylCloseBtn   = $('vinyl-close-btn');
const vinylPrev       = $('vinyl-prev');
const vinylNext       = $('vinyl-next');
const vinylOpenGallery= $('vinyl-open-gallery');

const projGallery     = $('proj-gallery');
const projNum         = $('proj-num');
const projTitle       = $('proj-title');
const projSubtitle    = $('proj-subtitle');
const projectBackBtn  = $('project-back-btn');

const lightbox        = $('lightbox');
const lbMedia         = $('lb-media');
const lbCounter       = $('lb-counter');
const lbClose         = $('lb-close');
const lbPrev          = $('lb-prev');
const lbNext          = $('lb-next');

const contactForm     = $('contact-form');
const formSuccess     = $('form-success');

// ─────────────────────────────────────────────
// View routing
// ─────────────────────────────────────────────
function showView(name) {
    $$('.view-section').forEach(s => s.classList.remove('active'));
    $$('.nav-link').forEach(l => l.classList.remove('active'));

    const section = $(`${name}-view`);
    if (section) {
        section.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    const link = document.querySelector(`.nav-link[data-view="${name}"]`);
    if (link) link.classList.add('active');
}

$$('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        showView(link.dataset.view);
    });
});

// About CTA link
document.querySelector('.about-cta')?.addEventListener('click', e => {
    e.preventDefault();
    showView('contact');
});

// ─────────────────────────────────────────────
// Parallax (RAF-throttled, gentle speeds)
// ─────────────────────────────────────────────
const staggeredItems = $$('.staggered-item');

function applyParallax() {
    if (!homeView.classList.contains('active')) return;
    const scrollY = window.pageYOffset;
    staggeredItems.forEach(item => {
        const speed = parseFloat(item.dataset.scrollSpeed) || 0;
        item.style.transform = `translateY(${(scrollY * speed).toFixed(2)}px)`;
    });
    rafPending = false;
}

window.addEventListener('scroll', () => {
    if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(applyParallax);
    }
}, { passive: true });

// ─────────────────────────────────────────────
// Category cards → open vinyl
// ─────────────────────────────────────────────
$$('.category-card-wrapper').forEach(card => {
    card.addEventListener('click', () => {
        const item = card.closest('.staggered-item');
        const catId = item?.dataset.category;
        if (catId) openVinyl(catId);
    });
});

// ─────────────────────────────────────────────
// Vinyl Stack
// ─────────────────────────────────────────────
function isVideo(path) {
    return /\.(mp4|mov|webm)$/i.test(path);
}

function openVinyl(catId) {
    const cat = assetDatabase.categories.find(c => c.id === catId);
    if (!cat) return;

    activeCategory = cat;
    vinylIndex = 0;

    // Label
    vinylCatLabel.textContent = cat.title;

    // Build cards
    vinylStack.innerHTML = '';
    cat.items.forEach((media, i) => {
        const card = document.createElement('div');
        card.classList.add('vinyl-card');
        if (i === 0) card.classList.add('vinyl-front');

        if (isVideo(media.path)) {
            const vid = document.createElement('video');
            vid.src = media.path;
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.preload = 'metadata';
            card.appendChild(vid);
        } else {
            const img = document.createElement('img');
            img.src = media.path;
            img.alt = media.name;
            img.loading = 'lazy';
            card.appendChild(img);
        }

        // Click front card → open lightbox
        card.addEventListener('click', () => {
            if (i === vinylIndex) {
		galleryMedia = cat.items;
                closeVinyl();
                openLightbox(i);
            }
        });

        vinylStack.appendChild(card);
    });

    updateVinylCounter();
    playFrontVinylVideo();

    vinylOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeVinyl() {
    vinylOverlay.classList.remove('open');
    document.body.style.overflow = '';
    stopAllVinylVideos();
}

function navigateVinyl(dir) {
    const cards = vinylStack.querySelectorAll('.vinyl-card');
    const total = cards.length;
    if (!total) return;

    // Remove front from current
    cards[vinylIndex].classList.remove('vinyl-front');

    vinylIndex = (vinylIndex + dir + total) % total;

    // Animate
    vinylStack.classList.add('animating');
    cards[vinylIndex].classList.add('vinyl-front');

    // Re-order z-indices to maintain stacked look
    cards.forEach((card, i) => {
        const offset = (i - vinylIndex + total) % total;
        card.style.zIndex = total - offset;
        card.style.transform = offset === 0
            ? 'translateX(0) rotate(0deg)'
            : `translateX(${offset * 10}px) rotate(${offset * 1.2}deg)`;
    });

    setTimeout(() => vinylStack.classList.remove('animating'), 500);

    updateVinylCounter();
    stopAllVinylVideos();
    playFrontVinylVideo();
}

function updateVinylCounter() {
    const total = activeCategory?.items.length ?? 0;
    vinylCounter.textContent = `${String(vinylIndex + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
}

function playFrontVinylVideo() {
    const frontCard = vinylStack.querySelectorAll('.vinyl-card')[vinylIndex];
    const vid = frontCard?.querySelector('video');
    if (vid) vid.play().catch(() => {});
}

function stopAllVinylVideos() {
    vinylStack.querySelectorAll('video').forEach(v => {
        v.pause();
        v.currentTime = 0;
    });
}

vinylPrev.addEventListener('click', () => navigateVinyl(-1));
vinylNext.addEventListener('click', () => navigateVinyl(1));
vinylCloseBtn.addEventListener('click', closeVinyl);
vinylBackdrop.addEventListener('click', closeVinyl);

vinylOpenGallery.addEventListener('click', () => {
    closeVinyl();
    if (activeCategory) loadGallery(activeCategory.id);
});

// ─────────────────────────────────────────────
// Gallery view
// ─────────────────────────────────────────────
function loadGallery(catId) {
    const cat = assetDatabase.categories.find(c => c.id === catId);
    if (!cat) return;

    activeCategory = cat;
    galleryMedia = cat.items;

    // Update sticky col
    const nums = { videography: '01', events: '02', lifestyle: '03', products: '04' };
    projNum.textContent = nums[catId] || '01';
    projTitle.textContent = cat.title;
    projSubtitle.textContent = cat.subtitle;

    // Build gallery
    projGallery.innerHTML = '';

    galleryMedia.forEach((media, index) => {
        const card = document.createElement('div');
        card.classList.add('gallery-card');

        if (isVideo(media.path)) {
            const vid = document.createElement('video');
            vid.src = media.path;
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.preload = 'metadata';
            card.appendChild(vid);

            card.addEventListener('mouseenter', () => vid.play().catch(() => {}));
            card.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
        } else {
            const img = document.createElement('img');
            img.src = media.path;
            img.alt = media.name;
            img.loading = 'lazy';
            card.appendChild(img);
        }

        card.addEventListener('click', () => openLightbox(index));
        projGallery.appendChild(card);
    });

    // Switch to project view
    showView('project');

    // Fade cards in as they scroll into view
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.08 });

    $$('.gallery-card').forEach(c => observer.observe(c));
}

projectBackBtn.addEventListener('click', () => showView('home'));

// ─────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────
function openLightbox(index) {
    lightboxIndex = index;
    renderLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbMedia.innerHTML = '';
}

function renderLightbox() {
    const media = galleryMedia[lightboxIndex];
    if (!media) return;

    lbMedia.innerHTML = '';

    if (isVideo(media.path)) {
        const vid = document.createElement('video');
        vid.src = media.path;
        vid.controls = true;
        vid.autoplay = true;
        vid.loop = true;
        vid.playsInline = true;
        lbMedia.appendChild(vid);
    } else {
        const img = document.createElement('img');
        img.src = media.path;
        img.alt = media.name;
        lbMedia.appendChild(img);
    }

    const total = galleryMedia.length;
    lbCounter.textContent = `${String(lightboxIndex + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
}

function navLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + galleryMedia.length) % galleryMedia.length;
    renderLightbox();
}

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => navLightbox(-1));
lbNext.addEventListener('click', () => navLightbox(1));

window.addEventListener('keydown', e => {
    if (lightbox.classList.contains('open')) {
        if (e.key === 'Escape')      closeLightbox();
        if (e.key === 'ArrowLeft')   navLightbox(-1);
        if (e.key === 'ArrowRight')  navLightbox(1);
    }
    if (vinylOverlay.classList.contains('open')) {
        if (e.key === 'Escape')      closeVinyl();
        if (e.key === 'ArrowLeft')   navigateVinyl(-1);
        if (e.key === 'ArrowRight')  navigateVinyl(1);
    }
});

// ─────────────────────────────────────────────
// Contact form
// ─────────────────────────────────────────────
contactForm?.addEventListener('submit', e => {
    e.preventDefault();
    contactForm.style.display = 'none';
    formSuccess.style.display = 'block';
});

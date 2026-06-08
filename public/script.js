const API_BASE = '/api';

async function fetchCategories() {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) {
        console.error('Failed to load categories', response.statusText);
        return [];
    }
    return response.json();
}

async function fetchProviders(category = '', location = '') {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (location) params.append('location', location);
    const url = `${API_BASE}/providers${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error('Failed to load providers', response.statusText);
        return [];
    }
    return response.json();
}

function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
        <img class="service-image" src="${category.image_url || 'https://via.placeholder.com/400x220?text=Category'}" alt="${category.name}">
        <h3>${category.name}</h3>
        <p>Explore providers for ${category.name} services.</p>
        <a href="/providers?category=${encodeURIComponent(category.name)}">Find Providers</a>
    `;
    return card;
}

function createProviderCard(provider) {
    const card = document.createElement('div');
    card.className = 'provider-card';
    card.innerHTML = `
        <h3>${provider.name}</h3>
        <p>Category: ${provider.category}</p>
        <p>Location: ${provider.location}</p>
        <p>Rating: ${provider.rating} ⭐</p>
        <p>Phone: ${provider.phone_number || 'N/A'}</p>
        <a href="/booking?provider=${provider.id}">Book Now</a>
    `;
    return card;
}

document.addEventListener('DOMContentLoaded', function() {
    const searchButton = document.querySelector('.search-bar button');
    const searchInput = document.querySelector('.search-bar input');

    if (searchButton && searchInput) {
        const performHomeSearch = async function() {
            const query = searchInput.value.trim().toLowerCase();
            const resultsContainer = document.getElementById('home-search-results');
            if (!resultsContainer) return;

            if (!query) {
                resultsContainer.innerHTML = '<p class="search-message">Please enter a search term.</p>';
                return;
            }

            const providers = await fetchProviders();
            const matchedProviders = providers.filter(provider => {
                return provider.name.toLowerCase().includes(query)
                    || provider.category.toLowerCase().includes(query)
                    || provider.location.toLowerCase().includes(query);
            });

            if (matchedProviders.length === 0) {
                resultsContainer.innerHTML = `<p class="search-message">No results found for "${query}".</p>`;
                return;
            }

            resultsContainer.innerHTML = `
                <h3>Search results for "${query}"</h3>
                <div class="result-grid"></div>
            `;

            const resultGrid = resultsContainer.querySelector('.result-grid');
            matchedProviders.forEach(provider => resultGrid.appendChild(createProviderCard(provider)));
        };

        searchButton.addEventListener('click', performHomeSearch);
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performHomeSearch();
            }
        });
    }

    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    const bookingNavItem = document.getElementById('booking-nav-item');
    if (bookingNavItem) {
        const isBookingPage = window.location.pathname.endsWith('/booking');
        const hasProviderQuery = window.location.search.includes('provider=');
        if (isBookingPage || hasProviderQuery) {
            bookingNavItem.classList.remove('hidden');
        } else {
            bookingNavItem.classList.add('hidden');
        }
    }

    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        });
    });

    const searchProvidersBtn = document.querySelector('button[onclick="searchProviders()"]');
    if (searchProvidersBtn) {
        searchProvidersBtn.addEventListener('click', searchProviders);
    }

    const serviceTypeSelect = document.getElementById('service-type');
    if (serviceTypeSelect) {
        serviceTypeSelect.addEventListener('change', populateProviders);
    }

    if (document.getElementById('category-grid')) {
        loadCategories();
    }

    if (document.getElementById('providers-list')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category) {
            document.getElementById('category-select').value = category;
        }
        loadProviders();
    }

    const bookingForm = document.querySelector('.booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const providerId = document.getElementById('provider').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            const location = document.getElementById('location').value.trim();
            const description = document.getElementById('description').value.trim();
            const photoFile = document.getElementById('photo_file')?.files[0];
            const videoFile = document.getElementById('video_file')?.files[0];

            if (!providerId || !date || !time || !location) {
                alert('Please select a provider and fill in the booking details.');
                return;
            }

            const formData = new FormData();
            formData.append('providerId', providerId);
            formData.append('name', 'Guest');
            formData.append('phone', 'N/A');
            formData.append('date', date);
            formData.append('time', time);
            formData.append('location', location);
            formData.append('description', description);
            if (photoFile) formData.append('photo_file', photoFile);
            if (videoFile) formData.append('video_file', videoFile);

            const response = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Booking request submitted successfully!');
                bookingForm.reset();
            } else {
                const error = await response.json();
                alert(error?.error || 'Booking submission failed.');
            }
        });
    }

    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('full-name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const category = document.getElementById('service-category').value;
            const location = document.getElementById('location').value.trim();

            if (!name || !phone || !category || !location) {
                alert('Please fill in the required fields.');
                return;
            }

            const response = await fetch(`${API_BASE}/providers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    category,
                    location,
                    phone_number: phone
                })
            });

            if (response.ok) {
                alert('Provider registered successfully!');
                profileForm.reset();
                window.location.href = '/providers';
            } else {
                const error = await response.json();
                alert(error?.error || 'Registration failed.');
            }
        });
    }
});

async function loadProviders() {
    const providersList = document.getElementById('providers-list');
    if (!providersList) return;

    const category = document.getElementById('category-select')?.value || '';
    const providers = await fetchProviders(category);

    providersList.innerHTML = '';
    if (!providers.length) {
        providersList.innerHTML = '<p class="loading-message">No providers found for this filter.</p>';
        return;
    }

    providers.forEach(provider => providersList.appendChild(createProviderCard(provider)));
}

async function searchProviders() {
    const category = document.getElementById('category-select').value;
    const location = document.getElementById('location-input').value.trim();
    const providers = await fetchProviders(category, location);
    const providersList = document.getElementById('providers-list');
    if (!providersList) return;

    providersList.innerHTML = '';
    if (!providers.length) {
        providersList.innerHTML = '<p class="loading-message">No providers match your search criteria.</p>';
        return;
    }
    providers.forEach(provider => providersList.appendChild(createProviderCard(provider)));
}

async function populateProviders() {
    const serviceType = document.getElementById('service-type').value;
    const providerSelect = document.getElementById('provider');
    providerSelect.innerHTML = '<option value="">Select Provider</option>';

    const providers = await fetchProviders(serviceType);
    providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = `${provider.name} - ${provider.location}`;
        providerSelect.appendChild(option);
    });
}

async function loadCategories() {
    const categoryGrid = document.getElementById('category-grid');
    if (!categoryGrid) return;

    const categories = await fetchCategories();
    categoryGrid.innerHTML = '';

    if (!categories.length) {
        categoryGrid.innerHTML = '<p class="loading-message">No categories available right now.</p>';
        return;
    }

    categories.forEach(category => categoryGrid.appendChild(createCategoryCard(category)));
}

function getStoredProviders() {
    const stored = localStorage.getItem('lspProviders');
    return stored ? JSON.parse(stored) : [];
}

function saveProviderToStorage(provider) {
    const providers = getStoredProviders();
    providers.push(provider);
    localStorage.setItem('lspProviders', JSON.stringify(providers));
}

function getStoredComments() {
    const stored = localStorage.getItem('lspComments');
    return stored ? JSON.parse(stored) : [];
}

function saveComment(comment) {
    const comments = getStoredComments();
    comments.unshift(comment);
    localStorage.setItem('lspComments', JSON.stringify(comments));
}

function loadComments() {
    const commentList = document.getElementById('comment-list');
    if (!commentList) return;
    const comments = getStoredComments();
    if (!comments.length) {
        commentList.innerHTML = '<p class="no-comments">No comments yet. Share your experience!</p>';
        return;
    }
    commentList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <h4>${comment.name}</h4>
            <p>${comment.message}</p>
            <div class="company-reply">
                <strong>Company Answer:</strong>
                <p>${comment.reply}</p>
            </div>
        </div>
    `).join('');
}


function getNextProviderId() {
    return getAllProviders().reduce((maxId, provider) => Math.max(maxId, provider.id), 0) + 1;
}

function getStoredComments() {
    const stored = localStorage.getItem('lspComments');
    return stored ? JSON.parse(stored) : [];
}

function saveComment(comment) {
    const comments = getStoredComments();
    comments.unshift(comment);
    localStorage.setItem('lspComments', JSON.stringify(comments));
}

function loadComments() {
    const commentList = document.getElementById('comment-list');
    if (!commentList) return;
    const comments = getStoredComments();
    if (!comments.length) {
        commentList.innerHTML = '<p class="no-comments">No comments yet. Share your experience!</p>';
        return;
    }
    commentList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <h4>${comment.name}</h4>
            <p>${comment.message}</p>
            <div class="company-reply">
                <strong>Company Answer:</strong>
                <p>${comment.reply}</p>
            </div>
        </div>
    `).join('');
}



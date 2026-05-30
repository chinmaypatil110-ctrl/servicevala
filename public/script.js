// Basic JavaScript for Local Service Provider Platform

document.addEventListener('DOMContentLoaded', function() {
    // Search functionality
    const searchButton = document.querySelector('.search-bar button');
    const searchInput = document.querySelector('.search-bar input');

    if (searchButton && searchInput) {
        const performHomeSearch = function() {
            const query = searchInput.value.trim().toLowerCase();
            const resultsContainer = document.getElementById('home-search-results');
            if (!resultsContainer) return;

            if (!query) {
                resultsContainer.innerHTML = '<p class="search-message">Please enter a search term.</p>';
                return;
            }

            const matchedProviders = getAllProviders().filter(provider => {
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
            matchedProviders.forEach(provider => {
                const card = document.createElement('div');
                card.className = 'search-result-card';
                card.innerHTML = `
                    <h4>${provider.name}</h4>
                    <p><strong>Category:</strong> ${provider.category}</p>
                    <p><strong>Location:</strong> ${provider.location}</p>
                    <p><strong>Rating:</strong> ${provider.rating} ⭐</p>
                    <p><strong>Hourly Rate:</strong> ₹${provider.hourlyRate}</p>
                    <a href="/booking?provider=${provider.id}">Book Now</a>
                `;
                resultGrid.appendChild(card);
            });
        };

        searchButton.addEventListener('click', performHomeSearch);
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performHomeSearch();
            }
        });
    }

    // Smooth scrolling for navigation links (only for same page)
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

    // Service card hover effects
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

    // Auth tabs (removed since /login no longer has tabs)
    // const tabButtons = document.querySelectorAll('.tab-button');
    // tabButtons.forEach(button => {
    //     button.addEventListener('click', function() {
    //         const tabName = this.getAttribute('onclick').match(/'([^']+)'/)[1];
    //         showTab(tabName);
    //     });
    // });

    // Provider search
    const searchProvidersBtn = document.querySelector('button[onclick="searchProviders()"]');
    if (searchProvidersBtn) {
        searchProvidersBtn.addEventListener('click', searchProviders);
    }

    // Booking form service type change
    const serviceTypeSelect = document.getElementById('service-type');
    if (serviceTypeSelect) {
        serviceTypeSelect.addEventListener('change', populateProviders);
    }

    // Initialize providers list if on providers page
    if (document.getElementById('providers-list')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category) {
            document.getElementById('category-select').value = category;
        }
        loadProviders();
    }

    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        loadComments();
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('comment-name');
            const messageInput = document.getElementById('comment-message');
            const name = nameInput.value.trim() || 'Anonymous';
            const message = messageInput.value.trim();
            if (!message) return;
            saveComment({
                name,
                message,
                reply: 'Thank you for your feedback! Our team will review and respond shortly.'
            });
            loadComments();
            commentForm.reset();
        });
    }

    // Form submissions
    const authForms = document.querySelectorAll('.auth-form form');
    authForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Form submitted successfully!');
            // Here you would handle actual form submission
        });
    });

    const bookingForm = document.querySelector('.booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Booking request submitted!');
            // Here you would handle booking logic
        });
    }

    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newProvider = {
                id: getNextProviderId(),
                name: document.getElementById('full-name').value.trim(),
                category: document.getElementById('service-category').value,
                location: document.getElementById('location').value.trim(),
                rating: 4.5,
                hourlyRate: Number(document.getElementById('hourly-rate').value),
                experience: Number(document.getElementById('experience').value),
                description: document.getElementById('description').value.trim(),
                certifications: document.getElementById('certifications').value.trim()
            };
            saveProviderToStorage(newProvider);
            alert('Provider registered successfully! Your details have been added to the providers list.');
            profileForm.reset();
            window.location.href = '/providers';
        });
    }
});

// Mock data for providers
const mockProviders = [
    { id: 1, name: 'Rajesh Sharma', category: 'electricians', location: 'Mumbai', rating: 4.5, hourlyRate: 500 },
    { id: 2, name: 'Suresh Patil', category: 'electricians', location: 'Pune', rating: 4.7, hourlyRate: 550 },
    { id: 3, name: 'Anil Deshmukh', category: 'plumbers', location: 'Nagpur', rating: 4.8, hourlyRate: 400 },
    { id: 4, name: 'Sunil Joshi', category: 'plumbers', location: 'Thane', rating: 4.6, hourlyRate: 450 },
    { id: 5, name: 'Vijay Kulkarni', category: 'mechanics', location: 'Nashik', rating: 4.2, hourlyRate: 600 },
    { id: 6, name: 'Prakash More', category: 'mechanics', location: 'Sambhajinagar', rating: 4.4, hourlyRate: 650 },
    { id: 7, name: 'Ramesh Gaikwad', category: 'welders', location: 'Mumbai', rating: 4.3, hourlyRate: 700 },
    { id: 8, name: 'Ganesh Pawar', category: 'welders', location: 'Pune', rating: 4.5, hourlyRate: 750 },
    { id: 9, name: 'Mahesh Bhosale', category: 'fitters', location: 'Nagpur', rating: 4.6, hourlyRate: 500 },
    { id: 10, name: 'Dinesh Jadhav', category: 'fitters', location: 'Thane', rating: 4.4, hourlyRate: 550 },
    { id: 11, name: 'Kishore Salunkhe', category: 'solar', location: 'Nashik', rating: 4.7, hourlyRate: 800 },
    { id: 12, name: 'Ashok Mane', category: 'computer', location: 'Sambhajinagar', rating: 4.5, hourlyRate: 400 },
    { id: 13, name: 'Dilip Chavan', category: 'nursing', location: 'Mumbai', rating: 4.8, hourlyRate: 300 },
    { id: 14, name: 'Santosh Shinde', category: 'dj', location: 'Pune', rating: 4.6, hourlyRate: 1000 },
    { id: 15, name: 'Rajendra Kale', category: 'carpenters', location: 'Nagpur', rating: 4.4, hourlyRate: 600 },
    { id: 16, name: 'Vinayak Gokhale', category: 'carpenters', location: 'Thane', rating: 4.5, hourlyRate: 650 },
    { id: 17, name: 'Arunrao Sawant', category: 'painters', location: 'Nashik', rating: 4.3, hourlyRate: 500 },
    { id: 18, name: 'Balaji Rane', category: 'painters', location: 'Sambhajinagar', rating: 4.5, hourlyRate: 550 },
    { id: 19, name: 'Chandrakant Dixit', category: 'gardeners', location: 'Mumbai', rating: 4.6, hourlyRate: 400 },
    { id: 20, name: 'Deepakrao Mahajan', category: 'gardeners', location: 'Pune', rating: 4.7, hourlyRate: 450 },
    { id: 21, name: 'Eknathrao Bhandari', category: 'tutors', location: 'Nagpur', rating: 4.8, hourlyRate: 300 },
    { id: 22, name: 'Firoz Khan', category: 'tutors', location: 'Thane', rating: 4.9, hourlyRate: 350 },
    { id: 23, name: 'Gajananrao Deshpande', category: 'electricians', location: 'Nashik', rating: 4.4, hourlyRate: 520 },
    { id: 24, name: 'Avinash Mali', category: 'computer', location: 'Jalgaon', rating: 4.6, hourlyRate: 420 },
    { id: 25, name: 'Ankit Visave', category: 'fitters', location: 'Chopada', rating: 4.5, hourlyRate: 530 }
];

// Load providers
function loadProviders() {
    const providersList = document.getElementById('providers-list');
    if (!providersList) return;
    
    providersList.innerHTML = '';
    getAllProviders().forEach(provider => {
        const providerCard = document.createElement('div');
        providerCard.className = 'provider-card';
        providerCard.innerHTML = `
            <h3>${provider.name}</h3>
            <p>Category: ${provider.category}</p>
            <p>Location: ${provider.location}</p>
            <p>Rating: ${provider.rating} ⭐</p>
            <p>Hourly Rate: ₹${provider.hourlyRate}</p>
            <a href="/booking?provider=${provider.id}">Book Now</a>
        `;
        providersList.appendChild(providerCard);
    });
}

// Search providers
function searchProviders() {
    const category = document.getElementById('category-select').value;
    const location = document.getElementById('location-input').value.toLowerCase();
    
    const filteredProviders = getAllProviders().filter(provider => {
        const categoryMatch = !category || provider.category === category;
        const locationMatch = !location || provider.location.toLowerCase().includes(location);
        return categoryMatch && locationMatch;
    });
    
    const providersList = document.getElementById('providers-list');
    providersList.innerHTML = '';
    filteredProviders.forEach(provider => {
        const providerCard = document.createElement('div');
        providerCard.className = 'provider-card';
        providerCard.innerHTML = `
            <h3>${provider.name}</h3>
            <p>Category: ${provider.category}</p>
            <p>Location: ${provider.location}</p>
            <p>Rating: ${provider.rating} ⭐</p>
            <p>Hourly Rate: ₹${provider.hourlyRate}</p>
            <a href="/booking?provider=${provider.id}">Book Now</a>
        `;
        providersList.appendChild(providerCard);
    });
}

// Populate providers in booking form
function populateProviders() {
    const serviceType = document.getElementById('service-type').value;
    const providerSelect = document.getElementById('provider');
    
    providerSelect.innerHTML = '<option value="">Select Provider</option>';
    
    const filteredProviders = getAllProviders().filter(provider => provider.category === serviceType);
    filteredProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = `${provider.name} - ₹${provider.hourlyRate}/hr`;
        providerSelect.appendChild(option);
    });
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

function getAllProviders() {
    return [...mockProviders, ...getStoredProviders()];
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



const API_BASE = '/api';

// Fetch Active Categories
async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Error fetching categories:", e);
        return [];
    }
}

// Fetch Providers with Filtering Options
async function fetchProviders(category = '', location = '') {
    try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (location) params.append('location', location);
        
        const url = `${API_BASE}/providers${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Error fetching providers:", e);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.querySelector('.booking-form');
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please login as a customer first to book a service.');
                window.location.href = '/login';
                return;
            }

            // Read the DOM select dropdown values
            const serviceIdValue = document.getElementById('service-type').value;
            const providerIdValue = document.getElementById('provider').value;

            const payload = {
                service_id: parseInt(serviceIdValue, 10),
                // CRITICAL FIX: Convert provider_id string into an integer value or null if empty
                provider_id: providerIdValue ? parseInt(providerIdValue, 10) : null,
                scheduled_date: document.getElementById('date').value,
                scheduled_time: document.getElementById('time').value,
                service_address: document.getElementById('location').value,
                pincode: '425405', // Fallback default pincode string structure
                total_amount: 500.00
            };

            try {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    alert('🎉 Booking processed successfully!');
                    bookingForm.reset();
                } else {
                    alert('Booking Error: ' + (data.error || 'Failed to complete transaction.'));
                }
            } catch (err) {
                console.error(err);
                alert('Connection failure reaching booking server.');
            }
        });
    }
});
// // ==========================================
// // DYNAMIC BOOKING FORM POPULATION
// // ==========================================
// document.addEventListener('DOMContentLoaded', () => {
//     const serviceTypeSelect = document.getElementById('service-type');
//     const providerSelect = document.getElementById('provider');

//     if (serviceTypeSelect && providerSelect) {
//         serviceTypeSelect.addEventListener('change', async (e) => {
//             const selectedCategory = e.target.value;
            
//             // Clear current options
//             providerSelect.innerHTML = '<option value="">Select Provider</option>';
            
//             if (!selectedCategory) return;

//             try {
//                 // Fetch filtered provider arrays from backend server route
//                 const response = await fetch(`/api/providers?category=${encodeURIComponent(selectedCategory)}`);
//                 if (!response.ok) throw new Error('Network error fetching matching providers');
                
//                 const providers = await response.json();

//                 if (providers.length === 0) {
//                     providerSelect.innerHTML = '<option value="">No providers available for this category</option>';
//                     return;
//                 }

//                 // Append matching active records into selection element node
//                 providers.forEach(provider => {
//                     const option = document.createElement('option');
//                     option.value = provider.id;
//                     option.textContent = `${provider.name} (${provider.rating || '5.0'} ⭐) - ${provider.location}`;
//                     providerSelect.appendChild(option);
//                 });
//             } catch (error) {
//                 console.error('Error populating provider selections:', error);
//                 providerSelect.innerHTML = '<option value="">Error loading active operators</option>';
//             }
//         });
//     }
// });

function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
        <img class="service-image" src="${category.image_url || 'https://via.placeholder.com/400x220?text=' + encodeURIComponent(category.name)}" alt="${category.name}">
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
        <p><strong>Category:</strong> ${provider.category}</p>
        <p><strong>Location:</strong> ${provider.location}</p>
        <p><strong>Rating:</strong> ${provider.rating ? provider.rating + ' ⭐' : '5.0 ⭐'}</p>
        <p><strong>Phone:</strong> ${provider.phone_number || 'N/A'}</p>
        <a href="/booking?provider=${provider.id}&category=${encodeURIComponent(provider.category)}" class="book-now-btn">Book Now</a>
    `;
    return card;
}

document.addEventListener('DOMContentLoaded', function() {
    // Interactive Dashboard Homepage Search Handler
    const searchButton = document.querySelector('.search-bar button');
    const searchInput = document.querySelector('.search-bar input');

    if (searchButton && searchInput) {
        const performHomeSearch = async function() {
            const query = searchInput.value.trim().toLowerCase();
            const resultsContainer = document.getElementById('home-search-results');
            if (!resultsContainer) return;

            if (!query) {
                resultsContainer.innerHTML = '<p class="search-message" style="color:red;">Please enter a search context term.</p>';
                return;
            }

            resultsContainer.innerHTML = '<p class="search-message">Searching for matches...</p>';
            const providers = await fetchProviders();
            
            const matched = providers.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.category.toLowerCase().includes(query) || 
                p.location.toLowerCase().includes(query)
            );

            if (matched.length === 0) {
                resultsContainer.innerHTML = `<p class="search-message">No records match fields for "${query}".</p>`;
                return;
            }

            resultsContainer.innerHTML = `<h3>Search results for "${query}"</h3><div class="result-grid"></div>`;
            const grid = resultsContainer.querySelector('.result-grid');
            matched.forEach(p => grid.appendChild(createProviderCard(p)));
        };

        searchButton.addEventListener('click', performHomeSearch);
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performHomeSearch(); });
    }

    // Dynamic Initial Target Routing Runs
    if (document.getElementById('category-grid')) {
        loadCategoriesPage();
    }

    if (document.getElementById('providers-list')) {
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('category');
        const catSelect = document.getElementById('category-select');
        if (cat && catSelect) {
            catSelect.value = cat;
        }
        loadProvidersList();
    }

    // Provider Registration Interceptor Submission Block
    const providerForm = document.querySelector('.auth-form form');
    const isProviderRegPage = window.location.pathname.includes('/costomer-regi');
    if (providerForm && isProviderRegPage) {
        providerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = providerForm.querySelectorAll('input, textarea');
            const payload = {
                name: inputs[0].value.trim(),
                phone_number: inputs[1].value.trim(),
                email: inputs[2].value.trim(),
                location: 'Main Center', // Default fallback structural location mapping
                category: inputs[4].value.trim() || 'General'
            };

            const response = await fetch(`${API_BASE}/providers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Provider account setup correctly complete!');
                providerForm.reset();
                window.location.href = '/providers';
            } else {
                alert('Account provisioning encountered a fault.');
            }
        });
    }

    // Customer Authentication Form Handler
    const loginForm = document.querySelector('.auth-section .auth-form form');
    const isLoginPage = window.location.pathname.includes('/login');
    if (loginForm && isLoginPage) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = loginForm.querySelectorAll('input')[0].value.trim();
            const password = loginForm.querySelectorAll('input')[1].value.trim();

            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                alert('Authentication validated safely!');
                window.location.href = '/';
            } else {
                alert('Verification values mismatch standard accounts.');
            }
        });
    }
});

async function loadCategoriesPage() {
    const grid = document.getElementById('category-grid');
    const categories = await fetchCategories();
    grid.innerHTML = '';
    if (!categories.length) {
        grid.innerHTML = '<p>No active classification tables currently matching.</p>';
        return;
    }
    categories.forEach(c => grid.appendChild(createCategoryCard(c)));
}

async function loadProvidersList() {
    const list = document.getElementById('providers-list');
    const cat = document.getElementById('category-select')?.value || '';
    const loc = document.getElementById('location-input')?.value || '';
    const data = await fetchProviders(cat, loc);
    
    list.innerHTML = '';
    if (!data.length) {
        list.innerHTML = '<p>No provider operations active matching filters.</p>';
        return;
    }
    data.forEach(p => list.appendChild(createProviderCard(p)));
}
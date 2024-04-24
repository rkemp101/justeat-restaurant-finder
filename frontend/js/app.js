// app.js
import config from './config.js';

mapboxgl.accessToken = config.mapboxToken;
const mapStyle = config.mapStyle;

// Initialize map and add geocoder

const map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    center: [-0.10306130000000001, 51.516554352367486], // Just Eat London Office
    zoom: 7
});

const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: {
      color: '#f36d00',
    },
    countries: 'gb',
    types: 'postcode',
    placeholder: 'Enter Postcode'
});

document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

// Global variable to store the last postcode and its center coordinates
let lastPostcode = '';
let lastCenter = [];

geocoder.on('result', function(e) {
    lastPostcode = e.result.place_name.split(',')[0];
    lastCenter = e.result.center;

    const postcode = e.result.place_name.split(',')[0];

    // Before fetching new data, clear the existing markers and listings
    buildLocationList([]);
    addMarkers([]);
    closeAllPopups();
    fetchData(postcode);
    const center = e.result.center;
    map.flyTo({
      center: center,
      zoom: 15
    });
});

// Navigation control
map.addControl(new mapboxgl.NavigationControl());

// Data Management

let allRestaurants = [];

function fetchData(postcode, distance = null, cuisine = null, min_rating = null) {
  // Set endpoint url
  let url = `${config.apiUrl}${encodeURIComponent(postcode)}`;

  // Add query parameters if filters are provided
  const params = new URLSearchParams();
  if (distance) params.append('distance', distance);
  if (cuisine) params.append('cuisines', cuisine);
  if (min_rating) params.append('min_rating', min_rating);
  if (params.toString()) url += `?${params}`;

  fetch(url)
      .then(response => response.json())
      .then(data => {
          allRestaurants = data; // Store all restaurants
          const filteredRestaurants = sortAndFilterRestaurants();
          addMarkers(filteredRestaurants);
          buildLocationList(filteredRestaurants);
          document.getElementById('filter-btn').style.visibility = 'visible'; // Show the filter button
          populateCuisines(allRestaurants); // Populate cuisines dropdown
      })
      .catch(error => console.error('Error fetching data:', error));
}

// Function to sort restaurants based on rating and count
function sortAndFilterRestaurants() {
  // Sort allRestaurants based on starRating and count, descending
  let sortedRestaurants = [...allRestaurants].sort((a, b) => {
    return b.rating.starRating - a.rating.starRating || b.rating.count - a.rating.count;
  });

  // Return top 10 restaurants
  return sortedRestaurants.slice(0, 10);
}

// Function to populate cuisines dropdown
function populateCuisines(restaurantsData) {
  const cuisineSet = new Set();
  restaurantsData.forEach(restaurant => {
    restaurant.cuisines.forEach(cuisine => {
      cuisineSet.add(cuisine.name);
    });
  });

  // Sort cuisines alphabetically
  const sortedCuisines = Array.from(cuisineSet).sort();

  // Populate dropdown with 'All Cuisines' option first
  const cuisineDropdown = document.getElementById('cuisine');
  const allCuisinesOption = document.createElement('option');
  allCuisinesOption.value = 'all';
  allCuisinesOption.textContent = '--All Cuisines--';
  cuisineDropdown.appendChild(allCuisinesOption);

  // Add other cuisine options
  sortedCuisines.forEach(cuisine => {
    let option = document.createElement('option');
    option.value = cuisine;
    option.textContent = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
    cuisineDropdown.appendChild(option);
  });
}


// Event handler for the 'Apply Filters' button
document.getElementById('apply-filters').addEventListener('click', function() {
  const filteredRestaurants = sortAndFilterRestaurants(); // Apply current filters and sorting
  displayRestaurants(filteredRestaurants); // Update the display with the filtered and sorted restaurants
  closeFilterModal(); // Close the modal after applying filters
});


// Filter Management
function openFilterModal() {

  const modalContent = document.querySelector('.modal-content');
  // Adjust modal content styles if necessary
  modalContent.style.maxHeight = '80vh'; // Set maximum height to 80% of the viewport height
  modalContent.style.overflowY = 'auto'; // Enable scrolling within the modal

  const filterModal = document.getElementById('filter-modal');
  // Override styles to ensure the modal is centered and on top
  filterModal.style.display = 'block';
  filterModal.style.zIndex = '10'; // Ensure it's above other elements
  filterModal.style.position = 'fixed'; // Fix position
  filterModal.style.left = '50%'; // Center horizontally
  filterModal.style.top = '50%'; // Center vertically
  filterModal.style.transform = 'translate(-50%, -50%)'; // Adjust the exact center
  filterModal.style.backgroundColor = 'rgba(0,0,0,0.4)'; // Dim background

  // Prevent body from scrolling when modal is open
  document.body.style.overflow = 'hidden';
}

function closeFilterModal() {
  const filterModal = document.getElementById('filter-modal');
  filterModal.style.display = 'none';

  // Allow body to scroll again
  document.body.style.overflow = 'auto';
}

// Event handler for applying filters
function applyFilters() {
  const distance = document.getElementById('distance').value;
  const cuisine = document.getElementById('cuisine').value;
  const rating = document.getElementById('rating').value;

  // Prepare parameters, ignore the cuisine filter if 'All Cuisines' is selected
  const filters = {
    distance: distance,
    cuisine: cuisine !== 'all' ? cuisine : null, // Pass null if '--All Cuisines--' is selected
    min_rating: rating
  };

  // Close all active popups
  closeAllPopups();

  // Fetch data with the new filters
  fetchData(lastPostcode, filters.distance, filters.cuisine, filters.min_rating);

  // Pan to the center of the last known postcode
  map.flyTo({
    center: lastCenter,
    zoom: 12
  });

  closeFilterModal();
}

// Event Listeners

document.getElementById('filter-btn').addEventListener('click', openFilterModal);
document.querySelector('.close').addEventListener('click', closeFilterModal);
// Set up event listeners once the DOM content has loaded
document.addEventListener('DOMContentLoaded', () => {
  const filterBtn = document.getElementById('filter-btn');
  const closeModalBtn = document.querySelector('.close');
  const applyFiltersBtn = document.getElementById('apply-filters');
  applyFiltersBtn.addEventListener('click', applyFilters);

  filterBtn.addEventListener('click', openFilterModal);
  closeModalBtn.addEventListener('click', closeFilterModal);

  // Populate cuisines when the modal is first opened
  filterBtn.addEventListener('click', populateCuisines);
});

// Marker Management

let markers = [];

function addMarkers(data) {
  // Clear existing markers from the map and array
  markers.forEach(marker => marker.remove());

  data.forEach((restaurant, index) => {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url('${restaurant.logoUrl}')`;
    el.style.width = '100px';
    el.style.height = '100px';
    el.style.backgroundSize = 'cover';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.boxShadow = '0px 0px 10px 3px rgba(0,0,0,0.6)';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid #fff';

    const marker = new mapboxgl.Marker(el)
      .setLngLat([restaurant.address.location.longitude, restaurant.address.location.latitude])
      .addTo(map);

    // Store marker in the array
    markers.push(marker);

    el.addEventListener('click', function(e) {
      e.stopPropagation();
      flyToStore(restaurant);
      createPopUp(restaurant);

      // Additional functionality to scroll and highlight
      const listing = document.getElementById(`listing-${index}`);
      listing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightListing(index);
    });
  });
}

// Location List

function buildLocationList(data) {
  const listings = document.getElementById('listings');
  listings.innerHTML = ''; // Clear any existing listings

  data.forEach((restaurant, index) => {
    // Create the main link container
    const listing = document.createElement('a');
    listing.className = 'item';
    listing.href = '#';
    listing.id = `listing-${index}`;

    // Event listener for the entire listing
    listing.addEventListener('click', function(e) {
      e.preventDefault();  // Prevent the anchor link from following the URL
      flyToStore(restaurant);
      createPopUp(restaurant);

      // Scroll to and highlight the clicked item
      listing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightListing(index);
    });

    // Create the inner container
    const itemInner = document.createElement('div');
    itemInner.className = 'item-inner';

    // Logo container
    const logoContainer = document.createElement('div');
    logoContainer.className = 'logo-container';
    const image = document.createElement('img');
    image.src = restaurant.logoUrl ? restaurant.logoUrl : 'frontend/images/cutlery.png';
    image.alt = 'Logo';
    image.style = 'width:100px; height:auto; margin-bottom:5px;';
    logoContainer.appendChild(image);

    // Details container
    const details = document.createElement('div');
    details.className = 'info-container';

    // Restaurant name
    const name = document.createElement('div');
    name.className = 'restaurant-name';
    name.textContent = restaurant.name;

    // Ratings
    const rating = document.createElement('p');
    rating.className = 'rating';

    // Create a span element for the star symbol
    const star = document.createElement('span');
    star.innerHTML = '&#9733;'; // Set the HTML content of the span to the star symbol
    // Append the star span and the text content to the rating element
    rating.appendChild(star);
    rating.innerHTML += ` ${restaurant.rating.starRating} (${restaurant.rating.count})`;

    // Cuisines
    const cuisines = document.createElement('p');
    cuisines.className = 'cuisines';
    cuisines.textContent = `${restaurant.cuisines.map(c => c.name).join(', ')}`;

    // Address
    const address = document.createElement('div');
    address.className = 'restaurant-address';
    address.innerHTML = `<span style="font-weight: bold;">${restaurant.address.firstLine}<br>${restaurant.address.postalCode}</span>`;

    // Append name and cuisines to details container
    details.appendChild(name);
    details.appendChild(rating);
    details.appendChild(address);
    details.appendChild(cuisines);

    // Append logo container and details container to item inner
    itemInner.appendChild(logoContainer);
    itemInner.appendChild(details);

    // Append item inner to the main link container
    listing.appendChild(itemInner);

    // Append the main link container to the listings container
    listings.appendChild(listing);
  });
}

function highlightListing(index) {
  const listings = document.querySelectorAll('.item');
  listings.forEach((listing, i) => {
    if (i === index) {
      listing.classList.add('highlight');
    } else {
      listing.classList.remove('highlight');
    }
  });
}

// Fly to store
function flyToStore(restaurant) {
  map.flyTo({
    center: [restaurant.address.location.longitude, restaurant.address.location.latitude],
    zoom: 17
  });
}

// Popups

// Function to create and display a popup for a restaurant
function createPopUp(restaurant) {
  // Close any existing popup first
  const popUps = document.getElementsByClassName('mapboxgl-popup');
  if (popUps[0]) popUps[0].remove();

  // Create a new popup and set its content with detailed HTML structure and styling
  new mapboxgl.Popup({ offset: 25 })
      .setLngLat([restaurant.address.location.longitude, restaurant.address.location.latitude])
      .setHTML(
          `<h3>${restaurant.name}</h3>
          <div>
              <h4>
                  <span style="font-weight: bold;">
                      ${restaurant.address.firstLine}<br>
                      ${restaurant.address.postalCode}<br><br>
                  </span>
                  <span style="font-weight: bold; color: #f36d00;">
                      &#9733; ${restaurant.rating.starRating} (${restaurant.rating.count})
                  </span><br><br>
                  ${restaurant.cuisines.map(c => c.name).join(', ')}
              </h4>
          </div>`
      )
      .addTo(map);
}

function closeAllPopups() {
  // Find all popups on the map and close them
  const popups = document.getElementsByClassName('mapboxgl-popup');
  // Loop through the NodeList and remove each popup
  while (popups.length) {
    popups[0].remove();
  }
}

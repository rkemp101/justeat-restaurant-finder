from fastapi import HTTPException
import requests
from geopy.distance import geodesic
from pydantic import ValidationError
from ratelimit import limits, sleep_and_retry
from cachetools import TTLCache
from geopy.geocoders import Nominatim
from typing import List, Dict, Optional
from backend.api.models import Restaurant

# Cache configuration
cache = TTLCache(maxsize=100, ttl=3600)

@sleep_and_retry
@limits(calls=1, period=1)
def get_location(postcode: str) -> Optional[tuple]:
    """Retrieve the latitude and longitude for a given postcode using geocoding, with caching."""
    if postcode in cache:
        return cache[postcode]

    geolocator = Nominatim(user_agent="MyUniqueAppName")
    location = geolocator.geocode(postcode, country_codes='GB')
    if location:
        coordinates = (location.latitude, location.longitude)
        cache[postcode] = coordinates
        return coordinates
    return None

def fetch_restaurant_data(postcode: str, headers: dict) -> dict:
    """Fetch restaurant data for a given postcode from the JustEat API."""
    url = f"https://uk.api.just-eat.io/discovery/uk/restaurants/enriched/bypostcode/{postcode.replace(' ', '')}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch data from API")
    return response.json()

def filter_restaurants(data: dict, origin: tuple, cuisines: Optional[str], distance: float, min_rating: float) -> List[Dict]:
    """Filter restaurants based on location, distance, cuisine preferences, and minimum rating."""
    restaurants_data = data.get('restaurants', [])
    results = []
    for restaurant_data in restaurants_data:
        if restaurant_data.get('isTestRestaurant', False):
            continue
        restaurant = Restaurant.parse_obj(restaurant_data)
        if is_restaurant_within_filters(restaurant, origin, cuisines, distance, min_rating):
            results.append(restaurant.dict())
    return results

def is_restaurant_within_filters(restaurant: Restaurant, origin: tuple, cuisines: Optional[str], distance: float, min_rating: float) -> bool:
    """Check if a restaurant meets the filtering criteria."""
    restaurant_loc = (restaurant.address.location.latitude, restaurant.address.location.longitude)
    distance_calculated = geodesic(origin, restaurant_loc).miles
    cuisine_list = [c.strip().lower() for c in cuisines.split('|')] if cuisines else None
    return (distance_calculated <= distance and
            (not cuisine_list or any(c in [cuisine.name.lower() for cuisine in restaurant.cuisines] for c in cuisine_list)) and
            (min_rating is None or restaurant.rating.starRating >= min_rating))

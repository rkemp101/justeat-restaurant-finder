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
    """
    Retrieve the latitude and longitude for a given postcode using geocoding, with caching.

    Args:
        postcode (str): The postcode for which to retrieve the location.

    Returns:
        Optional[tuple]: A tuple containing latitude and longitude if found, else None.
    """
    try:
        if postcode in cache:
            return cache[postcode]

        geolocator = Nominatim(user_agent="MyUniqueAppName")
        location = geolocator.geocode(postcode, country_codes='GB')
        if location:
            coordinates = (location.latitude, location.longitude)
            cache[postcode] = coordinates
            return coordinates
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving location: {str(e)}")

def fetch_restaurant_data(postcode: str, headers: dict) -> dict:
    """
    Fetch restaurant data for a given postcode from the JustEat API.

    Args:
        postcode (str): The postcode for which to fetch restaurant data.
        headers (dict): Headers to be included in the HTTP request.

    Returns:
        dict: The fetched restaurant data.
    """
    try:
        url = f"https://uk.api.just-eat.io/discovery/uk/restaurants/enriched/bypostcode/{postcode.replace(' ', '')}"
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise HTTPError for non-2xx status codes
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data from API: {str(e)}")

def filter_restaurants(data: dict, origin: tuple, cuisines: Optional[str], distance: float, min_rating: float) -> List[Dict]:
    """
    Filter restaurants based on location, distance, cuisine preferences, and minimum rating.

    Args:
        data (dict): The fetched restaurant data.
        origin (tuple): The origin location as a tuple (latitude, longitude).
        cuisines (Optional[str]): Pipe-separated string of cuisine names.
        distance (float): Maximum distance in miles from the origin.
        min_rating (float): Minimum star rating of restaurants.

    Returns:
        List[Dict]: List of filtered restaurant data.
    """
    restaurants_data = data.get('restaurants', [])
    results = []
    for restaurant_data in restaurants_data:
        try:
            if restaurant_data.get('isTestRestaurant', False):
                continue
            restaurant = Restaurant.parse_obj(restaurant_data)
            if is_restaurant_within_filters(restaurant, origin, cuisines, distance, min_rating):
                results.append(restaurant.dict())
        except ValidationError as e:
            # Log or handle validation errors if needed
            continue
    return results

def is_restaurant_within_filters(restaurant: Restaurant, origin: tuple, cuisines: Optional[str], distance: float, min_rating: float) -> bool:
    """
    Check if a restaurant meets the filtering criteria.

    Args:
        restaurant (Restaurant): The restaurant object to check.
        origin (tuple): The origin location as a tuple (latitude, longitude).
        cuisines (Optional[str]): Pipe-separated string of cuisine names.
        distance (float): Maximum distance in miles from the origin.
        min_rating (float): Minimum star rating of restaurants.

    Returns:
        bool: True if the restaurant meets the criteria, False otherwise.
    """
    try:
        restaurant_loc = (restaurant.address.location.latitude, restaurant.address.location.longitude)
        distance_calculated = geodesic(origin, restaurant_loc).miles
        cuisine_list = [c.strip().lower() for c in cuisines.split('|')] if cuisines else None
        return (distance_calculated <= distance and
                (not cuisine_list or any(c in [cuisine.name.lower() for cuisine in restaurant.cuisines] for c in cuisine_list)) and
                (min_rating is None or restaurant.rating.starRating >= min_rating))
    except Exception as e:
        # Log or handle errors if needed
        return False

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from backend.api.utils import get_location, fetch_restaurant_data, filter_restaurants

app = FastAPI()

# Apply CORS middleware for cross-origin requests if your API is accessed from different domains.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This is a very open CORS policy, adjust according to your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/restaurants/{postcode}")
async def get_restaurants(postcode: str, distance: Optional[int] = 3, cuisines: Optional[str] = Query(None), min_rating: Optional[int] = 3):
    """
    Endpoint to fetch restaurants based on postcode, optional distance, cuisine types, and minimum rating.
    """
    # Obtain the geographic location from the postcode
    origin = get_location(postcode)
    if not origin:
        raise HTTPException(status_code=404, detail="Invalid postcode or location not found")

    # Prepare headers for the API request
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; YourApp/1.0)',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
    }

    # Fetch restaurant data from external API
    data = fetch_restaurant_data(postcode, headers)

    # Filter restaurants based on the criteria
    filtered_restaurants = filter_restaurants(data, origin, cuisines, distance, min_rating)

    return filtered_restaurants

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

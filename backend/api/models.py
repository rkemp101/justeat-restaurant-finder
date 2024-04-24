# models.py
from pydantic import BaseModel, validator
from typing import List, Optional

class Location(BaseModel):
    type: str
    longitude: float
    latitude: float

    @classmethod
    def parse_coordinates(cls, v):
        if isinstance(v, dict) and "coordinates" in v:
            longitude, latitude = v["coordinates"]
            return cls(type=v["type"], longitude=longitude, latitude=latitude)
        raise ValueError("Invalid data for coordinates")

class Address(BaseModel):
    city: str
    firstLine: str
    postalCode: str
    location: Location

    @validator('location', pre=True)
    def prepare_location(cls, v):
        return Location.parse_coordinates(v)

class Rating(BaseModel):
    count: int
    starRating: float
    userRating: Optional[float]

class Cuisine(BaseModel):
    name: str
    uniqueName: str

class Restaurant(BaseModel):
    id: int
    name: str
    address: Address
    rating: Rating
    cuisines: List[Cuisine]
    logoUrl: str
    isTestRestaurant: bool

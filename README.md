# JustEat-Restaurant-Finder Application

## Description
JustEat-Restaurant-Finder is a web application designed to help users find restaurants near them. It utilizes Mapbox for interactive mapping and geolocation features, and a backend service for restaurant data retrieval.

## Features
- Interactive map to display restaurant locations.
- Search bar to find restaurants by postcode.
- Filter options for search radius, cuisine type, and minimum star rating.

## Project Structure
- `backend/`: Contains all the server-side code including the API and utilities.
  - `api/`: The RESTful API endpoints.
  - `models/`: Data models for the application.
- `frontend/`: All the client-side code.
  - `css/`: Stylesheets for the application.
  - `images/`: Images used within the application.
  - `js/`: JavaScript files.
  - `index.html`: Entry point for the web application.

## Installation
To get the project up and running on your local machine, follow these steps:

1. Clone the repository to your local machine.
   ```sh
   git clone <URL_to_this_repo>

2. Navigate to the cloned repository directory.
    ```sh
    cd JustEat-Restaurant-Finder

3. Use the Makefile to install dependencies.
    ```sh
    make install

4. Once the dependencies are installed, you can start the application.
    ```sh
    make start

## Usage
After starting the application using the make start command, the application will open in your default web browser. If it does not open automatically, you can access the frontend by visiting http://localhost:8080 and the backend API at http://localhost:8000.

## Stopping the Application
To stop the application servers, use the command:
    ```sh
    make stop

## Cleaning Up
To clean up compiled Python files and cache, you can run:
    ```sh
    make clean

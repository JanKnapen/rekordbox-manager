# Spotify Django React Application

This project is a web application that integrates Django as the backend and React as the frontend. It allows users to log in and view song titles from a specified Spotify playlist.

## Project Structure

```
spotify-django-react
├── .env
├── .gitignore
├── README.md
├── backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── spotify_project
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── serializers.py
│   └── spotify_app
│       ├── migrations
│       │   └── __init__.py
│       ├── __init__.py
│       ├── views.py
│       ├── urls.py
│       ├── services.py
│       └── serializers.py
└── frontend
    ├── package.json
    ├── .env
    ├── public
    │   └── index.html
    └── src
        ├── index.js
        ├── App.js
        ├── api
        │   └── api.js
        ├── components
        │   ├── Login.js
        │   └── Home.js
        └── styles
            └── app.css
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd spotify-django-react
   ```

2. **Backend Setup:**
   - Navigate to the `backend` directory.
   - Create a virtual environment and activate it:
     ```
     python -m venv venv
     source venv/bin/activate  # On Windows use `venv\Scripts\activate`
     ```
   - Install the required packages:
     ```
     pip install -r requirements.txt
     ```
   - Set up your `.env` file with your Spotify API credentials:
     ```
     SPOTIFY_CLIENT_ID=<your_client_id>
     SPOTIFY_CLIENT_SECRET=<your_client_secret>
     SPOTIFY_USERNAME=<your_username>
     SPOTIFY_PLAYLIST_ID=<your_playlist_id>
     ```
   - Run the Django server:
     ```
     python manage.py runserver
     ```

3. **Frontend Setup:**
   - Navigate to the `frontend` directory.
   - Install the necessary packages:
     ```
     npm install
     ```
   - Start the React application:
     ```
     npm start
     ```

## Features

- User authentication through a simple login page.
- Display of song titles from a specified Spotify playlist on the home page.

## Technologies Used

- Django (Backend)
- React (Frontend)
- Spotify API for song retrieval

## License

This project is licensed under the MIT License.
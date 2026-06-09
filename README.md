# URLify – Smart URL Shortener & Analytics Platform

A production-style URL shortener and analytics platform inspired by Bitly, built with performance, scalability, and real-time analytics in mind.

## Features

### URL Management

* Shorten long URLs with custom aliases
* QR code generation and download for shortened links
* URL expiration support
* Active/inactive link management
* Click tracking and analytics


### Authentication & Security

* JWT cookie-based authentication
* Password hashing using bcrypt
* Protected routes and middleware
* Rate limiting for abuse prevention

### Analytics Dashboard

* Total clicks and unique visitors
* Browser, OS, and device analytics
* Traffic source breakdown
* Region-based analytics
* Redirect latency tracking
* Time-series click visualization

### Performance Optimizations

* Redis caching for fast redirects
* Asynchronous analytics processing
* Optimized PostgreSQL queries
* Reduced redirect latency using caching

### Real-Time Features

* Live click notifications using WebSockets
* Recent activity tracking

## Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL (Neon)
* Redis (Upstash)
* WebSockets

### Frontend

* HTML
* CSS
* JavaScript
* Chart.js
* jsVectorMap

### Authentication & Security

* JWT
* bcrypt
* cookie-parser
* CORS

## Architecture

URLify follows a scalable backend architecture:

```text
User Request
     ↓
Redis Cache Check
     ↓
Cache Hit → Redirect
     ↓
Cache Miss
     ↓
PostgreSQL Lookup
     ↓
Async Analytics Logging
     ↓
302 Redirect
```

## Database Schema

URLify uses PostgreSQL to manage users, shortened URLs, analytics, and user preferences.

### Users

Stores user authentication and profile details.

| Field      | Type         | Description           |
| ---------- | ------------ | --------------------- |
| id         | SERIAL       | Primary key           |
| username   | VARCHAR(100) | Unique username       |
| fullname   | VARCHAR(150) | Full name             |
| password   | TEXT         | Hashed password       |
| created_at | TIMESTAMP    | Account creation time |

### URLs

Stores shortened URLs and metadata.

| Field        | Type        | Description              |
| ------------ | ----------- | ------------------------ |
| id           | SERIAL      | Primary key              |
| user_id      | INT         | Linked user              |
| original_url | TEXT        | Original destination URL |
| short_code   | VARCHAR(50) | Unique shortened code    |
| total_clicks | INT         | Number of redirects      |
| is_active    | BOOLEAN     | Active/inactive status   |
| expires_at   | TIMESTAMPTZ | Link expiration          |
| created_at   | TIMESTAMPTZ | Creation timestamp       |
| updated_at   | TIMESTAMPTZ | Last updated             |

### Click Analytics

Tracks redirect analytics and visitor behavior.

| Field            | Type          | Description      |
| ---------------- | ------------- | ---------------- |
| id               | SERIAL        | Primary key      |
| url_id           | INT           | Linked URL       |
| clicked_at       | TIMESTAMP     | Click timestamp  |
| ip_address       | TEXT          | Visitor IP       |
| user_agent       | TEXT          | Raw user agent   |
| device_type      | VARCHAR(50)   | Device type      |
| browser          | VARCHAR(50)   | Browser name     |
| operating_system | VARCHAR(50)   | Operating system |
| country          | VARCHAR(100)  | Visitor region   |
| referer          | TEXT          | Traffic referer  |
| traffic_source   | VARCHAR(50)   | Traffic category |
| redirect_time_ms | NUMERIC(10,2) | Redirect latency |

### User Settings

Stores user preferences and analytics settings.

| Field                  | Type        | Description              |
| ---------------------- | ----------- | ------------------------ |
| user_id                | INT         | Linked user              |
| default_expiry         | VARCHAR(30) | Default link expiry      |
| live_notifications     | BOOLEAN     | Live click notifications |
| analytics_auto_refresh | BOOLEAN     | Dashboard auto refresh   |
| created_at             | TIMESTAMPTZ | Created time             |
| updated_at             | TIMESTAMPTZ | Updated time             |


## Performance

### Redirect Optimization

* Reduced redirect latency through Redis caching
* Server-side lifecycle timing measurements
* Async analytics logging to avoid blocking redirects

## Screenshots

(Add dashboard screenshots here)

## API Endpoints

### Authentication

```http
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
```

### URL Management

```http
GET    /api/links
POST   /api/links
PATCH  /api/links/:id
DELETE /api/links/:id
GET    /:shortCode
```

### Analytics

```http
GET /api/analytics
GET /api/analytics/link/:linkId
```

### QR Code

```http
GET /api/qr
```

### Settings

```http
GET    /api/settings
PATCH  /api/settings/account
PATCH  /api/settings/password
PATCH  /api/settings/preferences
DELETE /api/settings/account
GET    /api/settings/export/links
GET    /api/settings/export/analytics
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL=
JWT_SECRET=
REDIS_URL=
```

## Installation

```bash
git clone <repo-url>
cd urlify
npm install
npm start
```

## Future Improvements

* Team workspaces
* Advanced analytics filters
* Geo heatmaps
* Developer API Section
* 
## License

MIT

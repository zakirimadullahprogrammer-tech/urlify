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

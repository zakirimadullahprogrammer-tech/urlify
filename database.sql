CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullname VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_code VARCHAR(50) UNIQUE NOT NULL,
    total_clicks INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
expires_at TIMESTAMPTZ NULL
);

CREATE TABLE click_analytics (
    id SERIAL PRIMARY KEY,

    url_id INT NOT NULL
    REFERENCES urls(id)
    ON DELETE CASCADE,

    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    ip_address TEXT,
    user_agent TEXT,

    device_type VARCHAR(50),          -- Mobile, Desktop, Tablet
    browser VARCHAR(50),              -- Chrome, Firefox, Safari
    operating_system VARCHAR(50),     -- Android, Windows, iOS

    country VARCHAR(100),             -- India, USA, UK

    referer TEXT,
    traffic_source VARCHAR(50),       -- Search, Direct, Social, Referral

    redirect_time_ms NUMERIC(10,2)    -- redirect time
);

CREATE TABLE user_settings (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_expiry VARCHAR(30) DEFAULT 'never',
  live_notifications BOOLEAN DEFAULT TRUE,
  analytics_auto_refresh BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT,
  method TEXT,
  status_code INT,
  response_time_ms NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
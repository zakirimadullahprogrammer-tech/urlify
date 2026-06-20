const fs = require("fs");
const path = require("path");
const pg = require("pg");

require("dotenv").config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  },

  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  family: 4
});

pool.on("connect", () => {
  console.log("PostgreSQL pool connected");
});

pool.on("error", err => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    err.message
  );
});

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("=> Server connected to PostgreSQL DATABASE");
    console.log("DB Time:", result.rows[0].now);
  } catch (err) {
    console.error("DB Connection Error:", err.message);
    throw err;
  }
}

async function initDatabase() {
  const sqlPath = path.join(__dirname, "../database.sql");

  try {
    if (!fs.existsSync(sqlPath)) {
      console.warn(
        "database.sql not found, skipping DB initialization:",
        sqlPath
      );
      return;
    }

    const sql = fs.readFileSync(sqlPath, "utf8");

    if (!sql.trim()) {
      console.warn("database.sql is empty, skipping DB initialization");
      return;
    }

    await pool.query(sql);

    console.log("=> Database tables initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err.message);
    throw err;
  }
}

async function connectDatabase() {
  try {
    await testConnection();
    await initDatabase();
  } catch (err) {
    console.error("Failed to initialize database:", err.message);
    process.exit(1);
  }
}

connectDatabase();

module.exports = {
  pool
};
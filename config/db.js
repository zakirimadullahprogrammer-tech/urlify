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

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("=> Server connected to PostgreSQL DATABASE");
    console.log("DB Time:", result.rows[0].now);
  } catch (err) {
    console.error("DB Connection Error:", err.message);
  }
}

testConnection();

module.exports = { pool };
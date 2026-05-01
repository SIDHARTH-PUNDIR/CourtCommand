import pg from 'pg';
const { Pool } = pg;

// Set up the connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'court_command',
  password: process.env.DB_PASSWORD || '945801',
  port: process.env.DB_PORT || 5432, // 5432 is the default Postgres port
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL!');
    release(); // Release the client back to the pool
  }
});

export default pool;
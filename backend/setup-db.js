/**
 * ============================================================
 * AUTOMATIC DATABASE SETUP SCRIPT FOR POSTGRESQL
 * setup-db.js (Run from the backend folder)
 * ============================================================
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the local .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('[-] Error: .env file not found. Please create it in the backend folder first.');
  process.exit(1);
}

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;
const dbName = process.env.DB_NAME || 'ca_management';

async function setup() {
  console.log('============================================================');
  console.log('  STARTING POSTGRESQL DATABASE INITIALIZATION');
  console.log('============================================================');

  // 1. Connect to default 'postgres' database to check/create the target database
  console.log(`[*] Connecting to default database 'postgres' as '${dbUser}'...`);
  const clientInit = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: 'postgres'
  });

  try {
    await clientInit.connect();
    
    // Check if database exists
    const res = await clientInit.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    
    if (res.rows.length === 0) {
      console.log(`[+] Database '${dbName}' does not exist. Creating it now...`);
      await clientInit.query(`CREATE DATABASE ${dbName}`);
      console.log(`[+] Database '${dbName}' created successfully.`);
    } else {
      console.log(`[*] Database '${dbName}' already exists. Re-using existing database.`);
    }
  } catch (err) {
    console.error('[-] Database creation phase failed:', err.message);
    console.error('[-] Make sure PostgreSQL server is running and credentials are correct.');
    process.exit(1);
  } finally {
    await clientInit.end();
  }

  // 2. Connect to the newly created/existing target database
  console.log(`\n[*] Connecting to target database '${dbName}'...`);
  const clientTarget = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: dbName
  });

  try {
    await clientTarget.connect();

    // 3. Read and run schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    console.log('[*] Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('[*] Executing tables schema...');
    await clientTarget.query(schemaSql);
    console.log('[+] Tables schema executed successfully.');

    // 4. Read and run seed.sql
    const seedPath = path.join(__dirname, '../database/seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at ${seedPath}`);
    }
    console.log('[*] Reading seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('[*] Seeding database table records...');
    await clientTarget.query(seedSql);
    console.log('[+] Database seed records inserted successfully.');

    console.log('\n============================================================');
    console.log('  DATABASE INITIALIZATION COMPLETED SUCCESSFULY!');
    console.log('============================================================');
    console.log(`  Database Name: ${dbName}`);
    console.log(`  Port:          ${dbPort}`);
    console.log(`  All tables created and seeded.`);
    console.log('============================================================');

  } catch (err) {
    console.error('[-] Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await clientTarget.end();
  }
}

setup();

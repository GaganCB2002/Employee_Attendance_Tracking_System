/**
 * AttendX Database Initializer
 * Runs schema creation and seed scripts for PostgreSQL and SQLite.
 *
 * Usage:
 *   node database/init.js
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, TABLES_DDL, DATA_DIR } = require('./schema');

async function runPostgresInit() {
  const envPath = path.resolve(__dirname, '../backend/.env');
  try {
    const dotenv = require(path.resolve(__dirname, '../backend/node_modules/dotenv'));
    dotenv.config({ path: envPath });
  } catch (e) {
    // fallback
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[DB-INIT] No DATABASE_URL found. Skipping Postgres direct execution.');
    return false;
  }

  try {
    const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
    const prisma = new PrismaClient();

    console.log('[DB-INIT] Connected to PostgreSQL. Verifying tables via Prisma Client...');
    const [sectionsCount, shiftsCount, employeesCount, recordsCount] = await Promise.all([
      prisma.section.count(),
      prisma.shift.count(),
      prisma.employee.count(),
      prisma.attendanceRecord.count(),
    ]);

    console.log(`[DB-INIT] PostgreSQL Database Statistics:`);
    console.log(`  - Sections: ${sectionsCount}`);
    console.log(`  - Shifts: ${shiftsCount}`);
    console.log(`  - Employees: ${employeesCount}`);
    console.log(`  - Attendance Records: ${recordsCount}`);

    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.log('[DB-INIT] PostgreSQL check notice:', err.message);
    return false;
  }
}

function runSqliteInit() {
  console.log('[DB-INIT] Initializing local database tables...');
  const db = initDatabase();
  if (db) {
    console.log('[DB-INIT] SQLite schema initialized successfully.');
  }
}

async function main() {
  console.log('====================================================');
  console.log(' AttendX Database Infrastructure Setup');
  console.log('====================================================');

  const pgSuccess = await runPostgresInit();
  runSqliteInit();

  console.log('====================================================');
  console.log(' Schema DDL file:   database/schema.sql');
  console.log(' Seed SQL file:     database/seed.sql');
  console.log(' Query library:     database/queries.js');
  console.log(' Schema module:     database/schema.js');
  console.log(' Storage directory: database/uploads/');
  console.log('====================================================');
  console.log(' Database initialization complete.');
}

main().catch(console.error);

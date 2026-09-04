# TransitOps - Database Migration & SQL Upgrade Guide

This guide details how to transition the **TransitOps** smart logistics data layer from our lightweight JSON file-system storage engine into a production-ready relational database (such as SQLite or PostgreSQL) using our adaptable **Repository Pattern**.

---

## 1. Clean Architecture: Repository Swapping

Currently, TransitOps uses a decoupled repository pattern to access data. This guarantees that **no frontend views, Express routes, or business logic** contain direct knowledge of *where* or *how* data is stored.

### Current Flow (JSON):
```
[Frontend Views] ➔ [Express API Routes] ➔ [VehicleRepository] ➔ [JSONDataSource] ➔ [vehicles.json]
```

### Upgraded Flow (SQLite / PostgreSQL):
```
[Frontend Views] ➔ [Express API Routes] ➔ [VehicleRepository] ➔ [Drizzle ORM / pg client] ➔ [PostgreSQL DB]
```

Because of this encapsulation, to migrate, you **only** need to replace the data source call inside `backend/repositories.ts` without editing a single line of API routing or React view code!

---

## 2. SQL Schema DDL (Relational Tables)

Below are the exact SQL commands required to create normalized, indexed relational database tables mirroring our current JSON entities.

### 2.1 Users Table
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst')) NOT NULL
);

-- Indexing for fast credential lookups during authentication
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### 2.2 Vehicles Table
```sql
CREATE TABLE vehicles (
    id VARCHAR(50) PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    max_load_capacity INTEGER NOT NULL CHECK (max_load_capacity > 0),
    odometer INTEGER NOT NULL CHECK (odometer >= 0),
    acquisition_cost NUMERIC(12, 2) NOT NULL CHECK (acquisition_cost > 0),
    status VARCHAR(50) CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')) NOT NULL DEFAULT 'Available',
    region VARCHAR(50) NOT NULL
);

CREATE UNIQUE INDEX idx_vehicles_reg ON vehicles(registration_number);
```

### 2.3 Drivers Table
```sql
CREATE TABLE drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_category VARCHAR(50) NOT NULL,
    license_expiry_date DATE NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    safety_score INTEGER NOT NULL CHECK (safety_score BETWEEN 0 AND 100),
    status VARCHAR(50) CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')) NOT NULL DEFAULT 'Available'
);

CREATE UNIQUE INDEX idx_drivers_license ON drivers(license_number);
```

### 2.4 Trips Table
```sql
CREATE TABLE trips (
    id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE RESTRICT,
    cargo_weight INTEGER NOT NULL,
    planned_distance INTEGER NOT NULL,
    status VARCHAR(50) CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')) NOT NULL DEFAULT 'Draft',
    odometer_start INTEGER NOT NULL,
    odometer_end INTEGER,
    fuel_consumed NUMERIC(8, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_cargo CHECK (cargo_weight > 0),
    CONSTRAINT check_distance CHECK (planned_distance > 0)
);
```

### 2.5 Maintenance Logs Table
```sql
CREATE TABLE maintenance_logs (
    id VARCHAR(50) PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) CHECK (status IN ('Active', 'Closed')) NOT NULL DEFAULT 'Active'
);
```

### 2.6 Fuel Logs Table
```sql
CREATE TABLE fuel_logs (
    id VARCHAR(50) PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE CASCADE,
    liters NUMERIC(8, 2) NOT NULL CHECK (liters > 0),
    cost NUMERIC(10, 2) NOT NULL CHECK (cost > 0),
    date DATE NOT NULL,
    odometer INTEGER NOT NULL
);
```

### 2.7 Expenses Table
```sql
CREATE TABLE expenses (
    id VARCHAR(50) PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE SET NULL,
    trip_id VARCHAR(50) REFERENCES trips(id) ON DELETE SET NULL,
    category VARCHAR(50) CHECK (category IN ('Fuel', 'Maintenance', 'Toll', 'Insurance', 'Permit', 'Other')) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL CHECK (cost > 0),
    date DATE NOT NULL,
    description TEXT NOT NULL
);
```

### 2.8 Notifications Table
```sql
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);
```

### 2.9 Activity Logs Table
```sql
CREATE TABLE activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    action TEXT NOT NULL,
    username VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Upgrading `repositories.ts` to SQLite (Example)

When moving to SQLite, you only need to update the file `backend/repositories.ts` to query using a library like `sqlite3` or an ORM like Drizzle. Below is an example of how the updated `VehicleRepository` will look.

```typescript
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Vehicle } from './types';

let db: Database | null = null;

async function getDB() {
  if (!db) {
    db = await open({
      filename: './backend/data/transitops.db',
      driver: sqlite3.Database
    });
  }
  return db;
}

export class VehicleRepository {
  public async getAll(): Promise<Vehicle[]> {
    const database = await getDB();
    return database.all<Vehicle[]>('SELECT * FROM vehicles');
  }

  public async getById(id: string): Promise<Vehicle | undefined> {
    const database = await getDB();
    return database.get<Vehicle>('SELECT * FROM vehicles WHERE id = ?', [id]);
  }

  public async create(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const database = await getDB();
    const id = `v_${Date.now()}`;
    
    await database.run(`
      INSERT INTO vehicles (id, registration_number, name, type, max_load_capacity, odometer, acquisition_cost, status, region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      vehicle.registrationNumber,
      vehicle.name,
      vehicle.type,
      vehicle.maxLoadCapacity,
      vehicle.odometer,
      vehicle.acquisitionCost,
      vehicle.status,
      vehicle.region
    ]);

    return { ...vehicle, id };
  }
  
  // All other methods transition similarly...
}
```

This ensures the TransitOps platform remains robust, modular, and ready for production-level scale in the future!

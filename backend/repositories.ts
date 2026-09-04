import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Vehicle,
  Driver,
  Trip,
  Maintenance,
  FuelLog,
  Expense,
  Notification,
  ActivityLog
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'backend', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JSONDataSource<T extends { id: string }> {
  private filePath: string;

  constructor(fileName: string) {
    this.filePath = path.join(DATA_DIR, fileName);
    // Initialize file if it doesn't exist
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public read(): T[] {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content) as T[];
    } catch (e) {
      console.error(`Error reading database file: ${this.filePath}`, e);
      return [];
    }
  }

  public write(data: T[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error writing database file: ${this.filePath}`, e);
    }
  }
}

export class UserRepository {
  private db = new JSONDataSource<User>('users.json');

  public getAll(): User[] {
    return this.db.read();
  }

  public getById(id: string): User | undefined {
    return this.db.read().find(u => u.id === id);
  }

  public getByEmail(email: string): User | undefined {
    return this.db.read().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public create(user: Omit<User, 'id'>): User {
    const list = this.db.read();
    const id = `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newUser: User = { ...user, id };
    list.push(newUser);
    this.db.write(list);
    return newUser;
  }

  public update(id: string, updates: Partial<User>): User | undefined {
    const list = this.db.read();
    const index = list.findIndex(u => u.id === id);
    if (index === -1) return undefined;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.db.write(list);
    return updated;
  }
}

export class VehicleRepository {
  private db = new JSONDataSource<Vehicle>('vehicles.json');

  public getAll(): Vehicle[] {
    return this.db.read();
  }

  public getById(id: string): Vehicle | undefined {
    return this.db.read().find(v => v.id === id);
  }

  public getByRegNumber(regNum: string): Vehicle | undefined {
    return this.db.read().find(v => v.registrationNumber.toUpperCase() === regNum.toUpperCase());
  }

  public create(vehicle: Omit<Vehicle, 'id'>): Vehicle {
    const list = this.db.read();
    const id = `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newVehicle: Vehicle = { ...vehicle, id };
    list.push(newVehicle);
    this.db.write(list);
    return newVehicle;
  }

  public update(id: string, updates: Partial<Vehicle>): Vehicle | undefined {
    const list = this.db.read();
    const index = list.findIndex(v => v.id === id);
    if (index === -1) return undefined;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.db.write(list);
    return updated;
  }

  public delete(id: string): boolean {
    const list = this.db.read();
    const filtered = list.filter(v => v.id !== id);
    if (list.length === filtered.length) return false;
    this.db.write(filtered);
    return true;
  }
}

export class DriverRepository {
  private db = new JSONDataSource<Driver>('drivers.json');

  public getAll(): Driver[] {
    return this.db.read();
  }

  public getById(id: string): Driver | undefined {
    return this.db.read().find(d => d.id === id);
  }

  public getByLicense(licenseNum: string): Driver | undefined {
    return this.db.read().find(d => d.licenseNumber.toUpperCase() === licenseNum.toUpperCase());
  }

  public create(driver: Omit<Driver, 'id'>): Driver {
    const list = this.db.read();
    const id = `d_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newDriver: Driver = { ...driver, id };
    list.push(newDriver);
    this.db.write(list);
    return newDriver;
  }

  public update(id: string, updates: Partial<Driver>): Driver | undefined {
    const list = this.db.read();
    const index = list.findIndex(d => d.id === id);
    if (index === -1) return undefined;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.db.write(list);
    return updated;
  }

  public delete(id: string): boolean {
    const list = this.db.read();
    const filtered = list.filter(d => d.id !== id);
    if (list.length === filtered.length) return false;
    this.db.write(filtered);
    return true;
  }
}

export class TripRepository {
  private db = new JSONDataSource<Trip>('trips.json');

  public getAll(): Trip[] {
    return this.db.read();
  }

  public getById(id: string): Trip | undefined {
    return this.db.read().find(t => t.id === id);
  }

  public create(trip: Omit<Trip, 'id' | 'createdAt'>): Trip {
    const list = this.db.read();
    const id = `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newTrip: Trip = {
      ...trip,
      id,
      createdAt: new Date().toISOString()
    };
    list.push(newTrip);
    this.db.write(list);
    return newTrip;
  }

  public update(id: string, updates: Partial<Trip>): Trip | undefined {
    const list = this.db.read();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return undefined;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.db.write(list);
    return updated;
  }

  public delete(id: string): boolean {
    const list = this.db.read();
    const filtered = list.filter(t => t.id !== id);
    if (list.length === filtered.length) return false;
    this.db.write(filtered);
    return true;
  }
}

export class MaintenanceRepository {
  private db = new JSONDataSource<Maintenance>('maintenance.json');

  public getAll(): Maintenance[] {
    return this.db.read();
  }

  public getById(id: string): Maintenance | undefined {
    return this.db.read().find(m => m.id === id);
  }

  public create(maint: Omit<Maintenance, 'id'>): Maintenance {
    const list = this.db.read();
    const id = `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newMaint: Maintenance = { ...maint, id };
    list.push(newMaint);
    this.db.write(list);
    return newMaint;
  }

  public update(id: string, updates: Partial<Maintenance>): Maintenance | undefined {
    const list = this.db.read();
    const index = list.findIndex(m => m.id === id);
    if (index === -1) return undefined;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.db.write(list);
    return updated;
  }
}

export class FuelLogRepository {
  private db = new JSONDataSource<FuelLog>('fuelLogs.json');

  public getAll(): FuelLog[] {
    return this.db.read();
  }

  public create(log: Omit<FuelLog, 'id'>): FuelLog {
    const list = this.db.read();
    const id = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newLog: FuelLog = { ...log, id };
    list.push(newLog);
    this.db.write(list);
    return newLog;
  }
}

export class ExpenseRepository {
  private db = new JSONDataSource<Expense>('expenses.json');

  public getAll(): Expense[] {
    return this.db.read();
  }

  public create(expense: Omit<Expense, 'id'>): Expense {
    const list = this.db.read();
    const id = `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newExpense: Expense = { ...expense, id };
    list.push(newExpense);
    this.db.write(list);
    return newExpense;
  }
}

export class NotificationRepository {
  private db = new JSONDataSource<Notification>('notifications.json');

  public getAll(): Notification[] {
    return this.db.read();
  }

  public getById(id: string): Notification | undefined {
    return this.db.read().find(n => n.id === id);
  }

  public create(notif: Omit<Notification, 'id' | 'date' | 'resolved'>): Notification {
    const list = this.db.read();
    const id = `n_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newNotif: Notification = {
      ...notif,
      id,
      date: new Date().toISOString(),
      resolved: false
    };
    list.push(newNotif);
    this.db.write(list);
    return newNotif;
  }

  public update(id: string, updates: Partial<Notification>): Notification | undefined {
    const list = this.db.read();
    const index = list.findIndex(n => n.id === id);
    if (index === -1) return undefined;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.db.write(list);
    return updated;
  }
}

export class ActivityLogRepository {
  private db = new JSONDataSource<ActivityLog>('activityLogs.json');

  public getAll(): ActivityLog[] {
    return this.db.read();
  }

  public create(action: string, user: string): ActivityLog {
    const list = this.db.read();
    const id = `al_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newLog: ActivityLog = {
      id,
      action,
      user,
      timestamp: new Date().toISOString()
    };
    list.push(newLog);
    this.db.write(list);
    return newLog;
  }
}
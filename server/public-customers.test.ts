import { describe, expect, it } from "vitest";
import {
  createCustomer,
  getCustomerByEmail,
  getCustomerById,
} from "./customers-helpers";

describe("Public API - Customer Endpoints", () => {
  it("should create a new customer", async () => {
    const email = `test${Date.now()}@example.com`;
    
    const customer = await createCustomer({
      name: "Test Customer",
      email,
      balance: 10000, // R$ 100.00
      active: true,
    });

    expect(customer.name).toBe("Test Customer");
    expect(customer.email).toBe(email);
    expect(customer.balance).toBe(10000);
    expect(customer.active).toBe(true);
  });

  it("should get customer by email", async () => {
    const email = `test${Date.now()}@example.com`;
    
    // Create customer first
    await createCustomer({
      name: "Test Customer",
      email,
      balance: 5000,
      active: true,
    });

    // Get customer by email
    const customer = await getCustomerByEmail(email);

    expect(customer).toBeDefined();
    expect(customer?.email).toBe(email);
    expect(customer?.name).toBe("Test Customer");
    expect(customer?.balance).toBe(5000);
    expect(customer?.active).toBe(true);
  });

  it("should get customer by ID", async () => {
    const email = `test${Date.now()}@example.com`;
    
    // Create customer first
    const created = await createCustomer({
      name: "Test Customer",
      email,
      balance: 7500,
      active: true,
    });

    // Get customer by ID
    const customer = await getCustomerById(created.id);

    expect(customer).toBeDefined();
    expect(customer?.id).toBe(created.id);
    expect(customer?.name).toBe("Test Customer");
    expect(customer?.balance).toBe(7500);
    expect(customer?.active).toBe(true);
  });

  it("should return undefined for non-existent customer by email", async () => {
    const customer = await getCustomerByEmail("nonexistent@example.com");
    expect(customer).toBeUndefined();
  });

  it("should return undefined for non-existent customer by ID", async () => {
    const customer = await getCustomerById(999999);
    expect(customer).toBeUndefined();
  });

  it("should create customer with default balance of 0", async () => {
    const email = `test${Date.now()}@example.com`;
    
    const customer = await createCustomer({
      name: "Test Customer",
      email,
      active: true,
    });

    expect(customer.balance).toBe(0);
  });
});

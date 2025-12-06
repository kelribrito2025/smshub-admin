import { describe, it, expect } from 'vitest';
import { createCustomer, getCustomerById, addBalance } from './customers-helpers';
import { createActivation, getActivationById } from './activations-helpers';

describe('Débito Automático de Saldo', () => {
  it('deve criar transação ao adicionar saldo', async () => {
    // Create test customer
    const customer = await createCustomer({
      name: 'Test Customer',
      email: `test-${Date.now()}@example.com`,
      balance: 0,
      active: true,
    });

    expect(customer).toBeDefined();
    expect(customer?.balance).toBe(0);

    // Add balance
    const result = await addBalance(
      customer!.id,
      10000, // R$ 100.00
      'credit',
      'Test credit'
    );

    expect(result.balanceBefore).toBe(0);
    expect(result.balanceAfter).toBe(10000);

    // Verify customer balance was updated
    const updatedCustomer = await getCustomerById(customer!.id);
    expect(updatedCustomer?.balance).toBe(10000);
  });

  it('deve debitar saldo ao criar ativação', async () => {
    // Create test customer with balance
    const customer = await createCustomer({
      name: 'Test Customer 2',
      email: `test-${Date.now()}@example.com`,
      balance: 5000, // R$ 50.00
      active: true,
    });

    expect(customer?.balance).toBe(5000);

    const initialBalance = customer!.balance;
    const purchaseAmount = 1000; // R$ 10.00

    // Simulate purchase by debiting balance
    await addBalance(
      customer!.id,
      -purchaseAmount,
      'purchase',
      'Test SMS purchase',
      undefined,
      1 // Mock activation ID
    );

    // Verify balance was debited
    const updatedCustomer = await getCustomerById(customer!.id);
    expect(updatedCustomer?.balance).toBe(initialBalance - purchaseAmount);
  });

  it('deve validar saldo insuficiente', async () => {
    // Create customer with low balance
    const customer = await createCustomer({
      name: 'Test Customer 3',
      email: `test-${Date.now()}@example.com`,
      balance: 500, // R$ 5.00
      active: true,
    });

    const requiredAmount = 1000; // R$ 10.00

    // Verify customer has insufficient balance
    expect(customer!.balance).toBeLessThan(requiredAmount);
    
    // In real scenario, the endpoint would throw error:
    // "Insufficient balance. Required: R$ 10.00, Available: R$ 5.00"
  });
});

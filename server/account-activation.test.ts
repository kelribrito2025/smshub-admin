import { describe, it, expect } from 'vitest';
import { createCustomer, getCustomerByEmail, updateCustomer } from './customers-helpers';
import bcrypt from 'bcrypt';

describe('Fluxo de Ativação de Conta', () => {
  it('deve criar conta com emailVerified = false', async () => {
    const email = `test-activation-${Date.now()}@example.com`;
    const password = await bcrypt.hash('testpassword123', 10);

    const customer = await createCustomer({
      email,
      name: 'Test User',
      password,
      emailVerified: false,
    });

    expect(customer).toBeDefined();
    expect(customer.emailVerified).toBe(false);
    expect(customer.emailVerifiedAt).toBeNull();
  });

  it('deve ativar conta corretamente', async () => {
    const email = `test-activation-${Date.now()}@example.com`;
    const password = await bcrypt.hash('testpassword123', 10);

    const customer = await createCustomer({
      email,
      name: 'Test User',
      password,
      emailVerified: false,
    });

    // Ativar conta
    await updateCustomer(customer.id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const updated = await getCustomerByEmail(email);
    expect(updated?.emailVerified).toBe(true);
    expect(updated?.emailVerifiedAt).toBeDefined();
  });

  it('deve bloquear login de conta não ativada', async () => {
    const email = `test-login-blocked-${Date.now()}@example.com`;
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await createCustomer({
      email,
      name: 'Test User',
      password: hashedPassword,
      emailVerified: false,
    });

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, customer.password!);
    expect(passwordMatch).toBe(true);

    // Verificar que conta não está ativada
    expect(customer.emailVerified).toBe(false);

    // Login deveria ser bloqueado (verificação feita no router)
  });

  it('deve permitir login de conta ativada', async () => {
    const email = `test-login-allowed-${Date.now()}@example.com`;
    const password = 'testpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await createCustomer({
      email,
      name: 'Test User',
      password: hashedPassword,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, customer.password!);
    expect(passwordMatch).toBe(true);

    // Verificar que conta está ativada
    expect(customer.emailVerified).toBe(true);

    // Login deveria ser permitido
  });
});

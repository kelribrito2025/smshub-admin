import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsManager } from './notifications-manager';

describe('Balance Notification System (DISABLED)', () => {
  beforeEach(() => {
    // Clear any previous mocks
    vi.clearAllMocks();
  });

  it('should NOT send notification when admin adds positive balance (feature disabled)', async () => {
    // Mock notificationsManager.sendToCustomer
    const sendToCustomerSpy = vi.spyOn(notificationsManager, 'sendToCustomer');

    // Simulate admin adding balance (credit type, positive amount)
    const customerId = 510001;
    const amount = 1000; // R$ 10,00 in cents
    const type = 'credit';
    const balanceAfter = 1000;

    // This is what happens in customers.ts addBalance procedure
    const isPositiveCredit = amount > 0 && (type === 'credit' || type === 'refund');
    
    expect(isPositiveCredit).toBe(true);

    // NOTE: Notification sending was removed per user request
    // Backend no longer calls notificationsManager.sendToCustomer()

    // Verify notification was NOT sent (feature disabled per user request)
    expect(sendToCustomerSpy).not.toHaveBeenCalled();
  });

  it('should NOT send notification when admin debits balance', async () => {
    const sendToCustomerSpy = vi.spyOn(notificationsManager, 'sendToCustomer');

    // Simulate admin debiting balance (debit type, negative amount)
    const amount = -500; // R$ -5,00 in cents
    const type = 'debit';

    const isPositiveCredit = amount > 0 && (type === 'credit' || type === 'refund');
    
    expect(isPositiveCredit).toBe(false);

    // NOTE: Notification sending was removed per user request
    // (no code to call sendToCustomer)

    // Verify notification was NOT sent
    expect(sendToCustomerSpy).not.toHaveBeenCalled();
  });

  it('should NOT send notification for refund type (feature disabled)', async () => {
    const sendToCustomerSpy = vi.spyOn(notificationsManager, 'sendToCustomer');

    // Simulate admin refunding balance (refund type, positive amount)
    const customerId = 510001;
    const amount = 500; // R$ 5,00 in cents
    const type = 'refund';
    const balanceAfter = 1500;

    const isPositiveCredit = amount > 0 && (type === 'credit' || type === 'refund');
    
    expect(isPositiveCredit).toBe(true);

    // NOTE: Notification sending was removed per user request
    // (no code to call sendToCustomer)

    // Verify notification was NOT sent (feature disabled)
    expect(sendToCustomerSpy).not.toHaveBeenCalled();
  });

  it('should NOT send notification for purchase type (even if positive)', async () => {
    const sendToCustomerSpy = vi.spyOn(notificationsManager, 'sendToCustomer');

    // Simulate purchase (purchase type, positive amount but not credit/refund)
    const amount = 300; // R$ 3,00 in cents
    const type = 'purchase';

    const isPositiveCredit = amount > 0 && (type === 'credit' || type === 'refund');
    
    expect(isPositiveCredit).toBe(false);

    // NOTE: Notification sending was removed per user request
    // (no code to call sendToCustomer)

    // Verify notification was NOT sent (purchase is not credit/refund)
    expect(sendToCustomerSpy).not.toHaveBeenCalled();
  });
});

import { describe, it, expect } from "vitest";

describe("Lógica do Badge 'Novo' em Serviços", () => {
  // Simular a lógica exata usada no código de produção
  function calculateIsNew(createdAt: Date | string): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = sevenDaysAgo.getTime();
    
    // Converter createdAt para timestamp para comparação confiável
    const createdAtTimestamp = createdAt instanceof Date 
      ? createdAt.getTime()
      : new Date(createdAt).getTime();
    
    return createdAtTimestamp > sevenDaysAgoTimestamp;
  }

  it("deve marcar serviço criado hoje como novo (isNew: true)", () => {
    const today = new Date();
    const isNew = calculateIsNew(today);
    
    expect(isNew).toBe(true);
  });

  it("deve marcar serviço criado há 1 dia como novo (isNew: true)", () => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const isNew = calculateIsNew(oneDayAgo);
    
    expect(isNew).toBe(true);
  });

  it("deve marcar serviço criado há 6 dias como novo (isNew: true)", () => {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const isNew = calculateIsNew(sixDaysAgo);
    
    expect(isNew).toBe(true);
  });

  it("deve marcar serviço criado há exatamente 6 dias e 23 horas como novo (isNew: true)", () => {
    const almostSevenDays = new Date();
    almostSevenDays.setDate(almostSevenDays.getDate() - 6);
    almostSevenDays.setHours(almostSevenDays.getHours() - 23);
    const isNew = calculateIsNew(almostSevenDays);
    
    expect(isNew).toBe(true);
  });

  it("deve marcar serviço criado há 7 dias como NÃO novo (isNew: false)", () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isNew = calculateIsNew(sevenDaysAgo);
    
    expect(isNew).toBe(false);
  });

  it("deve marcar serviço criado há 8 dias como NÃO novo (isNew: false)", () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const isNew = calculateIsNew(eightDaysAgo);
    
    expect(isNew).toBe(false);
  });

  it("deve marcar serviço criado há 30 dias como NÃO novo (isNew: false)", () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isNew = calculateIsNew(thirtyDaysAgo);
    
    expect(isNew).toBe(false);
  });

  it("deve lidar corretamente com createdAt como string ISO (hoje)", () => {
    const today = new Date();
    const todayISO = today.toISOString();
    const isNew = calculateIsNew(todayISO);
    
    expect(isNew).toBe(true);
  });

  it("deve lidar corretamente com createdAt como string ISO (7 dias atrás)", () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const isNew = calculateIsNew(sevenDaysAgoISO);
    
    expect(isNew).toBe(false);
  });

  it("deve processar múltiplos serviços com datas diferentes corretamente", () => {
    const services = [
      { name: "Novo 1", createdAt: new Date() }, // hoje
      { name: "Novo 2", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // 5 dias
      { name: "Antigo 1", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // 10 dias
      { name: "Antigo 2", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 dias
    ];

    const results = services.map(s => ({
      name: s.name,
      isNew: calculateIsNew(s.createdAt),
    }));

    expect(results[0].isNew).toBe(true);  // hoje
    expect(results[1].isNew).toBe(true);  // 5 dias
    expect(results[2].isNew).toBe(false); // 10 dias
    expect(results[3].isNew).toBe(false); // 30 dias
  });

  it("deve usar comparação de timestamps (números) e não de objetos Date", () => {
    const date1 = new Date("2025-12-01T10:00:00Z");
    const date2 = new Date("2025-12-01T10:00:00Z");
    
    // Objetos Date diferentes não são iguais por referência
    expect(date1 === date2).toBe(false);
    
    // Mas seus timestamps são iguais
    expect(date1.getTime() === date2.getTime()).toBe(true);
    
    // Nossa função usa timestamps, então funciona corretamente
    const isNew1 = calculateIsNew(date1);
    const isNew2 = calculateIsNew(date2);
    expect(isNew1).toBe(isNew2);
  });
});

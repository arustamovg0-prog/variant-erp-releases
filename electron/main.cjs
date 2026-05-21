const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
console.log('ELECTRON DATABASE PATH IS:', dbPath);

// Убедимся, что база существует в userData
if (!fs.existsSync(dbPath)) {
  const isDev = !app.isPackaged;
  // В dev режиме берем из prisma/dev.db, в проде - из запакованных ресурсов
  const templatePath = isDev 
    ? path.join(__dirname, '../prisma/dev.db')
    : path.join(process.resourcesPath, 'prisma/dev.db');
    
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, dbPath);
    console.log('Database initialized from template');
  } else {
    console.error('Template database not found at:', templatePath);
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    // Скрываем меню для эффекта нативного приложения (как 1С)
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Убираем дефолтное меню браузера
  mainWindow.setMenuBarVisibility(false);

  // В зависимости от окружения грузим локальный dev сервер или статические файлы билда
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// AUTH & IPC HANDLERS (Связь Frontend -> SQLite)
// ==========================================

ipcMain.handle('login', async (event, email, password) => {
  try {
    const agent = await prisma.agent.findUnique({ where: { email } });
    if (!agent) return { success: false, error: 'Пользователь не найден' };
    if (agent.password !== password) return { success: false, error: 'Неверный пароль' };
    
    // Возвращаем данные без пароля
    const { password: _, ...agentData } = agent;
    return { success: true, data: agentData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('signup', async (event, { email, password, name, phone }) => {
  try {
    const existing = await prisma.agent.findUnique({ where: { email } });
    if (existing) return { success: false, error: 'Email уже используется' };

    const role = email.split('@')[0] === 'admin' ? 'admin' : 'agent';
    
    const agent = await prisma.agent.create({
      data: {
        email,
        password, // в локальной БД можно хранить как есть или хешировать
        name,
        role
      }
    });

    const { password: _, ...agentData } = agent;
    return { success: true, data: agentData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-deals', async (event, agentId) => {
  try {
    const where = agentId ? { agentId } : {};
    const deals = await prisma.deal.findMany({
      where,
      include: { payments: true }
    });
    return { success: true, data: deals };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Пример: Создать новую сделку
ipcMain.handle('create-deal', async (event, dealData, paymentsData, cashboxTransactionsData) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({ data: dealData });
      if (paymentsData && paymentsData.length > 0) {
        await tx.payment.createMany({
          data: paymentsData.map(p => ({ ...p, dealId: deal.id }))
        });
      }
      if (cashboxTransactionsData && cashboxTransactionsData.length > 0) {
        await tx.cashboxTransaction.createMany({
          data: cashboxTransactionsData.map(t => ({ ...t, dealId: deal.id }))
        });
      }
      return deal;
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Проведение оплаты (Transaction-safe ACID)
ipcMain.handle('record-payment', async (event, paymentId, paidAmount, agentId, paymentDate, language) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Находим платеж
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { deal: true }
      });
      if (!payment) throw new Error(language === 'ru' ? 'Платеж не найден' : 'To\'lov topilmadi');
      if (payment.status === 'paid') throw new Error(language === 'ru' ? 'Платеж уже оплачен' : 'To\'lov allaqachon to\'langan');

      const deal = payment.deal;
      
      const expectedTotalCents = Math.round(payment.amount * 100);
      const expectedPrincipalCents = Math.round(payment.principalAmount * 100);
      const expectedProfitCents = expectedTotalCents - expectedPrincipalCents;
      
      const paidTotalCents = Math.round(paidAmount * 100);
      const diff = expectedTotalCents - paidTotalCents;
      
      let currentPaymentAmount = paidAmount;
      let currentPrincipal = payment.principalAmount;
      let currentProfit = payment.profitAmount;
      
      if (diff > 0) {
        // Частичная оплата (Underpayment)
        const paidPrincipalCents = Math.round((expectedPrincipalCents / expectedTotalCents) * paidTotalCents);
        const paidProfitCents = paidTotalCents - paidPrincipalCents;
        
        currentPaymentAmount = paidTotalCents / 100;
        currentPrincipal = paidPrincipalCents / 100;
        currentProfit = paidProfitCents / 100;
        
        // Создаем новый платеж на остаток долга
        const newTotalCents = expectedTotalCents - paidTotalCents;
        const newPrincipalCents = expectedPrincipalCents - paidPrincipalCents;
        const newProfitCents = newTotalCents - newPrincipalCents;
        
        await tx.payment.create({
          data: {
            dealId: payment.dealId,
            monthNumber: payment.monthNumber,
            amount: newTotalCents / 100,
            principalAmount: newPrincipalCents / 100,
            profitAmount: newProfitCents / 100,
            dueDate: payment.dueDate,
            status: 'pending'
          }
        });
      } else if (diff < 0) {
        // Переплата (Overpayment)
        currentPaymentAmount = payment.amount;
        currentPrincipal = payment.principalAmount;
        currentProfit = payment.profitAmount;
        
        let overflowCents = Math.abs(diff);
        
        // Находим будущие неоплаченные платежи
        const pendingPayments = await tx.payment.findMany({
          where: {
            dealId: payment.dealId,
            id: { not: paymentId },
            status: { not: 'paid' }
          },
          orderBy: { dueDate: 'asc' }
        });
        
        for (const pending of pendingPayments) {
          if (overflowCents <= 0) break;
          
          const pendingAmountCents = Math.round(pending.amount * 100);
          const pendingPrincipalCents = Math.round(pending.principalAmount * 100);
          const pendingProfitCents = pendingAmountCents - pendingPrincipalCents;
          
          if (pendingAmountCents <= overflowCents) {
            overflowCents -= pendingAmountCents;
            await tx.payment.update({
              where: { id: pending.id },
              data: {
                status: 'paid',
                paidDate: paymentDate
              }
            });
          } else {
            const deductedCents = overflowCents;
            overflowCents = 0;
            
            const deductedPrincipalCents = Math.round((pendingPrincipalCents / pendingAmountCents) * deductedCents);
            const deductedProfitCents = deductedCents - deductedPrincipalCents;
            
            await tx.payment.update({
              where: { id: pending.id },
              data: {
                amount: (pendingAmountCents - deductedCents) / 100,
                principalAmount: (pendingPrincipalCents - deductedPrincipalCents) / 100,
                profitAmount: (pendingProfitCents - deductedProfitCents) / 100
              }
            });
          }
        }
      }
      
      // Помечаем текущий платеж оплаченным
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'paid',
          paidDate: paymentDate,
          amount: currentPaymentAmount,
          principalAmount: currentPrincipal,
          profitAmount: currentProfit
        }
      });
      
      // Записываем приход в Кассу
      const reason = language === 'ru'
        ? `Оплата от: ${deal.client} (Договор: ${deal.id}) | Ежемесячный платеж №${payment.monthNumber} за ${deal.product}`
        : `Mijozdan to'lov: ${deal.client} (Shartnoma: ${deal.id}) | Oylik to'lov №${payment.monthNumber}, ${deal.product} uchun`;
        
      await tx.cashboxTransaction.create({
        data: {
          agentId,
          type: 'income',
          amount: paidAmount,
          category: 'payment',
          reason,
          dealId: deal.id,
          date: paymentDate
        }
      });
      
      // Обновляем статус сделки и кол-во оплаченных месяцев
      const paidCount = await tx.payment.count({
        where: { dealId: deal.id, status: 'paid' }
      });
      
      const unpaidCount = await tx.payment.count({
        where: { dealId: deal.id, NOT: { status: 'paid' } }
      });
      
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          paidMonths: paidCount,
          status: unpaidCount === 0 ? 'completed' : deal.status
        }
      });
      
      return updatedPayment;
    });
    
    return { success: true, data: result };
  } catch (error) {
    console.error('[record-payment error]:', error);
    return { success: false, error: error.message };
  }
});

// Пример: Экспорт отчета через нативный диалог (Без интернета/CDN)
ipcMain.handle('export-csv', async (event, { filename, csvContent }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить отчет',
      defaultPath: filename,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    // Сохраняем файл локально на компьютер
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// ADMIN IPC HANDLERS
// ==========================================

ipcMain.handle('get-all-agents', async () => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        deals: {
          include: { payments: true }
        }
      }
    });
    
    // Вычисляем KPI для каждого
    const stats = agents.map(agent => {
      let totalPortfolio = 0;
      let overdueAmount = 0;
      
      agent.deals.forEach(deal => {
        totalPortfolio += deal.totalAmount;
        deal.payments.forEach(p => {
          if (p.status === 'overdue') {
            overdueAmount += p.amount;
          }
        });
      });
      
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        totalDeals: agent.deals.length,
        totalPortfolio,
        overdueAmount
      };
    });

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-agent', async (event, agentData) => {
  try {
    const existing = await prisma.agent.findUnique({ where: { email: agentData.email } });
    if (existing) return { success: false, error: 'Email уже существует' };

    const agent = await prisma.agent.create({
      data: {
        name: agentData.name,
        email: agentData.email,
        password: agentData.password,
        role: agentData.role || 'agent'
      }
    });
    return { success: true, data: agent };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Настройки
ipcMain.handle('get-settings', async () => {
  try {
    const settings = await prisma.setting.findMany();
    // Convert array of {key, value} to an object
    const result = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-setting', async (event, key, value) => {
  try {
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
    return { success: true, data: setting };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-agent-role', async (event, agentId, role) => {
  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { role }
    });
    return { success: true, data: agent };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-agent-password', async (event, agentId, password) => {
  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { password }
    });
    return { success: true, data: agent };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-payment', async (event, paymentId, updates) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: updates
    });

    if (updates.status === 'paid') {
      const dealId = payment.dealId;
      const unpaidCount = await prisma.payment.count({
        where: { dealId, NOT: { status: 'paid' } }
      });
      if (unpaidCount === 0) {
        await prisma.deal.update({
          where: { id: dealId },
          data: { status: 'completed' }
        });
      }
      
      const paidCount = await prisma.payment.count({
        where: { dealId, status: 'paid' }
      });
      await prisma.deal.update({
        where: { id: dealId },
        data: { paidMonths: paidCount }
      });
    }

    return { success: true, data: payment };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-payment', async (event, paymentData) => {
  try {
    const payment = await prisma.payment.create({
      data: paymentData
    });
    return { success: true, data: payment };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cashbox-transactions', async (event, agentId) => {
  try {
    const where = agentId ? { agentId } : {};
    const transactions = await prisma.cashboxTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: transactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-cashbox-transaction', async (event, transactionData) => {
  try {
    const transaction = await prisma.cashboxTransaction.create({
      data: transactionData
    });
    return { success: true, data: transaction };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-global-stats', async () => {
  try {
    const deals = await prisma.deal.findMany({ include: { payments: true } });
    
    let totalPortfolio = 0;
    let totalPaid = 0;
    let totalOverdue = 0;

    deals.forEach(deal => {
      totalPortfolio += deal.totalAmount;
      deal.payments.forEach(p => {
        if (p.status === 'paid') totalPaid += p.amount;
        if (p.status === 'overdue') totalOverdue += p.amount;
      });
    });

    return { 
      success: true, 
      data: {
        totalDeals: deals.length,
        totalPortfolio,
        totalPaid,
        totalOverdue
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// OFFLINE SYNC HANDLERS (Export / Import)
// ==========================================

ipcMain.handle('export-database', async (event, agentName) => {
  try {
    const defaultName = agentName ? `Backup_${agentName}_${new Date().toISOString().split('T')[0]}.sqlite` : 'Backup_ERP.sqlite';
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Выгрузить базу данных',
      defaultPath: defaultName,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    fs.copyFileSync(dbPath, filePath);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-database', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Загрузить базу агента',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
    });

    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    const importPath = filePaths[0];

    // Migrate the imported database to the latest schema before connecting
    try {
      const { execSync } = require('child_process');
      execSync(`npx prisma db push --skip-generate`, {
        env: {
          ...process.env,
          DATABASE_URL: `file:${importPath}`
        },
        stdio: 'ignore'
      });
      console.log('Successfully migrated imported database at:', importPath);
    } catch (migError) {
      console.error('Error migrating imported database:', migError);
    }
    
    // Connect to the imported database
    const importPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${importPath}`
        }
      }
    });

    // Read data
    const agents = await importPrisma.agent.findMany();
    const deals = await importPrisma.deal.findMany();
    const payments = await importPrisma.payment.findMany();
    
    let cashboxTransactions = [];
    try {
      cashboxTransactions = await importPrisma.cashboxTransaction.findMany();
    } catch (e) {
      console.log('No cashboxTransaction table found in imported DB, skipping');
    }

    await importPrisma.$disconnect();

    // Upsert into main database
    await prisma.$transaction(async (tx) => {
      // Upsert agents
      for (const a of agents) {
        await tx.agent.upsert({
          where: { id: a.id },
          update: a,
          create: a
        });
      }
      
      // Upsert deals
      for (const d of deals) {
        await tx.deal.upsert({
          where: { id: d.id },
          update: d,
          create: d
        });
      }

      // Upsert payments
      for (const p of payments) {
        await tx.payment.upsert({
          where: { id: p.id },
          update: p,
          create: p
        });
      }

      // Upsert cashbox transactions
      for (const t of cashboxTransactions) {
        await tx.cashboxTransaction.upsert({
          where: { id: t.id },
          update: t,
          create: t
        });
      }
    }, {
      maxWait: 5000, // 5s max wait to connect to prisma
      timeout: 20000 // 20s timeout
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

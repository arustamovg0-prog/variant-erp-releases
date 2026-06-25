const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PrismaClient } = require('./prisma-client');
const fs = require('fs');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
console.log('ELECTRON DATABASE URL IS:', dbUrl ? 'Found' : 'Not Found');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Разрешаем загрузку ES-модулей через file://
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading production file:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  // Логируем ошибки рендерера для отладки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await prisma.$disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await prisma.$disconnect();
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
    const stats = await prisma.$queryRaw`
      SELECT 
        a.id, 
        a.name, 
        a.role,
        COUNT(DISTINCT d.id) as "totalDeals",
        COALESCE(SUM(d."totalAmount"), 0) as "totalPortfolio",
        COALESCE((
          SELECT SUM(p.amount) 
          FROM "Payment" p 
          JOIN "Deal" d2 ON p."dealId" = d2.id 
          WHERE d2."agentId" = a.id AND p.status = 'overdue'
        ), 0) as "overdueAmount"
      FROM "Agent" a
      LEFT JOIN "Deal" d ON a.id = d."agentId"
      GROUP BY a.id, a.name, a.role
    `;

    const formattedStats = stats.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      totalDeals: Number(s.totalDeals),
      totalPortfolio: Number(s.totalPortfolio),
      overdueAmount: Number(s.overdueAmount)
    }));

    return { success: true, data: formattedStats };
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

ipcMain.handle('update-agent', async (event, agentId, updates) => {
  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: updates
    });
    return { success: true, data: agent };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-agent', async (event, agentId) => {
  try {
    // Prevent deleting the last admin
    const target = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!target) return { success: false, error: 'Agent not found' };
    if (target.role === 'admin') {
      const adminCount = await prisma.agent.count({ where: { role: 'admin' } });
      if (adminCount <= 1) return { success: false, error: 'Cannot delete the last admin' };
    }
    // Reassign deals to first available admin
    const admin = await prisma.agent.findFirst({ where: { role: 'admin', NOT: { id: agentId } } });
    if (admin) {
      await prisma.deal.updateMany({ where: { agentId }, data: { agentId: admin.id } });
      await prisma.cashboxTransaction.updateMany({ where: { agentId }, data: { agentId: admin.id } });
    }
    await prisma.agent.delete({ where: { id: agentId } });
    return { success: true };
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
    const [{ totalDeals, totalPortfolio }] = await prisma.$queryRaw`SELECT COUNT(id) as "totalDeals", COALESCE(SUM("totalAmount"), 0) as "totalPortfolio" FROM "Deal"`;
    const [{ totalPaid }] = await prisma.$queryRaw`SELECT COALESCE(SUM(amount), 0) as "totalPaid" FROM "Payment" WHERE status = 'paid'`;
    const [{ totalOverdue }] = await prisma.$queryRaw`SELECT COALESCE(SUM(amount), 0) as "totalOverdue" FROM "Payment" WHERE status = 'overdue'`;

    return { 
      success: true, 
      data: {
        totalDeals: Number(totalDeals),
        totalPortfolio: Number(totalPortfolio),
        totalPaid: Number(totalPaid),
        totalOverdue: Number(totalOverdue)
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

ipcMain.handle('sync-local-db', async (event, { agents, deals, payments, cashboxTransactions, settings }) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (agents && agents.length > 0) {
        for (const a of agents) {
          const mappedAgent = {
            id: a.id,
            name: a.name,
            email: a.email,
            password: a.password || '',
            role: a.role || 'agent',
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
            updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
          };
          await tx.agent.upsert({
            where: { id: mappedAgent.id },
            update: mappedAgent,
            create: mappedAgent
          });
        }
      }

      if (deals && deals.length > 0) {
        for (const d of deals) {
          const mappedDeal = {
            id: d.id,
            agentId: d.agentId,
            client: d.client,
            phone: d.phone,
            product: d.product,
            totalAmount: Number(d.totalAmount),
            monthlyAmount: Number(d.monthlyAmount),
            months: Number(d.months),
            paidMonths: Number(d.paidMonths || 0),
            startDate: d.startDate,
            status: d.status || 'active',
            comment: d.comment || null,
            referralName: d.referralName || null,
            referralPhone: d.referralPhone || null,
            referralRelation: d.referralRelation || null,
            costPrice: d.costPrice !== null && d.costPrice !== undefined ? Number(d.costPrice) : null,
            downPayment: d.downPayment !== null && d.downPayment !== undefined ? Number(d.downPayment) : null,
            createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
            updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
          };
          await tx.deal.upsert({
            where: { id: mappedDeal.id },
            update: mappedDeal,
            create: mappedDeal
          });
        }
      }

      if (payments && payments.length > 0) {
        for (const p of payments) {
          const mappedPayment = {
            id: p.id,
            dealId: p.dealId,
            monthNumber: Number(p.monthNumber),
            amount: Number(p.amount),
            principalAmount: Number(p.principalAmount || 0),
            profitAmount: Number(p.profitAmount || 0),
            dueDate: p.dueDate,
            paidDate: p.paidDate || null,
            extendedDate: p.extendedDate || null,
            status: p.status || 'pending',
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          };
          await tx.payment.upsert({
            where: { id: mappedPayment.id },
            update: mappedPayment,
            create: mappedPayment
          });
        }
      }

      if (cashboxTransactions && cashboxTransactions.length > 0) {
        for (const t of cashboxTransactions) {
          const mappedTx = {
            id: t.id,
            agentId: t.agentId || null,
            type: t.type,
            amount: Number(t.amount),
            category: t.category,
            reason: t.reason,
            dealId: t.dealId || null,
            date: t.date,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
          };
          await tx.cashboxTransaction.upsert({
            where: { id: mappedTx.id },
            update: mappedTx,
            create: mappedTx
          });
        }
      }

      if (settings && settings.length > 0) {
        for (const s of settings) {
          await tx.setting.upsert({
            where: { key: s.key },
            update: { value: String(s.value), updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date() },
            create: { key: s.key, value: String(s.value), updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date() }
          });
        }
      }
    }, {
      maxWait: 5000,
      timeout: 30000
    });
    return { success: true };
  } catch (error) {
    console.error('[sync-local-db error]:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-local-sync-data', async () => {
  try {
    const agents = await prisma.agent.findMany();
    const deals = await prisma.deal.findMany();
    const payments = await prisma.payment.findMany();
    const cashboxTransactions = await prisma.cashboxTransaction.findMany();
    const settings = await prisma.setting.findMany();
    return {
      success: true,
      data: {
        agents,
        deals,
        payments,
        cashboxTransactions,
        settings
      }
    };
  } catch (error) {
    console.error('[get-local-sync-data error]:', error);
    return { success: false, error: error.message };
  }
});

// Support and Database Remote Updates Handler
ipcMain.handle('execute-support-command', async (event, { type, payload }) => {
  try {
    if (type === 'sql') {
      const queryTrimmed = payload.trim().toLowerCase();
      if (queryTrimmed.startsWith('select') || queryTrimmed.startsWith('pragma') || queryTrimmed.startsWith('explain') || queryTrimmed.startsWith('show')) {
        const rows = await prisma.$queryRawUnsafe(payload);
        return { success: true, data: rows };
      } else {
        const affectedRows = await prisma.$executeRawUnsafe(payload);
        return { success: true, data: { affectedRows } };
      }
    } else if (type === 'cmd') {
      const { execSync } = require('child_process');
      const output = execSync(payload, { encoding: 'utf-8', cwd: path.join(__dirname, '..') });
      return { success: true, data: output };
    }
    throw new Error(`Unknown support command type: ${type}`);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('reset-database-section', async (event, section, password) => {
  try {
    // Legacy compatibility: verify admin password if provided
    if (password && password.trim()) {
      const admin = await prisma.agent.findFirst({ where: { role: 'admin' } });
      if (!admin || admin.password !== password) {
        return { success: false, error: 'Неверный пароль администратора' };
      }
    }

    if (section === 'clients' || section === 'deals' || section === 'all') {
      await prisma.$transaction([
        prisma.cashboxTransaction.deleteMany({}),
        prisma.payment.deleteMany({}),
        prisma.deal.deleteMany({}),
      ]);
    } else if (section === 'payments') {
      await prisma.payment.deleteMany({});
    } else if (section === 'cashbox') {
      await prisma.cashboxTransaction.deleteMany({});
    } else if (section === 'reports') {
      await prisma.$transaction([
        prisma.payment.deleteMany({}),
        prisma.cashboxTransaction.deleteMany({}),
      ]);
    } else {
      return { success: false, error: 'Неизвестная категория обнуления' };
    }

    return { success: true };
  } catch (err) {
    console.error('[reset-database-section error]:', err);
    return { success: false, error: err.message };
  }
});

// =============================================
// FACTORY RESET — Atomic transactional wipe
// Deletes: CashboxTransaction → Payment → Deal
// Preserves: Agent, Setting
// =============================================
ipcMain.handle('factory-reset', async () => {
  try {
    // Use Prisma interactive transaction for atomicity
    await prisma.$transaction(async (tx) => {
      await tx.cashboxTransaction.deleteMany({});
      await tx.payment.deleteMany({});
      await tx.deal.deleteMany({});
    });

    console.log('[FACTORY RESET] All transactional data wiped successfully.');
    return { success: true };
  } catch (err) {
    console.error('[FACTORY RESET] Error:', err);
    return { success: false, error: err.message };
  }
});





const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Авторизация
  login: (email, password) => ipcRenderer.invoke('login', email, password),
  signup: (email, password, name, phone) => ipcRenderer.invoke('signup', { email, password, name, phone }),

  // Вызовы к SQLite
  getDeals: (agentId) => ipcRenderer.invoke('get-deals', agentId),
  createDeal: (dealData, paymentsData, cashboxTransactionsData) => ipcRenderer.invoke('create-deal', dealData, paymentsData, cashboxTransactionsData),
  updatePayment: (paymentId, updates) => ipcRenderer.invoke('update-payment', paymentId, updates),
  recordPayment: (paymentId, paidAmount, agentId, paymentDate, language) => ipcRenderer.invoke('record-payment', paymentId, paidAmount, agentId, paymentDate, language),
  createPayment: (paymentData) => ipcRenderer.invoke('create-payment', paymentData),

  // Касса (Cashbox)
  getCashboxTransactions: (agentId) => ipcRenderer.invoke('get-cashbox-transactions', agentId),
  createCashboxTransaction: (transactionData) => ipcRenderer.invoke('create-cashbox-transaction', transactionData),

  // Экспорт файлов локально
  exportCsv: (filename, csvContent) => ipcRenderer.invoke('export-csv', { filename, csvContent }),

  // Админские методы
  getAllAgents: () => ipcRenderer.invoke('get-all-agents'),
  createAgent: (agentData) => ipcRenderer.invoke('create-agent', agentData),
  updateAgentRole: (agentId, role) => ipcRenderer.invoke('update-agent-role', agentId, role),
  updateAgentPassword: (agentId, password) => ipcRenderer.invoke('update-agent-password', agentId, password),
  getGlobalStats: () => ipcRenderer.invoke('get-global-stats'),

  // Настройки
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),

  // Offline Sync
  exportDatabase: (agentName) => ipcRenderer.invoke('export-database', agentName),
  importDatabase: () => ipcRenderer.invoke('import-database'),
});

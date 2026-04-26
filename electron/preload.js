/**
 * PRELOAD.JS — Secure IPC Bridge
 * Exposes only whitelisted IPC channels to the React renderer.
 * Never expose 'require' or 'remote' to renderer!
 */

const { contextBridge, ipcRenderer, shell } = require('electron');

// Whitelist of valid channels
const INVOKE_CHANNELS = [
  'auth:login', 'auth:getUsers', 'auth:addUser',
  'pelanggan:getAll', 'pelanggan:search', 'pelanggan:add', 'pelanggan:update', 'pelanggan:getRiwayat',
  'invoice:getAll', 'invoice:getById', 'invoice:create', 'invoice:updateStatus',
  'sparepart:getAll', 'sparepart:getStokMenipis', 'sparepart:add', 'sparepart:stokMasuk', 'sparepart:getMutasi', 'stok:getAllMutasi',
  'laporan:harian', 'laporan:bulanan',
  'settings:get', 'settings:set',
  'printer:getPorts', 'printer:test', 'printer:printInvoice',
  'ai:generateInsights', 'ai:generatePrediksi', 'ai:chat',
  'backup:status', 'backup:getAuthUrl', 'backup:saveToken',
  'backup:runNow', 'backup:toggleScheduler', 'backup:disconnect',
  'app:getVersion',
];

const SEND_CHANNELS = [
  'auth:openMain',
  'window:minimize', 'window:maximize', 'window:close',
];

contextBridge.exposeInMainWorld('api', {
  // Two-way IPC (returns Promise)
  invoke: (channel, ...args) => {
    if (INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Channel not allowed: ${channel}`));
  },
  on: (channel, callback) => {
    const validChannels = ['backup:success', 'backup:error'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  openExternal: (url) => shell.openExternal(url),

  // One-way IPC (fire and forget)
  send: (channel, ...args) => {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
});

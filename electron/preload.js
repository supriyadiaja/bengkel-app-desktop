/**
 * PRELOAD.JS — Secure IPC Bridge
 * Exposes only whitelisted IPC channels to the React renderer.
 * Never expose 'require' or 'remote' to renderer!
 */

const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of valid channels
const INVOKE_CHANNELS = [
  'auth:login', 'auth:getUsers', 'auth:addUser',
  'pelanggan:getAll', 'pelanggan:search', 'pelanggan:add', 'pelanggan:update', 'pelanggan:getRiwayat',
  'invoice:getAll', 'invoice:getById', 'invoice:create', 'invoice:updateStatus',
  'sparepart:getAll', 'sparepart:getStokMenipis', 'sparepart:add', 'sparepart:stokMasuk', 'sparepart:getMutasi',
  'laporan:harian', 'laporan:bulanan',
  'settings:get', 'settings:set',
  'printer:getPorts', 'printer:test', 'printer:printInvoice',
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
  // One-way IPC (fire and forget)
  send: (channel, ...args) => {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
});

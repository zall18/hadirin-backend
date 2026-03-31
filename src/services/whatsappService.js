// services/whatsappService.js
// Ini adalah adapter untuk berbagai provider WhatsApp
// Bisa menggunakan Baileys, Fonnte, WATI, atau API lainnya

// Contoh implementasi dengan mock (untuk development)
// Ganti dengan implementasi nyata sesuai kebutuhan

class WhatsAppService {
  constructor(config) {
    this.config = config;
    this.provider = config.provider || 'mock'; // 'baileys', 'fonnte', 'whatsapp_api', 'mock'
  }

  /**
   * Kirim pesan teks
   */
  async sendText(phone, message) {
    console.log(`[WhatsApp] Sending text to ${phone}: ${message}`);
    
    if (this.provider === 'mock') {
      // Mock response
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
        status: 'SENT',
      };
    }
    
    // Implementasi untuk provider lain
    // Contoh untuk Fonnte API
    if (this.provider === 'fonnte') {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message: message,
        }),
      });
      const data = await response.json();
      return {
        success: data.status,
        messageId: data.id,
        status: data.status ? 'SENT' : 'FAILED',
      };
    }
    
    // Contoh untuk Baileys (lebih kompleks, perlu koneksi persistent)
    // Bisa diimplementasikan terpisah
    
    throw new Error(`Provider ${this.provider} not implemented`);
  }

  /**
   * Kirim gambar dengan caption
   */
  async sendImage(phone, imageUrl, caption) {
    console.log(`[WhatsApp] Sending image to ${phone}: ${imageUrl}`);
    
    if (this.provider === 'mock') {
      return {
        success: true,
        messageId: `mock_img_${Date.now()}`,
        status: 'SENT',
      };
    }
    
    if (this.provider === 'fonnte') {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message: caption || 'Here is your photo!',
          url: imageUrl, // URL gambar
        }),
      });
      const data = await response.json();
      return {
        success: data.status,
        messageId: data.id,
        status: data.status ? 'SENT' : 'FAILED',
      };
    }
    
    throw new Error(`Provider ${this.provider} not implemented`);
  }

  /**
   * Cek status pengiriman
   */
  async checkStatus(messageId) {
    if (this.provider === 'mock') {
      return { status: 'DELIVERED' };
    }
    // Implementasi sesuai provider
    return { status: 'UNKNOWN' };
  }
}

// Singleton instance
let instance = null;

const getWhatsAppService = () => {
  if (!instance) {
    const config = {
      provider: process.env.WHATSAPP_PROVIDER || 'mock',
      apiKey: process.env.WHATSAPP_API_KEY,
      apiUrl: process.env.WHATSAPP_API_URL,
    };
    instance = new WhatsAppService(config);
  }
  return instance;
};

module.exports = { getWhatsAppService };
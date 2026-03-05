// utils/eventHelpers.js

/**
 * Generate slug dari nama mempelai
 * Format: [groomName]-[brideName]-[random]
 */
const generateSlug = (groomName, brideName) => {
  const base = `${groomName}-${brideName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Tambahkan timestamp pendek untuk uniqueness
  const timestamp = Date.now().toString(36).substring(0, 4);
  return `${base}-${timestamp}`;
};

/**
 * Generate short code 6 karakter
 * Format: Huruf kapital + angka (contoh: AB7C3D)
 */
const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Format response event
 */
const formatEventResponse = (event) => {
  return {
    id: event.id,
    slug: event.slug,
    shortCode: event.shortCode,
    weddingTitle: event.weddingTitle,
    couple: {
      groom: {
        name: event.groomName,
        nickname: event.groomNickname,
        fatherName: event.groomFatherName,
        motherName: event.groomMotherName,
        photoUrl: event.groomPhotoUrl,
      },
      bride: {
        name: event.brideName,
        nickname: event.brideNickname,
        fatherName: event.brideFatherName,
        motherName: event.brideMotherName,
        photoUrl: event.bridePhotoUrl,
      },
    },
    weddingDate: event.weddingDate,
    weddingDateHijri: event.weddingDateHijri,
    religion: event.religion,
    venue: {
      name: event.venueName,
      type: event.venueType,
      address: event.venueAddress,
      city: event.venueCity,
      province: event.venueProvince,
      googleMapsUrl: event.googleMapsUrl,
      latitude: event.venueLatitude,
      longitude: event.venueLongitude,
    },
    branding: {
      primaryColor: event.primaryColor,
      secondaryColor: event.secondaryColor,
      fontFamily: event.fontFamily,
      logoUrl: event.logoUrl,
      coverImageUrl: event.coverImageUrl,
      galleryImages: event.galleryImages,
    },
    content: {
      loveStory: event.loveStory,
      greetingText: event.greetingText,
    },
    settings: {
      invitationType: event.invitationType,
      isActive: event.isActive,
      isPublished: event.isPublished,
      publishedAt: event.publishedAt,
      enableRSVP: event.enableRSVP,
      enablePhotoBoothWA: event.enablePhotoBoothWA,
      autoSendPhotoToWA: event.autoSendPhotoToWA,
      enableGuestWishes: event.enableGuestWishes,
      enableLiveCount: event.enableLiveCount,
      allowWalkIn: event.allowWalkIn,
      requireRSVPToCheckIn: event.requireRSVPToCheckIn,
    },
    counters: {
      totalGuests: event.totalGuests,
      confirmedCount: event.confirmedCount,
      attendedCount: event.attendedCount,
      wishesCount: event.wishesCount,
    },
    timestamps: {
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    },
    ...(event.sessions && { sessions: event.sessions }),
    ...(event._count && { stats: event._count }),
  };
};

module.exports = {
  generateSlug,
  generateShortCode,
  formatEventResponse,
};
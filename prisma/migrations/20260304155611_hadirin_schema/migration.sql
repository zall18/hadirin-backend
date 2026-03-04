-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('INVITED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RSVPStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR_SCAN', 'MANUAL_SEARCH', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('INDOOR', 'OUTDOOR', 'BALLROOM', 'GARDEN', 'BEACH', 'MASJID', 'CHURCH', 'TEMPLE', 'GEDUNG', 'HOTEL', 'VILLA', 'OTHER');

-- CreateEnum
CREATE TYPE "ReligionType" AS ENUM ('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'OTHER');

-- CreateEnum
CREATE TYPE "PhotoDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENDING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "EventSessionType" AS ENUM ('AKAD', 'RESEPSI', 'PENGAJIAN', 'LAMARAN', 'OTHER');

-- CreateEnum
CREATE TYPE "GuestCategory" AS ENUM ('FAMILY', 'RELATIVE', 'FRIEND', 'COLLEAGUE', 'VVIP', 'VIP', 'VENDOR', 'MEDIA', 'REGULAR');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "shortCode" VARCHAR(6) NOT NULL,
    "groomName" TEXT NOT NULL,
    "groomNickname" TEXT,
    "groomFatherName" TEXT,
    "groomMotherName" TEXT,
    "groomPhotoUrl" TEXT,
    "brideName" TEXT NOT NULL,
    "brideNickname" TEXT,
    "brideFatherName" TEXT,
    "brideMotherName" TEXT,
    "bridePhotoUrl" TEXT,
    "weddingTitle" TEXT NOT NULL,
    "religion" "ReligionType",
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "weddingDateHijri" TEXT,
    "venueName" TEXT NOT NULL,
    "venueType" "VenueType" NOT NULL,
    "venueAddress" TEXT NOT NULL,
    "venueCity" TEXT,
    "venueProvince" TEXT,
    "googleMapsUrl" TEXT,
    "venueLatitude" DOUBLE PRECISION,
    "venueLongitude" DOUBLE PRECISION,
    "primaryColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "secondaryColor" TEXT NOT NULL DEFAULT '#F9A8D4',
    "fontFamily" TEXT NOT NULL DEFAULT 'serif',
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "galleryImages" TEXT[],
    "loveStory" TEXT,
    "greetingText" TEXT,
    "invitationType" "InvitationType" NOT NULL DEFAULT 'PRIVATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "enableRSVP" BOOLEAN NOT NULL DEFAULT true,
    "enablePhotoBoothWA" BOOLEAN NOT NULL DEFAULT false,
    "autoSendPhotoToWA" BOOLEAN NOT NULL DEFAULT false,
    "enableGuestWishes" BOOLEAN NOT NULL DEFAULT true,
    "enableLiveCount" BOOLEAN NOT NULL DEFAULT true,
    "allowWalkIn" BOOLEAN NOT NULL DEFAULT true,
    "requireRSVPToCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "attendedCount" INTEGER NOT NULL DEFAULT 0,
    "wishesCount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSession" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sessionType" "EventSessionType" NOT NULL DEFAULT 'RESEPSI',
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT,
    "venueType" "VenueType",
    "venueAddress" TEXT,
    "googleMapsUrl" TEXT,
    "hasCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "checkInOpenAt" TIMESTAMP(3),
    "checkInCloseAt" TIMESTAMP(3),
    "maxCapacity" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEventAccess" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "permissions" TEXT[],
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserEventAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" TEXT,
    "title" TEXT,
    "category" "GuestCategory" NOT NULL DEFAULT 'REGULAR',
    "groupName" TEXT,
    "tags" TEXT[],
    "invitedCount" INTEGER NOT NULL DEFAULT 1,
    "plusOneAllowed" INTEGER NOT NULL DEFAULT 0,
    "actualCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GuestStatus" NOT NULL DEFAULT 'INVITED',
    "qrCode" TEXT NOT NULL,
    "shortId" VARCHAR(8) NOT NULL,
    "rsvpStatus" "RSVPStatus" NOT NULL DEFAULT 'PENDING',
    "rsvpNote" TEXT,
    "rsvpDate" TIMESTAMP(3),
    "rsvpIp" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "waInvitationSentAt" TIMESTAMP(3),
    "waMessageId" TEXT,
    "notes" TEXT,
    "seatNumber" TEXT,
    "giftNote" TEXT,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInLog" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "sessionId" INTEGER,
    "arrivedCount" INTEGER NOT NULL DEFAULT 1,
    "method" "CheckInMethod" NOT NULL,
    "checkedInById" INTEGER,
    "photoId" INTEGER,
    "deviceType" TEXT,
    "deviceBrowser" TEXT,
    "ipAddress" TEXT,
    "note" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "originalPath" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "eventId" INTEGER NOT NULL,
    "guestId" INTEGER,
    "takenById" INTEGER,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waStatus" "PhotoDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "waMessageId" TEXT,
    "waError" TEXT,
    "waSentAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLog" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "templateId" TEXT,
    "toPhone" VARCHAR(20) NOT NULL,
    "toName" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'INVITATION',
    "caption" TEXT,
    "photoId" INTEGER,
    "guestId" INTEGER,
    "eventId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "errorCode" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestWish" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromPhone" VARCHAR(20),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "eventId" INTEGER NOT NULL,
    "guestId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestImport" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventStats" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "guestsInvited" INTEGER NOT NULL DEFAULT 0,
    "guestsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "guestsAttended" INTEGER NOT NULL DEFAULT 0,
    "guestsPending" INTEGER NOT NULL DEFAULT 0,
    "guestsCancelled" INTEGER NOT NULL DEFAULT 0,
    "guestsNoShow" INTEGER NOT NULL DEFAULT 0,
    "rsvpConfirmed" INTEGER NOT NULL DEFAULT 0,
    "rsvpDeclined" INTEGER NOT NULL DEFAULT 0,
    "rsvpPending" INTEGER NOT NULL DEFAULT 0,
    "checkInsLastHour" INTEGER NOT NULL DEFAULT 0,
    "peakHour" TEXT,
    "peakHourCount" INTEGER NOT NULL DEFAULT 0,
    "photosTaken" INTEGER NOT NULL DEFAULT 0,
    "photosSent" INTEGER NOT NULL DEFAULT 0,
    "photosFailed" INTEGER NOT NULL DEFAULT 0,
    "totalWishes" INTEGER NOT NULL DEFAULT 0,
    "snapshotTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_shortCode_key" ON "Event"("shortCode");

-- CreateIndex
CREATE INDEX "Event_slug_idx" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_shortCode_idx" ON "Event"("shortCode");

-- CreateIndex
CREATE INDEX "Event_ownerId_idx" ON "Event"("ownerId");

-- CreateIndex
CREATE INDEX "Event_isActive_isPublished_idx" ON "Event"("isActive", "isPublished");

-- CreateIndex
CREATE INDEX "Event_weddingDate_idx" ON "Event"("weddingDate");

-- CreateIndex
CREATE INDEX "EventSession_eventId_date_idx" ON "EventSession"("eventId", "date");

-- CreateIndex
CREATE INDEX "EventSession_sessionType_idx" ON "EventSession"("sessionType");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "UserEventAccess_userId_idx" ON "UserEventAccess"("userId");

-- CreateIndex
CREATE INDEX "UserEventAccess_eventId_idx" ON "UserEventAccess"("eventId");

-- CreateIndex
CREATE INDEX "UserEventAccess_role_idx" ON "UserEventAccess"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserEventAccess_userId_eventId_key" ON "UserEventAccess"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_qrCode_key" ON "Guest"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_shortId_key" ON "Guest"("shortId");

-- CreateIndex
CREATE INDEX "Guest_eventId_idx" ON "Guest"("eventId");

-- CreateIndex
CREATE INDEX "Guest_phone_idx" ON "Guest"("phone");

-- CreateIndex
CREATE INDEX "Guest_qrCode_idx" ON "Guest"("qrCode");

-- CreateIndex
CREATE INDEX "Guest_shortId_idx" ON "Guest"("shortId");

-- CreateIndex
CREATE INDEX "Guest_status_idx" ON "Guest"("status");

-- CreateIndex
CREATE INDEX "Guest_category_idx" ON "Guest"("category");

-- CreateIndex
CREATE INDEX "Guest_rsvpStatus_idx" ON "Guest"("rsvpStatus");

-- CreateIndex
CREATE INDEX "Guest_eventId_status_idx" ON "Guest"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_eventId_phone_key" ON "Guest"("eventId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInLog_photoId_key" ON "CheckInLog"("photoId");

-- CreateIndex
CREATE INDEX "CheckInLog_eventId_checkedInAt_idx" ON "CheckInLog"("eventId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckInLog_guestId_idx" ON "CheckInLog"("guestId");

-- CreateIndex
CREATE INDEX "CheckInLog_checkedInById_idx" ON "CheckInLog"("checkedInById");

-- CreateIndex
CREATE INDEX "CheckInLog_method_idx" ON "CheckInLog"("method");

-- CreateIndex
CREATE INDEX "CheckInLog_sessionId_idx" ON "CheckInLog"("sessionId");

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_takenAt_idx" ON "EventPhoto"("eventId", "takenAt");

-- CreateIndex
CREATE INDEX "EventPhoto_guestId_idx" ON "EventPhoto"("guestId");

-- CreateIndex
CREATE INDEX "EventPhoto_waStatus_idx" ON "EventPhoto"("waStatus");

-- CreateIndex
CREATE INDEX "EventPhoto_takenById_idx" ON "EventPhoto"("takenById");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLog_messageId_key" ON "WhatsAppLog"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppLog_eventId_sentAt_idx" ON "WhatsAppLog"("eventId", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsAppLog_toPhone_idx" ON "WhatsAppLog"("toPhone");

-- CreateIndex
CREATE INDEX "WhatsAppLog_guestId_idx" ON "WhatsAppLog"("guestId");

-- CreateIndex
CREATE INDEX "WhatsAppLog_photoId_idx" ON "WhatsAppLog"("photoId");

-- CreateIndex
CREATE INDEX "WhatsAppLog_status_idx" ON "WhatsAppLog"("status");

-- CreateIndex
CREATE INDEX "WhatsAppLog_messageType_idx" ON "WhatsAppLog"("messageType");

-- CreateIndex
CREATE INDEX "GuestWish_eventId_createdAt_idx" ON "GuestWish"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestWish_guestId_idx" ON "GuestWish"("guestId");

-- CreateIndex
CREATE INDEX "GuestWish_isPublic_isApproved_idx" ON "GuestWish"("isPublic", "isApproved");

-- CreateIndex
CREATE INDEX "GuestImport_eventId_idx" ON "GuestImport"("eventId");

-- CreateIndex
CREATE INDEX "GuestImport_uploadedById_idx" ON "GuestImport"("uploadedById");

-- CreateIndex
CREATE INDEX "GuestImport_status_idx" ON "GuestImport"("status");

-- CreateIndex
CREATE INDEX "EventStats_eventId_idx" ON "EventStats"("eventId");

-- CreateIndex
CREATE INDEX "EventStats_snapshotTime_idx" ON "EventStats"("snapshotTime");

-- CreateIndex
CREATE UNIQUE INDEX "EventStats_eventId_snapshotTime_key" ON "EventStats"("eventId", "snapshotTime");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSession" ADD CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventAccess" ADD CONSTRAINT "UserEventAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventAccess" ADD CONSTRAINT "UserEventAccess_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInLog" ADD CONSTRAINT "CheckInLog_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInLog" ADD CONSTRAINT "CheckInLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInLog" ADD CONSTRAINT "CheckInLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInLog" ADD CONSTRAINT "CheckInLog_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInLog" ADD CONSTRAINT "CheckInLog_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "EventPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "EventPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestWish" ADD CONSTRAINT "GuestWish_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestWish" ADD CONSTRAINT "GuestWish_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestImport" ADD CONSTRAINT "GuestImport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestImport" ADD CONSTRAINT "GuestImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStats" ADD CONSTRAINT "EventStats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

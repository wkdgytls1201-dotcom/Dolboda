-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('NURSING_HOSPITAL', 'NURSING_HOME', 'DAY_NIGHT_CARE', 'HOME_CARE', 'SILVER_TOWN');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('mock', 'public');

-- CreateEnum
CREATE TYPE "GradeSource" AS ENUM ('HIRA', 'NHIS');

-- CreateEnum
CREATE TYPE "CareRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CareLocationType" AS ENUM ('HOSPITAL', 'HOUSEKEEPING', 'HOME');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" "FacilityType" NOT NULL,
    "dataSource" "DataSource" NOT NULL,
    "gradeSource" "GradeSource" NOT NULL,
    "grade" INTEGER,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "establishedYear" INTEGER,
    "sourceUpdatedAt" TEXT NOT NULL,
    "parking" JSONB,
    "extra" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareAgreement" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "sitterProfileId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianSignature" TEXT,
    "guardianSignedAt" TIMESTAMP(3),
    "guardianSignedIp" TEXT,
    "guardianSignedUa" TEXT,
    "guardianEmail" TEXT,
    "sitterName" TEXT,
    "sitterSignature" TEXT,
    "sitterSignedAt" TIMESTAMP(3),
    "sitterSignedIp" TEXT,
    "sitterSignedUa" TEXT,
    "sitterEmail" TEXT,
    "copySentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareLog" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "sitterProfileId" TEXT NOT NULL,
    "careDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meal" TEXT,
    "mood" TEXT,
    "dayStatus" TEXT,
    "sleep" TEXT,
    "bowel" TEXT,
    "medication" TEXT,
    "tasks" TEXT[],
    "memo" TEXT,
    "alertNote" TEXT,
    "workStart" TEXT,
    "workEnd" TEXT,
    "photos" JSONB,
    "readAt" TIMESTAMP(3),
    "guardianReaction" TEXT,
    "correctsId" TEXT,

    CONSTRAINT "CareLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareQuickNote" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "sitterProfileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT,
    "careDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "CareQuickNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareLogReminder" (
    "careRequestId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareLogReminder_pkey" PRIMARY KEY ("careRequestId")
);

-- CreateTable
CREATE TABLE "FacilitySnapshot" (
    "id" BIGSERIAL NOT NULL,
    "facilityId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL,
    "waitlistCount" INTEGER NOT NULL,
    "grade" INTEGER,

    CONSTRAINT "FacilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "instCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sido" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "data" JSONB NOT NULL,
    "sourceDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOptOut" (
    "email" TEXT NOT NULL,
    "facilityId" TEXT,
    "facilityName" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOptOut_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "BusinessInquiry" (
    "id" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "registryType" TEXT NOT NULL,
    "registryNo" TEXT NOT NULL,
    "facilityId" TEXT,
    "managerName" TEXT NOT NULL,
    "managerRole" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "message" TEXT,
    "marketingConsentAt" TIMESTAMP(3),
    "status" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultRequest" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT,
    "profileSummary" JSONB,
    "status" TEXT,
    "facilityNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelfareConsultRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "userId" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelfareConsultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "vacancyAlert" BOOLEAN NOT NULL DEFAULT false,
    "gradeChangeAlert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityOwner" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "managerRole" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "approvedBy" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitySubscription" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "monthlyPrice" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilitySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityContent" (
    "facilityId" TEXT NOT NULL,
    "intro" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityContent_pkey" PRIMARY KEY ("facilityId")
);

-- CreateTable
CREATE TABLE "FacilityPost" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityDailyView" (
    "facilityId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FacilityDailyView_pkey" PRIMARY KEY ("facilityId","date")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "facilityId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("facilityId","kind","date")
);

-- CreateTable
CREATE TABLE "FacilityCorrection" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityBanner" (
    "facilityId" TEXT NOT NULL,
    "regionKey" TEXT NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityBanner_pkey" PRIMARY KEY ("facilityId")
);

-- CreateTable
CREATE TABLE "SponsorPlacement" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "regionKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "gender" TEXT,
    "ageBand" TEXT,
    "weightBand" TEXT,
    "mobilityLevel" TEXT,
    "mealAssistLevel" TEXT,
    "toiletAssistLevel" TEXT,
    "conditions" TEXT[],
    "ltcGrade" TEXT,
    "ltcCertNumber" TEXT,
    "birthDate" TEXT,
    "ltcCertValidFrom" TEXT,
    "estimatedBand" TEXT,
    "estimatedAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeTestReminder" (
    "careProfileId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeTestReminder_pkey" PRIMARY KEY ("careProfileId")
);

-- CreateTable
CREATE TABLE "SitterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "photoUrl" TEXT,
    "nationality" TEXT NOT NULL,
    "intro" TEXT,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "regions" TEXT[],
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountHolder" TEXT,
    "agreedAt" TIMESTAMP(3) NOT NULL,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "publicProfileAt" TIMESTAMP(3),
    "gender" TEXT,
    "ageBand" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterCertification" (
    "id" TEXT NOT NULL,
    "sitterProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitterCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitterJobAlertDelivery" (
    "userId" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitterJobAlertDelivery_pkey" PRIMARY KEY ("userId","careRequestId")
);

-- CreateTable
CREATE TABLE "SitterNotificationPref" (
    "userId" TEXT NOT NULL,
    "newJob" BOOLEAN NOT NULL DEFAULT true,
    "matchUpdate" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitterNotificationPref_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CareRequest" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "status" "CareRequestStatus" NOT NULL DEFAULT 'OPEN',
    "locationType" "CareLocationType" NOT NULL DEFAULT 'HOSPITAL',
    "region" TEXT NOT NULL,
    "locationNote" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "roundTheClock" BOOLEAN NOT NULL DEFAULT false,
    "recipientName" TEXT,
    "recipientRelation" TEXT,
    "recipientGender" TEXT,
    "recipientAgeBand" TEXT,
    "recipientWeightBand" TEXT,
    "situation" TEXT,
    "mobilityLevel" TEXT,
    "mealAssistLevel" TEXT,
    "toiletAssistLevel" TEXT,
    "needsMealAssist" BOOLEAN NOT NULL DEFAULT false,
    "needsToiletAssist" BOOLEAN NOT NULL DEFAULT false,
    "conditions" TEXT[],
    "householdTasks" TEXT[],
    "visitsPerWeek" INTEGER,
    "visitHours" INTEGER,
    "hospitalEntry" TEXT,
    "roomType" TEXT,
    "admissionReason" TEXT,
    "surgeryPlan" TEXT,
    "sitterGenderPref" TEXT NOT NULL DEFAULT '무관',
    "specialRequests" TEXT[],
    "requestNote" TEXT,
    "budgetAmount" INTEGER,
    "budgetUnit" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareRequestApplication" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "sitterProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '지원완료',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposedAmount" INTEGER,
    "proposedUnit" TEXT,
    "message" TEXT,

    CONSTRAINT "CareRequestApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareReview" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "sitterProfileId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "Facility_facilityType_idx" ON "Facility"("facilityType");

-- CreateIndex
CREATE INDEX "Facility_dataSource_idx" ON "Facility"("dataSource");

-- CreateIndex
CREATE UNIQUE INDEX "CareAgreement_careRequestId_key" ON "CareAgreement"("careRequestId");

-- CreateIndex
CREATE INDEX "CareAgreement_guardianId_idx" ON "CareAgreement"("guardianId");

-- CreateIndex
CREATE INDEX "CareAgreement_sitterProfileId_idx" ON "CareAgreement"("sitterProfileId");

-- CreateIndex
CREATE INDEX "CareLog_careRequestId_careDate_idx" ON "CareLog"("careRequestId", "careDate");

-- CreateIndex
CREATE INDEX "CareLog_sitterProfileId_idx" ON "CareLog"("sitterProfileId");

-- CreateIndex
CREATE INDEX "CareQuickNote_careRequestId_careDate_idx" ON "CareQuickNote"("careRequestId", "careDate");

-- CreateIndex
CREATE INDEX "FacilitySnapshot_date_idx" ON "FacilitySnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitySnapshot_facilityId_date_key" ON "FacilitySnapshot"("facilityId", "date");

-- CreateIndex
CREATE INDEX "Institution_instCode_idx" ON "Institution"("instCode");

-- CreateIndex
CREATE INDEX "Institution_name_idx" ON "Institution"("name");

-- CreateIndex
CREATE INDEX "Institution_serviceCode_idx" ON "Institution"("serviceCode");

-- CreateIndex
CREATE INDEX "BusinessInquiry_createdAt_idx" ON "BusinessInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessInquiry_status_idx" ON "BusinessInquiry"("status");

-- CreateIndex
CREATE INDEX "ConsultRequest_userId_idx" ON "ConsultRequest"("userId");

-- CreateIndex
CREATE INDEX "WelfareConsultRequest_userId_idx" ON "WelfareConsultRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FacilityFavorite_facilityId_vacancyAlert_idx" ON "FacilityFavorite"("facilityId", "vacancyAlert");

-- CreateIndex
CREATE INDEX "FacilityFavorite_userId_idx" ON "FacilityFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityFavorite_userId_facilityId_key" ON "FacilityFavorite"("userId", "facilityId");

-- CreateIndex
CREATE INDEX "AlertDelivery_createdAt_idx" ON "AlertDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDelivery_userId_facilityId_kind_date_key" ON "AlertDelivery"("userId", "facilityId", "kind", "date");

-- CreateIndex
CREATE INDEX "RegionInterest_region_idx" ON "RegionInterest"("region");

-- CreateIndex
CREATE UNIQUE INDEX "RegionInterest_userId_region_key" ON "RegionInterest"("userId", "region");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "FacilityOwner_facilityId_idx" ON "FacilityOwner"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityOwner_userId_idx" ON "FacilityOwner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityOwner_facilityId_userId_key" ON "FacilityOwner"("facilityId", "userId");

-- CreateIndex
CREATE INDEX "FacilitySubscription_facilityId_idx" ON "FacilitySubscription"("facilityId");

-- CreateIndex
CREATE INDEX "FacilitySubscription_status_idx" ON "FacilitySubscription"("status");

-- CreateIndex
CREATE INDEX "FacilityPost_facilityId_createdAt_idx" ON "FacilityPost"("facilityId", "createdAt");

-- CreateIndex
CREATE INDEX "FacilityCorrection_facilityId_idx" ON "FacilityCorrection"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityCorrection_status_idx" ON "FacilityCorrection"("status");

-- CreateIndex
CREATE INDEX "FacilityBanner_regionKey_active_idx" ON "FacilityBanner"("regionKey", "active");

-- CreateIndex
CREATE INDEX "SponsorPlacement_scope_regionKey_active_idx" ON "SponsorPlacement"("scope", "regionKey", "active");

-- CreateIndex
CREATE INDEX "SponsorPlacement_facilityId_idx" ON "SponsorPlacement"("facilityId");

-- CreateIndex
CREATE INDEX "CareProfile_userId_idx" ON "CareProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SitterProfile_userId_key" ON "SitterProfile"("userId");

-- CreateIndex
CREATE INDEX "CareRequest_status_region_idx" ON "CareRequest"("status", "region");

-- CreateIndex
CREATE UNIQUE INDEX "CareRequestApplication_careRequestId_sitterProfileId_key" ON "CareRequestApplication"("careRequestId", "sitterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CareReview_careRequestId_key" ON "CareReview"("careRequestId");

-- CreateIndex
CREATE INDEX "CareReview_sitterProfileId_idx" ON "CareReview"("sitterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "ConsultRequest" ADD CONSTRAINT "ConsultRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareConsultRequest" ADD CONSTRAINT "WelfareConsultRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityFavorite" ADD CONSTRAINT "FacilityFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionInterest" ADD CONSTRAINT "RegionInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityOwner" ADD CONSTRAINT "FacilityOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareProfile" ADD CONSTRAINT "CareProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterProfile" ADD CONSTRAINT "SitterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterCertification" ADD CONSTRAINT "SitterCertification_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitterNotificationPref" ADD CONSTRAINT "SitterNotificationPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequestApplication" ADD CONSTRAINT "CareRequestApplication_careRequestId_fkey" FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequestApplication" ADD CONSTRAINT "CareRequestApplication_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareReview" ADD CONSTRAINT "CareReview_careRequestId_fkey" FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareReview" ADD CONSTRAINT "CareReview_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "SitterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

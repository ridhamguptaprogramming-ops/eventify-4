import express from "express";
import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT ?? 3000);
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/eventify";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM ?? "no-reply@eventify.example.com";
const OWNER_EMAILS = (process.env.OWNER_EMAILS ?? "ridham.gupta.programming@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type UserRole = "admin" | "user" | "owner";
type EventStatus = "upcoming" | "ongoing" | "completed";

interface UserProfileDocument {
  _id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isVerified: boolean;
  verificationQRCode?: string;
  createdAt: string;
}

type StreamingProvider = 'google_meet' | 'youtube' | 'zoom' | 'custom' | 'none';

interface EventDocument {
  _id: string;
  title: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  attendeesCount: number;
  isHighlighted: boolean;
  statusOverride: boolean;
  maxAttendees: number;
  thumbnail: string;
  videoUrl?: string;
  isPaid: boolean;
  // Legacy aliases maintained for backward compatibility.
  date?: string;
  venue?: string;
  image?: string;
  capacity?: number;
  registeredCount?: number;
  streamingProvider?: StreamingProvider;
  streamingUrl?: string;
  eventType?: string;
  video?: string;
  qrCheckInEnabled?: boolean;
  registrationLimited?: boolean;
  isPublic?: boolean;
  autoHighlightAfterCompletion?: boolean;
}

interface RegistrationDocument {
  _id: string;
  uid: string;
  eventId: string;
  eventTitle: string;
  userEmail: string;
  userName: string;
  status: string;
  attended: boolean;
  registeredAt: string;
  qrCode: string;
  attendedAt?: string;
}

interface PlatformControlsDocument {
  _id: string;
  registrationsEnabled: boolean;
  eventCreationEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy?: string;
}

type SystemLogCategory = "event" | "user" | "admin" | "security" | "system";
type SystemLogSeverity = "info" | "success" | "warning" | "critical";

interface SystemLogDocument {
  _id: string;
  category: SystemLogCategory;
  action: string;
  message: string;
  severity: SystemLogSeverity;
  actorUid?: string;
  actorRole?: UserRole;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const userProfileSchema = new mongoose.Schema<UserProfileDocument>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ["admin", "user", "owner"], default: "user" },
    isVerified: { type: Boolean, default: false },
    verificationQRCode: { type: String, required: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const eventSchema = new mongoose.Schema<EventDocument>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    startDateTime: { type: String, required: true },
    endDateTime: { type: String, required: true },
    status: { type: String, enum: ["upcoming", "ongoing", "completed"], default: "upcoming" },
    attendeesCount: { type: Number, default: 0 },
    isHighlighted: { type: Boolean, default: false },
    statusOverride: { type: Boolean, default: false },
    // Legacy aliases maintained for backward compatibility.
    date: { type: String, required: false },
    venue: { type: String, required: false },
    maxAttendees: { type: Number, required: true },
    thumbnail: { type: String, required: true },
    videoUrl: { type: String, required: false },
    isPaid: { type: Boolean, default: false },
    registeredCount: { type: Number, default: 0 },
    streamingProvider: {
      type: String,
      enum: ['google_meet', 'youtube', 'zoom', 'custom', 'none'],
      default: 'none',
    },
    streamingUrl: { type: String, required: false },
    eventType: { type: String, default: 'conference' },
    qrCheckInEnabled: { type: Boolean, default: true },
    registrationLimited: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
    autoHighlightAfterCompletion: { type: Boolean, default: false },
  },
  { versionKey: false }
);

const registrationSchema = new mongoose.Schema<RegistrationDocument>(
  {
    _id: { type: String, required: true },
    uid: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventTitle: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    status: { type: String, default: "confirmed" },
    attended: { type: Boolean, default: false },
    registeredAt: { type: String, required: true },
    qrCode: { type: String, required: true },
    attendedAt: { type: String },
  },
  { versionKey: false }
);

registrationSchema.index({ uid: 1, eventId: 1 }, { unique: true });

const platformControlsSchema = new mongoose.Schema<PlatformControlsDocument>(
  {
    _id: { type: String, required: true },
    registrationsEnabled: { type: Boolean, default: true },
    eventCreationEnabled: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    updatedAt: { type: String, required: true },
    updatedBy: { type: String, required: false },
  },
  { versionKey: false }
);

const systemLogSchema = new mongoose.Schema<SystemLogDocument>(
  {
    _id: { type: String, required: true },
    category: { type: String, enum: ["event", "user", "admin", "security", "system"], required: true },
    action: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ["info", "success", "warning", "critical"], default: "info" },
    actorUid: { type: String, required: false },
    actorRole: { type: String, enum: ["admin", "user", "owner"], required: false },
    targetId: { type: String, required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const UserProfileModel =
  (mongoose.models.UserProfile as mongoose.Model<UserProfileDocument>) ||
  mongoose.model<UserProfileDocument>("UserProfile", userProfileSchema);
const EventModel =
  (mongoose.models.Event as mongoose.Model<EventDocument>) ||
  mongoose.model<EventDocument>("Event", eventSchema);
const RegistrationModel =
  (mongoose.models.Registration as mongoose.Model<RegistrationDocument>) ||
  mongoose.model<RegistrationDocument>("Registration", registrationSchema);
const PlatformControlsModel =
  (mongoose.models.PlatformControls as mongoose.Model<PlatformControlsDocument>) ||
  mongoose.model<PlatformControlsDocument>("PlatformControls", platformControlsSchema);
const SystemLogModel =
  (mongoose.models.SystemLog as mongoose.Model<SystemLogDocument>) ||
  mongoose.model<SystemLogDocument>("SystemLog", systemLogSchema);

const DEFAULT_EVENTS: EventDocument[] = [
  {
    _id: "1",
    title: "TechX 2026: The AI Revolution",
    description:
      "Join industry leaders for a deep dive into the future of artificial intelligence and its impact on society.",
    location: "Grand Innovation Hall, Silicon Valley",
    startDateTime: new Date(Date.now() + 86400000 * 7).toISOString(),
    endDateTime: new Date(Date.now() + 86400000 * 7 + 3 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    attendeesCount: 120,
    isHighlighted: false,
    statusOverride: false,
    date: new Date(Date.now() + 86400000 * 7).toISOString(),
    venue: "Grand Innovation Hall, Silicon Valley",
    thumbnail: "https://picsum.photos/seed/tech/800/600",
    maxAttendees: 500,
    registeredCount: 120,
    videoUrl: "",
    isPaid: false,
  },
  {
    _id: "2",
    title: "Design Systems Summit",
    description:
      "A gathering of world-class designers to discuss the evolution of design systems and user experience.",
    location: "The Creative Hub, New York",
    startDateTime: new Date(Date.now() + 86400000 * 14).toISOString(),
    endDateTime: new Date(Date.now() + 86400000 * 14 + 3 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    attendeesCount: 85,
    isHighlighted: false,
    statusOverride: false,
    date: new Date(Date.now() + 86400000 * 14).toISOString(),
    venue: "The Creative Hub, New York",
    thumbnail: "https://picsum.photos/seed/design/800/600",
    maxAttendees: 300,
    registeredCount: 85,
    videoUrl: "",
    isPaid: false,
  },
  {
    _id: "3",
    title: "Cloud Native Day",
    description:
      "Everything you need to know about Kubernetes, serverless, and the modern cloud infrastructure.",
    location: "Tech Park, London",
    startDateTime: new Date(Date.now() + 86400000 * 21).toISOString(),
    endDateTime: new Date(Date.now() + 86400000 * 21 + 3 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    attendeesCount: 210,
    isHighlighted: true,
    statusOverride: false,
    date: new Date(Date.now() + 86400000 * 21).toISOString(),
    venue: "Tech Park, London",
    thumbnail: "https://picsum.photos/seed/cloud/800/600",
    maxAttendees: 400,
    registeredCount: 210,
    videoUrl: "",
    isPaid: false,
  },
];

const MIN_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_EVENT_DURATION_MS = 4 * 60 * 60 * 1000;
const FALLBACK_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

function getDefaultEventDurationMs() {
  const configured = Number(process.env.DEFAULT_EVENT_DURATION_MS ?? FALLBACK_EVENT_DURATION_MS);
  if (!Number.isFinite(configured)) {
    return FALLBACK_EVENT_DURATION_MS;
  }
  return Math.min(Math.max(configured, MIN_EVENT_DURATION_MS), MAX_EVENT_DURATION_MS);
}

function parseDateInput(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function resolveEventWindow(input: {
  startDateTime?: string;
  endDateTime?: string;
  date?: string;
  fallbackStartDateTime?: string;
  fallbackEndDateTime?: string;
}) {
  const now = new Date();
  const start =
    parseDateInput(input.startDateTime) ||
    parseDateInput(input.date) ||
    parseDateInput(input.fallbackStartDateTime) ||
    now;
  const defaultEnd = new Date(start.getTime() + getDefaultEventDurationMs());
  const parsedEnd = parseDateInput(input.endDateTime) || parseDateInput(input.fallbackEndDateTime);
  const end = parsedEnd && parsedEnd.getTime() > start.getTime() ? parsedEnd : defaultEnd;

  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}

function deriveEventStatus(now: Date, startDateTime: Date, endDateTime: Date): EventStatus {
  if (now.getTime() < startDateTime.getTime()) {
    return "upcoming";
  }
  if (now.getTime() <= endDateTime.getTime()) {
    return "ongoing";
  }
  return "completed";
}

function normalizeEventState(doc: EventDocument, now = new Date()) {
  const location = (doc.location ?? doc.venue ?? "").trim() || "Location TBA";
  const { startDateTime, endDateTime } = resolveEventWindow({
    startDateTime: doc.startDateTime,
    endDateTime: doc.endDateTime,
    date: doc.date,
  });

  const parsedStart = new Date(startDateTime);
  const parsedEnd = new Date(endDateTime);
  const autoStatus = deriveEventStatus(now, parsedStart, parsedEnd);
  const statusOverride = Boolean((doc as Partial<EventDocument>).statusOverride);
  const resolvedStatus = statusOverride ? doc.status ?? autoStatus : autoStatus;
  const autoHighlightAfterCompletion = Boolean(doc.autoHighlightAfterCompletion);

  const attendeesCount =
    typeof doc.attendeesCount === "number"
      ? doc.attendeesCount
      : typeof doc.registeredCount === "number"
        ? doc.registeredCount
        : 0;
  const registeredCount =
    typeof doc.registeredCount === "number" ? doc.registeredCount : attendeesCount;
  const maxAttendees =
    typeof doc.maxAttendees === "number"
      ? doc.maxAttendees
      : typeof doc.capacity === "number"
        ? doc.capacity
        : 1;
  const thumbnail = (doc.thumbnail ?? doc.image ?? "").trim() || `https://picsum.photos/seed/${doc._id}/800/600`;
  const videoUrl = (doc.videoUrl ?? doc.video ?? "").trim();
  const isPaid = false;
  const isHighlighted =
    autoHighlightAfterCompletion && resolvedStatus === "completed"
      ? true
      : Boolean(doc.isHighlighted);

  const patch: Partial<EventDocument> = {};
  if (doc.location !== location) patch.location = location;
  if (doc.startDateTime !== startDateTime) patch.startDateTime = startDateTime;
  if (doc.endDateTime !== endDateTime) patch.endDateTime = endDateTime;
  if (doc.date !== startDateTime) patch.date = startDateTime;
  if (doc.venue !== location) patch.venue = location;
  if (doc.status !== resolvedStatus) patch.status = resolvedStatus;
  if (doc.statusOverride !== statusOverride) patch.statusOverride = statusOverride;
  if (doc.attendeesCount !== attendeesCount) patch.attendeesCount = attendeesCount;
  if (doc.registeredCount !== registeredCount) patch.registeredCount = registeredCount;
  if (doc.maxAttendees !== maxAttendees) patch.maxAttendees = maxAttendees;
  if (doc.thumbnail !== thumbnail) patch.thumbnail = thumbnail;
  if (doc.videoUrl !== videoUrl) patch.videoUrl = videoUrl;
  if (doc.isPaid !== isPaid) patch.isPaid = isPaid;
  if (doc.isHighlighted !== isHighlighted) patch.isHighlighted = isHighlighted;
  if (doc.autoHighlightAfterCompletion !== autoHighlightAfterCompletion) {
    patch.autoHighlightAfterCompletion = autoHighlightAfterCompletion;
  }

  return {
    patch,
    normalized: {
      ...doc,
      location,
      startDateTime,
      endDateTime,
      status: resolvedStatus,
      statusOverride,
      attendeesCount,
      registeredCount,
      maxAttendees,
      thumbnail,
      videoUrl,
      isPaid,
      isHighlighted,
      autoHighlightAfterCompletion,
      date: startDateTime,
      venue: location,
    } satisfies EventDocument,
  };
}

function mapProfile(doc: UserProfileDocument) {
  return {
    uid: doc._id,
    email: doc.email,
    displayName: doc.displayName,
    role: doc.role,
    isVerified: doc.isVerified,
    verificationQRCode: (doc as unknown as { verificationQRCode?: string }).verificationQRCode,
    createdAt: doc.createdAt,
  };
}

function mapEvent(doc: EventDocument) {
  const { normalized } = normalizeEventState(doc);
  return {
    id: normalized._id,
    title: normalized.title,
    description: normalized.description,
    location: normalized.location,
    startDateTime: normalized.startDateTime,
    endDateTime: normalized.endDateTime,
    status: normalized.status,
    attendeesCount: normalized.attendeesCount,
    isHighlighted: normalized.isHighlighted,
    // Legacy aliases for existing frontend compatibility.
    date: normalized.startDateTime,
    venue: normalized.location,
    image: normalized.thumbnail,
    capacity: normalized.maxAttendees,
    thumbnail: normalized.thumbnail,
    maxAttendees: normalized.maxAttendees,
    registeredCount: normalized.registeredCount,
    isPaid: false,
    streamingProvider: normalized.streamingProvider || "none",
    streamingUrl: normalized.streamingUrl || "",
    eventType: normalized.eventType || "conference",
    video: normalized.videoUrl || "",
    videoUrl: normalized.videoUrl || "",
    qrCheckInEnabled: normalized.qrCheckInEnabled ?? true,
    registrationLimited: normalized.registrationLimited ?? true,
    isPublic: normalized.isPublic ?? true,
    autoHighlightAfterCompletion: normalized.autoHighlightAfterCompletion ?? false,
  };
}

function createEventId() {
  return new mongoose.Types.ObjectId().toString();
}

function mapRegistration(doc: RegistrationDocument) {
  return {
    id: doc._id,
    uid: doc.uid,
    eventId: doc.eventId,
    eventTitle: doc.eventTitle,
    userEmail: doc.userEmail,
    userName: doc.userName,
    status: doc.status,
    attended: doc.attended,
    registeredAt: doc.registeredAt,
    qrCode: doc.qrCode,
    attendedAt: doc.attendedAt,
  };
}

function mapPlatformControls(doc: PlatformControlsDocument) {
  return {
    registrationsEnabled: doc.registrationsEnabled,
    eventCreationEnabled: doc.eventCreationEnabled,
    maintenanceMode: doc.maintenanceMode,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
  };
}

function mapSystemLog(doc: SystemLogDocument) {
  return {
    id: doc._id,
    category: doc.category,
    action: doc.action,
    message: doc.message,
    severity: doc.severity,
    actorUid: doc.actorUid,
    actorRole: doc.actorRole,
    targetId: doc.targetId,
    metadata: doc.metadata ?? {},
    createdAt: doc.createdAt,
  };
}

function createLogId() {
  return new mongoose.Types.ObjectId().toString();
}

async function appendSystemLog(entry: {
  category: SystemLogCategory;
  action: string;
  message: string;
  severity?: SystemLogSeverity;
  actorUid?: string;
  actorRole?: UserRole;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await SystemLogModel.create({
      _id: createLogId(),
      category: entry.category,
      action: entry.action,
      message: entry.message,
      severity: entry.severity ?? "info",
      actorUid: entry.actorUid,
      actorRole: entry.actorRole,
      targetId: entry.targetId,
      metadata: entry.metadata,
      createdAt: new Date().toISOString(),
    } satisfies SystemLogDocument);
  } catch (error) {
    console.error("Failed to append system log:", error);
  }
}

const ROLE_PRIORITY: Record<UserRole, number> = {
  user: 1,
  admin: 2,
  owner: 3,
};

function getActorUid(req: express.Request) {
  const headerUid =
    typeof req.headers["x-actor-uid"] === "string" ? req.headers["x-actor-uid"].trim() : "";
  if (headerUid) return headerUid;
  const queryUid = typeof req.query.actorUid === "string" ? req.query.actorUid.trim() : "";
  return queryUid;
}

async function resolveActor(req: express.Request) {
  const actorUid = getActorUid(req);
  if (!actorUid) {
    return {
      actorUid: "",
      actorRole: "user" as UserRole,
      actorProfile: null as UserProfileDocument | null,
    };
  }

  const profile = (await UserProfileModel.findById(actorUid).lean()) as UserProfileDocument | null;
  return {
    actorUid,
    actorRole: profile?.role ?? "user",
    actorProfile: profile,
  };
}

async function requireRole(
  req: express.Request,
  res: express.Response,
  role: UserRole
) {
  const actor = await resolveActor(req);

  if (!actor.actorUid || !actor.actorProfile) {
    await appendSystemLog({
      category: "security",
      action: "AUTH_MISSING_ACTOR",
      message: `Request denied for ${req.method} ${req.path}: missing actor profile.`,
      severity: "warning",
    });
    res.status(401).json({ message: "Missing actor context. Provide x-actor-uid header." });
    return null;
  }

  const hasAccess = ROLE_PRIORITY[actor.actorRole] >= ROLE_PRIORITY[role];
  if (!hasAccess) {
    await appendSystemLog({
      category: "security",
      action: "AUTH_ROLE_DENIED",
      message: `Role ${actor.actorRole} denied for ${req.method} ${req.path}.`,
      severity: "critical",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      metadata: {
        requiredRole: role,
        path: req.path,
        method: req.method,
      },
    });
    res.status(403).json({ message: `Requires ${role} role.` });
    return null;
  }

  return actor;
}

async function createMailTransporter() {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  console.info("Using ethereal email for verification notifications:", testAccount.user);

  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function sendVerificationEmail(email: string, displayName: string, qrValue: string) {
  const transporter = await createMailTransporter();
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;

  const subject = "Your Eventify verification is complete";
  const text = `Hello ${displayName || "user"},\n\nYour account is now officially verified.\n\nVerification code: ${qrValue}\n\nUse this QR code to access your verified services or entry tickets.\n\nThank you!`;
  const html = `
    <p>Hello ${displayName || "user"},</p>
    <p>Your account is now officially <strong>verified</strong>.</p>
    <p>QR data: <code>${qrValue}</code></p>
    <p><img src="${qrImageUrl}" alt="Verification QR code" style="max-width: 300px;"/></p>
    <p>Save this message for your records and use the QR code when required.</p>
    <p>Thanks,<br/>Eventify Team</p>
  `;

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.info("Verification email preview URL: ", previewUrl);
  }

  return info;
}

async function sendVerificationReminderEmail(email: string, displayName: string, qrValue: string) {
  const transporter = await createMailTransporter();
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;

  const subject = "Eventify verification reminder";
  const text = `Hello ${displayName || "user"},\n\nYour account is still pending verification.\n\nVerification code: ${qrValue}\n\nPlease keep this code ready and contact your event administrator for approval.\n\nThank you!`;
  const html = `
    <p>Hello ${displayName || "user"},</p>
    <p>Your account is currently <strong>pending verification</strong>.</p>
    <p>Verification code: <code>${qrValue}</code></p>
    <p><img src="${qrImageUrl}" alt="Verification QR code" style="max-width: 300px;"/></p>
    <p>Please keep this code ready and contact your event administrator for approval.</p>
    <p>Thanks,<br/>Eventify Team</p>
  `;

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.info("Verification reminder email preview URL: ", previewUrl);
  }

  return info;
}

async function connectToMongoDB() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB at ${MONGODB_URI}`);
}

async function seedDefaultEvents() {
  const count = await EventModel.countDocuments();
  if (count === 0) {
    await EventModel.insertMany(DEFAULT_EVENTS);
    console.log("Seeded default events into MongoDB.");
  }
}

async function ensurePlatformControls() {
  const existing = await PlatformControlsModel.findById("global").lean();
  if (existing) {
    return;
  }

  await PlatformControlsModel.create({
    _id: "global",
    registrationsEnabled: true,
    eventCreationEnabled: true,
    maintenanceMode: false,
    updatedAt: new Date().toISOString(),
  } satisfies PlatformControlsDocument);
}

async function ensureOwnerProfiles() {
  if (OWNER_EMAILS.length === 0) {
    return;
  }

  const users = (await UserProfileModel.find({
    email: { $in: OWNER_EMAILS },
  }).lean()) as UserProfileDocument[];

  if (users.length === 0) {
    return;
  }

  const ownerIds = users
    .filter((profile) => profile.role !== "owner")
    .map((profile) => profile._id);

  if (ownerIds.length === 0) {
    return;
  }

  await UserProfileModel.updateMany(
    { _id: { $in: ownerIds } },
    { $set: { role: "owner" } }
  );
}

async function cleanupLegacyPaymentData() {
  const [eventCleanup, registrationCleanup, userCleanup] = await Promise.all([
    EventModel.updateMany(
      {},
      {
        $set: { isPaid: false },
        $unset: {
          ticketPrice: 1,
          price: 1,
          paymentStatus: 1,
          paymentId: 1,
          transactionId: 1,
        },
      } as mongoose.UpdateQuery<EventDocument>
    ),
    RegistrationModel.updateMany(
      {},
      {
        $unset: {
          paymentStatus: 1,
          amountPaid: 1,
          paymentHistory: 1,
          paymentId: 1,
          transactionId: 1,
        },
      }
    ),
    UserProfileModel.updateMany(
      {},
      {
        $unset: {
          paymentStatus: 1,
          amountPaid: 1,
          paymentHistory: 1,
          paymentId: 1,
          transactionId: 1,
        },
      }
    ),
  ]);

  return {
    events: eventCleanup.modifiedCount ?? 0,
    registrations: registrationCleanup.modifiedCount ?? 0,
    users: userCleanup.modifiedCount ?? 0,
  };
}

async function syncEventStatuses() {
  const events = await EventModel.find({}).lean();
  if (events.length === 0) {
    return { checked: 0, updated: 0 };
  }

  const operations: mongoose.AnyBulkWriteOperation<EventDocument>[] = [];
  for (const rawEvent of events) {
    const event = rawEvent as EventDocument;
    const { patch } = normalizeEventState(event);
    if (Object.keys(patch).length === 0) {
      continue;
    }
    operations.push({
      updateOne: {
        filter: { _id: event._id },
        update: { $set: patch },
      },
    });
  }

  if (operations.length === 0) {
    return { checked: events.length, updated: 0 };
  }

  const result = await EventModel.bulkWrite(operations);
  return {
    checked: events.length,
    updated: result.modifiedCount ?? 0,
  };
}

async function startServer() {
  await connectToMongoDB();
  await seedDefaultEvents();
  await ensurePlatformControls();
  await ensureOwnerProfiles();
  const paymentCleanup = await cleanupLegacyPaymentData();
  await syncEventStatuses();
  console.log(
    `Payment cleanup complete (events=${paymentCleanup.events}, registrations=${paymentCleanup.registrations}, users=${paymentCleanup.users}).`
  );

  const app = express();
  const httpServer = createHttpServer(app);
  const statusSyncIntervalMs = Number(process.env.EVENT_STATUS_SYNC_MS ?? 60_000);
  const safeStatusSyncIntervalMs =
    Number.isFinite(statusSyncIntervalMs) && statusSyncIntervalMs > 0 ? statusSyncIntervalMs : 60_000;
  const statusSyncTimer = setInterval(() => {
    void syncEventStatuses().catch((error) => {
      console.error("Failed to sync event statuses:", error);
    });
  }, safeStatusSyncIntervalMs);
  statusSyncTimer.unref();

  app.use(express.json({ limit: "8mb" }));
  app.use(cors());

  app.get("/api/health", async (_req, res) => {
    res.json({
      ok: true,
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  });

  app.get("/api/events", async (_req, res) => {
    const actor = await resolveActor(_req);
    const controls = await PlatformControlsModel.findById("global").lean();
    const canAccessAdminScope = ROLE_PRIORITY[actor.actorRole] >= ROLE_PRIORITY.admin;
    const includeAll =
      canAccessAdminScope &&
      typeof _req.query.includeAll === "string" &&
      _req.query.includeAll === "true";

    if (controls?.maintenanceMode && !canAccessAdminScope) {
      res.status(503).json({ message: "Platform is in maintenance mode." });
      return;
    }

    await syncEventStatuses();
    const events = await EventModel.find({}).sort({ startDateTime: 1, date: 1 }).lean();
    const mapped = events.map((event) => mapEvent(event as EventDocument));
    const visibleEvents = includeAll ? mapped : mapped.filter((event) => event.isPublic !== false);
    res.json(visibleEvents);
  });

  app.post("/api/events", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const controls = await PlatformControlsModel.findById("global").lean();
    if (controls && !controls.eventCreationEnabled) {
      res.status(403).json({ message: "Event creation is currently disabled by platform controls." });
      return;
    }

    const payload = req.body as Partial<EventDocument>;

    const title = (payload.title ?? "").trim();
    const description = (payload.description ?? "").trim();
    const location = (payload.location ?? payload.venue ?? "").trim();
    const thumbnail = (payload.thumbnail ?? payload.image ?? "").trim();
    const maxAttendeesInput =
      payload.maxAttendees === undefined || payload.maxAttendees === null
        ? payload.capacity
        : payload.maxAttendees;
    const maxAttendees = Number(maxAttendeesInput);
    const startDateTimeInput = (payload.startDateTime ?? payload.date ?? "").trim();
    const endDateTimeInput = (payload.endDateTime ?? "").trim();
    const rawAttendeesCount =
      (payload as Partial<EventDocument> & { attendeesCount?: number; registeredCount?: number })
        .attendeesCount ??
      (payload as Partial<EventDocument> & { attendeesCount?: number; registeredCount?: number })
        .registeredCount ??
      0;
    const attendeesCount = Number(rawAttendeesCount);
    const isHighlighted = Boolean(payload.isHighlighted);

    if (!title || !description || !location || !startDateTimeInput) {
      res.status(400).json({ message: "title, description, location and startDateTime are required" });
      return;
    }

    if (Number.isNaN(maxAttendees) || maxAttendees < 1) {
      res.status(400).json({ message: "maxAttendees must be a number greater than 0" });
      return;
    }

    if (Number.isNaN(attendeesCount) || attendeesCount < 0) {
      res.status(400).json({ message: "attendeesCount must be a non-negative number" });
      return;
    }

    const { startDateTime, endDateTime } = resolveEventWindow({
      startDateTime: startDateTimeInput,
      endDateTime: endDateTimeInput,
    });
    const parsedStartDateTime = new Date(startDateTime);
    if (Number.isNaN(parsedStartDateTime.valueOf())) {
      res.status(400).json({ message: "startDateTime must be a valid date string" });
      return;
    }

    const streamingProvider =
      payload.streamingProvider && ['google_meet', 'youtube', 'zoom', 'custom', 'none'].includes(payload.streamingProvider)
        ? (payload.streamingProvider as StreamingProvider)
        : 'none';
    const streamingUrl = (payload.streamingUrl ?? '').trim();
    const eventType = (payload.eventType ?? "conference").trim() || "conference";
    const videoUrl = (payload.videoUrl ?? payload.video ?? "").trim();
    const qrCheckInEnabled =
      payload.qrCheckInEnabled === undefined ? true : Boolean(payload.qrCheckInEnabled);
    const registrationLimited =
      payload.registrationLimited === undefined ? true : Boolean(payload.registrationLimited);
    const isPublic = payload.isPublic === undefined ? true : Boolean(payload.isPublic);
    const autoHighlightAfterCompletion =
      payload.autoHighlightAfterCompletion === undefined
        ? false
        : Boolean(payload.autoHighlightAfterCompletion);

    if (streamingProvider !== 'none' && streamingUrl && !/^https?:\/\//i.test(streamingUrl)) {
      res.status(400).json({ message: 'streamingUrl must be a valid HTTP/HTTPS URL' });
      return;
    }

    const providedStatus = payload.status;
    const shouldOverrideStatus = Boolean(
      providedStatus && ["upcoming", "ongoing", "completed"].includes(providedStatus)
    );
    const autoStatus = deriveEventStatus(new Date(), parsedStartDateTime, new Date(endDateTime));
    const status = shouldOverrideStatus ? (providedStatus as EventStatus) : autoStatus;

    const newEvent = await EventModel.create({
      _id: createEventId(),
      title,
      description,
      location,
      startDateTime,
      endDateTime,
      status,
      statusOverride: shouldOverrideStatus,
      attendeesCount,
      isHighlighted,
      date: startDateTime,
      venue: location,
      thumbnail: thumbnail || `https://picsum.photos/seed/${Date.now()}/800/600`,
      maxAttendees,
      registeredCount: attendeesCount,
      isPaid: false,
      streamingProvider,
      streamingUrl,
      eventType,
      videoUrl,
      qrCheckInEnabled,
      registrationLimited,
      isPublic,
      autoHighlightAfterCompletion,
    });

    await appendSystemLog({
      category: "event",
      action: "EVENT_CREATED",
      message: `Event "${title}" was created.`,
      severity: "success",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: newEvent._id,
      metadata: {
        isPublic,
        eventType,
      },
    });

    res.status(201).json(mapEvent(newEvent.toObject() as EventDocument));
  });

  app.get("/api/events/:id", async (req, res) => {
    const actor = await resolveActor(req);
    const controls = await PlatformControlsModel.findById("global").lean();
    const canAccessAdminScope = ROLE_PRIORITY[actor.actorRole] >= ROLE_PRIORITY.admin;
    if (controls?.maintenanceMode && !canAccessAdminScope) {
      res.status(503).json({ message: "Platform is in maintenance mode." });
      return;
    }

    await syncEventStatuses();
    const event = await EventModel.findById(req.params.id).lean();
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const mapped = mapEvent(event as EventDocument);
    if (mapped.isPublic === false && !canAccessAdminScope) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.json(mapped);
  });

  app.put("/api/events/:id", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const payload = req.body as Partial<EventDocument>;
    const existing = await EventModel.findById(req.params.id).lean();

    if (!existing) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const normalizedExisting = normalizeEventState(existing as EventDocument).normalized;
    const title = (payload.title ?? existing.title ?? "").trim();
    const description = (payload.description ?? existing.description ?? "").trim();
    const location = (payload.location ?? payload.venue ?? normalizedExisting.location ?? "").trim();
    const thumbnail = (payload.thumbnail ?? payload.image ?? normalizedExisting.thumbnail ?? "").trim();
    const startDateTimeInput = (
      payload.startDateTime ??
      payload.date ??
      normalizedExisting.startDateTime
    ).trim();
    const endDateTimeInput = (
      payload.endDateTime ?? normalizedExisting.endDateTime
    ).trim();
    const maxAttendeesInput =
      payload.maxAttendees === undefined || payload.maxAttendees === null
        ? payload.capacity === undefined || payload.capacity === null
          ? Number(normalizedExisting.maxAttendees)
          : Number(payload.capacity)
        : Number(payload.maxAttendees);
    const maxAttendees = Number(maxAttendeesInput);
    const rawAttendeesCount =
      (payload as Partial<EventDocument> & { attendeesCount?: number; registeredCount?: number })
        .attendeesCount ??
      (payload as Partial<EventDocument> & { attendeesCount?: number; registeredCount?: number })
        .registeredCount ??
      normalizedExisting.attendeesCount;
    const attendeesCount = Number(rawAttendeesCount);
    const isHighlighted =
      payload.isHighlighted === undefined ? normalizedExisting.isHighlighted : Boolean(payload.isHighlighted);
    const clearStatusOverride = Boolean(
      (payload as Partial<EventDocument> & { clearStatusOverride?: boolean }).clearStatusOverride
    );

    if (!title || !description || !location || !startDateTimeInput) {
      res.status(400).json({ message: "title, description, location and startDateTime are required" });
      return;
    }

    if (Number.isNaN(maxAttendees) || maxAttendees < 1) {
      res.status(400).json({ message: "maxAttendees must be a number greater than 0" });
      return;
    }

    if (Number.isNaN(attendeesCount) || attendeesCount < 0) {
      res.status(400).json({ message: "attendeesCount must be a non-negative number" });
      return;
    }

    const { startDateTime, endDateTime } = resolveEventWindow({
      startDateTime: startDateTimeInput,
      endDateTime: endDateTimeInput,
      fallbackStartDateTime: normalizedExisting.startDateTime,
      fallbackEndDateTime: normalizedExisting.endDateTime,
    });
    const parsedStartDateTime = new Date(startDateTime);
    if (Number.isNaN(parsedStartDateTime.valueOf())) {
      res.status(400).json({ message: "startDateTime must be a valid date string" });
      return;
    }

    const streamingProvider =
      payload.streamingProvider && ['google_meet', 'youtube', 'zoom', 'custom', 'none'].includes(payload.streamingProvider)
        ? (payload.streamingProvider as StreamingProvider)
        : existing.streamingProvider || 'none';
    const streamingUrl =
      (payload.streamingUrl ?? existing.streamingUrl ?? "").trim();
    const eventType = (payload.eventType ?? existing.eventType ?? "conference").trim() || "conference";
    const videoUrl = (payload.videoUrl ?? payload.video ?? normalizedExisting.videoUrl ?? "").trim();
    const qrCheckInEnabled =
      payload.qrCheckInEnabled === undefined
        ? (existing.qrCheckInEnabled ?? true)
        : Boolean(payload.qrCheckInEnabled);
    const registrationLimited =
      payload.registrationLimited === undefined
        ? (existing.registrationLimited ?? true)
        : Boolean(payload.registrationLimited);
    const isPublic =
      payload.isPublic === undefined ? (existing.isPublic ?? true) : Boolean(payload.isPublic);
    const autoHighlightAfterCompletion =
      payload.autoHighlightAfterCompletion === undefined
        ? (existing.autoHighlightAfterCompletion ?? false)
        : Boolean(payload.autoHighlightAfterCompletion);

    if (streamingProvider !== 'none' && streamingUrl && !/^https?:\/\//i.test(streamingUrl)) {
      res.status(400).json({ message: 'streamingUrl must be a valid HTTP/HTTPS URL' });
      return;
    }

    const now = new Date();
    const providedStatus = payload.status;
    const validProvidedStatus =
      providedStatus && ["upcoming", "ongoing", "completed"].includes(providedStatus)
        ? (providedStatus as EventStatus)
        : undefined;

    const autoStatus = deriveEventStatus(now, parsedStartDateTime, new Date(endDateTime));
    const statusOverride =
      clearStatusOverride
        ? false
        : validProvidedStatus
          ? true
          : normalizedExisting.statusOverride;
    const status = statusOverride
      ? validProvidedStatus ?? normalizedExisting.status
      : autoStatus;

    const updated = await EventModel.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        location,
        thumbnail: thumbnail || "https://picsum.photos/seed/event/800/600",
        startDateTime,
        endDateTime,
        status,
        statusOverride,
        attendeesCount,
        isHighlighted,
        date: startDateTime,
        venue: location,
        maxAttendees,
        registeredCount: attendeesCount,
        isPaid: false,
        streamingProvider,
        streamingUrl: streamingProvider === 'none' ? '' : streamingUrl,
        eventType,
        videoUrl,
        qrCheckInEnabled,
        registrationLimited,
        isPublic,
        autoHighlightAfterCompletion,
      },
      { new: true }
    ).lean();

    await appendSystemLog({
      category: "event",
      action: "EVENT_UPDATED",
      message: `Event "${title}" was updated.`,
      severity: "info",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: req.params.id,
      metadata: {
        isPublic,
        eventType,
      },
    });

    res.json(mapEvent(updated as EventDocument));
  });

  app.patch("/api/events/:id/mark-completed", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const existing = await EventModel.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const normalizedExisting = normalizeEventState(existing as EventDocument).normalized;
    const nowIso = new Date().toISOString();
    const endDateTime =
      new Date(normalizedExisting.endDateTime).getTime() > Date.now()
        ? nowIso
        : normalizedExisting.endDateTime;

    const updated = await EventModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        statusOverride: true,
        endDateTime,
      },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await appendSystemLog({
      category: "event",
      action: "EVENT_FORCED_COMPLETE",
      message: `Event "${updated.title}" marked as completed.`,
      severity: "warning",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updated._id,
    });

    res.json(mapEvent(updated as EventDocument));
  });

  app.delete("/api/events/:id", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const deletedEvent = await EventModel.findByIdAndDelete(req.params.id).lean();

    if (!deletedEvent) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await RegistrationModel.deleteMany({ eventId: req.params.id });

    await appendSystemLog({
      category: "event",
      action: "EVENT_DELETED",
      message: `Event "${deletedEvent.title}" was deleted.`,
      severity: "critical",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: deletedEvent._id,
    });

    res.json(mapEvent(deletedEvent as EventDocument));
  });

  app.get("/api/users/:uid/profile", async (req, res) => {
    const profile = await UserProfileModel.findById(req.params.uid).lean();
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    res.json(mapProfile(profile as UserProfileDocument));
  });

  app.put("/api/users/:uid/profile", async (req, res) => {
    const payload = req.body as Partial<UserProfileDocument>;
    const existingProfile = await UserProfileModel.findById(req.params.uid).lean();
    const normalizedEmail = (payload.email ?? existingProfile?.email ?? "").trim().toLowerCase();
    const resolvedRole: UserRole = OWNER_EMAILS.includes(normalizedEmail)
      ? "owner"
      : (existingProfile?.role ?? "user");

    const profile = await UserProfileModel.findByIdAndUpdate(
      req.params.uid,
      {
        _id: req.params.uid,
        email: payload.email ?? "",
        displayName: payload.displayName ?? "",
        role: resolvedRole,
        isVerified: payload.isVerified ?? false,
        verificationQRCode: (payload as unknown as { verificationQRCode?: string }).verificationQRCode,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await appendSystemLog({
      category: "security",
      action: "LOGIN_ACTIVITY",
      message: `Profile sync for ${payload.email ?? req.params.uid}.`,
      severity: "info",
      actorUid: req.params.uid,
      actorRole: resolvedRole,
      targetId: req.params.uid,
    });

    res.json(mapProfile(profile as UserProfileDocument));
  });

  app.get("/api/registrations", async (req, res) => {
    const uid = typeof req.query.uid === "string" ? req.query.uid : undefined;
    const eventId = typeof req.query.eventId === "string" ? req.query.eventId : undefined;

    const filter: { uid?: string; eventId?: string } = {};
    if (uid) filter.uid = uid;
    if (eventId) filter.eventId = eventId;

    const registrations = await RegistrationModel.find(filter)
      .sort({ registeredAt: -1 })
      .lean();
    res.json(registrations.map((registration) => mapRegistration(registration as RegistrationDocument)));
  });

  app.get("/api/registrations/check", async (req, res) => {
    const uid = typeof req.query.uid === "string" ? req.query.uid : "";
    const eventId = typeof req.query.eventId === "string" ? req.query.eventId : "";

    if (!uid || !eventId) {
      res.status(400).json({ message: "uid and eventId are required" });
      return;
    }

    const registration = await RegistrationModel.findOne({ uid, eventId }).lean();
    res.json({
      registered: Boolean(registration),
      registration: registration ? mapRegistration(registration as RegistrationDocument) : null,
    });
  });

  app.post("/api/registrations", async (req, res) => {
    const actor = await resolveActor(req);
    const controls = await PlatformControlsModel.findById("global").lean();
    const canAccessAdminScope = ROLE_PRIORITY[actor.actorRole] >= ROLE_PRIORITY.admin;

    if (controls?.maintenanceMode && !canAccessAdminScope) {
      res.status(503).json({ message: "Registrations are unavailable during maintenance mode." });
      return;
    }
    if (controls && !controls.registrationsEnabled && !canAccessAdminScope) {
      res.status(403).json({ message: "Registrations are currently disabled by platform controls." });
      return;
    }

    await syncEventStatuses();
    const payload = req.body as Partial<RegistrationDocument>;
    const { uid, eventId, userEmail, userName } = payload;

    if (!uid || !eventId || !userEmail || !userName) {
      res.status(400).json({ message: "uid, eventId, userEmail and userName are required" });
      return;
    }

    const rawEvent = await EventModel.findById(eventId).lean();
    if (!rawEvent) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    const event = normalizeEventState(rawEvent as EventDocument).normalized;
    if (event.isPublic === false && !canAccessAdminScope) {
      res.status(403).json({ message: "This event is private and not open for registration." });
      return;
    }
    if (event.status === "completed") {
      res.status(409).json({ message: "This event has ended." });
      return;
    }

    const registrationId = `${uid}_${eventId}`;
    const existingRegistration = await RegistrationModel.findById(registrationId).lean();
    if (existingRegistration) {
      res.status(409).json({ message: "You are already registered for this event." });
      return;
    }

    const currentCount = await RegistrationModel.countDocuments({ eventId });
    const baselineCount = Math.max(currentCount, event.attendeesCount);
    if (baselineCount >= event.maxAttendees) {
      res.status(409).json({ message: "This event is full." });
      return;
    }

    const newRegistration = await RegistrationModel.create({
      _id: registrationId,
      uid,
      eventId,
      eventTitle: event.title,
      userEmail,
      userName,
      status: payload.status ?? "confirmed",
      attended: false,
      registeredAt: new Date().toISOString(),
      qrCode: payload.qrCode ?? registrationId,
    });

    await EventModel.findByIdAndUpdate(eventId, {
      attendeesCount: baselineCount + 1,
      registeredCount: baselineCount + 1,
    });

    await appendSystemLog({
      category: "user",
      action: "REGISTRATION_CREATED",
      message: `${userName} registered for "${event.title}".`,
      severity: "success",
      actorUid: uid,
      actorRole: actor.actorRole,
      targetId: registrationId,
      metadata: { eventId },
    });

    res.status(201).json(mapRegistration(newRegistration.toObject() as RegistrationDocument));
  });

  app.delete("/api/registrations/:id", async (req, res) => {
    const deleted = await RegistrationModel.findByIdAndDelete(req.params.id).lean();

    if (!deleted) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    const remainingRegistrations = await RegistrationModel.countDocuments({ eventId: deleted.eventId });
    await EventModel.findByIdAndUpdate(deleted.eventId, {
      attendeesCount: Math.max(remainingRegistrations, 0),
      registeredCount: Math.max(remainingRegistrations, 0),
    });

    await appendSystemLog({
      category: "user",
      action: "REGISTRATION_DELETED",
      message: `Registration ${deleted._id} for "${deleted.eventTitle}" was removed.`,
      severity: "warning",
      actorUid: deleted.uid,
      actorRole: "user",
      targetId: deleted._id,
      metadata: {
        eventId: deleted.eventId,
      },
    });

    res.json(mapRegistration(deleted as RegistrationDocument));
  });

  app.patch("/api/registrations/:id/attendance", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const attended = Boolean((req.body as { attended?: boolean }).attended ?? true);

    const updated = await RegistrationModel.findByIdAndUpdate(
      req.params.id,
      {
        attended,
        attendedAt: attended ? new Date().toISOString() : undefined,
      },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    await appendSystemLog({
      category: "admin",
      action: attended ? "REGISTRATION_MARKED_ATTENDED" : "REGISTRATION_UNMARKED_ATTENDED",
      message: `Registration ${updated._id} attendance set to ${attended}.`,
      severity: "info",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updated._id,
    });

    res.json(mapRegistration(updated as RegistrationDocument));
  });

  app.get("/api/admin/users", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const verifiedQuery = typeof req.query.verified === "string" ? req.query.verified : undefined;
    const filter: { isVerified?: boolean } = {};

    if (verifiedQuery === "true") {
      filter.isVerified = true;
    }

    if (verifiedQuery === "false") {
      filter.isVerified = false;
    }

    const users = await UserProfileModel.find(filter).sort({ createdAt: -1 }).lean();
    res.json(users.map((user) => mapProfile(user as UserProfileDocument)));
  });

  app.patch("/api/admin/users/:uid/verify", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const qrValue = `verification:${req.params.uid}:${Date.now()}`;
    const updatedUser = await UserProfileModel.findByIdAndUpdate(
      req.params.uid,
      { isVerified: true, verificationQRCode: qrValue },
      { new: true }
    ).lean();

    if (!updatedUser) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    try {
      await sendVerificationEmail(updatedUser.email, updatedUser.displayName, qrValue);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Continue to return success for verification, but inform in response.
      return res.status(200).json({
        ...mapProfile(updatedUser as UserProfileDocument),
        warning: "User verified, but email notification failed.",
      });
    }

    res.json({
      ...mapProfile(updatedUser as UserProfileDocument),
      verificationQRCode: qrValue,
      message: "User verified and notification email sent.",
    });

    await appendSystemLog({
      category: "admin",
      action: "USER_VERIFIED",
      message: `User ${updatedUser.email} was verified.`,
      severity: "success",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updatedUser._id,
    });
  });

  app.post("/api/admin/users/:uid/resend-verification", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const user = await UserProfileModel.findById(req.params.uid).lean();

    if (!user) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    const qrValue = user.verificationQRCode ?? `pending-verification:${req.params.uid}:${Date.now()}`;

    let updatedUser = user as unknown as UserProfileDocument;
    if (!user.verificationQRCode) {
      const saved = await UserProfileModel.findByIdAndUpdate(
        req.params.uid,
        { verificationQRCode: qrValue },
        { new: true }
      ).lean();
      if (saved) {
        updatedUser = saved as unknown as UserProfileDocument;
      }
    }

    try {
      await sendVerificationReminderEmail(updatedUser.email, updatedUser.displayName, qrValue);
    } catch (error) {
      console.error("Failed to send verification reminder email:", error);
      res.status(500).json({ message: "Failed to send verification reminder email." });
      return;
    }

    res.json({
      ...mapProfile(updatedUser as UserProfileDocument),
      verificationQRCode: qrValue,
      message: "Verification reminder email sent.",
    });

    await appendSystemLog({
      category: "admin",
      action: "VERIFICATION_REMINDER_SENT",
      message: `Verification reminder sent to ${updatedUser.email}.`,
      severity: "info",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updatedUser._id,
    });
  });

  app.patch("/api/admin/users/:uid/deactivate", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const updatedUser = await UserProfileModel.findByIdAndUpdate(
      req.params.uid,
      {
        role: "user",
        isVerified: false,
        $unset: { verificationQRCode: 1 },
      } as any,
      { new: true }
    ).lean();

    if (!updatedUser) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    res.json({
      ...mapProfile(updatedUser as UserProfileDocument),
      message: "User deactivated successfully.",
    });

    await appendSystemLog({
      category: "admin",
      action: "USER_DEACTIVATED",
      message: `User ${updatedUser.email} was deactivated.`,
      severity: "warning",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updatedUser._id,
    });
  });

  app.get("/api/admin/overview", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    await syncEventStatuses();
    const [registrations, events] = await Promise.all([
      RegistrationModel.find({}).sort({ registeredAt: -1 }).lean(),
      EventModel.find({}).sort({ startDateTime: 1, date: 1 }).lean(),
    ]);

    res.json({
      registrations: registrations.map((registration) =>
        mapRegistration(registration as RegistrationDocument)
      ),
      events: events.map((event) => mapEvent(event as EventDocument)),
    });
  });

  // Verify email endpoint (mock for demo)
  app.post("/api/verify-email", async (req, res) => {
    const { email, token } = req.body;
    // In a real app, you'd verify the token in your database
    const qrValue = `verification:${email}:${Date.now()}`;
    try {
      await sendVerificationEmail(email, email, qrValue);
      res.json({ success: true, message: "Email verified successfully!", verificationQRCode: qrValue });
    } catch (error) {
      console.error("Failed to send verification email:", error);
      res.status(500).json({ success: false, message: "Email verified but notification failed." });
    }
  });

  // Admin Analytics Route
  app.get("/api/admin/stats", async (req, res) => {
    const actor = await requireRole(req, res, "admin");
    if (!actor) return;

    const [totalRegistrations, verifiedUsers, attendanceCount] = await Promise.all([
      RegistrationModel.countDocuments(),
      UserProfileModel.countDocuments({ isVerified: true }),
      RegistrationModel.countDocuments({ attended: true }),
    ]);

    res.json({ totalRegistrations, verifiedUsers, attendanceCount });
  });

  app.get("/api/owner/overview", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    await syncEventStatuses();
    const [users, events, platformControls, logs, securityLogs] = await Promise.all([
      UserProfileModel.find({}).sort({ createdAt: -1 }).lean(),
      EventModel.find({}).sort({ startDateTime: 1 }).lean(),
      PlatformControlsModel.findById("global").lean(),
      SystemLogModel.find({}).sort({ createdAt: -1 }).limit(120).lean(),
      SystemLogModel.find({ category: "security" }).sort({ createdAt: -1 }).limit(80).lean(),
    ]);

    const mappedEvents = events.map((event) => mapEvent(event as EventDocument));
    const activeEvents = mappedEvents.filter((event) => {
      const status = event.status;
      return status === "upcoming" || status === "ongoing";
    }).length;

    res.json({
      stats: {
        totalUsers: users.length,
        totalEvents: mappedEvents.length,
        activeEvents,
      },
      users: users.map((user) => mapProfile(user as UserProfileDocument)),
      events: mappedEvents,
      platformControls: mapPlatformControls(
        (platformControls as PlatformControlsDocument | null) ?? {
          _id: "global",
          registrationsEnabled: true,
          eventCreationEnabled: true,
          maintenanceMode: false,
          updatedAt: new Date().toISOString(),
        }
      ),
      logs: logs.map((entry) => mapSystemLog(entry as SystemLogDocument)),
      securityLogs: securityLogs.map((entry) => mapSystemLog(entry as SystemLogDocument)),
    });
  });

  app.get("/api/owner/logs", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const kind = typeof req.query.kind === "string" ? req.query.kind : "all";
    const filter = kind === "security" ? { category: "security" } : {};
    const logs = await SystemLogModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(logs.map((entry) => mapSystemLog(entry as SystemLogDocument)));
  });

  app.patch("/api/owner/users/:uid/role", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const requestedRole = (req.body as { role?: UserRole }).role;
    if (!requestedRole || !["user", "admin", "owner"].includes(requestedRole)) {
      res.status(400).json({ message: "role must be one of user, admin, or owner." });
      return;
    }

    const target = await UserProfileModel.findById(req.params.uid).lean();
    if (!target) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    if (target.role === "owner" && requestedRole !== "owner" && target._id !== actor.actorUid) {
      res.status(403).json({ message: "Cannot demote another owner account." });
      return;
    }

    const normalizedEmail = target.email.trim().toLowerCase();
    const resolvedRole: UserRole =
      OWNER_EMAILS.includes(normalizedEmail) ? "owner" : requestedRole;
    if (OWNER_EMAILS.includes(normalizedEmail) && requestedRole !== "owner") {
      res.status(403).json({ message: "Configured owner accounts cannot be demoted." });
      return;
    }

    const updated = await UserProfileModel.findByIdAndUpdate(
      req.params.uid,
      { role: resolvedRole },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    await appendSystemLog({
      category: "admin",
      action: "OWNER_ROLE_UPDATED",
      message: `Role for ${updated.email} set to ${resolvedRole}.`,
      severity: "warning",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updated._id,
      metadata: {
        requestedRole,
        resolvedRole,
      },
    });

    res.json({
      ...mapProfile(updated as UserProfileDocument),
      message: `Role updated to ${resolvedRole}.`,
    });
  });

  app.delete("/api/owner/admins/:uid", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const target = await UserProfileModel.findById(req.params.uid).lean();
    if (!target) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    if (target.role !== "admin") {
      res.status(400).json({ message: "Target user is not an admin." });
      return;
    }

    const updated = await UserProfileModel.findByIdAndUpdate(
      req.params.uid,
      { role: "user" },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    await appendSystemLog({
      category: "admin",
      action: "OWNER_ADMIN_REMOVED",
      message: `Admin privileges removed from ${updated.email}.`,
      severity: "critical",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updated._id,
    });

    res.json({
      ...mapProfile(updated as UserProfileDocument),
      message: "Admin privileges removed successfully.",
    });
  });

  app.patch("/api/owner/platform-controls", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const payload = req.body as Partial<PlatformControlsDocument>;
    const current =
      ((await PlatformControlsModel.findById("global").lean()) as PlatformControlsDocument | null) ?? {
        _id: "global",
        registrationsEnabled: true,
        eventCreationEnabled: true,
        maintenanceMode: false,
        updatedAt: new Date().toISOString(),
      };

    const next: PlatformControlsDocument = {
      ...current,
      registrationsEnabled:
        payload.registrationsEnabled === undefined
          ? current.registrationsEnabled
          : Boolean(payload.registrationsEnabled),
      eventCreationEnabled:
        payload.eventCreationEnabled === undefined
          ? current.eventCreationEnabled
          : Boolean(payload.eventCreationEnabled),
      maintenanceMode:
        payload.maintenanceMode === undefined ? current.maintenanceMode : Boolean(payload.maintenanceMode),
      updatedAt: new Date().toISOString(),
      updatedBy: actor.actorUid,
    };

    const updated = await PlatformControlsModel.findByIdAndUpdate(
      "global",
      next,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    await appendSystemLog({
      category: "system",
      action: "OWNER_PLATFORM_CONTROLS_UPDATED",
      message: "Platform controls were updated.",
      severity: "critical",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: "global",
      metadata: {
        registrationsEnabled: next.registrationsEnabled,
        eventCreationEnabled: next.eventCreationEnabled,
        maintenanceMode: next.maintenanceMode,
      },
    });

    res.json(mapPlatformControls(updated as PlatformControlsDocument));
  });

  app.patch("/api/owner/events/:id/force-complete", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const existing = await EventModel.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const normalizedExisting = normalizeEventState(existing as EventDocument).normalized;
    const nowIso = new Date().toISOString();
    const endDateTime =
      new Date(normalizedExisting.endDateTime).getTime() > Date.now()
        ? nowIso
        : normalizedExisting.endDateTime;

    const updated = await EventModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        statusOverride: true,
        endDateTime,
      },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await appendSystemLog({
      category: "event",
      action: "OWNER_FORCE_COMPLETE_EVENT",
      message: `Event "${updated.title}" was force-completed.`,
      severity: "warning",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updated._id,
    });

    res.json(mapEvent(updated as EventDocument));
  });

  app.patch("/api/owner/events/:id/feature", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const isHighlighted = Boolean((req.body as { isHighlighted?: boolean }).isHighlighted ?? true);
    const updated = await EventModel.findByIdAndUpdate(
      req.params.id,
      { isHighlighted },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await appendSystemLog({
      category: "event",
      action: "OWNER_FEATURE_EVENT",
      message: `Event "${updated.title}" highlight set to ${isHighlighted}.`,
      severity: "info",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: updated._id,
    });

    res.json(mapEvent(updated as EventDocument));
  });

  app.delete("/api/owner/events/:id", async (req, res) => {
    const actor = await requireRole(req, res, "owner");
    if (!actor) return;

    const deletedEvent = await EventModel.findByIdAndDelete(req.params.id).lean();

    if (!deletedEvent) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await RegistrationModel.deleteMany({ eventId: req.params.id });

    await appendSystemLog({
      category: "event",
      action: "OWNER_DELETE_EVENT",
      message: `Owner deleted event "${deletedEvent.title}".`,
      severity: "critical",
      actorUid: actor.actorUid,
      actorRole: actor.actorRole,
      targetId: deletedEvent._id,
    });

    res.json(mapEvent(deletedEvent as EventDocument));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Reuse the app server so HMR does not need Vite's fallback websocket port.
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        httpServer.off("listening", handleListening);
        reject(error);
      };
      const handleListening = () => {
        httpServer.off("error", handleError);
        resolve();
      };

      httpServer.once("error", handleError);
      httpServer.once("listening", handleListening);
      httpServer.listen(PORT, "0.0.0.0");
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") {
      throw new Error(
        `Port ${PORT} is already in use. Stop the existing dev server or set PORT to an open port.`,
        { cause: error }
      );
    }

    throw error;
  }

  console.log(`Server running on http://localhost:${PORT}`);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

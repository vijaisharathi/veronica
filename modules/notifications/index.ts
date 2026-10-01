/**
 * VÉRONA — Notifications & Communication Module Barrel (Phase 25)
 */

export * from "./types/notification.types";
export * from "./events/event-catalog";
export * from "./preferences/notification-preference.service";
export * from "./templates/template-registry";
export * from "./templates/email-layout";
export * from "./providers/resend-email.provider";
export * from "./channels/channel.interface";
export * from "./channels/in-app.channel";
export * from "./channels/email.channel";
export * from "./channels/sms.channel";
export * from "./channels/push.channel";
export * from "./router/channel-router.service";
export * from "./delivery/notification-delivery.service";
export * from "./orchestrator/notification-orchestrator";
export * from "./repositories/notification.repository";
export * from "./services/notification.service";

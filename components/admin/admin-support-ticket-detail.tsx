"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Lock,
  ShieldCheck,
  Package,
  Truck,
  RotateCcw,
  CreditCard,
  Paperclip,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AdminSupportTicketDetailDTO,
  SupportAttachmentDTO,
} from "@/modules/support/types/support.types";
import {
  SupportPriority,
  SupportSenderType,
  SupportSlaState,
  SupportTicketStatus,
} from "@/constants/status";

interface AdminSupportTicketDetailProps {
  initialTicket: AdminSupportTicketDetailDTO;
}

export function AdminSupportTicketDetail({ initialTicket }: AdminSupportTicketDetailProps) {
  const [ticket, setTicket] = React.useState<AdminSupportTicketDetailDTO>(initialTicket);
  const [activeTab, setActiveTab] = React.useState<"ALL" | "PUBLIC" | "INTERNAL">("ALL");

  // Composer Mode: Public Reply vs Internal Note
  const [composerMode, setComposerMode] = React.useState<"REPLY" | "INTERNAL">("REPLY");
  const [composerText, setComposerText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Status & Priority Selectors
  const [selectedStatus, setSelectedStatus] = React.useState<SupportTicketStatus>(ticket.status);
  const [statusReason, setStatusReason] = React.useState("");
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);

  // Assignment State
  const [assigneeId, setAssigneeId] = React.useState(ticket.assignedTo?.id || "");
  const [assignSubmitting, setAssignSubmitting] = React.useState(false);

  // Attachment inputs
  const [attachments, setAttachments] = React.useState<SupportAttachmentDTO[]>([]);
  const [attName, setAttName] = React.useState("");
  const [attUrl, setAttUrl] = React.useState("");
  const [showAttachInput, setShowAttachInput] = React.useState(false);

  const refreshTicket = async () => {
    try {
      const res = await fetch(`/api/admin/support/${ticket.ticketNumber}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTicket(json.data);
          setSelectedStatus(json.data.status);
          setAssigneeId(json.data.assignedTo?.id || "");
        }
      }
    } catch (err) {
      console.error("Failed to reload ticket", err);
    }
  };

  const handleAddAttachment = () => {
    if (!attName.trim() || !attUrl.trim()) return;
    if (!attUrl.startsWith("https://")) return;

    const newAtt: SupportAttachmentDTO = {
      name: attName.trim(),
      url: attUrl.trim(),
      fileType: "application/octet-stream",
      fileSize: 1024 * 1024,
      uploadedAt: new Date().toISOString(),
    };
    setAttachments([...attachments, newAtt]);
    setAttName("");
    setAttUrl("");
    setShowAttachInput(false);
  };

  const handleComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    const idempotencyKey = `agent_${composerMode.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const endpoint =
        composerMode === "REPLY"
          ? `/api/admin/support/${ticket.ticketNumber}/messages`
          : `/api/admin/support/${ticket.ticketNumber}/internal-notes`;

      const payload =
        composerMode === "REPLY"
          ? {
              message: composerText.trim(),
              attachments: attachments.length > 0 ? attachments : undefined,
              idempotencyKey,
            }
          : {
              note: composerText.trim(),
              attachments: attachments.length > 0 ? attachments : undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit message.");
      }

      setComposerText("");
      setAttachments([]);
      await refreshTicket();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (selectedStatus === ticket.status) return;
    setStatusSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/support/${ticket.ticketNumber}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          reason: statusReason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Invalid status transition.");
      }
      setStatusReason("");
      await refreshTicket();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Status update failed.");
      setSelectedStatus(ticket.status);
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleUpdatePriority = async (newPriority: SupportPriority) => {
    if (newPriority === ticket.priority) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/support/${ticket.ticketNumber}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Priority update failed.");
      }
      await refreshTicket();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Priority update failed.");
    }
  };

  const handleAssignTicket = async (newStaffId: string | null) => {
    setAssignSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/support/${ticket.ticketNumber}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: newStaffId || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Assignment failed.");
      }
      await refreshTicket();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Assignment failed.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Filter messages based on active tab
  const filteredMessages = ticket.messages.filter((msg) => {
    if (activeTab === "PUBLIC") return !msg.isInternal;
    if (activeTab === "INTERNAL") return msg.isInternal;
    return true;
  });

  const { context } = ticket;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Support Queue</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">
              #{ticket.ticketNumber}
            </span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {ticket.category}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] uppercase font-semibold ${
                ticket.sla.state === SupportSlaState.BREACHED
                  ? "bg-rose-100 text-rose-900"
                  : ticket.sla.state === SupportSlaState.AT_RISK
                  ? "bg-amber-100 text-amber-900"
                  : "bg-emerald-100 text-emerald-900"
              }`}
            >
              SLA: {ticket.sla.state.replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-neutral-900 dark:text-neutral-100 mt-1">
            {ticket.subject}
          </h1>
        </div>

        <button
          onClick={refreshTicket}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Main Conversation Left (8 cols) / Sidebar Context Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Messages & Composer */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === "ALL"
                    ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                All Messages ({ticket.messages.length})
              </button>
              <button
                onClick={() => setActiveTab("PUBLIC")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "PUBLIC"
                    ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Customer Thread</span>
              </button>
              <button
                onClick={() => setActiveTab("INTERNAL")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "INTERNAL"
                    ? "border-amber-600 text-amber-700 dark:text-amber-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Internal Notes (
                  {ticket.messages.filter((m) => m.isInternal).length})
                </span>
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-4">
            {filteredMessages.map((msg) => {
              const isInternal = msg.isInternal;
              const isCustomer = msg.senderType === SupportSenderType.CUSTOMER;
              const isSystem = msg.senderType === SupportSenderType.SYSTEM;

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="flex items-center justify-center text-[11px] text-neutral-400 font-mono my-3"
                  >
                    <span>{msg.body}</span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`p-4 border text-xs ${
                    isInternal
                      ? "bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
                      : isCustomer
                      ? "bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800"
                      : "bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isInternal ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Staff Internal Note</span>
                        </span>
                      ) : isCustomer ? (
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          Client ({msg.senderDisplayName})
                        </span>
                      ) : (
                        <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Staff ({msg.senderDisplayName})</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {msg.body}
                  </p>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] hover:border-neutral-400"
                        >
                          <Paperclip className="w-3 h-3 text-neutral-400" />
                          <span className="font-mono truncate max-w-[140px]">{att.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dual Composer: Public Reply vs Internal Note */}
          <form
            onSubmit={handleComposerSubmit}
            className={`border p-4 space-y-3 ${
              composerMode === "INTERNAL"
                ? "bg-amber-50/60 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800"
                : "bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 shadow-xs"
            }`}
          >
            {/* Mode Switcher */}
            <div className="flex items-center justify-between border-b pb-2 border-neutral-200/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposerMode("REPLY")}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    composerMode === "REPLY"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Reply to Customer
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("INTERNAL")}
                  className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-colors ${
                    composerMode === "INTERNAL"
                      ? "bg-amber-700 text-white"
                      : "text-amber-800 hover:text-amber-950"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Add Internal Note</span>
                </button>
              </div>
              <span className="text-[10px] text-neutral-400">
                {composerMode === "INTERNAL" ? "Confidential • Not visible to client" : "Public Client Response"}
              </span>
            </div>

            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              rows={4}
              placeholder={
                composerMode === "REPLY"
                  ? "Type your response to the customer. First response timestamp will be recorded."
                  : "Type internal investigation findings, warehouse check notes, or private staff comments..."
              }
              className="w-full text-xs border border-neutral-200 dark:border-neutral-800 p-2.5 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowAttachInput(!showAttachInput)}
                className="text-xs text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-1"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{showAttachInput ? "Cancel" : "Attach File"}</span>
                {attachments.length > 0 && ` (${attachments.length})`}
              </button>

              <button
                type="submit"
                disabled={submitting || !composerText.trim()}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-40 ${
                  composerMode === "INTERNAL" ? "bg-amber-800 hover:bg-amber-900" : "bg-neutral-900 hover:bg-neutral-800"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Saving..." : composerMode === "INTERNAL" ? "Post Note" : "Send Reply"}</span>
              </button>
            </div>

            {/* Inline Attachment Input */}
            {showAttachInput && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-neutral-100 dark:bg-neutral-800 p-2 text-xs">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="File name"
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    className="w-full p-1 border bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="url"
                    placeholder="HTTPS URL"
                    value={attUrl}
                    onChange={(e) => setAttUrl(e.target.value)}
                    className="w-full p-1 border bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="w-full p-1 bg-neutral-900 text-white uppercase text-[10px]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Controls, Customer Info, SLA, Context */}
        <div className="lg:col-span-4 space-y-5">
          {/* Status & Assignment Management */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              Ticket Controls
            </span>

            {/* Status Transition */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Ticket Status
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as SupportTicketStatus)}
                  className="w-full text-xs border border-neutral-200 dark:border-neutral-800 p-1.5 bg-neutral-50 dark:bg-neutral-950"
                >
                  {Object.values(SupportTicketStatus).map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {selectedStatus !== ticket.status && (
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={statusSubmitting}
                    className="px-2.5 py-1 bg-neutral-900 text-white text-[11px] uppercase tracking-wider shrink-0"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            {/* Priority Override */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Ticket Priority
              </label>
              <select
                value={ticket.priority}
                onChange={(e) => handleUpdatePriority(e.target.value as SupportPriority)}
                className="w-full text-xs border border-neutral-200 dark:border-neutral-800 p-1.5 bg-neutral-50 dark:bg-neutral-950"
              >
                {Object.values(SupportPriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                Assigned Agent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Staff ID or leave blank to unassign"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full text-xs border border-neutral-200 dark:border-neutral-800 p-1.5 bg-neutral-50 dark:bg-neutral-950 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAssignTicket(assigneeId.trim() || null)}
                  disabled={assignSubmitting}
                  className="px-2.5 py-1 bg-neutral-900 text-white text-[11px] uppercase tracking-wider shrink-0"
                >
                  Save
                </button>
              </div>
              <span className="text-[10px] text-neutral-400">
                Current: {ticket.assignedTo ? ticket.assignedTo.name : "Unassigned"}
              </span>
            </div>
          </div>

          {/* SLA Tracking Widget */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                SLA Compliance
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  ticket.sla.state === SupportSlaState.BREACHED
                    ? "bg-rose-100 text-rose-900"
                    : ticket.sla.state === SupportSlaState.AT_RISK
                    ? "bg-amber-100 text-amber-900"
                    : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {ticket.sla.state.replace(/_/g, " ")}
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
              <div className="pt-1 flex justify-between">
                <span className="text-neutral-500">First Response:</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {ticket.firstResponseAt
                    ? new Date(ticket.firstResponseAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Pending"}
                </span>
              </div>
              <div className="pt-1 flex justify-between">
                <span className="text-neutral-500">Resolution Deadline:</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {ticket.sla.resolutionDeadline
                    ? new Date(ticket.sla.resolutionDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Not Configured"}
                </span>
              </div>
            </div>
          </div>

          {/* Customer PII Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-2 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              Customer Information
            </span>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {ticket.customerName || "Customer"}
            </div>
            <div className="text-neutral-500 font-mono text-[11px]">
              {ticket.customerEmail || "No email on record"}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              ID: {ticket.customerId}
            </div>
          </div>

          {/* Domain Context Previews */}
          {(context.order || context.shipment || context.returnRequest || context.refund || context.product) && (
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
                Related Domain Context
              </span>

              {context.order && (
                <div className="bg-white dark:bg-neutral-900 p-3 border border-neutral-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>Order #{context.order.orderNumber}</span>
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Status: {context.order.status} • Total: ₹{(context.order.totalMinor / 100).toLocaleString("en-IN")}
                  </div>
                </div>
              )}

              {context.shipment && (
                <div className="bg-white dark:bg-neutral-900 p-3 border border-neutral-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Waybill #{context.shipment.trackingNumber}</span>
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Carrier: {context.shipment.carrier} • Status: {context.shipment.status}
                  </div>
                </div>
              )}

              {context.returnRequest && (
                <div className="bg-white dark:bg-neutral-900 p-3 border border-neutral-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                    <span>Return #{context.returnRequest.returnNumber}</span>
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Status: {context.returnRequest.status}
                  </div>
                </div>
              )}

              {context.refund && (
                <div className="bg-white dark:bg-neutral-900 p-3 border border-neutral-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Refund #{context.refund.refundNumber}</span>
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Amount: ₹{(context.refund.amountMinor / 100).toLocaleString("en-IN")} • Status: {context.refund.status}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

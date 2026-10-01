"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Paperclip,
  ShieldCheck,
  RotateCcw,
  Package,
  CreditCard,
  Truck,
  ExternalLink,
  Lock,
  X,
} from "lucide-react";
import {
  CustomerSupportTicketDetailDTO,
  SupportAttachmentDTO,
} from "@/modules/support/types/support.types";
import { SupportSenderType, SupportTicketStatus } from "@/constants/status";

interface CustomerTicketThreadProps {
  initialTicket: CustomerSupportTicketDetailDTO;
}

export function CustomerTicketThread({ initialTicket }: CustomerTicketThreadProps) {
  const [ticket, setTicket] = React.useState<CustomerSupportTicketDetailDTO>(initialTicket);
  const [replyMessage, setReplyMessage] = React.useState("");
  const [sendingReply, setSendingReply] = React.useState(false);
  const [replyError, setReplyError] = React.useState<string | null>(null);

  // Attachments State
  const [attachments, setAttachments] = React.useState<SupportAttachmentDTO[]>([]);
  const [attName, setAttName] = React.useState("");
  const [attUrl, setAttUrl] = React.useState("");
  const [showAttachInput, setShowAttachInput] = React.useState(false);

  // Close & Reopen Modals
  const [actionLoading, setActionLoading] = React.useState(false);
  const [showReopenModal, setShowReopenModal] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState("");

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || sendingReply) return;

    setSendingReply(true);
    setReplyError(null);

    const idempotencyKey = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const res = await fetch(`/api/account/support/${ticket.ticketNumber}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          message: replyMessage.trim(),
          attachments: attachments.length > 0 ? attachments : undefined,
          idempotencyKey,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to deliver your reply.");
      }

      // Reload ticket detail
      const refreshRes = await fetch(`/api/account/support/${ticket.ticketNumber}`);
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        if (refreshJson.success && refreshJson.data) {
          setTicket(refreshJson.data);
        }
      }

      setReplyMessage("");
      setAttachments([]);
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm("Are you certain you wish to mark this inquiry as closed?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/account/support/${ticket.ticketNumber}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Closed by client." }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTicket(json.data);
      }
    } catch (err) {
      console.error("Failed to close ticket", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!reopenReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/account/support/${ticket.ticketNumber}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTicket(json.data);
        setShowReopenModal(false);
        setReopenReason("");
      } else {
        alert(json.error?.message || "Unable to reopen ticket.");
      }
    } catch (err) {
      console.error("Failed to reopen ticket", err);
    } finally {
      setActionLoading(false);
    }
  };

  const { context } = ticket;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <Link
            href="/account/support"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Inquiries</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-bold tracking-wider text-neutral-900">
              #{ticket.ticketNumber}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-neutral-100 text-neutral-700">
              {ticket.category}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                ticket.status === SupportTicketStatus.RESOLVED
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : ticket.status === SupportTicketStatus.CLOSED
                  ? "bg-neutral-100 text-neutral-700 border border-neutral-200"
                  : ticket.status === SupportTicketStatus.WAITING_FOR_CUSTOMER
                  ? "bg-purple-50 text-purple-800 border border-purple-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {ticket.status.replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-neutral-900 mt-2 font-normal">
            {ticket.subject}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {ticket.canClose && (
            <button
              onClick={handleCloseTicket}
              disabled={actionLoading}
              className="px-3.5 py-1.5 border border-neutral-300 text-neutral-700 text-xs uppercase tracking-wider font-medium hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              Close Inquiry
            </button>
          )}
          {ticket.canReopen && (
            <button
              onClick={() => setShowReopenModal(true)}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Reopen Inquiry
            </button>
          )}
        </div>
      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 space-y-4 shadow-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-serif text-lg text-neutral-900">Reopen Support Inquiry</h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Please specify why you are continuing this inquiry. Tickets can be reopened within 14 days of
              resolution.
            </p>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="State the additional assistance required..."
              rows={3}
              className="w-full text-xs border border-neutral-200 p-2.5 focus:outline-none focus:border-neutral-900"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReopenTicket}
                disabled={actionLoading || !reopenReason.trim()}
                className="px-4 py-1.5 bg-neutral-900 text-white text-xs uppercase tracking-wider font-medium disabled:opacity-50"
              >
                {actionLoading ? "Reopening..." : "Confirm Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verified Context Previews (Order, Shipment, Return, Refund, Product) */}
      {(context.order || context.shipment || context.returnRequest || context.refund || context.product) && (
        <div className="bg-neutral-50 border border-neutral-200/80 p-4 space-y-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 block">
            Verified Purchase & Delivery Context
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {context.order && (
              <div className="bg-white p-3 border border-neutral-200/70 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <span>Order #{context.order.orderNumber}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Status: <span className="font-medium text-neutral-700">{context.order.status}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Total:{" "}
                  <span className="font-mono text-neutral-700 font-medium">
                    ₹{(context.order.totalMinor / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            {context.shipment && (
              <div className="bg-white p-3 border border-neutral-200/70 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Waybill: {context.shipment.trackingNumber}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Carrier: <span className="font-medium text-neutral-700">{context.shipment.carrier}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Status: <span className="font-medium text-neutral-700">{context.shipment.status}</span>
                </div>
              </div>
            )}

            {context.returnRequest && (
              <div className="bg-white p-3 border border-neutral-200/70 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                  <span>Return #{context.returnRequest.returnNumber}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Status: <span className="font-medium text-neutral-700">{context.returnRequest.status}</span>
                </div>
              </div>
            )}

            {context.refund && (
              <div className="bg-white p-3 border border-neutral-200/70 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Refund #{context.refund.refundNumber}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Amount:{" "}
                  <span className="font-mono text-neutral-700 font-medium">
                    ₹{(context.refund.amountMinor / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation Stream */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Conversation ({ticket.messages.length} messages)
        </div>

        <div className="space-y-4">
          {ticket.messages.map((msg) => {
            const isCustomer = msg.senderType === SupportSenderType.CUSTOMER;
            const isSystem = msg.senderType === SupportSenderType.SYSTEM;

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-center my-4 text-[11px] text-neutral-400 font-mono"
                >
                  <span className="border-t border-neutral-200 flex-1 mr-3" />
                  <span>
                    {msg.body} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="border-t border-neutral-200 flex-1 ml-3" />
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-2xl p-5 border ${
                    isCustomer
                      ? "bg-amber-50/40 border-amber-200/80 rounded-none text-right"
                      : "bg-white border-neutral-200/90 rounded-none text-left shadow-xs"
                  }`}
                >
                  {/* Sender Header */}
                  <div
                    className={`flex items-center gap-2 mb-2 text-xs ${
                      isCustomer ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isCustomer && (
                      <span className="inline-flex items-center gap-1 font-semibold text-neutral-900 tracking-tight">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>VÉRONA Atelier Concierge</span>
                      </span>
                    )}
                    {isCustomer && (
                      <span className="font-medium text-neutral-700">
                        You ({msg.senderDisplayName})
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Body Text */}
                  <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                    {msg.body}
                  </p>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200/60 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-200 text-[11px] text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-neutral-400" />
                          <span className="font-mono text-[10px] truncate max-w-[150px]">{att.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Composer or Closed Notice */}
      {ticket.canReply ? (
        <form
          onSubmit={handleSendReply}
          className="bg-white border border-neutral-200 p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Reply to Concierge
            </span>
            <span className="text-[10px] text-neutral-400">{replyMessage.length}/5000</span>
          </div>

          {replyError && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2 border border-rose-200">
              {replyError}
            </div>
          )}

          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            rows={4}
            placeholder="Type your response to the concierge team..."
            maxLength={5000}
            required
            className="w-full text-xs sm:text-sm border border-neutral-200 p-3 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 leading-relaxed resize-y"
          />

          {/* Attachment row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachInput(!showAttachInput)}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{showAttachInput ? "Cancel Attachment" : "Add Attachment"}</span>
              </button>
              {attachments.length > 0 && (
                <span className="text-[11px] font-mono text-neutral-500">
                  ({attachments.length} attached)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={sendingReply || !replyMessage.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-neutral-900 text-white text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingReply ? "Sending..." : "Send Reply"}</span>
            </button>
          </div>

          {/* Inline Attachment Form */}
          {showAttachInput && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-neutral-50 p-3 border border-neutral-200 text-xs">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Document name (e.g. proof.pdf)"
                  value={attName}
                  onChange={(e) => setAttName(e.target.value)}
                  className="w-full border border-neutral-200 bg-white px-2 py-1"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="url"
                  placeholder="Secure HTTPS URL"
                  value={attUrl}
                  onChange={(e) => setAttUrl(e.target.value)}
                  className="w-full border border-neutral-200 bg-white px-2 py-1"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="w-full py-1 bg-neutral-800 text-white text-[11px] uppercase tracking-wider hover:bg-neutral-900"
                >
                  Attach
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="bg-neutral-100 border border-neutral-200 p-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-neutral-700 font-serif text-sm">
            <Lock className="w-4 h-4 text-neutral-400" />
            <span>This inquiry has been closed.</span>
          </div>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Replies are currently disabled for this record. If you require further assistance with this
            matter, you may reopen it if within our 14-day policy, or submit a new inquiry.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Trash2,
  AlertCircle,
  Info,
} from "lucide-react";
import { SupportCategory, SupportTicketPriority } from "@/constants/status";
import { SupportAttachmentDTO } from "@/modules/support/types/support.types";

export function CustomerCreateTicketView() {
  const router = useRouter();

  const [category, setCategory] = React.useState<SupportCategory>(SupportCategory.ORDER);
  const [priority, setPriority] = React.useState<SupportTicketPriority>(SupportTicketPriority.MEDIUM);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");

  // Optional Context Identifiers
  const [orderId, setOrderId] = React.useState("");
  const [shipmentId, setShipmentId] = React.useState("");
  const [returnRequestId, setReturnRequestId] = React.useState("");
  const [refundId, setRefundId] = React.useState("");
  const [productId, setProductId] = React.useState("");

  // Attachments State
  const [attachments, setAttachments] = React.useState<SupportAttachmentDTO[]>([]);
  const [attachmentName, setAttachmentName] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleAddAttachment = () => {
    setAttachmentError(null);
    if (!attachmentName.trim() || !attachmentUrl.trim()) {
      setAttachmentError("Please provide both file name and secure URL.");
      return;
    }

    if (!attachmentUrl.startsWith("https://")) {
      setAttachmentError("Attachment URL must use secure HTTPS encryption.");
      return;
    }

    if (attachments.length >= 5) {
      setAttachmentError("Maximum of 5 attachments permitted.");
      return;
    }

    // Determine mime type from extension
    const ext = attachmentName.split(".").pop()?.toLowerCase();
    let fileType = "application/pdf";
    if (ext === "jpg" || ext === "jpeg") fileType = "image/jpeg";
    else if (ext === "png") fileType = "image/png";
    else if (ext === "webp") fileType = "image/webp";

    const newAtt: SupportAttachmentDTO = {
      name: attachmentName.trim(),
      url: attachmentUrl.trim(),
      fileType,
      fileSize: 1024 * 1024, // 1MB estimated
      uploadedAt: new Date().toISOString(),
    };

    setAttachments([...attachments, newAtt]);
    setAttachmentName("");
    setAttachmentUrl("");
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (subject.trim().length < 5) {
      setFormError("Subject must be at least 5 characters.");
      return;
    }

    if (message.trim().length < 10) {
      setFormError("Detailed message must be at least 10 characters.");
      return;
    }

    setSubmitting(true);

    try {
      // Deterministic idempotency key
      const idempotencyKey = `sup_create_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        category,
        priority,
        subject: subject.trim(),
        message: message.trim(),
        orderId: orderId.trim() || undefined,
        shipmentId: shipmentId.trim() || undefined,
        returnRequestId: returnRequestId.trim() || undefined,
        refundId: refundId.trim() || undefined,
        productId: productId.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        idempotencyKey,
      };

      const res = await fetch("/api/account/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit inquiry. Please review your entries.");
      }

      const createdTicket = json.data;
      router.push(`/account/support/${createdTicket.ticketNumber}`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An unexpected submission error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/account/support"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inquiries</span>
        </Link>
        <span className="block text-[11px] font-medium tracking-widest uppercase text-amber-700">
          Client Concierge
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif text-neutral-900 mt-1 tracking-tight">
          New Support Inquiry
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Submit your question or request. Our dedicated atelier specialists review all inquiries in
          accordance with our service standards.
        </p>
      </div>

      {formError && (
        <div className="bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Submission Error</span>
            <span>{formError}</span>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
        {/* Category & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Inquiry Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
              className="w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              required
            >
              <option value={SupportCategory.ORDER}>Order Inquiry</option>
              <option value={SupportCategory.DELIVERY}>Delivery & Waybill</option>
              <option value={SupportCategory.RETURN}>Return Request</option>
              <option value={SupportCategory.REFUND}>Refund Status</option>
              <option value={SupportCategory.PRODUCT}>Garment & Sizing Inquiries</option>
              <option value={SupportCategory.PAYMENT}>Payment Verification</option>
              <option value={SupportCategory.ACCOUNT}>Account & Security</option>
              <option value={SupportCategory.TECHNICAL}>Technical Assistance</option>
              <option value={SupportCategory.OTHER}>General Inquiry</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Desired Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
              className="w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
            >
              <option value={SupportTicketPriority.LOW}>Normal (Standard 24h Response)</option>
              <option value={SupportTicketPriority.MEDIUM}>Priority (12h Response)</option>
              <option value={SupportTicketPriority.HIGH}>High Urgency (4h Response)</option>
              <option value={SupportTicketPriority.URGENT}>Urgent (2h Express Response)</option>
            </select>
            <span className="block text-[10px] text-neutral-400">
              Final priority is verified by concierge triage policy.
            </span>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Subject *
            </label>
            <span className="text-[10px] text-neutral-400">{subject.length}/200</span>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Inquiring regarding delivery schedule for Order #ORD-2026-..."
            maxLength={200}
            required
            className="w-full border border-neutral-200 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Detailed Description *
            </label>
            <span className="text-[10px] text-neutral-400">{message.length}/5000</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Please detail your request or question clearly..."
            maxLength={5000}
            required
            className="w-full border border-neutral-200 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 leading-relaxed resize-y"
          />
        </div>

        {/* Optional Domain Context Section */}
        <div className="pt-4 border-t border-neutral-100 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              Optional Context Linking (Anti-IDOR Verified)
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            If your inquiry pertains to a specific purchase or return, enter the 24-character record ID below.
            The server automatically validates your account ownership.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Related Order ID (Optional)
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="24-character hexadecimal ID"
                className="w-full font-mono text-xs border border-neutral-200 px-3 py-1.5 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Related Return Request ID (Optional)
              </label>
              <input
                type="text"
                value={returnRequestId}
                onChange={(e) => setReturnRequestId(e.target.value)}
                placeholder="24-character hexadecimal ID"
                className="w-full font-mono text-xs border border-neutral-200 px-3 py-1.5 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Related Waybill / Shipment ID (Optional)
              </label>
              <input
                type="text"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                placeholder="24-character hexadecimal ID"
                className="w-full font-mono text-xs border border-neutral-200 px-3 py-1.5 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Related Refund ID (Optional)
              </label>
              <input
                type="text"
                value={refundId}
                onChange={(e) => setRefundId(e.target.value)}
                placeholder="24-character hexadecimal ID"
                className="w-full font-mono text-xs border border-neutral-200 px-3 py-1.5 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                Related Product ID (Optional)
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="24-character hexadecimal ID"
                className="w-full font-mono text-xs border border-neutral-200 px-3 py-1.5 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="pt-4 border-t border-neutral-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                Attachments ({attachments.length}/5)
              </span>
            </div>
            <span className="text-[10px] text-neutral-400">JPEG, PNG, WebP, PDF (Max 10MB)</span>
          </div>

          {attachmentError && (
            <div className="text-[11px] text-rose-600 bg-rose-50 p-2 border border-rose-200">
              {attachmentError}
            </div>
          )}

          {/* Add Attachment Form */}
          {attachments.length < 5 && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-neutral-50 p-3 border border-neutral-200/80">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="File name (e.g. receipt.pdf)"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 bg-white px-2.5 py-1.5 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div className="sm:col-span-6">
                <input
                  type="url"
                  placeholder="HTTPS URL (e.g. https://res.cloudinary.com/...)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full text-xs border border-neutral-200 bg-white px-2.5 py-1.5 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="w-full h-full py-1.5 px-3 bg-neutral-800 text-white text-[11px] uppercase tracking-wider font-medium hover:bg-neutral-900 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-white border border-neutral-200 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="font-mono text-[11px] text-neutral-800 truncate">{att.name}</span>
                    <span className="text-[10px] text-neutral-400">({att.fileType})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
          <Link
            href="/account/support"
            className="px-4 py-2 border border-neutral-200 text-xs font-medium uppercase tracking-wider text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-widest font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Submitting Inquiry..." : "Submit Inquiry"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

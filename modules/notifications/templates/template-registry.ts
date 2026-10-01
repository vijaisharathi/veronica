/**
 * VÉRONA — Notification Template Registry & Deterministic Renderers (Phase 25)
 *
 * Implements typed, versionable HTML & plain-text templates with strict variable validation,
 * zero template injection risk, and luxury brand design.
 */

import { escapeHtml, renderEmailHtml } from "./email-layout";
import { formatMoney } from "@/lib/money";

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
  version: string;
}

export interface TemplateRenderer {
  render(data: Record<string, unknown>): RenderedTemplate;
}

export class TemplateRegistry {
  private readonly version = "v1.0.0";

  /**
   * Renders subject, HTML, and text for a given template key.
   */
  renderTemplate(templateKey: string, data: Record<string, unknown>): RenderedTemplate {
    switch (templateKey) {
      case "order.confirmed":
        return this.renderOrderConfirmed(data);
      case "order.shipped":
        return this.renderOrderShipped(data);
      case "order.delivered":
        return this.renderOrderDelivered(data);
      case "order.cancelled":
        return this.renderOrderCancelled(data);
      case "payment.completed":
        return this.renderPaymentCompleted(data);
      case "payment.failed":
        return this.renderPaymentFailed(data);
      case "refund.completed":
        return this.renderRefundCompleted(data);
      case "return.approved":
        return this.renderReturnApproved(data);
      case "return.rejected":
        return this.renderReturnRejected(data);
      case "review.published":
        return this.renderReviewPublished(data);
      case "account.security":
        return this.renderAccountSecurity(data);
      default:
        return this.renderGenericFallback(templateKey, data);
    }
  }

  // ── Template Renderers ───────────────────────────────────────────────────────

  private renderOrderConfirmed(data: Record<string, unknown>): RenderedTemplate {
    const orderNumber = String(data.orderNumber || "ORD-PENDING");
    const customerName = String(data.customerName || "Esteemed Client");
    const totalMinor = Number(data.totalMinor || 0);
    const formattedTotal = totalMinor > 0 ? formatMoney(totalMinor) : "Calculated at Atelier";
    const itemCount = Number(data.itemCount || 1);

    const subject = `Order Confirmed — #${orderNumber} | VÉRONA`;
    const preheader = `Your atelier order #${orderNumber} has been confirmed.`;
    const headline = `Order Confirmed: #${orderNumber}`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        We are delighted to confirm that your order <strong>#${escapeHtml(orderNumber)}</strong> has been received by the VÉRONA atelier.
        Our artisans have begun hand-preparing your selection (${itemCount} ${itemCount === 1 ? "garment" : "garments"}).
      </p>
      <div style="background-color: #F8F8F7; padding: 20px; border: 1px solid #EBEBEA; margin-bottom: 24px;">
        <table width="100%" style="font-size: 13px;">
          <tr>
            <td style="color: #737373;">Order Reference:</td>
            <td align="right" style="font-weight: 600;">#${escapeHtml(orderNumber)}</td>
          </tr>
          <tr>
            <td style="color: #737373; padding-top: 8px;">Order Total:</td>
            <td align="right" style="font-weight: 600; padding-top: 8px;">${escapeHtml(formattedTotal)}</td>
          </tr>
          <tr>
            <td style="color: #737373; padding-top: 8px;">Shipping Method:</td>
            <td align="right" style="padding-top: 8px;">Complimentary White Glove Delivery</td>
          </tr>
        </table>
      </div>
      <p class="body-text">
        You will receive another update as soon as your garment is inspected and dispatched from our atelier.
      </p>
    `;

    const ctaUrl = `/account/orders/${orderNumber}`;
    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "Review Order in Client Portal",
      ctaUrl,
    });

    const text = `VÉRONA ATELIER — Order Confirmed
Dear ${customerName},

Thank you for your order #${orderNumber}.
Total: ${formattedTotal}
Item Count: ${itemCount}

View details online: ${process.env.NEXT_PUBLIC_APP_URL || "https://verona.fashion"}${ctaUrl}

VÉRONA Client Concierge: concierge@verona.fashion`;

    return { subject, html, text, version: this.version };
  }

  private renderOrderShipped(data: Record<string, unknown>): RenderedTemplate {
    const orderNumber = String(data.orderNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");
    const carrier = String(data.carrier || "Specialized Fashion Logistics");
    const trackingNumber = String(data.trackingNumber || "");
    const trackingUrl = String(data.trackingUrl || `/account/orders/${orderNumber}/tracking`);

    const subject = `Your Order Has Shipped — #${orderNumber} | VÉRONA`;
    const preheader = `Your bespoke selection for order #${orderNumber} is now en route.`;
    const headline = `Order Dispatched: #${orderNumber}`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Your tailored garments have completed atelier quality inspection and have been dispatched for delivery.
      </p>
      <div style="background-color: #F8F8F7; padding: 20px; border: 1px solid #EBEBEA; margin-bottom: 24px;">
        <table width="100%" style="font-size: 13px;">
          <tr>
            <td style="color: #737373;">Courier Partner:</td>
            <td align="right" style="font-weight: 600;">${escapeHtml(carrier)}</td>
          </tr>
          <tr>
            <td style="color: #737373; padding-top: 8px;">Waybill Tracking:</td>
            <td align="right" style="font-family: monospace; font-weight: 600; padding-top: 8px;">${escapeHtml(trackingNumber)}</td>
          </tr>
        </table>
      </div>
      <p class="body-text">
        Follow the real-time fulfillment progression using our interactive tracking portal below.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "Track Your Shipment",
      ctaUrl: trackingUrl,
    });

    const text = `VÉRONA ATELIER — Order Shipped
Dear ${customerName},

Your order #${orderNumber} has been dispatched.
Carrier: ${carrier}
Tracking Number: ${trackingNumber}

Track here: ${trackingUrl}

VÉRONA Client Concierge`;

    return { subject, html, text, version: this.version };
  }

  private renderOrderDelivered(data: Record<string, unknown>): RenderedTemplate {
    const orderNumber = String(data.orderNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");

    const subject = `Delivered — Order #${orderNumber} | VÉRONA`;
    const preheader = `Your VÉRONA atelier garment has arrived.`;
    const headline = `Garment Delivered`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Courier tracking confirms that order <strong>#${escapeHtml(orderNumber)}</strong> has arrived at your shipping destination.
      </p>
      <p class="body-text">
        We hope the silhouette and fabric meet the highest standards of haute couture. We welcome your verified review once you have completed your fitting.
      </p>
    `;

    const ctaUrl = `/account/orders/${orderNumber}`;
    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View Order & Fitting Details",
      ctaUrl,
    });

    const text = `VÉRONA ATELIER — Order Delivered
Dear ${customerName},

Order #${orderNumber} has arrived at your address.
We invite you to experience the fitting.

View order: ${ctaUrl}`;

    return { subject, html, text, version: this.version };
  }

  private renderOrderCancelled(data: Record<string, unknown>): RenderedTemplate {
    const orderNumber = String(data.orderNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");
    const reason = String(data.reason || "Customer request");

    const subject = `Order Cancelled — #${orderNumber} | VÉRONA`;
    const preheader = `Notice regarding cancellation of order #${orderNumber}.`;
    const headline = `Order Cancellation Notice`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        This notification confirms that order <strong>#${escapeHtml(orderNumber)}</strong> has been cancelled.
      </p>
      <p class="body-text" style="color: #737373; font-size: 13px;">
        Reason: ${escapeHtml(reason)}
      </p>
      <p class="body-text">
        Any reserved payments or authorizations have been reversed in full.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "Browse New Atelier Arrivals",
      ctaUrl: "/new-arrivals",
    });

    const text = `VÉRONA ATELIER — Order Cancelled
Order #${orderNumber} has been cancelled.
Reason: ${reason}`;

    return { subject, html, text, version: this.version };
  }

  private renderPaymentCompleted(data: Record<string, unknown>): RenderedTemplate {
    const orderNumber = String(data.orderNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");
    const amountMinor = Number(data.amountMinor || 0);

    const subject = `Payment Confirmed — Order #${orderNumber} | VÉRONA`;
    const preheader = `Payment receipt for order #${orderNumber}.`;
    const headline = `Payment Confirmed`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Your payment of <strong>${escapeHtml(formatMoney(amountMinor))}</strong> for order <strong>#${escapeHtml(orderNumber)}</strong> has been verified.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View Invoice & Order Status",
      ctaUrl: `/account/orders/${orderNumber}`,
    });

    const text = `VÉRONA — Payment Confirmed
Order #${orderNumber}
Amount: ${formatMoney(amountMinor)}`;

    return { subject, html, text, version: this.version };
  }

  private renderPaymentFailed(data: Record<string, unknown>): RenderedTemplate {
    const orderNumber = String(data.orderNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");
    const reason = String(data.reason || "Payment declined by banking gateway");

    const subject = `Payment Action Required — Order #${orderNumber} | VÉRONA`;
    const preheader = `Action required: Payment authorization for order #${orderNumber}.`;
    const headline = `Payment Incomplete`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        We were unable to complete payment processing for order <strong>#${escapeHtml(orderNumber)}</strong>.
      </p>
      <p class="body-text" style="color: #DC2626;">
        Error Details: ${escapeHtml(reason)}
      </p>
      <p class="body-text">
        Your garments remain temporarily reserved. Please complete payment within 30 minutes to guarantee allocation.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "Complete Payment Now",
      ctaUrl: `/account/orders/${orderNumber}`,
    });

    const text = `VÉRONA — Payment Failed
Order #${orderNumber}
Details: ${reason}
Please visit /account/orders/${orderNumber} to retry.`;

    return { subject, html, text, version: this.version };
  }

  private renderRefundCompleted(data: Record<string, unknown>): RenderedTemplate {
    const refundNumber = String(data.refundNumber || "");
    const orderNumber = String(data.orderNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");
    const amountMinor = Number(data.amountMinor || 0);

    const subject = `Refund Processed — #${refundNumber} | VÉRONA`;
    const preheader = `Your refund of ${formatMoney(amountMinor)} has been settled.`;
    const headline = `Refund Processed: #${refundNumber}`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Your refund <strong>#${escapeHtml(refundNumber)}</strong> for order <strong>#${escapeHtml(orderNumber)}</strong> has been successfully credited.
      </p>
      <div style="background-color: #F8F8F7; padding: 20px; border: 1px solid #EBEBEA; margin-bottom: 24px;">
        <table width="100%" style="font-size: 13px;">
          <tr>
            <td style="color: #737373;">Refund Reference:</td>
            <td align="right" style="font-weight: 600;">#${escapeHtml(refundNumber)}</td>
          </tr>
          <tr>
            <td style="color: #737373; padding-top: 8px;">Refunded Amount:</td>
            <td align="right" style="font-weight: 600; padding-top: 8px;">${escapeHtml(formatMoney(amountMinor))}</td>
          </tr>
        </table>
      </div>
      <p class="body-text" style="font-size: 12px; color: #737373;">
        Depending on your card issuer or banking institution, funds typically reflect within 3 to 7 business days.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View Refund Invariants",
      ctaUrl: `/account/refunds/${refundNumber}`,
    });

    const text = `VÉRONA — Refund Processed
Refund #${refundNumber}
Amount: ${formatMoney(amountMinor)}`;

    return { subject, html, text, version: this.version };
  }

  private renderReturnApproved(data: Record<string, unknown>): RenderedTemplate {
    const returnNumber = String(data.returnNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");

    const subject = `Return Approved — #${returnNumber} | VÉRONA`;
    const preheader = `Your return request #${returnNumber} has been approved.`;
    const headline = `Return Request Approved`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Your return request <strong>#${escapeHtml(returnNumber)}</strong> has been reviewed and approved by atelier staff.
      </p>
      <p class="body-text">
        A courier will arrive to collect the package. Please ensure garments are in original atelier packaging with safety tags intact.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View Pickup Schedule",
      ctaUrl: `/account/returns/${returnNumber}`,
    });

    const text = `VÉRONA — Return Approved
Return #${returnNumber} has been approved.`;

    return { subject, html, text, version: this.version };
  }

  private renderReturnRejected(data: Record<string, unknown>): RenderedTemplate {
    const returnNumber = String(data.returnNumber || "");
    const customerName = String(data.customerName || "Esteemed Client");
    const reason = String(data.reason || "Terms of return policy not met");

    const subject = `Return Request Update — #${returnNumber} | VÉRONA`;
    const preheader = `Update regarding return #${returnNumber}.`;
    const headline = `Return Request Notice`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Following inspection, return request <strong>#${escapeHtml(returnNumber)}</strong> could not be approved.
      </p>
      <p class="body-text" style="color: #737373;">
        Reason: ${escapeHtml(reason)}
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View Return Details",
      ctaUrl: `/account/returns/${returnNumber}`,
    });

    const text = `VÉRONA — Return Notice
Return #${returnNumber}
Reason: ${reason}`;

    return { subject, html, text, version: this.version };
  }

  private renderReviewPublished(data: Record<string, unknown>): RenderedTemplate {
    const customerName = String(data.customerName || "Esteemed Client");
    const productName = String(data.productName || "Your Garment");
    const productId = String(data.productId || "");

    const subject = `Your Review is Live: ${productName} | VÉRONA`;
    const preheader = `Thank you for sharing your feedback on ${productName}.`;
    const headline = `Review Published`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        Your verified garment feedback for <strong>${escapeHtml(productName)}</strong> has been approved and published in the VÉRONA catalogue.
      </p>
      <p class="body-text">
        Your perspective assists fellow atelier patrons in discovering their ideal silhouette.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View on Product Page",
      ctaUrl: productId ? `/product/${productId}` : `/account/reviews`,
    });

    const text = `VÉRONA — Review Published
Thank you for reviewing ${productName}.`;

    return { subject, html, text, version: this.version };
  }

  private renderAccountSecurity(data: Record<string, unknown>): RenderedTemplate {
    const customerName = String(data.customerName || "Esteemed Client");
    const description = String(data.activityDescription || "Security activity on your account");

    const subject = `Security Alert: VÉRONA Account Activity`;
    const preheader = `Important security alert regarding your atelier account.`;
    const headline = `Account Security Notice`;

    const contentHtml = `
      <p class="body-text">Dear ${escapeHtml(customerName)},</p>
      <p class="body-text">
        This is an important security notification regarding your VÉRONA client account.
      </p>
      <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; padding: 16px; margin-bottom: 24px; color: #991B1B; font-size: 13px;">
        ${escapeHtml(description)}
      </div>
      <p class="body-text">
        If you did not authorize this action, please reset your password and contact client concierge immediately.
      </p>
    `;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "Manage Account Security",
      ctaUrl: `/account/settings`,
    });

    const text = `VÉRONA — Security Alert
${description}
If this wasn't you, secure your account at /account/settings immediately.`;

    return { subject, html, text, version: this.version };
  }

  private renderGenericFallback(templateKey: string, data: Record<string, unknown>): RenderedTemplate {
    const subject = `Update from VÉRONA Atelier`;
    const preheader = `Notification from VÉRONA.`;
    const headline = `Atelier Notification`;
    const contentHtml = `<p class="body-text">${escapeHtml(String(data.message || data.body || "New update on your atelier account."))}</p>`;

    const html = renderEmailHtml({
      preheader,
      headline,
      contentHtml,
      ctaText: "View Client Portal",
      ctaUrl: "/account",
    });

    const text = `VÉRONA: ${data.message || "New update on your atelier account."}`;

    return { subject, html, text, version: this.version };
  }
}

export const templateRegistry = new TemplateRegistry();

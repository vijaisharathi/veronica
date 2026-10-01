/**
 * VÉRONA — Central Mongoose Models Registry
 *
 * Safe compilation and export of all Mongoose models.
 * Uses `mongoose.models[name] || mongoose.model(...)` to prevent OverwriteModelError
 * during Next.js server hot reloading in development.
 */

import mongoose, { Model } from "mongoose";
import * as schemas from "./schemas";
import * as types from "@/types/database";

export const CustomerModel: Model<types.ICustomer> =
  (mongoose.models.Customer as Model<types.ICustomer>) ||
  mongoose.model<types.ICustomer>("Customer", schemas.CustomerSchema);

export const StaffModel: Model<types.IStaff> =
  (mongoose.models.Staff as Model<types.IStaff>) ||
  mongoose.model<types.IStaff>("Staff", schemas.StaffSchema);

export const RoleModel: Model<types.IRole> =
  (mongoose.models.Role as Model<types.IRole>) ||
  mongoose.model<types.IRole>("Role", schemas.RoleSchema);

export const PermissionModel: Model<types.IPermission> =
  (mongoose.models.Permission as Model<types.IPermission>) ||
  mongoose.model<types.IPermission>("Permission", schemas.PermissionSchema);

export const CategoryModel: Model<types.ICategory> =
  (mongoose.models.Category as Model<types.ICategory>) ||
  mongoose.model<types.ICategory>("Category", schemas.CategorySchema);

export const BrandModel: Model<types.IBrand> =
  (mongoose.models.Brand as Model<types.IBrand>) ||
  mongoose.model<types.IBrand>("Brand", schemas.BrandSchema);

export const ProductModel: Model<types.IProduct> =
  (mongoose.models.Product as Model<types.IProduct>) ||
  mongoose.model<types.IProduct>("Product", schemas.ProductSchema);

export const ProductVariantModel: Model<types.IProductVariant> =
  (mongoose.models.ProductVariant as Model<types.IProductVariant>) ||
  mongoose.model<types.IProductVariant>("ProductVariant", schemas.ProductVariantSchema);

export const ColorModel: Model<types.IColor> =
  (mongoose.models.Color as Model<types.IColor>) ||
  mongoose.model<types.IColor>("Color", schemas.ColorSchema);

export const SizeAttributeModel: Model<types.ISizeAttribute> =
  (mongoose.models.SizeAttribute as Model<types.ISizeAttribute>) ||
  mongoose.model<types.ISizeAttribute>("SizeAttribute", schemas.SizeAttributeSchema);

export const FashionCollectionModel: Model<types.IFashionCollection> =
  (mongoose.models.FashionCollection as Model<types.IFashionCollection>) ||
  mongoose.model<types.IFashionCollection>("FashionCollection", schemas.FashionCollectionSchema);

export const WarehouseModel: Model<types.IWarehouse> =
  (mongoose.models.Warehouse as Model<types.IWarehouse>) ||
  mongoose.model<types.IWarehouse>("Warehouse", schemas.WarehouseSchema);

export const InventoryItemModel: Model<types.IInventoryItem> =
  (mongoose.models.InventoryItem as Model<types.IInventoryItem>) ||
  mongoose.model<types.IInventoryItem>("InventoryItem", schemas.InventoryItemSchema);

export const StockMovementModel: Model<types.IStockMovement> =
  (mongoose.models.StockMovement as Model<types.IStockMovement>) ||
  mongoose.model<types.IStockMovement>("StockMovement", schemas.StockMovementSchema);

export const StockReservationModel: Model<types.IStockReservation> =
  (mongoose.models.StockReservation as Model<types.IStockReservation>) ||
  mongoose.model<types.IStockReservation>("StockReservation", schemas.StockReservationSchema);

export const AddressModel: Model<types.IAddress> =
  (mongoose.models.Address as Model<types.IAddress>) ||
  mongoose.model<types.IAddress>("Address", schemas.AddressSchema);

export const CartModel: Model<types.ICart> =
  (mongoose.models.Cart as Model<types.ICart>) ||
  mongoose.model<types.ICart>("Cart", schemas.CartSchema);

export const CartItemModel: Model<types.ICartItem> =
  (mongoose.models.CartItem as Model<types.ICartItem>) ||
  mongoose.model<types.ICartItem>("CartItem", schemas.CartItemSchema);

export const WishlistModel: Model<types.IWishlist> =
  (mongoose.models.Wishlist as Model<types.IWishlist>) ||
  mongoose.model<types.IWishlist>("Wishlist", schemas.WishlistSchema);

export const WishlistItemModel: Model<types.IWishlistItem> =
  (mongoose.models.WishlistItem as Model<types.IWishlistItem>) ||
  mongoose.model<types.IWishlistItem>("WishlistItem", schemas.WishlistItemSchema);

export const RecentlyViewedModel: Model<types.IRecentlyViewed> =
  (mongoose.models.RecentlyViewed as Model<types.IRecentlyViewed>) ||
  mongoose.model<types.IRecentlyViewed>("RecentlyViewed", schemas.RecentlyViewedSchema);

export const CouponModel: Model<types.ICoupon> =
  (mongoose.models.Coupon as Model<types.ICoupon>) ||
  mongoose.model<types.ICoupon>("Coupon", schemas.CouponSchema);

export const CouponUsageModel: Model<types.ICouponUsage> =
  (mongoose.models.CouponUsage as Model<types.ICouponUsage>) ||
  mongoose.model<types.ICouponUsage>("CouponUsage", schemas.CouponUsageSchema);

export const CampaignModel: Model<types.ICampaign> =
  (mongoose.models.Campaign as Model<types.ICampaign>) ||
  mongoose.model<types.ICampaign>("Campaign", schemas.CampaignSchema);

export const OrderModel: Model<types.IOrder> =
  (mongoose.models.Order as Model<types.IOrder>) ||
  mongoose.model<types.IOrder>("Order", schemas.OrderSchema);

export const OrderStatusHistoryModel: Model<types.IOrderStatusHistory> =
  (mongoose.models.OrderStatusHistory as Model<types.IOrderStatusHistory>) ||
  mongoose.model<types.IOrderStatusHistory>("OrderStatusHistory", schemas.OrderStatusHistorySchema);

export const PaymentModel: Model<types.IPayment> =
  (mongoose.models.Payment as Model<types.IPayment>) ||
  mongoose.model<types.IPayment>("Payment", schemas.PaymentSchema);

export const PaymentAttemptModel: Model<types.IPaymentAttempt> =
  (mongoose.models.PaymentAttempt as Model<types.IPaymentAttempt>) ||
  mongoose.model<types.IPaymentAttempt>("PaymentAttempt", schemas.PaymentAttemptSchema);

export const PaymentWebhookEventModel: Model<types.IPaymentWebhookEvent> =
  (mongoose.models.PaymentWebhookEvent as Model<types.IPaymentWebhookEvent>) ||
  mongoose.model<types.IPaymentWebhookEvent>("PaymentWebhookEvent", schemas.PaymentWebhookEventSchema);

export const PaymentStatusHistoryModel: Model<types.IPaymentStatusHistory> =
  (mongoose.models.PaymentStatusHistory as Model<types.IPaymentStatusHistory>) ||
  mongoose.model<types.IPaymentStatusHistory>("PaymentStatusHistory", schemas.PaymentStatusHistorySchema);

export const RefundModel: Model<types.IRefund> =
  (mongoose.models.Refund as Model<types.IRefund>) ||
  mongoose.model<types.IRefund>("Refund", schemas.RefundSchema);

export const ShipmentModel: Model<types.IShipment> =
  (mongoose.models.Shipment as Model<types.IShipment>) ||
  mongoose.model<types.IShipment>("Shipment", schemas.ShipmentSchema);

export const ShipmentEventModel: Model<types.IShipmentEvent> =
  (mongoose.models.ShipmentEvent as Model<types.IShipmentEvent>) ||
  mongoose.model<types.IShipmentEvent>("ShipmentEvent", schemas.ShipmentEventSchema);

export const FulfillmentModel: Model<types.IFulfillment> =
  (mongoose.models.Fulfillment as Model<types.IFulfillment>) ||
  mongoose.model<types.IFulfillment>("Fulfillment", schemas.FulfillmentSchema);

export const PackageModel: Model<types.IPackage> =
  (mongoose.models.Package as Model<types.IPackage>) ||
  mongoose.model<types.IPackage>("Package", schemas.PackageSchema);

export const ShippingWebhookEventModel: Model<types.IShippingWebhookEvent> =
  (mongoose.models.ShippingWebhookEvent as Model<types.IShippingWebhookEvent>) ||
  mongoose.model<types.IShippingWebhookEvent>("ShippingWebhookEvent", schemas.ShippingWebhookEventSchema);

export const ReturnRequestModel: Model<types.IReturnRequest> =
  (mongoose.models.ReturnRequest as Model<types.IReturnRequest>) ||
  mongoose.model<types.IReturnRequest>("ReturnRequest", schemas.ReturnRequestSchema);

export const ExchangeRequestModel: Model<types.IExchangeRequest> =
  (mongoose.models.ExchangeRequest as Model<types.IExchangeRequest>) ||
  mongoose.model<types.IExchangeRequest>("ExchangeRequest", schemas.ExchangeRequestSchema);

export const ReviewModel: Model<types.IReview> =
  (mongoose.models.Review as Model<types.IReview>) ||
  mongoose.model<types.IReview>("Review", schemas.ReviewSchema);

export const ReviewVoteModel: Model<types.IReviewVote> =
  (mongoose.models.ReviewVote as Model<types.IReviewVote>) ||
  mongoose.model<types.IReviewVote>("ReviewVote", schemas.ReviewVoteSchema);

export const ReviewReportModel: Model<types.IReviewReport> =
  (mongoose.models.ReviewReport as Model<types.IReviewReport>) ||
  mongoose.model<types.IReviewReport>("ReviewReport", schemas.ReviewReportSchema);

export const ProductRatingAggregateModel: Model<types.IProductRatingAggregate> =
  (mongoose.models.ProductRatingAggregate as Model<types.IProductRatingAggregate>) ||
  mongoose.model<types.IProductRatingAggregate>("ProductRatingAggregate", schemas.ProductRatingAggregateSchema);

export const NotificationModel: Model<types.INotification> =
  (mongoose.models.Notification as Model<types.INotification>) ||
  mongoose.model<types.INotification>("Notification", schemas.NotificationSchema);

export const NotificationPreferenceModel: Model<types.INotificationPreference> =
  (mongoose.models.NotificationPreference as Model<types.INotificationPreference>) ||
  mongoose.model<types.INotificationPreference>("NotificationPreference", schemas.NotificationPreferenceSchema);

export const EmailEventModel: Model<types.IEmailEvent> =
  (mongoose.models.EmailEvent as Model<types.IEmailEvent>) ||
  mongoose.model<types.IEmailEvent>("EmailEvent", schemas.EmailEventSchema);

export const NotificationDeliveryAttemptModel: Model<types.INotificationDeliveryAttempt> =
  (mongoose.models.NotificationDeliveryAttempt as Model<types.INotificationDeliveryAttempt>) ||
  mongoose.model<types.INotificationDeliveryAttempt>("NotificationDeliveryAttempt", schemas.NotificationDeliveryAttemptSchema);

export const SupportTicketModel: Model<types.ISupportTicket> =
  (mongoose.models.SupportTicket as Model<types.ISupportTicket>) ||
  mongoose.model<types.ISupportTicket>("SupportTicket", schemas.SupportTicketSchema);

export const SupportMessageModel: Model<types.ISupportMessage> =
  (mongoose.models.SupportMessage as Model<types.ISupportMessage>) ||
  mongoose.model<types.ISupportMessage>("SupportMessage", schemas.SupportMessageSchema);

export const BannerModel: Model<types.IBanner> =
  (mongoose.models.Banner as Model<types.IBanner>) ||
  mongoose.model<types.IBanner>("Banner", schemas.BannerSchema);

export const HomepageSectionModel: Model<types.IHomepageSection> =
  (mongoose.models.HomepageSection as Model<types.IHomepageSection>) ||
  mongoose.model<types.IHomepageSection>("HomepageSection", schemas.HomepageSectionSchema);

export const EditorialStoryModel: Model<types.IEditorialStory> =
  (mongoose.models.EditorialStory as Model<types.IEditorialStory>) ||
  mongoose.model<types.IEditorialStory>("EditorialStory", schemas.EditorialStorySchema);

export const AuditLogModel: Model<types.IAuditLog> =
  (mongoose.models.AuditLog as Model<types.IAuditLog>) ||
  mongoose.model<types.IAuditLog>("AuditLog", schemas.AuditLogSchema);

export const SystemSettingsModel: Model<types.ISystemSettings> =
  (mongoose.models.SystemSettings as Model<types.ISystemSettings>) ||
  mongoose.model<types.ISystemSettings>("SystemSettings", schemas.SystemSettingsSchema);

export const ServiceabilityRuleModel: Model<types.IServiceabilityRule> =
  (mongoose.models.ServiceabilityRule as Model<types.IServiceabilityRule>) ||
  mongoose.model<types.IServiceabilityRule>("ServiceabilityRule", schemas.ServiceabilityRuleSchema);

export const CheckoutSessionModel: Model<types.ICheckoutSession> =
  (mongoose.models.CheckoutSession as Model<types.ICheckoutSession>) ||
  mongoose.model<types.ICheckoutSession>("CheckoutSession", schemas.CheckoutSessionSchema);

export const ALL_MODELS = [
  CustomerModel,
  StaffModel,
  RoleModel,
  PermissionModel,
  CategoryModel,
  BrandModel,
  ProductModel,
  ProductVariantModel,
  ColorModel,
  SizeAttributeModel,
  FashionCollectionModel,
  WarehouseModel,
  InventoryItemModel,
  StockMovementModel,
  StockReservationModel,
  AddressModel,
  CartModel,
  CartItemModel,
  WishlistModel,
  WishlistItemModel,
  RecentlyViewedModel,
  CouponModel,
  CouponUsageModel,
  CampaignModel,
  OrderModel,
  OrderStatusHistoryModel,
  PaymentModel,
  PaymentAttemptModel,
  PaymentWebhookEventModel,
  PaymentStatusHistoryModel,
  RefundModel,
  FulfillmentModel,
  PackageModel,
  ShipmentModel,
  ShipmentEventModel,
  ShippingWebhookEventModel,
  ReturnRequestModel,
  ExchangeRequestModel,
  ReviewModel,
  NotificationModel,
  NotificationPreferenceModel,
  EmailEventModel,
  NotificationDeliveryAttemptModel,
  SupportTicketModel,
  SupportMessageModel,
  BannerModel,
  HomepageSectionModel,
  EditorialStoryModel,
  AuditLogModel,
  SystemSettingsModel,
  ServiceabilityRuleModel,
  CheckoutSessionModel,
];

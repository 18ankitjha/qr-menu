import { Types } from 'mongoose';
import { RestaurantModel } from '../../restaurant/dm/restaurant.model';
import { IRestaurant } from '../../restaurant/interfaces/restaurant.interface';
import { UserModel } from '../../auth/dm/user.model';
import { MenuModel } from '../../menu/dm/menu.model';
import { CategoryModel } from '../../menu/dm/category.model';
import { DishModel } from '../../menu/dm/dish.model';
import { TableModel } from '../../table/dm/table.model';
import { StaffModel } from '../../staff/dm/staff.model';
import { OrderModel } from '../../order/dm/order.model';
import { BillModel } from '../../billing/dm/bill.model';
import { CounterModel } from '../../billing/dm/counter.model';
import { BILL_NUMBER } from '../../billing/constants/billing.constants';
import { TableSessionModel } from '../../table-session/dm/table-session.model';
import { releaseImage } from '../../upload/dm/image-cleanup.dm';
import { deleteTableQr } from '../../table/utils/qr.util';
import { logger } from '../../../utils/logger';
import { IRestaurantDeletionSummary } from '../interfaces/super-admin.interface';

// ============================================================
// Restaurant Deletion — permanently removes a restaurant, its owner and everything under it
// ============================================================

const isPresent = (url: unknown): url is string => typeof url === 'string' && url.length > 0;

/**
 * Hard-deletes the restaurant, all its data and its owner's account, then frees its Cloudinary images.
 * Children go first and the restaurant last, so a failure part-way can simply be retried.
 */
export const deleteRestaurantCascade = async (restaurant: IRestaurant): Promise<IRestaurantDeletionSummary> => {
  const restaurantId = new Types.ObjectId(restaurant._id.toString());

  const menus = await MenuModel.find({ restaurantId }).select('_id theme.backgroundImageUrl').lean();
  const menuIds = menus.map((menu) => menu._id);
  const [dishes, categories, tables] = await Promise.all([
    DishModel.find({ menuId: { $in: menuIds } }).select('imageUrl').lean(),
    CategoryModel.find({ menuId: { $in: menuIds } }).select('imageUrl').lean(),
    TableModel.find({ restaurantId }).select('_id').lean(),
  ]);

  const imageUrls = [
    ...new Set(
      [
        restaurant.logoUrl,
        ...menus.map((menu) => menu.theme?.backgroundImageUrl),
        ...dishes.map((dish) => dish.imageUrl),
        ...categories.map((category) => category.imageUrl),
      ].filter(isPresent)
    ),
  ];

  const [dishRes, categoryRes, menuRes, tableRes, staffRes, orderRes, billRes, sessionRes] = await Promise.all([
    DishModel.deleteMany({ menuId: { $in: menuIds } }),
    CategoryModel.deleteMany({ menuId: { $in: menuIds } }),
    MenuModel.deleteMany({ restaurantId }),
    TableModel.deleteMany({ restaurantId }),
    StaffModel.deleteMany({ restaurantId }),
    OrderModel.deleteMany({ restaurantId }),
    BillModel.deleteMany({ restaurantId }),
    TableSessionModel.deleteMany({ restaurantId }),
    CounterModel.deleteMany({ key: `${BILL_NUMBER.COUNTER_KEY_PREFIX}${restaurant._id.toString()}` }),
  ]);

  await RestaurantModel.deleteOne({ _id: restaurantId });
  const ownerRes = await UserModel.deleteOne({ _id: restaurant.ownerId });

  // Storage cleanup after the DB is consistent; both helpers are fire-and-forget and never throw.
  imageUrls.forEach((url) => void releaseImage(url));
  tables.forEach((table) => deleteTableQr(table._id.toString()));

  const summary: IRestaurantDeletionSummary = {
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.name,
    ownerDeleted: ownerRes.deletedCount > 0,
    deleted: {
      menus: menuRes.deletedCount,
      categories: categoryRes.deletedCount,
      dishes: dishRes.deletedCount,
      tables: tableRes.deletedCount,
      staff: staffRes.deletedCount,
      orders: orderRes.deletedCount,
      bills: billRes.deletedCount,
      tableSessions: sessionRes.deletedCount,
    },
    imagesQueued: imageUrls.length + tables.length,
  };
  logger.info(`Restaurant deleted: ${JSON.stringify(summary)}`);
  return summary;
};

import mongoose from 'mongoose';
import { env } from './config/env';
import { UserModel } from './dm/user/user.model';
import { RestaurantModel } from './dm/restaurant/restaurant.model';
import { MenuModel } from './dm/menu/menu.model';
import { CategoryModel } from './dm/category/category.model';
import { DishModel } from './dm/dish/dish.model';
import { TableModel } from './dm/table/table.model';
import { OrderModel } from './dm/order/order.model';
import { OrderStatus, DEFAULT_MENU_THEME } from './config/constants';

// ============================================================
// Seed Script — Populates DB with test data for E2E testing
// ============================================================

const SEED = {
  LOG_CONNECTING: 'Connecting to MongoDB...',
  LOG_CONNECTED: 'Connected. Clearing existing data...',
  LOG_CLEARED: 'Cleared. Seeding data...',
  LOG_USER: 'Seeded: User',
  LOG_RESTAURANT: 'Seeded: Restaurant',
  LOG_MENU: 'Seeded: Menu',
  LOG_CATEGORIES: (count: number) => `Seeded: ${count} Categories`,
  LOG_DISHES: (count: number) => `Seeded: ${count} Dishes`,
  LOG_TABLES: (count: number) => `Seeded: ${count} Tables`,
  LOG_ORDERS: (count: number) => `Seeded: ${count} Orders`,
  LOG_DONE: '✅ Seed complete!',
  LOG_IDS: 'IDs for testing:',
  LOG_FAILED: '❌ Seed failed:',
} as const;

const seed = async () => {
  try {
    console.log(SEED.LOG_CONNECTING);
    await mongoose.connect(env.MONGODB_URI);
    console.log(SEED.LOG_CONNECTED);

    // Clear all collections
    await Promise.all([
      UserModel.deleteMany({}),
      RestaurantModel.deleteMany({}),
      MenuModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      DishModel.deleteMany({}),
      TableModel.deleteMany({}),
      OrderModel.deleteMany({}),
    ]);
    console.log(SEED.LOG_CLEARED);

    // 1. Create User
    const user = await UserModel.create({
      googleId: 'seed_google_id_12345',
      email: 'seeduser@test.com',
      name: 'Seed Admin',
      profilePicture: 'https://ui-avatars.com/api/?name=Seed+Admin&background=FF6B35&color=fff',
    });
    console.log(SEED.LOG_USER);

    // 2. Create Restaurant (GPS: Mumbai — Andheri)
    const restaurant = await RestaurantModel.create({
      ownerId: user._id,
      name: 'The Spice Garden 🌶️',
      address: '42 Linking Road, Bandra West, Mumbai 400050',
      gpsCoordinates: { latitude: 19.0596, longitude: 72.8295 },
      gpsRadiusMeters: 500,
      isActive: true,
    });

    // Link restaurant to user
    user.restaurantId = restaurant._id as mongoose.Types.ObjectId;
    await user.save();
    console.log(SEED.LOG_RESTAURANT);

    // 3. Create Menu
    const menu = await MenuModel.create({
      restaurantId: restaurant._id,
      name: 'Main Menu',
      isActive: true,
      theme: { ...DEFAULT_MENU_THEME },
    });
    console.log(SEED.LOG_MENU);

    // 4. Create Categories
    const categories = await CategoryModel.insertMany([
      { menuId: menu._id, name: 'Starters', description: 'Begin your meal right', displayOrder: 0, isActive: true },
      { menuId: menu._id, name: 'Main Course', description: 'Hearty entrees', displayOrder: 1, isActive: true },
      { menuId: menu._id, name: 'Biryani & Rice', description: 'Fragrant rice dishes', displayOrder: 2, isActive: true },
      { menuId: menu._id, name: 'Breads', description: 'Fresh from the tandoor', displayOrder: 3, isActive: true },
      { menuId: menu._id, name: 'Beverages', description: 'Refreshing drinks', displayOrder: 4, isActive: true },
      { menuId: menu._id, name: 'Desserts', description: 'Sweet endings', displayOrder: 5, isActive: true },
    ]);
    console.log(SEED.LOG_CATEGORIES(categories.length));

    // 5. Create Dishes
    const [starters, mainCourse, biryani, breads, beverages, desserts] = categories;

    const dishes = await DishModel.insertMany([
      // Starters
      { categoryId: starters._id, menuId: menu._id, name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled in tandoor', price: 280, isVeg: true, isAvailable: true, preparationTime: 15, tags: ['bestseller', 'tandoor'], displayOrder: 0 },
      { categoryId: starters._id, menuId: menu._id, name: 'Chicken 65', description: 'Spicy deep-fried chicken bites', price: 320, isVeg: false, isAvailable: true, preparationTime: 12, tags: ['spicy', 'popular'], displayOrder: 1 },
      { categoryId: starters._id, menuId: menu._id, name: 'Veg Spring Rolls', description: 'Crispy rolls stuffed with mixed vegetables', price: 220, isVeg: true, isAvailable: true, preparationTime: 10, tags: ['crunchy'], displayOrder: 2 },
      { categoryId: starters._id, menuId: menu._id, name: 'Fish Amritsari', description: 'Batter-fried fish with spiced coating', price: 380, isVeg: false, isAvailable: true, preparationTime: 15, tags: ['seafood'], displayOrder: 3 },

      // Main Course
      { categoryId: mainCourse._id, menuId: menu._id, name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry', price: 380, isVeg: false, isAvailable: true, preparationTime: 20, tags: ['bestseller', 'creamy'], displayOrder: 0 },
      { categoryId: mainCourse._id, menuId: menu._id, name: 'Dal Makhani', description: 'Slow-cooked black lentils in rich gravy', price: 260, isVeg: true, isAvailable: true, preparationTime: 25, tags: ['comfort food'], displayOrder: 1 },
      { categoryId: mainCourse._id, menuId: menu._id, name: 'Palak Paneer', description: 'Cottage cheese in creamy spinach sauce', price: 290, isVeg: true, isAvailable: true, preparationTime: 18, tags: ['healthy'], displayOrder: 2 },
      { categoryId: mainCourse._id, menuId: menu._id, name: 'Mutton Rogan Josh', description: 'Kashmiri-style slow-cooked lamb', price: 450, isVeg: false, isAvailable: true, preparationTime: 30, tags: ['premium', 'spicy'], displayOrder: 3 },
      { categoryId: mainCourse._id, menuId: menu._id, name: 'Chole Bhature', description: 'Spiced chickpea curry with fried bread', price: 220, isVeg: true, isAvailable: false, preparationTime: 15, tags: ['north indian'], displayOrder: 4 },

      // Biryani
      { categoryId: biryani._id, menuId: menu._id, name: 'Hyderabadi Chicken Biryani', description: 'Dum-cooked aromatic rice with tender chicken', price: 350, isVeg: false, isAvailable: true, preparationTime: 25, tags: ['bestseller', 'dum'], displayOrder: 0 },
      { categoryId: biryani._id, menuId: menu._id, name: 'Paneer Biryani', description: 'Fragrant rice with marinated paneer', price: 320, isVeg: true, isAvailable: true, preparationTime: 22, tags: ['aromatic'], displayOrder: 1 },
      { categoryId: biryani._id, menuId: menu._id, name: 'Jeera Rice', description: 'Cumin-tempered basmati rice', price: 140, isVeg: true, isAvailable: true, preparationTime: 10, tags: ['side'], displayOrder: 2 },

      // Breads
      { categoryId: breads._id, menuId: menu._id, name: 'Butter Naan', description: 'Soft leavened bread brushed with butter', price: 60, isVeg: true, isAvailable: true, preparationTime: 5, tags: ['tandoor'], displayOrder: 0 },
      { categoryId: breads._id, menuId: menu._id, name: 'Garlic Naan', description: 'Naan topped with garlic and coriander', price: 80, isVeg: true, isAvailable: true, preparationTime: 5, tags: ['bestseller', 'tandoor'], displayOrder: 1 },
      { categoryId: breads._id, menuId: menu._id, name: 'Laccha Paratha', description: 'Layered flaky whole-wheat bread', price: 70, isVeg: true, isAvailable: true, preparationTime: 8, tags: ['tandoor'], displayOrder: 2 },
      { categoryId: breads._id, menuId: menu._id, name: 'Tandoori Roti', description: 'Whole wheat bread baked in tandoor', price: 40, isVeg: true, isAvailable: true, preparationTime: 4, tags: ['healthy'], displayOrder: 3 },

      // Beverages
      { categoryId: beverages._id, menuId: menu._id, name: 'Mango Lassi', description: 'Chilled yogurt smoothie with mango pulp', price: 140, isVeg: true, isAvailable: true, preparationTime: 5, tags: ['refreshing', 'sweet'], displayOrder: 0 },
      { categoryId: beverages._id, menuId: menu._id, name: 'Masala Chai', description: 'Traditional spiced tea with milk', price: 60, isVeg: true, isAvailable: true, preparationTime: 5, tags: ['hot', 'classic'], displayOrder: 1 },
      { categoryId: beverages._id, menuId: menu._id, name: 'Fresh Lime Soda', description: 'Sweet or salted — your choice', price: 80, isVeg: true, isAvailable: true, preparationTime: 3, tags: ['refreshing'], displayOrder: 2 },
      { categoryId: beverages._id, menuId: menu._id, name: 'Cold Coffee', description: 'Blended iced coffee with cream', price: 160, isVeg: true, isAvailable: true, preparationTime: 5, tags: ['caffeinated', 'cold'], displayOrder: 3 },

      // Desserts
      { categoryId: desserts._id, menuId: menu._id, name: 'Gulab Jamun', description: 'Deep-fried milk dumplings in sugar syrup', price: 120, isVeg: true, isAvailable: true, preparationTime: 3, tags: ['classic', 'sweet'], displayOrder: 0 },
      { categoryId: desserts._id, menuId: menu._id, name: 'Rasmalai', description: 'Soft paneer discs in saffron milk', price: 150, isVeg: true, isAvailable: true, preparationTime: 3, tags: ['premium', 'sweet'], displayOrder: 1 },
      { categoryId: desserts._id, menuId: menu._id, name: 'Brownie with Ice Cream', description: 'Warm chocolate brownie with vanilla scoop', price: 200, isVeg: true, isAvailable: true, preparationTime: 5, tags: ['indulgent'], displayOrder: 2 },
    ]);
    console.log(SEED.LOG_DISHES(dishes.length));

    // 6. Create Tables (5 tables)
    const tables = await TableModel.insertMany([
      { restaurantId: restaurant._id, tableNumber: 1, label: 'Window Seat', isActive: true },
      { restaurantId: restaurant._id, tableNumber: 2, label: 'Couple Table', isActive: true },
      { restaurantId: restaurant._id, tableNumber: 3, label: 'Family Booth', isActive: true },
      { restaurantId: restaurant._id, tableNumber: 4, label: 'Garden', isActive: true },
      { restaurantId: restaurant._id, tableNumber: 5, label: 'Bar Counter', isActive: true },
    ]);
    console.log(SEED.LOG_TABLES(tables.length));

    // 7. Create sample orders (various statuses)
    const sampleOrders = await OrderModel.insertMany([
      {
        restaurantId: restaurant._id,
        tableId: tables[0]._id,
        items: [
          { dishId: dishes[0]._id, dishName: 'Paneer Tikka', quantity: 2, price: 280 },
          { dishId: dishes[4]._id, dishName: 'Butter Chicken', quantity: 1, price: 380 },
          { dishId: dishes[12]._id, dishName: 'Butter Naan', quantity: 3, price: 60 },
        ],
        status: OrderStatus.PLACED,
        customerName: 'Rahul',
        totalAmount: 2 * 280 + 380 + 3 * 60,
        gpsCoordinates: { latitude: 19.0596, longitude: 72.8295 },
      },
      {
        restaurantId: restaurant._id,
        tableId: tables[1]._id,
        items: [
          { dishId: dishes[9]._id, dishName: 'Hyderabadi Chicken Biryani', quantity: 2, price: 350 },
          { dishId: dishes[16]._id, dishName: 'Mango Lassi', quantity: 2, price: 140 },
        ],
        status: OrderStatus.CONFIRMED,
        customerName: 'Priya',
        totalAmount: 2 * 350 + 2 * 140,
        gpsCoordinates: { latitude: 19.0597, longitude: 72.8296 },
      },
      {
        restaurantId: restaurant._id,
        tableId: tables[2]._id,
        items: [
          { dishId: dishes[5]._id, dishName: 'Dal Makhani', quantity: 1, price: 260 },
          { dishId: dishes[6]._id, dishName: 'Palak Paneer', quantity: 1, price: 290 },
          { dishId: dishes[10]._id, dishName: 'Paneer Biryani', quantity: 1, price: 320 },
          { dishId: dishes[14]._id, dishName: 'Laccha Paratha', quantity: 2, price: 70 },
          { dishId: dishes[20]._id, dishName: 'Gulab Jamun', quantity: 2, price: 120 },
        ],
        status: OrderStatus.COOKING,
        specialInstructions: 'Less spicy please, extra butter in dal',
        customerName: 'Sharma Family',
        totalAmount: 260 + 290 + 320 + 2 * 70 + 2 * 120,
        gpsCoordinates: { latitude: 19.0595, longitude: 72.8294 },
      },
      {
        restaurantId: restaurant._id,
        tableId: tables[3]._id,
        items: [
          { dishId: dishes[7]._id, dishName: 'Mutton Rogan Josh', quantity: 1, price: 450 },
          { dishId: dishes[13]._id, dishName: 'Garlic Naan', quantity: 2, price: 80 },
          { dishId: dishes[18]._id, dishName: 'Fresh Lime Soda', quantity: 1, price: 80 },
        ],
        status: OrderStatus.READY,
        customerName: 'Amit',
        totalAmount: 450 + 2 * 80 + 80,
        gpsCoordinates: { latitude: 19.0598, longitude: 72.8297 },
      },
      {
        restaurantId: restaurant._id,
        tableId: tables[4]._id,
        items: [
          { dishId: dishes[1]._id, dishName: 'Chicken 65', quantity: 1, price: 320 },
          { dishId: dishes[19]._id, dishName: 'Cold Coffee', quantity: 2, price: 160 },
        ],
        status: OrderStatus.DELIVERED,
        customerName: 'Neha',
        totalAmount: 320 + 2 * 160,
        gpsCoordinates: { latitude: 19.0594, longitude: 72.8293 },
      },
    ]);
    console.log(SEED.LOG_ORDERS(sampleOrders.length));

    // Print IDs for testing
    console.log(`\n${SEED.LOG_IDS}`);
    console.log(`  Restaurant ID : ${restaurant._id}`);
    console.log(`  Menu ID       : ${menu._id}`);
    console.log(`  Table 1 ID    : ${tables[0]._id}`);
    console.log(`  Table 2 ID    : ${tables[1]._id}`);
    console.log(`\n  Customer Menu URL:`);
    console.log(`  http://localhost:5174?restaurant=${restaurant._id}&table=${tables[0]._id}`);
    console.log(`\n  Kitchen Display URL:`);
    console.log(`  http://localhost:5175?restaurant=${restaurant._id}`);

    console.log(`\n${SEED.LOG_DONE}`);
    process.exit(0);
  } catch (error) {
    console.error(SEED.LOG_FAILED, error);
    process.exit(1);
  }
};

seed();

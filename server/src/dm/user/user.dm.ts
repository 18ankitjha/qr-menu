import { UserModel } from './user.model';
import { IUser, ICreateUserInput } from '../../interfaces/user.interface';

// ============================================================
// User DM Layer — Business logic + Data access
// ============================================================

/**
 * Find a user by Google ID.
 */
export const getUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
  return UserModel.findOne({ googleId }).lean();
};

/**
 * Find a user by ID.
 */
export const getUserById = async (userId: string): Promise<IUser | null> => {
  return UserModel.findById(userId).lean();
};

/**
 * Find a user by email.
 */
export const getUserByEmail = async (email: string): Promise<IUser | null> => {
  return UserModel.findOne({ email }).lean();
};

/**
 * Create a new user (from Google OAuth).
 */
export const createUser = async (input: ICreateUserInput): Promise<IUser> => {
  const user = await UserModel.create(input);
  return user.toObject();
};

/**
 * Find or create a user from Google OAuth payload.
 * Returns the user and whether they were newly created.
 */
export const findOrCreateFromGoogle = async (
  input: ICreateUserInput
): Promise<{ user: IUser; isNewUser: boolean }> => {
  const existingUser = await getUserByGoogleId(input.googleId);

  if (existingUser) {
    // Update profile picture and name if changed
    const updated = await UserModel.findByIdAndUpdate(
      existingUser._id,
      {
        name: input.name,
        profilePicture: input.profilePicture,
      },
      { new: true }
    ).lean();

    return { user: updated as IUser, isNewUser: false };
  }

  const newUser = await createUser(input);
  return { user: newUser, isNewUser: true };
};

/**
 * Link a restaurant to a user.
 */
export const linkRestaurantToUser = async (
  userId: string,
  restaurantId: string
): Promise<IUser | null> => {
  return UserModel.findByIdAndUpdate(
    userId,
    { restaurantId },
    { new: true }
  ).lean();
};

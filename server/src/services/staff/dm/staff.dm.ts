import { StaffModel } from './staff.model';
import { createAppError } from '../../../middlewares/error.middleware';
import { IAddStaffInput, IOwnerStaffView, IPublicStaff, IStaff, IStaffWithPin } from '../interfaces/staff.interface';
import { STAFF_LIMITS, STAFF_MESSAGES, StaffLoginResult } from '../constants/staff.constants';
import { decryptPin, encryptPin, generatePin, hashPin, isPinMatch } from '../utils/pin.util';

// ============================================================
// Staff DM Layer — staff accounts and PIN login
// ============================================================

export const toPublicStaff = (staff: IStaff): IPublicStaff => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pinHash, pinEncrypted, failedLoginAttempts, lockUntil, ...rest } = staff;
  return { ...rest, hasViewablePin: !!pinEncrypted && decryptPin(pinEncrypted) !== null };
};

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

export const addStaff = async (input: IAddStaffInput): Promise<IStaffWithPin> => {
  const pin = input.pin ?? generatePin();
  try {
    const staff = await StaffModel.create({
      restaurantId: input.restaurantId,
      name: input.name,
      username: input.username,
      pinHash: hashPin(pin),
      pinEncrypted: encryptPin(pin),
    });
    return { staff: toPublicStaff(staff.toObject()), pin };
  } catch (error) {
    if (isDuplicateKeyError(error)) throw createAppError(STAFF_MESSAGES.USERNAME_TAKEN, 409);
    throw error;
  }
};

export const getStaffById = async (id: string): Promise<IStaff | null> =>
  StaffModel.findById(id).lean();

/** Active waiters of a restaurant — decides who gets the diners' "call waiter" / "bill" alerts. */
export const countActiveStaff = async (restaurantId: string): Promise<number> =>
  StaffModel.countDocuments({ restaurantId, isActive: true });

/** Staff list for the owner, with each waiter's current PIN (null until it is known). */
export const getStaffByRestaurantId = async (restaurantId: string): Promise<IOwnerStaffView[]> => {
  const staff = await StaffModel.find({ restaurantId }).sort({ createdAt: 1 }).lean();
  return staff.map((member) => {
    const pin = member.pinEncrypted ? decryptPin(member.pinEncrypted) : null;
    return { ...toPublicStaff(member), hasViewablePin: pin !== null, pin };
  });
};

export const resetPin = async (id: string, pin?: string): Promise<IStaffWithPin> => {
  const newPin = pin ?? generatePin();
  const staff = await StaffModel.findByIdAndUpdate(
    id,
    { pinHash: hashPin(newPin), pinEncrypted: encryptPin(newPin), failedLoginAttempts: 0, $unset: { lockUntil: 1 } },
    { new: true }
  ).lean();
  if (!staff) throw createAppError(STAFF_MESSAGES.NOT_FOUND, 404);
  return { staff: toPublicStaff(staff), pin: newPin };
};

/** The waiter's current PIN, for the owner. */
export const getPin = async (id: string): Promise<string> => {
  const staff = await StaffModel.findById(id).select('pinEncrypted').lean();
  if (!staff) throw createAppError(STAFF_MESSAGES.NOT_FOUND, 404);
  const pin = staff.pinEncrypted ? decryptPin(staff.pinEncrypted) : null;
  if (!pin) throw createAppError(STAFF_MESSAGES.PIN_NOT_VIEWABLE, 409);
  return pin;
};

export const setActive = async (id: string, isActive: boolean): Promise<IPublicStaff> => {
  const staff = await StaffModel.findByIdAndUpdate(id, { isActive }, { new: true }).lean();
  if (!staff) throw createAppError(STAFF_MESSAGES.NOT_FOUND, 404);
  return toPublicStaff(staff);
};

export const removeStaff = async (id: string): Promise<void> => {
  const deleted = await StaffModel.findByIdAndDelete(id);
  if (!deleted) throw createAppError(STAFF_MESSAGES.NOT_FOUND, 404);
};

/**
 * Check a staff login. Locks the account for a while after repeated wrong PINs
 * (a 6-digit PIN is guessable without this).
 */
export const verifyLogin = async (
  restaurantId: string,
  username: string,
  pin: string
): Promise<{ status: StaffLoginResult; staff?: IStaff }> => {
  const staff = await StaffModel.findOne({ restaurantId, username: username.toLowerCase() }).lean();
  if (!staff) return { status: StaffLoginResult.INVALID };

  if (staff.lockUntil && staff.lockUntil > new Date()) return { status: StaffLoginResult.LOCKED };

  if (!isPinMatch(pin, staff.pinHash)) {
    const attempts = (staff.failedLoginAttempts ?? 0) + 1;
    const lock = attempts >= STAFF_LIMITS.MAX_FAILED_LOGINS;
    await StaffModel.updateOne(
      { _id: staff._id },
      lock
        ? { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + STAFF_LIMITS.LOCK_MINUTES * 60_000) }
        : { failedLoginAttempts: attempts }
    );
    return { status: lock ? StaffLoginResult.LOCKED : StaffLoginResult.INVALID };
  }

  if (!staff.isActive) return { status: StaffLoginResult.INACTIVE };

  // Older waiters have no viewable PIN; the correct PIN is known now, so store it for the owner
  const needsViewablePin = !staff.pinEncrypted || decryptPin(staff.pinEncrypted) === null;
  await StaffModel.updateOne(
    { _id: staff._id },
    {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
      $unset: { lockUntil: 1 },
      ...(needsViewablePin ? { pinEncrypted: encryptPin(pin) } : {}),
    }
  );
  return { status: StaffLoginResult.OK, staff };
};

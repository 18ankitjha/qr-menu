import { CustomerModel } from './customer.model';
import { ICustomer, ICustomerProfile, IGoogleCustomerInput } from '../interfaces/customer.interface';

// ============================================================
// Customer DM — diners who sign in with Google on the customer menu
// ============================================================

/** Create the customer on first Google sign-in; refresh name / photo on later ones. */
export const upsertFromGoogle = async (input: IGoogleCustomerInput): Promise<ICustomer> => {
  const customer = await CustomerModel.findOneAndUpdate(
    { googleId: input.googleId },
    {
      $set: {
        email: input.email,
        name: input.name,
        profilePicture: input.profilePicture,
        lastLoginAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean<ICustomer>();
  return customer!;
};

export const getCustomerById = async (id: string): Promise<ICustomer | null> =>
  CustomerModel.findById(id).lean<ICustomer>();

export const toProfile = (customer: ICustomer): ICustomerProfile => ({
  _id: customer._id.toString(),
  name: customer.name,
  email: customer.email,
  profilePicture: customer.profilePicture,
});

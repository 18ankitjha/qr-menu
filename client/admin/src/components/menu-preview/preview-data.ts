import type { ICategory, IDish } from '../../types';
import { getCategories, getDishes } from '../../services/api';

export interface ICategoryWithDishes extends ICategory {
  dishes: IDish[];
}

/** Every category with its dishes, ordered like the customer menu (inactive / unavailable ones are hidden there). */
export const fetchCategoriesWithDishes = async (menuId: string): Promise<ICategoryWithDishes[]> => {
  const { data } = await getCategories(menuId);
  return Promise.all(
    (data.data as ICategory[]).map(async (cat) => {
      const { data: dishData } = await getDishes(cat._id);
      return { ...cat, dishes: dishData.data as IDish[] };
    })
  );
};

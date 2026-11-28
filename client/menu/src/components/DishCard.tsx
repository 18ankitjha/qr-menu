import { MAX_DISH_QUANTITY, MESSAGES } from '../constants';
import type { IDish } from '../types';
import { money } from '../utils/format.util';
import { thumbUrl } from '../utils/image.util';

interface Props {
  dish: IDish;
  /** How many of this dish others at the table already have in the cart. */
  othersQuantity: number;
  /** Who those others are (first names shown on the card). */
  othersNames?: string[];
  /** This diner's own plain quantity — the −/+ control edits it. */
  myQuantity: number;
  /** false on a view-only menu: no Add / quantity buttons. */
  canAdd: boolean;
  onAdd: () => void;
  onRemoveOne: () => void;
}

/** One dish row: details on the left, photo on the right with ADD / −n+ sitting on its bottom edge. */
const DishCard = ({ dish, othersQuantity, othersNames = [], myQuantity, canAdd, onAdd, onRemoveOne }: Props) => {
  const details = [
    dish.spiceLevel && dish.spiceLevel !== 'NONE' ? `🌶️ ${dish.spiceLevel.toLowerCase()}` : '',
    dish.servingSize ? dish.servingSize : '',
    dish.calories != null ? `${dish.calories} kcal` : '',
  ].filter(Boolean);

  const action = canAdd && (
    <div className="dish-action">
      {myQuantity > 0 ? (
        <div className="qty-control">
          <button className="qty-btn" onClick={onRemoveOne} aria-label="Remove one">
            −
          </button>
          <span className="qty-value">{myQuantity}</span>
          <button className="qty-btn" onClick={onAdd} disabled={myQuantity >= MAX_DISH_QUANTITY} aria-label="Add one">
            +
          </button>
        </div>
      ) : (
        <button className="btn-add" onClick={onAdd}>
          {MESSAGES.BTN_ADD}
        </button>
      )}
    </div>
  );

  return (
    <article className="dish-card">
      <div className="dish-body">
        <div className="dish-title-row">
          <span className={`veg-dot ${dish.isVeg ? 'veg-dot--veg' : 'veg-dot--nonveg'}`} />
          {dish.tags?.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="dish-name">{dish.name}</h3>
        <span className="dish-price">{money(dish.price)}</span>
        {dish.description && <p className="dish-desc">{dish.description}</p>}
        {details.length > 0 && <p className="dish-meta">{details.join(' · ')}</p>}
        {dish.allergens && dish.allergens.length > 0 && (
          <p className="dish-meta">Contains: {dish.allergens.join(', ')}</p>
        )}
        {canAdd && othersQuantity > 0 && (
          <p className="dish-others">{MESSAGES.ADDED_BY_OTHERS(othersQuantity, othersNames)}</p>
        )}
      </div>
      {dish.imageUrl ? (
        <div className={`dish-media ${canAdd ? 'dish-media--action' : ''}`}>
          <img src={thumbUrl(dish.imageUrl)} alt={dish.name} className="dish-img" loading="lazy" />
          {action}
        </div>
      ) : (
        action
      )}
    </article>
  );
};

export default DishCard;

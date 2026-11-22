import { MESSAGES } from '../constants';
import type { IDish } from '../types';
import { money } from '../utils/format.util';

interface Props {
  dish: IDish;
  /** How many of this dish are in the table cart (everyone's). */
  tableQuantity: number;
  /** This diner's own plain line for the dish, if any — the −/+ control edits it. */
  myQuantity: number;
  busy: boolean;
  onAdd: () => void;
  onRemoveOne: () => void;
}

const DishCard = ({ dish, tableQuantity, myQuantity, busy, onAdd, onRemoveOne }: Props) => {
  const details = [
    dish.spiceLevel && dish.spiceLevel !== 'NONE' ? `🌶️ ${dish.spiceLevel.toLowerCase()}` : '',
    dish.servingSize ? `🍽️ ${dish.servingSize}` : '',
    dish.calories != null ? `🔥 ${dish.calories} kcal` : '',
  ].filter(Boolean);
  const othersQuantity = tableQuantity - myQuantity;

  return (
    <article className="dish-card">
      {dish.imageUrl && <img src={dish.imageUrl} alt={dish.name} className="dish-img" loading="lazy" />}
      <div className="dish-body">
        <div className="dish-title-row">
          <h3 className="dish-name">{dish.name}</h3>
          <span className={`veg-dot ${dish.isVeg ? 'veg-dot--veg' : 'veg-dot--nonveg'}`} />
        </div>
        {dish.description && <p className="dish-desc">{dish.description}</p>}
        {details.length > 0 && <p className="dish-desc">{details.join(' · ')}</p>}
        {dish.allergens && dish.allergens.length > 0 && (
          <p className="dish-desc">⚠️ Contains: {dish.allergens.join(', ')}</p>
        )}
        <div className="dish-bottom">
          <span className="dish-price">{money(dish.price)}</span>
          {dish.tags?.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        {othersQuantity > 0 && <p className="dish-others">+{othersQuantity} added by others at your table</p>}
      </div>
      <div className="dish-cart-action">
        {myQuantity > 0 ? (
          <div className="qty-control">
            <button className="qty-btn" onClick={onRemoveOne} disabled={busy} aria-label="Remove one">
              −
            </button>
            <span className="qty-value">{myQuantity}</span>
            <button className="qty-btn" onClick={onAdd} disabled={busy} aria-label="Add one">
              +
            </button>
          </div>
        ) : (
          <button className="btn-add" onClick={onAdd} disabled={busy}>
            {MESSAGES.BTN_ADD}
          </button>
        )}
      </div>
    </article>
  );
};

export default DishCard;

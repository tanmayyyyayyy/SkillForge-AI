import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number;
  options: SelectOption[];
  onChange: (value: any) => void;
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'md' | 'sm' | 'xs';
  inline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const MENU_MAX_HEIGHT = 296;
const MENU_GAP = 6;

/**
 * Lightweight, accessible single-select dropdown (listbox pattern).
 *
 * - Selected value is always visible on the trigger.
 * - Full keyboard support: ArrowUp/ArrowDown, Home/End, Enter/Space, Escape.
 * - Click-outside dismissal, focus stays on the trigger (safe inside modals).
 * - The menu is rendered in a portal with fixed positioning, so it is never
 *   clipped by scroll containers and flips above the trigger when there is no
 *   room below.
 *
 * Values pass through unchanged (string or number) so form data is never altered.
 */
export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  ariaLabelledby,
  placeholder = 'Select an option',
  disabled,
  size = 'md',
  inline,
  className = '',
  style
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [flipUp, setFlipUp] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const baseId = useId();

  // If the current value isn't among the options (e.g. data still loading or a
  // custom value), surface it rather than rendering an empty trigger.
  const effectiveOptions = useMemo<SelectOption[]>(() => {
    const present =
      value !== undefined && value !== null && options.some(o => String(o.value) === String(value));
    if (present) return options;
    if (value === undefined || value === null || value === '') return options;
    return [{ value, label: String(value) }, ...options];
  }, [options, value]);

  const selectedIndex = useMemo(() => {
    if (value === undefined || value === null) return -1;
    return effectiveOptions.findIndex(o => String(o.value) === String(value));
  }, [effectiveOptions, value]);

  const hasValue = selectedIndex >= 0;
  const selectedLabel = hasValue
    ? effectiveOptions[selectedIndex].label
    : value === undefined || value === null || value === ''
      ? ''
      : String(value);

  const firstEnabled = useCallback(
    (from: number, step: number) => {
      const n = effectiveOptions.length;
      if (n === 0) return -1;
      let i = from;
      for (let k = 0; k < n; k++) {
        if (i < 0) i = n - 1;
        if (i >= n) i = 0;
        if (!effectiveOptions[i].disabled) return i;
        i += step;
      }
      return -1;
    },
    [effectiveOptions]
  );

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = Math.min(MENU_MAX_HEIGHT, effectiveOptions.length * 40 + 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const up = spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow;
    setFlipUp(up);

    const base: React.CSSProperties = {
      position: 'fixed',
      top: up ? 'auto' : rect.bottom + MENU_GAP,
      bottom: up ? window.innerHeight - rect.top + MENU_GAP : 'auto'
    };

    if (inline) {
      setMenuStyle({
        ...base,
        left: 'auto',
        right: Math.max(8, window.innerWidth - rect.right),
        minWidth: 210,
        maxWidth: Math.max(160, window.innerWidth - 16)
      });
    } else {
      setMenuStyle({
        ...base,
        left: rect.left,
        width: rect.width,
        right: 'auto',
        minWidth: rect.width
      });
    }
  }, [effectiveOptions.length, inline]);

  const openMenu = useCallback(
    (index: number) => {
      reposition();
      setOpen(true);
      setActiveIndex(index);
    },
    [reposition]
  );

  // Dismiss on outside pointer down (never steals focus from the user).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, close]);

  // Keep the menu anchored to the trigger while the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, reposition]);

  // Keep the active option in view while navigating with the keyboard.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = menuRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (item && list) {
      const top = item.offsetTop;
      const bottom = top + item.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    }
  }, [open, activeIndex]);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    close(true);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    const opts = effectiveOptions;

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (event.key === 'ArrowUp') openMenu(firstEnabled(opts.length - 1, -1));
        else openMenu(selectedIndex >= 0 ? selectedIndex : firstEnabled(0, 1));
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(i => firstEnabled((i < 0 ? -1 : i) + 1, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(i => firstEnabled((i < 0 ? opts.length : i) - 1, -1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(firstEnabled(0, 1));
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(firstEnabled(opts.length - 1, -1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0 && opts[activeIndex]) choose(opts[activeIndex]);
        break;
      case 'Escape':
        // Close the dropdown only — don't let a surrounding dialog also close.
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  const sizeClass = size === 'sm' ? 'ui-select-sm' : size === 'xs' ? 'ui-select-xs' : '';

  const menu =
    open &&
    createPortal(
      <ul
        id={menuId}
        ref={menuRef}
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel ? ariaLabelledby : undefined}
        className={`ui-select-menu ${flipUp ? 'is-up' : ''}`}
        style={menuStyle}
        tabIndex={-1}
      >
        {effectiveOptions.map((option, index) => {
          const isSelected =
            value !== undefined && value !== null && String(option.value) === String(value);
          const isActive = index === activeIndex;
          return (
            <li
              key={`${String(option.value)}-${index}`}
              id={`${baseId}-o${index}`}
              data-index={index}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              className={[
                'ui-select-option',
                isActive ? 'is-active' : '',
                isSelected ? 'is-selected' : '',
                option.disabled ? 'is-disabled' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => {
                if (!option.disabled) setActiveIndex(index);
              }}
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {isSelected && <Check size={15} className="ui-select-check" aria-hidden="true" />}
            </li>
          );
        })}

        {effectiveOptions.length === 0 && (
          <li className="ui-select-option is-disabled" aria-disabled="true">
            <span>No options</span>
          </li>
        )}
      </ul>,
      document.body
    );

  return (
    <div
      ref={rootRef}
      className={['ui-select', sizeClass, inline ? 'is-inline' : '', open ? 'is-open' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className="ui-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel && !ariaLabelledby ? undefined : ariaLabelledby}
        aria-activedescendant={open && activeIndex >= 0 ? `${baseId}-o${activeIndex}` : undefined}
        onClick={() => {
          if (disabled) return;
          if (open) close(false);
          else openMenu(selectedIndex >= 0 ? selectedIndex : firstEnabled(0, 1));
        }}
        onKeyDown={onKeyDown}
      >
        <span className={`ui-select-value ${hasValue || selectedLabel ? '' : 'is-placeholder'}`}>
          {hasValue || selectedLabel ? selectedLabel : placeholder}
        </span>
        <ChevronDown size={16} className="ui-select-chevron" aria-hidden="true" />
      </button>

      {menu}
    </div>
  );
};

export default Select;

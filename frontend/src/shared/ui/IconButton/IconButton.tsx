import { Button, type ButtonProps } from '../Button/Button';
import type { IconComponent } from '../icons';

export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'children' | 'aria-label'> {
  /** Accessible name (also the native tooltip). */
  label: string;
  icon: IconComponent;
}

/** Square button with one icon; ghost by default. */
export function IconButton({ label, icon: Icon, variant = 'ghost', size = 'md', title, ...rest }: IconButtonProps) {
  return (
    <Button {...rest} variant={variant} size={size} iconOnly aria-label={label} title={title ?? label}>
      <Icon size={size === 'sm' ? 16 : 20} />
    </Button>
  );
}

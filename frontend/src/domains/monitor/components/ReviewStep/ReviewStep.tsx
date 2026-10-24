import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@/shared/ui';

export interface ReviewItem {
  /** Step that edits this item. */
  step: string;
  label: string;
  value: ReactNode;
}

export interface ReviewStepProps {
  items: readonly ReviewItem[];
  onEdit: (step: string) => void;
}

/** Last step: everything the monitor will do, in plain words, each with a way back to change it. */
export function ReviewStep({ items, onEdit }: ReviewStepProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <dl className="m-0 flex flex-col divide-y divide-line">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-4 sm:gap-4">
            <dt className="text-sm text-muted">{item.label}</dt>
            <dd className="m-0 min-w-0 text-base text-text sm:col-span-2">{item.value}</dd>
            <dd className="m-0 sm:justify-self-end">
              <Button variant="ghost" size="sm" aria-label={`${t('monitorForm.review.edit')}: ${item.label}`} onClick={() => onEdit(item.step)}>
                {t('monitorForm.review.edit')}
              </Button>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

import { useTranslation } from 'react-i18next';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Panel } from '@/shared/ui/Panel';

export interface TextBlockProps {
  text: string | undefined;
}

/** Free text from the layout, always rendered as text through the redactor. */
export function TextBlock({ text }: TextBlockProps) {
  const { t } = useTranslation();
  return (
    <Panel title={t('wall.blocks.note')} className="h-full">
      <p className="m-0 whitespace-pre-line text-md">{text ? <SafeValue value={text} surface="wall" /> : null}</p>
    </Panel>
  );
}

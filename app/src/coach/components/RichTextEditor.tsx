import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, List } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  storageKey: string;
  placeholder?: string;
}

const sanitize = (value: string) => {
  if (typeof window === 'undefined') {
    return value.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  doc.querySelectorAll('script,style').forEach((node) => node.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const allowedAttrs = ['href', 'target', 'rel', 'class', 'id', 'style', 'src'];
      if (!allowedAttrs.includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
};

const applyFormat = (command: string) => {
  if (typeof document === 'undefined') return;
  document.execCommand(command, false);
};

export function RichTextEditor({
  label,
  description,
  value,
  onChange,
  storageKey,
  placeholder,
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);

  const sanitizedValue = useMemo(() => sanitize(draft), [draft]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setDraft(saved);
      onChange(saved);
    }
  }, [storageKey, onChange]);

  useEffect(() => {
    if (value !== draft) {
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, draft);
  }, [draft, storageKey]);

  const handleInput = () => {
    const html = editorRef.current?.innerHTML ?? '';
    const clean = sanitize(html);
    setDraft(clean);
    onChange(clean);
  };

  const handleClearDraft = () => {
    setDraft('');
    onChange('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span>{label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft}>
          {t('session.clearDraft')}
        </Button>
      </Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="border rounded-md bg-white">
        <div className="flex items-center gap-2 border-b p-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => applyFormat('bold')}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => applyFormat('italic')}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => applyFormat('insertUnorderedList')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
        <div
          ref={editorRef}
          className={cn(
            'min-h-[140px] w-full p-3 outline-none',
            'prose prose-sm max-w-none focus-visible:ring-0 focus-visible:outline-none',
            'prose-p:my-1 prose-strong:font-semibold'
          )}
          contentEditable
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: sanitizedValue }}
          placeholder={placeholder}
          suppressContentEditableWarning
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('session.autosaveNotice')}</p>
    </div>
  );
}

export function renderSanitizedHtml(value: string) {
  return { __html: sanitize(value) };
}


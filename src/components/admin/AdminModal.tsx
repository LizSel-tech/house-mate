'use client';

import { useEffect, type ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

export function IconActionButton({
  icon,
  label,
  onClick,
  tone = 'neutral',
  disabled,
  href,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  tone?: 'neutral' | 'primary' | 'success' | 'danger';
  disabled?: boolean;
  href?: string;
}) {
  const tones = {
    neutral: 'border-border text-foreground hover:bg-muted',
    primary: 'border-primary/30 bg-primary text-primary-foreground hover:bg-accent',
    success: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };

  const className = `inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${tones[tone]}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={className}>
        <Icon name={icon} size={16} />
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function AdminModal({
  open,
  title,
  description,
  icon,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  icon?: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon name={icon} size={22} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="admin-modal-title" className="text-xl font-extrabold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
          >
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  icon = 'ExclamationTriangleIcon',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <AdminModal
      open={open}
      title={title}
      description={description}
      icon={icon}
      onClose={loading ? () => undefined : onClose}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 !rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            loading={loading}
            onClick={onConfirm}
            className={`flex-1 !rounded-xl ${
              tone === 'danger' ? '!bg-red-600 hover:!bg-red-700 text-white' : ''
            }`}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </AdminModal>
  );
}

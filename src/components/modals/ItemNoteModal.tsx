import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { CartItem } from '@/types';

interface ItemNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  onSaveNote: (itemId: string, note: string) => void;
}

export const ItemNoteModal: React.FC<ItemNoteModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveNote,
}) => {
  const [note, setNote] = useState(item?.note || '');

  if (!item) return null;

  const handleSave = () => {
    onSaveNote(item.id, note.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSave}
      title="Item Note"
      subtitle={`${item.product.name} • ${item.product.weight}`}
      maxWidth="xs"
    >
      <div className="space-y-2.5 select-none">
        <div>
          <label className="block text-[11px] font-bold text-black mb-1">
            Special Instructions / Note
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Gift wrap / Cold pack / Customer note"
            className="w-full p-2 rounded-lg border border-zinc-200 bg-white text-xs text-black focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            autoFocus
          />
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs font-bold uppercase tracking-wider shadow-xs"
          >
            Save Note
          </button>
        </div>
      </div>
    </Modal>
  );
};

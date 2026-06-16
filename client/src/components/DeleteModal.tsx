interface DeleteModalProps {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModal({ itemName, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🗑️</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Item</h3>
          <p className="text-sm text-slate-600 mb-4">
            Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger flex-1">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

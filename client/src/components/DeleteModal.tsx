interface DeleteModalProps {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModal({ itemName, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-sm mx-4 sm:mx-0">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900/50">
            <svg className="w-7 h-7 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Delete Item</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Are you sure you want to delete <strong className="text-zinc-700 dark:text-zinc-300">{itemName}</strong>?<br />
            <span className="text-xs">This action cannot be undone.</span>
          </p>
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
    </div>
  );
}

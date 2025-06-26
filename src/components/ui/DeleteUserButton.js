import { useState } from 'react';
import { Button } from './button.js';
import { Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog.js';

export default function DeleteUserButton({ userId, userName, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(userId);
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className="text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
        onClick={handleDelete}
        disabled={isDeleting}

      >
        {isDeleting ? 'Deleting...' : (
          <>
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </>
        )}
      </Button>
      {error && (
        <div className="text-red-600 text-sm mt-1">{error}</div>
      )}
    </>
  );
}
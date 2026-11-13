import React from 'react';
import { useLibrary } from '../context/LibraryContext';
import { Bell, Check, Trash2, X, AlertTriangle, BookCheck, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

interface NotificationInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationInbox: React.FC<NotificationInboxProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    books,
    notifications,
    markNotificationAsRead,
    deleteNotification,
    setReturnCheckLoanId,
  } = useLibrary();

  if (!isOpen || !currentUser) return null;

  // Filter notifications relevant to current user
  const userNotifications = notifications.filter((n) => {
    if (currentUser.role === 'admin') {
      return n.recipientRole === 'admin';
    }
    // Student
    return n.recipientRole === 'student' && n.recipientUserId === currentUser.id;
  });

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleAdminVerifyReturn = (loanId: string) => {
    onClose();
    setReturnCheckLoanId(loanId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-stone-800" />
            <h2 className="text-sm font-bold text-stone-900">
              {currentUser.role === 'admin' ? 'Admin Return Notices' : 'Student Inbox'}
            </h2>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-stone-900 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-stone-100 p-2">
          {userNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              No notifications at this time.
            </div>
          ) : (
            userNotifications.map((notif) => {
              const isOverdue = notif.type === 'overdue_alert';
              const isStock = notif.type === 'book_back_in_stock';
              const isReturn = notif.type === 'return_notified';
              const isMismatch = notif.type === 'return_mismatch';

              const adminCopy =
                currentUser.role === 'admin' && notif.copyId
                  ? books
                      .find((b) => b.id === notif.bookId)
                      ?.copies.find((c) => c.id === notif.copyId)
                  : undefined;

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-lg transition-colors flex flex-col gap-2 ${
                    notif.read ? 'bg-white opacity-85' : 'bg-stone-50 font-medium'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {isOverdue && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {isStock && <BookCheck className="w-4 h-4 text-emerald-600" />}
                        {isReturn && <Clock className="w-4 h-4 text-stone-800" />}
                        {isMismatch && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-stone-900">{notif.title}</h3>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
                          )}
                        </div>
                        <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        {currentUser.role === 'admin' && notif.copyId && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-900 text-white font-mono text-[10px]">
                            <span>Exemplaire #{adminCopy?.copyNumber ?? '?'}</span>
                            <span>·</span>
                            <span>{notif.copyId}</span>
                            {adminCopy?.barcode && (
                              <>
                                <span>·</span>
                                <span>{adminCopy.barcode}</span>
                              </>
                            )}
                          </div>
                        )}
                        {notif.sentToEmail && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded w-fit">
                            <span>📧</span>
                            <span>Dispatched to email: {notif.recipientEmail || 'Student Email'}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                          {notif.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.read && (
                        <button
                          onClick={() => markNotificationAsRead(notif.id)}
                          className="p-1 text-stone-400 hover:text-stone-800 rounded transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="p-1 text-stone-300 hover:text-stone-600 rounded transition-colors cursor-pointer"
                        title="Dismiss"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Admin action button for return notices */}
                  {currentUser.role === 'admin' && isReturn && notif.loanId && (
                    <div className="pt-2 border-t border-stone-200/60 flex justify-end">
                      <button
                        onClick={() => handleAdminVerifyReturn(notif.loanId!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify Exemplaire &amp; Check In</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

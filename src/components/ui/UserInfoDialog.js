import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./dialog.js";
import { Button } from "./button.js";

export function UserInfoDialog({ user, open, onOpenChange }) {
  if (!user) return null;

  const formatList = (items, key) => {
    return items?.length > 0 ? items.map(item => item[key]).join(', ') : 'None';
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  const userDetails = [
    { field: 'ID', value: user.id },
    { field: 'Name', value: user.displayName },
    { field: 'Email', value: user.userName },
    { field: 'Last Login', value: formatDate(user.lastLogin) },
    { field: 'Groups', value: formatList(user.groups, 'name') },
    { field: 'Roles', value: formatList(user.roles, 'name') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white shadow-lg rounded-lg border border-indigo-100">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            User Details
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-4 py-2 text-left text-sm font-semibold text-indigo-800 border-b border-indigo-200">
                  Field
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-indigo-800 border-b border-indigo-200">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {userDetails.map((detail, index) => (
                <tr
                  key={index}
                  className="hover:bg-indigo-50 transition-colors"
                >
                  <td className="px-4 py-2 text-sm text-gray-700 font-medium border-b border-indigo-100">
                    {detail.field}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 border-b border-indigo-100">
                    {detail.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 shadow-sm"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
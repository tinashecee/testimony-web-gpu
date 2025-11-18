import { useEffect, useState } from "react";
import { recordingsApi, User } from "@/services/api";
import { Button } from "@/components/ui/button";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await recordingsApi.getUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">User Management</h2>
      <Button
        onClick={() => {
          /* Logic to open user form */
        }}>
        Add User
      </Button>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Role</th>
              <th className="px-4 py-2 text-left font-medium">Court</th>
              <th className="px-4 py-2 text-left font-medium">Contact Info</th>
              <th className="px-4 py-2 text-left font-medium">Date Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
                <td className="px-4 py-2">{user.court}</td>
                <td className="px-4 py-2">{user.contact_info}</td>

                <td className="px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      /* Logic to edit user */
                    }}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      /* Logic to delete user */
                    }}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

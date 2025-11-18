import { useState } from "react";
import { recordingsApi, User } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function UserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User['role'] | "">("");
  const [court, setCourt] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      showToast("Please select a role", "error");
      return;
    }
    
    const user: Omit<User, "date_created"> = {
      name,
      email,
      role,
      court,
      contact_info: contactInfo,
    };

    try {
      await recordingsApi.addUser(user);
      showToast("User added successfully");
      // Reset form fields
      setName("");
      setEmail("");
      setRole("");
      setCourt("");
      setContactInfo("");
    } catch (error) {
      console.error("Error adding user:", error);
      showToast("Failed to add user", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        placeholder="Role"
        value={role}
        onChange={(e) => setRole(e.target.value as User['role'])}
        required
      />
      <Input
        placeholder="Court"
        value={court}
        onChange={(e) => setCourt(e.target.value)}
        required
      />
      <Input
        placeholder="Contact Info"
        value={contactInfo}
        onChange={(e) => setContactInfo(e.target.value)}
        required
      />
      <Button type="submit">Add User</Button>
    </form>
  );
}

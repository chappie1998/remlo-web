"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import { shortenAddress, isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import {
  Copy,
  Star,
  XCircle,
  ArrowLeft,
  Trash2,
  Edit,
  UserPlus,
  Check,
  User,
  Search
} from "lucide-react";

// Define interfaces
interface Contact {
  id: string;
  nickname: string;
  username?: string;
  solanaAddress: string;
  isFavorite: boolean;
  lastUsed: string;
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form states
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState("");
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (session?.user?.solanaAddress) {
      fetchContacts();
    }
  }, [session, status, router]);

  // Debounced username validation
  useEffect(() => {
    const handler = setTimeout(() => {
      if (username && username.trim() !== "") {
        validateUsername(username);
      } else {
        setIsUsernameValid(null);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [username]);

  const validateUsername = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.trim() === "") {
      setIsUsernameValid(null);
      return;
    }

    setIsCheckingUsername(true);

    try {
      const response = await fetch("/api/user/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameToCheck,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsUsernameValid(true);
        setAddress(data.solanaAddress);
      } else {
        setIsUsernameValid(false);
      }
    } catch (err) {
      setIsUsernameValid(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/contacts");
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      } else {
        toast.error("Failed to load contacts");
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (!nickname.trim()) {
      setError("Nickname is required");
      return;
    }

    if (!address.trim() && !username.trim()) {
      setError("Either address or username is required");
      return;
    }

    if (address.trim() && !isValidSolanaAddress(address)) {
      setError("Invalid Solana address");
      return;
    }

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname,
          username: username.trim() || undefined,
          solanaAddress: address,
          isFavorite,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add contact");
      }

      // Reset form and fetch updated contacts
      setNickname("");
      setUsername("");
      setAddress("");
      setIsFavorite(false);
      setIsAddingContact(false);
      fetchContacts();
      toast.success("Contact added successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add contact";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingContact) return;
    
    setError("");

    // Validation
    if (!nickname.trim()) {
      setError("Nickname is required");
      return;
    }

    try {
      const response = await fetch(`/api/contacts/${isEditingContact}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname,
          username: username.trim() || undefined,
          isFavorite,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update contact");
      }

      // Reset form and fetch updated contacts
      setNickname("");
      setUsername("");
      setAddress("");
      setIsFavorite(false);
      setIsEditingContact(null);
      fetchContacts();
      toast.success("Contact updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update contact";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete contact");
        }

        fetchContacts();
        toast.success("Contact deleted successfully");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete contact";
        toast.error(errorMessage);
      }
    }
  };

  const handleToggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isFavorite: !currentStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update contact");
      }

      fetchContacts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update contact";
      toast.error(errorMessage);
    }
  };

  const handleEditContact = (contact: Contact) => {
    setNickname(contact.nickname);
    setUsername(contact.username || "");
    setAddress(contact.solanaAddress);
    setIsFavorite(contact.isFavorite);
    setIsEditingContact(contact.id);
  };

  const getFilteredContacts = () => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.nickname.toLowerCase().includes(query) || 
      (contact.username && contact.username.toLowerCase().includes(query)) ||
      contact.solanaAddress.toLowerCase().includes(query)
    );
  };

  // Separate contacts into favorites and others
  const favoriteContacts = getFilteredContacts().filter(c => c.isFavorite);
  const otherContacts = getFilteredContacts().filter(c => !c.isFavorite);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Contacts" backUrl="/wallet" />
      
      <main className="container max-w-md mx-auto p-4 pt-20">
        {/* Search bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="w-full p-2 pl-10 border rounded-md bg-background"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Add Contact Button */}
        {!isAddingContact && !isEditingContact && (
          <Button 
            className="w-full mb-6" 
            onClick={() => setIsAddingContact(true)}
          >
            <UserPlus size={18} className="mr-2" />
            Add New Contact
          </Button>
        )}

        {/* Add Contact Form */}
        {isAddingContact && (
          <div className="border rounded-lg p-4 mb-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Add New Contact</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddingContact(false);
                  setError("");
                  setNickname("");
                  setUsername("");
                  setAddress("");
                  setIsFavorite(false);
                }}
              >
                <XCircle size={20} />
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  placeholder="Friend's name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full p-2 border rounded-md bg-background ${
                      isUsernameValid === true 
                        ? "border-green-500" 
                        : isUsernameValid === false 
                          ? "border-red-500" 
                          : ""
                    }`}
                    placeholder="username (without @)"
                  />
                  {isCheckingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    </div>
                  )}
                  {isUsernameValid === true && !isCheckingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                      <Check size={18} />
                    </div>
                  )}
                  {isUsernameValid === false && !isCheckingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                      <XCircle size={18} />
                    </div>
                  )}
                </div>
                {isUsernameValid === false && (
                  <p className="text-red-500 text-xs mt-1">Username not found</p>
                )}
                {isUsernameValid === true && (
                  <p className="text-green-500 text-xs mt-1">Valid username</p>
                )}
              </div>

              {!username && (
                <div>
                  <label className="block text-sm font-medium mb-1">Solana Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                    placeholder="Solana address"
                    disabled={!!username && isUsernameValid === true}
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="favorite"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="favorite" className="text-sm font-medium">Add to favorites</label>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsAddingContact(false);
                    setError("");
                    setNickname("");
                    setUsername("");
                    setAddress("");
                    setIsFavorite(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Contact Form */}
        {isEditingContact && (
          <div className="border rounded-lg p-4 mb-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Edit Contact</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsEditingContact(null);
                  setError("");
                  setNickname("");
                  setUsername("");
                  setAddress("");
                  setIsFavorite(false);
                }}
              >
                <XCircle size={20} />
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  placeholder="Friend's name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  placeholder="username (without @)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Solana Address</label>
                <input
                  type="text"
                  value={address}
                  className="w-full p-2 border rounded-md bg-background"
                  disabled
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="favorite-edit"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="favorite-edit" className="text-sm font-medium">Add to favorites</label>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditingContact(null);
                    setError("");
                    setNickname("");
                    setUsername("");
                    setAddress("");
                    setIsFavorite(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Update Contact
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Contacts List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary rounded-full border-t-transparent"></div>
              <p className="mt-2 text-muted-foreground">Loading contacts...</p>
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {favoriteContacts.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <Star size={18} className="mr-2 text-yellow-400" />
                    Favorites
                  </h2>
                  <div className="space-y-2">
                    {favoriteContacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-3 bg-card">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{contact.nickname}</div>
                            {contact.username && (
                              <div className="text-sm text-muted-foreground">@{contact.username}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {shortenAddress(contact.solanaAddress)}
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(contact.solanaAddress);
                                  toast.success("Address copied to clipboard");
                                }}
                                className="ml-1 text-primary inline-flex items-center"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleFavorite(contact.id, contact.isFavorite)}
                            >
                              <Star size={18} className="text-yellow-400 fill-yellow-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditContact(contact)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              router.push(`/wallet/send?address=${contact.solanaAddress}&nickname=${contact.nickname}`);
                            }}
                          >
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              router.push(`/payment-requests/new?recipient=${contact.solanaAddress}`);
                            }}
                          >
                            Request
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Contacts Section */}
              {otherContacts.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium mb-2 flex items-center">
                    <User size={18} className="mr-2" />
                    All Contacts
                  </h2>
                  <div className="space-y-2">
                    {otherContacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-3 bg-card">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{contact.nickname}</div>
                            {contact.username && (
                              <div className="text-sm text-muted-foreground">@{contact.username}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {shortenAddress(contact.solanaAddress)}
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(contact.solanaAddress);
                                  toast.success("Address copied to clipboard");
                                }}
                                className="ml-1 text-primary inline-flex items-center"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleFavorite(contact.id, contact.isFavorite)}
                            >
                              <Star size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditContact(contact)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              router.push(`/wallet/send?address=${contact.solanaAddress}&nickname=${contact.nickname}`);
                            }}
                          >
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              router.push(`/payment-requests/new?recipient=${contact.solanaAddress}`);
                            }}
                          >
                            Request
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {contacts.length === 0 && (
                <div className="text-center py-8 border rounded-lg p-6 bg-card">
                  <User size={40} className="mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No contacts yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-4">
                    Save your frequently used recipient addresses to make payments easier
                  </p>
                  <Button onClick={() => setIsAddingContact(true)}>
                    <UserPlus size={18} className="mr-2" />
                    Add First Contact
                  </Button>
                </div>
              )}
              
              {/* Empty search results */}
              {contacts.length > 0 && getFilteredContacts().length === 0 && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No contacts match your search</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
} 
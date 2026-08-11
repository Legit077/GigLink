import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console | GigLink" },
      { name: "description", content: "Platform administration for GigLink: users, artists, venues and bookings." },
      { property: "og:title", content: "Admin Console | GigLink" },
      { property: "og:description", content: "Manage users, artists, venues and bookings across GigLink." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useRoles();
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, city, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]));
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const artists = useQuery({
    queryKey: ["admin-artists"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id, stage_name, kind, city, is_published");
      if (error) throw error;
      return data;
    },
  });

  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, event_date, status, expected_guests, artists (stage_name)")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleArtist = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase.from("artists").update({ is_published: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artist updated");
      queryClient.invalidateQueries({ queryKey: ["admin-artists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="mx-auto max-w-5xl px-4 py-20 text-muted-foreground">Loading…</p>;
  if (!isAdmin)
    return (
      <p className="mx-auto max-w-5xl px-4 py-20 text-muted-foreground">
        You need an admin account to view this page.
      </p>
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">Admin console</h1>
      <p className="mt-2 text-muted-foreground">Every user, artist and booking on the platform.</p>

      <Tabs defaultValue="users" className="mt-8">
        <TabsList>
          <TabsTrigger value="users">Users ({users.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="artists">Artists ({artists.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({bookings.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6 space-y-2">
          {(users.data ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg p-4 card-surface">
              <div>
                <p className="font-semibold">{u.full_name || "Unnamed user"}</p>
                <p className="text-xs text-muted-foreground">{u.city || "No city"}</p>
              </div>
              <div className="flex gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="artists" className="mt-6 space-y-2">
          {(artists.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg p-4 card-surface">
              <div>
                <p className="font-semibold">{a.stage_name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {a.kind} · {a.city || "No city"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleArtist.mutate({ id: a.id, next: !a.is_published })}
              >
                {a.is_published ? "Hide" : "Publish"}
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6 space-y-2">
          {(bookings.data ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg p-4 card-surface">
              <div>
                <p className="font-semibold">
                  {(b.artists as { stage_name: string } | null)?.stage_name || "Artist"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.event_date} · {b.expected_guests} guests
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {b.status}
              </Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
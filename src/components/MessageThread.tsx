import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const MAX_LEN = 4000;

function ThreadBody({
  bookingId,
  counterpartLabel,
}: {
  bookingId: string;
  counterpartLabel: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(error.message);
        setMessages(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || !user) return;

    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ booking_id: bookingId, sender_id: user.id, body })
      .select()
      .single();
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    setDraft("");
  }

  return (
    <div className="flex h-[60dvh] max-h-[60dvh] flex-col">
      <ScrollArea className="flex-1 pr-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to {counterpartLabel}.
          </p>
        ) : (
          <div className="flex flex-col gap-2 py-2">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] min-w-0 rounded-lg px-3 py-2 text-sm sm:max-w-[80%]",
                    mine
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] opacity-70",
                      mine ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="mt-3 flex shrink-0 items-end gap-2 border-t border-border pt-3">
        <Textarea
          value={draft}
          maxLength={MAX_LEN}
          placeholder={`Message ${counterpartLabel}…`}
          className="min-h-16 resize-none"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button size="icon" disabled={sending || !draft.trim()} onClick={() => void send()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** A "Message" button that opens a booking-anchored chat thread in a dialog. */
export function MessageThreadDialog({
  bookingId,
  counterpartLabel,
}: {
  bookingId: string;
  counterpartLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageCircle className="size-4" /> Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="break-words">Conversation with {counterpartLabel}</DialogTitle>
        </DialogHeader>
        {open && <ThreadBody bookingId={bookingId} counterpartLabel={counterpartLabel} />}
      </DialogContent>
    </Dialog>
  );
}

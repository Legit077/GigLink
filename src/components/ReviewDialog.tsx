import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  bookingId: string;
  artistId: string;
  artistName: string;
  userId: string;
  onSaved: () => void;
};

export function ReviewDialog({ bookingId, artistId, artistName, userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (rating < 1) {
      toast.error("Please choose a star rating.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      artist_id: artistId,
      reviewer_id: userId,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "You have already reviewed this booking." : error.message,
      );
      return;
    }
    toast.success("Review posted. Thank you!");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Star className="mr-1 size-4" /> Leave review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Review {artistName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    n <= rating ? "fill-primary text-primary" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            rows={4}
            maxLength={1000}
            placeholder="How was the performance? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Posting…" : "Post review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
